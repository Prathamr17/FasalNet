// pages/delivery/DeliveryBoyPage.js — Delivery boy dashboard
import { useState, useEffect } from "react";
import { deliveryAPI } from "../../services/api";

function StatusBadge({ status }) {
  const map = {
    assigned:   { class:"badge-info",    label:"Assigned" },
    picked_up:  { class:"badge-warn",    label:"Picked Up" },
    in_transit: { class:"badge-info",    label:"In Transit" },
    delivered:  { class:"badge-safe",    label:"Delivered" },
    failed:     { class:"badge-danger",  label:"Failed" },
  };
  const cfg = map[status] || map.assigned;
  return <span className={`badge ${cfg.class}`}>{cfg.label}</span>;
}

function DeliveryCard({ delivery, onUpdate }) {
  const [acting, setActing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [paymentConfirm, setPaymentConfirm] = useState(false);

  const handlePickup = async () => {
    setActing(true);
    try {
      await deliveryAPI.updateStatus(delivery.id, "picked_up");
      onUpdate();
    } catch (err) {
      alert("Failed to update status");
    } finally {
      setActing(false);
    }
  };

  const handleInTransit = async () => {
    setActing(true);
    try {
      await deliveryAPI.updateStatus(delivery.id, "in_transit");
      onUpdate();
    } catch (err) {
      alert("Failed to update status");
    } finally {
      setActing(false);
    }
  };

  const handleDeliver = async () => {
    if (!paymentConfirm) {
      alert("Please confirm payment received from customer");
      return;
    }
    setActing(true);
    try {
      await deliveryAPI.completeDelivery(delivery.id, { payment_received: true });
      onUpdate();
    } catch (err) {
      alert("Failed to complete delivery");
    } finally {
      setActing(false);
    }
  };

  const canPickup = delivery.status === "assigned";
  const canTransit = delivery.status === "picked_up";
  const canDeliver = delivery.status === "in_transit";

  return (
    <div className="card" style={{ padding:"18px", opacity: acting ? 0.6 : 1 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        marginBottom:"14px", gap:"12px", flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:"15px", fontWeight:700, color:"var(--tx)", marginBottom:"4px" }}>
            {delivery.product_name}
          </div>
          <div style={{ fontSize:"12px", color:"var(--tx-m)" }}>
            Order #{delivery.order_id} · {delivery.quantity_kg} kg
          </div>
        </div>
        <StatusBadge status={delivery.status} />
      </div>

      {/* Farmer & Customer Info */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"12px" }}>
        <div style={{ background:"var(--bg-m)", borderRadius:"8px", padding:"12px" }}>
          <div style={{ fontSize:"10px", fontWeight:600, color:"var(--tx-m)", 
            textTransform:"uppercase", letterSpacing:".5px", marginBottom:"6px" }}>
            Pickup From
          </div>
          <div style={{ fontSize:"13px", fontWeight:600, color:"var(--tx)", marginBottom:"2px" }}>
            🌾 {delivery.farmer_name}
          </div>
          <div style={{ fontSize:"12px", color:"var(--tx-m)" }}>
            📞 {delivery.farmer_phone}
          </div>
          {delivery.storage_address && (
            <div style={{ fontSize:"11px", color:"var(--tx-s)", marginTop:"4px" }}>
              📍 {delivery.storage_address}
            </div>
          )}
        </div>

        <div style={{ background:"var(--bg-m)", borderRadius:"8px", padding:"12px" }}>
          <div style={{ fontSize:"10px", fontWeight:600, color:"var(--tx-m)", 
            textTransform:"uppercase", letterSpacing:".5px", marginBottom:"6px" }}>
            Deliver To
          </div>
          <div style={{ fontSize:"13px", fontWeight:600, color:"var(--tx)", marginBottom:"2px" }}>
            👤 {delivery.customer_name}
          </div>
          <div style={{ fontSize:"12px", color:"var(--tx-m)", marginBottom:"2px" }}>
            📞 {delivery.customer_phone}
          </div>
          {delivery.delivery_address && (
            <div style={{ fontSize:"11px", color:"var(--tx-s)", marginTop:"4px" }}>
              📍 {delivery.delivery_address}
            </div>
          )}
        </div>
      </div>

      {/* Payment & Delivery Details */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(100px, 1fr))", 
        gap:"8px", marginBottom:"12px" }}>
        {[
          { label:"Amount",       value:`₹${parseFloat(delivery.total_amount||0).toLocaleString("en-IN")}` },
          { label:"Delivery Date", value:delivery.delivery_date ? 
            new Date(delivery.delivery_date).toLocaleDateString("en-IN") : "—" },
          { label:"Assigned",     value:new Date(delivery.assigned_at).toLocaleDateString("en-IN") },
        ].map(item => (
          <div key={item.label} style={{ background:"var(--bg-m)", borderRadius:"7px", padding:"8px" }}>
            <div style={{ fontSize:"9px", color:"var(--tx-s)", marginBottom:"2px",
              textTransform:"uppercase", letterSpacing:".5px" }}>
              {item.label}
            </div>
            <div style={{ fontFamily:"var(--fm)", fontSize:"12px", fontWeight:600, color:"var(--tx)" }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
        {canPickup && (
          <button className="btn btn-primary" onClick={handlePickup} disabled={acting}
            style={{ width:"100%", fontSize:"13px" }}>
            ✓ Mark as Picked Up
          </button>
        )}

        {canTransit && (
          <button className="btn btn-primary" onClick={handleInTransit} disabled={acting}
            style={{ width:"100%", fontSize:"13px" }}>
            🚚 Mark In Transit
          </button>
        )}

        {canDeliver && (
          <div>
            <label style={{ display:"flex", alignItems:"center", gap:"8px", padding:"10px 12px",
              background:"var(--warn-bg)", borderRadius:"8px", marginBottom:"8px", cursor:"pointer" }}>
              <input type="checkbox" checked={paymentConfirm} 
                onChange={e => setPaymentConfirm(e.target.checked)}
                style={{ width:"16px", height:"16px", cursor:"pointer" }} />
              <span style={{ fontSize:"12px", fontWeight:600, color:"var(--tx)" }}>
                ✓ Payment received from customer
              </span>
            </label>
            <button className="btn btn-safe" onClick={handleDeliver} 
              disabled={acting || !paymentConfirm}
              style={{ width:"100%", fontSize:"13px" }}>
              ✓ Mark as Delivered
            </button>
          </div>
        )}

        {delivery.status === "delivered" && (
          <div style={{ background:"var(--safe-bg)", borderRadius:"8px", padding:"12px",
            textAlign:"center", border:"1px solid rgba(22,163,74,.2)" }}>
            <div style={{ fontSize:"13px", fontWeight:700, color:"var(--safe)" }}>
              ✓ Delivery Completed
            </div>
            <div style={{ fontSize:"11px", color:"var(--tx-m)", marginTop:"2px" }}>
              {delivery.delivered_at ? 
                `Delivered on ${new Date(delivery.delivered_at).toLocaleString("en-IN")}` : 
                "Delivery confirmed"}
            </div>
          </div>
        )}

        <button onClick={() => setShowDetails(v => !v)} style={{
          background:"transparent", border:"none", cursor:"pointer",
          fontSize:"12px", color:"var(--cp)", fontWeight:600, padding:"4px",
        }}>
          {showDetails ? "▼ Hide Details" : "▶ Show Details"}
        </button>

        {showDetails && delivery.notes && (
          <div style={{ fontSize:"12px", color:"var(--tx-m)", padding:"10px",
            background:"var(--bg-m)", borderRadius:"8px" }}>
            <strong>Notes:</strong> {delivery.notes}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DeliveryBoyPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active"); // active, completed, all

  useEffect(() => {
    loadDeliveries();
  }, []);

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const { data } = await deliveryAPI.getMyDeliveries();
      setDeliveries(data.deliveries || []);
    } catch (err) {
      console.error("Failed to load deliveries:", err);
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDeliveries = deliveries.filter(d => {
    if (filter === "active") return d.status !== "delivered" && d.status !== "failed";
    if (filter === "completed") return d.status === "delivered";
    return true;
  });

  const stats = {
    total: deliveries.length,
    active: deliveries.filter(d => d.status !== "delivered" && d.status !== "failed").length,
    completed: deliveries.filter(d => d.status === "delivered").length,
  };

  return (
    <div style={{ maxWidth:"1000px", margin:"0 auto", padding:"24px 20px" }}>
      {/* Header */}
      <div style={{ marginBottom:"24px" }}>
        <h1 style={{ fontSize:"24px", fontWeight:800, color:"var(--tx)", marginBottom:"6px" }}>
          My Deliveries
        </h1>
        <p style={{ fontSize:"13px", color:"var(--tx-m)" }}>
          Manage your assigned delivery tasks
        </p>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))", 
        gap:"12px", marginBottom:"20px" }}>
        {[
          { label:"Total",     value:stats.total,     color:"var(--cp)",   bg:"var(--cp-pale)" },
          { label:"Active",    value:stats.active,    color:"var(--warn)", bg:"var(--warn-bg)" },
          { label:"Completed", value:stats.completed, color:"var(--safe)", bg:"var(--safe-bg)" },
        ].map((stat, i) => (
          <div key={i} className="card" style={{ padding:"16px" }}>
            <div style={{ fontSize:"11px", fontWeight:600, color:"var(--tx-m)", 
              textTransform:"uppercase", letterSpacing:".5px", marginBottom:"6px" }}>
              {stat.label}
            </div>
            <div style={{ fontSize:"28px", fontWeight:800, fontFamily:"var(--fm)", color:stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:"8px", marginBottom:"16px", flexWrap:"wrap" }}>
        {[
          { id:"active",    label:"Active",    count:stats.active },
          { id:"completed", label:"Completed", count:stats.completed },
          { id:"all",       label:"All",       count:stats.total },
        ].map(tab => (
          <button key={tab.id} onClick={() => setFilter(tab.id)} style={{
            padding:"8px 16px", borderRadius:"10px", cursor:"pointer",
            border:`1.5px solid ${filter === tab.id ? "var(--cp)" : "var(--bd)"}`,
            background: filter === tab.id ? "var(--cp-pale)" : "var(--bg-l)",
            fontSize:"13px", fontWeight:600,
            color: filter === tab.id ? "var(--cp)" : "var(--tx-m)",
            transition:"all .15s",
          }}>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Deliveries list */}
      {loading ? (
        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          {[1,2,3].map(i => <div key={i} className="skel" style={{ height:"200px" }} />)}
        </div>
      ) : filteredDeliveries.length === 0 ? (
        <div className="card" style={{ padding:"60px 20px", textAlign:"center" }}>
          <div style={{ fontSize:"3rem", marginBottom:"12px" }}>🚚</div>
          <div style={{ fontSize:"16px", fontWeight:700, color:"var(--tx)", marginBottom:"6px" }}>
            No {filter !== "all" && filter} deliveries
          </div>
          <p style={{ fontSize:"13px", color:"var(--tx-m)" }}>
            Assigned deliveries will appear here
          </p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          {filteredDeliveries.map((delivery, i) => (
            <div key={delivery.id} className="anim-fadeup" style={{ animationDelay:`${i*.05}s` }}>
              <DeliveryCard delivery={delivery} onUpdate={loadDeliveries} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
