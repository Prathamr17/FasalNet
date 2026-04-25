// pages/farmer/FarmerOrders.js — Customer orders for farmer's products
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { farmerAPI } from "../../services/api";

function StatusBadge({ status }) {
  const map = {
    pending:    { class:"badge-warn",    label:"Pending" },
    confirmed:  { class:"badge-safe",    label:"Confirmed" },
    in_transit: { class:"badge-info",    label:"In Transit" },
    delivered:  { class:"badge-safe",    label:"Delivered" },
    rejected:   { class:"badge-danger",  label:"Rejected" },
    cancelled:  { class:"badge-neutral", label:"Cancelled" },
  };
  const cfg = map[status] || map.pending;
  return <span className={`badge ${cfg.class}`}>{cfg.label}</span>;
}

export default function FarmerOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, pending, confirmed, delivered

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data } = await farmerAPI.getCustomerOrders();
      setOrders(data.orders || []);
    } catch (err) {
      console.error("Failed to load orders:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (filter === "all") return true;
    if (filter === "pending") return o.status === "pending";
    if (filter === "confirmed") return o.status === "confirmed" || o.status === "in_transit";
    if (filter === "delivered") return o.status === "delivered";
    return true;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    confirmed: orders.filter(o => o.status === "confirmed" || o.status === "in_transit").length,
    delivered: orders.filter(o => o.status === "delivered").length,
  };

  return (
    <div style={{ maxWidth:"1000px", margin:"0 auto", padding:"24px 20px" }}>
      {/* Header */}
      <div style={{ marginBottom:"24px" }}>
        <h1 style={{ fontSize:"24px", fontWeight:800, color:"var(--tx)", marginBottom:"6px" }}>
          Customer Orders
        </h1>
        <p style={{ fontSize:"13px", color:"var(--tx-m)" }}>
          Orders placed by customers for your products
        </p>
      </div>

      {/* Stats cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", 
        gap:"12px", marginBottom:"20px" }}>
        {[
          { label:"Total Orders",    value:stats.total,     color:"var(--cp)",     bg:"var(--cp-pale)" },
          { label:"Pending",         value:stats.pending,   color:"var(--warn)",   bg:"var(--warn-bg)" },
          { label:"Active",          value:stats.confirmed, color:"var(--info)",   bg:"var(--info-bg)" },
          { label:"Delivered",       value:stats.delivered, color:"var(--safe)",   bg:"var(--safe-bg)" },
        ].map((stat, i) => (
          <div key={i} className="card" style={{ padding:"16px" }}>
            <div style={{ fontSize:"11px", fontWeight:600, color:"var(--tx-m)", 
              textTransform:"uppercase", letterSpacing:".5px", marginBottom:"6px" }}>
              {stat.label}
            </div>
            <div style={{ fontSize:"28px", fontWeight:800, fontFamily:"var(--fm)", 
              color:stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:"8px", marginBottom:"16px", flexWrap:"wrap" }}>
        {[
          { id:"all",       label:"All Orders",   count:stats.total },
          { id:"pending",   label:"Pending",      count:stats.pending },
          { id:"confirmed", label:"Active",       count:stats.confirmed },
          { id:"delivered", label:"Delivered",    count:stats.delivered },
        ].map(tab => (
          <button key={tab.id} onClick={() => setFilter(tab.id)} style={{
            padding:"8px 16px", borderRadius:"10px", cursor:"pointer",
            border:`1.5px solid ${filter === tab.id ? "var(--cp)" : "var(--bd)"}`,
            background: filter === tab.id ? "var(--cp-pale)" : "var(--bg-l)",
            fontSize:"13px", fontWeight:600,
            color: filter === tab.id ? "var(--cp)" : "var(--tx-m)",
            transition:"all .15s",
          }}>
            {tab.label}
            {tab.count > 0 && (
              <span style={{ marginLeft:"6px", background: filter === tab.id ? "var(--cp)" : "var(--bg-m)",
                color: filter === tab.id ? "#fff" : "var(--tx-m)",
                borderRadius:"99px", padding:"2px 7px", fontSize:"11px", fontWeight:700 }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          {[1,2,3].map(i => <div key={i} className="skel" style={{ height:"140px" }} />)}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card" style={{ padding:"60px 20px", textAlign:"center" }}>
          <div style={{ fontSize:"3rem", marginBottom:"12px" }}>📦</div>
          <div style={{ fontSize:"16px", fontWeight:700, color:"var(--tx)", marginBottom:"6px" }}>
            No {filter !== "all" && filter} orders yet
          </div>
          <p style={{ fontSize:"13px", color:"var(--tx-m)" }}>
            Orders from customers will appear here
          </p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          {filteredOrders.map((order, i) => (
            <div key={order.id} className="card anim-fadeup" 
              style={{ padding:"18px", animationDelay:`${i*.05}s` }}>
              
              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
                marginBottom:"14px", gap:"12px", flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontSize:"15px", fontWeight:700, color:"var(--tx)", marginBottom:"4px" }}>
                    {order.product_name}
                  </div>
                  <div style={{ fontSize:"12px", color:"var(--tx-m)" }}>
                    Order #{order.id} · {new Date(order.created_at).toLocaleDateString("en-IN")}
                  </div>
                </div>
                <StatusBadge status={order.status} />
              </div>

              {/* Customer info */}
              <div style={{ background:"var(--bg-m)", borderRadius:"10px", padding:"12px", marginBottom:"12px" }}>
                <div style={{ fontSize:"11px", fontWeight:600, color:"var(--tx-m)", 
                  textTransform:"uppercase", letterSpacing:".5px", marginBottom:"6px" }}>
                  Customer Details
                </div>
                <div style={{ fontSize:"13px", fontWeight:600, color:"var(--tx)", marginBottom:"2px" }}>
                  👤 {order.customer_name}
                </div>
                <div style={{ fontSize:"12px", color:"var(--tx-m)", marginBottom:"1px" }}>
                  📞 {order.customer_phone}
                </div>
                {order.delivery_address && (
                  <div style={{ fontSize:"12px", color:"var(--tx-m)" }}>
                    📍 {order.delivery_address}
                  </div>
                )}
              </div>

              {/* Order details grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))", 
                gap:"10px", marginBottom:"12px" }}>
                {[
                  { label:"Quantity",       value:`${order.quantity_kg} kg` },
                  { label:"Price/kg",       value:`₹${parseFloat(order.price_per_kg||0).toFixed(2)}` },
                  { label:"Total Amount",   value:`₹${parseFloat(order.total_amount||0).toLocaleString("en-IN")}` },
                  { label:"Delivery Date",  value:order.delivery_date ? 
                    new Date(order.delivery_date).toLocaleDateString("en-IN") : "—" },
                ].map(item => (
                  <div key={item.label} style={{ background:"var(--bg-m)", borderRadius:"8px", padding:"10px" }}>
                    <div style={{ fontSize:"10px", color:"var(--tx-s)", marginBottom:"3px",
                      textTransform:"uppercase", letterSpacing:".5px" }}>
                      {item.label}
                    </div>
                    <div style={{ fontFamily:"var(--fm)", fontSize:"13px", fontWeight:600, color:"var(--tx)" }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery info if assigned */}
              {order.delivery_boy_name && (
                <div style={{ background:"var(--info-bg)", borderRadius:"8px", padding:"10px",
                  border:"1px solid rgba(37,99,235,.2)" }}>
                  <div style={{ fontSize:"11px", fontWeight:600, color:"var(--info)", marginBottom:"3px" }}>
                    🚚 Delivery Assigned
                  </div>
                  <div style={{ fontSize:"12px", color:"var(--tx)" }}>
                    {order.delivery_boy_name} · {order.delivery_boy_phone}
                  </div>
                </div>
              )}

              {/* Notes if any */}
              {order.notes && (
                <div style={{ fontSize:"12px", color:"var(--tx-m)", padding:"10px",
                  background:"var(--bg-m)", borderRadius:"8px", marginTop:"8px" }}>
                  <strong>Note:</strong> {order.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
