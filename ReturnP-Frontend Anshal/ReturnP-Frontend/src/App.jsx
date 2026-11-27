import { useEffect, useRef, useState } from "react";
import "./App.css";
import Dashboard from "./pages/Dashboard";
import LTMLogo from "./assets/LTM.png";
import HeroBG from "./assets/HeroBG.webp";
import HeroShopping from "./assets/hero-shopping.webp";
import DeliveryReturns from "./assets/delivery-returns.webp";
import AnalyticsCart from "./assets/analytics-cart.webp";
import FashionFlatlay from "./assets/fashion-flatlay.webp";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000";

const initialFormData = {
  // Order / Transaction
  product_category: "Electronics",
  price: 250.0,
  quantity: 1,
  order_weekday: "Monday",
  order_hour: 14,
  delivery_days: 3,
  shipping_type: "Standard",
  is_prime_member: 1,
  seller_rating: 4.5,
  previous_returns_count: 2,
  customer_tenure_days: 540,
  customer_total_orders: 15,
  payment_method: "Credit Card",
  discount_pct: 10.0,

  // Product / Merchandise
  product_age_days: 400,
  color: "Black",
  size: "Standard",
  inventory_qty: 120,
  material_type: "Plastic",
  is_fragile: 0,
  is_perishable: 0,
  product_weight_kg: 1.5,
  product_value_band: "Medium",
  subcategory_name: "Accessories",
  division_name: "General Merchandise",
  brand_name: "Example Brand",
  brand_country: "India",

  // Channel / Store / Seller
  bu_name: "Retail",
  bu_type: "Consumer",
  channel_name: "Online",
  channel_type: "Digital",
  platform: "Website",
  store_type: "Online",
  store_city: "Hyderabad",
  store_state: "Telangana",
  warehouse_city: "Hyderabad",
  warehouse_state: "Telangana",
  warehouse_capacity_units: 10000,
  seller_type: "Marketplace",
  seller_location: "Hyderabad",
  seller_order_count: 5000,

  // Browser / Customer Behaviour
  tab_switch_count_and_time_away_from_page: 18.0,
  gap_between_repeat_visits_to_same_product_hours: 12.5,
  product_views_before_purchase: 6,
  product_page_dwell_sec: 240.0,
  add_to_cart_count: 2,
  remove_from_cart_count: 1,
  cart_abandonment_count: 1,
  similar_products_compared: 4,
  sessions_before_purchase: 3,
  wishlist_added: 0,
  size_chart_used: 0,
  return_policy_viewed: 1,

  // Customer Geography
  customer_city: "Hyderabad",
  customer_state: "Telangana",

  // Logistics / Delivery
  route_distance_km: 18.5,
  traffic_level_synthetic: "Moderate",
  traffic_delay_minutes_synthetic: 12.0,
  weather_condition_synthetic: "Rain",
  temperature_c_synthetic: 28.0,
  precipitation_mm_synthetic: 2.5,
  weather_severity_score_synthetic: 0.35,
  delivery_delay_hours: 5.5,
  delivery_attempts: 1,
  package_damage_flag: 0,
  customer_support_contacts: 1,

  // Macroeconomic
  usd_inr_rate: 86.5,
  mcx_icomdex_composite_close: 15500.0,
  diesel_price_inr_per_litre: 90.0,
  sensex_close: 81973.05,
  sensex_change_pct: 0.7271,
  nasdaq_close: 18342.94,
  nasdaq_change_pct: 0.3331,

  // Order Date-Time
  order_month: 11,
  order_day_of_month: 10,
  order_day_of_week_numeric: 1,
  order_quarter: 4,
  is_weekend: 0,
};

const sections = [
  {
    title: "Order and Transaction Features",
    icon: "🛒",
    fields: [
      "product_category",
      "price",
      "quantity",
      "order_weekday",
      "order_hour",
      "delivery_days",
      "shipping_type",
      "is_prime_member",
      "seller_rating",
      "previous_returns_count",
      "customer_tenure_days",
      "customer_total_orders",
      "payment_method",
      "discount_pct",
    ],
  },
  {
    title: "Product and Merchandise Features",
    icon: "📦",
    fields: [
      "product_age_days",
      "color",
      "size",
      "inventory_qty",
      "material_type",
      "is_fragile",
      "is_perishable",
      "product_weight_kg",
      "product_value_band",
      "subcategory_name",
      "division_name",
      "brand_name",
      "brand_country",
    ],
  },
  {
    title: "Channel, Store and Seller Features",
    icon: "🏪",
    fields: [
      "bu_name",
      "bu_type",
      "channel_name",
      "channel_type",
      "platform",
      "store_type",
      "store_city",
      "store_state",
      "warehouse_city",
      "warehouse_state",
      "warehouse_capacity_units",
      "seller_type",
      "seller_location",
      "seller_order_count",
    ],
  },
  {
    title: "Customer Behaviour Features",
    icon: "🖥️",
    fields: [
      "tab_switch_count_and_time_away_from_page",
      "gap_between_repeat_visits_to_same_product_hours",
      "product_views_before_purchase",
      "product_page_dwell_sec",
      "add_to_cart_count",
      "remove_from_cart_count",
      "cart_abandonment_count",
      "similar_products_compared",
      "sessions_before_purchase",
      "wishlist_added",
      "size_chart_used",
      "return_policy_viewed",
    ],
  },
  {
    title: "Customer Geography",
    icon: "📍",
    fields: [
      "customer_city",
      "customer_state",
    ],
  },
  {
    title: "Logistics and Delivery Features",
    icon: "🚚",
    fields: [
      "route_distance_km",
      "traffic_level_synthetic",
      "traffic_delay_minutes_synthetic",
      "weather_condition_synthetic",
      "temperature_c_synthetic",
      "precipitation_mm_synthetic",
      "weather_severity_score_synthetic",
      "delivery_delay_hours",
      "delivery_attempts",
      "package_damage_flag",
      "customer_support_contacts",
    ],
  },
  {
    title: "Macroeconomic Features",
    icon: "📈",
    fields: [
      "usd_inr_rate",
      "mcx_icomdex_composite_close",
      "diesel_price_inr_per_litre",
      "sensex_close",
      "sensex_change_pct",
      "nasdaq_close",
      "nasdaq_change_pct",
    ],
  },
  {
    title: "Order Date-Time Features",
    icon: "📅",
    fields: [
      "order_month",
      "order_day_of_month",
      "order_day_of_week_numeric",
      "order_quarter",
      "is_weekend",
    ],
  },
];

const selectOptions = {
  product_category: [
    "Electronics",
    "Clothing",
    "Home",
    "Beauty",
    "Sports",
    "Books",
  ],
  order_weekday: [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ],
  shipping_type: [
    "Standard",
    "Express",
    "Same Day",
  ],
  payment_method: [
    "Credit Card",
    "Debit Card",
    "UPI",
    "Cash on Delivery",
    "Net Banking",
  ],
  product_value_band: [
    "Low",
    "Medium",
    "High",
  ],
  channel_type: [
    "Digital",
    "Physical",
  ],
  platform: [
    "Website",
    "Mobile App",
    "Store",
  ],
  store_type: [
    "Online",
    "Physical",
    "Hybrid",
  ],
  seller_type: [
    "Marketplace",
    "Direct",
    "Third Party",
  ],
  traffic_level_synthetic: [
    "Low",
    "Moderate",
    "High",
    "Severe",
  ],
  weather_condition_synthetic: [
    "Clear",
    "Cloudy",
    "Rain",
    "Storm",
    "Fog",
  ],
};

const binaryFields = [
  "is_prime_member",
  "is_fragile",
  "is_perishable",
  "wishlist_added",
  "size_chart_used",
  "return_policy_viewed",
  "package_damage_flag",
  "is_weekend",
];

const formatLabel = (field) =>
  field
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) => letter.toUpperCase()
    );

function getErrorMessage(responseData, statusCode) {
  if (typeof responseData?.detail === "string") {
    return responseData.detail;
  }

  if (Array.isArray(responseData?.detail)) {
    return responseData.detail
      .map((error) => {
        const location = Array.isArray(error.loc)
          ? error.loc.join(".")
          : "request";

        return `${location}: ${error.msg}`;
      })
      .join("; ");
  }

  if (typeof responseData?.message === "string") {
    return responseData.message;
  }

  return `Backend returned status ${statusCode}.`;
}

function formatPercentage(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "Not available";
  }

  return `${numericValue.toFixed(2)}%`;
}

/* =========================================================
   LIVELY UI HELPERS AND STATIC CONTENT
   ========================================================= */

const scrollToId = (id) => {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const categoryPills = [
  { icon: "📱", label: "Electronics" },
  { icon: "👕", label: "Clothing" },
  { icon: "🏠", label: "Home" },
  { icon: "💄", label: "Beauty" },
  { icon: "⚽", label: "Sports" },
  { icon: "📚", label: "Books" },
  { icon: "👟", label: "Footwear" },
  { icon: "⌚", label: "Accessories" },
];

const howItWorksSteps = [
  {
    icon: "🧾",
    title: "Enter the order",
    text: "Walk through eight short pages covering the order, product, customer behaviour, delivery and market context.",
  },
  {
    icon: "🤖",
    title: "Nine models analyse it",
    text: "Logistic Regression, tree ensembles, SVM, KNN, XGBoost and a neural network each score the same order.",
  },
  {
    icon: "🎯",
    title: "Get the return probability",
    text: "See the combined soft and hard voting result along with every individual model prediction.",
  },
];

function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;

    if (!node) {
      return undefined;
    }

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function CountUp({ end, duration = 1200 }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      setValue(end);
      return undefined;
    }

    let frameId;
    const startTime = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setValue(Math.round(end * eased));

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [end, duration]);

  return <>{value}</>;
}

function App() {
  const [page, setPage] = useState("home");

  const [formData, setFormData] = useState({
    ...initialFormData,
  });

  const [currentSectionIndex, setCurrentSectionIndex] =
    useState(0);

  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const currentSection = sections[currentSectionIndex];

  const isFirstSection = currentSectionIndex === 0;

  const isLastSection =
    currentSectionIndex === sections.length - 1;

  const progressPercentage =
    ((currentSectionIndex + 1) / sections.length) * 100;

  const handleChange = (event) => {
    const { name, value } = event.target;
    const originalValue = initialFormData[name];

    setFormData((previousData) => ({
      ...previousData,
      [name]:
        typeof originalValue === "number"
          ? value === ""
            ? ""
            : Number(value)
          : value,
    }));
  };

  const resetCurrentSection = () => {
    setFormData((previousData) => {
      const updatedData = {
        ...previousData,
      };

      currentSection.fields.forEach((field) => {
        updatedData[field] = initialFormData[field];
      });

      return updatedData;
    });

    setResult(null);
    setStatus("");
    setErrorMessage("");
  };

  const goToNextSection = () => {
    if (!isLastSection) {
      setCurrentSectionIndex(
        (previousIndex) => previousIndex + 1
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const goToPreviousSection = () => {
    if (!isFirstSection) {
      setCurrentSectionIndex(
        (previousIndex) => previousIndex - 1
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const openHomePage = () => {
    setPage("home");
  };

  const handleInference = async (event) => {
    event.preventDefault();

    setLoading(true);
    setStatus("");
    setResult(null);
    setErrorMessage("");

    try {
      const response = await fetch(
        `${API_URL}/predict`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const responseText = await response.text();

      let responseData;

      try {
        responseData = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        throw new Error(
          "The backend returned a response that was not valid JSON."
        );
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            responseData,
            response.status
          )
        );
      }

      setResult(responseData);
      setStatus("success");
    } catch (error) {
      console.error("Inference error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The prediction request failed."
      );

      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field) => {
    if (selectOptions[field]) {
      return (
        <select
          id={field}
          name={field}
          value={formData[field]}
          onChange={handleChange}
          required
        >
          {selectOptions[field].map((option) => (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (binaryFields.includes(field)) {
      return (
        <select
          id={field}
          name={field}
          value={formData[field]}
          onChange={handleChange}
          required
        >
          <option value={1}>Yes</option>
          <option value={0}>No</option>
        </select>
      );
    }

    const isNumber =
      typeof initialFormData[field] === "number";

    return (
      <input
        id={field}
        name={field}
        type={isNumber ? "number" : "text"}
        step={isNumber ? "any" : undefined}
        value={formData[field]}
        onChange={handleChange}
        required
      />
    );
  };

  const individualModelEntries =
    result?.individual_models
      ? Object.entries(result.individual_models)
      : [];

  return (
    <div className="app">
      <header className="header">
        <button
          className="brand"
          type="button"
          onClick={openHomePage}
        >
          <img
            src={LTMLogo}
            alt="LTM"
            className="brand-logo"
          />

          <span>
            <strong>Return Probability</strong>
            <small>AI Prediction System</small>
          </span>
        </button>

        <nav
          className="navigation"
          aria-label="Main navigation"
        >
          <button
            type="button"
            className={
              page === "home"
                ? "nav-button active"
                : "nav-button"
            }
            onClick={openHomePage}
          >
            Home
          </button>




            <button
    type="button"
    className={
      page === "dashboard"
        ? "nav-button active"
        : "nav-button"
    }
    onClick={() => setPage("dashboard")}
  >
    Dashboard
  </button>

          <button
            type="button"
            className={
              page === "about"
                ? "nav-button active"
                : "nav-button"
            }
            onClick={() => setPage("about")}
          >
            About
          </button>
        </nav>
      </header>

      <main>
        {page === "home" ? (
          <>
<section
              className="hero"
              style={{
                backgroundImage: `url(${HeroBG})`,
              }}
            >
              <div className="hero-inner">
                <div className="hero-content">
                  <span className="hero-badge">
                    ✨ Model Ensemble
                  </span>

                  <h1>Predict Product Return Probability</h1>

                  <p>
                    Enter the order, customer, product,
                    behavioural, logistics and market
                    information to estimate the probability
                    of a product being returned.
                  </p>

                  <div className="hero-actions">
                    <button
                      type="button"
                      className="hero-cta primary"
                      onClick={() => scrollToId("predict-form")}
                    >
                      Start Prediction →
                    </button>

                    <button
                      type="button"
                      className="hero-cta secondary"
                      onClick={() => scrollToId("how-it-works")}
                    >
                      How it works
                    </button>
                  </div>

                  <ul className="hero-stats">
                    <li>
                      <strong>
                        <CountUp end={9} />
                      </strong>
                      <span>ML models</span>
                    </li>
                    <li>
                      <strong>
                        <CountUp end={78} />
                      </strong>
                      <span>Input features</span>
                    </li>
                    <li>
                      <strong>
                        <CountUp end={8} />
                      </strong>
                      <span>Feature categories</span>
                    </li>
                  </ul>
                </div>

                <div className="hero-visual">
                  <img
                    className="hero-image"
                    src={HeroShopping}
                    width="960"
                    height="640"
                    alt="Smartphone product page with shopping cart, bags and parcels"
                  />

                  <div className="float-chip chip-one">
                    <span aria-hidden="true">🛒</span>
                    Cart behaviour
                  </div>
                  <div className="float-chip chip-two">
                    <span aria-hidden="true">🚚</span>
                    Delivery signals
                  </div>
                  <div className="float-chip chip-three">
                    <span aria-hidden="true">📈</span>
                    Market context
                  </div>
                </div>
              </div>
            </section>

            <form
              id="predict-form"
              className="form-container"
              onSubmit={handleInference}
            >
              <div className="form-heading">
                <div>
                  <span className="eyebrow">
                    Step {currentSectionIndex + 1} of{" "}
                    {sections.length}
                  </span>

                  <h2>{currentSection.title}</h2>

                  <p>
                    Review the values on this page and
                    continue to the next feature category.
                  </p>
                </div>

                <button
                  type="button"
                  className="reset-button"
                  onClick={resetCurrentSection}
                  disabled={loading}
                >
                  Reset This Page
                </button>
              </div>

              <div className="form-progress">
                <div className="form-progress-text">
                  <span>
                    Feature category{" "}
                    {currentSectionIndex + 1} of{" "}
                    {sections.length}
                  </span>

                  <strong>
                    {Math.round(progressPercentage)}%
                  </strong>
                </div>

                <div className="form-progress-track">
                  <div
                    className="form-progress-value"
                    style={{
                      width: `${progressPercentage}%`,
                    }}
                  />
                </div>
              </div>

              <div
                className="section-step-list"
                aria-label="Feature categories"
              >
                {sections.map((section, index) => (
                  <button
                    key={section.title}
                    type="button"
                    className={
                      index === currentSectionIndex
                        ? "section-step active"
                        : index < currentSectionIndex
                          ? "section-step completed"
                          : "section-step"
                    }
                    onClick={() =>
                      setCurrentSectionIndex(index)
                    }
                    disabled={loading}
                    title={section.title}
                  >
                    <span>{index + 1}</span>
                  </button>
                ))}
              </div>

              <section className="form-section">
                <div className="section-heading">
                  <span
                    className="section-icon"
                    aria-hidden="true"
                  >
                    {currentSection.icon}
                  </span>

                  <h3>{currentSection.title}</h3>
                </div>

                <div className="field-grid">
                  {currentSection.fields.map((field) => (
                    <div
                      className="form-field"
                      key={field}
                    >
                      <label htmlFor={field}>
                        {formatLabel(field)}
                      </label>

                      {renderField(field)}
                    </div>
                  ))}
                </div>
              </section>

              <div className="form-navigation">
                <button
                  type="button"
                  className="previous-button"
                  onClick={goToPreviousSection}
                  disabled={isFirstSection || loading}
                >
                  ← Previous
                </button>

                <span className="page-position">
                  Page {currentSectionIndex + 1} of{" "}
                  {sections.length}
                </span>

                {!isLastSection ? (
                  <button
                    type="button"
                    className="next-button"
                    onClick={goToNextSection}
                    disabled={loading}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    className="inference-button"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span
                          className="spinner"
                          aria-hidden="true"
                        />
                        Running inference...
                      </>
                    ) : (
                      <>Run Inference →</>
                    )}
                  </button>
                )}
              </div>

              {isLastSection && (
                <div aria-live="polite">
                  {status === "success" && result && (
                    <section className="result-box success">
                      <div className="result-header">
                        <div>
                          <span className="result-eyebrow">
                            Ensemble prediction
                          </span>

                          <h3>
                            {result.prediction_label}
                          </h3>

                          <p className="result-description">
                            The primary prediction uses the
                            soft-voting probability across
                            all models returned by the
                            backend.
                          </p>
                        </div>

                        <div
                          className={
                            result.prediction === 1
                              ? "probability-circle returned"
                              : "probability-circle not-returned"
                          }
                        >
                          {formatPercentage(
                            result.return_probability_percent
                          )}
                        </div>
                      </div>

                      <div className="result-summary-grid">
                        <div className="result-stat">
                          <span>
                            Soft-voting probability
                          </span>

                          <strong>
                            {formatPercentage(
                              result.soft_voting
                                ?.return_probability_percent ??
                                result.return_probability_percent
                            )}
                          </strong>
                        </div>

                        <div className="result-stat">
                          <span>
                            Soft-voting prediction
                          </span>

                          <strong>
                            {result.soft_voting
                              ?.prediction_label ??
                              result.prediction_label}
                          </strong>
                        </div>

                        <div className="result-stat">
                          <span>
                            Hard-voting prediction
                          </span>

                          <strong>
                            {result.hard_voting
                              ?.prediction_label ??
                              "Not available"}
                          </strong>
                        </div>

                        <div className="result-stat">
                          <span>Return votes</span>

                          <strong>
                            {result.hard_voting
                              ?.return_votes ??
                              "Not available"}
                            /
                            {result.hard_voting
                              ?.total_models ??
                              individualModelEntries.length}
                          </strong>
                        </div>

                        <div className="result-stat">
                          <span>Models evaluated</span>

                          <strong>
                            {individualModelEntries.length}
                          </strong>
                        </div>

                        <div className="result-stat">
                          <span>
                            Classification threshold
                          </span>

                          <strong>
                            {Number.isFinite(
                              Number(result.threshold)
                            )
                              ? Number(
                                  result.threshold
                                ).toFixed(2)
                              : "0.50"}
                          </strong>
                        </div>
                      </div>

                      <div className="models-heading">
                        <div>
                          <h4>
                            Individual Model Results
                          </h4>

                          <p>
                            Probability represents the
                            estimated probability of the
                            product being returned.
                          </p>
                        </div>

                        <span className="model-count-badge">
                          {individualModelEntries.length}{" "}
                          model
                          {individualModelEntries.length ===
                          1
                            ? ""
                            : "s"}
                        </span>
                      </div>

                      {individualModelEntries.length > 0 ? (
                        <div className="model-results">
                          <div className="model-result-header">
                            <span>Model</span>
                            <span>Probability</span>
                            <span>Prediction</span>
                          </div>

                          {individualModelEntries.map(
                            ([
                              modelName,
                              modelResult,
                            ]) => (
                              <div
                                className="model-result-row"
                                key={modelName}
                              >
                                <span className="model-name">
                                  {modelName}
                                </span>

                                <strong>
                                  {formatPercentage(
                                    modelResult
                                      .return_probability_percent
                                  )}
                                </strong>

                                <span
                                  className={
                                    modelResult.prediction ===
                                    1
                                      ? "prediction-badge returned"
                                      : "prediction-badge not-returned"
                                  }
                                >
                                  {
                                    modelResult.prediction_label
                                  }
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="no-model-results">
                          The backend did not return
                          individual model results.
                        </p>
                      )}

                      {individualModelEntries.length !==
                        9 && (
                        <div className="model-warning">
                          <strong>
                            Expected nine models, but the
                            backend returned{" "}
                            {
                              individualModelEntries.length
                            }
                            .
                          </strong>

                          <span>
                            Check whether the PyTorch neural
                            network was loaded and added to
                            the backend ensemble.
                          </span>
                        </div>
                      )}
                    </section>
                  )}

                  {status === "error" && (
                    <section className="result-box error">
                      <h3>Inference Failed</h3>

                      <p>{errorMessage}</p>

                      <p className="error-help">
                        Confirm that the Python ML service is
                        running on port 8001 and the Express
                        backend is running on port 8000.
                      </p>
                    </section>
                  )}
                </div>
              )}
            </form>

            <section
              className="category-strip"
              aria-label="Product categories"
            >
              <div className="marquee">
                <div className="marquee-track">
                  {[...categoryPills, ...categoryPills].map(
                    (pill, index) => (
                      <span
                        className="category-pill"
                        key={`${pill.label}-${index}`}
                        aria-hidden={index >= categoryPills.length}
                      >
                        <span aria-hidden="true">{pill.icon}</span>
                        {pill.label}
                      </span>
                    )
                  )}
                </div>
              </div>
            </section>

            <section
              className="content-section"
              id="how-it-works"
            >
              <Reveal className="section-intro">
                <span className="eyebrow accent">How it works</span>
                <h2>From order details to return risk in three steps</h2>
                <p>
                  A simple flow that turns everyday e-commerce
                  signals into a clear return probability.
                </p>
              </Reveal>

              <div className="steps-grid">
                {howItWorksSteps.map((step, index) => (
                  <Reveal key={step.title} delay={index * 120}>
                    <article className="step-card">
                      <span className="step-number">
                        {index + 1}
                      </span>
                      <span
                        className="step-icon"
                        aria-hidden="true"
                      >
                        {step.icon}
                      </span>
                      <h3>{step.title}</h3>
                      <p>{step.text}</p>
                    </article>
                  </Reveal>
                ))}
              </div>
            </section>

            <section className="content-section">
              <Reveal className="feature-row">
                <div className="feature-media">
                  <img
                    src={DeliveryReturns}
                    width="800"
                    height="533"
                    alt="Delivery truck with parcels and a return arrow"
                    loading="lazy"
                  />
                </div>

                <div className="feature-copy">
                  <span className="eyebrow accent">
                    Delivery and returns
                  </span>
                  <h2>Fulfilment signals that explain returns</h2>
                  <p>
                    Returns rarely start at the customer. Delays,
                    damaged packages and repeated delivery
                    attempts are part of the picture.
                  </p>
                  <ul className="check-list">
                    <li>Delivery delay and attempts</li>
                    <li>Package damage and support contacts</li>
                    <li>Route distance, traffic and weather</li>
                  </ul>
                </div>
              </Reveal>

              <Reveal className="feature-row reverse">
                <div className="feature-media">
                  <img
                    src={AnalyticsCart}
                    width="800"
                    height="533"
                    alt="Analytics dashboard above a shopping cart"
                    loading="lazy"
                  />
                </div>

                <div className="feature-copy">
                  <span className="eyebrow accent">
                    Ensemble prediction
                  </span>
                  <h2>Every model gets a vote</h2>
                  <p>
                    Nine independently trained models score the
                    same order, so you see the combined answer and
                    how much the models agree.
                  </p>
                  <ul className="check-list">
                    <li>Soft voting across all probabilities</li>
                    <li>Hard voting by majority of models</li>
                    <li>Model-by-model probability breakdown</li>
                  </ul>
                </div>
              </Reveal>
            </section>

            <section className="content-section">
              <Reveal>
                <div className="showcase">
                  <img
                    src={FashionFlatlay}
                    width="1000"
                    height="667"
                    alt="Fashion e-commerce products including sneakers, denim jacket, handbag, sunglasses and smartwatch"
                    loading="lazy"
                  />
                  <div className="showcase-caption">
                    <span className="eyebrow accent">
                      Every category
                    </span>
                    <h3>
                      From sneakers to smartwatches, one prediction
                      workflow
                    </h3>
                  </div>
                </div>
              </Reveal>
            </section>

            <section className="content-section cta-section">
              <Reveal>
                <div className="cta-banner">
                  <div>
                    <h2>Ready to check an order?</h2>
                    <p>
                      Fill in the order details and see the
                      return probability in seconds.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="cta-button"
                    onClick={() => scrollToId("predict-form")}
                  >
                    Start Prediction ↑
                  </button>
                </div>
              </Reveal>
            </section>
          </>
        ) 
        : page === "dashboard" ? (
          <Dashboard />)
        : (
          <section className="about-page">
            <div className="about-card">
              <img
                className="about-image"
                src={HeroShopping}
                alt="Online shopping illustration"
              />

              <span className="about-eyebrow">
                Proof of concept
              </span>

              <h1>Product Return Prediction</h1>

              <p>
                This application sends order, customer,
                product, behavioural, logistics and market
                features to a nine-model machine-learning
                ensemble.
              </p>

              <ul className="about-model-list">
                <li>
                  <a
                    href="https://en.wikipedia.org/wiki/Logistic_regression"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Logistic Regression
                  </a>
                </li>

                <li>
                  <a
                    href="https://en.wikipedia.org/wiki/Decision_tree_learning"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Decision Tree
                  </a>
                </li>

                <li>
                  <a
                    href="https://en.wikipedia.org/wiki/K-nearest_neighbors_algorithm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    K-Nearest Neighbors
                  </a>
                </li>

                <li>
                  <a
                    href="https://en.wikipedia.org/wiki/Stochastic_gradient_descent"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    SGD Classifier
                  </a>
                </li>

                <li>
                  <a
                    href="https://en.wikipedia.org/wiki/Support_vector_machine"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Support Vector Machine
                  </a>
                </li>

                <li>
                  <a
                    href="https://en.wikipedia.org/wiki/Gradient_boosting"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Gradient Boosting
                  </a>
                </li>

                <li>
                  <a
                    href="https://en.wikipedia.org/wiki/Random_forest"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Random Forest
                  </a>
                </li>

                <li>
                  <a
                    href="https://en.wikipedia.org/wiki/XGBoost"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    XGBoost
                  </a>
                </li>

                <li>
                  <a
                    href="https://en.wikipedia.org/wiki/Artificial_neural_network"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    PyTorch Neural Network
                  </a>
                </li>
              </ul>

              <button
                type="button"
                className="home-button"
                onClick={openHomePage}
              >
                ← Home
              </button>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <div>
          <strong>Return Probability</strong>

          <p>Product return prediction POC</p>
        </div>

        <button
          type="button"
          onClick={() => setPage("about")}
        >
          About
        </button>

        <span>
          © {new Date().getFullYear()} Return
          Probability
        </span>
      </footer>
    </div>
  );
}


export default App;