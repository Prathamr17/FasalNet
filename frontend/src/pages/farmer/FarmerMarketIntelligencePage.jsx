// pages/farmer/FarmerMarketIntelligencePage.jsx — v12
// Changes v12:
//   1. Market shows latest data; Sync Now button actually refreshes chart data after sync
//   2. Proper ARIMA forecast: dashed line, side-panel with per-day values, 7/30 day toggle
//   3. Forecast line is dashed/dotted
//   4. Min/max prices shown as shaded regression band
//   5. Tab renamed: "ML Predict" → "Price Tools"
//   6. Removed "Total Records", renamed "Latest DB Date" → "Latest Date", show cities list

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { marketAPI, mlAPI } from "../../services/api";

const PALETTE = [
  "#3F6B33","#2B4570","#B4741E","#8B3A2B",
  "#5C3A5C","#0891B2","#EA580C","#5C3A5C",
];

function useDims(ref) {
  const [dims, setDims] = useState({ w: 600, h: 260 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) =>
      setDims({ w: e.contentRect.width, h: 260 })
    );
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return dims;
}

// ─── SEARCHABLE CITY MULTI-SELECT ─────────────────────────────────────────────
function CitySearchSelect({ cities, selectedCities, onToggle }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const filtered = cities.filter(c => c.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div onClick={() => setOpen(o => !o)} style={{
        width: "100%", background: "var(--bg-l)", border: "1px solid var(--bd)",
        color: "var(--tx)", fontFamily: "var(--fb)", fontSize: "12px",
        padding: "8px 10px", borderRadius: "9px", cursor: "pointer",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxSizing: "border-box", userSelect: "none",
      }}>
        <span style={{ color: selectedCities.length ? "var(--tx)" : "var(--tx-s)" }}>
          {selectedCities.length === 0 ? "Search & select markets…"
            : selectedCities.length === 1 ? selectedCities[0]
            : `${selectedCities.length} markets selected`}
        </span>
        <span style={{ fontSize: "10px", color: "var(--tx-s)" }}>{open ? "▲" : "▼"}</span>
      </div>
      {selectedCities.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
          {selectedCities.map(city => (
            <div key={city} style={{
              display: "flex", alignItems: "center", gap: "4px",
              background: "var(--cp-pale)", border: "1px solid rgba(63,107,51,.3)",
              borderRadius: "20px", padding: "2px 8px 2px 10px",
              fontSize: "10px", color: "var(--cp)", fontWeight: 600,
            }}>
              {city.replace(/ APMC$/, "")}
              <span onClick={(e) => { e.stopPropagation(); onToggle(city); }}
                style={{ cursor: "pointer", fontSize: "13px", lineHeight: 1, color: "var(--cp)", fontWeight: 900, marginLeft: "2px" }}>×</span>
            </div>
          ))}
        </div>
      )}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 999,
          background: "var(--bg-m)", border: "1px solid var(--bd)", borderRadius: "10px",
          boxShadow: "0 8px 30px rgba(0,0,0,.3)", overflow: "hidden",
        }}>
          <div style={{ padding: "8px", borderBottom: "1px solid var(--bd)" }}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Type to search markets…"
              style={{ width: "100%", background: "var(--bg-l)", border: "1px solid var(--bd)",
                color: "var(--tx)", fontFamily: "var(--fb)", fontSize: "12px",
                padding: "6px 10px", borderRadius: "7px", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: "8px", padding: "6px 10px", borderBottom: "1px solid var(--bd)", alignItems: "center" }}>
            <button onClick={() => filtered.forEach(c => { if (!selectedCities.includes(c)) onToggle(c); })}
              style={{ fontSize: "10px", color: "var(--cp)", background: "none", border: "none", cursor: "pointer", fontWeight: 700, padding: 0 }}>Select All</button>
            <span style={{ color: "var(--tx-s)", fontSize: "10px" }}>·</span>
            <button onClick={() => [...selectedCities].forEach(c => onToggle(c))}
              style={{ fontSize: "10px", color: "var(--tx-s)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>Clear</button>
            <span style={{ fontSize: "10px", color: "var(--tx-s)", marginLeft: "auto" }}>{filtered.length} of {cities.length}</span>
          </div>
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: "var(--tx-s)" }}>No markets match "{search}"</div>
            ) : filtered.map(city => (
              <label key={city} style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "7px 12px", cursor: "pointer",
                background: selectedCities.includes(city) ? "var(--cp-pale)" : "transparent",
              }}>
                <input type="checkbox" checked={selectedCities.includes(city)} onChange={() => onToggle(city)}
                  style={{ accentColor: "var(--cp)", width: 13, height: 13 }} />
                <span style={{ fontSize: "12px", color: "var(--tx)", fontWeight: selectedCities.includes(city) ? 600 : 400 }}>{city}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ENHANCED LINE CHART: actual + ARIMA forecast + min/max band ──────────────
function LineChart({ series, forecastSeries = [] }) {
  const ref    = useRef(null);
  const svgRef = useRef(null);
  const dims   = useDims(ref);
  const { w, h } = dims;
  const PAD = { t: 36, r: 24, b: 44, l: 62 };

  const [tooltip, setTooltip] = useState(null);

  const todayStr    = new Date().toISOString().split("T")[0];
  const tomorrowStr = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })();

  // Collect all points (actual + forecast)
  const allActualPrices  = series.flatMap(s => s.points.map(p => p.price).filter(Boolean));
  const allFcPrices      = forecastSeries.flatMap(s => s.points.map(p => p.price).filter(Boolean));
  const allMinMax        = [
    ...series.flatMap(s => s.points.flatMap(p => [p.min_price, p.max_price].filter(Boolean))),
    ...forecastSeries.flatMap(s => s.points.flatMap(p => [p.min_price, p.max_price].filter(Boolean))),
  ];
  const allPrices   = [...allActualPrices, ...allFcPrices, ...allMinMax];
  const allDates    = [
    ...series.flatMap(s => s.points.map(p => p.date)),
    ...forecastSeries.flatMap(s => s.points.map(p => p.date)),
  ];
  const uniqueDates = [...new Set(allDates)].sort();

  if (!allPrices.length || !uniqueDates.length) {
    return (
      <div ref={ref} style={{ height: h, display: "flex", alignItems: "center",
        justifyContent: "center", color: "var(--tx-s)", fontSize: "13px" }}>
        No data for this selection
      </div>
    );
  }

  const minP = Math.min(...allPrices) * 0.93;
  const maxP = Math.max(...allPrices) * 1.07;
  const cW   = w - PAD.l - PAD.r;
  const cH   = h - PAD.t - PAD.b;

  const domainDates = [...new Set([...uniqueDates, todayStr, tomorrowStr])].sort();
  const xScale = (i) => PAD.l + (i / (domainDates.length - 1 || 1)) * cW;
  const yScale = (v) => PAD.t + cH - ((v - minP) / ((maxP - minP) || 1)) * cH;

  const yTicks = 5;
  const yGrid = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = minP + ((maxP - minP) * i) / yTicks;
    return { y: yScale(v), label: `₹${Math.round(v).toLocaleString("en-IN")}` };
  });

  const xStep = Math.max(1, Math.floor(domainDates.length / 7));
  const xLabels = domainDates
    .map((d, i) => ({ d, i }))
    .filter(({ d, i }) => i % xStep === 0 || i === domainDates.length - 1 || d === todayStr || d === tomorrowStr)
    .map(({ d, i }) => ({ date: d, x: xScale(i), isToday: d === todayStr, isTomorrow: d === tomorrowStr }));

  const toPath = (points) => {
    const valid = points.map(p => {
      const idx = domainDates.indexOf(p.date);
      return idx >= 0 && p.price != null ? `${xScale(idx).toFixed(1)},${yScale(p.price).toFixed(1)}` : null;
    }).filter(Boolean);
    return valid.length ? "M" + valid.join("L") : "";
  };

  // Build min/max band path for a series (area between min and max)
  const toBandPath = (points) => {
    const validPts = points.filter(p => {
      const idx = domainDates.indexOf(p.date);
      return idx >= 0 && p.min_price != null && p.max_price != null;
    });
    if (validPts.length < 2) return "";
    const top    = validPts.map(p => `${xScale(domainDates.indexOf(p.date)).toFixed(1)},${yScale(p.max_price).toFixed(1)}`);
    const bottom = [...validPts].reverse().map(p => `${xScale(domainDates.indexOf(p.date)).toFixed(1)},${yScale(p.min_price).toFixed(1)}`);
    return `M${top.join("L")}L${bottom.join("L")}Z`;
  };

  const todayX    = xScale(domainDates.indexOf(todayStr));
  const tomorrowX = xScale(domainDates.indexOf(tomorrowStr));
  const lastActualX = series.length > 0
    ? xScale(domainDates.indexOf([...new Set(series.flatMap(s => s.points.map(p => p.date)))].sort().pop() || ""))
    : PAD.l;

  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (mx < PAD.l || mx > w - PAD.r || my < PAD.t || my > h - PAD.b) { setTooltip(null); return; }
    const ratio   = (mx - PAD.l) / cW;
    const rawIdx  = Math.round(ratio * (domainDates.length - 1));
    const nearIdx = Math.max(0, Math.min(domainDates.length - 1, rawIdx));
    const nearDate = domainDates[nearIdx];
    const nearX    = xScale(nearIdx);

    const actualHits = series.map(s => {
      const pt = s.points.find(p => p.date === nearDate);
      return pt && pt.price != null ? { label: s.label, color: s.color, price: pt.price, isForecast: false } : null;
    }).filter(Boolean);

    const fcHits = forecastSeries.map(s => {
      const pt = s.points.find(p => p.date === nearDate);
      return pt && pt.price != null ? { label: s.label + " (forecast)", color: s.color, price: pt.price, isForecast: true } : null;
    }).filter(Boolean);

    const hits = [...actualHits, ...fcHits];
    if (!hits.length) { setTooltip(null); return; }
    setTooltip({ date: nearDate, hits, x: nearX, svgY: my });
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <svg ref={svgRef} width={w} height={h}
        style={{ overflow: "visible", display: "block", cursor: "crosshair" }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>

        {yGrid.map(({ y, label }) => (
          <g key={y}>
            <line x1={PAD.l} y1={y} x2={w - PAD.r} y2={y} stroke="var(--bd)" strokeWidth="1" strokeDasharray="4 3" />
            <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--tx-s)">{label}</text>
          </g>
        ))}

        {/* Future shading */}
        {lastActualX < w - PAD.r && (
          <rect x={lastActualX} y={PAD.t} width={w - PAD.r - lastActualX} height={cH}
            fill="rgba(255,255,255,0.025)" />
        )}

        {/* Min/max shaded band for actual series */}
        {series.map((s, si) => {
          const bandPath = toBandPath(s.points);
          if (!bandPath) return null;
          return (
            <path key={`band-actual-${si}`} d={bandPath}
              fill={s.color} opacity="0.12" />
          );
        })}

        {/* Min/max shaded band for forecast series */}
        {forecastSeries.map((s, si) => {
          const bandPath = toBandPath(s.points);
          if (!bandPath) return null;
          return (
            <path key={`band-fc-${si}`} d={bandPath}
              fill={s.color} opacity="0.08" />
          );
        })}

        {/* Today/Tomorrow markers */}
        <g>
          <line x1={todayX} y1={PAD.t} x2={todayX} y2={PAD.t + cH} stroke="#2B4570" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.8" />
          <text x={todayX} y={PAD.t + 6} textAnchor="start" fontSize="9" fontWeight="700" fill="#2B4570" letterSpacing="0.5"
            transform={`rotate(-90, ${todayX}, ${PAD.t + 6})`}>TODAY</text>
        </g>
        <g>
          <line x1={tomorrowX} y1={PAD.t} x2={tomorrowX} y2={PAD.t + cH} stroke="#B4741E" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.8" />
          <text x={tomorrowX} y={PAD.t + 6} textAnchor="start" fontSize="9" fontWeight="700" fill="#B4741E" letterSpacing="0.5"
            transform={`rotate(-90, ${tomorrowX}, ${PAD.t + 6})`}>TOMORROW</text>
        </g>

        {xLabels.map(({ date, x, isToday, isTomorrow }) => (
          <text key={date} x={x} y={h - 6} textAnchor="middle"
            fontSize={isToday || isTomorrow ? "9" : "10"}
            fontWeight={isToday || isTomorrow ? "700" : "400"}
            fill={isToday ? "#2B4570" : isTomorrow ? "#B4741E" : "var(--tx-s)"}>
            {isToday ? "Today" : isTomorrow ? "Tmrw" : date.slice(5)}
          </text>
        ))}

        {/* Actual data lines — solid */}
        {series.map((s, si) => {
          const path = toPath(s.points);
          if (!path) return null;
          return (
            <g key={`actual-${si}`}>
              <path d={path} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {(() => {
                const last = s.points[s.points.length - 1];
                const idx  = last ? domainDates.indexOf(last.date) : -1;
                return last && last.price != null && idx >= 0 ? (
                  <circle cx={xScale(idx)} cy={yScale(last.price)} r="4" fill={s.color} stroke="var(--bg)" strokeWidth="2" />
                ) : null;
              })()}
            </g>
          );
        })}

        {/* Forecast lines — DASHED */}
        {forecastSeries.map((s, si) => {
          const path = toPath(s.points);
          if (!path) return null;
          return (
            <g key={`fc-${si}`}>
              <path d={path} fill="none" stroke={s.color} strokeWidth="2.5"
                strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round"
                opacity="0.85" />
              {(() => {
                const last = s.points[s.points.length - 1];
                const idx  = last ? domainDates.indexOf(last.date) : -1;
                return last && last.price != null && idx >= 0 ? (
                  <circle cx={xScale(idx)} cy={yScale(last.price)} r="4"
                    fill={s.color} stroke="var(--bg)" strokeWidth="2"
                    strokeDasharray="none" opacity="0.85" />
                ) : null;
              })()}
            </g>
          );
        })}

        {/* Hover crosshair */}
        {tooltip && (
          <line x1={tooltip.x} y1={PAD.t} x2={tooltip.x} y2={PAD.t + cH}
            stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="3 2" />
        )}
        {tooltip && tooltip.hits.map((hit, i) => {
          const allSeries = [...series, ...forecastSeries];
          const pt = allSeries.find(s =>
            s.label === hit.label.replace(" (forecast)", "") ||
            (hit.isForecast && s.label === hit.label.replace(" (forecast)", ""))
          )?.points.find(p => p.date === tooltip.date);
          if (!pt || pt.price == null) return null;
          return (
            <circle key={i} cx={tooltip.x} cy={yScale(pt.price)} r="5"
              fill={hit.color} stroke="var(--bg)" strokeWidth="2.5" />
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (() => {
        const tipW = 200;
        const leftPos = tooltip.x + 14 > w - tipW ? tooltip.x - tipW - 8 : tooltip.x + 14;
        return (
          <div style={{
            position: "absolute", left: leftPos, top: Math.max(0, tooltip.svgY - 20),
            background: "var(--bg-m)", border: "1px solid var(--bd)", borderRadius: "10px",
            padding: "10px 13px", boxShadow: "0 4px 24px rgba(0,0,0,.3)",
            zIndex: 100, pointerEvents: "none", width: `${tipW}px`,
          }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--tx-s)",
              textTransform: "uppercase", letterSpacing: ".6px", marginBottom: "8px",
              paddingBottom: "6px", borderBottom: "1px solid var(--bd)" }}>
              📅 {tooltip.date}
            </div>
            {tooltip.hits.map((hit, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "7px",
                marginBottom: i < tooltip.hits.length - 1 ? "6px" : 0 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: hit.color, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: "11px", color: "var(--tx-m)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {hit.label.replace(/ APMC$/, "")}
                  {hit.isForecast && <span style={{ color: "#5C3A5C", marginLeft: 4, fontSize: "9px", fontWeight: 700 }}>ARIMA</span>}
                </div>
                <div style={{ fontWeight: 800, fontSize: "12px", color: "var(--tx)", fontFamily: "var(--fd)", flexShrink: 0 }}>
                  ₹{hit.price.toLocaleString("en-IN")}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "8px" }}>
        {series.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: 12, height: 3, borderRadius: 2, background: s.color }} />
            <span style={{ fontSize: "11px", color: "var(--tx-m)" }}>{s.label}</span>
          </div>
        ))}
        {forecastSeries.map((s, i) => (
          <div key={`fc-${i}`} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <svg width="16" height="6" style={{ flexShrink: 0 }}>
              <line x1="0" y1="3" x2="16" y2="3" stroke={s.color} strokeWidth="2.5" strokeDasharray="5 3" />
            </svg>
            <span style={{ fontSize: "11px", color: s.color, fontWeight: 600 }}>{s.label} (ARIMA)</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="#2B4570" strokeWidth="2" strokeDasharray="4 3" /></svg>
          <span style={{ fontSize: "11px", color: "#2B4570", fontWeight: 600 }}>Today</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="#B4741E" strokeWidth="2" strokeDasharray="4 3" /></svg>
          <span style={{ fontSize: "11px", color: "#B4741E", fontWeight: 600 }}>Tomorrow</span>
        </div>
        {(series.some(s => s.points.some(p => p.min_price)) || forecastSeries.some(s => s.points.some(p => p.min_price))) && (
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: 12, height: 8, background: "rgba(63,107,51,0.18)", borderRadius: 2 }} />
            <span style={{ fontSize: "11px", color: "var(--tx-s)" }}>Min–Max band</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BAR CHART ────────────────────────────────────────────────────────────────
function BarChart({ data, valueKey, labelKey, color = "#3F6B33" }) {
  const ref  = useRef(null);
  const dims = useDims(ref);
  const { w } = dims;
  const h = 200;
  const PAD = { t: 16, r: 20, b: 60, l: 70 };
  if (!data?.length) return (
    <div ref={ref} style={{ height: h, display: "flex", alignItems: "center",
      justifyContent: "center", color: "var(--tx-s)", fontSize: "13px" }}>No data</div>
  );
  const values = data.map(d => parseFloat(d[valueKey]) || 0);
  const maxV   = Math.max(...values) * 1.1;
  const cW = w - PAD.l - PAD.r;
  const cH = h - PAD.t - PAD.b;
  const bW = (cW / data.length) * 0.65;
  const gap = cW / data.length;
  return (
    <div ref={ref}>
      <svg width={w} height={h} style={{ display: "block" }}>
        {data.map((d, i) => {
          const v  = parseFloat(d[valueKey]) || 0;
          const bH = (v / (maxV || 1)) * cH;
          const x  = PAD.l + i * gap + (gap - bW) / 2;
          const y  = PAD.t + cH - bH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={bW} height={bH} fill={color} rx="4" opacity="0.85" />
              <text x={x + bW / 2} y={y - 4} textAnchor="middle" fontSize="10" fill="var(--tx-m)">₹{Math.round(v).toLocaleString("en-IN")}</text>
              <text x={x + bW / 2} y={PAD.t + cH + 14} textAnchor="middle" fontSize="9" fill="var(--tx-s)">{String(d[labelKey]).slice(0, 10)}</text>
            </g>
          );
        })}
        <line x1={PAD.l} y1={PAD.t + cH} x2={w - PAD.r} y2={PAD.t + cH} stroke="var(--bd)" strokeWidth="1" />
      </svg>
    </div>
  );
}

// ─── HEATMAP ──────────────────────────────────────────────────────────────────
function HeatmapGrid({ matrix, dates, commodities }) {
  if (!commodities?.length || !dates?.length)
    return <div style={{ color: "var(--tx-s)", fontSize: "13px", padding: "24px 0" }}>No data</div>;
  const allVals = commodities.flatMap(c => dates.map(d => matrix?.[c]?.[d] || 0).filter(Boolean));
  const maxV    = Math.max(...allVals, 1);
  const toColor = (v) => `rgba(63,107,51,${Math.min(1, (v / maxV) * 0.9 + 0.1).toFixed(2)})`;
  const shown      = commodities.slice(0, 20);
  const shownDates = dates.filter((_, i) => i % Math.max(1, Math.floor(dates.length / 15)) === 0 || i === dates.length - 1);
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontSize: "10px", minWidth: "100%" }}>
        <thead>
          <tr>
            <th style={{ padding: "4px 8px", color: "var(--tx-s)", textAlign: "left", fontWeight: 600, minWidth: "120px" }}>Commodity</th>
            {shownDates.map(d => (
              <th key={d} style={{ padding: "4px 4px", color: "var(--tx-s)", fontWeight: 500, minWidth: "32px",
                transform: "rotate(-30deg)", transformOrigin: "bottom left", whiteSpace: "nowrap" }}>{d.slice(5)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map(c => (
            <tr key={c}>
              <td style={{ padding: "3px 8px", color: "var(--tx-m)", fontWeight: 500, maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c}</td>
              {shownDates.map(d => {
                const v = matrix?.[c]?.[d] || 0;
                return (
                  <td key={d} title={`${c} | ${d} | ₹${Math.round(v).toLocaleString("en-IN")}`}
                    style={{ background: toColor(v), padding: "3px 4px", textAlign: "center",
                      color: "transparent", userSelect: "none", border: "1px solid var(--bg)", cursor: "default" }}>{Math.round(v)}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: "10px", color: "var(--tx-s)", marginTop: "6px" }}>
        Hover cells for exact price. Green intensity = higher price (₹/Quintal).
        {commodities.length > 20 && ` Showing top 20 of ${commodities.length} commodities.`}
      </div>
    </div>
  );
}

// ─── SHARED STYLES ─────────────────────────────────────────────────────────────
const CARD = { background: "var(--bg-m)", borderRadius: "14px", padding: "18px 20px", border: "1px solid var(--bd)" };
const INP  = { width: "100%", background: "var(--bg-l)", border: "1px solid var(--bd)", color: "var(--tx)", fontFamily: "var(--fb)", fontSize: "13px", padding: "8px 12px", borderRadius: "9px", outline: "none", boxSizing: "border-box" };
const LBL  = { fontSize: "10px", fontWeight: 700, color: "var(--tx-m)", textTransform: "uppercase", letterSpacing: ".7px", display: "block", marginBottom: "4px" };
const BTN  = { background: "linear-gradient(135deg,var(--cp),var(--cp-dark))", color: "var(--bg)", border: "none", borderRadius: "9px", padding: "9px 18px", fontFamily: "var(--fd)", fontWeight: 800, fontSize: "13px", cursor: "pointer" };
const SECONDARY_BTN = { background: "var(--bg-l)", color: "var(--tx-m)", border: "1px solid var(--bd)", borderRadius: "9px", padding: "8px 16px", fontFamily: "var(--fd)", fontWeight: 600, fontSize: "12px", cursor: "pointer" };

function Spin() {
  return <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />;
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
      <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{label}</div>
      <div className="text-2xl font-extrabold leading-tight text-green-600 dark:text-green-500">{value}</div>
      {sub && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

// ─── ML PANELS (Price Tools tab) ──────────────────────────────────────────────
function QuickPricePredict({ meta }) {
  const [form, setForm] = useState({ state: "Maharashtra", district: "Pune", market: "Pune", commodity: "Onion", variety: "Local", grade: "FAQ", month: String(new Date().getMonth() + 1) });
  const [loading, setLoad] = useState(false);
  const [result, setRes]   = useState(null);
  const [error, setErr]    = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoad(true); setErr(""); setRes(null);
    try { const { data } = await mlAPI.price(form); setRes(data); }
    catch (err) { setErr(err.response?.data?.error || "Prediction failed."); }
    finally { setLoad(false); }
  };
  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <span style={{ fontSize: "1.5rem" }}>💰</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: "14px", color: "var(--tx)" }}>Price Prediction</div>
          <div style={{ fontSize: "11px", color: "var(--tx-m)" }}>XGBoost · ₹/Quintal estimate</div>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
          {[
            { label: "State", key: "state", opts: meta?.states || ["Maharashtra"] },
            { label: "District", key: "district", opts: meta?.districts?.[form.state] || ["Pune"] },
            { label: "Commodity", key: "commodity", opts: meta?.commodities || ["Onion"] },
            { label: "Month", key: "month", opts: (meta?.month_names || []).map((m, i) => ({ v: i + 1, l: m })) },
          ].map(({ label, key, opts }) => (
            <div key={key}>
              <label style={LBL}>{label}</label>
              <select style={INP} value={form[key]} onChange={e => set(key, e.target.value)}>
                {opts.map(o => typeof o === "object" ? <option key={o.v} value={o.v}>{o.l}</option> : <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        {error && <div style={{ color: "var(--danger)", fontSize: "12px", marginBottom: "8px" }}>{error}</div>}
        <button type="submit" style={{ ...BTN, display: "flex", alignItems: "center", gap: "6px" }} disabled={loading}>
          {loading ? <><Spin /> Predicting…</> : "🔮 Predict"}
        </button>
      </form>
      {result && (
        <div style={{ marginTop: "14px", padding: "14px", background: "var(--bg-l)", borderRadius: "10px", border: "1px solid var(--bd)", textAlign: "center" }}>
          <div style={{ fontSize: "10px", color: "var(--tx-s)", textTransform: "uppercase", letterSpacing: "1px" }}>Predicted Modal Price</div>
          <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "var(--cp)", fontFamily: "var(--fd)", margin: "4px 0" }}>₹{result.prediction?.toLocaleString("en-IN")}</div>
          <div style={{ fontSize: "11px", color: "var(--tx-s)" }}>per Quintal · {result.model}</div>
        </div>
      )}
    </div>
  );
}

function QuickMarketRec({ meta }) {
  const [form, setForm] = useState({ commodity: "Onion", state: "Maharashtra", variety: "Local", month: String(new Date().getMonth() + 1) });
  const [loading, setLoad] = useState(false);
  const [result, setRes]   = useState(null);
  const [error, setErr]    = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoad(true); setErr(""); setRes(null);
    try { const { data } = await mlAPI.market(form); setRes(data); }
    catch (err) { setErr(err.response?.data?.error || "Recommendation failed."); }
    finally { setLoad(false); }
  };
  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <span style={{ fontSize: "1.5rem" }}>🗺️</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: "14px", color: "var(--tx)" }}>Best Market Finder</div>
          <div style={{ fontSize: "11px", color: "var(--tx-m)" }}>Ranked by predicted price</div>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
          <div><label style={LBL}>Commodity</label>
            <select style={INP} value={form.commodity} onChange={e => set("commodity", e.target.value)}>
              {(meta?.commodities || ["Onion", "Tomato"]).map(c => <option key={c}>{c}</option>)}
            </select></div>
          <div><label style={LBL}>Month</label>
            <select style={INP} value={form.month} onChange={e => set("month", e.target.value)}>
              {(meta?.month_names || []).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select></div>
        </div>
        {error && <div style={{ color: "var(--danger)", fontSize: "12px", marginBottom: "8px" }}>{error}</div>}
        <button type="submit" style={{ ...BTN, display: "flex", alignItems: "center", gap: "6px" }} disabled={loading}>
          {loading ? <><Spin /> Finding…</> : "🔍 Find Markets"}
        </button>
      </form>
      {result?.recommendations && (
        <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {result.recommendations.slice(0, 5).map(m => (
            <div key={m.market} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", background: "var(--bg-l)", borderRadius: "9px", border: "1px solid var(--bd)" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: m.rank === 1 ? "var(--cp)" : "var(--bg)", color: m.rank === 1 ? "var(--bg)" : "var(--tx-m)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, border: "1px solid var(--bd)" }}>{m.rank}</div>
              <div style={{ flex: 1, fontSize: "12px" }}>
                <div style={{ fontWeight: 700, color: "var(--tx)" }}>{m.market}</div>
                <div style={{ color: "var(--tx-s)", fontSize: "11px" }}>{m.district}</div>
              </div>
              <div style={{ fontWeight: 800, fontSize: "14px", color: m.rank === 1 ? "var(--cp)" : "var(--tx)", fontFamily: "var(--fd)" }}>₹{m.predicted_price?.toLocaleString("en-IN")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
// Change #5: "ML Predict" → "Price Tools"
const TABS = [
  { icon: "📈", label: "Trend" },
  { icon: "📊", label: "Compare" },
  { icon: "🗓", label: "Heatmap" },
  { icon: "🧰", label: "Price Tools" },
];

export default function FarmerMarketIntelligencePage() {
  const { t } = useTranslation();
  const [cities,          setCities]          = useState([]);
  const [commodities,     setCommodities]     = useState([]);
  const [syncStatus,      setSyncStatus]      = useState(null);
  const [selectedCities,  setSelectedCities]  = useState([]);
  const [commodity,       setCommodity]       = useState("");
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 60); return d.toISOString().split("T")[0]; });
  const [endDate,   setEndDate]   = useState(new Date().toISOString().split("T")[0]);
  const [trendData,   setTrendData]   = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [heatData,    setHeatData]    = useState(null);
  const [heatCity,    setHeatCity]    = useState("");
  const [mlMeta,      setMlMeta]      = useState(null);
  const [activeTab,   setActiveTab]   = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [syncing,     setSyncing]     = useState(false);
  const [toast,       setToast]       = useState("");

  // ARIMA state
  const [arimaLoading,  setArimaLoading]  = useState(false);
  const [arimaData,     setArimaData]     = useState(null);  // { city, commodity, forecast, actual_context }
  const [arimaDays,     setArimaDays]     = useState(7);
  const [arimaCity,     setArimaCity]     = useState("");
  const [arimaCommodity,setArimaCommodity]= useState("");
  const [arimaError,    setArimaError]    = useState("");
  const [showCitiesPanel, setShowCitiesPanel] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  useEffect(() => {
    marketAPI.cities().then(({ data }) => {
      setCities(data);
      const defaults = data.slice(0, 3);
      setSelectedCities(defaults);
      if (defaults.length) { setHeatCity(defaults[0]); setArimaCity(defaults[0]); }
    }).catch(() => {});
    marketAPI.commodities().then(({ data }) => {
      setCommodities(data);
      if (data[0]) { setCommodity(data[0]); setArimaCommodity(data[0]); }
    }).catch(() => {});
    marketAPI.syncStatus().then(({ data }) => setSyncStatus(data)).catch(() => {});
    mlAPI.metadata().then(({ data }) => setMlMeta(data)).catch(() => {});
  }, []);

  const fetchTrend = useCallback(() => {
    if (!selectedCities.length || !commodity) return;
    setLoading(true);
    marketAPI.trend({ cities: selectedCities.join(","), commodity, start: startDate, end: endDate })
      .then(({ data }) => setTrendData(data))
      .catch(() => setTrendData(null))
      .finally(() => setLoading(false));
  }, [selectedCities, commodity, startDate, endDate]);

  const fetchCompare = useCallback(() => {
    if (!selectedCities.length) return;
    marketAPI.compare({ cities: selectedCities.join(","), commodity, start: startDate, end: endDate })
      .then(({ data }) => setCompareData(data.data))
      .catch(() => setCompareData(null));
  }, [selectedCities, commodity, startDate, endDate]);

  const fetchHeatmap = useCallback(() => {
    if (!heatCity) return;
    marketAPI.heatmap({ city: heatCity, start: startDate, end: endDate })
      .then(({ data }) => setHeatData(data))
      .catch(() => setHeatData(null));
  }, [heatCity, startDate, endDate]);

  useEffect(() => {
    if (activeTab === 0) fetchTrend();
    if (activeTab === 1) fetchCompare();
    if (activeTab === 2) fetchHeatmap();
  }, [activeTab, fetchTrend, fetchCompare, fetchHeatmap]);

  // Change #1: Sync Now → after sync, reload data
  const handleSync = async () => {
    setSyncing(true);
    try {
      await marketAPI.refresh({ start: startDate, end: endDate });
      showToast("🔄 Sync started — reloading data shortly…");
      setTimeout(() => {
        marketAPI.syncStatus().then(({ data }) => setSyncStatus(data)).catch(() => {});
        if (activeTab === 0) fetchTrend();
        if (activeTab === 1) fetchCompare();
        if (activeTab === 2) fetchHeatmap();
      }, 4000);
    } catch { showToast("⚠ Sync failed — check backend."); }
    finally { setSyncing(false); }
  };

  const toggleCity = (city) =>
    setSelectedCities(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]);

  const lineSeries = trendData?.series
    ? Object.entries(trendData.series).map(([city, pts], i) => ({
        label: city, color: PALETTE[i % PALETTE.length], points: pts,
      }))
    : [];

  // ARIMA forecast
  const handleArimaForecast = async () => {
    // Use the first selected city from the trend sidebar (most recently applied)
    const city = selectedCities[0] || "";
    const comm = commodity || "";
    if (!city || !comm) { setArimaError("Select a market and commodity from the sidebar first."); return; }
    setArimaLoading(true); setArimaError(""); setArimaData(null);
    try {
      const { data } = await marketAPI.arimaForecast({ city, commodity: comm, days: arimaDays });
      setArimaData(data);
    } catch (err) {
      setArimaError(err.response?.data?.error || "Forecast failed.");
    } finally { setArimaLoading(false); }
  };

  // Build forecast chart series
  const arimaChartActual = arimaData?.actual_context
    ? [{ label: arimaData.city, color: PALETTE[0], points: arimaData.actual_context }]
    : [];
  const arimaChartForecast = arimaData?.forecast
    ? [{ label: arimaData.city, color: PALETTE[0], points: arimaData.forecast }]
    : [];

  const todayFmt    = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const tomorrowFmt = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); })();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      {toast && (
        <div className="fixed bottom-5 right-5 z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-900 dark:text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="animate-[fadeup_0.4s_ease-out] mb-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
              📊 {t('mi.title', 'Market Intelligence')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('mi.subtitle', 'Live APMC price data · Maharashtra · Auto-updated daily')}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {syncStatus?.newest && (
              <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
                {t('mi.latest_date', 'Latest:')} {syncStatus.newest}
              </div>
            )}
            <button onClick={handleSync} disabled={syncing}
              className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 font-bold text-sm cursor-pointer flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
              {syncing ? <><Spin /> Syncing…</> : `🔄 ${t('mi.sync_now', 'Sync Now')}`}
            </button>
          </div>
        </div>
      </div>

      {/* Market Overview & Crop Cards */}
      {syncStatus && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{t('mi.market_overview', 'Market Overview')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label={t('mi.latest_date', 'Latest Date')} value={syncStatus.newest || "—"} sub={syncStatus.oldest ? `from ${syncStatus.oldest}` : ""} color="#16a34a" />
            <StatCard label={t('mi.cities_tracked', 'Cities Tracked')} value={cities.length || "—"} color="#16a34a" />
            <StatCard label={t('mi.commodities', 'Commodities')} value={commodities.length || "—"} color="#16a34a" />
            <StatCard label="Live APMC Data" value="Active" color="#16a34a" />
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "248px 1fr", gap: "16px", alignItems: "start" }}>

        {/* SIDEBAR */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={CARD}>
            <div style={{ ...LBL, marginBottom: "8px" }}>
              Markets / Cities
              {selectedCities.length > 0 && <span style={{ color: "var(--cp)", marginLeft: "6px", fontWeight: 700, fontSize: "10px" }}>({selectedCities.length})</span>}
            </div>
            <CitySearchSelect cities={cities} selectedCities={selectedCities} onToggle={toggleCity} />
          </div>

          <div style={CARD}>
            <label style={LBL}>Commodity</label>
            <select style={INP} value={commodity} onChange={e => setCommodity(e.target.value)}>
              <option value="">— All —</option>
              {commodities.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div style={CARD}>
            <label style={LBL}>Date Range</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div><div style={{ ...LBL, marginBottom: "3px" }}>From</div><input type="date" style={INP} value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
              <div><div style={{ ...LBL, marginBottom: "3px" }}>To</div><input type="date" style={INP} value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            </div>
            <div style={{ marginTop: "8px", padding: "8px 10px", background: "rgba(43,69,112,.06)", border: "1px solid rgba(43,69,112,.15)", borderRadius: "8px", fontSize: "11px", lineHeight: 1.7 }}>
              <span style={{ color: "#2B4570", fontWeight: 700 }}>● Today:</span>
              <span style={{ color: "var(--tx-m)", marginLeft: "4px" }}>{todayFmt}</span><br />
              <span style={{ color: "#B4741E", fontWeight: 700 }}>● Tomorrow:</span>
              <span style={{ color: "var(--tx-m)", marginLeft: "4px" }}>{tomorrowFmt}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "10px" }}>
              {[{ label: "7d", d: 7 }, { label: "30d", d: 30 }, { label: "90d", d: 90 }, { label: "1yr", d: 365 }].map(({ label, d }) => (
                <button key={label} onClick={() => {
                  const end = new Date(), start = new Date(); start.setDate(end.getDate() - d);
                  setStartDate(start.toISOString().split("T")[0]); setEndDate(end.toISOString().split("T")[0]);
                }} style={{ ...SECONDARY_BTN, padding: "4px 10px", fontSize: "11px" }}>{label}</button>
              ))}
            </div>
            <button onClick={() => {
              if (activeTab === 0) fetchTrend();
              if (activeTab === 1) fetchCompare();
              if (activeTab === 2) fetchHeatmap();
            }} style={{ ...BTN, width: "100%", marginTop: "10px", justifyContent: "center", display: "flex", alignItems: "center", gap: "6px" }}>
              {loading ? <><Spin /> Loading…</> : "Apply →"}
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ minWidth: 0 }}>
          {/* Tabs */}
          <div style={{ display: "flex", marginBottom: "18px", borderBottom: "2px solid var(--bd)" }}>
            {TABS.map((tab, i) => (
              <button key={i} onClick={() => setActiveTab(i)} style={{
                background: "transparent", border: "none",
                borderBottom: activeTab === i ? "3px solid var(--cp)" : "3px solid transparent",
                marginBottom: "-2px", padding: "8px 18px", cursor: "pointer",
                fontFamily: "var(--fd)", fontWeight: activeTab === i ? 700 : 500,
                fontSize: "13px", color: activeTab === i ? "var(--cp)" : "var(--tx-m)",
                display: "flex", alignItems: "center", gap: "5px", transition: "all .18s", whiteSpace: "nowrap",
              }}>{tab.icon} {tab.label}</button>
            ))}
          </div>

          {/* TAB 0: Unified Trend + ARIMA chart, plus ARIMA side panel */}
          {activeTab === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

              {/* ── Single unified chart card ── */}
              <div style={CARD}>
                {/* Chart header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "15px", color: "var(--tx)" }}>
                      Price Trend — {commodity || "All Commodities"}
                    </div>
                  </div>
                  {(loading || arimaLoading) && <Spin />}
                </div>

                {/* The single chart — passes both actual + forecast series together */}
                {lineSeries.length > 0 || arimaChartActual.length > 0
                  ? <LineChart series={lineSeries} forecastSeries={arimaChartForecast} />
                  : <div style={{ padding: "40px", textAlign: "center", color: "var(--tx-s)", fontSize: "13px" }}>
                      {loading ? "Loading…" : "Select cities and click Apply to view trend."}
                    </div>}
              </div>

              {/* ── ARIMA controls + side panel ── */}
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl p-6 shadow-sm">
                {/* Section header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
                    <span className="text-xl">📈</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                      {t('mi.forecast_title', 'AI Price Forecast')}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {t('mi.forecast_desc', 'Forecast overlays directly onto the chart above. Select city, crop & horizon.')}
                    </p>
                  </div>
                </div>

                {/* Controls row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 mb-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {t('mi.using', 'Configured:')}{' '}
                    <span className="font-semibold text-gray-800 dark:text-white">{selectedCities[0] || '—'}</span>
                    {' · '}
                    <span className="font-semibold text-gray-800 dark:text-white">{commodity || '—'}</span>
                    <span className="text-[10px] text-gray-400 block sm:inline sm:ml-2">({t('mi.from_sidebar', 'from sidebar')})</span>
                  </div>
                  
                  <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('mi.horizon', 'Horizon')}</span>
                      <div className="flex bg-white dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                        {[7, 30].map(d => (
                          <button
                            key={d}
                            onClick={() => setArimaDays(d)}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                              arimaDays === d
                                ? 'bg-green-600 text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                            }`}
                          >
                            {d}d
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <button
                      onClick={handleArimaForecast}
                      disabled={arimaLoading}
                      className="w-full sm:w-auto px-5 py-2 flex items-center justify-center gap-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-sans"
                    >
                      {arimaLoading ? (
                        <>
                          <Spin /> {t('mi.forecasting', 'Forecasting...')}
                        </>
                      ) : (
                        <>🔮 {t('mi.run_forecast', 'Run Forecast')}</>
                      )}
                    </button>
                  </div>
                </div>

                {arimaError && (
                  <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
                    ⚠️ {arimaError}
                  </div>
                )}

                {/* ── Side panel: per-day values (shown after forecast runs) ── */}
                {arimaData ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700/50 pb-2">
                      <span className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        📅 {arimaDays}-Day Daily Forecast — {arimaData.city} · {arimaData.commodity}
                      </span>
                    </div>

                    {/* Summary stats grid */}
                    {(() => {
                      const prices = arimaData.forecast.map(p => p.price);
                      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
                      const delta = prices[prices.length - 1] - prices[0];
                      const peak = Math.max(...arimaData.forecast.map(p => p.max_price));
                      const trough = Math.min(...arimaData.forecast.map(p => p.min_price));
                      
                      return (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            {
                              label: t('mi.avg_price', 'Avg Price'),
                              val: `₹${Math.round(avg).toLocaleString('en-IN')}`,
                              colorClass: 'text-purple-600 dark:text-purple-400',
                              bgClass: 'bg-purple-50/50 dark:bg-purple-950/10 border-purple-100 dark:border-purple-900/30'
                            },
                            {
                              label: t('mi.forecast_trend', 'Forecasted Trend'),
                              val: `${delta >= 0 ? '▲' : '▼'} ₹${Math.abs(Math.round(delta)).toLocaleString('en-IN')}`,
                              colorClass: delta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                              bgClass: delta >= 0 
                                ? 'bg-green-50/50 dark:bg-green-950/10 border-green-100 dark:border-green-900/30' 
                                : 'bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-900/30'
                            },
                            {
                              label: t('mi.peak_max', 'Peak (Max)'),
                              val: `₹${Math.round(peak).toLocaleString('en-IN')}`,
                              colorClass: 'text-amber-600 dark:text-amber-400',
                              bgClass: 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30'
                            },
                            {
                              label: t('mi.floor_min', 'Floor (Min)'),
                              val: `₹${Math.round(trough).toLocaleString('en-IN')}`,
                              colorClass: 'text-blue-600 dark:text-blue-400',
                              bgClass: 'bg-blue-50/50 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/30'
                            }
                          ].map(({ label, val, colorClass, bgClass }) => (
                            <div key={label} className={`p-4 rounded-xl border text-center transition-all ${bgClass}`}>
                              <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{label}</div>
                              <div className={`text-xl font-black ${colorClass} tracking-tight`}>{val}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Daily horizontal cards */}
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                      {arimaData.forecast.map((pt, i) => {
                        const prevPrice = i === 0 ? arimaData.last_actual_price : arimaData.forecast[i - 1].price;
                        const change = pt.price - prevPrice;
                        const isUp = change >= 0;
                        return (
                          <div
                            key={i}
                            className={`min-w-[110px] flex-shrink-0 bg-white dark:bg-gray-800 border rounded-xl p-3 text-center transition-all hover:scale-105 duration-200 ${
                              isUp 
                                ? 'border-t-4 border-t-green-500 border-gray-200 dark:border-gray-700' 
                                : 'border-t-4 border-t-red-500 border-red-100 dark:border-red-900/50 bg-red-50/10 dark:bg-red-950/5'
                            }`}
                          >
                            <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                              Day {i + 1}
                              <span className="block text-[8px] font-normal text-gray-400 dark:text-gray-500 mt-0.5">{pt.date.slice(5)}</span>
                            </div>
                            
                            <div className="font-extrabold text-sm text-gray-950 dark:text-white mb-1">
                              ₹{pt.price.toLocaleString('en-IN')}
                            </div>
                            
                            <div className={`text-[10px] font-bold mb-3 flex items-center justify-center gap-0.5 ${
                              isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {isUp ? '▲' : '▼'} ₹{Math.abs(Math.round(change)).toLocaleString('en-IN')}
                            </div>
                            
                            <div className="text-[9px] text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700/50 pt-2 space-y-0.5">
                              <div className="flex justify-between gap-1">
                                <span className="text-[8px] text-gray-400">H:</span>
                                <span className="font-medium text-gray-700 dark:text-gray-300">₹{Math.round(pt.max_price).toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between gap-1">
                                <span className="text-[8px] text-gray-400">L:</span>
                                <span className="font-medium text-gray-700 dark:text-gray-300">₹{Math.round(pt.min_price).toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  !arimaLoading && (
                    <div className="p-8 text-center bg-gray-50 dark:bg-gray-900/20 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                      <span className="text-2xl mb-2 block">🔮</span>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        {t('mi.no_forecast', 'No forecast runs active')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('mi.no_forecast_sub', 'Select a city & commodity, choose horizon, and click Run Forecast to overlay predictions.')}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* TAB 1: Compare */}
          {activeTab === 1 && (
            <div style={CARD}>
              <div style={{ fontWeight: 800, fontSize: "15px", color: "var(--tx)", marginBottom: "4px" }}>City Price Comparison</div>
              <div style={{ fontSize: "11px", color: "var(--tx-m)", marginBottom: "16px" }}>Average modal price per market · {commodity || "all commodities"}</div>
              {compareData?.length > 0 ? (
                <>
                  <BarChart data={compareData} valueKey="avg_modal" labelKey="market" color="var(--cp)" />
                  <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {compareData.map((d, i) => (
                      <div key={d.market} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", background: "var(--bg-l)", borderRadius: "9px", border: "1px solid var(--bd)" }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: i === 0 ? "var(--cp)" : "var(--bg)", color: i === 0 ? "var(--bg)" : "var(--tx-s)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, border: "1px solid var(--bd)" }}>{i + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--tx)" }}>{d.market}</div>
                          <div style={{ fontSize: "11px", color: "var(--tx-s)" }}>Min ₹{Number(d.min_price).toLocaleString("en-IN")} · Max ₹{Number(d.max_price).toLocaleString("en-IN")}</div>
                        </div>
                        <div style={{ fontWeight: 900, fontFamily: "var(--fd)", fontSize: "16px", color: i === 0 ? "var(--cp)" : "var(--tx)" }}>₹{Number(d.avg_modal).toLocaleString("en-IN")}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--tx-s)", fontSize: "13px" }}>{loading ? "Loading…" : "Select cities and click Apply."}</div>
              )}
            </div>
          )}

          {/* TAB 2: Heatmap */}
          {activeTab === 2 && (
            <div style={CARD}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: "15px", color: "var(--tx)" }}>Price Heatmap</div>
                  <div style={{ fontSize: "11px", color: "var(--tx-m)" }}>Date × Commodity matrix for selected city</div>
                </div>
                <div>
                  <label style={LBL}>City</label>
                  <select style={{ ...INP, width: "160px" }} value={heatCity} onChange={e => setHeatCity(e.target.value)}>
                    {cities.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {heatData
                ? <HeatmapGrid matrix={heatData.matrix} dates={heatData.dates} commodities={heatData.commodities} />
                : <div style={{ padding: "40px", textAlign: "center", color: "var(--tx-s)", fontSize: "13px" }}>Select a city and click Apply.</div>}
            </div>
          )}

          {/* TAB 3: Price Tools (was ML Predict) */}
          {activeTab === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ padding: "12px 14px", background: "rgba(124,58,237,.06)", border: "1px solid rgba(124,58,237,.15)", borderRadius: "10px", fontSize: "12px", color: "var(--tx-m)" }}>
                <strong style={{ color: "var(--tx)" }}>ℹ️ About these tools:</strong> ML-based price prediction using XGBoost/Random Forest. Compare estimates against live APMC trends in the Trend tab.
              </div>
              <QuickPricePredict meta={mlMeta} />
              <QuickMarketRec    meta={mlMeta} />
            </div>
          )}

        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}