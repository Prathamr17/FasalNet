// pages/farmer/FarmerMarketPage.js — v8: My Market for farmers
import { useState, useEffect, useCallback } from "react";
import { farmerAPI } from "../../services/api";

const CATEGORY_OPTIONS = [
  { id:"vegetables", emoji:"🥦", label:"Vegetables" },
  { id:"fruits",     emoji:"🍎", label:"Fruits" },
  { id:"leafy",      emoji:"🥬", label:"Leafy Greens" },
  { id:"nuts",       emoji:"🥜", label:"Nuts" },
  { id:"grains",     emoji:"🌾", label:"Grains" },
  { id:"spices",     emoji:"🌶️", label:"Spices" },
];

const EMOJI_MAP = {
  vegetables:"🥦", fruits:"🍎", leafy:"🥬", nuts:"🥜", grains:"🌾", spices:"🌶️"
};

const RISK_CFG = {
  SAFE:     { color:"#16A34A", bg:"#DCFCE7", label:"Safe"     },
  RISKY:    { color:"#D97706", bg:"#FEF3C7", label:"Risky"    },
  CRITICAL: { color:"#DC2626", bg:"#FEE2E2", label:"Critical" },
};

// ── Add/Edit Product Modal ───────────────────────────────────────────
function ProductModal({ existing, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:       existing?.name       || "",
    category:   existing?.category   || "vegetables",
    price_per_kg: existing?.price_per_kg || "",
    quantity_kg:  existing?.quantity_kg  || "",
    description:  existing?.description  || "",
    risk_level:   existing?.risk_level   || "SAFE",
  });
  const [loading, setLoad] = useState(false);
  const [error,   setErr]  = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim())        { setErr("Crop name is required.");    return; }
    if (!form.price_per_kg || parseFloat(form.price_per_kg) <= 0) { setErr("Price must be > 0."); return; }
    if (!form.quantity_kg  || parseFloat(form.quantity_kg)  <= 0) { setErr("Quantity must be > 0."); return; }
    setLoad(true); setErr("");
    try {
      const payload = {
        name:         form.name.trim(),
        category:     form.category,
        price_per_kg: parseFloat(form.price_per_kg),
        quantity_kg:  parseFloat(form.quantity_kg),
        description:  form.description.trim(),
        risk_level:   form.risk_level,
        image_emoji:  EMOJI_MAP[form.category] || "🌾",
      };
      if (existing) {
        await farmerAPI.updateProduct(existing.id, payload);
      } else {
        await farmerAPI.createProduct(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setErr(err.response?.data?.error || "Failed to save. Try again.");
    } finally {
      setLoad(false);
    }
  };

  const ls = {
    fontSize:"11px", fontWeight:600, color:"var(--tx-m)",
    textTransform:"uppercase", letterSpacing:".6px", display:"block", marginBottom:"5px"
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, zIndex:9000,
        background:"rgba(0,0,0,.45)", backdropFilter:"blur(4px)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
      <div className="card anim-pop" style={{ width:"100%", maxWidth:"460px",
        padding:"24px", maxHeight:"90vh", overflowY:"auto" }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
          <h3 style={{ fontSize:"17px", fontWeight:700, color:"var(--tx)" }}>
            {existing ? "Edit Product" : "Add to My Market"}
          </h3>
          <button onClick={onClose} style={{ background:"var(--bg-m)", border:"none",
            borderRadius:"7px", width:"28px", height:"28px", cursor:"pointer",
            color:"var(--tx-m)", fontSize:"14px" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          {/* Crop Name */}
          <div>
            <label style={ls}>🌾 Crop Name *</label>
            <input className="inp" type="text" placeholder="e.g. Alphonso Mango, Red Onion…"
              value={form.name} onChange={e => set("name", e.target.value)} required />
          </div>

          {/* Category */}
          <div>
            <label style={ls}>Category</label>
            <select className="inp" value={form.category} onChange={e => set("category", e.target.value)}>
              {CATEGORY_OPTIONS.map(c => (
                <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </div>

          {/* Price & Quantity */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
            <div>
              <label style={ls}>Price (₹/kg) *</label>
              <input className="inp" type="number" min={0.01} step={0.01}
                placeholder="e.g. 45"
                value={form.price_per_kg} onChange={e => set("price_per_kg", e.target.value)} required />
            </div>
            <div>
              <label style={ls}>Total Quantity (kg) *</label>
              <input className="inp" type="number" min={1}
                placeholder="e.g. 500"
                value={form.quantity_kg} onChange={e => set("quantity_kg", e.target.value)} required />
            </div>
          </div>

          {/* Risk Level */}
          <div>
            <label style={ls}>Risk Level</label>
            <div style={{ display:"flex", gap:"8px" }}>
              {["SAFE","RISKY","CRITICAL"].map(r => {
                const rc = RISK_CFG[r];
                return (
                  <button key={r} type="button"
                    onClick={() => set("risk_level", r)}
                    style={{
                      flex:1, padding:"7px", borderRadius:"8px", fontSize:"11px", fontWeight:700,
                      border:`1.5px solid ${form.risk_level===r ? rc.color : "var(--bd)"}`,
                      background: form.risk_level===r ? rc.bg : "var(--bg-l)",
                      color: form.risk_level===r ? rc.color : "var(--tx-m)",
                      cursor:"pointer", transition:"all .15s",
                    }}>{rc.label}</button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={ls}>Description (optional)</label>
            <textarea className="inp" rows={2} placeholder="Quality, harvest method, storage notes…"
              value={form.description} onChange={e => set("description", e.target.value)}
              style={{ resize:"vertical" }} />
          </div>

          {error && (
            <div style={{ background:"var(--danger-bg)", borderRadius:"8px",
              padding:"10px 12px", fontSize:"12px", color:"var(--danger)" }}>
              {error}
            </div>
          )}

          <div style={{ display:"flex", gap:"10px", marginTop:"4px" }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex:1 }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex:2 }}>
              {loading
                ? <><span className="aspin" style={{ width:14, height:14,
                    border:"2px solid rgba(255,255,255,.3)", borderTopColor:"#fff" }}/> Saving…</>
                : existing ? "Update Product" : "Add to Market +"
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────
function ProductCard({ product, onEdit, onDelete }) {
  const rc = RISK_CFG[product.risk_level] || RISK_CFG.SAFE;
  const pct = product.quantity_kg > 0
    ? Math.round((1 - product.available_kg / product.quantity_kg) * 100) : 100;

  return (
    <div className="card" style={{ padding:"16px", display:"flex", flexDirection:"column", gap:"10px" }}>
      {/* Top row */}
      <div style={{ display:"flex", gap:"12px", alignItems:"flex-start" }}>
        <div style={{ width:"52px", height:"52px", borderRadius:"12px", background:"var(--bg-m)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:"1.8rem", flexShrink:0 }}>
          {product.image_emoji || EMOJI_MAP[product.category] || "🌾"}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap", marginBottom:"3px" }}>
            <span style={{ fontSize:"14px", fontWeight:700, color:"var(--tx)" }}>{product.name}</span>
            <span style={{ fontSize:"9px", fontWeight:700, padding:"2px 7px", borderRadius:"99px",
              background:rc.bg, color:rc.color }}>{rc.label}</span>
          </div>
          <div style={{ fontSize:"11px", color:"var(--tx-s)", textTransform:"capitalize" }}>
            {product.category} · {product.storage_name || "No storage"}
          </div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontFamily:"var(--fm)", fontWeight:800, fontSize:"16px", color:"var(--cp)" }}>
            ₹{parseFloat(product.price_per_kg).toFixed(0)}/kg
          </div>
        </div>
      </div>

      {/* Availability bar */}
      <div>
        <div style={{ display:"flex", justifyContent:"space-between",
          fontSize:"10px", color:"var(--tx-s)", marginBottom:"4px" }}>
          <span>{parseFloat(product.available_kg).toFixed(0)} kg available</span>
          <span>{pct}% sold</span>
        </div>
        <div className="prog">
          <div className="prog-fill" style={{
            "--w":`${pct}%`,
            background: pct>80?"var(--danger)":pct>50?"var(--warn)":"var(--cp)"
          }}/>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display:"flex", gap:"8px" }}>
        <button onClick={() => onEdit(product)} className="btn btn-ghost"
          style={{ flex:1, fontSize:"12px", padding:"6px" }}>✏️ Edit</button>
        <button onClick={() => onDelete(product.id)} className="btn btn-ghost"
          style={{ flex:1, fontSize:"12px", padding:"6px", color:"var(--danger)",
            borderColor:"rgba(220,38,38,.3)" }}>🗑 Remove</button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function FarmerMarketPage() {
  const [products, setProducts] = useState([]);
  const [loading,  setLoad]     = useState(true);
  const [modal,    setModal]    = useState(null); // null | "add" | product (edit)
  const [toast,    setToast]    = useState("");
  const [delId,    setDelId]    = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  const load = useCallback(async () => {
    setLoad(true);
    try {
      const { data } = await farmerAPI.getMyProducts();
      setProducts(data.products || []);
    } catch {
      setProducts([]);
    } finally { setLoad(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try {
      await farmerAPI.deleteProduct(id);
      showToast("Product removed from market.");
      load();
    } catch {
      showToast("Failed to remove product.");
    }
    setDelId(null);
  };

  const totalAvailable = products.reduce((s, p) => s + parseFloat(p.available_kg || 0), 0);
  const totalValue     = products.reduce((s, p) =>
    s + parseFloat(p.available_kg || 0) * parseFloat(p.price_per_kg || 0), 0);

  return (
    <div style={{ maxWidth:"900px", margin:"0 auto", padding:"24px 20px" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        marginBottom:"24px", flexWrap:"wrap", gap:"12px" }} className="anim-fadeup">
        <div>
          <h1 style={{ fontSize:"22px", fontWeight:800, color:"var(--tx)", marginBottom:"4px" }}>
            My Market 🛒
          </h1>
          <p style={{ fontSize:"13px", color:"var(--tx-m)" }}>
            List your crops for customers to discover and order.
          </p>
        </div>
        <button onClick={() => setModal("add")} className="btn btn-primary"
          style={{ fontSize:"13px", padding:"9px 18px" }}>
          + Add Crop
        </button>
      </div>

      {/* Stats row */}
      {products.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"12px", marginBottom:"20px" }}
          className="anim-fadeup d1">
          {[
            { label:"Listed Products", val:products.length, icon:"📦" },
            { label:"Total Available", val:`${totalAvailable.toFixed(0)} kg`, icon:"⚖️" },
            { label:"Est. Market Value", val:`₹${totalValue.toLocaleString("en-IN", {maximumFractionDigits:0})}`, icon:"💰" },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding:"14px 16px", textAlign:"center" }}>
              <div style={{ fontSize:"1.4rem", marginBottom:"4px" }}>{s.icon}</div>
              <div style={{ fontFamily:"var(--fm)", fontWeight:800, fontSize:"18px",
                color:"var(--tx)", lineHeight:1 }}>{s.val}</div>
              <div style={{ fontSize:"10px", color:"var(--tx-s)", marginTop:"3px" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Products grid */}
      {loading ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))", gap:"14px" }}>
          {[1,2,3].map(i => <div key={i} className="skel" style={{ height:"180px", borderRadius:"14px" }} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="card" style={{ padding:"60px 32px", textAlign:"center" }}>
          <div style={{ fontSize:"3rem", marginBottom:"12px" }}>🌾</div>
          <div style={{ fontSize:"16px", fontWeight:700, color:"var(--tx)", marginBottom:"6px" }}>
            Your market is empty
          </div>
          <p style={{ fontSize:"13px", color:"var(--tx-m)", marginBottom:"20px" }}>
            Add your crops so customers can find and order them.
          </p>
          <button onClick={() => setModal("add")} className="btn btn-primary">
            + Add Your First Crop
          </button>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))", gap:"14px" }}>
          {products.map(p => (
            <ProductCard key={p.id} product={p}
              onEdit={p => setModal(p)}
              onDelete={id => setDelId(id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {(modal === "add" || (modal && typeof modal === "object")) && (
        <ProductModal
          existing={typeof modal === "object" ? modal : null}
          onClose={() => setModal(null)}
          onSaved={() => { load(); showToast(modal === "add" ? "Product added to market!" : "Product updated!"); }}
        />
      )}

      {/* Delete confirm */}
      {delId && (
        <div onClick={e => e.target === e.currentTarget && setDelId(null)}
          style={{ position:"fixed", inset:0, zIndex:9000,
            background:"rgba(0,0,0,.4)", display:"flex",
            alignItems:"center", justifyContent:"center", padding:"16px" }}>
          <div className="card anim-pop" style={{ maxWidth:"340px", width:"100%", padding:"24px", textAlign:"center" }}>
            <div style={{ fontSize:"2rem", marginBottom:"12px" }}>🗑</div>
            <div style={{ fontWeight:700, fontSize:"15px", color:"var(--tx)", marginBottom:"8px" }}>
              Remove this product?
            </div>
            <p style={{ fontSize:"13px", color:"var(--tx-m)", marginBottom:"20px" }}>
              It will be hidden from customers immediately.
            </p>
            <div style={{ display:"flex", gap:"10px" }}>
              <button onClick={() => setDelId(null)} className="btn btn-ghost" style={{ flex:1 }}>
                Cancel
              </button>
              <button onClick={() => handleDelete(delId)} className="btn btn-primary"
                style={{ flex:1, background:"var(--danger)", borderColor:"var(--danger)" }}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast">
          <span style={{ color:"var(--safe)" }}>✓</span> {toast}
        </div>
      )}
    </div>
  );
}
