const express = require("express");
const cors = require("cors");

const app = express();

const PORT = 8000;
const ML_SERVICE_URL = "http://127.0.0.1:8001";

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    message: "Return Probability backend is running",
  });
});

app.get("/health", async (req, res) => {
  try {
    const response = await fetch(
      `${ML_SERVICE_URL}/health`
    );

    const result = await response.json();

    return res.status(response.status).json({
      status: "healthy",
      node_backend: "running",
      ml_service: result,
    });
  } catch (error) {
    return res.status(503).json({
      status: "error",
      message: "Python ML service is not reachable",
      detail: error.message,
    });
  }
});

app.post("/predict", async (req, res) => {
  try {
    if (
      !req.body ||
      typeof req.body !== "object" ||
      Array.isArray(req.body)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Request body must be a JSON object",
      });
    }

    console.log("POST /predict received");

    const mlResponse = await fetch(
      `${ML_SERVICE_URL}/predict`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      }
    );

    const responseText = await mlResponse.text();

    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = {
        status: "error",
        detail: responseText,
      };
    }

    return res
      .status(mlResponse.status)
      .json(responseData);
  } catch (error) {
    console.error(
      "Prediction request failed:",
      error
    );

    return res.status(503).json({
      status: "error",
      message: "Python ML service is not reachable",
      detail: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `Express backend: http://localhost:${PORT}`
  );

  console.log(
    `Prediction endpoint: http://localhost:${PORT}/predict`
  );

  console.log(
    `Python ML service: ${ML_SERVICE_URL}`
  );
});