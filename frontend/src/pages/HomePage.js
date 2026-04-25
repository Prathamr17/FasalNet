// pages/HomePage.js — v6: minimal light theme
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const STATS = [
  { num:"₹17B", label:"Annual Loss Prevented", sub:"post-harvest food waste", emoji:"💰" },
  { num:"25+",  label:"Cold Storages",          sub:"across India",            emoji:"🏭" },
  { num:"<60s", label:"Book Storage",           sub:"one-tap booking",         emoji:"⚡" },
  { num:"3",    label:"Languages",              sub:"EN / हिं / मराठी",         emoji:"🌐" },
];
const STEPS = [
  { n:"01", emoji:"🌾", title:"Enter Crop Details",  desc:"Tell us your crop type, harvest age and quantity." },
  { n:"02", emoji:"🤖", title:"Get ML Risk Score",   desc:"Our Random Forest model rates spoilage: SAFE, RISKY, or CRITICAL." },
  { n:"03", emoji:"🗺",  title:"Find Cold Storage",   desc:"Map view with ranked cold storage options across India." },
  { n:"04", emoji:"✅", title:"Book Instantly",       desc:"One-tap booking. Operator confirms in real time." },
];
const ROLES = [
  { emoji:"🌾", label:"Farmer",   color:"#16A34A", bg:"#DCFCE7", desc:"Upload produce, book cold storage, track risk in real time" },
  { emoji:"🏭", label:"Operator", color:"#2563EB", bg:"#DBEAFE", desc:"Manage bookings, update capacity, approve orders" },
  { emoji:"🛒", label:"Customer", color:"#F97316", bg:"#FFEDD5", desc:"Browse marketplace, buy fresh produce, track your orders" },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div style={{ maxWidth:"1000px", margin:"0 auto", padding:"40px 20px" }}>

      {/* Hero */}
      <section style={{ textAlign:"center", marginBottom:"64px" }} className="anim-fadeup">
        <div style={{
          display:"inline-block", fontSize:"11px", fontWeight:700,
          textTransform:"uppercase", letterSpacing:"3px",
          background:"var(--cp-pale)", color:"var(--cp)",
          padding:"5px 16px", borderRadius:"99px", marginBottom:"20px",
          border:"1px solid rgba(22,163,74,.2)"
        }}>
          AgriTech · Built for India's Farmers
        </div>

        <h1 style={{
          fontFamily:"var(--fd)", fontWeight:800,
          fontSize:"clamp(2rem,5vw,3.2rem)", lineHeight:1.15,
          marginBottom:"16px", color:"var(--tx)",
        }}>
          Connect Farmers to<br/>
          <span style={{ color:"var(--cp)" }}>Cold Storage</span>{" "}
          <span style={{ color:"var(--tx-m)", fontWeight:600 }}>instantly.</span>
        </h1>

        <p style={{ color:"var(--tx-m)", fontSize:"1rem", maxWidth:"480px",
          margin:"0 auto 28px", lineHeight:1.7 }}>
          India loses ₹17.7B/year to post-harvest spoilage. FasalNet gives every farmer
          instant access to the nearest cold storage — before the loss happens.
        </p>

        <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:"10px" }}>
          {user ? (
            <Link to={user.role==="farmer"?"/discover":user.role==="operator"?"/operator":"/marketplace"}
              className="btn btn-primary" style={{ fontSize:"15px", padding:"12px 28px" }}>
              Go to {user.role==="farmer"?"Discover":user.role==="operator"?"Dashboard":"Marketplace"} →
            </Link>
          ) : (
            <>
              <Link to="/signup" className="btn btn-primary" style={{ fontSize:"15px", padding:"12px 28px" }}>
                Get Started Free
              </Link>
              <Link to="/login" className="btn btn-ghost" style={{ fontSize:"15px", padding:"12px 24px" }}>
                Sign In
              </Link>
            </>
          )}
        </div>

        <div style={{ display:"flex", justifyContent:"center", gap:"20px",
          marginTop:"16px", flexWrap:"wrap" }}>
          {["✓ No hidden fees","✓ Works on 2G","✓ 3 Languages","✓ ML-powered risk"].map((f,i) => (
            <span key={i} style={{ fontSize:"12px", color:"var(--tx-m)" }}>{f}</span>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section style={{ marginBottom:"56px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:"14px" }}>
          {STATS.map((s, i) => (
            <div key={i} className="card anim-fadeup" style={{ padding:"20px 16px",
              textAlign:"center", animationDelay:`${i*.08}s` }}>
              <div style={{ fontSize:"2rem", marginBottom:"8px" }}>{s.emoji}</div>
              <div style={{ fontFamily:"var(--fm)", fontWeight:800, fontSize:"1.9rem",
                color:"var(--cp)", lineHeight:1 }}>{s.num}</div>
              <div style={{ fontWeight:700, fontSize:"13px", color:"var(--tx)",
                marginTop:"5px" }}>{s.label}</div>
              <div style={{ fontSize:"11px", color:"var(--tx-m)", marginTop:"3px" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section style={{ marginBottom:"56px" }}>
        <h2 style={{ fontFamily:"var(--fd)", fontWeight:800, fontSize:"1.6rem",
          textAlign:"center", marginBottom:"24px", color:"var(--tx)" }}>
          Built for Everyone in the Chain
        </h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:"14px" }}>
          {ROLES.map((r, i) => (
            <div key={i} className="card anim-fadeup" style={{ padding:"20px",
              borderTop:`3px solid ${r.color}`, animationDelay:`${i*.1}s` }}>
              <div style={{ width:"44px", height:"44px", borderRadius:"12px",
                background:r.bg, display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:"22px", marginBottom:"12px" }}>
                {r.emoji}
              </div>
              <div style={{ fontWeight:700, fontSize:"15px", color:r.color, marginBottom:"7px" }}>
                {r.label}
              </div>
              <div style={{ fontSize:"13px", color:"var(--tx-m)", lineHeight:1.6 }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ marginBottom:"56px" }}>
        <h2 style={{ fontFamily:"var(--fd)", fontWeight:800, fontSize:"1.6rem",
          textAlign:"center", marginBottom:"24px", color:"var(--tx)" }}>
          How It Works
        </h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:"14px" }}>
          {STEPS.map((s, i) => (
            <div key={i} className="card anim-fadeup" style={{
              padding:"18px", position:"relative", overflow:"hidden",
              animationDelay:`${i*.09}s` }}>
              <div style={{ position:"absolute", top:"-8px", right:"4px",
                fontFamily:"var(--fm)", fontWeight:900, fontSize:"3.5rem",
                color:"var(--bg-d)", lineHeight:1, userSelect:"none" }}>{s.n}</div>
              <span style={{ fontSize:"1.8rem", display:"block", marginBottom:"10px" }}>{s.emoji}</span>
              <div style={{ fontWeight:700, fontSize:"13px", color:"var(--tx)",
                marginBottom:"5px" }}>{s.title}</div>
              <div style={{ fontSize:"12px", color:"var(--tx-m)", lineHeight:1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="card" style={{
          padding:"40px 32px", textAlign:"center",
          background:"linear-gradient(135deg,var(--cp-pale),var(--bg-l))",
          border:"1.5px solid rgba(22,163,74,.2)",
        }}>
          <div style={{ fontSize:"2.5rem", marginBottom:"12px" }}>🚀</div>
          <h2 style={{ fontFamily:"var(--fd)", fontWeight:800, fontSize:"1.6rem",
            marginBottom:"8px", color:"var(--tx)" }}>
            Ready to save your harvest?
          </h2>
          <p style={{ color:"var(--tx-m)", fontSize:"13px", marginBottom:"20px" }}>
            Join farmers, operators and buyers across India on FasalNet.
          </p>
          <Link to="/signup" className="btn btn-primary" style={{ fontSize:"14px", padding:"12px 28px" }}>
            Sign Up Free →
          </Link>
        </div>
      </section>
    </div>
  );
}
