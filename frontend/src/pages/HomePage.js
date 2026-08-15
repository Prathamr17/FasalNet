// pages/HomePage.js — v7: premium smart-agriculture redesign
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import Reveal from "../components/common/Reveal";

export default function HomePage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const STATS = [
    { num: "₹17B", label: t("home.stat_loss_label"),    sub: t("home.stat_loss_sub"),    emoji: "💰" },
    { num: "25+",  label: t("home.stat_storage_label"),  sub: t("home.stat_storage_sub"), emoji: "🏭" },
    { num: "<60s", label: t("home.stat_speed_label"),    sub: t("home.stat_speed_sub"),   emoji: "⚡" },
    { num: "3",    label: t("home.stat_lang_label"),     sub: t("home.stat_lang_sub"),    emoji: "🌐" },
  ];
  const STEPS = [
    { n: "01", emoji: "🌾", title: t("home.step1_title"), desc: t("home.step1_desc") },
    { n: "02", emoji: "🤖", title: t("home.step2_title"), desc: t("home.step2_desc") },
    { n: "03", emoji: "🗺",  title: t("home.step3_title"), desc: t("home.step3_desc") },
    { n: "04", emoji: "✅", title: t("home.step4_title"), desc: t("home.step4_desc") },
  ];
  const ROLES = [
    { emoji: "🌾", label: t("nav.role_farmer"),   color: "#3F6B33", bg: "#DCE8D2", desc: t("home.role_farmer_desc") },
    { emoji: "🏭", label: t("nav.role_operator"), color: "#2B4570", bg: "#DCE2EC", desc: t("home.role_operator_desc") },
    { emoji: "🛒", label: t("nav.role_customer"), color: "#B4741E", bg: "#F1E1BF", desc: t("home.role_customer_desc") },
  ];

  const goToPath = user?.role === "farmer" ? "/discover"
    : user?.role === "operator" ? "/operator"
    : user?.role === "customer" ? "/marketplace"
    : user?.role === "delivery_boy" ? "/delivery" : "/";
  const goToLabel = user?.role === "farmer" ? t("nav.discover")
    : user?.role === "operator" ? t("nav.dashboard")
    : user?.role === "customer" ? t("nav.marketplace")
    : user?.role === "delivery_boy" ? t("nav.deliveries") : "";

  return (
    <div>
      {/* ── Hero — field texture backdrop, organic blob accent ────── */}
      <section className="field-texture" style={{ position: "relative", overflow: "hidden", padding: "72px 20px 56px" }}>
        <div className="leaf-blob" style={{ top: "-140px", right: "-120px" }} />
        <div className="fn-container" style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 720 }}>
          <Reveal className="chip">{t("home.eyebrow")}</Reveal>

          <Reveal delay={80} as="h1" style={{
            fontFamily: "var(--fd)", fontWeight: 600,
            fontSize: "clamp(2.1rem,5.2vw,3.4rem)", lineHeight: 1.15,
            margin: "20px 0 16px", color: "var(--tx)",
          }}>
            {t("home.hero_line1")}<br />
            <span style={{ color: "var(--cp)" }}>{t("home.hero_highlight")}</span>{" "}
            <span style={{ color: "var(--tx-m)", fontWeight: 500 }}>{t("home.hero_line2")}</span>
          </Reveal>

          <Reveal delay={140} as="p" style={{
            color: "var(--tx-m)", fontSize: "1rem", maxWidth: 500,
            margin: "0 auto 28px", lineHeight: 1.7,
          }}>
            {t("home.hero_sub")}
          </Reveal>

          <Reveal delay={200} style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
            {user ? (
              <Link to={goToPath} className="btn btn-primary hover-lift" style={{ fontSize: 15, padding: "12px 28px" }}>
                {t("home.go_to")} {goToLabel} →
              </Link>
            ) : (
              <>
                <Link to="/signup" className="btn btn-primary hover-lift" style={{ fontSize: 15, padding: "12px 28px" }}>
                  {t("home.get_started")}
                </Link>
                <Link to="/login" className="btn btn-ghost hover-lift" style={{ fontSize: 15, padding: "12px 24px" }}>
                  {t("home.sign_in")}
                </Link>
              </>
            )}
          </Reveal>

          <Reveal delay={260} style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 18, flexWrap: "wrap" }}>
            {[t("home.feat_no_fees"), t("home.feat_2g"), t("home.feat_languages"), t("home.feat_ml")].map((f, i) => (
              <span key={i} style={{ fontSize: 12, color: "var(--tx-m)" }}>✓ {f}</span>
            ))}
          </Reveal>
        </div>
      </section>

      <div className="fn-container">
        {/* ── Stats ────────────────────────────────────────────────── */}
        <section className="fn-section" style={{ paddingTop: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14 }}>
            {STATS.map((s, i) => (
              <Reveal key={i} delay={i * 70} className="card hover-lift" style={{ padding: "22px 16px", textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>{s.emoji}</div>
                <div style={{ fontFamily: "var(--fm)", fontWeight: 700, fontSize: "1.8rem", color: "var(--cp)", lineHeight: 1 }}>
                  {s.num}
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--tx)", marginTop: 6 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "var(--tx-m)", marginTop: 3 }}>{s.sub}</div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Roles ────────────────────────────────────────────────── */}
        <section className="fn-section" style={{ paddingTop: 0 }}>
          <Reveal as="h2" style={{
            fontFamily: "var(--fd)", fontWeight: 600, fontSize: "1.7rem",
            textAlign: "center", marginBottom: 28, color: "var(--tx)",
          }}>
            {t("home.roles_title")}
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
            {ROLES.map((r, i) => (
              <Reveal key={i} delay={i * 90} className="card hover-lift"
                style={{ padding: 22, borderTop: `3px solid ${r.color}` }}>
                <div className="icon-tile" style={{ background: r.bg, marginBottom: 14 }}>{r.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: 15.5, color: r.color, marginBottom: 8 }}>{r.label}</div>
                <div style={{ fontSize: 13, color: "var(--tx-m)", lineHeight: 1.6 }}>{r.desc}</div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────── */}
        <section className="fn-section" style={{ paddingTop: 0 }}>
          <Reveal as="h2" style={{
            fontFamily: "var(--fd)", fontWeight: 600, fontSize: "1.7rem",
            textAlign: "center", marginBottom: 28, color: "var(--tx)",
          }}>
            {t("home.how_title")}
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
            {STEPS.map((s, i) => (
              <Reveal key={i} delay={i * 80} className="card hover-lift"
                style={{ padding: 20, position: "relative", overflow: "hidden" }}>
                <div style={{
                  position: "absolute", top: -10, right: 6,
                  fontFamily: "var(--fm)", fontWeight: 700, fontSize: "3.4rem",
                  color: "var(--bg-d)", lineHeight: 1, userSelect: "none",
                }}>{s.n}</div>
                <span style={{ fontSize: "1.8rem", display: "block", marginBottom: 12 }}>{s.emoji}</span>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--tx)", marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "var(--tx-m)", lineHeight: 1.6 }}>{s.desc}</div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <section className="fn-section" style={{ paddingTop: 0 }}>
          <Reveal className="card-premium hover-lift" style={{
            padding: "44px 32px", textAlign: "center",
            background: "linear-gradient(135deg,var(--cp-pale),var(--bg-l))",
          }}>
            <div style={{ fontSize: "2.4rem", marginBottom: 12, position: "relative" }}>🚀</div>
            <h2 style={{
              fontFamily: "var(--fd)", fontWeight: 600, fontSize: "1.6rem",
              marginBottom: 8, color: "var(--tx)", position: "relative",
            }}>
              {t("home.cta_title")}
            </h2>
            <p style={{ color: "var(--tx-m)", fontSize: 13, marginBottom: 22, position: "relative" }}>
              {t("home.cta_sub")}
            </p>
            <Link to="/signup" className="btn btn-primary hover-lift"
              style={{ fontSize: 14, padding: "12px 28px", position: "relative" }}>
              {t("home.cta_btn")} →
            </Link>
          </Reveal>
        </section>
      </div>
    </div>
  );
}
