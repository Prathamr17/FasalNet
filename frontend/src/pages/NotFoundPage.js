// pages/NotFoundPage.js
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Sprout, Home } from "lucide-react";
import Button from "../components/ui/Button";
import Reveal from "../components/ui/Reveal";

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center px-4 text-center">
      <Reveal>
        <motion.div
          className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-panel bg-accent-pale text-accent"
          animate={{ rotate: [0, -8, 8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sprout size={30} />
        </motion.div>
        <div className="mt-2 font-display text-8xl font-black text-line-strong">404</div>
        <h1 className="mt-2 font-display text-2xl font-black text-ink">{t("common.not_found_title")}</h1>
        <p className="mx-auto mb-6 mt-2 max-w-sm text-sm text-ink-muted">{t("common.not_found_desc")}</p>
        <Button as={Link} to="/" size="lg">
          <Home size={16} /> {t("common.back_to_home")}
        </Button>
      </Reveal>
    </div>
  );
}
