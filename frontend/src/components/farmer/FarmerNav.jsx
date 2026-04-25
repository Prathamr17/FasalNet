// components/farmer/FarmerNav.jsx — v9
// Responsive sub-navbar for the Farmer module
import { NavLink } from "react-router-dom";

const LINKS = [
  { to:"/discover",  icon:"🔍", label:"Discover"       },
  { to:"/bookings",  icon:"📦", label:"Bookings"       },
  { to:"/ml-predict",icon:"🤖", label:"ML Predictions" },
];

export default function FarmerNav() {
  return (
    <nav style={{
      background:"var(--bg-l)",
      borderBottom:"1px solid var(--bd)",
      overflowX:"auto",
      WebkitOverflowScrolling:"touch",
    }}>
      <div style={{
        display:"flex",
        gap:"2px",
        padding:"4px 16px",
        maxWidth:"1100px",
        margin:"0 auto",
        minWidth:"max-content",
      }}>
        {LINKS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display:"flex",
              alignItems:"center",
              gap:"6px",
              padding:"8px 14px",
              borderRadius:"8px",
              fontFamily:"var(--fd)",
              fontWeight: isActive ? 700 : 500,
              fontSize:"13px",
              color: isActive ? "var(--cp)" : "var(--tx-m)",
              background: isActive ? "var(--cp-bg,rgba(204,218,71,.12))" : "transparent",
              textDecoration:"none",
              transition:"all .2s",
              whiteSpace:"nowrap",
              borderBottom: isActive ? "2px solid var(--cp)" : "2px solid transparent",
            })}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
