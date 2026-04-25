// components/operator/BookingCard.js — v4: capacity impact + success state
import { useState } from "react";
import { bookingAPI } from "../../services/api";

export default function BookingCard({ booking: b, onUpdate }) {
  const [loading, setLoad]     = useState(false);
  const [notes,   setNotes]    = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [done,    setDone]     = useState(null); // "approved" | "rejected"

  const act = async (action) => {
    setLoad(true);
    try {
      if (action === "approve") {
        await bookingAPI.approve({ booking_id: b.id, notes });
        setDone("approved");
      } else {
        await bookingAPI.reject({ booking_id: b.id, reason: notes });
        setDone("rejected");
      }
      // Small delay so the success flash is visible before parent re-fetches
      setTimeout(() => onUpdate(), 800);
    } catch (err) {
      alert(err.response?.data?.error || "Action failed");
    } finally { setLoad(false); }
  };

  const riskColor = { SAFE:"var(--safe)", RISKY:"var(--warn)", CRITICAL:"var(--danger)" }[b.risk] || "var(--tx-m)";
  const riskBg    = { SAFE:"var(--safe-bg)", RISKY:"var(--warn-bg)", CRITICAL:"var(--danger-bg)" }[b.risk] || "var(--bg-m)";

  // Capacity impact preview
  const capacityImpactPct = b.quantity_kg && b.storage_total_capacity
    ? ((parseFloat(b.quantity_kg) / parseFloat(b.storage_total_capacity)) * 100).toFixed(1)
    : null;

  // Success flash
  if (done) {
    return (
      <div className="card" style={{ padding:"16px", border:`1.5px solid ${done==="approved"?"rgba(22,163,74,.4)":"rgba(220,38,38,.3)"}`,
        background: done==="approved" ? "var(--safe-bg)" : "var(--danger-bg)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <span style={{ fontSize:"22px" }}>{done==="approved" ? "✅" : "❌"}</span>
          <div>
            <div style={{ fontWeight:700, fontSize:"14px", color:"var(--tx)" }}>
              Booking {done === "approved" ? "Approved" : "Rejected"}
            </div>
            <div style={{ fontSize:"12px", color:"var(--tx-m)" }}>
              {b.farmer_name} · {b.crop_type} · {b.quantity_kg} kg
              {done==="approved" && " — Capacity updated"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding:"16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-start", marginBottom:"12px", gap:"10px", flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:"14px", fontWeight:700, color:"var(--tx)", marginBottom:"2px" }}>
            {b.farmer_name || "Farmer"}
          </div>
          <div style={{ fontSize:"12px", color:"var(--tx-m)" }}>
            {b.farmer_phone} · {b.storage_name}
          </div>
        </div>
        <span style={{ background:riskBg, color:riskColor, padding:"3px 10px",
          borderRadius:"99px", fontSize:"11px", fontWeight:700 }}>
          {b.risk || "SAFE"}
        </span>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"8px", marginBottom:"12px" }}>
        {[
          ["Crop",     b.crop_type],
          ["Quantity", `${b.quantity_kg} kg`],
          ["Pickup",   b.pickup_date?.split("T")[0] || "—"],
          ["Duration", `${b.duration_days} days`],
          ["Total",    b.total_price ? `₹${parseFloat(b.total_price).toLocaleString("en-IN")}` : "—"],
          ["Booked",   b.created_at ? new Date(b.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : "—"],
        ].map(([k,v]) => (
          <div key={k} style={{ background:"var(--bg-m)", borderRadius:"8px", padding:"7px 9px" }}>
            <div style={{ fontSize:"10px", color:"var(--tx-s)", textTransform:"uppercase",
              letterSpacing:".5px", marginBottom:"2px" }}>{k}</div>
            <div style={{ fontSize:"12px", fontWeight:600, color:"var(--tx)", textTransform:"capitalize" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Capacity impact preview */}
      {b.status === "pending" && (
        <div style={{ background:"var(--bg-m)", borderRadius:"8px", padding:"8px 10px", marginBottom:"10px",
          border:"1px solid var(--bd)", fontSize:"11px", color:"var(--tx-m)", display:"flex",
          alignItems:"center", gap:"6px" }}>
          <span>📦</span>
          <span>Approving will reserve <strong style={{ color:"var(--tx)" }}>{parseFloat(b.quantity_kg).toLocaleString("en-IN")} kg</strong> of storage capacity.
            {capacityImpactPct && <span style={{ color:"var(--warn)", fontWeight:600 }}> ({capacityImpactPct}% of total)</span>}
          </span>
        </div>
      )}

      {showNotes && (
        <textarea className="inp" value={notes} onChange={e=>setNotes(e.target.value)}
          placeholder="Add a note (optional)…" rows={2}
          style={{ resize:"none", marginBottom:"10px", fontSize:"12px" }} />
      )}

      {b.status === "pending" && (
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", alignItems:"center" }}>
          <button className="btn btn-ghost" onClick={() => setShowNotes(v=>!v)}
            style={{ fontSize:"11px", padding:"5px 10px", color:"var(--tx-m)" }}>
            {showNotes ? "Hide note" : "Add note"}
          </button>
          <button className="btn btn-ghost" onClick={() => act("approve")} disabled={loading}
            style={{ flex:1, fontSize:"12px", color:"var(--safe)",
              borderColor:"rgba(22,163,74,.3)", background:"var(--safe-bg)" }}>
            {loading ? "…" : "✓ Approve & Update Capacity"}
          </button>
          <button className="btn btn-danger" onClick={() => act("reject")} disabled={loading}
            style={{ flex:1, fontSize:"12px" }}>
            {loading ? "…" : "✗ Reject"}
          </button>
        </div>
      )}
    </div>
  );
}
