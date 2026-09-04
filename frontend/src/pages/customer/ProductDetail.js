// pages/customer/ProductDetail.js — Product detail + order placement
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const DEMO = {
  id:1, name:"Fresh Tomatoes", farmer:"Ramesh Jadhav", district:"Kolhapur",
  price_per_kg:28, quantity_kg:500, image:"🍅", category:"vegetables",
  risk:"SAFE", cold_storage:"GreenGrain Cold Store", harvest_age_days:2,
  description:"Premium quality tomatoes grown using natural farming practices in Kolhapur district. Stored at optimal 2–8°C to maintain freshness.",
  farmer_phone:"9876543210", temp:"2–8°C", certifications:["Natural Farming","Cold Chain Verified"],
};

export default function ProductDetail() {
  const navigate = useNavigate();
  const [qty, setQty] = useState(10);
  const [ordered, setOrdered] = useState(false);

  const total = (qty * DEMO.price_per_kg).toLocaleString("en-IN");

  const placeOrder = () => {
    setOrdered(true);
    setTimeout(() => navigate("/my-orders"), 2000);
  };

  return (
    <div style={{ maxWidth:"800px", margin:"0 auto", padding:"1.5rem 1rem" }}>
      <button onClick={() => navigate("/marketplace")}
        style={{ fontFamily:"var(--font-body)", fontSize:"13px", color:"var(--color-muted)",
          background:"none", border:"none", cursor:"pointer", marginBottom:"1.5rem",
          display:"flex", alignItems:"center", gap:"6px" }}>
        ← Back to Marketplace
      </button>

      {ordered ? (
        <div className="anim-pop" style={{ textAlign:"center", padding:"4rem 2rem",
          background:"var(--color-card)", border:"1px solid var(--color-border)", borderRadius:"20px" }}>
          <div style={{ fontSize:"4rem", marginBottom:"1rem" }}>🎉</div>
          <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"1.5rem",
            color:"var(--color-safe)", marginBottom:"8px" }}>Order Placed!</div>
          <div style={{ fontSize:"13px", color:"var(--color-muted)" }}>Redirecting to your orders…</div>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem" }}
          className="anim-fade-up">
          {/* Left: Product info */}
          <div style={{ background:"var(--color-card)", border:"1px solid var(--color-border)",
            borderRadius:"16px", overflow:"hidden" }}>
            <div style={{ height:"160px", display:"flex", alignItems:"center", justifyContent:"center",
              background:"linear-gradient(135deg,var(--color-bg-mid),var(--color-bg-light))",
              fontSize:"5rem" }}>
              {DEMO.image}
            </div>
            <div style={{ padding:"1.25rem" }}>
              <h1 style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"1.4rem",
                color:"var(--color-text)", marginBottom:"6px" }}>{DEMO.name}</h1>
              <p style={{ fontSize:"13px", color:"var(--color-muted)", marginBottom:"16px",
                lineHeight:"1.6" }}>{DEMO.description}</p>
              {[
                ["Farmer",       `🌾 ${DEMO.farmer}`],
                ["District",     DEMO.district],
                ["Cold Storage", `🏭 ${DEMO.cold_storage}`],
                ["Temperature",  DEMO.temp],
                ["Harvest Age",  `${DEMO.harvest_age_days} days ago`],
                ["Available",    `${DEMO.quantity_kg} kg`],
              ].map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between",
                  padding:"7px 0", borderBottom:"1px solid var(--color-border)", fontSize:"13px" }}>
                  <span style={{ color:"var(--color-muted)" }}>{k}</span>
                  <span style={{ fontWeight:500 }}>{v}</span>
                </div>
              ))}
              <div style={{ display:"flex", gap:"6px", marginTop:"12px", flexWrap:"wrap" }}>
                {DEMO.certifications.map(c => (
                  <span key={c} style={{ background:"rgba(74,222,128,.12)", color:"var(--color-safe)",
                    border:"1px solid rgba(74,222,128,.25)", borderRadius:"20px",
                    fontSize:"10px", fontWeight:700, padding:"3px 10px" }}>{c}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Order form */}
          <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
            <div style={{ background:"var(--color-card)", border:"1px solid var(--color-border)",
              borderRadius:"16px", padding:"1.25rem" }}>
              <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"1.1rem",
                color:"var(--color-text)", marginBottom:"16px" }}>Place Order</div>

              <div style={{ fontFamily:"var(--font-mono)", fontWeight:800, fontSize:"2rem",
                color:"var(--color-primary)", marginBottom:"4px" }}>
                ₹{DEMO.price_per_kg}<span style={{ fontSize:"14px", fontWeight:400, color:"var(--color-muted)" }}>/kg</span>
              </div>

              <div style={{ marginBottom:"16px" }}>
                <div style={{ fontSize:"11px", color:"var(--color-muted)", textTransform:"uppercase",
                  letterSpacing:"0.8px", marginBottom:"6px" }}>Quantity (kg)</div>
                <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                  <button onClick={() => setQty(q => Math.max(1,q-5))} className="btn-press"
                    style={{ width:"36px", height:"36px", borderRadius:"8px", border:"1px solid var(--color-border)",
                      background:"var(--color-bg-mid)", color:"var(--color-text)", fontSize:"18px",
                      cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                  <input type="number" value={qty} onChange={e=>setQty(Math.max(1,parseInt(e.target.value)||1))}
                    min={1} max={DEMO.quantity_kg}
                    style={{ flex:1, textAlign:"center", fontFamily:"var(--font-mono)", fontWeight:700,
                      fontSize:"16px", background:"var(--color-card)", border:"1px solid var(--color-border)",
                      color:"var(--color-text)", borderRadius:"8px", padding:"8px", outline:"none" }} />
                  <button onClick={() => setQty(q => Math.min(DEMO.quantity_kg,q+5))} className="btn-press"
                    style={{ width:"36px", height:"36px", borderRadius:"8px", border:"1px solid var(--color-border)",
                      background:"var(--color-bg-mid)", color:"var(--color-text)", fontSize:"18px",
                      cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                </div>
              </div>

              <div style={{ background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.2)",
                borderRadius:"12px", padding:"14px", textAlign:"center", marginBottom:"16px" }}>
                <div style={{ fontFamily:"var(--font-mono)", fontWeight:900, fontSize:"1.75rem",
                  color:"var(--color-primary)" }}>₹{total}</div>
                <div style={{ fontSize:"11px", color:"var(--color-muted)", marginTop:"2px" }}>
                  {qty} kg × ₹{DEMO.price_per_kg}
                </div>
              </div>

              <button onClick={placeOrder} className="btn-press hover-lift"
                style={{ width:"100%", background:"var(--color-primary)", color:"var(--color-bg)",
                  border:"none", borderRadius:"12px", padding:"13px",
                  fontFamily:"var(--font-display)", fontWeight:800, fontSize:"14px",
                  cursor:"pointer", transition:"all .2s" }}>
                Place Order →
              </button>
            </div>

            <div style={{ background:"var(--color-card)", border:"1px solid var(--color-border)",
              borderRadius:"14px", padding:"14px" }}>
              <div style={{ fontSize:"12px", color:"var(--color-muted)", marginBottom:"10px",
                textTransform:"uppercase", letterSpacing:"0.8px" }}>Delivery Info</div>
              {["Cold chain maintained end-to-end","Delivery within 24–48 hours","Quality guaranteed or refund"].map((item,i) => (
                <div key={i} style={{ display:"flex", gap:"8px", fontSize:"12px", marginBottom:"6px",
                  color:"var(--color-text)" }}>
                  <span style={{ color:"var(--color-safe)" }}>✓</span>{item}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
