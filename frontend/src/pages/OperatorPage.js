// pages/OperatorPage.js — v8: payment visibility, delivery assignment
import { useState, useEffect, useCallback } from "react";
import { operatorAPI, apiError } from "../services/api";
import BookingCard       from "../components/operator/BookingCard";
import StorageUpdateForm from "../components/operator/StorageUpdateForm";

const INDIA_STATES = [
  "Andhra Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra",
  "Manipur","Meghalaya","Odisha","Punjab","Rajasthan","Tamil Nadu","Telangana",
  "Uttar Pradesh","Uttarakhand","West Bengal",
];

// ── Capacity Donut ───────────────────────────────────────────────────────
function CapacityDonut({ total, available, label }) {
  const used   = total - available;
  const pct    = total > 0 ? used / total : 0;
  const r      = 36;
  const circum = 2 * Math.PI * r;
  const dash   = circum * pct;
  const color  = pct > .8 ? "#DC2626" : pct > .5 ? "#D97706" : "#16A34A";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"6px" }}>
      <div style={{ position:"relative" }}>
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={r} fill="none" stroke="var(--bg-d)" strokeWidth="8"/>
          <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circum - dash}`}
            style={{ transform:"rotate(-90deg)", transformOrigin:"center", transition:"stroke-dasharray 1.2s ease" }}
          />
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontFamily:"var(--fm)", fontWeight:700, fontSize:"16px", color, lineHeight:1 }}>
            {Math.round(pct*100)}%
          </span>
          <span style={{ fontSize:"9px", color:"var(--tx-s)" }}>used</span>
        </div>
      </div>
      <span style={{ fontSize:"11px", fontWeight:600, color:"var(--tx-m)" }}>{label}</span>
    </div>
  );
}

// ── Utilization Chart ─────────────────────────────────────────────────────
function UtilizationChart({ storages }) {
  const [hovered, setHovered] = useState(null);
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t); }, []);
  const base = storages.reduce((s, st) => {
    const pct = st.total_capacity_kg > 0 ? (1 - st.available_capacity_kg / st.total_capacity_kg) * 100 : 0;
    return s + pct;
  }, 0) / Math.max(storages.length, 1);
  const days   = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const values = days.map((_, i) => Math.max(10, Math.round(base + (Math.sin(i*1.2)*12) + (Math.cos(i*0.8)*6))));
  const max    = Math.max(...values, 1);
  const todayIdx = (new Date().getDay() + 6) % 7;
  const colorFor = v => v > 80 ? "#DC2626" : v > 60 ? "#D97706" : "#16A34A";
  return (
    <div style={{ padding:"16px 20px" }}>
      <div style={{ fontSize:"11px", fontWeight:700, textTransform:"uppercase",
        letterSpacing:".6px", color:"var(--tx-s)", marginBottom:"14px" }}>
        Weekly Utilization Trend
      </div>
      <div style={{ display:"flex", alignItems:"flex-end", gap:"4px", height:"64px", marginBottom:"6px" }}>
        {values.map((v, i) => (
          <div key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
              justifyContent:"flex-end", height:"100%", cursor:"pointer" }}>
            {i === hovered && <div style={{ fontSize:"9px", fontWeight:700, color:colorFor(v), marginBottom:"2px" }}>{v}%</div>}
            <div style={{
              width:"100%", borderRadius:"4px 4px 0 0",
              height: animated ? `${(v/max)*100}%` : "0%",
              background: i===todayIdx ? `linear-gradient(180deg,${colorFor(v)},${colorFor(v)}99)` : i===hovered ? `${colorFor(v)}cc` : "var(--bg-d)",
              border: i===todayIdx ? `1.5px solid ${colorFor(v)}` : "none",
              transition:"height .9s cubic-bezier(.4,0,.2,1)",
            }}/>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:"4px" }}>
        {days.map((d, i) => (
          <div key={i} style={{ flex:1, textAlign:"center", fontSize:"9px",
            fontWeight: i===todayIdx ? 800 : 400, color: i===todayIdx ? "var(--cp)" : "var(--tx-s)" }}>{d}</div>
        ))}
      </div>
    </div>
  );
}

// ── Paid Bookings Panel ───────────────────────────────────────────────────
function PaidBookingsPanel({ bookings }) {
  if (!bookings || bookings.length === 0) return (
    <div className="card" style={{ padding:"32px 24px", textAlign:"center" }}>
      <div style={{ fontSize:"2rem", marginBottom:"8px" }}>💰</div>
      <div style={{ fontWeight:700, fontSize:"14px", color:"var(--tx)" }}>No payments yet</div>
      <div style={{ fontSize:"12px", color:"var(--tx-m)", marginTop:"4px" }}>
        Confirmed bookings that are paid will appear here.
      </div>
    </div>
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
      {bookings.map(b => (
        <div key={b.id} className="card anim-fadeup" style={{ padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
            gap:"10px", flexWrap:"wrap" }}>
            <div>
              <div style={{ fontWeight:700, fontSize:"14px", color:"var(--tx)", marginBottom:"2px" }}>
                {b.storage_name} <span style={{ fontSize:"11px", color:"var(--tx-m)", fontWeight:400 }}>#{b.id}</span>
              </div>
              <div style={{ fontSize:"12px", color:"var(--tx-m)" }}>
                {b.farmer_name} · {b.farmer_phone}
              </div>
            </div>
            <span className="badge badge-safe" style={{ fontSize:"12px" }}>✅ Paid</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"8px", marginTop:"10px" }}>
            {[
              ["Crop",    b.crop_type],
              ["Qty",     `${b.quantity_kg} kg`],
              ["Amount",  `₹${parseFloat(b.total_price||0).toLocaleString("en-IN")}`],
              ["Pickup",  b.pickup_date?.split("T")[0]||"—"],
              ["Duration",`${b.duration_days} days`],
              ["Paid On", new Date(b.updated_at).toLocaleDateString("en-IN")],
            ].map(([k,v]) => (
              <div key={k} style={{ background:"var(--bg-m)", borderRadius:"8px", padding:"6px 10px" }}>
                <div style={{ fontSize:"9px", color:"var(--tx-s)", textTransform:"uppercase", letterSpacing:".5px" }}>{k}</div>
                <div style={{ fontSize:"12px", fontWeight:600, color: k==="Amount" ? "var(--safe)" : "var(--tx)", textTransform:"capitalize" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Assign Delivery Modal ─────────────────────────────────────────────────
function AssignDeliveryModal({ order, deliveryBoys, onClose, onAssigned }) {
  const [selectedBoy, setSelected] = useState("");
  const [loading, setLoad]         = useState(false);
  const [error, setError]          = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleAssign = async () => {
    if (!selectedBoy) { setError("Please select a delivery boy."); return; }
    setLoad(true); setError("");
    try {
      await operatorAPI.assignDelivery(order.id, { delivery_boy_id: parseInt(selectedBoy) });
      onAssigned();
      onClose();
    } catch (err) {
      setError(apiError(err));
    } finally { setLoad(false); }
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,.5)",
        backdropFilter:"blur(4px)", display:"flex", alignItems:"center",
        justifyContent:"center", padding:"16px" }}>
      <div className="card anim-pop" style={{ width:"100%", maxWidth:"420px", padding:"24px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"20px" }}>
          <div>
            <h3 style={{ fontSize:"16px", fontWeight:700, color:"var(--tx)" }}>Assign Delivery</h3>
            <p style={{ fontSize:"12px", color:"var(--tx-m)", marginTop:"2px" }}>
              Order #{order.id} · {order.product_name}
            </p>
          </div>
          <button onClick={onClose} style={{ background:"var(--bg-m)", border:"none", borderRadius:"7px",
            width:"28px", height:"28px", cursor:"pointer", color:"var(--tx-m)" }}>✕</button>
        </div>
        {deliveryBoys.length === 0 ? (
          <div style={{ textAlign:"center", padding:"20px", color:"var(--tx-m)", fontSize:"13px" }}>
            No delivery boys registered. Ask them to sign up with the <strong>delivery_boy</strong> role.
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"16px" }}>
            {deliveryBoys.map(boy => (
              <div key={boy.id} onClick={() => setSelected(String(boy.id))}
                style={{
                  display:"flex", alignItems:"center", gap:"12px", padding:"10px 14px",
                  borderRadius:"10px", cursor:"pointer",
                  border: selectedBoy === String(boy.id) ? "2px solid var(--cp)" : "2px solid var(--bd)",
                  background: selectedBoy === String(boy.id) ? "var(--cp-pale)" : "var(--bg-m)",
                }}>
                <div style={{ width:"36px", height:"36px", borderRadius:"50%", background:"var(--bg-d)",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px" }}>🚴</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:"13px", color:"var(--tx)" }}>{boy.name}</div>
                  <div style={{ fontSize:"11px", color:"var(--tx-m)" }}>{boy.phone}</div>
                </div>
                <div style={{ width:"16px", height:"16px", borderRadius:"50%",
                  border: selectedBoy === String(boy.id) ? "5px solid var(--cp)" : "2px solid var(--bd)" }} />
              </div>
            ))}
          </div>
        )}
        {error && <div style={{ background:"var(--danger-bg)", borderRadius:"8px", padding:"10px",
          fontSize:"12px", color:"var(--danger)", marginBottom:"12px" }}>{error}</div>}
        <div style={{ display:"flex", gap:"10px" }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex:1 }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAssign} disabled={loading || !selectedBoy}
            style={{ flex:2 }}>
            {loading ? "Assigning…" : "Assign Delivery →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Customer Orders Panel ─────────────────────────────────────────────────
function CustomerOrdersPanel({ orders, onAssign }) {
  const statusColor = { pending:"badge-warn", confirmed:"badge-info", delivered:"badge-safe", cancelled:"badge-danger" };
  if (!orders || orders.length === 0) return (
    <div className="card" style={{ padding:"32px", textAlign:"center" }}>
      <div style={{ fontSize:"2rem", marginBottom:"8px" }}>🛒</div>
      <div style={{ fontWeight:700, fontSize:"14px", color:"var(--tx)" }}>No customer orders</div>
    </div>
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
      {orders.map(o => (
        <div key={o.id} className="card" style={{ padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
            gap:"10px", flexWrap:"wrap", marginBottom:"8px" }}>
            <div>
              <div style={{ fontWeight:700, fontSize:"13px", color:"var(--tx)" }}>
                {o.product_name} <span style={{ color:"var(--tx-m)", fontWeight:400 }}>#{o.id}</span>
              </div>
              <div style={{ fontSize:"11px", color:"var(--tx-m)" }}>
                {o.customer_name} · {o.customer_phone}
              </div>
            </div>
            <span className={`badge ${statusColor[o.status] || "badge-neutral"}`}
              style={{ textTransform:"capitalize" }}>{o.status}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:"12px", color:"var(--tx-m)" }}>
              {o.quantity_kg} kg · ₹{parseFloat(o.total_amount||0).toLocaleString("en-IN")}
              {o.delivery_date && ` · ${o.delivery_date?.split("T")[0]}`}
            </div>
            {o.status === "confirmed" && (
              <button className="btn btn-ghost" onClick={() => onAssign(o)}
                style={{ fontSize:"11px", padding:"4px 12px" }}>
                🚴 Assign Delivery
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Booked Farmers per Storage ────────────────────────────────────────────
function BookedFarmersPerStorage({ storages, pending, confirmed, paid }) {
  const [selectedStorage, setSelectedStorage] = useState(null);

  // Group all bookings by storage_id
  const allBookings = [...(pending||[]), ...(confirmed||[]), ...(paid||[])];
  const bookingsByStorage = {};
  for (const bk of allBookings) {
    if (!bookingsByStorage[bk.storage_id]) bookingsByStorage[bk.storage_id] = [];
    bookingsByStorage[bk.storage_id].push(bk);
  }

  const displayStorages = storages.length > 0 ? storages : [];

  if (displayStorages.length === 0) return (
    <div className="card" style={{ padding:"40px", textAlign:"center" }}>
      <div style={{ fontSize:"2.5rem", marginBottom:"10px" }}>🏭</div>
      <div style={{ fontWeight:700, fontSize:"15px", color:"var(--tx)" }}>No storages found</div>
      <div style={{ fontSize:"13px", color:"var(--tx-m)", marginTop:"4px" }}>
        Your cold storages will appear here after setup.
      </div>
    </div>
  );

  const activeStorage = selectedStorage
    ? displayStorages.find(s => s.id === selectedStorage)
    : displayStorages[0];
  const activeSid = activeStorage?.id;
  const activeFarmers = bookingsByStorage[activeSid] || [];

  const statusColor = {
    pending:   "var(--warn)",
    confirmed: "var(--info)",
    paid:      "var(--safe)",
    rejected:  "var(--danger)",
    cancelled: "var(--tx-s)",
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:"16px", alignItems:"start" }}>
      {/* Left: storage list */}
      <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
        <div style={{ fontSize:"11px", fontWeight:700, textTransform:"uppercase",
          letterSpacing:".6px", color:"var(--tx-s)", marginBottom:"4px" }}>
          Your Storages
        </div>
        {displayStorages.map(s => {
          const bks   = bookingsByStorage[s.id] || [];
          const isAct = s.id === activeSid;
          const pct   = s.total_capacity_kg > 0
            ? Math.round((1 - s.available_capacity_kg / s.total_capacity_kg) * 100) : 0;
          return (
            <div key={s.id} onClick={() => setSelectedStorage(s.id)}
              className="press"
              style={{ padding:"12px 14px", borderRadius:"12px", cursor:"pointer",
                border: isAct ? "2px solid var(--cp)" : "2px solid var(--bd)",
                background: isAct ? "var(--cp-pale)" : "var(--bg-m)",
                transition:"all .15s" }}>
              <div style={{ fontWeight:700, fontSize:"13px", color:"var(--tx)", marginBottom:"4px" }}>
                🏭 {s.name}
              </div>
              <div style={{ fontSize:"11px", color:"var(--tx-m)", marginBottom:"6px" }}>
                {s.district || s.state || "—"}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:"11px", background:"var(--bg-d)", borderRadius:"6px",
                  padding:"2px 8px", color:"var(--tx-m)" }}>
                  {bks.length} booking{bks.length !== 1 ? "s" : ""}
                </span>
                <span style={{ fontSize:"11px", fontWeight:700,
                  color: pct > 80 ? "var(--danger)" : pct > 50 ? "var(--warn)" : "var(--safe)" }}>
                  {pct}% full
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Right: farmers booked in selected storage */}
      <div>
        {activeStorage && (
          <>
            <div className="card" style={{ padding:"16px 20px", marginBottom:"14px",
              display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"10px" }}>
              <div>
                <div style={{ fontWeight:800, fontSize:"16px", color:"var(--tx)" }}>
                  🏭 {activeStorage.name}
                </div>
                <div style={{ fontSize:"12px", color:"var(--tx-m)", marginTop:"2px" }}>
                  {activeStorage.address || activeStorage.district || "—"} · {activeStorage.state || ""}
                </div>
              </div>
              <div style={{ display:"flex", gap:"10px" }}>
                {[
                  { label:"Capacity", val:`${(activeStorage.total_capacity_kg/1000).toFixed(0)} MT`,   color:"var(--tx)" },
                  { label:"Available", val:`${(activeStorage.available_capacity_kg/1000).toFixed(0)} MT`, color:"var(--safe)" },
                  { label:"Bookings",  val: activeFarmers.length,                                        color:"var(--cp)" },
                ].map(chip => (
                  <div key={chip.label} style={{ textAlign:"center", background:"var(--bg-m)",
                    borderRadius:"10px", padding:"6px 12px", minWidth:"60px" }}>
                    <div style={{ fontFamily:"var(--fm)", fontWeight:700, fontSize:"16px", color:chip.color, lineHeight:1 }}>{chip.val}</div>
                    <div style={{ fontSize:"9px", color:"var(--tx-s)", marginTop:"2px" }}>{chip.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {activeFarmers.length === 0 ? (
              <div className="card" style={{ padding:"40px", textAlign:"center" }}>
                <div style={{ fontSize:"2.5rem", marginBottom:"10px" }}>👨‍🌾</div>
                <div style={{ fontWeight:700, fontSize:"15px", color:"var(--tx)" }}>No bookings yet</div>
                <div style={{ fontSize:"13px", color:"var(--tx-m)", marginTop:"4px" }}>
                  Farmers who book this storage will appear here.
                </div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                {activeFarmers.map((bk, idx) => (
                  <div key={bk.id} className="card anim-fadeup"
                    style={{ padding:"14px 16px", animationDelay:`${idx*0.04}s` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
                      <div style={{ width:"42px", height:"42px", borderRadius:"50%",
                        background:"var(--cp-pale)", display:"flex", alignItems:"center",
                        justifyContent:"center", fontSize:"16px", fontWeight:800,
                        color:"var(--cp)", flexShrink:0 }}>
                        {bk.farmer_name?.charAt(0)?.toUpperCase() || "F"}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:"14px", color:"var(--tx)" }}>
                          {bk.farmer_name}
                        </div>
                        <div style={{ fontSize:"11px", color:"var(--tx-s)" }}>
                          📞 {bk.farmer_phone} · #{bk.id}
                        </div>
                        <div style={{ fontSize:"11px", color:"var(--tx-m)", marginTop:"2px" }}>
                          {bk.crop_type} · {bk.quantity_kg} kg · {bk.pickup_date?.split("T")[0] || "—"}
                        </div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"6px", flexShrink:0 }}>
                        <span style={{ fontSize:"11px", fontWeight:700, padding:"3px 10px",
                          borderRadius:"99px", background: `${statusColor[bk.status]}18`,
                          color: statusColor[bk.status], textTransform:"capitalize" }}>
                          {bk.status}
                        </span>
                        <span style={{ fontSize:"12px", fontWeight:600, color:"var(--tx)" }}>
                          ₹{parseFloat(bk.total_price||0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Connected Farmers ─────────────────────────────────────────────────────
function ConnectedFarmers() {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoad]    = useState(true);
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await operatorAPI.getConnectedFarmers();
        setFarmers(data.farmers || []);
      } catch { setFarmers([]); } finally { setLoad(false); }
    })();
  }, []);

  const filtered = farmers.filter(f =>
    !search || f.name?.toLowerCase().includes(search.toLowerCase()) || f.phone?.includes(search)
  );
  const totalKg = farmers.reduce((s, f) => s + parseFloat(f.total_kg_stored || 0), 0);

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"12px", marginBottom:"20px" }}>
        {[
          { icon:"👨‍🌾", label:"Connected Farmers", val:farmers.length },
          { icon:"📦", label:"Total Kg Stored",    val:`${(totalKg/1000).toFixed(1)} MT` },
          { icon:"✅", label:"Active Bookings",    val:farmers.reduce((s,f)=>s+parseInt(f.total_bookings||0),0) },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:"14px 16px", textAlign:"center" }}>
            <div style={{ fontSize:"1.3rem", marginBottom:"4px" }}>{s.icon}</div>
            <div style={{ fontFamily:"var(--fm)", fontWeight:800, fontSize:"20px", color:"var(--tx)", lineHeight:1 }}>{s.val}</div>
            <div style={{ fontSize:"10px", color:"var(--tx-s)", marginTop:"3px" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <input className="inp" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Search by name or phone…" style={{ width:"100%", marginBottom:"16px" }} />
      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {[1,2,3].map(i => <div key={i} className="skel" style={{ height:"80px" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding:"40px", textAlign:"center" }}>
          <div style={{ fontSize:"2.5rem", marginBottom:"10px" }}>👨‍🌾</div>
          <div style={{ fontWeight:700, fontSize:"15px", color:"var(--tx)" }}>No farmers found</div>
          <div style={{ fontSize:"13px", color:"var(--tx-m)", marginTop:"4px" }}>
            Farmers who have confirmed/paid bookings will appear here.
          </div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {filtered.map((f, idx) => (
            <div key={f.id} className="card anim-fadeup" style={{
              padding:"14px 16px", display:"flex", alignItems:"center", gap:"14px",
              animationDelay:`${idx*0.05}s`,
            }}>
              <div style={{ width:"42px", height:"42px", borderRadius:"50%", background:"var(--cp-pale)",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px",
                fontWeight:800, color:"var(--cp)", flexShrink:0 }}>
                {f.name?.charAt(0)?.toUpperCase() || "F"}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:"14px", color:"var(--tx)" }}>{f.name}</div>
                <div style={{ fontSize:"11px", color:"var(--tx-s)" }}>📞 {f.phone}</div>
                <div style={{ fontSize:"11px", color:"var(--tx-s)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  🏭 {f.storage_names}
                </div>
              </div>
              <div style={{ display:"flex", gap:"8px", flexShrink:0 }}>
                {[
                  { label:"Bookings", val:f.total_bookings, color:"var(--cp)" },
                  { label:"MT stored", val:(parseFloat(f.total_kg_stored||0)/1000).toFixed(1), color:"var(--safe)" },
                ].map(chip => (
                  <div key={chip.label} style={{ textAlign:"center", background:"var(--bg-m)",
                    borderRadius:"8px", padding:"5px 10px", minWidth:"55px" }}>
                    <div style={{ fontFamily:"var(--fm)", fontWeight:700, fontSize:"14px", color:chip.color }}>{chip.val}</div>
                    <div style={{ fontSize:"9px", color:"var(--tx-s)" }}>{chip.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function OperatorPage() {
  const [data,        setData]       = useState(null);
  const [loading,     setLoad]       = useState(true);
  const [toasts,      setToasts]     = useState([]);
  const [activeTab,   setTab]        = useState("dashboard");
  const [cityFilter,  setCity]       = useState("");
  const [stateFilter, setState]      = useState("");
  const [deliveryBoys,setDelivBoys]  = useState([]);
  const [assignOrder, setAssignOrder]= useState(null);

  const addToast = msg => {
    const id = Date.now();
    setToasts(t => [...t, {id, msg}]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  };

  const load = useCallback(async () => {
    setLoad(true);
    try {
      const { data: d } = await operatorAPI.dashboard();
      setData(d);
    } catch {
      setData({ storages:[], pending_bookings:[], confirmed_bookings:[], paid_bookings:[], customer_orders:[], stats:{} });
    } finally { setLoad(false); }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // live capacity refresh every 30s
    return () => clearInterval(interval);
  }, [load]);

  // Load delivery boys once
  useEffect(() => {
    operatorAPI.getDeliveryBoys()
      .then(({ data }) => setDelivBoys(data.delivery_boys || []))
      .catch(() => setDelivBoys([]));
  }, []);

  const stats    = data?.stats             || {};
  const storages = data?.storages          || [];
  const pending  = data?.pending_bookings  || [];
  const confirmed= data?.confirmed_bookings|| [];
  const paid     = data?.paid_bookings     || [];
  const orders   = data?.customer_orders   || [];
  const totalMT  = ((stats.total_capacity_kg||0)/1000).toFixed(0);
  const availMT  = ((stats.available_capacity_kg||0)/1000).toFixed(0);

  const filteredStorages = storages.filter(s => {
    if (cityFilter  && !s.district?.toLowerCase().includes(cityFilter.toLowerCase())) return false;
    if (stateFilter && s.state !== stateFilter) return false;
    return true;
  });

  const TAB = (id, label, count) => (
    <button
      style={{
        padding:"8px 16px", borderRadius:"8px", border:"none", cursor:"pointer",
        fontSize:"12px", fontWeight:700, transition:"all .15s",
        background: activeTab === id ? "var(--cp)" : "transparent",
        color:      activeTab === id ? "#fff" : "var(--tx-m)",
        display:"flex", alignItems:"center", gap:"6px",
      }}
      onClick={() => setTab(id)}>
      {label}
      {count > 0 && (
        <span style={{ background: activeTab===id ? "rgba(255,255,255,.3)" : "var(--cp-pale)",
          color: activeTab===id ? "#fff" : "var(--cp)", borderRadius:"99px", padding:"1px 6px", fontSize:"10px" }}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div style={{ maxWidth:"1000px", margin:"0 auto", padding:"24px 20px" }}>

      {/* Header */}
      <div style={{ marginBottom:"24px" }} className="anim-fadeup">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
          flexWrap:"wrap", gap:"12px" }}>
          <div>
            <h1 style={{ fontSize:"22px", fontWeight:800, color:"var(--tx)", display:"flex", alignItems:"center", gap:"10px" }}>
              Operator Dashboard
              <span style={{ fontSize:"10px", fontWeight:700, color:"var(--cp)",
                background:"rgba(56,189,248,.12)", border:"1px solid rgba(56,189,248,.3)",
                borderRadius:"99px", padding:"2px 10px", display:"flex", alignItems:"center", gap:"5px" }}>
                <span style={{ width:"6px", height:"6px", borderRadius:"50%", background:"var(--cp)",
                  display:"inline-block", animation:"ping 1.5s ease-in-out infinite" }}/>
                Live
              </span>
            </h1>
            <p style={{ fontSize:"13px", color:"var(--tx-m)", marginTop:"3px" }}>
              Manage bookings, payments, and deliveries.
            </p>
          </div>
          <div style={{ display:"flex", gap:"4px", background:"var(--bg-m)", borderRadius:"10px", padding:"4px", flexWrap:"wrap" }}>
            {TAB("dashboard", "📊 Dashboard", 0)}
            {TAB("pending",   "⏳ Pending",    pending.length)}
            {TAB("confirmed", "✅ Confirmed",   confirmed.length)}
            {TAB("paid",      "💰 Paid",        paid.length)}
            {TAB("orders",    "🛒 Orders",      orders.length)}
            {TAB("booked",    "🌾 Booked Farmers", pending.length + confirmed.length + paid.length)}
            {TAB("farmers",   "👨‍🌾 All Farmers",    0)}
          </div>
        </div>
      </div>

      {/* ── DASHBOARD ── */}
      {activeTab === "dashboard" && (
        <>
          {/* Stats row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"10px", marginBottom:"20px" }}>
            {[
              { icon:"⏳", label:"Pending",   val:pending.length,   color:"var(--warn)" },
              { icon:"✅", label:"Confirmed", val:confirmed.length, color:"var(--info)" },
              { icon:"💰", label:"Paid",      val:paid.length,      color:"var(--safe)" },
              { icon:"📦", label:"Revenue",   val:`₹${(stats.paid_revenue||0).toLocaleString("en-IN")}`, color:"var(--safe)" },
            ].map(s => (
              <div key={s.label} className="card anim-fadeup" style={{ padding:"14px 16px", textAlign:"center" }}>
                <div style={{ fontSize:"1.2rem", marginBottom:"2px" }}>{s.icon}</div>
                <div style={{ fontFamily:"var(--fm)", fontWeight:800, fontSize:"18px", color:s.color, lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:"10px", color:"var(--tx-s)", marginTop:"3px" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Capacity + chart */}
          <div className="card anim-fadeup d1" style={{ marginBottom:"20px", padding:0, display:"grid",
            gridTemplateColumns:"1fr 1fr", overflow:"hidden" }}>
            <div style={{ padding:"20px 24px", borderRight:"1px solid var(--bd)" }}>
              <div style={{ fontSize:"11px", fontWeight:700, textTransform:"uppercase",
                letterSpacing:".6px", color:"var(--tx-s)", marginBottom:"16px" }}>
                Storage Capacity Overview
              </div>
              <div style={{ display:"flex", gap:"24px", justifyContent:"space-around" }}>
                {storages.slice(0,3).map(s => (
                  <CapacityDonut key={s.id}
                    total={parseFloat(s.total_capacity_kg||0)}
                    available={parseFloat(s.available_capacity_kg||0)}
                    label={s.name.split(" ")[0]} />
                ))}
                {storages.length === 0 && <CapacityDonut total={100} available={45} label="Demo" />}
              </div>
              <div style={{ marginTop:"16px", display:"flex", gap:"20px", justifyContent:"center" }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontFamily:"var(--fm)", fontWeight:700, fontSize:"20px", color:"var(--tx)" }}>{totalMT} MT</div>
                  <div style={{ fontSize:"10px", color:"var(--tx-s)" }}>Total</div>
                </div>
                <div style={{ width:"1px", background:"var(--bd)" }}/>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontFamily:"var(--fm)", fontWeight:700, fontSize:"20px", color:"var(--safe)" }}>{availMT} MT</div>
                  <div style={{ fontSize:"10px", color:"var(--tx-s)" }}>Available</div>
                </div>
              </div>
            </div>
            <UtilizationChart storages={storages} />
          </div>

          {/* Pending bookings preview */}
          <div style={{ marginBottom:"20px" }}>
            <div style={{ fontSize:"13px", fontWeight:700, color:"var(--tx)", marginBottom:"12px" }}>
              Recent Pending Bookings
              {pending.length > 0 && <span style={{ fontSize:"12px", color:"var(--tx-m)" }}> · {pending.length} need action</span>}
            </div>
            {loading ? (
              <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                {[1,2].map(i => <div key={i} className="skel" style={{ height:"130px" }} />)}
              </div>
            ) : pending.length === 0 ? (
              <div className="card" style={{ padding:"32px", textAlign:"center" }}>
                <div style={{ fontSize:"2.5rem", marginBottom:"8px" }}>✅</div>
                <div style={{ fontWeight:700, color:"var(--tx)" }}>All caught up!</div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                {pending.slice(0,3).map(bk => <BookingCard key={bk.id} booking={bk} onUpdate={load} />)}
                {pending.length > 3 && (
                  <button className="btn btn-ghost" onClick={() => setTab("pending")}
                    style={{ alignSelf:"flex-start", fontSize:"12px" }}>
                    View all {pending.length} pending →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Storages */}
          {storages.length > 0 && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                marginBottom:"12px", flexWrap:"wrap", gap:"8px" }}>
                <div style={{ fontSize:"13px", fontWeight:700, color:"var(--tx)" }}>My Storages</div>
                <div style={{ display:"flex", gap:"8px" }}>
                  <input className="inp" value={cityFilter} onChange={e => setCity(e.target.value)}
                    placeholder="Filter by city…" style={{ padding:"5px 10px", fontSize:"12px", width:"130px" }} />
                  <select className="inp" value={stateFilter} onChange={e => setState(e.target.value)}
                    style={{ padding:"5px 10px", fontSize:"12px" }}>
                    <option value="">All States</option>
                    {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {(cityFilter || stateFilter) && (
                    <button className="btn btn-ghost" onClick={() => { setCity(""); setState(""); }}
                      style={{ padding:"5px 10px", fontSize:"12px" }}>✕</button>
                  )}
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                {filteredStorages.map(s => <StorageUpdateForm key={s.id} storage={s} onUpdate={load} />)}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── PENDING ── */}
      {activeTab === "pending" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          {pending.length === 0 ? (
            <div className="card" style={{ padding:"40px", textAlign:"center" }}>
              <div style={{ fontSize:"2.5rem", marginBottom:"8px" }}>✅</div>
              <div style={{ fontWeight:700 }}>No pending bookings</div>
            </div>
          ) : pending.map(bk => <BookingCard key={bk.id} booking={bk} onUpdate={() => { load(); addToast("Booking updated."); }} />)}
        </div>
      )}

      {/* ── CONFIRMED (awaiting payment) ── */}
      {activeTab === "confirmed" && (
        <div>
          <div style={{ background:"rgba(59,130,246,.08)", border:"1px solid rgba(59,130,246,.2)",
            borderRadius:"10px", padding:"10px 14px", fontSize:"12px", color:"#2563EB",
            marginBottom:"16px" }}>
            ℹ️ These bookings are confirmed and awaiting payment from the farmer.
          </div>
          {confirmed.length === 0 ? (
            <div className="card" style={{ padding:"40px", textAlign:"center" }}>
              <div style={{ fontSize:"2rem", marginBottom:"8px" }}>✅</div>
              <div style={{ fontWeight:700 }}>No confirmed bookings awaiting payment</div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              {confirmed.map(b => (
                <div key={b.id} className="card" style={{ padding:"14px 16px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
                    gap:"10px", flexWrap:"wrap" }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:"14px", color:"var(--tx)", marginBottom:"2px" }}>
                        {b.storage_name} <span style={{ color:"var(--tx-m)", fontWeight:400 }}>#{b.id}</span>
                      </div>
                      <div style={{ fontSize:"12px", color:"var(--tx-m)" }}>{b.farmer_name} · {b.farmer_phone}</div>
                    </div>
                    <span className="badge badge-info">Awaiting Payment</span>
                  </div>
                  <div style={{ fontSize:"12px", color:"var(--tx-m)", marginTop:"8px" }}>
                    {b.crop_type} · {b.quantity_kg} kg · ₹{parseFloat(b.total_price||0).toLocaleString("en-IN")} · {b.pickup_date?.split("T")[0]}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PAID ── */}
      {activeTab === "paid" && (
        <div>
          <div style={{ background:"rgba(22,163,74,.08)", border:"1px solid rgba(22,163,74,.2)",
            borderRadius:"10px", padding:"10px 14px", fontSize:"12px", color:"var(--safe)",
            marginBottom:"16px", display:"flex", justifyContent:"space-between" }}>
            <span>✅ Payments received from farmers</span>
            <strong>Total: ₹{(stats.paid_revenue||0).toLocaleString("en-IN")}</strong>
          </div>
          <PaidBookingsPanel bookings={paid} />
        </div>
      )}

      {/* ── ORDERS ── */}
      {activeTab === "orders" && (
        <div>
          <CustomerOrdersPanel orders={orders} onAssign={setAssignOrder} />
        </div>
      )}

      {/* ── BOOKED FARMERS PER STORAGE ── */}
      {activeTab === "booked" && (
        <div>
          <div style={{ fontSize:"13px", fontWeight:700, color:"var(--tx)", marginBottom:"16px" }}>
            Booked Farmers by Storage
            <span style={{ fontSize:"12px", fontWeight:400, color:"var(--tx-m)", marginLeft:"8px" }}>
              · Select a storage to see which farmers have booked it
            </span>
          </div>
          <BookedFarmersPerStorage
            storages={storages}
            pending={pending}
            confirmed={confirmed}
            paid={paid}
          />
        </div>
      )}

      {/* ── FARMERS ── */}
      {activeTab === "farmers" && <ConnectedFarmers />}

      {/* Assign delivery modal */}
      {assignOrder && (
        <AssignDeliveryModal
          order={assignOrder}
          deliveryBoys={deliveryBoys}
          onClose={() => setAssignOrder(null)}
          onAssigned={() => { load(); addToast("Delivery boy assigned!"); }}
        />
      )}

      {/* Toasts */}
      <div style={{ position:"fixed", bottom:"24px", right:"24px", zIndex:9999,
        display:"flex", flexDirection:"column", gap:"8px" }}>
        {toasts.map(t => <div key={t.id} className="toast">{t.msg}</div>)}
      </div>
    </div>
  );
}
