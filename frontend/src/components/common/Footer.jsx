// components/common/Footer.jsx — v2: "AgriTech Glass" (ported from Stitch reference)
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const linkCls = "text-on-tertiary/70 hover:text-on-tertiary font-body-md text-body-md hover:underline decoration-secondary-fixed transition-all no-underline";

  return (
    <footer className="bg-tertiary w-full mt-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter px-margin-mobile md:px-margin-desktop py-12 max-w-container-max mx-auto">
        <div className="col-span-1 md:col-span-4 mb-8">
          <span className="font-headline-md text-headline-md text-on-tertiary">{t("app_name")}</span>
          <p className="text-on-tertiary/60 font-body-md text-sm mt-2 max-w-sm">{t("footer.tagline")}</p>
        </div>

        <div className="flex flex-col gap-4">
          <span className="text-on-tertiary/40 text-label-sm font-label-sm uppercase tracking-wide mb-1">{t("footer.platform")}</span>
          <Link to="/discover" className={linkCls}>{t("nav.cold_storage")}</Link>
          <Link to="/market" className={linkCls}>{t("nav.market")}</Link>
          <Link to="/marketplace" className={linkCls}>{t("footer.marketplace")}</Link>
        </div>

        <div className="flex flex-col gap-4">
          <span className="text-on-tertiary/40 text-label-sm font-label-sm uppercase tracking-wide mb-1">{t("footer.company")}</span>
          <Link to="/signup" className={linkCls}>{t("auth.sign_up")}</Link>
          <Link to="/login" className={linkCls}>{t("auth.sign_in")}</Link>
        </div>

        <div className="flex flex-col gap-4">
          <span className="text-on-tertiary/40 text-label-sm font-label-sm uppercase tracking-wide mb-1">{t("footer.contact")}</span>
          <span className="text-on-tertiary/70 font-body-md text-body-md">
            D.K.T.E. Society's TEI, Ichalkaranji
          </span>
        </div>

        <div className="col-span-1 md:col-span-4 mt-8 pt-8 border-t border-on-tertiary/20 flex flex-wrap justify-between gap-2">
          <p className="text-on-tertiary/50 font-body-md text-body-md">
            © {year} {t("app_name")} · {t("footer.rights")}
          </p>
          <p className="text-on-tertiary/50 font-body-md text-body-md">{t("footer.made_for")}</p>
        </div>
      </div>
    </footer>
  );
}
