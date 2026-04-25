// components/farmer/RiskAssessor.js — v4: clean light UI, no duplicate output
import { useState } from "react";
import { farmerAPI } from "../../services/api";

const CROPS = [
  "tomato","leafy greens","onion","potato","mango","banana","grapes",
  "cauliflower","rice","wheat","maize","spinach","beans","broccoli",
  "carrot","cabbage","corn","chilli","sweetpotato","pumpkin","cucumber",
];

export default function RiskAssessor({ onRiskResult }) {
  const [form, setForm] = useState({
    crop_type: "tomato", harvest_age_days: 4,
    quantity_kg: 500, weather_temp_celsius: 32, travel_delay_hours: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const { data } = await farmerAPI.predictRisk(form);
      onRiskResult?.({ ...data, quantity_kg: form.quantity_kg, crop_type: form.crop_type });
    } catch {
      // Rule-based fallback
      const age  = form.harvest_age_days;
      const temp = form.weather_temp_celsius;
      const score = Math.min(100, Math.round(age * 7 + Math.max(0, temp - 25) * 2));
      const risk_level = score >= 70 ? "CRITICAL" : score >= 35 ? "RISKY" : "SAFE";
      onRiskResult?.({
        risk_level, risk_score: score,
        days_until_risky:    Math.max(0, Math.round((35 - score) / 7)),
        days_until_critical: Math.max(0, Math.round((70 - score) / 7)),
        confidence_pct: 65, model_used: "rules",
        shelf_window_hrs: Math.max(0, 72 - age * 24),
        harvest_age_days: age,
        recommendations: [
          risk_level === "CRITICAL"
            ? `⚠️ Urgent: book cold storage immediately for ${form.crop_type}.`
            : risk_level === "RISKY"
            ? `Book cold storage within the next 2 days.`
            : `Produce is safe — you have time to find the best rate.`,
          "Compare options in the storage list.",
          temp > 28 ? "Pre-cool before transport — high ambient temperature." : "Maintain cool transport conditions.",
        ],
        quantity_kg: form.quantity_kg, crop_type: form.crop_type,
      });
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = {
    display: "flex", flexDirection: "column", gap: "5px",
  };
  const labelStyle = {
    fontSize: "11px", fontWeight: 600, color: "var(--tx-m)",
    textTransform: "uppercase", letterSpacing: ".6px",
  };

  return (
    <div className="card" style={{ padding: "20px" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"18px" }}>
        <div style={{
          width:"34px", height:"34px", borderRadius:"9px",
          background:"var(--cp-pale)", display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:"16px", flexShrink:0
        }}>🌿</div>
        <div>
          <h2 style={{ fontSize:"14px", fontWeight:700, color:"var(--tx)" }}>Assess Crop Risk</h2>
          <p style={{ fontSize:"11px", color:"var(--tx-m)", marginTop:"1px" }}>Powered by ML · gets smarter over time</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
        {/* Crop type */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Crop Type</label>
          <select className="inp" value={form.crop_type} onChange={e => set("crop_type", e.target.value)}>
            {CROPS.map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* 2-col grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
          {[
            { label:"Days Since Harvest", key:"harvest_age_days",     type:"number", min:0, max:365, step:1 },
            { label:"Quantity (kg)",       key:"quantity_kg",          type:"number", min:1               },
            { label:"Temperature (°C)",    key:"weather_temp_celsius", type:"number", min:0, max:55        },
            { label:"Travel Delay (hrs)",  key:"travel_delay_hours",   type:"number", min:0, max:72        },
          ].map(({ label, key, type, min, max, step }) => (
            <div key={key} style={fieldStyle}>
              <label style={labelStyle}>{label}</label>
              <input
                className="inp" type={type} min={min} max={max} step={step}
                value={form[key]}
                onChange={e => set(key, parseFloat(e.target.value) || 0)}
              />
            </div>
          ))}
        </div>

        {error && (
          <div style={{ padding:"8px 12px", background:"var(--danger-bg)",
            borderRadius:"8px", fontSize:"12px", color:"var(--danger)", fontWeight:500 }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading}
          style={{ width:"100%", padding:"11px" }}>
          {loading
            ? <><span className="aspin" style={{ width:14, height:14, border:"2px solid rgba(255,255,255,.3)", borderTopColor:"#fff" }}/> Analysing…</>
            : "Run Risk Assessment →"
          }
        </button>
      </form>
    </div>
  );
}
