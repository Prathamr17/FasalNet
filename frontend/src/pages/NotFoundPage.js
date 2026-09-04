// pages/NotFoundPage.js
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-4 text-center">
      <div className="font-display font-black text-8xl text-wattle/20 mb-4">404</div>
      <h1 className="font-display font-black text-2xl text-white mb-2">{t("common.not_found_title")}</h1>
      <p className="text-text-muted text-sm mb-6 max-w-sm">
        {t("common.not_found_desc")}
      </p>
      <Link to="/"
        className="font-display font-bold px-6 py-2.5 bg-wattle text-bottle rounded-xl
          hover:bg-wattle-dark transition-colors">
        {t("common.back_to_home")}
      </Link>
    </div>
  );
}
