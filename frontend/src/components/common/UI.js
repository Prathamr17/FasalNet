// components/common/UI.js — v3: light theme primitives

export function Input({ label, error, className="", ...props }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"5px" }}>
      {label && (
        <label style={{ fontSize:"11px", fontWeight:600, color:"var(--tx-m)",
          textTransform:"uppercase", letterSpacing:".6px" }}>
          {label}
        </label>
      )}
      <input className={`inp ${className}`} {...props} />
      {error && <p style={{ fontSize:"11px", color:"var(--danger)" }}>{error}</p>}
    </div>
  );
}

export function Select({ label, error, children, className="", ...props }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"5px" }}>
      {label && (
        <label style={{ fontSize:"11px", fontWeight:600, color:"var(--tx-m)",
          textTransform:"uppercase", letterSpacing:".6px" }}>
          {label}
        </label>
      )}
      <select className={`inp ${className}`} {...props}>{children}</select>
      {error && <p style={{ fontSize:"11px", color:"var(--danger)" }}>{error}</p>}
    </div>
  );
}

export function Button({ variant="primary", loading, children, className="", ...props }) {
  const variantClass = {
    primary:   "btn-primary",
    secondary: "btn-ghost",
    danger:    "btn-danger",
    success:   "btn-ghost",
  }[variant] || "btn-primary";
  return (
    <button className={`btn ${variantClass} ${className}`} disabled={loading||props.disabled} {...props}>
      {loading && (
        <span className="aspin" style={{ width:14, height:14,
          border:"2px solid rgba(255,255,255,.3)", borderTopColor:"currentColor" }}/>
      )}
      {children}
    </button>
  );
}

export function Card({ children, className="" }) {
  return <div className={`card ${className}`} style={{ padding:"20px" }}>{children}</div>;
}

export function Alert({ type="info", message }) {
  if (!message) return null;
  const styles = {
    error: { bg:"var(--danger-bg)", color:"var(--danger)", border:"rgba(220,38,38,.2)" },
    info:  { bg:"var(--info-bg)",   color:"var(--info)",   border:"rgba(37,99,235,.2)" },
    success:{ bg:"var(--safe-bg)", color:"var(--safe)",    border:"rgba(22,163,74,.2)" },
  };
  const s = styles[type] || styles.info;
  return (
    <div style={{ padding:"10px 12px", background:s.bg, border:`1px solid ${s.border}`,
      borderRadius:"8px", fontSize:"12px", color:s.color, fontWeight:500 }}>
      {message}
    </div>
  );
}

export function RiskBadge({ level, size="md" }) {
  const map = {
    SAFE:     "badge-safe",
    RISKY:    "badge-warn",
    CRITICAL: "badge-danger",
  };
  return level
    ? <span className={`badge ${map[level]||"badge-neutral"}`}>{level}</span>
    : null;
}

export function StatusBadge({ status }) {
  const map = {
    pending:   "badge-warn",
    confirmed: "badge-safe",
    rejected:  "badge-danger",
    completed: "badge-info",
    cancelled: "badge-neutral",
  };
  return status
    ? <span className={`badge ${map[status]||"badge-neutral"}`}>{status}</span>
    : null;
}

export function StatCard({ label, value, color, sub }) {
  return (
    <div className="card" style={{ padding:"16px", textAlign:"center" }}>
      <div style={{ fontFamily:"var(--fm)", fontWeight:800, fontSize:"1.5rem",
        color: color || "var(--cp)" }}>{value}</div>
      <div style={{ fontSize:"11px", color:"var(--tx-m)", textTransform:"uppercase",
        letterSpacing:".7px", marginTop:"3px" }}>{label}</div>
      {sub && <div style={{ fontSize:"11px", color:"var(--tx-s)", marginTop:"2px" }}>{sub}</div>}
    </div>
  );
}
