// pages/farmer/ForecastIntelligencePage.jsx — FasalNet v3 Engine UI
// ─────────────────────────────────────────────────────────────────────────────
// Pure-UI forecast panel for FasalNet v3 Market Forecast Endpoints:
//   - Today & Tomorrow highlight (POST /api/market/forecast-v3/today-tomorrow)
//   - 7/14-day Continuous Multi-Horizon XGBoost Forecast (POST /api/market/forecast-v3/continuous)
//   - 30/60-day Binary Trend Indicators (POST /api/market/forecast-v3/trend-signal)
//   - Model Engine Status Metadata (POST /api/market/forecast-v3/predictions)

import { useTranslation } from "react-i18next";

// ── Shared style tokens & modern design constants ───────────────────────────
const CARD = {
  background: "var(--bg-l)",
  border: "1px solid var(--bd)",
  borderRadius: "16px",
  padding: "22px 24px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
};

const BTN = {
  background: "linear-gradient(135deg, var(--cp), var(--cp-dark, #2d4f24))",
  color: "var(--cp-text, #ffffff)",
  border: "none",
  borderRadius: "10px",
  padding: "9px 20px",
  fontFamily: "var(--fd)",
  fontWeight: 800,
  fontSize: "12.5px",
  cursor: "pointer",
  boxShadow: "0 2px 10px rgba(63,107,51,0.2)",
  transition: "all 0.2s ease",
  lineHeight: 1,
};

function Spin() {
  return (
    <span style={{
      display: "inline-block",
      width: 14, height: 14,
      border: "2px solid var(--bd)",
      borderTopColor: "var(--cp)",
      borderRadius: "50%",
      animation: "spin .7s linear infinite",
      flexShrink: 0,
    }} />
  );
}

// ── HEADER: Engine Metadata Badge ─────────────────────────────────────────────
function EngineStatusBadge({ t }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justify: "space-between",
      flexWrap: "wrap",
      gap: "8px",
      padding: "10px 16px",
      background: "linear-gradient(90deg, rgba(63,107,51,0.08) 0%, rgba(43,69,112,0.08) 100%)",
      border: "1px solid rgba(63,107,51,0.2)",
      borderRadius: "12px",
      marginBottom: "4px"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "#10B981", boxShadow: "0 0 8px #10B981",
          display: "inline-block"
        }} />
        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--tx)" }}>
          FasalNet v3 Engine
        </span>
        <span style={{ fontSize: "11px", color: "var(--tx-m)", borderLeft: "1px solid var(--bd)", paddingLeft: "8px" }}>
          SARIMAX(1,1,1)(1,1,1,7) + XGBoost Multi-Horizon Ensemble
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px", fontWeight: 600, color: "var(--tx-s)" }}>
        <span>🗄️ {t("mi.data_source", "Real DB (mh_market_prices)")}</span>
        <span>•</span>
        <span style={{ color: "var(--cp)", fontWeight: 700 }}>{t("mi.model_status", "Optimized (Heteroscedastic CI)")}</span>
      </div>
    </div>
  );
}

// ── SECTION 1: Today & Tomorrow Highlight ──────────────────────────────────────
function TodayTomorrowCard({ todayTomorrow, ttLoading, arimaError, t }) {
  if (!todayTomorrow && !ttLoading && !arimaError) return null;

  return (
    <div style={{
      ...CARD,
      border: "1.5px solid var(--cp)",
      background: "linear-gradient(135deg, var(--bg-l) 0%, rgba(63,107,51,0.03) 100%)",
      position: "relative",
      overflow: "hidden"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            fontSize: "16px", padding: "6px 10px", borderRadius: "10px",
            background: "rgba(63,107,51,0.12)", color: "var(--cp)"
          }}>⚡</span>
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 900, color: "var(--tx)", letterSpacing: ".2px", margin: 0 }}>
              {t("mi.today_tomorrow_title", "Today & Tomorrow Price Highlight")}
            </h3>
            <span style={{ fontSize: "11px", color: "var(--tx-s)" }}>
              {t("mi.today_tomorrow_sub", "Direct 1-day XGBoost forecast comparison")}
            </span>
          </div>
        </div>
        {ttLoading && <Spin />}
      </div>

      {todayTomorrow ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          {/* TODAY */}
          <div style={{
            padding: "18px 20px", borderRadius: "14px",
            background: "var(--bg-m)", border: "1px solid var(--bd)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--tx-s)", textTransform: "uppercase", letterSpacing: ".8px" }}>
                📌 {t("mi.today", "Today")}
              </span>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--tx-m)", background: "var(--bg-l)", padding: "2px 8px", borderRadius: "6px", border: "1px solid var(--bd)" }}>
                {todayTomorrow.today?.date}
              </span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--tx)", fontFamily: "var(--fd)", lineHeight: 1.1 }}>
              ₹{Math.round(todayTomorrow.today?.price ?? 0).toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: "11px", color: "var(--tx-s)", marginTop: "6px" }}>
              {t("mi.actual_reported_price", "Actual reported APMC modal price")}
            </div>
          </div>

          {/* TOMORROW */}
          {(() => {
            const tm = todayTomorrow.tomorrow || {};
            const isUp   = tm.direction === "UP";
            const isDown = tm.direction === "DOWN";
            const arrow  = isUp ? "▲" : isDown ? "▼" : "→";
            const badgeBg= isUp ? "rgba(16,185,129,0.15)" : isDown ? "rgba(239,68,68,0.15)" : "rgba(107,114,128,0.15)";
            const badgeFg= isUp ? "#10B981" : isDown ? "#EF4444" : "var(--tx-m)";
            const price = Math.round(tm.forecasted_price ?? 0);
            const low80 = Math.round(tm.confidence_bounds?.lower_80 ?? price * 0.95);
            const high80 = Math.round(tm.confidence_bounds?.upper_80 ?? price * 1.05);

            return (
              <div style={{
                padding: "18px 20px", borderRadius: "14px",
                background: "var(--cp)", color: "var(--cp-text, #ffffff)",
                boxShadow: "0 4px 16px var(--cp-glow, rgba(63,107,51,0.25))",
                position: "relative"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".8px", opacity: 0.9 }}>
                    🔮 {t("mi.tomorrow", "Tomorrow")}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 700, background: badgeBg, color: badgeFg, padding: "2px 8px", borderRadius: "20px" }}>
                    {arrow} {Math.abs(tm.price_change_percent ?? 0).toFixed(1)}% ({tm.direction})
                  </span>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 900, fontFamily: "var(--fd)", lineHeight: 1.1 }}>
                  ₹{price.toLocaleString("en-IN")}
                </div>
                <div style={{ fontSize: "11px", marginTop: "8px", opacity: 0.9, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "6px" }}>
                  <span>{t("mi.expected_range_80", "80% Confidence Range")}:</span>
                  <strong style={{ fontFamily: "var(--fd)" }}>₹{low80.toLocaleString("en-IN")} – ₹{high80.toLocaleString("en-IN")}</strong>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        !ttLoading && arimaError && (
          <div style={{ fontSize: "12px", color: "var(--tx-m)" }}>
            {t("mi.tt_unavailable", "Select a market and commodity to run the 3-part V3 AI forecast.")}
          </div>
        )
      )}
    </div>
  );
}

// ── SECTION 2: 7/14-Day Continuous Multi-Horizon Forecast ────────────────────
function ContinuousForecastCard({ arimaDays, setArimaDays, arimaData, arimaLoading, arimaError, selectedCities, commodity, onRunForecast, t }) {
  return (
    <div style={CARD}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: 42, height: 42, borderRadius: "12px",
            background: "linear-gradient(135deg, rgba(63,107,51,0.15), rgba(43,69,112,0.15))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "22px", flexShrink: 0
          }}>
            📈
          </div>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--tx)", lineHeight: 1.2, margin: 0 }}>
              {t("mi.forecast_title", "Continuous Multi-Horizon Forecast")}
            </h3>
            <p style={{ fontSize: "12px", color: "var(--tx-m)", marginTop: "2px", margin: 0 }}>
              {t("mi.forecast_desc", "One direct XGBoost model trained per day horizon — true daily dynamic trajectory.")}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Horizon toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--tx-s)", textTransform: "uppercase", letterSpacing: ".6px" }}>
              {t("mi.horizon", "Horizon:")}
            </span>
            <div style={{ display: "flex", background: "var(--bg-m)", padding: "2px", borderRadius: "8px", border: "1px solid var(--bd)" }}>
              {[7, 14].map(d => (
                <button
                  key={d}
                  onClick={() => setArimaDays(d)}
                  style={{
                    padding: "5px 12px", fontSize: "11.5px", fontWeight: 700, borderRadius: "6px", border: "none", cursor: "pointer",
                    background: arimaDays === d ? "var(--cp)" : "transparent",
                    color: arimaDays === d ? "var(--cp-text, #fff)" : "var(--tx-m)",
                    transition: "all .15s",
                  }}
                >
                  {d} {t("mi.days_short", "Days")}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onRunForecast}
            disabled={arimaLoading}
            style={{ ...BTN, display: "flex", alignItems: "center", gap: "6px" }}
          >
            {arimaLoading
              ? <><Spin /> {t("mi.forecasting", "Forecasting...")}</>
              : <>🔮 {t("mi.run_forecast", "Run Forecast")}</>}
          </button>
        </div>
      </div>

      {/* Target Config Summary */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", marginBottom: "18px",
        background: "var(--bg-m)", borderRadius: "10px", border: "1px solid var(--bd)",
        fontSize: "12px", color: "var(--tx-m)"
      }}>
        <div>
          <span>📍 Market: </span>
          <strong style={{ color: "var(--tx)" }}>{selectedCities[0] || "None selected"}</strong>
          <span style={{ margin: "0 8px", color: "var(--bd)" }}>|</span>
          <span>🌾 Commodity: </span>
          <strong style={{ color: "var(--tx)" }}>{commodity || "None selected"}</strong>
        </div>
        <div style={{ fontSize: "11px", color: "var(--tx-s)" }}>
          {arimaDays}-Day Direct Model Chain
        </div>
      </div>

      {/* Error display */}
      {arimaError && (
        <div style={{
          marginBottom: "20px", padding: "12px 16px", borderRadius: "10px",
          border: "1px solid var(--danger)", background: "var(--danger-bg, rgba(239,68,68,0.1))",
          color: "var(--danger)", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px",
        }}>
          ⚠️ {arimaError}
        </div>
      )}

      {/* Per-day cards & Summary stats */}
      {arimaData ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

          {/* Summary stats row */}
          {(() => {
            const prices  = arimaData.forecast.map(p => p.price);
            const avg     = prices.reduce((a, b) => a + b, 0) / prices.length;
            const delta   = prices[prices.length - 1] - (arimaData.last_actual_price || prices[0]);
            const peak    = Math.max(...arimaData.forecast.map(p => p.max_price));
            const trough  = Math.min(...arimaData.forecast.map(p => p.min_price));
            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
                {[
                  { label: t("mi.avg_price", "Forecast Average"), val: `₹${Math.round(avg).toLocaleString("en-IN")}`, color: "var(--cp)" },
                  { label: t("mi.forecast_trend", "Net Change"), val: `${delta >= 0 ? "▲" : "▼"} ₹${Math.abs(Math.round(delta)).toLocaleString("en-IN")}`, color: delta >= 0 ? "#10B981" : "#EF4444" },
                  { label: t("mi.peak_max", "95% Upper Peak"), val: `₹${Math.round(peak).toLocaleString("en-IN")}`, color: "var(--warn, #B4741E)" },
                  { label: t("mi.floor_min", "95% Lower Floor"), val: `₹${Math.round(trough).toLocaleString("en-IN")}`, color: "var(--info, #2B4570)" },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--bd)", background: "var(--bg-m)", textAlign: "center" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--tx-s)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: "4px" }}>{label}</div>
                    <div style={{ fontSize: "16px", fontWeight: 900, color, fontFamily: "var(--fd)" }}>{val}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Horizontal scrollable day cards */}
          <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "10px", scrollbarWidth: "thin" }}>
            {arimaData.forecast.map((pt, i) => {
              const prevPrice = i === 0
                ? (arimaData.last_actual_price ?? arimaData.forecast[0].price)
                : arimaData.forecast[i - 1].price;
              const change = pt.price - prevPrice;
              const isUp   = change >= 0;
              return (
                <div key={i} style={{
                  minWidth: "125px", flexShrink: 0, background: "var(--bg-m)",
                  border: "1px solid var(--bd)",
                  borderTop: `4px solid ${isUp ? "#10B981" : "#EF4444"}`,
                  borderRadius: "12px", padding: "12px", textAlign: "center",
                  transition: "transform .15s ease",
                }}>
                  <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--tx-s)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: "4px" }}>
                    {t("mi.day", "Day")} {i + 1}
                    <span style={{ display: "block", fontSize: "9px", fontWeight: 500, color: "var(--tx-m)", marginTop: "2px" }}>{pt.date.slice(5)}</span>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: "15px", color: "var(--tx)", fontFamily: "var(--fd)", marginBottom: "4px" }}>
                    ₹{pt.price.toLocaleString("en-IN")}
                  </div>
                  <div style={{ fontSize: "10px", fontWeight: 800, marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "2px", color: isUp ? "#10B981" : "#EF4444" }}>
                    {isUp ? "▲" : "▼"} ₹{Math.abs(Math.round(change)).toLocaleString("en-IN")}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--tx-m)", borderTop: "1px solid var(--bd)", paddingTop: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "4px", marginBottom: "2px" }}>
                      <span style={{ color: "var(--tx-s)" }}>Max:</span>
                      <span style={{ fontWeight: 700, color: "var(--tx)" }}>₹{Math.round(pt.max_price).toLocaleString("en-IN")}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "4px" }}>
                      <span style={{ color: "var(--tx-s)" }}>Min:</span>
                      <span style={{ fontWeight: 700, color: "var(--tx)" }}>₹{Math.round(pt.min_price).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        !arimaLoading && (
          <div style={{ padding: "36px 20px", textAlign: "center", background: "var(--bg-m)", border: "1px dashed var(--bd)", borderRadius: "12px" }}>
            <span style={{ fontSize: "2rem", display: "block", marginBottom: "8px" }}>🔮</span>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--tx)", marginBottom: "4px" }}>
              {t("mi.no_forecast", "No forecast active")}
            </p>
            <p style={{ fontSize: "12px", color: "var(--tx-s)" }}>
              {t("mi.no_forecast_sub", "Select a city & commodity, choose horizon, and click Run Forecast.")}
            </p>
          </div>
        )
      )}
    </div>
  );
}

// ── SECTION 3: 30/60-Day Binary Trend Signal ──────────────────────────────────
function TrendSignalCard({ trendSignalData, trendSignalLoading, t }) {
  if (!trendSignalData && !trendSignalLoading) return null;

  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 800, color: "var(--tx)", margin: 0 }}>
          📊 {t("mi.trend_signal_title", "30 & 60-Day Trend Signals")}
        </h3>
        {trendSignalLoading && <Spin />}
        <span style={{ fontSize: "11px", color: "var(--tx-m)", marginLeft: "auto" }}>
          Logistic Regression Classifier
        </span>
      </div>

      {trendSignalData && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          {[
            { key: "30_day", label: t("mi.trend_30d", "30-Day Trend Signal"), days: 30 },
            { key: "60_day", label: t("mi.trend_60d", "60-Day Trend Signal"), days: 60 },
          ].map(({ key, label }) => {
            const sig   = trendSignalData[key];
            if (!sig) return null;
            const isUp  = sig.direction === "UP";
            const color = isUp ? "#10B981" : sig.direction === "DOWN" ? "#EF4444" : "var(--tx-m)";
            const pct   = Math.round((sig.probability_up ?? 0.5) * 100);
            const conf  = sig.confidence || "medium";

            return (
              <div key={key} style={{
                padding: "18px", borderRadius: "14px",
                border: "1px solid var(--bd)", background: "var(--bg-m)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--tx-s)", textTransform: "uppercase", letterSpacing: ".6px" }}>
                    {label}
                  </span>
                  <span style={{
                    fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
                    padding: "2px 8px", borderRadius: "12px",
                    background: conf === "high" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                    color: conf === "high" ? "#10B981" : "#F59E0B"
                  }}>
                    {conf} {t("mi.confidence", "Confidence")}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <span style={{
                    fontSize: "13px", fontWeight: 900, padding: "5px 14px",
                    borderRadius: "20px", background: color, color: "#ffffff"
                  }}>
                    {isUp ? "▲" : sig.direction === "DOWN" ? "▼" : "→"} {sig.direction}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--tx-m)" }}>
                    {isUp ? "Price expected to rise" : "Price expected to fall"}
                  </span>
                </div>

                {/* Animated probability bar */}
                <div style={{ marginBottom: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--tx-s)", marginBottom: "4px" }}>
                    <span>{t("mi.probability_up", "Probability of Increase")}</span>
                    <strong style={{ color: "var(--tx)" }}>{pct}%</strong>
                  </div>
                  <div style={{ height: "8px", borderRadius: "999px", background: "var(--bg-l)", overflow: "hidden", border: "1px solid var(--bd)" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width .4s ease-out" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── ROOT EXPORT ───────────────────────────────────────────────────────────────
export default function ForecastIntelligencePage({
  selectedCities,
  commodity,
  arimaDays,
  setArimaDays,
  arimaData,
  arimaLoading,
  arimaError,
  todayTomorrow,
  ttLoading,
  trendSignalData,
  trendSignalLoading,
  onRunForecast,
}) {
  const { t } = useTranslation();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <EngineStatusBadge t={t} />

      <TodayTomorrowCard
        todayTomorrow={todayTomorrow}
        ttLoading={ttLoading}
        arimaError={arimaError}
        t={t}
      />

      <ContinuousForecastCard
        arimaDays={arimaDays}
        setArimaDays={setArimaDays}
        arimaData={arimaData}
        arimaLoading={arimaLoading}
        arimaError={arimaError}
        selectedCities={selectedCities}
        commodity={commodity}
        onRunForecast={onRunForecast}
        t={t}
      />

      <TrendSignalCard
        trendSignalData={trendSignalData}
        trendSignalLoading={trendSignalLoading}
        t={t}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
