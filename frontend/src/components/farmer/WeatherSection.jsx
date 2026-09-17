// src/components/farmer/WeatherSection.jsx — Real-Time Weather & Climate Intelligence
// Phase 2 redesign: presentation layer only. All props, computed values
// (current/forecast/advisoriesList/locName) and the Open-Meteo data contract
// are unchanged from the previous version.
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  CloudSun, MapPin, RefreshCw, Locate, AlertTriangle, Droplets,
  CloudRain, Umbrella, Wind, Cloud, Sun, Calendar,
} from "lucide-react";
import Reveal from "../ui/Reveal";
import { RevealGroup, RevealItem } from "../ui/RevealGroup";

export default function WeatherSection({
  coords,
  weatherData,
  loading,
  error,
  forecastDays = 14,
  setForecastDays,
  onRefresh,
  onDetectLocation,
  locationStatus,
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
        message: v?.action || v?.message || (typeof v === "string" ? v : ""),
      }))
    : [];
  const locName = coords?.label || weatherData?.location?.timezone?.replace("_", " ") || "Maharashtra";

  const metrics = current
    ? [
        {
          Icon: Droplets,
          label: t("mi.humidity", "Humidity"),
          value: `${current.humidity ?? 0}%`,
          sub: (current.humidity ?? 0) > 80 ? "High" : (current.humidity ?? 0) < 40 ? "Low" : "Normal",
          tone: "text-accent",
        },
        {
          Icon: CloudRain,
          label: t("mi.precipitation", "Rainfall"),
          value: `${(current.precipitation ?? 0).toFixed(1)} mm`,
          sub: (current.precipitation ?? 0) > 0 ? "Active Rain" : "No Rain",
          tone: (current.precipitation ?? 0) > 0 ? "text-info" : "text-ink-muted",
        },
        {
          Icon: Umbrella,
          label: t("mi.rain_prob", "Rain Chance"),
          value: `${forecast[0]?.precipitation_probability ?? 0}%`,
          sub: (forecast[0]?.precipitation_probability ?? 0) > 50 ? "Likely" : "Low risk",
          tone: (forecast[0]?.precipitation_probability ?? 0) > 50 ? "text-info" : "text-ink-muted",
        },
        {
          Icon: Wind,
          label: t("mi.wind_speed", "Wind Speed"),
          value: `${current.wind_speed ?? 0} km/h`,
          sub: (current.wind_speed ?? 0) > 20 ? "Breezy" : "Gentle",
          tone: "text-ink-muted",
        },
        {
          Icon: Cloud,
          label: t("mi.cloud_cover", "Cloud Cover"),
          value: `${current.cloud_cover ?? 0}%`,
          sub: (current.cloud_cover ?? 0) > 75 ? "Overcast" : (current.cloud_cover ?? 0) > 30 ? "Partly cloudy" : "Clear",
          tone: "text-ink-muted",
        },
        {
          Icon: Sun,
          label: t("mi.uv_index", "UV Index"),
          value: `${forecast[0]?.uv_index_max ? Number(forecast[0].uv_index_max).toFixed(1) : "—"}`,
          sub: (forecast[0]?.uv_index_max ?? 0) >= 8 ? "Very High" : (forecast[0]?.uv_index_max ?? 0) >= 6 ? "High" : "Moderate",
          tone: "text-warn",
        },
      ]
    : [];

  return (
    <div className="rounded-panel border border-line border-t-2 border-t-line-strong bg-surface-card p-5 shadow-subtle transition-shadow duration-300 hover:shadow-card">
      {/* ── HEADER & CONTROLS ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-accent-pale to-info-bg text-accent">
            <CloudSun size={22} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-base font-extrabold text-ink">
                {t("mi.weather_title", "Weather & Climate Intelligence")}
              </h3>
              <span className="inline-flex items-center gap-1 rounded-pill border border-line bg-surface-light px-2 py-0.5 text-[11px] font-bold text-accent">
                <MapPin size={11} /> {locName}
              </span>
            </div>
            <p className="mt-0.5 text-[11.5px] text-ink-muted">
              {t("mi.weather_sub", "Real-time agro-meteorological metrics & 7–14 day forecast powered by Open-Meteo")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-line bg-surface-light p-0.5">
            {[7, 14].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setForecastDays && setForecastDays(d)}
                className="rounded-[6px] px-2.5 py-1 text-[11px] font-bold transition-colors duration-150"
                style={{
                  background: forecastDays === d ? "var(--cp)" : "transparent",
                  color: forecastDays === d ? "var(--cp-text)" : "var(--tx-m)",
                }}
              >
                {d === 7 ? t("mi.forecast_7d", "7 Days") : t("mi.forecast_14d", "14 Days")}
              </button>
            ))}
          </div>

          {onDetectLocation && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={onDetectLocation}
              title={t("mi.detect_location", "Detect Location")}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface-light text-ink-muted transition-colors hover:text-accent"
            >
              <Locate size={14} />
            </motion.button>
          )}

          {onRefresh && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title="Refresh Weather"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface-light text-ink-muted transition-colors hover:text-accent disabled:opacity-60"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </motion.button>
          )}
        </div>
      </div>

      {/* ── LOADING & ERROR STATES ── */}
      {loading && !current && (
        <div className="py-8 text-center text-ink-soft">
          <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-[3px] border-line border-t-accent" />
          <div className="text-[12.5px] font-semibold">{t("mi.loading_weather", "Loading real-time weather data…")}</div>
        </div>
      )}

      <AnimatePresence>
        {error && !current && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2.5 overflow-hidden rounded-md border border-warn bg-warn-bg p-4 text-xs text-ink"
          >
            <AlertTriangle size={18} className="shrink-0 text-warn" />
            <div className="flex-1">
              <div className="font-bold">{t("mi.weather_error", "Unable to load live weather data")}</div>
              <div className="text-[11px] text-ink-muted">{error}</div>
            </div>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="rounded-md border border-accent-dark bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-fg"
              >
                Retry
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN WEATHER DISPLAY ── */}
      {current && (
        <div className="flex flex-col gap-4">
          {/* 1. HERO CURRENT BAR */}
          <Reveal className="grid grid-cols-1 gap-3.5 rounded-md border border-line bg-surface-light p-4 sm:grid-cols-2">
            <div className="flex items-center gap-4">
              <motion.div
                className="text-[3rem] leading-none drop-shadow-sm"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                {current.icon || "🌤️"}
              </motion.div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-[2.2rem] font-black leading-none text-ink">
                    {Math.round(current.temperature ?? 0)}°C
                  </span>
                  <span className="text-xs font-semibold text-ink-soft">
                    ({t("mi.feels_like", "Feels like")} {Math.round(current.apparent_temperature ?? current.temperature ?? 0)}°C)
                  </span>
                </div>
                <div className="mt-0.5 text-[13px] font-bold text-accent">
                  {current.condition} · {current.badge}
                </div>
                <div className="mt-0.5 text-[10.5px] text-ink-soft">
                  {current.is_day ? "☀️ Day Time" : "🌙 Night Time"} · {current.time ? String(current.time).replace("T", " ") : ""}
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-1.5">
              {advisoriesList.slice(0, 2).map((adv, idx) => {
                const isGood = adv.status === "favorable";
                const isWarn = adv.status === "warning" || adv.status === "unfavorable";
                const cls = isGood
                  ? "bg-safe-bg border-safe text-safe"
                  : isWarn
                  ? "bg-danger-bg border-danger text-danger"
                  : "bg-warn-bg border-warn text-warn";
                return (
                  <div key={idx} className={`flex items-start gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] ${cls}`}>
                    <span className="shrink-0 text-[13px]">{adv.icon}</span>
                    <div>
                      <span className="font-bold">{adv.title}: </span>
                      <span className="text-[10.5px] text-ink">{adv.message}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>

          {/* 2. AGRO-WEATHER METRICS (6 Mini Cards) */}
          <RevealGroup className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6" stagger={0.05}>
            {metrics.map(({ Icon, label, value, sub, tone }, i) => (
              <RevealItem
                key={i}
                className="rounded-md border border-line bg-surface-light p-2.5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-subtle"
              >
                <Icon size={16} className={`mx-auto mb-1 ${tone}`} />
                <div className="text-[9.5px] font-bold uppercase tracking-wide text-ink-soft">{label}</div>
                <div className="my-0.5 font-display text-[15px] font-extrabold text-ink">{value}</div>
                <div className={`text-[9.5px] font-semibold ${tone}`}>{sub}</div>
              </RevealItem>
            ))}
          </RevealGroup>

          {/* 3. DAILY FORECAST STRIP */}
          {forecast.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                  <Calendar size={12} /> {t("mi.daily_forecast_title", "Daily Agro-Weather Forecast")} ({forecast.length} {t("mi.days", "Days")})
                </span>
                <span className="text-[10.5px] text-ink-soft">
                  {t("mi.min_max_band", "Min–Max Temp")} & {t("mi.precipitation", "Rain")}
                </span>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
                {forecast.map((day, idx) => {
                  const isToday = idx === 0;
                  const isTomorrow = idx === 1;
                  const hasRain = (day.precipitation_probability ?? 0) > 30 || (day.precipitation_sum ?? 0) > 0.5;

                  return (
                    <div
                      key={day.date}
                      className={`flex min-w-[112px] max-w-[120px] flex-none flex-col gap-1 rounded-md border p-2.5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-subtle ${
                        isToday ? "border-[1.5px] border-accent bg-accent-pale" : "border-line bg-surface-light"
                      }`}
                    >
                      <div
                        className="text-[11px] font-extrabold"
                        style={{ color: isToday ? "var(--cp)" : isTomorrow ? "#2B4570" : "var(--tx)" }}
                      >
                        {isToday ? t("mi.today", "Today") : isTomorrow ? t("mi.tomorrow", "Tomorrow") : day.day_name}
                      </div>
                      <div className="text-[9.5px] text-ink-soft">{day.date_formatted}</div>
                      <div className="my-0.5 text-[22px]">{day.icon || "🌤️"}</div>
                      <div className="truncate text-[9.5px] font-semibold text-ink-muted">{day.badge || day.condition}</div>
                      <div className="mt-0.5 flex justify-center gap-1 text-[11px] font-bold text-ink">
                        <span className="text-danger">{Math.round(day.temp_max ?? 0)}°</span>
                        <span className="text-ink-soft">/</span>
                        <span className="text-info">{Math.round(day.temp_min ?? 0)}°</span>
                      </div>
                      <div
                        className={`mt-0.5 rounded-[6px] px-1 py-0.5 text-[9.5px] ${
                          hasRain ? "bg-info-bg font-bold text-info" : "font-medium text-ink-soft"
                        }`}
                      >
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
