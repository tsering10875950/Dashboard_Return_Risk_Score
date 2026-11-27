import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
   FORMAT INR
   ========================================================= */

function formatCurrency(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "₹0";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(numericValue);
}

/* =========================================================
   STATE REVENUE TOOLTIP
   ========================================================= */

function RevenueTooltip({ active, payload }) {
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
        Returned orders:
        <strong>{item.returnedOrders.toLocaleString()}</strong>
      </p>

      <p>
        Returned revenue:
        <strong>{formatCurrency(item.revenue)}</strong>
      </p>

      <p>
        Revenue share:
        <strong>{item.percentage.toFixed(2)}%</strong>
      </p>
    </div>
  );
}

/* =========================================================
   DASHBOARD 2
   ========================================================= */

function Dashboard2() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  /* =========================================================
     READ SAME EXCEL FILE
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
            `Could not load ds.xlsx. Status ${response.status}.`
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
            "The Excel worksheet does not contain any data."
          );
        }

        const requiredColumns = [
          "returned",
          "price",
          "quantity",
          "customer_state",
        ];

        const missingColumns = requiredColumns.filter(
          (column) =>
            !Object.prototype.hasOwnProperty.call(
              excelRows[0],
              column
            )
        );

        if (missingColumns.length > 0) {
          throw new Error(
            `Missing required Excel column(s): ${missingColumns.join(
              ", "
            )}`
          );
        }

        if (isMounted) {
          setRows(excelRows);
        }
      } catch (error) {
        console.error(
          "Dashboard2 Excel loading error:",
          error
        );

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
     REVENUE CALCULATIONS
     ========================================================= */

  const summary = useMemo(() => {
    /*
      STEP 1

      Keep ONLY returned orders.

      returned = 1
    */

    const returnedOrders = rows.filter(
      (row) =>
        normalizeReturnedValue(row.returned) === 1
    );

    /*
      STEP 2

      Calculate returned revenue for each order:

      returned revenue = price × quantity
    */

    const returnedOrdersWithRevenue =
      returnedOrders.map((row) => {
        const price = Number(row.price);
        const quantity = Number(row.quantity);

        const validPrice = Number.isFinite(price)
          ? price
          : 0;

        const validQuantity = Number.isFinite(
          quantity
        )
          ? quantity
          : 0;

        const returnedRevenue =
          validPrice * validQuantity;

        return {
          ...row,
          calculatedReturnedRevenue:
            returnedRevenue,
        };
      });

    /*
      STEP 3

      Add returned revenue from ALL returned orders.

      Total Returned Revenue =
          Σ(price × quantity)

      where returned = 1
    */

    const totalReturnedRevenue =
      returnedOrdersWithRevenue.reduce(
        (total, row) =>
          total +
          row.calculatedReturnedRevenue,
        0
      );

    /*
      STEP 4

      Calculate total quantity of products
      present in returned orders.
    */

    const totalReturnedUnits =
      returnedOrdersWithRevenue.reduce(
        (total, row) => {
          const quantity = Number(row.quantity);

          return (
            total +
            (Number.isFinite(quantity)
              ? quantity
              : 0)
          );
        },
        0
      );

    /*
      STEP 5

      Calculate Average Revenue per
      Returned Order
    */

    const averageRevenuePerReturnedOrder =
      returnedOrders.length > 0
        ? totalReturnedRevenue /
          returnedOrders.length
        : 0;

    /* =======================================================
       RETURNED REVENUE BY CUSTOMER STATE
       ======================================================= */

    const stateRevenueMap = {};

    returnedOrdersWithRevenue.forEach(
      (row) => {
        const state =
          row.customer_state !== null &&
          row.customer_state !== undefined &&
          String(
            row.customer_state
          ).trim() !== ""
            ? String(
                row.customer_state
              ).trim()
            : "Unknown";

        if (!stateRevenueMap[state]) {
          stateRevenueMap[state] = {
            revenue: 0,
            returnedOrders: 0,
            units: 0,
          };
        }

        /*
          Add revenue produced by returned
          order to that customer's state.
        */

        stateRevenueMap[state].revenue +=
          row.calculatedReturnedRevenue;

        stateRevenueMap[
          state
        ].returnedOrders += 1;

        const quantity = Number(
          row.quantity
        );

        stateRevenueMap[state].units +=
          Number.isFinite(quantity)
            ? quantity
            : 0;
      }
    );

    /*
      Convert state object to array for
      Recharts.
    */

    const revenueByState = Object.entries(
      stateRevenueMap
    )
      .map(
        ([
          state,
          stateInformation,
        ]) => ({
          state,

          revenue:
            stateInformation.revenue,

          returnedOrders:
            stateInformation.returnedOrders,

          units:
            stateInformation.units,

          percentage:
            totalReturnedRevenue > 0
              ? (stateInformation.revenue /
                  totalReturnedRevenue) *
                100
              : 0,
        })
      )
      /*
        Highest returned revenue first.
      */
      .sort(
        (a, b) =>
          b.revenue - a.revenue
      );

    /*
      Find state with highest returned
      revenue.
    */

    const highestRevenueState =
      revenueByState.length > 0
        ? revenueByState[0]
        : null;

    return {
      returnedOrderCount:
        returnedOrders.length,

      totalReturnedRevenue,

      totalReturnedUnits,

      averageRevenuePerReturnedOrder,

      revenueByState,

      highestRevenueState,
    };
  }, [rows]);

  /* =========================================================
     LOADING UI
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
              <h2>
                Loading Revenue Dashboard
              </h2>

              <p>
                Reading returned orders from
                ds.xlsx...
              </p>
            </div>
          </div>

        </div>
      </section>
    );
  }

  /* =========================================================
     ERROR UI
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
              Dashboard data could not be
              loaded
            </h2>

            <p>
              {errorMessage}
            </p>

            <p>
              Confirm that your Excel file is
              located at:
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
     DASHBOARD 2 UI
     ========================================================= */

  return (
    <section className="dashboard-page">

      <div className="dashboard-container">

        {/* ===================================================
            HEADING
            =================================================== */}

        <div className="dashboard-heading">

          <div>

            <span className="eyebrow accent">
              Revenue analytics
            </span>

            <h1>
              Returned Revenue Dashboard
            </h1>

            <p>
              Financial analysis of revenue
              associated with returned products,
              calculated from product price and
              quantity.
            </p>

          </div>

          <div className="dashboard-source">

            <span>
              Data source
            </span>

            <strong>
              ds.xlsx
            </strong>

          </div>

        </div>

        {/* ===================================================
            SUMMARY CARDS
            =================================================== */}

        <div className="dashboard-cards">

          {/* TOTAL RETURNED REVENUE */}

          <article className="dashboard-card returned-card">

            <span>
              Total Returned Revenue
            </span>

            <strong>
              {formatCurrency(
                summary.totalReturnedRevenue
              )}
            </strong>

            <small>
              Σ(price × quantity) where
              returned = 1
            </small>

          </article>

          {/* RETURNED ORDERS */}

          <article className="dashboard-card">

            <span>
              Returned Orders
            </span>

            <strong>
              {summary.returnedOrderCount.toLocaleString()}
            </strong>

            <small>
              Orders where returned = 1
            </small>

          </article>

          {/* RETURNED UNITS */}

          <article className="dashboard-card">

            <span>
              Returned Units
            </span>

            <strong>
              {summary.totalReturnedUnits.toLocaleString()}
            </strong>

            <small>
              Total quantity from returned orders
            </small>

          </article>

          {/* AVERAGE */}

          <article className="dashboard-card">

            <span>
              Avg. Revenue per Return
            </span>

            <strong>
              {formatCurrency(
                summary.averageRevenuePerReturnedOrder
              )}
            </strong>

            <small>
              Average value per returned order
            </small>

          </article>

        </div>

        {/* ===================================================
            EXPLANATION
            =================================================== */}

        <div
          className="dashboard-chart-section"
          style={{
            marginBottom: "28px",
          }}
        >

          <div className="chart-heading">

            <div>

              <span className="chart-eyebrow">
                Revenue impact
              </span>

              <h2>
                Total Revenue Associated with Returns
              </h2>

              <p>
                Only orders where returned = 1
                are included in this calculation.
              </p>

            </div>

            <div className="return-rate-badge">

              <span>
                Returned Revenue
              </span>

              <strong>
                {formatCurrency(
                  summary.totalReturnedRevenue
                )}
              </strong>

            </div>

          </div>

          <div
            style={{
              marginTop: "25px",
              padding: "22px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
            }}
          >

            <strong
              style={{
                display: "block",
                marginBottom: "10px",
                color: "#0f172a",
              }}
            >
              Calculation
            </strong>

            <div
              style={{
                color: "#475569",
                fontSize: "1.05rem",
              }}
            >
              Returned Revenue =
              {" "}
              Σ (Price × Quantity)
              {" "}
              where Returned = 1
            </div>

          </div>

        </div>

        {/* ===================================================
            RETURNED REVENUE BY STATE
            =================================================== */}

        <div className="dashboard-chart-section state-chart-section">

          <div className="chart-heading">

            <div>

              <span className="chart-eyebrow">
                Geographic revenue distribution
              </span>

              <h2>
                Returned Revenue by Customer State
              </h2>

              <p>
                Shows how much revenue associated
                with returned products comes from
                customers in each state.
              </p>

            </div>

            {summary.highestRevenueState && (

              <div className="return-rate-badge state-count-badge">

                <span>
                  Highest Revenue State
                </span>

                <strong
                  style={{
                    fontSize: "1.15rem",
                  }}
                >
                  {
                    summary
                      .highestRevenueState
                      .state
                  }
                </strong>

              </div>

            )}

          </div>

          {/* =================================================
              BAR CHART
              ================================================= */}

          {summary.revenueByState.length > 0 ? (

            <div className="state-chart-wrapper">

              <ResponsiveContainer
                width="100%"
                height={520}
              >

                <BarChart
                  data={
                    summary.revenueByState
                  }
                  margin={{
                    top: 30,
                    right: 30,
                    left: 30,
                    bottom: 90,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />

                  {/* STATE */}

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

                  {/* RETURNED REVENUE */}

                  <YAxis
                    tick={{
                      fill: "#64748b",
                      fontSize: 12,
                    }}
                    tickFormatter={(value) => {
                      if (value >= 10000000) {
                        return `₹${(
                          value / 10000000
                        ).toFixed(1)}Cr`;
                      }

                      if (value >= 100000) {
                        return `₹${(
                          value / 100000
                        ).toFixed(1)}L`;
                      }

                      if (value >= 1000) {
                        return `₹${(
                          value / 1000
                        ).toFixed(0)}K`;
                      }

                      return `₹${value}`;
                    }}
                  />

                  {/* INTERACTIVE TOOLTIP */}

                  <Tooltip
                    content={
                      <RevenueTooltip />
                    }
                    cursor={{
                      fill:
                        "rgba(239, 68, 68, 0.06)",
                    }}
                  />

                  {/* REVENUE BARS */}

                  <Bar
                    dataKey="revenue"
                    name="Returned Revenue"
                    fill="#ef4444"
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

              No returned orders with
              customer state information were
              found.

            </div>

          )}

          {/* =================================================
              STATE DETAILS
              ================================================= */}

          {summary.revenueByState.length > 0 && (

            <div
              style={{
                marginTop: "20px",
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(190px, 1fr))",
                gap: "12px",
              }}
            >

              {summary.revenueByState.map(
                (state) => (

                  <div
                    key={state.state}
                    className="chart-summary-item"
                  >

                    <span
                      className="summary-color returned-color"
                      aria-hidden="true"
                    />

                    <div>

                      <span>
                        {state.state}
                      </span>

                      <strong>
                        {formatCurrency(
                          state.revenue
                        )}
                      </strong>

                      <small
                        style={{
                          display: "block",
                          marginTop: "4px",
                          color: "#94a3b8",
                        }}
                      >
                        {state.percentage.toFixed(
                          2
                        )}
                        % of returned revenue
                      </small>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>

      </div>

    </section>
  );
}

export default Dashboard2;