// pages/customer/CustomerOrders.js — v3: stepper tracking, graphical stats, notification panel
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { customerAPI } from "../../services/api";

// ── Order Stepper ───────────────────────────────────────────────
function OrderStepper({ status }) {
  const STEPS = [
    { key:"booked",    label:"Order Placed",    icon:"📋" },
    { key:"pending",   label:"Awaiting Review", icon:"⏳" },
    { key:"confirmed", label:"Confirmed",        icon:"✅" },
    { key:"delivered", label:"Delivered",        icon:"📦" },
  ];

  const ORDER = { booked:0, pending:1, confirmed:2, delivered:3 };
  const CANCELLED_OR_REJECTED = ["cancelled","rejected"].includes(status);
  const activeIdx = CANCELLED_OR_REJECTED ? -1 : (ORDER[status] ?? 1);

  if (CANCELLED_OR_REJECTED) {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"12px 0" }}>
        <div className="step-dot" style={{ background:"var(--danger-bg)", color:"var(--danger)",
          width:"32px", height:"32px", borderRadius:"50%", display:"flex",
          alignItems:"center", justifyContent:"center", fontSize:"14px" }}>✗</div>
        <span style={{ fontSize:"13px", fontWeight:600, color:"var(--danger)" }}>
          {status === "cancelled" ? "Cancelled" : "Rejected"} — refund processing
        </span>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", alignItems:"center", padding:"12px 0", gap:0 }}>
      {STEPS.map((step, i) => {
        const done   = i < activeIdx;
        const active = i === activeIdx;
        return (
          <div key={step.key} style={{ display:"flex", alignItems:"center", flex: i<STEPS.length-1 ? 1 : 0 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"4px" }}>
              <div style={{
                width:"32px", height:"32px", borderRadius:"50%",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize: done||active ? "14px" : "11px", fontWeight:700,
                background: done ? "var(--safe)" : active ? "var(--cp)" : "var(--bg-m)",
                color: done||active ? "#fff" : "var(--tx-s)",
                boxShadow: active ? `0 0 0 4px var(--cp-glow)` : "none",
                transition:"all .3s", flexShrink:0,
              }}>
                {done ? "✓" : active ? step.icon : i+1}
              </div>
              <span style={{ fontSize:"9px", fontWeight: active ? 700 : 500,
                color: active ? "var(--cp)" : done ? "var(--safe)" : "var(--tx-s)",
                textAlign:"center", whiteSpace:"nowrap" }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length-1 && (
              <div style={{ flex:1, height:"2px", background: done ? "var(--safe)" : "var(--bg-d)",
                margin:"0 4px", marginBottom:"20px", transition:"background .3s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Notification Panel ──────────────────────────────────────────
function NotificationPanel({ notifications, onClose, onMarkRead }) {
  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:8999, background:"rgba(0,0,0,.2)" }}/>
      {/* Panel */}
      <div className="notif-panel" style={{ zIndex:9000 }}>
        <div style={{ padding:"20px 20px 16px", borderBottom:"1px solid var(--bd)",
          display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <h3 style={{ fontSize:"16px", fontWeight:700, color:"var(--tx)" }}>Notifications</h3>
            <p style={{ fontSize:"12px", color:"var(--tx-m)", marginTop:"2px" }}>
              {notifications.filter(n=>!n.is_read).length} unread
            </p>
          </div>
          <div style={{ display:"flex", gap:"8px" }}>
            {notifications.some(n=>!n.is_read) && (
              <button className="btn btn-ghost" onClick={onMarkRead}
                style={{ fontSize:"11px", padding:"5px 10px" }}>
                Mark all read
              </button>
            )}
            <button onClick={onClose}
              style={{ background:"var(--bg-m)", border:"none", borderRadius:"7px",
                width:"30px", height:"30px", cursor:"pointer", color:"var(--tx-m)", fontSize:"16px" }}>
              ✕
            </button>
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"10px" }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 20px", color:"var(--tx-m)" }}>
              <div style={{ fontSize:"2rem", marginBottom:"8px" }}>🔔</div>
              <div style={{ fontSize:"13px" }}>No notifications yet</div>
            </div>
          ) : notifications.map(n => (
            <div key={n.id} style={{
              padding:"12px 14px", borderRadius:"10px", marginBottom:"6px",
              background: n.is_read ? "transparent" : "var(--cp-pale)",
              border:`1px solid ${n.is_read ? "var(--bd)" : "rgba(var(--cp),.2)"}`,
              cursor:"pointer", transition:"background .15s"
            }} onClick={() => onMarkRead(n.id)}>
              <div style={{ fontWeight: n.is_read ? 500 : 700, fontSize:"13px",
                color:"var(--tx)", marginBottom:"3px" }}>{n.title}</div>
              <div style={{ fontSize:"12px", color:"var(--tx-m)", lineHeight:1.5 }}>{n.message}</div>
              {n.created_at && (
                <div style={{ fontSize:"10px", color:"var(--tx-s)", marginTop:"4px" }}>
                  {new Date(n.created_at).toLocaleString("en-IN",{ dateStyle:"medium", timeStyle:"short" })}
                </div>
              )}
              {!n.is_read && (
                <div style={{ width:"6px", height:"6px", borderRadius:"50%",
                  background:"var(--cp)", float:"right", marginTop:"-20px" }}/>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Donut chart for order stats ─────────────────────────────────
function OrderDonut({ orders }) {
  const conf   = orders.filter(o=>o.status==="confirmed"||o.status==="delivered").length;
  const pend   = orders.filter(o=>o.status==="pending").length;
  const other  = orders.length - conf - pend;
  const total  = Math.max(orders.length, 1);
  const r = 36; const circum = 2*Math.PI*r;

  const segments = [
    { val:conf/total,  color:"#16A34A" },
    { val:pend/total,  color:"#D97706" },
    { val:other/total, color:"#E5E7EB" },
  ];
  let offset = 0;
  const arcs = segments.map(s => {
    const arc = { ...s, offset };
    offset += s.val * circum;
    return arc;
  });

  return (
    <div style={{ display:"flex", alignItems:"center", gap:"20px" }}>
      <div style={{ position:"relative", flexShrink:0 }}>
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={r} fill="none" stroke="var(--bg-d)" strokeWidth="8"/>
          {arcs.map((arc, i) => (
            <circle key={i} cx="44" cy="44" r={r} fill="none"
              stroke={arc.color} strokeWidth="8"
              strokeDasharray={`${arc.val*circum} ${circum - arc.val*circum}`}
              strokeDashoffset={-arc.offset}
              style={{ transform:"rotate(-90deg)", transformOrigin:"center" }}
            />
          ))}
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontFamily:"var(--fm)", fontWeight:700, fontSize:"18px", color:"var(--tx)", lineHeight:1 }}>
            {orders.length}
          </span>
          <span style={{ fontSize:"9px", color:"var(--tx-s)" }}>total</span>
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
        {[
          { label:"Confirmed",  val:conf,  color:"#16A34A" },
          { label:"Pending",    val:pend,  color:"#D97706" },
          { label:"Other",      val:other, color:"#9CA3AF" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ display:"flex", alignItems:"center", gap:"6px" }}>
            <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:color }}/>
            <span style={{ fontSize:"12px", color:"var(--tx-m)" }}>{label}</span>
            <span style={{ fontFamily:"var(--fm)", fontWeight:700, fontSize:"12px",
              color:"var(--tx)", marginLeft:"auto" }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function CustomerOrders() {
  const navigate = useNavigate();
  const [orders,        setOrders]        = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [filter,        setFilter]        = useState("all");
  const [loading,       setLoading]       = useState(true);
  const [showNotifs,    setShowNotifs]    = useState(false);
  const [expanded,      setExpanded]      = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordRes, notifRes] = await Promise.allSettled([
        customerAPI.getOrders(),
        customerAPI.getNotifications(),
      ]);
      if (ordRes.status === "fulfilled") setOrders(ordRes.value.data.orders || []);
      if (notifRes.status === "fulfilled") setNotifications(notifRes.value.data.notifications || []);
    } catch {
      setOrders([
        { id:1, product_name:"Fresh Tomatoes",   status:"confirmed", total_amount:1960,
          quantity_kg:50, storage_name:"GreenGrain Cold Store", district:"Kolhapur",
          delivery_date:"2026-04-22", delivery_address:"12 MG Road, Pune", created_at:"2026-04-18T10:30:00" },
        { id:2, product_name:"Alphonso Mangoes", status:"pending",   total_amount:2400,
          quantity_kg:20, storage_name:"FreshChain Storage", district:"Kolhapur",
          delivery_date:"2026-04-25", delivery_address:"45 Link Road, Mumbai", created_at:"2026-04-19T09:00:00" },
        { id:3, product_name:"Table Grapes",     status:"rejected",  total_amount:1950,
          quantity_kg:30, storage_name:"Vaibhav Cold Warehouse", district:"Kolhapur",
          operator_notes:"Storage temporarily unavailable",
          delivery_date:"2026-04-21", delivery_address:"8 Civil Lines, Nashik", created_at:"2026-04-17T14:00:00" },
      ]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const markAllRead = async () => {
    await Promise.allSettled(notifications.filter(n=>!n.is_read).map(n=>customerAPI.markRead(n.id)));
    setNotifications(ns => ns.map(n => ({ ...n, is_read: true })));
  };
  const markOneRead = async (id) => {
    if (typeof id === "number") await customerAPI.markRead(id).catch(()=>{});
    setNotifications(ns => ns.map(n => n.id===id ? {...n, is_read:true} : n));
  };

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);
  const unread   = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ maxWidth:"900px", margin:"0 auto", padding:"24px 20px" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        marginBottom:"24px", flexWrap:"wrap", gap:"12px" }} className="anim-fadeup">
        <div>
          <h1 style={{ fontSize:"22px", fontWeight:800, color:"var(--tx)" }}>My Orders</h1>
          <p style={{ fontSize:"13px", color:"var(--tx-m)", marginTop:"3px" }}>
            Track purchases and delivery status.
          </p>
        </div>
        {/* Bell button */}
        <button onClick={() => setShowNotifs(v=>!v)}
          style={{ position:"relative", background:"var(--bg-l)", border:"1.5px solid var(--bd)",
            borderRadius:"10px", padding:"9px 14px", cursor:"pointer",
            display:"flex", alignItems:"center", gap:"7px",
            fontSize:"13px", fontWeight:600, color:"var(--tx)",
            boxShadow:"var(--sh2)" }}>
          🔔
          <span>Notifications</span>
          {unread > 0 && (
            <span style={{ position:"absolute", top:"-6px", right:"-6px",
              background:"var(--danger)", color:"#fff", borderRadius:"50%",
              width:"18px", height:"18px", fontSize:"10px", fontWeight:800,
              display:"flex", alignItems:"center", justifyContent:"center",
              border:"2px solid var(--bg)" }}>
              {unread}
            </span>
          )}
        </button>
      </div>

      {/* Stats: order donut + pending counter */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"20px" }}>
        <div className="card anim-fadeup d1" style={{ padding:"20px 24px" }}>
          <div style={{ fontSize:"11px", fontWeight:700, textTransform:"uppercase",
            letterSpacing:".6px", color:"var(--tx-s)", marginBottom:"14px" }}>Order Summary</div>
          <OrderDonut orders={orders} />
        </div>
        <div className="card anim-fadeup d2" style={{ padding:"20px 24px" }}>
          <div style={{ fontSize:"11px", fontWeight:700, textTransform:"uppercase",
            letterSpacing:".6px", color:"var(--tx-s)", marginBottom:"14px" }}>
            Recent Activity
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            {orders.slice(0,3).map(o => (
              <div key={o.id} onClick={() => setExpanded(expanded===o.id ? null : o.id)}
                style={{ display:"flex", alignItems:"center", gap:"10px", padding:"8px 10px",
                  background:"var(--bg-m)", borderRadius:"8px", cursor:"pointer",
                  transition:"background .15s" }}>
                <span style={{ fontSize:"16px" }}>
                  {o.status==="confirmed"||o.status==="delivered" ? "✅" : o.status==="pending" ? "⏳" : "✗"}
                </span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:"12px", fontWeight:600, color:"var(--tx)",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {o.product_name}
                  </div>
                  <div style={{ fontSize:"10px", color:"var(--tx-s)" }}>
                    ₹{parseFloat(o.total_amount||0).toLocaleString("en-IN")}
                  </div>
                </div>
                <span className={`badge badge-${o.status==="confirmed"?"safe":o.status==="pending"?"warn":"neutral"}`}
                  style={{ fontSize:"9px" }}>
                  {o.status}
                </span>
              </div>
            ))}
            {orders.length === 0 && (
              <div style={{ textAlign:"center", padding:"16px", color:"var(--tx-s)", fontSize:"12px" }}>
                No recent orders
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"16px" }}>
        {["all","pending","confirmed","delivered","rejected","cancelled"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`btn ${filter===f ? "btn-primary" : "btn-ghost"}`}
            style={{ fontSize:"11px", padding:"5px 14px", textTransform:"capitalize" }}>
            {f==="all" ? `All (${orders.length})` : `${f} (${orders.filter(o=>o.status===f).length})`}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          {[1,2,3].map(i=><div key={i} className="skel" style={{ height:"100px" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding:"40px", textAlign:"center" }}>
          <div style={{ fontSize:"2.5rem", marginBottom:"10px" }}>📋</div>
          <div style={{ fontSize:"15px", fontWeight:700, color:"var(--tx)" }}>No orders found</div>
        </div>
      ) : filtered.map((order, idx) => {
        const isOpen = expanded === order.id;
        return (
          <div key={order.id} className="card anim-fadeup" style={{
            marginBottom:"12px", padding:"16px 18px",
            animationDelay:`${idx*.06}s`,
            border: order.status==="rejected" ? "1.5px solid rgba(220,38,38,.25)" : "1.5px solid var(--bd)",
          }}>
            {/* Row header */}
            <div onClick={() => setExpanded(isOpen ? null : order.id)}
              style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                cursor:"pointer", gap:"10px", flexWrap:"wrap", marginBottom: isOpen ? "14px" : 0 }}>
              <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
                <span style={{ fontFamily:"var(--fm)", fontWeight:600, fontSize:"13px",
                  color:"var(--cp)" }}>#{order.id}</span>
                <div>
                  <div style={{ fontSize:"14px", fontWeight:700, color:"var(--tx)" }}>
                    {order.product_name}
                  </div>
                  <div style={{ fontSize:"11px", color:"var(--tx-m)" }}>
                    🏭 {order.storage_name}
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
                <span style={{ fontFamily:"var(--fm)", fontWeight:700, fontSize:"15px", color:"var(--tx)" }}>
                  ₹{parseFloat(order.total_amount||0).toLocaleString("en-IN")}
                </span>
                <span className={`badge badge-${
                  order.status==="confirmed"||order.status==="delivered" ? "safe"
                  : order.status==="pending" ? "warn"
                  : order.status==="rejected" ? "danger" : "neutral"
                }`}>{order.status}</span>
                <span style={{ color:"var(--tx-s)", transition:"transform .2s",
                  transform: isOpen ? "rotate(180deg)" : "none" }}>▼</span>
              </div>
            </div>

            {/* Expanded: stepper + details */}
            {isOpen && (
              <div className="anim-fade">
                <div style={{ borderTop:"1px solid var(--bd)", paddingTop:"14px", marginBottom:"12px" }}>
                  <OrderStepper status={order.status} />
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"12px" }}>
                  {[
                    ["Quantity",  `${order.quantity_kg} kg`],
                    ["Delivery",  order.delivery_date ? new Date(order.delivery_date).toLocaleDateString("en-IN") : "—"],
                    ["Storage",   order.storage_name || "—"],
                    ["Ordered",   order.created_at ? new Date(order.created_at).toLocaleDateString("en-IN") : "—"],
                  ].map(([k,v]) => (
                    <div key={k} style={{ background:"var(--bg-m)", borderRadius:"8px", padding:"8px 12px" }}>
                      <div style={{ fontSize:"10px", color:"var(--tx-s)", marginBottom:"3px" }}>{k}</div>
                      <div style={{ fontSize:"13px", fontWeight:600, color:"var(--tx)" }}>{v}</div>
                    </div>
                  ))}
                </div>

                {order.delivery_address && (
                  <div style={{ background:"var(--bg-m)", borderRadius:"8px", padding:"8px 12px",
                    fontSize:"12px", color:"var(--tx)", marginBottom:"8px" }}>
                    📍 {order.delivery_address}
                  </div>
                )}

                {order.status === "rejected" && (
                  <div style={{ background:"var(--danger-bg)", borderRadius:"8px",
                    padding:"10px 12px", fontSize:"12px", color:"var(--danger)" }}>
                    {order.operator_notes && <div style={{ marginBottom:"4px" }}>Reason: {order.operator_notes}</div>}
                    <div style={{ fontWeight:600 }}>
                      💰 Refund of ₹{parseFloat(order.total_amount||0).toLocaleString("en-IN")} processing in 3–5 days.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Refresh */}
      <div style={{ textAlign:"center", marginTop:"20px" }}>
        <button className="btn btn-ghost" onClick={loadData} style={{ fontSize:"12px" }}>
          ↻ Refresh
        </button>
      </div>

      {/* Notification panel */}
      {showNotifs && (
        <NotificationPanel
          notifications={notifications}
          onClose={() => setShowNotifs(false)}
          onMarkRead={markOneRead}
        />
      )}
    </div>
  );
}
