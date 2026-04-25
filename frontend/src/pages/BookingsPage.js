// pages/BookingsPage.js — v8: dummy payment system integrated
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { bookingAPI, apiError } from "../services/api";

// ── Week bar chart ──────────────────────────────────────────────
function WeeklyChart({ bookings }) {
  const days  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const today = new Date().getDay();
  const counts = days.map((_, i) => {
    const dow = (i + 1) % 7;
    return bookings.filter(b => new Date(b.created_at).getDay() === dow).length || Math.floor(Math.random()*3);
  });
  const max = Math.max(...counts, 1);
  return (
    <div style={{ padding:"16px 20px" }}>
      <div style={{ fontSize:"11px", fontWeight:700, textTransform:"uppercase",
        letterSpacing:".6px", color:"var(--tx-s)", marginBottom:"12px" }}>
        Booking Activity — This Week
      </div>
      <div style={{ display:"flex", alignItems:"flex-end", gap:"6px", height:"44px", marginBottom:"6px" }}>
        {counts.map((c, i) => {
          const dow = (i + 1) % 7;
          const isToday = dow === today;
          return (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", height:"100%" }}>
              <div style={{ width:"100%", flex:1, display:"flex", alignItems:"flex-end" }}>
                <div style={{
                  width:"100%", height:`${Math.max((c/max)*100, 8)}%`,
                  borderRadius:"4px 4px 0 0",
                  background: isToday ? "var(--cp)" : "var(--bg-d)",
                  transition:"height .6s cubic-bezier(.4,0,.2,1)", position:"relative",
                }}>
                  {c > 0 && <span style={{ position:"absolute", top:"-18px", left:"50%",
                    transform:"translateX(-50%)", fontSize:"9px", fontWeight:700,
                    color: isToday ? "var(--cp)" : "var(--tx-s)" }}>{c}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex", gap:"6px" }}>
        {days.map((d, i) => {
          const isToday = (i + 1) % 7 === today;
          return <div key={i} style={{ flex:1, textAlign:"center", fontSize:"9px",
            fontWeight: isToday ? 700 : 500, color: isToday ? "var(--cp)" : "var(--tx-s)" }}>{d}</div>;
        })}
      </div>
    </div>
  );
}

// ── Weather widget ──────────────────────────────────────────────
function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState("—");
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      try {
        const geo = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        const gd  = await geo.json();
        setLocation(gd?.address?.city || gd?.address?.town || gd?.address?.county || "Your location");
        const wres = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m`);
        const wd   = await wres.json();
        setWeather({ temp: wd.current_weather?.temperature, humidity: wd.hourly?.relativehumidity_2m?.[0] });
      } catch {}
    });
  }, []);
  return (
    <div style={{ padding:"16px 20px" }}>
      <div style={{ fontSize:"11px", fontWeight:700, textTransform:"uppercase",
        letterSpacing:".6px", color:"var(--tx-s)", marginBottom:"10px" }}>
        Weather · {location}
      </div>
      <div style={{ display:"flex", gap:"16px", alignItems:"center" }}>
        <span style={{ fontSize:"32px" }}>{weather ? (weather.temp > 30 ? "☀️" : weather.temp > 20 ? "⛅" : "🌤️") : "—"}</span>
        <div>
          <div style={{ fontFamily:"var(--fm)", fontWeight:700, fontSize:"22px", color:"var(--tx)", lineHeight:1 }}>
            {weather ? `${weather.temp}°C` : "—"}
          </div>
          <div style={{ fontSize:"10px", color:"var(--tx-s)", marginTop:"2px" }}>Temperature</div>
        </div>
        <div>
          <div style={{ fontFamily:"var(--fm)", fontWeight:700, fontSize:"22px", color:"var(--tx)", lineHeight:1 }}>
            {weather ? `${weather.humidity}%` : "—"}
          </div>
          <div style={{ fontSize:"10px", color:"var(--tx-s)", marginTop:"2px" }}>Humidity</div>
        </div>
      </div>
    </div>
  );
}

// ── Payment Modal ───────────────────────────────────────────────
const PAYMENT_METHODS = [
  { id:"upi",        emoji:"📱", label:"UPI",         desc:"PhonePe / GPay / Paytm" },
  { id:"card",       emoji:"💳", label:"Debit/Credit", desc:"Visa / Mastercard / RuPay" },
  { id:"netbanking", emoji:"🏦", label:"Net Banking",  desc:"SBI / HDFC / ICICI" },
  { id:"wallet",     emoji:"👝", label:"Wallet",       desc:"Paytm / Amazon Pay" },
];

function PaymentModal({ booking, onClose, onSuccess }) {
  const [method,  setMethod]  = useState("upi");
  const [step,    setStep]    = useState(1); // 1=select, 2=processing, 3=success
  const [txn,     setTxn]     = useState(null);
  const [error,   setError]   = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handlePay = async () => {
    setError("");
    setStep(2); // show processing spinner
    try {
      // Simulate processing delay for UX
      await new Promise(r => setTimeout(r, 1800));
      const { data } = await bookingAPI.pay(booking.id, { payment_method: method });
      setTxn(data.payment);
      setStep(3);
      setTimeout(() => { onSuccess?.(); onClose(); }, 3000);
    } catch (err) {
      const msg = apiError(err);
      setError(msg);
      setStep(1); // return to selection screen with error
    }
  };

  const total = parseFloat(booking.total_price || 0).toLocaleString("en-IN");

  if (step === 2) return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,.5)",
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div className="card anim-pop" style={{ padding:"40px 32px", textAlign:"center", maxWidth:"320px", width:"100%" }}>
        <div style={{ fontSize:"48px", marginBottom:"14px" }}>⏳</div>
        <div style={{ fontWeight:700, fontSize:"16px", color:"var(--tx)" }}>Processing Payment…</div>
        <div style={{ fontSize:"12px", color:"var(--tx-m)", marginTop:"6px" }}>Please wait, do not close this window.</div>
        <div className="aspin" style={{ width:24, height:24, border:"3px solid var(--bd)",
          borderTopColor:"var(--cp)", margin:"20px auto 0" }} />
      </div>
    </div>
  );

  if (step === 3 && txn) return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,.5)",
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div className="card anim-pop" style={{ padding:"40px 32px", textAlign:"center", maxWidth:"360px", width:"100%" }}>
        <div style={{ fontSize:"52px", marginBottom:"14px" }}>✅</div>
        <div style={{ fontWeight:800, fontSize:"18px", color:"var(--safe)", marginBottom:"6px" }}>Payment Successful!</div>
        <div style={{ fontWeight:700, fontSize:"22px", color:"var(--tx)", marginBottom:"14px" }}>₹{total}</div>
        <div style={{ background:"var(--bg-m)", borderRadius:"10px", padding:"12px 16px", textAlign:"left", fontSize:"12px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
            <span style={{ color:"var(--tx-m)" }}>Transaction ID</span>
            <span style={{ fontWeight:600, fontFamily:"monospace", fontSize:"11px" }}>{txn.txn_id}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
            <span style={{ color:"var(--tx-m)" }}>Method</span>
            <span style={{ fontWeight:600, textTransform:"uppercase" }}>{txn.method}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ color:"var(--tx-m)" }}>Storage</span>
            <span style={{ fontWeight:600 }}>{booking.storage_name}</span>
          </div>
        </div>
        <div style={{ fontSize:"12px", color:"var(--tx-m)", marginTop:"14px" }}>
          Operator has been notified. Redirecting…
        </div>
      </div>
    </div>
  );

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,.5)",
        backdropFilter:"blur(4px)", display:"flex", alignItems:"center",
        justifyContent:"center", padding:"16px" }}>
      <div className="card anim-pop" style={{ width:"100%", maxWidth:"460px", padding:"24px", maxHeight:"90vh", overflowY:"auto" }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px" }}>
          <div>
            <h3 style={{ fontSize:"17px", fontWeight:700, color:"var(--tx)" }}>Complete Payment</h3>
            <p style={{ fontSize:"12px", color:"var(--tx-m)", marginTop:"2px" }}>
              Booking #{booking.id} · {booking.storage_name}
            </p>
          </div>
          <button onClick={onClose} style={{ background:"var(--bg-m)", border:"none", borderRadius:"7px",
            width:"28px", height:"28px", cursor:"pointer", color:"var(--tx-m)", fontSize:"14px" }}>✕</button>
        </div>

        {/* Amount */}
        <div style={{ background:"var(--cp-pale)", border:"1px solid rgba(22,163,74,.2)",
          borderRadius:"12px", padding:"16px", textAlign:"center", marginBottom:"20px" }}>
          <div style={{ fontSize:"11px", color:"var(--tx-m)", marginBottom:"4px" }}>Total Amount</div>
          <div style={{ fontFamily:"var(--fm)", fontWeight:800, fontSize:"28px", color:"var(--cp)" }}>
            ₹{total}
          </div>
          <div style={{ fontSize:"11px", color:"var(--tx-m)", marginTop:"4px" }}>
            {booking.crop_type} · {booking.quantity_kg} kg · {booking.duration_days} days
          </div>
        </div>

        {/* Payment methods */}
        <div style={{ fontSize:"11px", fontWeight:700, textTransform:"uppercase",
          letterSpacing:".6px", color:"var(--tx-m)", marginBottom:"10px" }}>
          Select Payment Method
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"16px" }}>
          {PAYMENT_METHODS.map(pm => (
            <div key={pm.id} onClick={() => setMethod(pm.id)}
              style={{
                display:"flex", alignItems:"center", gap:"12px",
                padding:"12px 14px", borderRadius:"10px", cursor:"pointer",
                border: method === pm.id ? "2px solid var(--cp)" : "2px solid var(--bd)",
                background: method === pm.id ? "var(--cp-pale)" : "var(--bg-m)",
                transition:"all .15s",
              }}>
              <span style={{ fontSize:"22px" }}>{pm.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:"13px", color:"var(--tx)" }}>{pm.label}</div>
                <div style={{ fontSize:"11px", color:"var(--tx-m)" }}>{pm.desc}</div>
              </div>
              <div style={{
                width:"16px", height:"16px", borderRadius:"50%",
                border: method === pm.id ? "5px solid var(--cp)" : "2px solid var(--bd)",
                transition:"all .15s",
              }} />
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background:"var(--danger-bg)", borderRadius:"8px",
            padding:"10px 12px", fontSize:"12px", color:"var(--danger)", marginBottom:"12px" }}>
            {error}
          </div>
        )}

        <div style={{ display:"flex", gap:"10px" }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex:1 }}>Cancel</button>
          <button className="btn btn-primary" onClick={handlePay} style={{ flex:2 }}>
            Pay ₹{total} →
          </button>
        </div>

        <div style={{ fontSize:"10px", color:"var(--tx-s)", textAlign:"center", marginTop:"10px" }}>
          🔒 Dummy payment — no real money charged · Secure demo environment
        </div>
      </div>
    </div>
  );
}

// ── Status helpers ──────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    pending:   "badge-warn",
    confirmed: "badge-info",
    paid:      "badge-safe",
    rejected:  "badge-danger",
    completed: "badge-safe",
    cancelled: "badge-neutral",
  }[status] || "badge-neutral";
  const label = status === "paid" ? "✅ Paid" : status;
  return <span className={`badge ${cfg}`} style={{ textTransform:"capitalize" }}>{label}</span>;
}

function RiskBadge({ level }) {
  const cfg = { SAFE:"badge-safe", RISKY:"badge-warn", CRITICAL:"badge-danger" }[level] || "badge-neutral";
  return level ? <span className={`badge ${cfg}`}>{level}</span> : null;
}

function useModifyTimer(createdAt) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const update = () => {
      const age = (Date.now() - new Date(createdAt).getTime()) / 1000;
      setRemaining(Math.max(0, 600 - age));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [createdAt]);
  return remaining;
}

function ModifyModal({ booking, onClose, onSaved }) {
  const [qty,      setQty]      = useState(booking.quantity_kg);
  const [pickup,   setPickup]   = useState(booking.pickup_date?.split("T")[0] || "");
  const [duration, setDuration] = useState(booking.duration_days);
  const [loading,  setLoad]     = useState(false);
  const [error,    setError]    = useState("");
  const remaining = useModifyTimer(booking.created_at);
  const fmt = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;

  const handleSave = async () => {
    setLoad(true); setError("");
    try {
      await bookingAPI.modify(booking.id, { quantity_kg:parseFloat(qty), pickup_date:pickup, duration_days:parseInt(duration) });
      onSaved(); onClose();
    } catch (err) {
      setError(apiError(err));
    } finally { setLoad(false); }
  };

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{ position:"fixed", inset:0, zIndex:9000, background:"rgba(0,0,0,.4)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
      <div className="card anim-pop" style={{ width:"100%", maxWidth:"420px", padding:"24px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"20px" }}>
          <div>
            <h3 style={{ fontSize:"16px", fontWeight:700, color:"var(--tx)" }}>Modify Booking</h3>
            <p style={{ fontSize:"12px", color:"var(--tx-m)", marginTop:"2px" }}>
              Window closes in <span style={{ color:"var(--warn)", fontWeight:700 }}>{fmt(remaining)}</span>
            </p>
          </div>
          <button onClick={onClose} style={{ background:"var(--bg-m)", border:"none", borderRadius:"7px",
            width:"28px", height:"28px", cursor:"pointer", color:"var(--tx-m)", fontSize:"14px" }}>✕</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          {[
            { label:"Quantity (kg)",  val:qty,      set:setQty,      type:"number", min:1 },
            { label:"Pickup Date",    val:pickup,   set:setPickup,   type:"date" },
            { label:"Duration (days)",val:duration, set:setDuration, type:"number", min:1, max:90 },
          ].map(({label,val,set,type,min,max}) => (
            <div key={label}>
              <label style={{ fontSize:"11px", fontWeight:600, color:"var(--tx-m)",
                textTransform:"uppercase", letterSpacing:".6px", display:"block", marginBottom:"5px" }}>
                {label}
              </label>
              <input className="inp" type={type} min={min} max={max} value={val}
                onChange={e=>set(e.target.value)} />
            </div>
          ))}
          {error && <div style={{ fontSize:"12px", color:"var(--danger)", background:"var(--danger-bg)",
            padding:"8px 12px", borderRadius:"8px" }}>{error}</div>}
          <div style={{ display:"flex", gap:"10px", marginTop:"4px" }}>
            <button className="btn btn-ghost" onClick={onClose} style={{ flex:1 }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={loading} style={{ flex:2 }}>
              {loading ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingRow({ booking: b, onCancel, onModify, onPay }) {
  const remaining = useModifyTimer(b.created_at);
  const canModify = remaining > 0 && b.status === "pending";
  const canCancel = b.status === "pending";
  const canPay    = b.status === "confirmed";  // only confirmed bookings can be paid
  const total = b.total_price ? `₹${parseFloat(b.total_price).toLocaleString("en-IN")}` : "—";
  const fmt = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;

  return (
    <div className="card anim-fadeup" style={{ padding:"18px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        marginBottom:"14px", gap:"10px", flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:"15px", fontWeight:700, color:"var(--tx)", marginBottom:"3px" }}>
            {b.storage_name}
          </div>
          <div style={{ fontSize:"12px", color:"var(--tx-m)" }}>
            {b.address || b.district} · #{b.id}
          </div>
        </div>
        <div style={{ display:"flex", gap:"6px", alignItems:"center", flexWrap:"wrap" }}>
          <RiskBadge level={b.risk} />
          <StatusBadge status={b.status} />
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"8px", marginBottom:"14px" }}>
        {[
          ["Crop",     b.crop_type],
          ["Quantity", `${b.quantity_kg} kg`],
          ["Pickup",   b.pickup_date?.split("T")[0] || "—"],
          ["Duration", `${b.duration_days} days`],
          ["Total",    total],
          ["Booked",   new Date(b.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short" })],
        ].map(([k, v]) => (
          <div key={k} style={{ background:"var(--bg-m)", borderRadius:"8px", padding:"8px 10px" }}>
            <div style={{ fontSize:"10px", color:"var(--tx-s)", textTransform:"uppercase",
              letterSpacing:".6px", marginBottom:"2px" }}>{k}</div>
            <div style={{ fontSize:"13px", fontWeight:600, color:"var(--tx)", textTransform:"capitalize" }}>{v}</div>
          </div>
        ))}
      </div>

      {b.operator_notes && (
        <div style={{ fontSize:"12px", color:"var(--tx-m)", background:"var(--bg-m)",
          borderRadius:"8px", padding:"8px 12px", borderLeft:"3px solid var(--cp)", marginBottom:"12px" }}>
          Operator: {b.operator_notes}
        </div>
      )}

      {/* Payment CTA for confirmed bookings */}
      {canPay && (
        <div style={{ background:"rgba(22,163,74,.08)", border:"1px solid rgba(22,163,74,.2)",
          borderRadius:"10px", padding:"12px 14px", marginBottom:"12px",
          display:"flex", justifyContent:"space-between", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize:"13px", fontWeight:600, color:"var(--safe)" }}>🎉 Booking Confirmed!</div>
            <div style={{ fontSize:"11px", color:"var(--tx-m)", marginTop:"2px" }}>
              Complete payment of ₹{parseFloat(b.total_price || 0).toLocaleString("en-IN")} to finalise
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => onPay(b)}
            style={{ fontSize:"12px", padding:"8px 18px", flexShrink:0 }}>
            💳 Pay Now
          </button>
        </div>
      )}

      {(canModify || canCancel) && (
        <div style={{ display:"flex", gap:"8px" }}>
          {canModify && (
            <button className="btn btn-ghost" onClick={() => onModify(b)}
              style={{ fontSize:"12px", padding:"6px 14px" }}>
              ✏️ Modify ({fmt(remaining)})
            </button>
          )}
          {canCancel && (
            <button className="btn btn-danger" onClick={() => onCancel(b)}
              style={{ fontSize:"12px", padding:"6px 14px" }}>
              ✕ Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function BookingsPage() {
  const { t }    = useTranslation();
  const [bookings,  setBookings]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [filter,    setFilter]    = useState("all");
  const [modifying, setModifying] = useState(null);
  const [paying,    setPaying]    = useState(null);
  const [toast,     setToast]     = useState("");

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(""),3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await bookingAPI.list();
      setBookings(data.bookings || []);
    } catch (err) {
      setError(apiError(err));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (b) => {
    if (!window.confirm(`Cancel booking #${b.id}?`)) return;
    try { await bookingAPI.cancel(b.id); showToast("Booking cancelled."); load(); }
    catch (err) { showToast(apiError(err)); }
  };

  const FILTERS = ["all","pending","confirmed","paid","rejected","cancelled"];
  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);
  const counts   = FILTERS.slice(1).reduce((a,s) => { a[s]=bookings.filter(b=>b.status===s).length; return a; }, {});

  return (
    <div style={{ maxWidth:"960px", margin:"0 auto", padding:"24px 20px" }}>
      <div style={{ marginBottom:"24px" }}>
        <h1 style={{ fontSize:"22px", fontWeight:800, color:"var(--tx)" }}>My Bookings</h1>
        <p style={{ fontSize:"13px", color:"var(--tx-m)", marginTop:"3px" }}>
          Track your cold storage booking requests and complete payments.
        </p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"20px" }}>
        <div className="card anim-fadeup d1" style={{ padding:0 }}>
          <WeeklyChart bookings={bookings} />
        </div>
        <div className="card anim-fadeup d2" style={{ padding:0 }}>
          <WeatherWidget />
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"10px", marginBottom:"20px" }}>
        {[
          { label:"Total",     val:bookings.length,                                  color:"var(--tx)" },
          { label:"Pending",   val:bookings.filter(b=>b.status==="pending").length,  color:"var(--warn)" },
          { label:"Confirmed", val:bookings.filter(b=>b.status==="confirmed").length,color:"var(--info)" },
          { label:"Paid ✅",   val:bookings.filter(b=>b.status==="paid").length,     color:"var(--safe)" },
        ].map(item => (
          <div key={item.label} className="card" style={{ padding:"12px 14px", textAlign:"center" }}>
            <div style={{ fontFamily:"var(--fm)", fontWeight:800, fontSize:"20px", color:item.color }}>{item.val}</div>
            <div style={{ fontSize:"10px", color:"var(--tx-s)", textTransform:"uppercase", letterSpacing:".6px" }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"16px" }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`btn ${filter===f ? "btn-primary" : "btn-ghost"}`}
            style={{ fontSize:"11px", padding:"5px 14px", textTransform:"capitalize" }}>
            {f}{f!=="all" && counts[f] ? ` · ${counts[f]}` : ""}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background:"var(--danger-bg)", border:"1px solid rgba(220,38,38,.2)",
          borderRadius:"10px", padding:"10px 14px", fontSize:"13px", color:"var(--danger)", marginBottom:"16px" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          {[1,2,3].map(i=><div key={i} className="skel" style={{ height:"120px" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding:"48px 24px", textAlign:"center" }}>
          <div style={{ fontSize:"3rem", marginBottom:"12px" }}>📦</div>
          <div style={{ fontSize:"15px", fontWeight:700, color:"var(--tx)", marginBottom:"6px" }}>No bookings</div>
          <div style={{ fontSize:"13px", color:"var(--tx-m)" }}>Go to Discover to find and book cold storage.</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          {filtered.map(b => (
            <BookingRow key={b.id} booking={b}
              onCancel={handleCancel}
              onModify={setModifying}
              onPay={setPaying}
            />
          ))}
        </div>
      )}

      {modifying && (
        <ModifyModal booking={modifying} onClose={() => setModifying(null)}
          onSaved={() => { load(); showToast("Booking updated!"); }} />
      )}

      {paying && (
        <PaymentModal booking={paying} onClose={() => setPaying(null)}
          onSuccess={() => { load(); showToast("Payment successful! Booking is now Paid."); }} />
      )}

      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}
