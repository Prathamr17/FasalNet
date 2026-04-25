// pages/farmer/MLPredictionsPage.jsx  — v10
// Four ML tools: Price Prediction · Price Classification · Market Recommendation · Spoilage Risk
import { useState, useEffect } from "react";
import { mlAPI } from "../../services/api";

// ── Shared styles ───────────────────────────────────────────────────────
const INP = {
  width:"100%", background:"var(--bg-l)", border:"1px solid var(--bd)",
  color:"var(--tx)", fontFamily:"var(--fb)", fontSize:"13px",
  padding:"9px 12px", borderRadius:"10px", outline:"none",
  boxSizing:"border-box",
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
  background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.25)",
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

// ── TOOL 1: Price Prediction ─────────────────────────────────────────────
function PricePrediction({ meta }) {
  const [form, setForm]    = useState({ state:"Maharashtra", district:"Pune",
    market:"Pune", commodity:"Onion", variety:"Local", grade:"FAQ", month:"6" });
  const [loading, setLoad] = useState(false);
  const [result, setResult]= useState(null);
  const [error, setError]  = useState("");
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
            Crop Price Prediction
          </h3>
          <p style={{ fontSize:"12px", color:"var(--tx-m)" }}>
            Predict expected modal market price (₹/Quintal) using XGBoost / Random Forest
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"14px" }}>
          <div>
            <label style={LBL}>State</label>
            <select style={INP} value={form.state}
              onChange={e => { set("state",e.target.value); set("district",""); set("market",""); }}>
              {(meta?.states||["Maharashtra"]).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>District</label>
            <select style={INP} value={form.district}
              onChange={e => { set("district",e.target.value); set("market",e.target.value); }}>
              {(districts.length ? districts : ["Pune","Mumbai","Nashik"]).map(d =>
                <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Commodity / Crop</label>
            <select style={INP} value={form.commodity} onChange={e => set("commodity",e.target.value)}>
              {(meta?.commodities||["Onion","Tomato","Potato"]).map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Variety</label>
            <select style={INP} value={form.variety} onChange={e => set("variety",e.target.value)}>
              {(meta?.varieties||["Local","Hybrid","FAQ"]).map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Grade</label>
            <select style={INP} value={form.grade} onChange={e => set("grade",e.target.value)}>
              {(meta?.grades||["FAQ","Grade A","Grade B"]).map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Month</label>
            <select style={INP} value={form.month} onChange={e => set("month",e.target.value)}>
              {(meta?.month_names||[]).map((m,i) =>
                <option key={m} value={i+1}>{m}</option>)}
            </select>
          </div>
        </div>

        {error && <div style={ERR_BOX}>{error}</div>}
        <button type="submit" disabled={loading} style={{ ...BTN_PRIMARY, display:"flex", alignItems:"center", gap:"8px" }}>
          {loading ? <><Spin/> Predicting…</> : "🔮 Predict Price"}
        </button>
      </form>

      {result && (
        <div className="anim-fadeup" style={{ marginTop:"20px", ...CARD }}>
          <div style={{ textAlign:"center", marginBottom:"12px" }}>
            <div style={{ fontSize:"11px", color:"var(--tx-m)", textTransform:"uppercase",
              letterSpacing:"1px", marginBottom:"6px" }}>Predicted Modal Price</div>
            <div style={{ fontSize:"3rem", fontWeight:900, color:"var(--cp)", fontFamily:"var(--fd)" }}>
              ₹{result.prediction?.toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize:"13px", color:"var(--tx-m)" }}>per Quintal (100 kg)</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px" }}>
            {[
              ["Model",    result.model,                                           "🤖"],
              ["R² Score", result.metrics?.R2?.toFixed(4)||"N/A",                 "📊"],
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
        </div>
      )}
    </div>
  );
}

// ── TOOL 3: Market Recommendation ───────────────────────────────────────
function MarketRecommendation({ meta }) {
  const [form, setForm]    = useState({ commodity:"Onion", variety:"Local",
    grade:"FAQ", state:"Maharashtra", month:"6" });
  const [loading, setLoad] = useState(false);
  const [result, setResult]= useState(null);
  const [error, setError]  = useState("");
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
            Best Market Finder
          </h3>
          <p style={{ fontSize:"12px", color:"var(--tx-m)" }}>
            Find which market offers the highest predicted price for your crop
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"14px" }}>
          <div>
            <label style={LBL}>Commodity</label>
            <select style={INP} value={form.commodity} onChange={e => set("commodity",e.target.value)}>
              {(meta?.commodities||[]).map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>State</label>
            <select style={INP} value={form.state} onChange={e => set("state",e.target.value)}>
              {(meta?.states||["Maharashtra"]).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Variety</label>
            <select style={INP} value={form.variety} onChange={e => set("variety",e.target.value)}>
              {(meta?.varieties||["Local","Hybrid"]).map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Month</label>
            <select style={INP} value={form.month} onChange={e => set("month",e.target.value)}>
              {(meta?.month_names||[]).map((m,i) =>
                <option key={m} value={i+1}>{m}</option>)}
            </select>
          </div>
        </div>

        {error && <div style={ERR_BOX}>{error}</div>}
        <button type="submit" disabled={loading} style={{ ...BTN_PRIMARY, display:"flex", alignItems:"center", gap:"8px" }}>
          {loading ? <><Spin/> Finding Markets…</> : "🔍 Find Best Markets"}
        </button>
      </form>

      {result && (
        <div className="anim-fadeup" style={{ marginTop:"20px" }}>
          {result.best_market && (
            <div style={{ background:"linear-gradient(135deg,var(--cp),var(--cp-dark))",
              borderRadius:"14px", padding:"20px", textAlign:"center", marginBottom:"14px" }}>
              <div style={{ fontSize:"1.2rem", marginBottom:"4px" }}>🏆 Best Market</div>
              <div style={{ fontSize:"1.5rem", fontWeight:900, color:"white",
                fontFamily:"var(--fd)", marginBottom:"2px" }}>{result.best_market.market}</div>
              <div style={{ fontSize:"13px", color:"rgba(255,255,255,.8)", marginBottom:"10px" }}>
                {result.best_market.district}, {result.best_market.state}
              </div>
              <div style={{ fontSize:"2.5rem", fontWeight:900, color:"white", fontFamily:"var(--fd)" }}>
                ₹{result.best_market.predicted_price?.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize:"12px", color:"rgba(255,255,255,.7)" }}>per Quintal</div>
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            {(result.recommendations||[]).map((mkt) => (
              <div key={mkt.market} style={{ display:"flex", alignItems:"center",
                gap:"12px", padding:"12px 16px", background:"var(--bg-m)",
                borderRadius:"10px", border:"1px solid var(--bd)" }}>
                <div style={{ width:"28px", height:"28px", borderRadius:"50%",
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

// ── TOOL 4: Spoilage Risk Predictor ─────────────────────────────────────
const RISK_CFG = {
  CRITICAL: { color:"#DC2626", bg:"rgba(220,38,38,.08)", border:"rgba(220,38,38,.3)",
               icon:"🚨", label:"CRITICAL RISK" },
  RISKY:    { color:"#D97706", bg:"rgba(217,119,6,.08)",  border:"rgba(217,119,6,.3)",
               icon:"⚠️", label:"RISKY" },
  SAFE:     { color:"#16A34A", bg:"rgba(22,163,74,.08)",  border:"rgba(22,163,74,.3)",
               icon:"✅", label:"SAFE" },
};

function ScoreGauge({ score }) {
  const color = score >= 70 ? "#DC2626" : score >= 35 ? "#D97706" : "#16A34A";
  const pct   = Math.min(100, Math.max(0, score));
  return (
    <div style={{ textAlign:"center" }}>
      <svg width="120" height="72" viewBox="0 0 120 72">
        {/* background arc */}
        <path d="M10 70 A50 50 0 0 1 110 70" fill="none" stroke="var(--bd)" strokeWidth="10" strokeLinecap="round"/>
        {/* score arc — 180° total, pct% of it */}
        <path d="M10 70 A50 50 0 0 1 110 70" fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${pct * 1.571} 999`}/>
        <text x="60" y="65" textAnchor="middle" fontSize="20" fontWeight="800"
          fill={color} fontFamily="var(--fd)">{Math.round(score)}</text>
      </svg>
      <div style={{ fontSize:"10px", color:"var(--tx-s)", marginTop:"-4px" }}>Risk Score / 100</div>
    </div>
  );
}

function SpoilagePredictor({ spoilageMeta }) {
  const sm = spoilageMeta || {};
  const cropTypes  = sm.crop_types         || ["potato","onion","tomato","eggplant","leafy_greens"];
  const regions    = sm.regions            || ["maharashtra_1","maharashtra_2","maharashtra_3"];
  const experiences= sm.farmer_experiences || ["novice","moderate","expert"];
  const qualities  = sm.bin_qualities      || ["good","poor","fair"];
  const vehicles   = sm.vehicle_types      || ["refrigerated","covered","open"];

  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun",
                        "Jul","Aug","Sep","Oct","Nov","Dec"];

  const [form, setForm] = useState({
    crop_type:         "potato",
    harvest_age_hrs:   "48",
    distance_km:       "20",
    ambient_temp_c:    "28",
    humidity_pct:      "65",
    rainfall_48h_mm:   "5",
    travel_time_hrs:   "2",
    season_month:      "6",
    region:            "maharashtra_1",
    farmer_experience: "moderate",
    bin_quality:       "good",
    vehicle_type:      "covered",
  });
  const [loading, setLoad] = useState(false);
  const [result, setResult]= useState(null);
  const [error, setError]  = useState("");
  const set = (k,v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoad(true); setError(""); setResult(null);
    try {
      const payload = {
        ...form,
        harvest_age_hrs:  parseFloat(form.harvest_age_hrs),
        distance_km:      parseFloat(form.distance_km),
        ambient_temp_c:   parseFloat(form.ambient_temp_c),
        humidity_pct:     parseFloat(form.humidity_pct),
        rainfall_48h_mm:  parseFloat(form.rainfall_48h_mm),
        travel_time_hrs:  parseFloat(form.travel_time_hrs),
        season_month:     parseInt(form.season_month),
      };
      const { data } = await mlAPI.spoilage(payload);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || "Spoilage prediction failed.");
    } finally { setLoad(false); }
  };

  const cfg = result ? (RISK_CFG[result.risk_level] || RISK_CFG.RISKY) : null;

  return (
    <div className="card" style={{ padding:"24px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"20px" }}>
        <span style={{ fontSize:"2rem" }}>🌿</span>
        <div>
          <h3 style={{ fontSize:"16px", fontWeight:800, color:"var(--tx)", marginBottom:"2px" }}>
            Spoilage Risk Predictor
          </h3>
          <p style={{ fontSize:"12px", color:"var(--tx-m)" }}>
            XGBoost model (81% accuracy) predicts SAFE / RISKY / CRITICAL risk from 12 features
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Row 1: Crop + Hours */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
          <div>
            <label style={LBL}>Crop Type</label>
            <select style={INP} value={form.crop_type} onChange={e => set("crop_type",e.target.value)}>
              {cropTypes.map(c => (
                <option key={c} value={c}>{c.replace("_"," ").replace(/\b\w/g,l=>l.toUpperCase())}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={LBL}>Harvest Age (hours)</label>
            <input type="number" style={INP} min="1" max="5000" step="1"
              value={form.harvest_age_hrs} onChange={e => set("harvest_age_hrs",e.target.value)}
              placeholder="e.g. 48"/>
          </div>
        </div>

        {/* Row 2: Distance + Travel */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
          <div>
            <label style={LBL}>Distance to Market (km)</label>
            <input type="number" style={INP} min="0" max="500" step="0.5"
              value={form.distance_km} onChange={e => set("distance_km",e.target.value)}/>
          </div>
          <div>
            <label style={LBL}>Travel Time (hours)</label>
            <input type="number" style={INP} min="0" max="48" step="0.5"
              value={form.travel_time_hrs} onChange={e => set("travel_time_hrs",e.target.value)}/>
          </div>
        </div>

        {/* Row 3: Temp + Humidity */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
          <div>
            <label style={LBL}>Ambient Temp (°C)</label>
            <input type="number" style={INP} min="5" max="50" step="0.5"
              value={form.ambient_temp_c} onChange={e => set("ambient_temp_c",e.target.value)}/>
          </div>
          <div>
            <label style={LBL}>Humidity (%)</label>
            <input type="number" style={INP} min="10" max="100" step="1"
              value={form.humidity_pct} onChange={e => set("humidity_pct",e.target.value)}/>
          </div>
        </div>

        {/* Row 4: Rainfall + Season */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
          <div>
            <label style={LBL}>Rainfall Last 48h (mm)</label>
            <input type="number" style={INP} min="0" max="200" step="0.5"
              value={form.rainfall_48h_mm} onChange={e => set("rainfall_48h_mm",e.target.value)}/>
          </div>
          <div>
            <label style={LBL}>Season Month</label>
            <select style={INP} value={form.season_month} onChange={e => set("season_month",e.target.value)}>
              {MONTH_NAMES.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Row 5: Region + Experience */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
          <div>
            <label style={LBL}>Region</label>
            <select style={INP} value={form.region} onChange={e => set("region",e.target.value)}>
              {regions.map(r => <option key={r} value={r}>{r.replace("_"," ").toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Farmer Experience</label>
            <select style={INP} value={form.farmer_experience} onChange={e => set("farmer_experience",e.target.value)}>
              {experiences.map(x => (
                <option key={x} value={x}>{x.charAt(0).toUpperCase()+x.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 6: Bin Quality + Vehicle */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"16px" }}>
          <div>
            <label style={LBL}>Bin / Container Quality</label>
            <select style={INP} value={form.bin_quality} onChange={e => set("bin_quality",e.target.value)}>
              {qualities.map(q => (
                <option key={q} value={q}>{q.charAt(0).toUpperCase()+q.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={LBL}>Vehicle Type</label>
            <select style={INP} value={form.vehicle_type} onChange={e => set("vehicle_type",e.target.value)}>
              {vehicles.map(v => (
                <option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <div style={ERR_BOX}>{error}</div>}

        <button type="submit" disabled={loading}
          style={{ ...BTN_PRIMARY, display:"flex", alignItems:"center", gap:"8px", width:"100%",
            justifyContent:"center" }}>
          {loading ? <><Spin/> Analysing Spoilage Risk…</> : "🔬 Predict Spoilage Risk"}
        </button>
      </form>

      {/* ── Results ── */}
      {result && cfg && (
        <div className="anim-fadeup" style={{ marginTop:"24px" }}>

          {/* Risk level hero */}
          <div style={{ background:cfg.bg, border:`2px solid ${cfg.border}`,
            borderRadius:"16px", padding:"20px", marginBottom:"16px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"16px", flexWrap:"wrap" }}>
              <ScoreGauge score={result.risk_score} />
              <div style={{ flex:1, minWidth:"140px" }}>
                <div style={{ fontSize:"11px", color:"var(--tx-m)", textTransform:"uppercase",
                  letterSpacing:"1px", marginBottom:"4px" }}>Risk Level</div>
                <div style={{ fontSize:"2rem", fontWeight:900, color:cfg.color,
                  fontFamily:"var(--fd)", display:"flex", alignItems:"center", gap:"8px" }}>
                  {cfg.icon} {cfg.label}
                </div>
                <div style={{ fontSize:"13px", color:"var(--tx-m)", marginTop:"4px" }}>
                  Confidence: <strong style={{ color:cfg.color }}>{result.confidence_pct}%</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Class probabilities */}
          {result.class_probabilities && (
            <div style={{ ...CARD, marginBottom:"16px" }}>
              <div style={{ fontSize:"11px", color:"var(--tx-m)", textTransform:"uppercase",
                letterSpacing:"1px", marginBottom:"10px" }}>Class Probabilities</div>
              {Object.entries(result.class_probabilities).map(([cls, pct]) => {
                const c2 = RISK_CFG[cls] || RISK_CFG.RISKY;
                return (
                  <div key={cls} style={{ marginBottom:"8px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      fontSize:"12px", marginBottom:"4px" }}>
                      <span style={{ fontWeight:700, color:c2.color }}>{c2.icon} {cls}</span>
                      <span style={{ color:"var(--tx-m)" }}>{pct}%</span>
                    </div>
                    <div style={{ height:"7px", borderRadius:"99px",
                      background:"var(--bd)", overflow:"hidden" }}>
                      <div style={{ height:"100%", borderRadius:"99px",
                        background:c2.color, width:`${pct}%`, transition:"width .6s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations?.length > 0 && (
            <div style={CARD}>
              <div style={{ fontSize:"11px", color:"var(--tx-m)", textTransform:"uppercase",
                letterSpacing:"1px", marginBottom:"10px" }}>📋 Recommendations</div>
              {result.recommendations.map((rec, i) => (
                <div key={i} style={{ display:"flex", gap:"10px", marginBottom:"8px",
                  padding:"10px 12px", background:"var(--bg-l)", borderRadius:"8px",
                  border:"1px solid var(--bd)" }}>
                  <span style={{ color:"var(--tx-m)", fontSize:"12px", flexShrink:0 }}>{i+1}.</span>
                  <span style={{ fontSize:"13px", color:"var(--tx)", lineHeight:1.5 }}>{rec}</span>
                </div>
              ))}
            </div>
          )}

          {/* Model info pill */}
          <div style={{ marginTop:"12px", textAlign:"right" }}>
            <span style={{ fontSize:"11px", color:"var(--tx-s)", background:"var(--bg-m)",
              padding:"3px 10px", borderRadius:"99px", border:"1px solid var(--bd)" }}>
              🤖 {result.model_used === "xgboost" ? "XGBoost Pipeline" : result.model_used}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function MLPredictionsPage() {
  const [meta,         setMeta]        = useState(null);
  const [spoilageMeta, setSpoilageMeta]= useState(null);
  const [metaErr,      setMetaErr]     = useState(false);
  const [activeTab,    setActive]      = useState(0);

  useEffect(() => {
    mlAPI.metadata()
      .then(({ data }) => setMeta(data))
      .catch(() => setMetaErr(true));

    // Load spoilage-specific metadata (valid dropdown values)
    mlAPI.spoilageMeta()
      .then(({ data }) => setSpoilageMeta(data))
      .catch(() => {}); // silently fall back to hardcoded defaults in component
  }, []);

  const TABS = [
    { icon:"💰", label:"Price Predict" },
    { icon:"🗺️", label:"Best Market" },
    { icon:"🌿", label:"Spoilage Risk" },
  ];

  return (
    <div style={{ maxWidth:"840px", margin:"0 auto", padding:"24px 20px" }}>
      <div className="anim-fadeup" style={{ marginBottom:"24px" }}>
        <h1 style={{ fontSize:"22px", fontWeight:800, color:"var(--tx)", marginBottom:"4px",
          display:"flex", alignItems:"center", gap:"8px" }}>
          🤖 ML Predictions
        </h1>
        <p style={{ fontSize:"13px", color:"var(--tx-m)" }}>
          AI-powered crop intelligence — predict prices, classify trends,
          find best markets, and assess spoilage risk.
        </p>
      </div>

      {metaErr && (
        <div className="card" style={{ padding:"16px", marginBottom:"20px",
          background:"rgba(239,68,68,.06)", border:"1px solid rgba(239,68,68,.2)" }}>
          <span style={{ color:"var(--danger)", fontSize:"13px" }}>
            ⚠️ Could not load ML metadata. Showing default options.
            Check that the backend is running and models are configured.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", gap:"6px", marginBottom:"20px",
        background:"var(--bg-m)", padding:"4px", borderRadius:"12px",
        overflowX:"auto", width:"fit-content", maxWidth:"100%" }}>
        {TABS.map((tab, i) => (
          <button key={i} onClick={() => setActive(i)} style={{
            background: activeTab===i ? "var(--bg)" : "transparent",
            border:"none", borderRadius:"9px", padding:"8px 16px", cursor:"pointer",
            fontFamily:"var(--fd)", fontWeight: activeTab===i ? 700 : 500,
            fontSize:"13px", color: activeTab===i ? "var(--cp)" : "var(--tx-m)",
            display:"flex", alignItems:"center", gap:"6px", whiteSpace:"nowrap",
            boxShadow: activeTab===i ? "0 2px 8px rgba(0,0,0,.12)" : "none",
            transition:"all .2s",
          }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div key={activeTab}>
        {activeTab === 0 && <PricePrediction      meta={meta} />}
        {activeTab === 1 && <MarketRecommendation meta={meta} />}
        {activeTab === 2 && <SpoilagePredictor    spoilageMeta={spoilageMeta} />}
      </div>

      <div className="card anim-fadeup d3" style={{ marginTop:"20px", padding:"16px",
        display:"flex", gap:"10px", alignItems:"flex-start" }}>
        <span style={{ fontSize:"1.2rem", flexShrink:0 }}>ℹ️</span>
        <div style={{ fontSize:"12px", color:"var(--tx-m)", lineHeight:1.6 }}>
          <strong style={{ color:"var(--tx)" }}>About these models:</strong> Price models
          use historical APMC data (XGBoost / Random Forest). Spoilage Risk uses an XGBoost
          regression + classification pipeline trained on 2000 samples across 12 features
          (81% accuracy). Use as <strong>reference estimates</strong> — actual conditions may vary.
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}