from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from sklearn.pipeline import Pipeline

from feature_config import FEATURE_COLUMNS


# ============================================================
# 1. CONFIGURATION
# ============================================================

CLASSIFICATION_THRESHOLD = 0.50
EXPECTED_MODEL_COUNT = 9

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "saved_models"

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

NEURAL_NETWORK_MODEL_NAME = "Neural Network"


# ------------------------------------------------------------
# Eight sklearn/XGBoost models
# ------------------------------------------------------------

SKLEARN_MODEL_PATHS = {
    "Logistic Regression":
        MODEL_DIR / "logistic_classifier.pkl",

    "Decision Tree":
        MODEL_DIR / "decision_tree_classifier.pkl",

    "KNN":
        MODEL_DIR / "knn_classifier.pkl",

    "SGD":
        MODEL_DIR / "sgd_classifier.pkl",

    "SVM":
        MODEL_DIR / "svm_classifier.pkl",

    "Gradient Boosting":
        MODEL_DIR / "gradient_boosting_classifier.pkl",

    "Random Forest":
        MODEL_DIR / "random_forest_classifier.pkl",

    "XGBoost":
        MODEL_DIR / "xgboost_classifier.pkl",
}


# ------------------------------------------------------------
# Common sklearn preprocessor
# ------------------------------------------------------------

COMMON_PREPROCESSOR_PATH = (
    MODEL_DIR / "decision_tree_preprocessor.pkl"
)


# ------------------------------------------------------------
# PyTorch neural-network artifacts
# ------------------------------------------------------------

NEURAL_NETWORK_MODEL_PATH = (
    MODEL_DIR / "pytorch_nn_model.pkl"
)

NEURAL_NETWORK_PREPROCESSOR_PATH = (
    MODEL_DIR / "pytorch_nn_preprocessor.pkl"
)


# ============================================================
# 2. GLOBAL ARTIFACT STORAGE
# ============================================================

common_preprocessor: Any = None
neural_network_preprocessor: Any = None

sklearn_models: dict[str, Any] = {}
neural_network_model: Any = None


# ============================================================
# 3. REQUEST SCHEMA
# ============================================================

class PredictionRequest(BaseModel):
    """
    Accept all frontend feature fields.

    The exact required fields are validated against
    FEATURE_COLUMNS in prepare_prediction_data().
    """

    model_config = ConfigDict(extra="allow")


# ============================================================
# 4. PYTORCH NEURAL-NETWORK ARCHITECTURE
# ============================================================

class SimpleBinaryNN(nn.Module):
    """
    Architecture used while training the saved PyTorch model.

    Input:
        Transformed features from pytorch_nn_preprocessor.pkl

    Output:
        One raw binary-classification logit
    """

    def __init__(self, input_size: int):
        super().__init__()

        self.network = nn.Sequential(
            nn.Linear(input_size, 64),
            nn.ReLU(),
            nn.Dropout(p=0.20),

            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Dropout(p=0.10),

            nn.Linear(32, 1),
        )

    def forward(self, x):
        return self.network(x).squeeze(1)


# ============================================================
# 5. MODEL-TYPE HELPERS
# ============================================================

def is_complete_pipeline(model: Any) -> bool:
    """
    Return True when a saved sklearn object contains both
    preprocessing and model steps.
    """

    return isinstance(model, Pipeline)


def get_final_estimator(model: Any) -> Any:
    """
    Return the classifier inside a Pipeline or the standalone
    model itself.
    """

    if is_complete_pipeline(model):
        return model.steps[-1][1]

    return model


def get_positive_class_index(model: Any) -> int:
    """
    Find the predict_proba column representing class 1.

    Class 1 means Returned.
    """

    estimator = get_final_estimator(model)

    if not hasattr(estimator, "classes_"):
        raise AttributeError(
            f"{type(estimator).__name__} does not have classes_."
        )

    classes = list(estimator.classes_)

    if 1 not in classes:
        raise ValueError(
            f"Model classes are {classes}. "
            "Expected positive class 1."
        )

    return classes.index(1)


# ============================================================
# 6. VALIDATION HELPERS
# ============================================================

def validate_sklearn_model(
    model: Any,
    model_name: str,
) -> None:
    """
    Confirm that an sklearn/XGBoost model is fitted and supports
    class-probability prediction.
    """

    estimator = get_final_estimator(model)

    if not hasattr(estimator, "classes_"):
        raise AttributeError(
            f"{model_name} does not provide classes_. "
            "The model may not be fitted."
        )

    classes = np.asarray(estimator.classes_)

    if not np.array_equal(
        np.sort(classes),
        np.array([0, 1]),
    ):
        raise ValueError(
            f"{model_name} has classes "
            f"{classes.tolist()}. Expected [0, 1]."
        )

    if not hasattr(model, "predict_proba"):
        raise AttributeError(
            f"{model_name} does not provide predict_proba(). "
            "Soft voting requires probabilities."
        )


def validate_probability(
    probability: float,
    model_name: str,
) -> float:
    """
    Validate one model's return probability.
    """

    probability = float(probability)

    if not np.isfinite(probability):
        raise ValueError(
            f"{model_name} returned a non-finite probability."
        )

    if probability < 0 or probability > 1:
        raise ValueError(
            f"{model_name} returned probability "
            f"{probability}, outside the valid range [0, 1]."
        )

    return probability


def build_model_result(
    probability: float,
) -> dict[str, Any]:
    """
    Build a standard API response for one model.
    """

    prediction = int(
        probability >= CLASSIFICATION_THRESHOLD
    )

    return {
        "return_probability": round(
            probability,
            6,
        ),
        "return_probability_percent": round(
            probability * 100,
            2,
        ),
        "prediction": prediction,
        "prediction_label": (
            "Returned"
            if prediction == 1
            else "Not Returned"
        ),
    }


# ============================================================
# 7. LOAD PREPROCESSORS
# ============================================================

def load_preprocessor(
    preprocessor_path: Path,
    preprocessor_name: str,
) -> Any:
    """
    Load and validate a saved fitted preprocessor.
    """

    if not preprocessor_path.exists():
        raise FileNotFoundError(
            f"{preprocessor_name} was not found: "
            f"{preprocessor_path}"
        )

    preprocessor = joblib.load(
        preprocessor_path
    )

    if not hasattr(preprocessor, "transform"):
        raise TypeError(
            f"{preprocessor_name} does not provide transform()."
        )

    print(
        f"{preprocessor_name:30s} | "
        f"{preprocessor_path.name}"
    )

    return preprocessor


# ============================================================
# 8. LOAD EIGHT SKLEARN/XGBOOST MODELS
# ============================================================

def load_sklearn_models() -> dict[str, Any]:
    """
    Load the eight sklearn/XGBoost classifiers.
    """

    loaded_models = {}

    for model_name, model_path in (
        SKLEARN_MODEL_PATHS.items()
    ):
        if not model_path.exists():
            raise FileNotFoundError(
                f"{model_name} model was not found: "
                f"{model_path}"
            )

        model = joblib.load(model_path)

        validate_sklearn_model(
            model=model,
            model_name=model_name,
        )

        loaded_models[model_name] = model

        object_type = (
            "complete pipeline"
            if is_complete_pipeline(model)
            else "standalone classifier"
        )

        print(
            f"{model_name:30s} | "
            f"{object_type:22s} | "
            f"{model_path.name}"
        )

    return loaded_models


# ============================================================
# 9. LOAD PYTORCH NEURAL NETWORK
# ============================================================

def load_neural_network_model() -> SimpleBinaryNN:
    """
    Load the PyTorch checkpoint from pytorch_nn_model.pkl.

    The checkpoint must contain:
        input_size
        model_state_dict

    Optional:
        classification_threshold
    """

    if not NEURAL_NETWORK_MODEL_PATH.exists():
        raise FileNotFoundError(
            "Neural-network checkpoint was not found: "
            f"{NEURAL_NETWORK_MODEL_PATH}"
        )

    checkpoint = joblib.load(
        NEURAL_NETWORK_MODEL_PATH
    )

    if not isinstance(checkpoint, dict):
        raise TypeError(
            "pytorch_nn_model.pkl must contain a checkpoint "
            "dictionary."
        )

    required_keys = {
        "input_size",
        "model_state_dict",
    }

    missing_keys = (
        required_keys - set(checkpoint.keys())
    )

    if missing_keys:
        raise KeyError(
            "Neural-network checkpoint is missing the following "
            f"keys: {sorted(missing_keys)}"
        )

    input_size = int(
        checkpoint["input_size"]
    )

    model = SimpleBinaryNN(
        input_size=input_size
    )

    model.load_state_dict(
        checkpoint["model_state_dict"]
    )

    model.to(DEVICE)
    model.eval()

    # Store useful checkpoint metadata on the model.
    model.checkpoint_input_size = input_size

    model.classification_threshold = float(
        checkpoint.get(
            "classification_threshold",
            CLASSIFICATION_THRESHOLD,
        )
    )

    print(
        f"{NEURAL_NETWORK_MODEL_NAME:30s} | "
        f"PyTorch checkpoint     | "
        f"input_size={input_size} | "
        f"{NEURAL_NETWORK_MODEL_PATH.name}"
    )

    return model


# ============================================================
# 10. LOAD ALL ARTIFACTS
# ============================================================

def load_all_artifacts() -> None:
    """
    Load all preprocessors and all nine models once when the
    FastAPI service starts.
    """

    global common_preprocessor
    global neural_network_preprocessor
    global sklearn_models
    global neural_network_model

    print("=" * 100)
    print("LOADING RETURN-PREDICTION ARTIFACTS")
    print("=" * 100)
    print(f"Model directory : {MODEL_DIR}")
    print(f"PyTorch device  : {DEVICE}")
    print()

    common_preprocessor = load_preprocessor(
        preprocessor_path=COMMON_PREPROCESSOR_PATH,
        preprocessor_name="Common sklearn preprocessor",
    )

    neural_network_preprocessor = load_preprocessor(
        preprocessor_path=(
            NEURAL_NETWORK_PREPROCESSOR_PATH
        ),
        preprocessor_name="Neural-network preprocessor",
    )

    sklearn_models = load_sklearn_models()

    neural_network_model = (
        load_neural_network_model()
    )

    loaded_model_count = (
        len(sklearn_models)
        + int(neural_network_model is not None)
    )

    if loaded_model_count != EXPECTED_MODEL_COUNT:
        raise RuntimeError(
            f"Expected {EXPECTED_MODEL_COUNT} models, "
            f"but loaded {loaded_model_count}."
        )

    print()
    print(
        f"Successfully loaded "
        f"{loaded_model_count}/{EXPECTED_MODEL_COUNT} models."
    )
    print("=" * 100)


# ============================================================
# 11. FASTAPI APPLICATION
# ============================================================

@asynccontextmanager
async def lifespan(application: FastAPI):
    load_all_artifacts()
    yield


app = FastAPI(
    title="Return Probability ML Service",
    description=(
        "Nine-model product-return prediction ensemble"
    ),
    version="1.0.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# ============================================================
# 12. REQUEST-DATA PREPARATION
# ============================================================

def is_missing(value: Any) -> bool:
    """
    Identify empty or missing frontend values.
    """

    if value is None:
        return True

    if isinstance(value, str):
        return value.strip().lower() in {
            "",
            "none",
            "null",
            "nan",
            "n/a",
            "<na>",
        }

    return False


def prepare_prediction_data(
    payload: dict[str, Any],
) -> pd.DataFrame:
    """
    Convert one frontend JSON request into a one-row DataFrame.

    The feature names and order exactly match FEATURE_COLUMNS.
    """

    missing_features = [
        feature
        for feature in FEATURE_COLUMNS
        if feature not in payload
        or is_missing(payload[feature])
    ]

    if missing_features:
        raise ValueError(
            "Required features are missing: "
            + ", ".join(missing_features)
        )

    feature_values = {
        feature: payload[feature]
        for feature in FEATURE_COLUMNS
    }

    feature_df = pd.DataFrame(
        [feature_values],
        columns=FEATURE_COLUMNS,
    )

    # Strip whitespace from categorical values.
    categorical_columns = (
        feature_df
        .select_dtypes(
            include=[
                "object",
                "category",
                "string",
            ]
        )
        .columns
        .tolist()
    )

    for column in categorical_columns:
        feature_df[column] = (
            feature_df[column]
            .astype("string")
            .str.strip()
            .astype(object)
        )

    # Replace invalid numeric values.
    numeric_columns = (
        feature_df
        .select_dtypes(
            include=["number", "bool"]
        )
        .columns
        .tolist()
    )

    if numeric_columns:
        feature_df[numeric_columns] = (
            feature_df[numeric_columns]
            .replace(
                [np.inf, -np.inf],
                np.nan,
            )
        )

    feature_df = feature_df.replace(
        {
            pd.NA: np.nan,
        }
    )

    if feature_df.isna().any().any():
        invalid_columns = (
            feature_df.columns[
                feature_df.isna().any()
            ].tolist()
        )

        raise ValueError(
            "Missing or invalid values remain in: "
            + ", ".join(invalid_columns)
        )

    return feature_df


# ============================================================
# 13. TRANSFORMATION HELPERS
# ============================================================

def to_dense_float32(
    transformed_features: Any,
) -> np.ndarray:
    """
    Convert sparse or dense preprocessor output into a dense
    float32 NumPy array for PyTorch.
    """

    if hasattr(transformed_features, "toarray"):
        transformed_features = (
            transformed_features.toarray()
        )

    dense_array = np.asarray(
        transformed_features,
        dtype=np.float32,
    )

    if dense_array.ndim == 1:
        dense_array = dense_array.reshape(
            1,
            -1,
        )

    if dense_array.ndim != 2:
        raise ValueError(
            "Neural-network transformed input must be "
            "two-dimensional."
        )

    if not np.isfinite(dense_array).all():
        raise ValueError(
            "Neural-network input contains NaN or infinite "
            "values after preprocessing."
        )

    return dense_array


# ============================================================
# 14. SKLEARN/XGBOOST PREDICTION
# ============================================================

def predict_sklearn_models(
    raw_features: pd.DataFrame,
) -> dict[str, dict[str, Any]]:
    """
    Generate probabilities from the eight sklearn/XGBoost
    models.
    """

    transformed_features = (
        common_preprocessor.transform(
            raw_features
        )
    )

    individual_results = {}

    for model_name, model in sklearn_models.items():
        if is_complete_pipeline(model):
            model_input = raw_features
        else:
            model_input = transformed_features

        probability_matrix = (
            model.predict_proba(
                model_input
            )
        )

        probability_matrix = np.asarray(
            probability_matrix
        )

        if probability_matrix.ndim != 2:
            raise ValueError(
                f"{model_name} predict_proba() returned "
                f"shape {probability_matrix.shape}. "
                "A two-dimensional probability matrix was "
                "expected."
            )

        positive_class_index = (
            get_positive_class_index(model)
        )

        probability = float(
            probability_matrix[
                0,
                positive_class_index,
            ]
        )

        probability = validate_probability(
            probability=probability,
            model_name=model_name,
        )

        individual_results[model_name] = (
            build_model_result(probability)
        )

    return individual_results


# ============================================================
# 15. PYTORCH NEURAL-NETWORK PREDICTION
# ============================================================

def predict_neural_network(
    raw_features: pd.DataFrame,
) -> dict[str, Any]:
    """
    Generate the class-1 probability from the PyTorch model.

    The neural network emits one raw logit. Sigmoid converts
    the logit to a probability.
    """

    transformed_features = (
        neural_network_preprocessor.transform(
            raw_features
        )
    )

    dense_features = to_dense_float32(
        transformed_features
    )

    expected_features = getattr(
        neural_network_model,
        "checkpoint_input_size",
        None,
    )

    actual_features = dense_features.shape[1]

    if expected_features is None:
        raise AttributeError(
            "The neural-network model does not contain its "
            "checkpoint input size."
        )

    if actual_features != expected_features:
        raise ValueError(
            f"The neural network expects {expected_features} "
            "transformed features, but its preprocessor "
            f"produced {actual_features}."
        )

    input_tensor = torch.tensor(
        dense_features,
        dtype=torch.float32,
        device=DEVICE,
    )

    neural_network_model.eval()

    with torch.no_grad():
        logits = neural_network_model(
            input_tensor
        )

        probabilities = torch.sigmoid(
            logits
        )

    probability = float(
        probabilities
        .detach()
        .cpu()
        .numpy()
        .reshape(-1)[0]
    )

    probability = validate_probability(
        probability=probability,
        model_name=NEURAL_NETWORK_MODEL_NAME,
    )

    return build_model_result(probability)


# ============================================================
# 16. PREDICT WITH ALL NINE MODELS
# ============================================================

def predict_with_all_models(
    feature_df: pd.DataFrame,
) -> dict[str, Any]:
    """
    Run all nine models and create both voting results.

    Soft voting:
        Average of all nine return probabilities.

    Hard voting:
        At least five of nine models must predict Returned.
    """

    individual_results = (
        predict_sklearn_models(
            feature_df
        )
    )

    individual_results[
        NEURAL_NETWORK_MODEL_NAME
    ] = predict_neural_network(
        feature_df
    )

    model_count = len(
        individual_results
    )

    if model_count != EXPECTED_MODEL_COUNT:
        raise RuntimeError(
            f"Expected {EXPECTED_MODEL_COUNT} model results, "
            f"but received {model_count}."
        )

    probabilities = np.asarray(
        [
            result["return_probability"]
            for result in individual_results.values()
        ],
        dtype=float,
    )

    predictions = np.asarray(
        [
            result["prediction"]
            for result in individual_results.values()
        ],
        dtype=int,
    )

    # --------------------------------------------------------
    # Soft voting
    # --------------------------------------------------------

    soft_probability = float(
        probabilities.mean()
    )

    soft_prediction = int(
        soft_probability
        >= CLASSIFICATION_THRESHOLD
    )

    # --------------------------------------------------------
    # Hard voting
    #
    # Nine models cannot create a tie.
    # Five or more Returned votes means Returned.
    # --------------------------------------------------------

    return_votes = int(
        predictions.sum()
    )

    not_return_votes = int(
        model_count - return_votes
    )

    hard_vote_fraction = float(
        return_votes / model_count
    )

    hard_prediction = int(
        return_votes >= 5
    )

    return {
        "status": "success",

        "model_count": model_count,

        "classification_threshold": (
            CLASSIFICATION_THRESHOLD
        ),

        # Main result shown by the frontend uses soft voting.
        "prediction": soft_prediction,

        "prediction_label": (
            "Returned"
            if soft_prediction == 1
            else "Not Returned"
        ),

        "return_probability": round(
            soft_probability,
            6,
        ),

        "return_probability_percent": round(
            soft_probability * 100,
            2,
        ),

        "soft_voting": {
            "method": (
                "Unweighted arithmetic mean of all nine "
                "class-1 probabilities"
            ),

            "return_probability": round(
                soft_probability,
                6,
            ),

            "return_probability_percent": round(
                soft_probability * 100,
                2,
            ),

            "prediction": soft_prediction,

            "prediction_label": (
                "Returned"
                if soft_prediction == 1
                else "Not Returned"
            ),
        },

        "hard_voting": {
            "method": (
                "Strict majority vote: at least 5 of 9 "
                "models must predict Returned"
            ),

            "return_votes": return_votes,

            "not_return_votes": (
                not_return_votes
            ),

            "total_models": model_count,

            "vote_fraction": round(
                hard_vote_fraction,
                6,
            ),

            "prediction": hard_prediction,

            "prediction_label": (
                "Returned"
                if hard_prediction == 1
                else "Not Returned"
            ),
        },

        "individual_models": (
            individual_results
        ),
    }


# ============================================================
# 17. API ROUTES
# ============================================================

@app.get("/")
def root():
    """
    Basic service information.
    """

    loaded_model_count = (
        len(sklearn_models)
        + int(neural_network_model is not None)
    )

    return {
        "message": (
            "Return Probability ML service is running"
        ),

        "expected_model_count": (
            EXPECTED_MODEL_COUNT
        ),

        "loaded_model_count": (
            loaded_model_count
        ),
    }


@app.get("/health")
def health():
    """
    Report loaded models and preprocessors.
    """

    model_names = list(
        sklearn_models.keys()
    )

    if neural_network_model is not None:
        model_names.append(
            NEURAL_NETWORK_MODEL_NAME
        )

    loaded_model_count = len(
        model_names
    )

    return {
        "status": (
            "healthy"
            if loaded_model_count
            == EXPECTED_MODEL_COUNT
            else "incomplete"
        ),

        "expected_model_count": (
            EXPECTED_MODEL_COUNT
        ),

        "loaded_model_count": (
            loaded_model_count
        ),

        "models_loaded": (
            model_names
        ),

        "common_preprocessor_loaded": (
            common_preprocessor is not None
        ),

        "neural_network_preprocessor_loaded": (
            neural_network_preprocessor is not None
        ),

        "neural_network_input_size": (
            getattr(
                neural_network_model,
                "checkpoint_input_size",
                None,
            )
            if neural_network_model is not None
            else None
        ),

        "pytorch_device": str(
            DEVICE
        ),

        "feature_count": len(
            FEATURE_COLUMNS
        ),
    }


@app.get("/features")
def features():
    """
    Return the required frontend feature names.
    """

    return {
        "feature_count": len(
            FEATURE_COLUMNS
        ),

        "features": (
            FEATURE_COLUMNS
        ),
    }


@app.post("/predict")
def predict(request: PredictionRequest):
    """
    Predict one frontend data point using all nine models.
    """

    try:
        payload = request.model_dump()

        # model_dump() normally contains extra fields in Pydantic
        # v2. This update also covers alternate configurations.
        if request.model_extra:
            payload.update(
                request.model_extra
            )

        if not payload:
            raise ValueError(
                "The prediction request body is empty."
            )

        feature_df = (
            prepare_prediction_data(
                payload
            )
        )

        prediction_result = (
            predict_with_all_models(
                feature_df
            )
        )

        return prediction_result

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        ) from error

    except (
        FileNotFoundError,
        KeyError,
        TypeError,
        AttributeError,
        RuntimeError,
    ) as error:
        print(
            "Prediction configuration error: "
            f"{type(error).__name__}: {error}"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Prediction configuration error: "
                f"{type(error).__name__}: {error}"
            ),
        ) from error

    except Exception as error:
        print(
            "Unexpected prediction error: "
            f"{type(error).__name__}: {error}"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unexpected prediction error inside the "
                f"ML service: {type(error).__name__}: {error}"
            ),
        ) from error