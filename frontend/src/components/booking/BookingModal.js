// components/booking/BookingModal.js — v11: Fully localized & demo guard
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { bookingAPI } from "../../services/api";

const DEMO_IDS = new Set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
const isDemo = (storage) =>
  storage?._isDemo === true ||
  (DEMO_IDS.has(storage?.id) && !storage?.has_operator);

export default function BookingModal({ storage, riskData, onClose, onSuccess }) {
  const { t } = useTranslation();
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    crop_name:     riskData?.crop_type || "",
    pickup_date:   today,
    duration_days: 7,
    quantity_kg:   riskData?.quantity_kg || 100,
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [step,    setStep]    = useState(1);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const qty   = parseFloat(form.quantity_kg)  || 0;
  const dur   = parseInt(form.duration_days)  || 1;
  const rate  = parseFloat(storage.price_per_kg_per_day);
  const total = (qty * rate * dur).toFixed(2);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.crop_name.trim()) { setError(t("booking.crop_name")); return; }
    if (isDemo(storage)) {
      setError("This is a demo storage — connect the backend to book real storage.");
      return;
    }
    setError(""); setLoading(true);
    try {
      const harvestHrs = riskData?.harvest_age_hrs ?? (riskData?.harvest_age_days ? riskData.harvest_age_days * 24 : 0);
      const harvestAge = Math.round(harvestHrs / 24);
      await bookingAPI.create({
        storage_id:       storage.id,
        crop_type:        form.crop_name.trim(),
        quantity_kg:      qty,
        harvest_age_days: harvestAge,
        risk:             riskData?.risk_level || "SAFE",
        pickup_date:      form.pickup_date,
        duration_days:    dur,
      });
      setStep(3);
      setTimeout(() => onSuccess?.(), 1800);
    } catch (err) {
      setError(err.response?.data?.error || t("booking.subtitle"));
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = {
    fontSize:"11px", fontWeight:600, color:"var(--tx-m)",
    textTransform:"uppercase", letterSpacing:".6px", display:"block", marginBottom:"5px"
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position:"fixed", inset:0, zIndex:9998,
        background:"rgba(0,0,0,.4)", backdropFilter:"blur(4px)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:"16px"
      }}>

      {step === 3 && (
        <div className="card anim-pop" style={{ padding:"40px 32px", textAlign:"center",
          maxWidth:"340px", width:"100%" }}>
          <div style={{ fontSize:"48px", marginBottom:"14px" }}>
            {storage.has_operator ? "⏳" : "✅"}
          </div>
          <div style={{ fontSize:"18px", fontWeight:800,
            color: storage.has_operator ? "var(--warn)" : "var(--safe)", marginBottom:"8px" }}>
            {storage.has_operator ? t("booking.pending") : t("booking.confirmed")}
          </div>
          <div style={{ fontSize:"13px", color:"var(--tx-m)" }}>
            {t("booking.booking_sent")}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="card anim-pop" style={{ width:"100%", maxWidth:"460px",
          padding:"24px", maxHeight:"90vh", overflowY:"auto" }}>

          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"flex-start", marginBottom:"20px" }}>
            <div>
              <h3 style={{ fontSize:"17px", fontWeight:700, color:"var(--tx)" }}>{t("booking.title")}</h3>
              <p style={{ fontSize:"12px", color:"var(--tx-m)", marginTop:"2px" }}>{storage.name}</p>
            </div>
            <button onClick={onClose}
              style={{ background:"var(--bg-m)", border:"none", borderRadius:"7px",
                width:"28px", height:"28px", cursor:"pointer", color:"var(--tx-m)", fontSize:"14px" }}>
              ✕
            </button>
          </div>

          <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", marginBottom:"18px" }}>
            {[
              { label: t("booking.storage_rate"), val: `₹${rate} ${t("storage.price_per_kg_day")}` },
              { label: t("storage.temp_range"),  val: `${storage.temp_min_celsius}–${storage.temp_max_celsius}°C` },
              { label: t("storage.available"),   val: `${(parseFloat(storage.available_capacity_kg)/1000).toFixed(1)} MT` },
            ].filter(Boolean).map((chip, i) => (
              <div key={i} style={{ background:"var(--bg-m)", borderRadius:"7px",
                padding:"5px 10px", fontSize:"11px" }}>
                <span style={{ color:"var(--tx-m)" }}>{chip.label}: </span>
                <span style={{ fontWeight:600, color: chip.color || "var(--tx)" }}>{chip.val}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
            <div>
              <label style={labelStyle}>🌾 {t("booking.crop_name")} *</label>
              <input
                className="inp"
                type="text"
                placeholder="e.g. Tomato, Wheat, Onion…"
                value={form.crop_name}
                onChange={e => set("crop_name", e.target.value)}
                required
              />
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
              <div>
                <label style={labelStyle}>{t("booking.crop_quantity")}</label>
                <input className="inp" type="number" min={1}
                  value={form.quantity_kg}
                  onChange={e => set("quantity_kg", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>{t("booking.duration")}</label>
                <input className="inp" type="number" min={1} max={90}
                  value={form.duration_days}
                  onChange={e => set("duration_days", e.target.value)} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>{t("booking.pickup_date")}</label>
              <input className="inp" type="date" min={today}
                value={form.pickup_date}
                onChange={e => set("pickup_date", e.target.value)} />
            </div>

            <div style={{ background:"var(--cp-pale)", border:"1px solid rgba(63,107,51,.2)",
              borderRadius:"12px", padding:"14px", textAlign:"center" }}>
              <div style={{ fontFamily:"var(--fm)", fontWeight:800, fontSize:"24px",
                color:"var(--cp)", lineHeight:1 }}>
                ₹{parseFloat(total).toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize:"11px", color:"var(--tx-m)", marginTop:"4px" }}>
                {qty} kg × ₹{rate} × {dur} {t("booking.duration_days")}
              </div>
            </div>

            {error && (
              <div style={{ background:"rgba(139,58,43,.08)", border:"1px solid rgba(139,58,43,.25)",
                color:"var(--danger)", borderRadius:"8px", padding:"8px 12px", fontSize:"12px" }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display:"flex", gap:"8px", marginTop:"4px" }}>
              <button type="button" onClick={onClose} className="btn btn-ghost"
                style={{ flex:1, padding:"10px" }}>
                {t("booking.cancel")}
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}
                style={{ flex:2, padding:"10px", display:"flex", alignItems:"center",
                  justifyContent:"center", gap:"6px" }}>
                {loading ? t("farmer.analysing") : t("booking.send_request")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
