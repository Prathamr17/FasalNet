// components/operator/StorageUpdateForm.js — v3: light theme
import { useState } from "react";
import { operatorAPI } from "../../services/api";

export default function StorageUpdateForm({ storage: s, onUpdate }) {
  const [form, setForm] = useState({
    available_capacity_kg: s.available_capacity_kg,
    price_per_kg_per_day:  s.price_per_kg_per_day,
    status:                s.status,
  });
  const [loading, setLoad]   = useState(false);
  const [saved,   setSaved]  = useState(false);

  const set  = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const pct  = Math.round((1 - parseFloat(form.available_capacity_kg)/parseFloat(s.total_capacity_kg))*100);
  const statusColor = { available:"var(--safe)", full:"var(--danger)", maintenance:"var(--warn)", inactive:"var(--tx-m)" };

  const handleSave = async () => {
    setLoad(true);
    try {
      await operatorAPI.updateStorage({ storage_id: s.id, ...form });
      setSaved(true); setTimeout(()=>setSaved(false), 2000);
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || "Update failed");
    } finally { setLoad(false); }
  };

  const labelStyle = {
    fontSize:"11px", fontWeight:600, color:"var(--tx-m)",
    textTransform:"uppercase", letterSpacing:".6px", display:"block", marginBottom:"5px"
  };

  return (
    <div className="card" style={{ padding:"16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", marginBottom:"14px", gap:"10px" }}>
        <div>
          <div style={{ fontSize:"14px", fontWeight:700, color:"var(--tx)" }}>{s.name}</div>
          <div style={{ fontSize:"12px", color:"var(--tx-m)", marginTop:"2px" }}>
            {s.district}, {s.state}
          </div>
        </div>
        <span style={{ fontSize:"11px", fontWeight:600, padding:"3px 10px", borderRadius:"99px",
          background: s.status==="available" ? "var(--safe-bg)" : "var(--bg-m)",
          color: statusColor[s.status] || "var(--tx-m)" }}>
          {s.status}
        </span>
      </div>

      {/* Occupancy bar */}
      <div style={{ marginBottom:"14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px",
          fontSize:"11px", color:"var(--tx-s)" }}>
          <span>{(parseFloat(form.available_capacity_kg)/1000).toFixed(1)} MT free</span>
          <span>{pct}% occupied</span>
        </div>
        <div className="prog">
          <div className="prog-fill" style={{ "--w":`${pct}%`,
            background: pct>80?"var(--danger)":pct>50?"var(--warn)":"var(--cp)" }}/>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"12px" }}>
        <div>
          <label style={labelStyle}>Available (kg)</label>
          <input className="inp" type="number" min={0} max={s.total_capacity_kg}
            value={form.available_capacity_kg}
            onChange={e=>set("available_capacity_kg", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Rate (₹/kg/day)</label>
          <input className="inp" type="number" min={0} step="0.1"
            value={form.price_per_kg_per_day}
            onChange={e=>set("price_per_kg_per_day", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select className="inp" value={form.status} onChange={e=>set("status",e.target.value)}>
            {["available","full","maintenance","inactive"].map(s=>(
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <button className={`btn ${saved ? "btn-ghost" : "btn-primary"}`}
        onClick={handleSave} disabled={loading}
        style={{ width:"100%", fontSize:"12px" }}>
        {loading ? "Saving…" : saved ? "✓ Saved!" : "Update Storage"}
      </button>
    </div>
  );
}
