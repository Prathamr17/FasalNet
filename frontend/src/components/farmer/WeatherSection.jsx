// src/components/farmer/WeatherSection.jsx — Real-Time Weather & Climate Intelligence
import React from "react";
import { useTranslation } from "react-i18next";

export default function WeatherSection({
  coords,
  weatherData,
  loading,
  error,
  forecastDays = 14,
  setForecastDays,
  onRefresh,
  onDetectLocation,
  locationStatus
}) {
  const { t } = useTranslation();

  const current = weatherData?.current;
  const forecast = Array.isArray(weatherData?.forecast) ? weatherData.forecast : [];
  const advisoriesList = Array.isArray(weatherData?.advisories)
    ? weatherData.advisories
    : typeof weatherData?.advisories === "object" && weatherData?.advisories !== null
      ? Object.entries(weatherData.advisories).map(([k, v]) => ({
          icon: k === "irrigation" ? "💧" : k === "spraying" ? "🌱" : "🌾",
          title: typeof k === "string" ? k.charAt(0).toUpperCase() + k.slice(1) : "Advisory",
          status: v?.status === "Good" || v?.status === "Optimal" || v?.status === "Normal" ? "favorable" : "warning",
          message: v?.action || v?.message || (typeof v === "string" ? v : "")
        }))
      : [];
  const locName = coords?.label || weatherData?.location?.timezone?.replace("_", " ") || "Maharashtra";

  return (
    <div
      style={{
        background: "var(--bg-m)",
        borderRadius: "16px",
        padding: "20px",
        border: "1px solid var(--bd)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
        marginBottom: "24px",
        transition: "all 0.25s ease"
      }}
      className="weather-section-container hover-card-elevation"
    >
      {/* ── HEADER & CONTROLS ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "42px", height: "42px", borderRadius: "12px",
            background: "linear-gradient(135deg, rgba(63,107,51,0.15), rgba(43,69,112,0.15))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "22px", flexShrink: 0
          }}>
            🌦️
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--tx)", margin: 0, fontFamily: "var(--fd)" }}>
                {t("mi.weather_title", "Weather & Climate Intelligence")}
              </h3>
              <span style={{
                fontSize: "11px", fontWeight: 700,
                color: "var(--cp)", background: "var(--bg-l)",
                border: "1px solid var(--bd)", padding: "2px 8px", borderRadius: "12px",
                display: "inline-flex", alignItems: "center", gap: "4px"
              }}>
                📍 {locName}
              </span>
            </div>
            <p style={{ fontSize: "11.5px", color: "var(--tx-m)", margin: "3px 0 0 0" }}>
              {t("mi.weather_sub", "Real-time agro-meteorological metrics & 7–14 day forecast powered by Open-Meteo")}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* 7d vs 14d toggle */}
          <div style={{
            display: "inline-flex", background: "var(--bg-l)",
            padding: "2px", borderRadius: "8px", border: "1px solid var(--bd)"
          }}>
            {[7, 14].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setForecastDays && setForecastDays(d)}
                style={{
                  background: forecastDays === d ? "var(--cp)" : "transparent",
                  color: forecastDays === d ? "var(--bg)" : "var(--tx-m)",
                  border: "none", borderRadius: "6px",
                  padding: "4px 10px", fontSize: "11px", fontWeight: 700,
                  cursor: "pointer", transition: "all 0.15s ease"
                }}
              >
                {d === 7 ? t("mi.forecast_7d", "7 Days") : t("mi.forecast_14d", "14 Days")}
              </button>
            ))}
          </div>

          {/* Location button if needed */}
          {onDetectLocation && (
            <button
              type="button"
              onClick={onDetectLocation}
              title={t("mi.detect_location", "Detect Location")}
              style={{
                background: "var(--bg-l)", color: "var(--tx-m)",
                border: "1px solid var(--bd)", borderRadius: "8px",
                padding: "5px 10px", fontSize: "11px", fontWeight: 600,
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px"
              }}
            >
              <span>📍</span>
            </button>
          )}

          {/* Refresh button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title="Refresh Weather"
              style={{
                background: "var(--bg-l)", color: "var(--tx-m)",
                border: "1px solid var(--bd)", borderRadius: "8px",
                padding: "5px 10px", fontSize: "11px", fontWeight: 600,
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px"
              }}
            >
              <span style={{ display: "inline-block", animation: loading ? "spin 0.8s linear infinite" : "none" }}>🔄</span>
            </button>
          )}
        </div>
      </div>

      {/* ── LOADING & ERROR STATES ── */}
      {loading && !current && (
        <div style={{ padding: "32px", textAlign: "center", color: "var(--tx-s)" }}>
          <div style={{ display: "inline-block", width: 24, height: 24, border: "3px solid var(--bd)", borderTopColor: "var(--cp)", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginBottom: "8px" }} />
          <div style={{ fontSize: "12.5px", fontWeight: 600 }}>{t("mi.loading_weather", "Loading real-time weather data…")}</div>
        </div>
      )}

      {error && !current && (
        <div style={{
          padding: "16px", background: "var(--warn-bg)", border: "1px solid var(--warn)",
          borderRadius: "10px", color: "var(--tx)", fontSize: "12px", display: "flex", alignItems: "center", gap: "10px"
        }}>
          <span style={{ fontSize: "18px" }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>{t("mi.weather_error", "Unable to load live weather data")}</div>
            <div style={{ color: "var(--tx-m)", fontSize: "11px" }}>{error}</div>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              style={{
                background: "var(--cp)", color: "var(--bg)", border: "none",
                borderRadius: "6px", padding: "4px 10px", fontSize: "11px", fontWeight: 700, cursor: "pointer"
              }}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* ── MAIN WEATHER DISPLAY ── */}
      {current && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* 1. HERO CURRENT BAR */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "14px",
            background: "var(--bg-l)",
            borderRadius: "12px",
            padding: "16px",
            border: "1px solid var(--bd)"
          }} className="hover-card-elevation transition-all duration-200">
            {/* Left: Temp & Condition */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div className="anim-float" style={{ fontSize: "3rem", lineHeight: 1, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}>
                {current.icon || "🌤️"}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <span style={{ fontSize: "2.2rem", fontWeight: 900, color: "var(--tx)", fontFamily: "var(--fd)", lineHeight: 1 }}>
                    {Math.round(current.temperature ?? 0)}°C
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--tx-s)", fontWeight: 600 }}>
                    ({t("mi.feels_like", "Feels like")} {Math.round(current.apparent_temperature ?? current.temperature ?? 0)}°C)
                  </span>
                </div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--cp)", marginTop: "3px" }}>
                  {current.condition} · {current.badge}
                </div>
                <div style={{ fontSize: "10.5px", color: "var(--tx-s)", marginTop: "2px" }}>
                  {current.is_day ? "☀️ Day Time" : "🌙 Night Time"} · {current.time ? String(current.time).replace("T", " ") : ""}
                </div>
              </div>
            </div>

            {/* Right: Agricultural Suitability Badges */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", justifyContent: "center" }}>
              {advisoriesList.slice(0, 2).map((adv, idx) => {
                const isGood = adv.status === "favorable";
                const isWarn = adv.status === "warning" || adv.status === "unfavorable";
                const bg = isGood ? "rgba(63,107,51,0.1)" : isWarn ? "rgba(220,38,38,0.1)" : "rgba(234,88,12,0.1)";
                const border = isGood ? "rgba(63,107,51,0.3)" : isWarn ? "rgba(220,38,38,0.3)" : "rgba(234,88,12,0.3)";
                const textColor = isGood ? "var(--cp)" : isWarn ? "var(--danger)" : "var(--warn)";

                return (
                  <div
                    key={idx}
                    style={{
                      background: bg, border: `1px solid ${border}`,
                      borderRadius: "8px", padding: "6px 10px", fontSize: "11px",
                      display: "flex", alignItems: "flex-start", gap: "6px"
                    }}
                  >
                    <span style={{ fontSize: "13px", flexShrink: 0 }}>{adv.icon}</span>
                    <div>
                      <span style={{ fontWeight: 700, color: textColor }}>{adv.title}: </span>
                      <span style={{ color: "var(--tx)", fontSize: "10.5px" }}>{adv.message}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. AGRO-WEATHER METRICS (6 Mini Cards) */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "10px"
          }}>
            {[
              {
                icon: "💧",
                label: t("mi.humidity", "Humidity"),
                value: `${current.humidity ?? 0}%`,
                sub: (current.humidity ?? 0) > 80 ? "High" : (current.humidity ?? 0) < 40 ? "Low" : "Normal",
                color: "var(--cp)"
              },
              {
                icon: "🌧️",
                label: t("mi.precipitation", "Rainfall"),
                value: `${(current.precipitation ?? 0).toFixed(1)} mm`,
                sub: (current.precipitation ?? 0) > 0 ? "Active Rain" : "No Rain",
                color: (current.precipitation ?? 0) > 0 ? "#2563eb" : "var(--tx-m)"
              },
              {
                icon: "☂️",
                label: t("mi.rain_prob", "Rain Chance"),
                value: `${forecast[0]?.precipitation_probability ?? 0}%`,
                sub: (forecast[0]?.precipitation_probability ?? 0) > 50 ? "Likely" : "Low risk",
                color: (forecast[0]?.precipitation_probability ?? 0) > 50 ? "#2563eb" : "var(--tx-m)"
              },
              {
                icon: "💨",
                label: t("mi.wind_speed", "Wind Speed"),
                value: `${current.wind_speed ?? 0} km/h`,
                sub: (current.wind_speed ?? 0) > 20 ? "Breezy" : "Gentle",
                color: "var(--tx-m)"
              },
              {
                icon: "☁️",
                label: t("mi.cloud_cover", "Cloud Cover"),
                value: `${current.cloud_cover ?? 0}%`,
                sub: (current.cloud_cover ?? 0) > 75 ? "Overcast" : (current.cloud_cover ?? 0) > 30 ? "Partly cloudy" : "Clear",
                color: "var(--tx-m)"
              },
              {
                icon: "☀️",
                label: t("mi.uv_index", "UV Index"),
                value: `${forecast[0]?.uv_index_max ? Number(forecast[0].uv_index_max).toFixed(1) : "—"}`,
                sub: (forecast[0]?.uv_index_max ?? 0) >= 8 ? "Very High" : (forecast[0]?.uv_index_max ?? 0) >= 6 ? "High" : "Moderate",
                color: "#eab308"
              },
            ].map((m, i) => (
              <div
                key={i}
                style={{
                  background: "var(--bg-l)",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  border: "1px solid var(--bd)",
                  textAlign: "center",
                  transition: "all 0.18s ease"
                }}
                className={`hover-card-elevation anim-fadeup stagger-${(i % 6) + 1}`}
              >
                <div style={{ fontSize: "14px", marginBottom: "2px" }}>{m.icon}</div>
                <div style={{ fontSize: "9.5px", fontWeight: 700, color: "var(--tx-s)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {m.label}
                </div>
                <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--tx)", fontFamily: "var(--fd)", margin: "2px 0" }}>
                  {m.value}
                </div>
                <div style={{ fontSize: "9.5px", color: m.color, fontWeight: 600 }}>
                  {m.sub}
                </div>
              </div>
            ))}
          </div>

          {/* 3. DAILY FORECAST STRIP */}
          {forecast.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--tx-m)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                  📅 {t("mi.daily_forecast_title", "Daily Agro-Weather Forecast")} ({forecast.length} {t("mi.days", "Days")})
                </span>
                <span style={{ fontSize: "10.5px", color: "var(--tx-s)" }}>
                  {t("mi.min_max_band", "Min–Max Temp")} & {t("mi.precipitation", "Rain")}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  overflowX: "auto",
                  paddingBottom: "8px",
                  scrollbarWidth: "thin"
                }}
              >
                {forecast.map((day, idx) => {
                  const isToday = idx === 0;
                  const isTomorrow = idx === 1;
                  const hasRain = (day.precipitation_probability ?? 0) > 30 || (day.precipitation_sum ?? 0) > 0.5;

                  return (
                    <div
                      key={day.date}
                      style={{
                        minWidth: "112px",
                        maxWidth: "120px",
                        flex: "0 0 auto",
                        background: isToday ? "rgba(63,107,51,0.08)" : "var(--bg-l)",
                        border: isToday ? "1.5px solid var(--cp)" : "1px solid var(--bd)",
                        borderRadius: "10px",
                        padding: "10px 8px",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        transition: "all 0.18s ease"
                      }}
                      className="hover-card-elevation shadow-sm"
                    >
                      {/* Day Name */}
                      <div style={{
                        fontSize: "11px", fontWeight: 800,
                        color: isToday ? "var(--cp)" : isTomorrow ? "#2B4570" : "var(--tx)"
                      }}>
                        {isToday ? t("mi.today", "Today") : isTomorrow ? t("mi.tomorrow", "Tomorrow") : day.day_name}
                      </div>

                      {/* Date */}
                      <div style={{ fontSize: "9.5px", color: "var(--tx-s)" }}>
                        {day.date_formatted}
                      </div>

                      {/* Icon */}
                      <div style={{ fontSize: "22px", margin: "2px 0" }}>
                        {day.icon || "🌤️"}
                      </div>

                      {/* Condition snippet */}
                      <div style={{
                        fontSize: "9.5px", fontWeight: 600, color: "var(--tx-m)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                      }}>
                        {day.badge || day.condition}
                      </div>

                      {/* Temp Min / Max */}
                      <div style={{
                        fontSize: "11px", fontWeight: 700, color: "var(--tx)",
                        display: "flex", justifyContent: "center", gap: "4px", marginTop: "2px"
                      }}>
                        <span style={{ color: "#dc2626" }}>{Math.round(day.temp_max ?? 0)}°</span>
                        <span style={{ color: "var(--tx-s)" }}>/</span>
                        <span style={{ color: "#2563eb" }}>{Math.round(day.temp_min ?? 0)}°</span>
                      </div>

                      {/* Rain info */}
                      <div style={{
                        fontSize: "9.5px",
                        color: hasRain ? "#2563eb" : "var(--tx-s)",
                        fontWeight: hasRain ? 700 : 500,
                        background: hasRain ? "rgba(37,99,235,0.08)" : "transparent",
                        borderRadius: "6px",
                        padding: "2px 4px",
                        marginTop: "2px"
                      }}>
                        💧 {day.precipitation_probability}%
                        {(day.precipitation_sum ?? 0) > 0 && ` · ${Number(day.precipitation_sum).toFixed(1)}mm`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
