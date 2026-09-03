// pages/farmer/MLPredictionsPage.js — v11: Fully localized & farmer-friendly ML Advisor
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { mlAPI } from "../../services/api";

const INP = {
  width:"100%", background:"var(--bg-l)", border:"1px solid var(--bd)",
  color:"var(--tx)", fontFamily:"var(--fb)", fontSize:"13px",
  padding:"9px 12px", borderRadius:"10px", outline:"none", boxSizing:"border-box",
};
const LBL = {
  fontSize:"11px", fontWeight:600, color:"var(--tx-m)",
  textTransform:"uppercase", letterSpacing:".6px",
  display:"block", marginBottom:"5px",
};
const BTN_PRIMARY = {
  background:"linear-gradient(135deg,var(--cp),var(--cp-dark))",
  color:"var(--bg)", border:"none", borderRadius:"10px",
  padding:"11px 20px", fontFamily:"var(--fd)", fontWeight:800,
  fontSize:"14px", cursor:"pointer",
  boxShadow:"0 4px 16px var(--cp-glow)",
};
const CARD = {
  background:"var(--bg-m)", borderRadius:"14px",
  padding:"20px", border:"1px solid var(--bd)",
};
const ERR_BOX = {
  background:"rgba(139,58,43,.08)", border:"1px solid rgba(139,58,43,.25)",
  color:"var(--danger)", borderRadius:"10px", padding:"10px 14px",
  fontSize:"13px", marginBottom:"12px",
};

function Spin() {
  return (
    <span style={{
      display:"inline-block", width:16, height:16,
      border:"2px solid rgba(255,255,255,.3)",
      borderTopColor:"#fff", borderRadius:"50%",
      animation:"spin 0.7s linear infinite",
    }} />
  );
}

// ── TOOL 1: Price Prediction ──────────────────────────────────────────────
function PricePrediction({ meta }) {
  const { t } = useTranslation();
  const [form, setForm]     = useState({ state:"Maharashtra", district:"Pune",
    market:"Pune", commodity:"Onion", variety:"Local", grade:"FAQ",
    month:String(new Date().getMonth() + 1) });
  const [loading, setLoad]  = useState(false);
  const [result,  setResult]= useState(null);
  const [error,   setError] = useState("");
  const districts = meta?.districts?.[form.state] || [];
  const set = (k,v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoad(true); setError(""); setResult(null);
    try {
      const { data } = await mlAPI.price(form);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || "Prediction failed. Check model config.");
    } finally { setLoad(false); }
  };

  return (
    <div className="card" style={{ padding:"24px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"20px" }}>
        <span style={{ fontSize:"2rem" }}>💰</span>
        <div>
          <h3 style={{ fontSize:"16px", fontWeight:800, color:"var(--tx)", marginBottom:"2px" }}>
            {t("ml.price_title")}
          </h3>
          <p style={{ fontSize:"12px", color:"var(--tx-m)" }}>
            {t("ml.price_sub")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"14px" }}>
          <div>
            <label style={LBL}>{t("ml.state")}</label>
            <select style={INP} value={form.state}
              onChange={e => { set("state",e.target.value); set("district",""); set("market",""); }}>
              {(meta?.states || ["Maharashtra"]).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>{t("ml.district")}</label>
            <select style={INP} value={form.district}
              onChange={e => { set("district",e.target.value); set("market",e.target.value); }}>
              {(districts.length ? districts : ["Pune","Mumbai","Nashik"]).map(d =>
                <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>{t("ml.commodity")}</label>
            <select style={INP} value={form.commodity} onChange={e => set("commodity",e.target.value)}>
              {(meta?.commodities || ["Onion","Tomato","Potato"]).map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>{t("ml.variety")}</label>
            <select style={INP} value={form.variety} onChange={e => set("variety",e.target.value)}>
              {(meta?.varieties || ["Local","Hybrid","FAQ"]).map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>{t("ml.grade")}</label>
            <select style={INP} value={form.grade} onChange={e => set("grade",e.target.value)}>
              {(meta?.grades || ["FAQ","Grade A","Grade B"]).map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>{t("ml.month")}</label>
            <select style={INP} value={form.month} onChange={e => set("month",e.target.value)}>
              {(meta?.month_names || ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]).map((m,i) =>
                <option key={m} value={i+1}>{m}</option>)}
            </select>
          </div>
        </div>

        {error && <div style={ERR_BOX}>{error}</div>}
        <button type="submit" disabled={loading}
          style={{ ...BTN_PRIMARY, display:"flex", alignItems:"center", gap:"8px" }}>
          {loading ? <><Spin/> {t("ml.predicting")}</> : t("ml.predict_price_btn")}
        </button>
      </form>

      {result && (
        <div className="anim-fadeup" style={{ marginTop:"20px", ...CARD }}>
          <div style={{ textAlign:"center", marginBottom:"12px" }}>
            <div style={{ fontSize:"11px", color:"var(--tx-m)", textTransform:"uppercase",
              letterSpacing:"1px", marginBottom:"6px" }}>{t("ml.expected_price")}</div>
            <div style={{ fontSize:"3rem", fontWeight:900, color:"var(--cp)", fontFamily:"var(--fd)" }}>
              ₹{result.prediction?.toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize:"13px", color:"var(--tx-m)" }}>{t("ml.per_quintal")} (100 kg)</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px" }}>
            {[
              ["Model",    result.model,                                           "🤖"],
              ["R² Score", result.metrics?.R2?.toFixed(4) || "N/A",              "📊"],
              ["MAPE",     result.metrics?.MAPE ? result.metrics.MAPE.toFixed(1)+"%":"N/A","🎯"],
            ].map(([label,val,icon]) => (
              <div key={label} style={{ background:"var(--bg-l)", borderRadius:"10px",
                padding:"10px", textAlign:"center", border:"1px solid var(--bd)" }}>
                <div style={{ fontSize:"1.2rem" }}>{icon}</div>
                <div style={{ fontSize:"10px", color:"var(--tx-s)", marginTop:"2px" }}>{label}</div>
                <div style={{ fontSize:"13px", fontWeight:700, color:"var(--tx)", marginTop:"2px" }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:"14px", padding:"10px 14px",
            background:"rgba(43,69,112,.06)", border:"1px solid rgba(43,69,112,.15)",
            borderRadius:"10px", fontSize:"12px", color:"var(--tx-m)" }}>
            💡 <Link to="/market" style={{ color:"var(--cp)", fontWeight:700, textDecoration:"none" }}>
              {t("nav.market")} → {t("market.title")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TOOL 2: Market Recommendation ────────────────────────────────────────
function MarketRecommendation({ meta }) {
  const { t } = useTranslation();
  const [form, setForm]     = useState({ commodity:"Onion", variety:"Local",
    grade:"FAQ", state:"Maharashtra", month:String(new Date().getMonth() + 1) });
  const [loading, setLoad]  = useState(false);
  const [result,  setResult]= useState(null);
  const [error,   setError] = useState("");
  const set = (k,v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoad(true); setError(""); setResult(null);
    try {
      const { data } = await mlAPI.market(form);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || "Recommendation failed.");
    } finally { setLoad(false); }
  };

  return (
    <div className="card" style={{ padding:"24px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"20px" }}>
        <span style={{ fontSize:"2rem" }}>🗺️</span>
        <div>
          <h3 style={{ fontSize:"16px", fontWeight:800, color:"var(--tx)", marginBottom:"2px" }}>
            {t("ml.market_title")}
          </h3>
          <p style={{ fontSize:"12px", color:"var(--tx-m)" }}>
            {t("ml.market_sub")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"14px" }}>
          <div>
            <label style={LBL}>{t("ml.commodity")}</label>
            <select style={INP} value={form.commodity} onChange={e => set("commodity",e.target.value)}>
              {(meta?.commodities || []).map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>{t("ml.state")}</label>
            <select style={INP} value={form.state} onChange={e => set("state",e.target.value)}>
              {(meta?.states || ["Maharashtra"]).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>{t("ml.variety")}</label>
            <select style={INP} value={form.variety} onChange={e => set("variety",e.target.value)}>
              {(meta?.varieties || ["Local","Hybrid"]).map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>{t("ml.month")}</label>
            <select style={INP} value={form.month} onChange={e => set("month",e.target.value)}>
              {(meta?.month_names || ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]).map((m,i) =>
                <option key={m} value={i+1}>{m}</option>)}
            </select>
          </div>
        </div>

        {error && <div style={ERR_BOX}>{error}</div>}
        <button type="submit" disabled={loading}
          style={{ ...BTN_PRIMARY, display:"flex", alignItems:"center", gap:"8px" }}>
          {loading ? <><Spin/> {t("ml.predicting")}</> : t("ml.find_best_market_btn")}
        </button>
      </form>

      {result && (
        <div className="anim-fadeup" style={{ marginTop:"20px" }}>
          {result.best_market && (
            <div style={{ background:"linear-gradient(135deg,var(--cp),var(--cp-dark))",
              borderRadius:"14px", padding:"20px", textAlign:"center", marginBottom:"14px" }}>
              <div style={{ fontSize:"1.2rem", marginBottom:"4px" }}>🏆 {t("ml.highest_price_market")}</div>
              <div style={{ fontSize:"1.5rem", fontWeight:900, color:"white",
                fontFamily:"var(--fd)", marginBottom:"2px" }}>{result.best_market.market}</div>
              <div style={{ fontSize:"13px", color:"rgba(255,255,255,.8)", marginBottom:"10px" }}>
                {result.best_market.district}, {result.best_market.state}
              </div>
              <div style={{ fontSize:"2.5rem", fontWeight:900, color:"white", fontFamily:"var(--fd)" }}>
                ₹{result.best_market.predicted_price?.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize:"12px", color:"rgba(255,255,255,.7)" }}>{t("ml.per_quintal")}</div>
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            {(result.recommendations || []).map(mkt => (
              <div key={mkt.market} style={{ display:"flex", alignItems:"center",
                gap:"12px", padding:"12px 16px", background:"var(--bg-m)",
                borderRadius:"10px", border:"1px solid var(--bd)" }}>
                <div style={{ width:28, height:28, borderRadius:"50%",
                  background: mkt.rank===1 ? "var(--cp)" : "var(--bg-l)",
                  color: mkt.rank===1 ? "white" : "var(--tx-m)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:"12px", fontWeight:800, flexShrink:0 }}>{mkt.rank}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:"13px", fontWeight:700, color:"var(--tx)" }}>{mkt.market}</div>
                  <div style={{ fontSize:"11px", color:"var(--tx-s)" }}>{mkt.district}, {mkt.state}</div>
                </div>
                <div style={{ fontFamily:"var(--fd)", fontWeight:800,
                  fontSize:"15px", color: mkt.rank===1 ? "var(--cp)" : "var(--tx)" }}>
                  ₹{mkt.predicted_price?.toLocaleString("en-IN")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function MLPredictionsPage() {
  const { t } = useTranslation();
  const [meta,      setMeta]   = useState(null);
  const [metaErr,   setMetaErr]= useState(false);
  const [activeTab, setActive] = useState(0);

  const TABS = [
    { icon:"💰", label: t("ml.tab_price")  },
    { icon:"🗺️", label: t("ml.tab_market") },
  ];

  useEffect(() => {
    mlAPI.metadata()
      .then(({ data }) => setMeta(data))
      .catch(() => setMetaErr(true));
  }, []);

  return (
    <div style={{ maxWidth:"840px", margin:"0 auto", padding:"24px 20px" }}>
      <div className="anim-fadeup" style={{ marginBottom:"24px" }}>
        <h1 style={{ fontSize:"22px", fontWeight:800, color:"var(--tx)", marginBottom:"4px",
          display:"flex", alignItems:"center", gap:"8px" }}>
          🤖 {t("ml.title")}
        </h1>
        <p style={{ fontSize:"13px", color:"var(--tx-m)" }}>
          {t("ml.subtitle")}
        </p>
        <div style={{ display:"flex", gap:"8px", marginTop:"10px", flexWrap:"wrap" }}>
          <Link to="/market" style={{ display:"inline-flex", alignItems:"center", gap:"5px",
            fontSize:"11px", fontWeight:700, color:"var(--cp)", textDecoration:"none",
            background:"var(--cp-pale)", padding:"4px 10px", borderRadius:"20px",
            border:"1px solid var(--cp)" }}>
            📊 {t("nav.market")} → {t("market.title")}
          </Link>
          <Link to="/discover" style={{ display:"inline-flex", alignItems:"center", gap:"5px",
            fontSize:"11px", fontWeight:700, color:"#B4741E", textDecoration:"none",
            background:"rgba(180,116,30,.08)", padding:"4px 10px", borderRadius:"20px",
            border:"1px solid rgba(180,116,30,.3)" }}>
            🌿 {t("nav.discover")} → {t("farmer.title")}
          </Link>
        </div>
      </div>

      {metaErr && (
        <div className="card" style={{ padding:"16px", marginBottom:"20px",
          background:"rgba(139,58,43,.06)", border:"1px solid rgba(139,58,43,.2)" }}>
          <span style={{ color:"var(--danger)", fontSize:"13px" }}>
            ⚠️ Could not load ML metadata. Showing default options.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", gap:"0", marginBottom:"20px",
        borderBottom:"2px solid var(--bd)" }}>
        {TABS.map((tab, i) => (
          <button key={i} onClick={() => setActive(i)} style={{
            background: "transparent",
            border:"none",
            borderBottom: activeTab===i ? "3px solid var(--cp)" : "3px solid transparent",
            marginBottom: "-2px",
            padding:"8px 20px",
            cursor:"pointer", fontFamily:"var(--fd)",
            fontWeight: activeTab===i ? 700 : 500,
            fontSize:"13px",
            color: activeTab===i ? "var(--cp)" : "var(--tx-m)",
            display:"flex", alignItems:"center", gap:"6px", whiteSpace:"nowrap",
            transition:"all .2s",
          }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div key={activeTab}>
        {activeTab === 0 && <PricePrediction      meta={meta} />}
        {activeTab === 1 && <MarketRecommendation meta={meta} />}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
