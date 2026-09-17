// pages/farmer/ForecastIntelligencePage.jsx — FasalNet XGBoost + Weather Engine UI
// ─────────────────────────────────────────────────────────────────────────────
// Real XGBoost Market Price Forecasting with Open-Meteo Weather Integration:
//   - Today & Tomorrow highlight
//   - 7/14-Day Continuous Multi-Horizon XGBoost Forecast
//   - Model Evaluation Metrics (MAE, RMSE, MAPE, R²)
//   - Weather Risk & Rainfall Impact Intelligence
//   - 30/60-Day Binary Trend Indicators

import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Database, ShieldCheck } from "lucide-react";
import Reveal from "../../components/ui/Reveal";

// ── Shared style tokens & modern design constants ───────────────────────────
const CARD = {
  background: "var(--bg-card)",
  border: "1px solid var(--bd)",
  borderRadius: "14px",
  padding: "22px 24px",
  boxShadow: "var(--sh2)",
  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
};

const BTN = {
  background: "var(--cp)",
  color: "var(--cp-text)",
  border: "1.5px solid var(--cp-dark)",
  borderRadius: "8px",
  padding: "9px 20px",
  fontFamily: "var(--fb)",
  fontWeight: 700,
  fontSize: "12.5px",
  cursor: "pointer",
  boxShadow: "var(--sh2)",
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
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-accent/20 bg-accent-pale/50 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 animate-[tickerPulse_1.8s_ease-in-out_infinite] rounded-full bg-safe" />
        <span className="text-xs font-bold text-ink">FasalNet XGBoost + Open-Meteo Engine</span>
        <span className="border-l border-line pl-2 text-[11px] text-ink-muted">
          Direct Multi-Horizon XGBoost Regressor + Exogenous Agro-Weather Features
        </span>
      </div>
      <div className="flex items-center gap-2.5 text-[11px] font-semibold text-ink-soft">
        <span className="flex items-center gap-1"><Database size={12} /> {t("mi.data_source", "Real DB (mh_market_prices)")}</span>
        <span>•</span>
        <span className="flex items-center gap-1 font-bold text-accent"><ShieldCheck size={12} /> {t("mi.model_status", "Real Time-Series Validation")}</span>
      </div>
    </div>
  );
}

// ── SECTION 1: Model Evaluation & Performance Card ───────────────────────────
function ModelEvaluationCard({ metrics, t }) {
  if (!metrics) return null;

  return (
    <div style={{ ...CARD, padding: "18px 20px", background: "var(--bg-m)", border: "1px solid var(--bd)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "15px" }}>📊</span>
          <div>
            <h4 style={{ fontSize: "13.5px", fontWeight: 800, color: "var(--tx)", margin: 0 }}>
              {t("mi.model_eval_title", "XGBoost Model Performance & Validation")}
            </h4>
            <span style={{ fontSize: "10.5px", color: "var(--tx-s)" }}>
              {metrics.validation_split || "80/20 Chronological Time-Series Validation"} · {metrics.sample_size || 0} {t("mi.historical_days", "historical market days")}
            </span>
          </div>
        </div>
        <span style={{
          fontSize: "10.5px", fontWeight: 700, color: "var(--cp)", background: "rgba(63,107,51,0.1)",
          padding: "3px 9px", borderRadius: "12px", border: "1px solid rgba(63,107,51,0.2)"
        }}>
          ✓ No Data Leakage
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
        {[
          { label: "MAE", value: `₹${metrics.mae ?? "—"}`, desc: "Mean Absolute Error", color: "var(--tx)" },
          { label: "RMSE", value: `₹${metrics.rmse ?? "—"}`, desc: "Root Mean Sq Error", color: "var(--tx)" },
          { label: "MAPE", value: `${metrics.mape ?? "—"}%`, desc: "Mean Abs % Error", color: (metrics.mape ?? 0) <= 15 ? "var(--safe)" : "#B4741E" },
          { label: "R² Score", value: `${metrics.r2 != null ? Number(metrics.r2).toFixed(2) : "—"}`, desc: "Variance Explained", color: (metrics.r2 ?? 0) >= 0.5 ? "var(--safe)" : "var(--tx-m)" },
        ].map((item, idx) => (
          <div key={idx} style={{
            background: "var(--bg-l)", borderRadius: "10px", padding: "10px 12px",
            border: "1px solid var(--bd)", textAlign: "center"
          }}>
            <div style={{ fontSize: "9.5px", fontWeight: 800, color: "var(--tx-s)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {item.label}
            </div>
            <div style={{ fontSize: "16px", fontWeight: 900, color: item.color, fontFamily: "var(--fd)", margin: "3px 0" }}>
              {item.value}
            </div>
            <div style={{ fontSize: "9.5px", color: "var(--tx-s)" }}>
              {item.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SECTION 2: Weather & Price Intelligence Signal ────────────────────────────
function WeatherRiskSignalCard({ summary, t }) {
  if (!summary) return null;

  const isRiskHigh = summary.weather_risk === "High";
  const isRiskMod = summary.weather_risk === "Moderate";
  const riskColor = isRiskHigh ? "#EF4444" : isRiskMod ? "#F59E0B" : "var(--safe)";
  const riskBg = isRiskHigh ? "rgba(239,68,68,0.1)" : isRiskMod ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)";
  const riskBorder = isRiskHigh ? "rgba(239,68,68,0.3)" : isRiskMod ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.3)";

  const isUp = summary.direction === "UP";
  const isDown = summary.direction === "DOWN";
  const trendColor = isUp ? "var(--safe)" : isDown ? "#EF4444" : "var(--tx-m)";

  return (
    <div style={{
      ...CARD,
      padding: "18px 20px",
      background: "linear-gradient(135deg, var(--bg-l) 0%, rgba(43,69,112,0.03) 100%)",
      border: "1px solid var(--bd)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>🌦️</span>
          <div>
            <h4 style={{ fontSize: "14px", fontWeight: 800, color: "var(--tx)", margin: 0 }}>
              {t("mi.weather_price_intel", "Weather + Price Intelligence Signals")}
            </h4>
            <span style={{ fontSize: "10.5px", color: "var(--tx-s)" }}>
              {t("mi.weather_price_sub", "Combined agro-climate factors influencing supply & price movements")}
            </span>
          </div>
        </div>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: riskBg, border: `1px solid ${riskBorder}`,
          borderRadius: "20px", padding: "4px 12px", fontSize: "11px", fontWeight: 800, color: riskColor
        }}>
          <span>{isRiskHigh ? "⚠️" : isRiskMod ? "⛅" : "☀️"}</span>
          <span>{summary.weather_risk} {t("mi.weather_risk", "Weather Risk")}</span>
        </div>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "12px", marginBottom: "12px"
      }}>
        {/* Trend Prediction */}
        <div style={{ padding: "12px 14px", background: "var(--bg-m)", borderRadius: "10px", border: "1px solid var(--bd)" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--tx-s)", textTransform: "uppercase" }}>
            {t("mi.expected_trend", "Expected Price Trend")}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "4px" }}>
            <span style={{ fontSize: "18px", fontWeight: 900, color: trendColor, fontFamily: "var(--fd)" }}>
              {isUp ? "▲" : isDown ? "▼" : "→"} {Math.abs(summary.price_change_percent ?? 0).toFixed(1)}%
            </span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: trendColor }}>
              ({summary.direction})
            </span>
          </div>
          <div style={{ fontSize: "10.5px", color: "var(--tx-m)", marginTop: "2px" }}>
            Target: ₹{Math.round(summary.predicted_price ?? 0).toLocaleString("en-IN")}
          </div>
        </div>

        {/* Rain Outlook */}
        <div style={{ padding: "12px 14px", background: "var(--bg-m)", borderRadius: "10px", border: "1px solid var(--bd)" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--tx-s)", textTransform: "uppercase" }}>
            {t("mi.upcoming_rainfall", "Upcoming Rainfall")}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "4px" }}>
            <span style={{ fontSize: "18px", fontWeight: 900, color: "#2563eb", fontFamily: "var(--fd)" }}>
              {summary.total_upcoming_rain_mm ?? 0} mm
            </span>
            <span style={{ fontSize: "11px", color: "var(--tx-s)" }}>
              ({summary.rainy_days_count ?? 0} rainy {summary.rainy_days_count === 1 ? "day" : "days"})
            </span>
          </div>
          <div style={{ fontSize: "10.5px", color: "var(--tx-m)", marginTop: "2px" }}>
            Open-Meteo Multi-Day Forecast
          </div>
        </div>
      </div>

      {/* Advisory Message */}
      {summary.weather_risk_note && (
        <div style={{
          padding: "10px 14px", borderRadius: "10px",
          background: riskBg, border: `1px solid ${riskBorder}`,
          fontSize: "11.5px", color: "var(--tx)", lineHeight: 1.4,
          display: "flex", alignItems: "flex-start", gap: "8px"
        }}>
          <span style={{ fontSize: "14px", flexShrink: 0 }}>💡</span>
          <div>
            <strong style={{ color: riskColor }}>{t("mi.advisory_note", "Market Advisory")}: </strong>
            <span>{summary.weather_risk_note}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SECTION 3: Today & Tomorrow Highlight ──────────────────────────────────────
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
            const badgeFg= isUp ? "var(--safe)" : isDown ? "#EF4444" : "var(--tx-m)";
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
            {t("mi.tt_unavailable", "Select a market and commodity to run the XGBoost weather forecast.")}
          </div>
        )
      )}
    </div>
  );
}

// ── SECTION 4: 7/14-Day Continuous Multi-Horizon Forecast ────────────────────
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
              {t("mi.forecast_desc", "One direct XGBoost model trained per day horizon with Open-Meteo weather features.")}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Horizon toggle: STRICTLY 7 and 14 Days */}
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
          {arimaDays}-Day Direct XGBoost Model Chain
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
                  { label: t("mi.forecast_trend", "Net Change"), val: `${delta >= 0 ? "▲" : "▼"} ₹${Math.abs(Math.round(delta)).toLocaleString("en-IN")}`, color: delta >= 0 ? "var(--safe)" : "#EF4444" },
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
              const rainMm = pt.expected_rain_mm != null ? pt.expected_rain_mm : null;
              const rainProb = pt.rain_probability != null ? pt.rain_probability : null;

              return (
                <div key={i} style={{
                  minWidth: "135px", flexShrink: 0, background: "var(--bg-m)",
                  border: "1px solid var(--bd)",
                  borderTop: `4px solid ${isUp ? "var(--safe)" : "#EF4444"}`,
                  borderRadius: "12px", padding: "12px", textAlign: "center",
                  transition: "transform .15s ease",
                }}>
                  <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--tx-s)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: "4px" }}>
                    {t("mi.day", "Day")} {i + 1}
                    <span style={{ display: "block", fontSize: "9px", fontWeight: 500, color: "var(--tx-m)", marginTop: "2px" }}>{String(pt?.date || "").slice(5)}</span>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: "15px", color: "var(--tx)", fontFamily: "var(--fd)", marginBottom: "4px" }}>
                    ₹{pt.price.toLocaleString("en-IN")}
                  </div>
                  <div style={{ fontSize: "10px", fontWeight: 800, marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "2px", color: isUp ? "var(--safe)" : "#EF4444" }}>
                    {isUp ? "▲" : "▼"} ₹{Math.abs(Math.round(change)).toLocaleString("en-IN")}
                  </div>
                  
                  {/* Weather rain badge if available */}
                  {(rainMm !== null || rainProb !== null) && (
                    <div style={{
                      fontSize: "9.5px", color: (rainProb > 40 || rainMm > 1) ? "#2563eb" : "var(--tx-s)",
                      background: (rainProb > 40 || rainMm > 1) ? "rgba(37,99,235,0.08)" : "transparent",
                      borderRadius: "6px", padding: "2px 4px", marginBottom: "6px", fontWeight: 600
                    }}>
                      💧 {rainProb ?? 0}% ({rainMm ?? 0}mm)
                    </div>
                  )}

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
              {t("mi.no_forecast_sub", "Select a city & commodity, choose 7 or 14 days, and click Run Forecast.")}
            </p>
          </div>
        )
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
  onRunForecast,
}) {
  const { t } = useTranslation();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <Reveal><EngineStatusBadge t={t} /></Reveal>

      {/* Model Performance & Evaluation Card */}
      {arimaData?.metrics && (
        <Reveal delay={0.05}><ModelEvaluationCard metrics={arimaData.metrics} t={t} /></Reveal>
      )}

      {/* Weather Risk & Price Intelligence Card */}
      {arimaData?.summary && (
        <Reveal delay={0.08}><WeatherRiskSignalCard summary={arimaData.summary} t={t} /></Reveal>
      )}

      {/* Today & Tomorrow Highlight Card */}
      <Reveal delay={0.1}>
        <TodayTomorrowCard
          todayTomorrow={todayTomorrow || arimaData?.today_tomorrow}
          ttLoading={ttLoading}
          arimaError={arimaError}
          t={t}
        />
      </Reveal>

      {/* Continuous 7/14-Day Multi-Horizon Forecast Card */}
      <Reveal delay={0.14}>
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
      </Reveal>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
