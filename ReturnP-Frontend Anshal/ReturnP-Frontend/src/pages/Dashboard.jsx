import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = {
  returned: "#ef4444",
  notReturned: "#22c55e",
};

/* =========================================================
   NORMALIZE RETURNED VALUE
   ========================================================= */

function normalizeReturnedValue(value) {
  if (
    value === 1 ||
    value === true ||
    String(value).trim().toLowerCase() === "yes" ||
    String(value).trim().toLowerCase() === "true" ||
    String(value).trim().toLowerCase() === "returned"
  ) {
    return 1;
  }

  return 0;
}

/* =========================================================
   PIE CHART TOOLTIP
   ========================================================= */

function CustomTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const item = payload[0]?.payload;

  if (!item) {
    return null;
  }

  return (
    <div className="dashboard-chart-tooltip">
      <strong>{item.name}</strong>

      <p>
        Orders:
        <strong>{item.value.toLocaleString()}</strong>
      </p>

      <p>
        Percentage:
        <strong>{item.percentage.toFixed(2)}%</strong>
      </p>
    </div>
  );
}

/* =========================================================
   STATE BAR CHART TOOLTIP
   ========================================================= */

function StateTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const item = payload[0]?.payload;

  if (!item) {
    return null;
  }

  return (
    <div className="dashboard-chart-tooltip">
      <strong>{item.state}</strong>

      <p>
        Returned products:
        <strong>{item.count.toLocaleString()}</strong>
      </p>

      <p>
        Share of returns:
        <strong>{item.percentage.toFixed(2)}%</strong>
      </p>
    </div>
  );
}

/* =========================================================
   DASHBOARD COMPONENT
   ========================================================= */

function Dashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  /* =========================================================
     LOAD EXCEL FILE
     ========================================================= */

  useEffect(() => {
    let isMounted = true;

    async function loadExcelFile() {
      try {
        setLoading(true);
        setErrorMessage("");

        const response = await fetch("/dataset/ds.xlsx");

        if (!response.ok) {
          throw new Error(
            `Could not load ds.xlsx. Backend returned status ${response.status}.`
          );
        }

        const excelBuffer = await response.arrayBuffer();

        const workbook = XLSX.read(excelBuffer, {
          type: "array",
          cellDates: true,
        });

        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
          throw new Error(
            "The Excel workbook does not contain a worksheet."
          );
        }

        const worksheet = workbook.Sheets[firstSheetName];

        const excelRows = XLSX.utils.sheet_to_json(
          worksheet,
          {
            defval: null,
            raw: true,
          }
        );

        if (
          !Array.isArray(excelRows) ||
          excelRows.length === 0
        ) {
          throw new Error(
            "The first worksheet does not contain any data."
          );
        }

        if (
          !Object.prototype.hasOwnProperty.call(
            excelRows[0],
            "returned"
          )
        ) {
          throw new Error(
            'The Excel file does not contain the required "returned" column.'
          );
        }

        if (isMounted) {
          setRows(excelRows);
        }
      } catch (error) {
        console.error("Excel loading error:", error);

        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "The Excel file could not be loaded."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadExcelFile();

    return () => {
      isMounted = false;
    };
  }, []);

  /* =========================================================
     CALCULATE DASHBOARD ANALYTICS
     ========================================================= */

  const summary = useMemo(() => {
    /* -------------------------------------------------------
       Remove rows without returned value
       ------------------------------------------------------- */

    const validRows = rows.filter((row) => {
      const value = row.returned;

      return (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
      );
    });

    /* -------------------------------------------------------
       Returned orders only
       ------------------------------------------------------- */

    const returnedOrders = validRows.filter(
      (row) =>
        normalizeReturnedValue(row.returned) === 1
    );

    /* -------------------------------------------------------
       Not returned orders
       ------------------------------------------------------- */

    const notReturnedOrders = validRows.filter(
      (row) =>
        normalizeReturnedValue(row.returned) === 0
    );

    const totalOrders = validRows.length;

    /* -------------------------------------------------------
       Overall return percentage
       ------------------------------------------------------- */

    const returnPercentage =
      totalOrders > 0
        ? (returnedOrders.length / totalOrders) * 100
        : 0;

    const notReturnedPercentage =
      totalOrders > 0
        ? (notReturnedOrders.length / totalOrders) * 100
        : 0;

    /* -------------------------------------------------------
       UNIQUE CUSTOMERS WHO RETURNED AT LEAST ONE PRODUCT
       ------------------------------------------------------- */

    const returnedCustomerIds = new Set(
      returnedOrders
        .map((row) => row.customer_id)
        .filter(
          (customerId) =>
            customerId !== null &&
            customerId !== undefined &&
            String(customerId).trim() !== ""
        )
    );

    /* =======================================================
       RETURNED PRODUCTS BY CUSTOMER STATE

       IMPORTANT:
       Only returnedOrders are used here.

       Example:
       Karnataka  returned = 1
       Karnataka  returned = 1
       Telangana  returned = 1
       Maharashtra returned = 0  <-- NOT INCLUDED
       ======================================================= */

    const returnedByStateMap = {};

    returnedOrders.forEach((row) => {
      const state =
        row.customer_state !== null &&
        row.customer_state !== undefined &&
        String(row.customer_state).trim() !== ""
          ? String(row.customer_state).trim()
          : "Unknown";

      returnedByStateMap[state] =
        (returnedByStateMap[state] || 0) + 1;
    });

    /* -------------------------------------------------------
       Convert object into Recharts-friendly array
       ------------------------------------------------------- */

    const returnedByState = Object.entries(
      returnedByStateMap
    )
      .map(([state, count]) => ({
        state,
        count,

        percentage:
          returnedOrders.length > 0
            ? (count / returnedOrders.length) * 100
            : 0,
      }))
      .sort((a, b) => b.count - a.count);

    /* -------------------------------------------------------
       RETURN SUMMARY
       ------------------------------------------------------- */

    return {
      totalOrders,

      returnedCount: returnedOrders.length,

      notReturnedCount: notReturnedOrders.length,

      returnPercentage,

      notReturnedPercentage,

      uniqueReturnedCustomers:
        returnedCustomerIds.size,

      returnedByState,

      chartData: [
        {
          name: "Returned",
          value: returnedOrders.length,
          percentage: returnPercentage,
        },
        {
          name: "Not Returned",
          value: notReturnedOrders.length,
          percentage: notReturnedPercentage,
        },
      ],
    };
  }, [rows]);

  /* =========================================================
     PIE CHART PERCENTAGE LABEL
     ========================================================= */

  const renderPercentageLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }) => {
    if (!percent || percent < 0.03) {
      return null;
    }

    const radius =
      Number(innerRadius) +
      (Number(outerRadius) -
        Number(innerRadius)) *
        0.5;

    const radians =
      (Math.PI / 180) * -midAngle;

    const x =
      Number(cx) +
      radius * Math.cos(radians);

    const y =
      Number(cy) +
      radius * Math.sin(radians);

    return (
      <text
        x={x}
        y={y}
        fill="#ffffff"
        textAnchor={
          x > Number(cx) ? "start" : "end"
        }
        dominantBaseline="central"
        className="pie-percentage-label"
      >
        {(percent * 100).toFixed(1)}%
      </text>
    );
  };

  /* =========================================================
     LOADING SCREEN
     ========================================================= */

  if (loading) {
    return (
      <section className="dashboard-page">
        <div className="dashboard-container">
          <div
            className="dashboard-loading"
            aria-live="polite"
          >
            <span
              className="dashboard-spinner"
              aria-hidden="true"
            />

            <div>
              <h2>Loading dashboard</h2>

              <p>
                Reading data from ds.xlsx...
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* =========================================================
     ERROR SCREEN
     ========================================================= */

  if (errorMessage) {
    return (
      <section className="dashboard-page">
        <div className="dashboard-container">
          <div
            className="dashboard-error"
            role="alert"
          >
            <h2>
              Dashboard data could not be loaded
            </h2>

            <p>{errorMessage}</p>

            <p>
              Confirm that the Excel file is
              available at:
            </p>

            <code>
              public/dataset/ds.xlsx
            </code>
          </div>
        </div>
      </section>
    );
  }

  /* =========================================================
     DASHBOARD UI
     ========================================================= */

  return (
    <section className="dashboard-page">
      <div className="dashboard-container">

        {/* ===================================================
            DASHBOARD HEADING
            =================================================== */}

        <div className="dashboard-heading">
          <div>
            <span className="eyebrow accent">
              Return analytics
            </span>

            <h1>
              Product Return Dashboard
            </h1>

            <p>
              Interactive analysis of returned
              and non-returned orders from the
              Excel dataset.
            </p>
          </div>

          <div className="dashboard-source">
            <span>Data source</span>

            <strong>ds.xlsx</strong>
          </div>
        </div>

        {/* ===================================================
            SUMMARY CARDS
            =================================================== */}

        <div className="dashboard-cards">

          <article className="dashboard-card">
            <span>Total Orders</span>

            <strong>
              {summary.totalOrders.toLocaleString()}
            </strong>

            <small>
              Rows with a valid returned value
            </small>
          </article>

          <article className="dashboard-card returned-card">
            <span>Returned Orders</span>

            <strong>
              {summary.returnedCount.toLocaleString()}
            </strong>

            <small>
              {summary.returnPercentage.toFixed(2)}%
              {" "}of all orders
            </small>
          </article>

          <article className="dashboard-card successful-card">
            <span>Not Returned</span>

            <strong>
              {summary.notReturnedCount.toLocaleString()}
            </strong>

            <small>
              {summary.notReturnedPercentage.toFixed(2)}%
              {" "}of all orders
            </small>
          </article>

          <article className="dashboard-card">
            <span>
              Unique Returning Customers
            </span>

            <strong>
              {summary.uniqueReturnedCustomers.toLocaleString()}
            </strong>

            <small>
              Customers who returned at least
              one order
            </small>
          </article>

        </div>

        {/* ===================================================
            CHART 1
            RETURNED VS NOT RETURNED
            =================================================== */}

        <div className="dashboard-chart-section">

          <div className="chart-heading">
            <div>
              <span className="chart-eyebrow">
                Return distribution
              </span>

              <h2>
                Returned vs Not Returned
              </h2>

              <p>
                Hover over or tap a section to
                see the order count and exact
                percentage.
              </p>
            </div>

            <div className="return-rate-badge">
              <span>
                Overall return rate
              </span>

              <strong>
                {summary.returnPercentage.toFixed(
                  2
                )}
                %
              </strong>
            </div>
          </div>

          {summary.totalOrders > 0 ? (
            <div
              className="pie-chart-wrapper"
              aria-label="Pie chart showing returned and not-returned orders"
            >

              <ResponsiveContainer
                width="100%"
                height={440}
              >
                <PieChart>

                  <Pie
                    data={summary.chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="48%"
                    innerRadius={85}
                    outerRadius={150}
                    paddingAngle={3}
                    labelLine={false}
                    label={
                      renderPercentageLabel
                    }
                    isAnimationActive
                    animationDuration={900}
                  >

                    <Cell
                      fill={COLORS.returned}
                    />

                    <Cell
                      fill={
                        COLORS.notReturned
                      }
                    />

                  </Pie>

                  <Tooltip
                    content={
                      <CustomTooltip />
                    }
                    cursor={{
                      fill: "transparent",
                    }}
                  />

                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(value) => (
                      <span className="dashboard-legend-text">
                        {value}
                      </span>
                    )}
                  />

                </PieChart>
              </ResponsiveContainer>

              <div className="pie-chart-center">
                <strong>
                  {summary.returnPercentage.toFixed(
                    1
                  )}
                  %
                </strong>

                <span>Returned</span>
              </div>
            </div>
          ) : (
            <div className="dashboard-empty">
              No valid order records were
              found.
            </div>
          )}

          {/* RETURN SUMMARY */}

          <div className="chart-summary">

            <div className="chart-summary-item">

              <span
                className="summary-color returned-color"
                aria-hidden="true"
              />

              <div>
                <span>Returned</span>

                <strong>
                  {summary.returnedCount.toLocaleString()}
                  {" "}orders
                </strong>
              </div>

            </div>

            <div className="chart-summary-item">

              <span
                className="summary-color not-returned-color"
                aria-hidden="true"
              />

              <div>
                <span>
                  Not Returned
                </span>

                <strong>
                  {summary.notReturnedCount.toLocaleString()}
                  {" "}orders
                </strong>
              </div>

            </div>

          </div>

        </div>

        {/* ===================================================
            CHART 2
            RETURNED PRODUCTS BY CUSTOMER STATE
            =================================================== */}

        <div className="dashboard-chart-section state-chart-section">

          <div className="chart-heading">

            <div>
              <span className="chart-eyebrow">
                Geographic distribution
              </span>

              <h2>
                Returned Products by Customer State
              </h2>

              <p>
                Distribution of returned products
                across customer locations. Only
                orders marked as returned are
                included.
              </p>
            </div>

            <div className="return-rate-badge state-count-badge">

              <span>
                States with returns
              </span>

              <strong>
                {summary.returnedByState.length}
              </strong>

            </div>

          </div>

          {summary.returnedByState.length >
          0 ? (

            <div className="state-chart-wrapper">

              <ResponsiveContainer
                width="100%"
                height={500}
              >

                <BarChart
                  data={
                    summary.returnedByState
                  }
                  margin={{
                    top: 30,
                    right: 30,
                    left: 10,
                    bottom: 90,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="state"
                    angle={-40}
                    textAnchor="end"
                    interval={0}
                    height={110}
                    tick={{
                      fill: "#64748b",
                      fontSize: 12,
                    }}
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{
                      fill: "#64748b",
                      fontSize: 12,
                    }}
                  />

                  <Tooltip
                    content={
                      <StateTooltip />
                    }
                    cursor={{
                      fill:
                        "rgba(99, 102, 241, 0.06)",
                    }}
                  />

                  <Bar
                    dataKey="count"
                    name="Returned Products"
                    fill="#6366f1"
                    radius={[
                      8,
                      8,
                      0,
                      0,
                    ]}
                    maxBarSize={70}
                    isAnimationActive
                    animationDuration={900}
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          ) : (

            <div className="dashboard-empty">
              No returned products with
              customer state information were
              found.
            </div>

          )}

        </div>

      </div>
    </section>
  );
}

export default Dashboard;