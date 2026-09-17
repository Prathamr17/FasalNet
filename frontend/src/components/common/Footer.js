// components/common/Footer.js — redesigned premium footer (single source of
// truth; the previously-orphaned "AgriTech Glass" Footer.jsx was unused
// dead code and has been removed to avoid duplication).
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sprout, Mail, MapPin, Languages } from "lucide-react";
import { Container } from "../ui/Container";

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const linkCls = "text-sm text-ink-muted no-underline transition-colors hover:text-accent";

  return (
    <footer className="mt-16 border-t border-line bg-surface-light">
      <Container className="grid grid-cols-2 gap-x-8 gap-y-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="col-span-2 flex flex-col gap-3 lg:col-span-2">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-pale text-accent">
              <Sprout size={16} />
            </span>
            <span className="font-display text-lg font-bold text-ink">{t("app_name")}</span>
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-ink-muted">{t("footer.tagline")}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-ink-soft">
            <Languages size={13} />
            {t("footer.languages_note")}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            {t("footer.product")}
          </span>
          <Link to="/market" className={linkCls}>{t("footer.market_intel_link")}</Link>
          <Link to="/ml-predict" className={linkCls}>{t("footer.ai_advisor_link")}</Link>
          <Link to="/discover" className={linkCls}>{t("footer.cold_storage_link")}</Link>
          <Link to="/marketplace" className={linkCls}>{t("footer.marketplace")}</Link>
        </div>

        <div className="flex flex-col gap-3">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            {t("footer.company")}
          </span>
          <Link to="/signup" className={linkCls}>{t("auth.sign_up")}</Link>
          <Link to="/login" className={linkCls}>{t("auth.sign_in")}</Link>
          <Link to="/" className={linkCls}>{t("footer.about")}</Link>
        </div>

        <div className="flex flex-col gap-3">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            {t("footer.contact")}
          </span>
          <span className="flex items-start gap-2 text-sm text-ink-muted">
            <MapPin size={14} className="mt-0.5 shrink-0" />
            {t("footer.location")}
          </span>
          <span className="flex items-center gap-2 text-sm text-ink-muted">
            <Mail size={14} className="shrink-0" />
            hello@fasalnet.in
          </span>
        </div>
      </Container>

      <div className="border-t border-line">
        <Container className="flex flex-col items-center justify-between gap-2 py-5 sm:flex-row">
          <p className="text-xs text-ink-soft">
            © {year} {t("app_name")} · {t("footer.rights")}
          </p>
          <p className="text-xs text-ink-soft">{t("footer.made_for")}</p>
        </Container>
      </div>
    </footer>
  );
}
