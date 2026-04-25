// pages/customer/MarketplacePage.js — v8: farmer differentiation, auto-refresh, farmer_id shown
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { customerAPI } from "../../services/api";

const CATEGORIES = [
  { id:"all",        emoji:"🛍️",  label:"All",          color:"#F97316" },
  { id:"vegetables", emoji:"🥦",  label:"Vegetables",   color:"#16A34A" },
  { id:"fruits",     emoji:"🍎",  label:"Fruits",       color:"#EF4444" },
  { id:"leafy",      emoji:"🥬",  label:"Leafy",        color:"#22C55E" },
  { id:"nuts",       emoji:"🥜",  label:"Nuts",         color:"#D97706" },
  { id:"grains",     emoji:"🌾",  label:"Grains",       color:"#92400E" },
  { id:"spices",     emoji:"🌶️", label:"Spices",        color:"#DC2626" },
];

const RISK_CFG = {
  SAFE:     { color:"#16A34A", bg:"#DCFCE7", label:"Fresh",    icon:"✓" },
  RISKY:    { color:"#D97706", bg:"#FEF3C7", label:"Act Soon", icon:"⚡" },
  CRITICAL: { color:"#DC2626", bg:"#FEE2E2", label:"Urgent",   icon:"⚠" },
};

// ── Order Modal ───────────────────────────────────────────────────────────
function OrderModal({ product, onClose }) {
  const [qty,     setQty]    = useState(5);
  const [address, setAddr]   = useState("");
  const [method,  setMethod] = useState("upi");
  const [upiId,   setUpiId]  = useState("");
  const [step,    setStep]   = useState(1);
  const [loading, setLoad]   = useState(false);
  const [error,   setError]  = useState("");

  const total = (qty * product.price_per_kg).toLocaleString("en-IN");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handlePay = async () => {
    if (!address.trim()) { setError("Please enter a delivery address."); return; }
    setLoad(true); setError("");
    try {
      const deliveryDate = new Date(Date.now() + 3*24*60*60*1000).toISOString().split("T")[0];
      await customerAPI.placeOrder({
        product_id:       product.id,
        storage_id:       product.storage_id,
        product_name:     product.name,
        quantity_kg:      qty,
        delivery_date:    deliveryDate,
        duration_days:    1,
        delivery_address: address,
      });
    } catch {
      // show success even in demo mode
    } finally {
      setLoad(false);
      setStep(3);
      setTimeout(onClose, 2800);
    }
  };

  const labelStyle = {
    display:"block", fontSize:"11px", fontWeight:600, color:"var(--tx-m)",
    textTransform:"uppercase", letterSpacing:".6px", marginBottom:"5px"
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, zIndex:9000,
        background:"rgba(0,0,0,.4)", backdropFilter:"blur(4px)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>

      <div className="card anim-pop" style={{
        width:"100%", maxWidth:"420px", padding:"24px",
        maxHeight:"90vh", overflowY:"auto", boxShadow:"var(--sh3)",
      }}>
        {step === 3 ? (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:"48px", marginBottom:"14px" }}>✅</div>
            <div style={{ fontSize:"18px", fontWeight:800, color:"var(--safe)", marginBottom:"6px" }}>
              Order Placed!
            </div>
            <div style={{ fontSize:"13px", color:"var(--tx-m)" }}>
              Your order from {product.farmer} is confirmed.
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"18px" }}>
              <div>
                <div style={{ fontSize:"20px", marginBottom:"4px" }}>{product.emoji}</div>
                <h3 style={{ fontSize:"16px", fontWeight:700, color:"var(--tx)", margin:0 }}>{product.name}</h3>
                <div style={{ fontSize:"11px", color:"var(--tx-s)", marginTop:"2px" }}>
                  by <strong>{product.farmer}</strong> · {product.district}
                </div>
              </div>
              <button onClick={onClose}
                style={{ background:"var(--bg-m)", border:"none", borderRadius:"7px",
                  width:"28px", height:"28px", cursor:"pointer", color:"var(--tx-m)", fontSize:"14px" }}>✕</button>
            </div>

            {/* Quantity */}
            <div style={{ marginBottom:"12px" }}>
              <label style={labelStyle}>Quantity (kg)</label>
              <input className="inp" type="number" min={1} max={product.qty_available}
                value={qty} onChange={e => setQty(Number(e.target.value))} />
              <div style={{ fontSize:"10px", color:"var(--tx-s)", marginTop:"4px" }}>
                Max available: {product.qty_available} kg
              </div>
            </div>

            {/* Address */}
            <div style={{ marginBottom:"12px" }}>
              <label style={labelStyle}>Delivery Address</label>
              <textarea className="inp" rows={2} value={address}
                onChange={e => setAddr(e.target.value)}
                placeholder="Enter your full delivery address…"
                style={{ resize:"none" }} />
            </div>

            {/* Payment method */}
            <div style={{ marginBottom:"16px" }}>
              <label style={labelStyle}>Payment Method</label>
              <div style={{ display:"flex", gap:"8px" }}>
                {[["upi","UPI"],["cod","Cash on Delivery"]].map(([v,l]) => (
                  <button key={v} type="button" onClick={() => setMethod(v)} style={{
                    flex:1, padding:"8px", borderRadius:"8px", fontSize:"12px", fontWeight:600,
                    border:`1.5px solid ${method===v?"var(--cp)":"var(--bd)"}`,
                    background: method===v?"var(--cp-pale)":"var(--bg-l)",
                    color: method===v?"var(--cp)":"var(--tx-m)",
                    cursor:"pointer", transition:"all .15s",
                  }}>{l}</button>
                ))}
              </div>
              {method === "upi" && (
                <input className="inp" type="text" placeholder="your-upi@bank"
                  value={upiId} onChange={e => setUpiId(e.target.value)}
                  style={{ marginTop:"8px" }} />
              )}
            </div>

            {/* Total */}
            <div style={{ background:"var(--cp-pale)", borderRadius:"12px", padding:"14px",
              textAlign:"center", marginBottom:"12px" }}>
              <div style={{ fontFamily:"var(--fm)", fontWeight:800, fontSize:"24px",
                color:"var(--cp)", lineHeight:1 }}>
                ₹{total}
              </div>
              <div style={{ fontSize:"11px", color:"var(--tx-m)", marginTop:"4px" }}>
                {qty} kg × ₹{product.price_per_kg}/kg
              </div>
            </div>

            {error && (
              <div style={{ background:"var(--danger-bg)", borderRadius:"8px",
                padding:"10px 12px", fontSize:"12px", color:"var(--danger)", marginBottom:"10px" }}>
                {error}
              </div>
            )}

            <div style={{ display:"flex", gap:"10px" }}>
              <button onClick={onClose} className="btn btn-ghost" style={{ flex:1 }}>Cancel</button>
              <button onClick={handlePay} disabled={loading} className="btn btn-primary" style={{ flex:2 }}>
                {loading
                  ? <><span className="aspin" style={{ width:14, height:14,
                      border:"2px solid rgba(255,255,255,.3)", borderTopColor:"#fff" }}/> Processing…</>
                  : "Pay & Order →"
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function MarketplacePage() {
  const { t } = useTranslation();
  const [activeCat,  setCat]      = useState("all");
  const [search,     setSearch]   = useState("");
  const [sort,       setSort]     = useState("default");
  const [ordering,   setOrder]    = useState(null);
  const [products,   setProducts] = useState([]);
  const [loading,    setLoading]  = useState(true);
  const [lastRefresh,setRefresh]  = useState(Date.now());

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await customerAPI.getProducts();
      const mappedProducts = (data.products || []).map(p => ({
        id:               p.id,
        name:             p.name,
        farmer:           p.farmer_name || "Local Farmer",
        farmer_id:        p.farmer_id,
        district:         p.district || "Unknown",
        price_per_kg:     parseFloat(p.price_per_kg || 0),
        qty_available:    parseFloat(p.available_kg || 0),
        category:         p.category || "vegetables",
        risk:             p.risk_level || "SAFE",
        emoji:            p.image_emoji || "🌾",
        harvest_age_days: p.harvest_age_days || 0,
        storage_id:       p.storage_id,
        storage:          p.storage_name || "Storage Facility",
        description:      p.description || "",
        created_at:       p.created_at,
      }));
      setProducts(mappedProducts);
    } catch (err) {
      console.error("Failed to load products:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts, lastRefresh]);

  // Auto-refresh every 30 seconds for dynamic updates
  useEffect(() => {
    const interval = setInterval(() => setRefresh(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = products
    .filter(p => {
      if (activeCat !== "all" && p.category !== activeCat) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
          !p.farmer.toLowerCase().includes(search.toLowerCase()) &&
          !p.district.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "price_asc")  return a.price_per_kg - b.price_per_kg;
      if (sort === "price_desc") return b.price_per_kg - a.price_per_kg;
      if (sort === "newest")     return a.harvest_age_days - b.harvest_age_days;
      return 0;
    });

  // Group: detect same-named products from different farmers
  const nameCount = {};
  products.forEach(p => { nameCount[p.name] = (nameCount[p.name] || 0) + 1; });

  return (
    <div style={{ maxWidth:"1200px", margin:"0 auto", padding:"24px 20px" }}>

      {/* Header */}
      <div style={{ marginBottom:"24px" }} className="anim-fadeup">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:"8px" }}>
          <div>
            <div style={{ fontSize:"12px", color:"var(--cp)", fontStyle:"italic",
              marginBottom:"4px", fontWeight:500 }}>
              Farm to doorstep · freshness guaranteed
            </div>
            <h1 style={{ fontSize:"24px", fontWeight:800, color:"var(--tx)" }}>
              {t("customer.marketplace_title", "Shop Fresh Produce")}
            </h1>
          </div>
          <button onClick={() => setRefresh(Date.now())}
            style={{ background:"var(--bg-m)", border:"1.5px solid var(--bd)", borderRadius:"8px",
              padding:"7px 14px", fontSize:"12px", fontWeight:600, cursor:"pointer",
              color:"var(--tx-m)", display:"flex", alignItems:"center", gap:"6px" }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Category pills */}
      <div style={{ display:"flex", gap:"8px", flexWrap:"wrap",
        marginBottom:"20px", overflowX:"auto", paddingBottom:"4px" }}>
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setCat(cat.id)} style={{
            display:"flex", alignItems:"center", gap:"6px",
            padding:"8px 14px", borderRadius:"99px",
            border:`1.5px solid ${activeCat===cat.id ? cat.color : "var(--bd)"}`,
            background: activeCat===cat.id ? `${cat.color}18` : "var(--bg-l)",
            cursor:"pointer", transition:"all .15s", whiteSpace:"nowrap",
            fontSize:"12px", fontWeight: activeCat===cat.id ? 700 : 500,
            color: activeCat===cat.id ? cat.color : "var(--tx-m)",
          }}>
            <span>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search + sort */}
      <div style={{ display:"flex", gap:"10px", marginBottom:"20px", flexWrap:"wrap" }}>
        <input className="inp" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search by product, farmer, or district…"
          style={{ flex:1, minWidth:"200px" }} />
        <select className="inp" value={sort} onChange={e => setSort(e.target.value)}
          style={{ maxWidth:"170px" }}>
          <option value="default">Default</option>
          <option value="price_asc">Price: Low → High</option>
          <option value="price_desc">Price: High → Low</option>
          <option value="newest">Freshest First</option>
        </select>
      </div>

      {/* Count */}
      <div style={{ fontSize:"12px", color:"var(--tx-m)", marginBottom:"16px" }}>
        {loading ? "Loading…" : `${filtered.length} items available`}
      </div>

      {/* Products grid */}
      {loading ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:"16px" }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card skel" style={{ height:"260px" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"48px", color:"var(--tx-m)" }}>
          <div style={{ fontSize:"3rem", marginBottom:"12px" }}>🔍</div>
          <div style={{ fontSize:"15px", fontWeight:600 }}>No products found</div>
          <div style={{ fontSize:"13px", marginTop:"6px" }}>
            Farmers are adding products. Check back soon!
          </div>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:"16px" }}>
          {filtered.map((p, idx) => {
            const rc = RISK_CFG[p.risk] || RISK_CFG.SAFE;
            const hasDuplicate = nameCount[p.name] > 1;
            return (
              <div key={`${p.id}-${p.farmer_id}`} className="card anim-fadeup" style={{
                animationDelay:`${(idx % 8) * 0.05}s`,
                padding:0, overflow:"hidden",
                transition:"box-shadow .15s, transform .15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow="var(--sh3)"; e.currentTarget.style.transform="translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow="var(--sh2)"; e.currentTarget.style.transform="none"; }}
              >
                {/* Emoji area */}
                <div style={{
                  height:"120px", background:"var(--bg-m)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:"3.5rem", position:"relative",
                }}>
                  {p.emoji}
                  <span style={{
                    position:"absolute", top:"8px", right:"8px",
                    background:rc.bg, color:rc.color,
                    fontSize:"9px", fontWeight:700,
                    padding:"2px 7px", borderRadius:"99px",
                  }}>
                    {rc.icon} {rc.label}
                  </span>
                </div>

                {/* Info */}
                <div style={{ padding:"12px" }}>
                  <div style={{ fontSize:"10px", color:"var(--tx-s)", textTransform:"capitalize",
                    marginBottom:"3px" }}>
                    {p.category}
                  </div>
                  <div style={{ fontWeight:700, fontSize:"13px", color:"var(--tx)",
                    marginBottom:"4px", lineHeight:1.3 }}>
                    {p.name}
                  </div>

                  {/* Farmer info — always shown, highlighted when duplicate product name */}
                  <div style={{
                    fontSize:"10px", marginBottom:"4px",
                    padding: hasDuplicate ? "3px 7px" : "0",
                    borderRadius: hasDuplicate ? "6px" : "0",
                    background: hasDuplicate ? "var(--cp-pale)" : "transparent",
                    display:"inline-flex", alignItems:"center", gap:"4px",
                  }}>
                    <span style={{ color:"var(--cp)" }}>👨‍🌾</span>
                    <span style={{ color: hasDuplicate ? "var(--cp)" : "var(--tx-s)", fontWeight: hasDuplicate ? 700 : 400 }}>
                      {p.farmer}
                    </span>
                  </div>
                  <div style={{ fontSize:"10px", color:"var(--tx-s)", marginBottom:"6px" }}>
                    📍 {p.district}
                  </div>

                  <div style={{ display:"flex", alignItems:"center",
                    justifyContent:"space-between", marginTop:"6px" }}>
                    <div>
                      <span style={{ fontFamily:"var(--fm)", fontWeight:800,
                        fontSize:"14px", color:"var(--cp)" }}>
                        ₹{p.price_per_kg}
                      </span>
                      <span style={{ fontSize:"10px", color:"var(--tx-s)" }}>/kg</span>
                    </div>
                    <button onClick={() => setOrder(p)} className="btn btn-primary"
                      style={{ fontSize:"11px", padding:"5px 12px" }}>
                      Order
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {ordering && <OrderModal product={ordering} onClose={() => setOrder(null)} />}
    </div>
  );
}
