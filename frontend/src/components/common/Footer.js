import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer style={{ borderTop: "1px solid var(--bd)", background: "var(--bg-l)", marginTop: 32 }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px", display: "flex", gap: 16, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
        <div><strong style={{ fontFamily: "var(--fd)", color: "var(--cp)" }}>{t("app_name")}</strong><span style={{ color: "var(--tx-m)", fontSize: 12, marginLeft: 8 }}>{t("tagline")}</span></div>
        <nav aria-label="Footer navigation" style={{ display: "flex", gap: 14, fontSize: 12 }}>
          <Link to="/" style={{ color: "var(--tx-m)" }}>{t("nav.home")}</Link><Link to="/login" style={{ color: "var(--tx-m)" }}>{t("nav.login")}</Link><Link to="/signup" style={{ color: "var(--tx-m)" }}>{t("nav.signup")}</Link>
        </nav>
      </div>
    </footer>
  );
}
