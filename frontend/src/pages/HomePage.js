// pages/HomePage.js — Fully localized farmer-first landing page
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const STATS = [
    { num: t("home.stat_1_num"), label: t("home.stat_1_lbl"), sub: t("home.stat_1_sub"), emoji: "💰" },
    { num: t("home.stat_2_num"), label: t("home.stat_2_lbl"), sub: t("home.stat_2_sub"), emoji: "🏭" },
    { num: t("home.stat_3_num"), label: t("home.stat_3_lbl"), sub: t("home.stat_3_sub"), emoji: "⚡" },
    { num: t("home.stat_4_num"), label: t("home.stat_4_lbl"), sub: t("home.stat_4_sub"), emoji: "🌐" },
  ];

  const STEPS = [
    { n: "01", emoji: "🌾", title: t("home.step_1_title"), desc: t("home.step_1_desc") },
    { n: "02", emoji: "🤖", title: t("home.step_2_title"), desc: t("home.step_2_desc") },
    { n: "03", emoji: "🗺",  title: t("home.step_3_title"), desc: t("home.step_3_desc") },
    { n: "04", emoji: "✅", title: t("home.step_4_title"), desc: t("home.step_4_desc") },
  ];

  const ROLES = [
    { emoji: "🌾", label: t("auth.farmer"),   color: "#3F6B33", bg: "#DCE8D2", desc: t("home.role_farmer_desc") },
    { emoji: "🏭", label: t("auth.operator"), color: "#2B4570", bg: "#DCE2EC", desc: t("home.role_operator_desc") },
    { emoji: "🛒", label: t("auth.customer"), color: "#B4741E", bg: "#F1E1BF", desc: t("home.role_customer_desc") },
  ];

  const FEATURES = [
    t("home.feature_1"),
    t("home.feature_2"),
    t("home.feature_3"),
    t("home.feature_4"),
  ];

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 20px" }}>

      {/* Hero */}
      <section style={{ textAlign: "center", marginBottom: "64px" }} className="anim-fadeup">
        <div style={{
          display: "inline-block", fontSize: "11px", fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "3px",
          background: "var(--cp-pale)", color: "var(--cp)",
          padding: "5px 16px", borderRadius: "99px", marginBottom: "20px",
          border: "1px solid rgba(63,107,51,.2)"
        }}>
          {t("home.badge")}
        </div>

        <h1 style={{
          fontFamily: "var(--fd)", fontWeight: 800,
          fontSize: "clamp(2rem,5vw,3.2rem)", lineHeight: 1.15,
          marginBottom: "16px", color: "var(--tx)",
        }}>
          {t("home.hero_title_1")}<br/>
          <span style={{ color: "var(--cp)" }}>{t("home.hero_title_2")}</span>{" "}
          <span style={{ color: "var(--tx-m)", fontWeight: 600 }}>{t("home.hero_title_3")}</span>
        </h1>

        <p style={{ color: "var(--tx-m)", fontSize: "1rem", maxWidth: "520px",
          margin: "0 auto 28px", lineHeight: 1.7 }}>
          {t("home.hero_sub")}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px" }}>
          {user ? (
            <Link to={user.role === "farmer" ? "/discover" : user.role === "operator" ? "/operator" : "/marketplace"}
              className="btn btn-primary" style={{ fontSize: "15px", padding: "12px 28px" }}>
              {user.role === "farmer" ? t("home.go_to_discover") : user.role === "operator" ? t("home.go_to_dashboard") : t("home.go_to_marketplace")}
            </Link>
          ) : (
            <>
              <Link to="/signup" className="btn btn-primary" style={{ fontSize: "15px", padding: "12px 28px" }}>
                {t("home.get_started_free")}
              </Link>
              <Link to="/login" className="btn btn-ghost" style={{ fontSize: "15px", padding: "12px 24px" }}>
                {t("auth.sign_in")}
              </Link>
            </>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "20px",
          marginTop: "16px", flexWrap: "wrap" }}>
          {FEATURES.map((f, i) => (
            <span key={i} style={{ fontSize: "12px", color: "var(--tx-m)", fontWeight: 500 }}>{f}</span>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section style={{ marginBottom: "56px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: "14px" }}>
          {STATS.map((s, i) => (
            <div key={i} className="card anim-fadeup" style={{ padding: "20px 16px",
              textAlign: "center", animationDelay: `${i * 0.08}s` }}>
              <div style={{ fontSize: "2rem", marginBottom: "8px" }}>{s.emoji}</div>
              <div style={{ fontFamily: "var(--fm)", fontWeight: 800, fontSize: "1.9rem",
                color: "var(--cp)", lineHeight: 1 }}>{s.num}</div>
              <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--tx)",
                marginTop: "5px" }}>{s.label}</div>
              <div style={{ fontSize: "11px", color: "var(--tx-m)", marginTop: "3px" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section style={{ marginBottom: "56px" }}>
        <h2 style={{ fontFamily: "var(--fd)", fontWeight: 800, fontSize: "1.6rem",
          textAlign: "center", marginBottom: "24px", color: "var(--tx)" }}>
          {t("home.roles_title")}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: "14px" }}>
          {ROLES.map((r, i) => (
            <div key={i} className="card anim-fadeup" style={{ padding: "20px",
              borderTop: `3px solid ${r.color}`, animationDelay: `${i * 0.1}s` }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px",
                background: r.bg, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "22px", marginBottom: "12px" }}>
                {r.emoji}
              </div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: r.color, marginBottom: "7px" }}>
                {r.label}
              </div>
              <div style={{ fontSize: "13px", color: "var(--tx-m)", lineHeight: 1.6 }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ marginBottom: "56px" }}>
        <h2 style={{ fontFamily: "var(--fd)", fontWeight: 800, fontSize: "1.6rem",
          textAlign: "center", marginBottom: "24px", color: "var(--tx)" }}>
          {t("home.how_title")}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "14px" }}>
          {STEPS.map((s, i) => (
            <div key={i} className="card anim-fadeup" style={{
              padding: "18px", position: "relative", overflow: "hidden",
              animationDelay: `${i * 0.09}s` }}>
              <div style={{ position: "absolute", top: "-8px", right: "4px",
                fontFamily: "var(--fm)", fontWeight: 900, fontSize: "3.5rem",
                color: "var(--bg-d)", lineHeight: 1, userSelect: "none" }}>{s.n}</div>
              <span style={{ fontSize: "1.8rem", display: "block", marginBottom: "10px" }}>{s.emoji}</span>
              <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--tx)",
                marginBottom: "5px" }}>{s.title}</div>
              <div style={{ fontSize: "12px", color: "var(--tx-m)", lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="card" style={{
          padding: "40px 32px", textAlign: "center",
          background: "linear-gradient(135deg,var(--cp-pale),var(--bg-l))",
          border: "1.5px solid rgba(63,107,51,.2)",
        }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🚀</div>
          <h2 style={{ fontFamily: "var(--fd)", fontWeight: 800, fontSize: "1.6rem",
            marginBottom: "8px", color: "var(--tx)" }}>
            {t("home.cta_title")}
          </h2>
          <p style={{ color: "var(--tx-m)", fontSize: "13px", marginBottom: "20px" }}>
            {t("home.cta_sub")}
          </p>
          <Link to="/signup" className="btn btn-primary" style={{ fontSize: "14px", padding: "12px 28px" }}>
            {t("home.cta_btn")}
          </Link>
        </div>
      </section>
    </div>
  );
}
