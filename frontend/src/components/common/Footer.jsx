// components/common/Footer.jsx
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Logo from "./Logo";

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="fn-footer">
      <div className="fn-container" style={{ padding: "40px 20px 24px" }}>
        <div style={{
          display: "grid", gap: 28,
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        }}>
          <div>
            <Logo size={28} wordmarkSize={16} />
            <p style={{ fontSize: 12.5, color: "var(--tx-m)", marginTop: 12, lineHeight: 1.7, maxWidth: 240 }}>
              {t("footer.tagline")}
            </p>
          </div>

          <div>
            <div className="section-label" style={{ marginBottom: 12 }}>{t("footer.platform")}</div>
            <FooterLink to="/discover">{t("nav.discover")}</FooterLink>
            <FooterLink to="/market">{t("nav.market")}</FooterLink>
            <FooterLink to="/marketplace">{t("footer.marketplace")}</FooterLink>
          </div>

          <div>
            <div className="section-label" style={{ marginBottom: 12 }}>{t("footer.company")}</div>
            <FooterLink to="/">{t("footer.about")}</FooterLink>
            <FooterLink to="/signup">{t("auth.sign_up")}</FooterLink>
            <FooterLink to="/login">{t("auth.sign_in")}</FooterLink>
          </div>

          <div>
            <div className="section-label" style={{ marginBottom: 12 }}>{t("footer.contact")}</div>
            <p style={{ fontSize: 12.5, color: "var(--tx-m)", lineHeight: 2 }}>
              D.K.T.E. Society's TEI<br />Ichalkaranji, Maharashtra
            </p>
          </div>
        </div>

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 10,
          marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--bd)",
        }}>
          <span style={{ fontSize: 11.5, color: "var(--tx-s)" }}>
            © {year} FasalNet · {t("footer.rights")}
          </span>
          <span style={{ fontSize: 11.5, color: "var(--tx-s)" }}>
            {t("footer.made_for")}
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ to, children }) {
  return (
    <Link to={to} style={{
      display: "block", fontSize: 13, color: "var(--tx-m)",
      textDecoration: "none", marginBottom: 10, transition: "color .15s",
    }}
      onMouseEnter={e => e.currentTarget.style.color = "var(--cp)"}
      onMouseLeave={e => e.currentTarget.style.color = "var(--tx-m)"}>
      {children}
    </Link>
  );
}
