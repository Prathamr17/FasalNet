// pages/DiscoverPage.js — v11: Fully localized & integrated with i18n
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { farmerAPI, mlAPI } from "../services/api";
import StorageMap   from "../components/map/StorageMap";
import StorageList  from "../components/map/StorageList";
import BookingModal from "../components/booking/BookingModal";

const DEMO_STORAGES = [
  { id:1,  name:"GreenGrain Cold Store",  address:"Kagal Road",          district:"Kolhapur",  state:"Maharashtra",   lat:16.705, lon:74.243, total_capacity_kg:50000,  available_capacity_kg:22000, price_per_kg_per_day:1.80, temp_min_celsius:2, temp_max_celsius:8,  status:"available" },
  { id:2,  name:"AgroKool Facility",      address:"Hatkanangle",         district:"Kolhapur",  state:"Maharashtra",   lat:16.695, lon:74.265, total_capacity_kg:80000,  available_capacity_kg:45000, price_per_kg_per_day:2.10, temp_min_celsius:3, temp_max_celsius:10, status:"available" },
  { id:3,  name:"Sahyadri Cold Hub",      address:"Jaysingpur",          district:"Kolhapur",  state:"Maharashtra",   lat:16.720, lon:74.220, total_capacity_kg:30000,  available_capacity_kg:5000,  price_per_kg_per_day:1.50, temp_min_celsius:2, temp_max_celsius:8,  status:"available" },
  { id:4,  name:"FreshChain Storage",     address:"Ichalkaranji",        district:"Kolhapur",  state:"Maharashtra",   lat:16.680, lon:74.290, total_capacity_kg:60000,  available_capacity_kg:38000, price_per_kg_per_day:2.50, temp_min_celsius:1, temp_max_celsius:6,  status:"available" },
  { id:5,  name:"Vaibhav Cold Warehouse", address:"Karveer",             district:"Kolhapur",  state:"Maharashtra",   lat:16.740, lon:74.200, total_capacity_kg:40000,  available_capacity_kg:15000, price_per_kg_per_day:1.90, temp_min_celsius:2, temp_max_celsius:8,  status:"available" },
  { id:6,  name:"Nashik AgroCold Hub",    address:"Mumbai-Agra Hwy",     district:"Nashik",    state:"Maharashtra",   lat:20.011, lon:73.790, total_capacity_kg:70000,  available_capacity_kg:42000, price_per_kg_per_day:1.70, temp_min_celsius:2, temp_max_celsius:8,  status:"available" },
  { id:7,  name:"Pune FreshStore",        address:"Hadapsar",            district:"Pune",      state:"Maharashtra",   lat:18.502, lon:73.927, total_capacity_kg:55000,  available_capacity_kg:31000, price_per_kg_per_day:2.20, temp_min_celsius:1, temp_max_celsius:7,  status:"available" },
  { id:8,  name:"Bangalore AgroFreeze",   address:"Yelahanka",           district:"Bengaluru", state:"Karnataka",     lat:13.100, lon:77.593, total_capacity_kg:90000,  available_capacity_kg:60000, price_per_kg_per_day:2.50, temp_min_celsius:1, temp_max_celsius:6,  status:"available" },
  { id:9,  name:"Ahmedabad AgroCold",     address:"Naroda GIDC",         district:"Ahmedabad", state:"Gujarat",       lat:23.073, lon:72.678, total_capacity_kg:100000, available_capacity_kg:75000, price_per_kg_per_day:1.60, temp_min_celsius:2, temp_max_celsius:8,  status:"available" },
  { id:10, name:"Jaipur AgroKool",        address:"Sitapura Industrial",  district:"Jaipur",   state:"Rajasthan",     lat:26.793, lon:75.853, total_capacity_kg:60000,  available_capacity_kg:35000, price_per_kg_per_day:1.70, temp_min_celsius:2, temp_max_celsius:10, status:"available" },
  { id:11, name:"Lucknow AgroFreeze",     address:"Amausi",              district:"Lucknow",   state:"Uttar Pradesh", lat:26.763, lon:80.886, total_capacity_kg:90000,  available_capacity_kg:65000, price_per_kg_per_day:1.50, temp_min_celsius:1, temp_max_celsius:7,  status:"available" },
  { id:12, name:"Ludhiana AgroCold",      address:"Focal Point",         district:"Ludhiana",  state:"Punjab",        lat:30.910, lon:75.857, total_capacity_kg:100000, available_capacity_kg:72000, price_per_kg_per_day:1.55, temp_min_celsius:1, temp_max_celsius:6,  status:"available" },
  { id:13, name:"Chennai AgroCold",       address:"Ambattur",            district:"Chennai",   state:"Tamil Nadu",    lat:13.113, lon:80.155, total_capacity_kg:95000,  available_capacity_kg:68000, price_per_kg_per_day:2.20, temp_min_celsius:1, temp_max_celsius:7,  status:"available" },
  { id:14, name:"Hyderabad Cold Hub",     address:"Patancheru",          district:"Hyderabad", state:"Telangana",     lat:17.527, lon:78.264, total_capacity_kg:100000, available_capacity_kg:72000, price_per_kg_per_day:2.10, temp_min_celsius:1, temp_max_celsius:7,  status:"available" },
  { id:15, name:"Kolkata AgroCold",       address:"Dankuni",             district:"Howrah",    state:"West Bengal",   lat:22.680, lon:88.299, total_capacity_kg:100000, available_capacity_kg:72000, price_per_kg_per_day:1.80, temp_min_celsius:1, temp_max_celsius:7,  status:"available" },
];

const INDIA_STATES = [
  "Andhra Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra",
  "Manipur","Meghalaya","Odisha","Punjab","Rajasthan","Tamil Nadu","Telangana",
  "Uttar Pradesh","Uttarakhand","West Bengal"
];

const CROPS = [
  "tomato","leafy greens","onion","potato","mango","banana","grapes","cauliflower",
  "rice","wheat","maize","spinach","beans","broccoli","carrot","cabbage","corn",
  "chilli","sweetpotato","pumpkin","cucumber"
];

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function RiskBadge({ level }) {
  const { t } = useTranslation();
  const RISK_CFG = {
    CRITICAL: { color: "#8B3A2B", bg: "rgba(139,58,43,.08)", border: "rgba(139,58,43,.3)", icon: "🚨", label: t("risk.critical") },
    RISKY:    { color: "#B4741E", bg: "rgba(180,116,30,.08)", border: "rgba(180,116,30,.3)", icon: "⚠️", label: t("risk.risky") },
    SAFE:     { color: "#3F6B33", bg: "rgba(63,107,51,.08)", border: "rgba(63,107,51,.3)", icon: "✅", label: t("risk.safe") }
  };
  const c = RISK_CFG[level] || RISK_CFG.SAFE;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
      padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700
    }}>
      {c.icon} {c.label}
    </span>
  );
}

function SpoilageRiskPanel({ onRiskResult, spoilageMeta }) {
  const { t } = useTranslation();
  const vehicles = (spoilageMeta?.vehicle_types) || ["refrigerated", "covered", "open"];
  const cropList = (spoilageMeta?.crop_types) || CROPS;
  const [form, setForm] = useState({
    crop_type: "tomato", harvest_age_hrs: "48", distance_km: "20",
    ambient_temp_c: "28", humidity_pct: "65", travel_time_hrs: "2",
    season_month: String(new Date().getMonth() + 1), vehicle_type: "covered"
  });
  const [loading, setLoad] = useState(false);
  const [result, setRes] = useState(null);
  const [error, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inp = {
    width: "100%", background: "var(--bg-l)", border: "1px solid var(--bd)",
    color: "var(--tx)", fontFamily: "var(--fb)", fontSize: "12px",
    padding: "7px 10px", borderRadius: "8px", outline: "none", boxSizing: "border-box"
  };
  const lbl = {
    fontSize: "10px", fontWeight: 700, color: "var(--tx-m)",
    textTransform: "uppercase", letterSpacing: ".6px", display: "block", marginBottom: 3
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoad(true); setErr(""); setRes(null);
    const payload = {
      ...form,
      harvest_age_hrs: parseFloat(form.harvest_age_hrs),
      distance_km: parseFloat(form.distance_km),
      ambient_temp_c: parseFloat(form.ambient_temp_c),
      humidity_pct: parseFloat(form.humidity_pct),
      travel_time_hrs: parseFloat(form.travel_time_hrs),
      season_month: parseInt(form.season_month)
    };
    try {
      const { data } = await mlAPI.spoilage(payload);
      setRes(data);
      onRiskResult?.({ ...data, crop_type: form.crop_type, distance_km: parseFloat(form.distance_km) });
    } catch {
      const age = parseFloat(form.harvest_age_hrs) / 24;
      const temp = parseFloat(form.ambient_temp_c);
      const score = Math.min(100, Math.round(age * 7 + Math.max(0, temp - 25) * 2));
      const risk_level = score >= 70 ? "CRITICAL" : score >= 35 ? "RISKY" : "SAFE";
      const fb = {
        risk_level, risk_score: score, confidence_pct: 65, model_used: "rules",
        recommendations: [
          risk_level === "CRITICAL"
            ? `⚠️ Urgent: Book cold storage immediately for ${form.crop_type}.`
            : risk_level === "RISKY"
            ? "Book cold storage within 2 days."
            : "Produce is safe — compare rates.",
          temp > 28 ? "Pre-cool before transport." : "Maintain cool conditions."
        ],
        crop_type: form.crop_type, distance_km: parseFloat(form.distance_km)
      };
      setRes(fb);
      onRiskResult?.(fb);
    } finally {
      setLoad(false);
    }
  };

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: "var(--cp-pale)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0
        }}>🌿</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--tx)" }}>{t("farmer.title")}</div>
          <div style={{ fontSize: 11, color: "var(--tx-m)" }}>{t("farmer.risk_sub")}</div>
        </div>
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
          <div>
            <label style={lbl}>{t("farmer.crop_type")}</label>
            <select style={inp} value={form.crop_type} onChange={e => set("crop_type", e.target.value)}>
              {cropList.map(c => <option key={c} value={c}>{c.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>{t("farmer.harvest_age")}</label>
            <input type="number" style={inp} min="1" max="5000" value={form.harvest_age_hrs} onChange={e => set("harvest_age_hrs", e.target.value)} />
          </div>
          <div>
            <label style={lbl}>{t("farmer.distance")}</label>
            <input type="number" style={inp} min="0" max="500" value={form.distance_km} onChange={e => set("distance_km", e.target.value)} />
          </div>
          <div>
            <label style={lbl}>{t("farmer.travel_time")}</label>
            <input type="number" style={inp} min="0" max="48" step="0.5" value={form.travel_time_hrs} onChange={e => set("travel_time_hrs", e.target.value)} />
          </div>
          <div>
            <label style={lbl}>{t("farmer.ambient_temp")}</label>
            <input type="number" style={inp} min="5" max="50" value={form.ambient_temp_c} onChange={e => set("ambient_temp_c", e.target.value)} />
          </div>
          <div>
            <label style={lbl}>{t("farmer.vehicle_type")}</label>
            <select style={inp} value={form.vehicle_type} onChange={e => set("vehicle_type", e.target.value)}>
              {vehicles.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
            </select>
          </div>
        </div>
        {error && <div style={{ padding: "7px 10px", background: "rgba(139,58,43,.08)", borderRadius: 8, fontSize: 12, color: "#8B3A2B" }}>{error}</div>}
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", padding: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {loading ? <><span className="aspin" style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff" }} /> {t("farmer.analysing")}</> : t("farmer.run_risk_btn")}
        </button>
      </form>
      {result && (() => {
        const RISK_CFG = {
          CRITICAL: { color: "#8B3A2B", bg: "rgba(139,58,43,.08)", border: "rgba(139,58,43,.3)", icon: "🚨", label: t("risk.critical") },
          RISKY:    { color: "#B4741E", bg: "rgba(180,116,30,.08)", border: "rgba(180,116,30,.3)", icon: "⚠️", label: t("risk.risky") },
          SAFE:     { color: "#3F6B33", bg: "rgba(63,107,51,.08)", border: "rgba(63,107,51,.3)", icon: "✅", label: t("risk.safe") }
        };
        const c = RISK_CFG[result.risk_level] || RISK_CFG.SAFE;
        return (
          <div className="anim-fadeup" style={{ marginTop: 12, padding: "12px 14px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: "1.4rem" }}>{c.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: c.color }}>{c.label}</div>
                <div style={{ fontSize: 11, color: "var(--tx-m)" }}>{t("farmer.score")}: {Math.round(result.risk_score)}/100 · {t("farmer.confidence")}: {result.confidence_pct}%</div>
              </div>
              {result.risk_level === "CRITICAL" && (
                <div style={{ fontSize: 11, fontWeight: 700, color: c.color, padding: "2px 8px", border: `1px solid ${c.border}`, borderRadius: 20 }}>
                  ⏱ {t("farmer.urgent")}
                </div>
              )}
            </div>
            {result.recommendations?.map((r, i) => (
              <div key={i} style={{ fontSize: 12, color: "var(--tx)", lineHeight: 1.5, padding: "4px 0", borderTop: i > 0 ? "1px solid var(--bd)" : "none" }}>
                {r}
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

export default function DiscoverPage() {
  const { t } = useTranslation();
  const [storages, setStorages] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [bookingTarget, setBookingTarget] = useState(null);
  const [farmerPos, setFarmerPos] = useState([20.5937, 78.9629]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [toast, setToast] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [optimalStorage, setOptimalStorage] = useState(null);
  const [spoilageMeta, setSpoilageMeta] = useState(null);
  const [cityFilter, setCityFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");

  useEffect(() => {
    mlAPI.spoilageMeta().then(({ data }) => setSpoilageMeta(data)).catch(() => {});
  }, []);

  const fetchStorages = useCallback(async (silent = false) => {
    if (!silent) setLoadingStores(true);
    try {
      const { data } = await farmerAPI.listStorages({ status: "available" });
      const f = data.storages || [];
      setStorages(f.length > 0 ? f : DEMO_STORAGES);
      setLastRefresh(new Date());
    } catch {
      setStorages(p => p.length > 0 ? p : DEMO_STORAGES);
    } finally {
      setLoadingStores(false);
    }
  }, []);

  useEffect(() => {
    fetchStorages();
    const iv = setInterval(() => fetchStorages(true), 30000);
    return () => clearInterval(iv);
  }, [fetchStorages]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setFarmerPos([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const handleRiskResult = useCallback((risk) => {
    setRiskData(risk);
    const avail = storages.filter(s => parseFloat(s.available_capacity_kg) > 0 && s.status === "available");
    if (!avail.length) return;
    const withDist = avail.map(s => ({ ...s, distance_km: haversineKm(farmerPos[0], farmerPos[1], parseFloat(s.lat), parseFloat(s.lon)) }));
    let optimal;
    if (risk.risk_level === "CRITICAL" || risk.risk_level === "RISKY") {
      optimal = withDist.sort((a, b) => a.distance_km - b.distance_km)[0];
      showToast(`🚨 ${risk.risk_level} — ${optimal.name}`);
    } else {
      optimal = withDist.sort((a, b) => parseFloat(a.price_per_kg_per_day) - parseFloat(b.price_per_kg_per_day))[0];
      showToast(`✅ ${optimal.name}`);
    }
    setOptimalStorage(optimal);
    setRecommended([optimal, ...withDist.filter(s => s.id !== optimal.id).slice(0, 4)]);
  }, [storages, farmerPos]);

  const baseList = recommended.length ? recommended : storages;
  const filteredDisplay = baseList
    .map(s => ({ ...s, distance_km: haversineKm(farmerPos[0], farmerPos[1], parseFloat(s.lat), parseFloat(s.lon)).toFixed(1) }))
    .filter(s => {
      if (cityFilter && !s.district?.toLowerCase().includes(cityFilter.toLowerCase())) return false;
      if (stateFilter && s.state !== stateFilter) return false;
      return true;
    })
    .sort((a, b) => parseFloat(a.distance_km) - parseFloat(b.distance_km));

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 20px" }}>

      <div style={{ marginBottom: 20 }} className="anim-fadeup">
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--tx)", marginBottom: 4 }}>
          {t("nav.discover")} {t("nav.cold_storage")}
        </h1>
        <p style={{ fontSize: 13, color: "var(--tx-m)" }}>
          {t("farmer.risk_sub")}
        </p>
      </div>

      <div className="anim-fadeup d1" style={{ marginBottom: 16 }}>
        <SpoilageRiskPanel onRiskResult={handleRiskResult} spoilageMeta={spoilageMeta} />
      </div>

      {optimalStorage && riskData && (
        <div className="anim-fadeup" style={{
          marginBottom: 16, padding: "12px 16px",
          background: riskData.risk_level === "SAFE" ? "rgba(63,107,51,.07)" : "rgba(139,58,43,.07)",
          border: `1px solid ${riskData.risk_level === "SAFE" ? "rgba(63,107,51,.25)" : "rgba(139,58,43,.25)"}`,
          borderRadius: 12, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap"
        }}>
          <span style={{ fontSize: "1.5rem" }}>{riskData.risk_level === "SAFE" ? "🏆" : "🚗"}</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "var(--tx)" }}>
              {riskData.risk_level === "SAFE" ? t("farmer.best_value") : t("farmer.nearest")} — {optimalStorage.name}
            </div>
            <div style={{ fontSize: 12, color: "var(--tx-m)", marginTop: 2 }}>
              {optimalStorage.district}, {optimalStorage.state} · {Number(optimalStorage.distance_km).toFixed(1)} km · ₹{parseFloat(optimalStorage.price_per_kg_per_day).toFixed(2)} {t("storage.price_per_kg_day")} · {(parseFloat(optimalStorage.available_capacity_kg) / 1000).toFixed(1)} MT {t("storage.available")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <RiskBadge level={riskData.risk_level} />
            <button onClick={() => setBookingTarget({ ...optimalStorage, riskPrefilled: riskData })}
              style={{
                background: "var(--cp)", color: "var(--bg)", border: "none", borderRadius: 8,
                padding: "8px 16px", fontFamily: "var(--fd)", fontWeight: 800, fontSize: 13,
                cursor: "pointer", boxShadow: "0 3px 12px var(--cp-glow)"
              }}>
              {t("farmer.book_now")}
            </button>
          </div>
        </div>
      )}

      <div className="card anim-fadeup d2" style={{ padding: "10px 14px", marginBottom: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--tx-s)", textTransform: "uppercase", letterSpacing: ".6px", whiteSpace: "nowrap" }}>
          {t("farmer.filter_label")}
        </span>
        <input className="inp" value={cityFilter} onChange={e => setCityFilter(e.target.value)} placeholder={t("farmer.filter_city")} style={{ flex: 1, minWidth: 130, padding: "6px 10px", fontSize: 12 }} />
        <select className="inp" value={stateFilter} onChange={e => setStateFilter(e.target.value)} style={{ padding: "6px 10px", fontSize: 12, minWidth: 130 }}>
          <option value="">{t("farmer.all_states")}</option>
          {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(cityFilter || stateFilter) && (
          <button className="btn btn-ghost" onClick={() => { setCityFilter(""); setStateFilter(""); }} style={{ padding: "6px 12px", fontSize: 12 }}>
            {t("farmer.clear_filter")}
          </button>
        )}
        <span style={{ fontSize: 11, color: "var(--tx-s)", whiteSpace: "nowrap" }}>
          {filteredDisplay.length} {t("farmer.results_count")}
        </span>
        {lastRefresh && (
          <span style={{ fontSize: 10, color: "var(--cp)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--cp)", display: "inline-block", animation: "ping 1.5s ease-in-out infinite" }} />
            {t("farmer.live")} · {lastRefresh.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, alignItems: "start" }}>
        <div className="card anim-fadeup d3" style={{ height: 460, overflow: "hidden", padding: 0 }}>
          <StorageMap storages={filteredDisplay} farmerPos={farmerPos} onSelectStorage={setSelectedStore} onBookStorage={s => setBookingTarget({ ...s, riskPrefilled: riskData })} autoRouteTarget={optimalStorage ? [parseFloat(optimalStorage.lat), parseFloat(optimalStorage.lon)] : null} riskLevel={riskData?.risk_level} />
        </div>
        <div className="card anim-fadeup d4" style={{ maxHeight: 460, overflowY: "auto", padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", color: "var(--tx-m)" }}>
              {recommended.length ? t("farmer.optimal_matches") : t("farmer.nearest_storages")}
            </span>
            {riskData && <RiskBadge level={riskData.risk_level} />}
          </div>
          {loadingStores ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3, 4].map(i => <div key={i} className="skel" style={{ height: 70 }} />)}
            </div>
          ) : (
            <StorageList storages={filteredDisplay} selectedId={selectedStore?.id || optimalStorage?.id} highlightId={optimalStorage?.id} onSelect={setSelectedStore} onBook={s => setBookingTarget({ ...s, riskPrefilled: riskData })} />
          )}
        </div>
      </div>

      {bookingTarget && (
        <BookingModal storage={bookingTarget} riskData={bookingTarget.riskPrefilled || riskData} onClose={() => setBookingTarget(null)} onSuccess={() => { setBookingTarget(null); showToast(t("booking.booking_sent")); }} />
      )}
      {toast && <div className="toast"><span style={{ color: "var(--safe)" }}>✓</span> {toast}</div>}
      <style>{`@keyframes ping{0%{transform:scale(1);opacity:.8}70%{transform:scale(2);opacity:0}100%{transform:scale(1);opacity:0}}`}</style>
    </div>
  );
}
