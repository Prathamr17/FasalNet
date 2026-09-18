// components/common/Navbar.js — v12: redesigned with Tailwind + Framer Motion,
// all v11 logic (role-based links, auth, theme, language, mobile drawer,
// rate-board ticker) preserved exactly — only the presentation layer changed.
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun, ChevronDown, Menu, X, Settings, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import i18n from "../../i18n";
import { cn } from "../../lib/utils";
import Button from "../ui/Button";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "hi", label: "हि" },
  { code: "mr", label: "मरा" },
];

export default function Navbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);

  // ── Nav link definitions per role (unchanged) ──────────────────
  const NAV_LINKS = {
    farmer: [
      { to: "/discover", label: t("nav.discover") },
      { to: "/market", label: t("nav.market") },
      { to: "/ml-predict", label: t("nav.crop_advisor") },
      { to: "/bookings", label: t("nav.bookings") },
      { to: "/farmer-orders", label: t("nav.orders") },
    ],
    operator: [{ to: "/operator", label: t("nav.dashboard") }],
    admin: [
      { to: "/discover", label: t("nav.discover") },
      { to: "/market", label: t("nav.market") },
      { to: "/operator", label: t("nav.dashboard") },
    ],
    delivery_boy: [{ to: "/delivery", label: t("nav.dashboard") }],
  };

  const ROLE_COLORS = {
    farmer: { bg: "var(--cp-pale)", color: "var(--cp)" },
    operator: { bg: "var(--info-bg)", color: "var(--info)" },
    admin: { bg: "var(--danger-bg)", color: "var(--danger)" },
    delivery_boy: { bg: "var(--cp-pale)", color: "var(--cp)" },
  };

  // Close user-menu on outside click
  useEffect(() => {
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Sticky-scroll elevation
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLang = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem("fasalnet_lang", code);
  };
  const handleLogout = () => {
    logout();
    navigate("/login");
    setMobileOpen(false);
    setUserMenuOpen(false);
  };

  const links = NAV_LINKS[user?.role] || [];
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");
  const roleClr = ROLE_COLORS[user?.role] || {};

  const dateLocale = i18n.language === "hi" ? "hi-IN" : i18n.language === "mr" ? "mr-IN" : "en-IN";
  const dateFormatted = new Date()
    .toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();

  return (
    <>
      {/* ── Top bar ────────────────────────────────────────────── */}
      <nav
        className={cn(
          "sticky top-0 z-[200] bg-surface-light/90 backdrop-blur-md border-b-[1.5px] border-line transition-shadow duration-200",
          scrolled && "shadow-subtle"
        )}
      >
        <div className="mx-auto flex h-14 max-w-container items-center gap-3 px-4 sm:px-6">
          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-2.5 no-underline">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white p-1 shadow-xs">
              <img src="/logo.png" alt="FasalNet" className="h-full w-full object-contain" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-ink">
              {t("app_name")}
            </span>
          </Link>

          <div className="hidden h-5 w-px shrink-0 bg-line sm:block" />

          {/* Desktop nav links */}
          <div className="hidden flex-1 items-center gap-1 sm:flex">
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[13px] font-medium no-underline transition-colors duration-150",
                  isActive(to)
                    ? "bg-accent-pale font-bold text-accent"
                    : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                )}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right controls */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === "light" ? t("common.theme_dark") : t("common.theme_light")}
              className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-lg border border-line bg-surface-light text-ink-muted transition-colors hover:text-accent hover:bg-surface-muted"
            >
              {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            {/* Language switcher — desktop only */}
            <div className="hidden items-center gap-1 sm:flex">
              {LANGUAGES.map(({ code, label }) => (
                <button
                  key={code}
                  onClick={() => handleLang(code)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-bold transition-all duration-150",
                    i18n.language === code
                      ? "border border-accent/30 bg-accent-pale text-accent shadow-xs"
                      : "border border-transparent text-ink-soft hover:text-ink hover:bg-surface-muted"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* User menu */}
            {user ? (
              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-lg border-[1.5px] border-line bg-surface-muted px-2.5 py-[5px]"
                >
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold"
                    style={{ background: roleClr.bg || "var(--cp-pale)", color: roleClr.color || "var(--cp)" }}
                  >
                    {user.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="hidden flex-col items-start sm:flex">
                    <span className="text-xs font-bold leading-tight text-ink">
                      {user.name?.split(" ")[0]}
                    </span>
                    <span className="text-[10px] text-ink-muted">{t(`auth.${user.role}`, user.role)}</span>
                  </div>
                  <ChevronDown size={12} className="text-ink-soft" />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-[calc(100%+6px)] z-[999] w-[180px] rounded-panel border border-line bg-surface-card p-1.5 shadow-lifted"
                    >
                      <Link
                        to="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium text-ink no-underline hover:bg-surface-muted"
                      >
                        <Settings size={14} /> {t("nav.settings")}
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] font-medium text-danger hover:bg-danger-bg"
                      >
                        <LogOut size={14} /> {t("nav.sign_out")}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-2.5 py-1.5 text-[13px] font-semibold text-ink-muted hover:text-ink no-underline transition-colors"
                >
                  {t("auth.sign_in", "Sign In")}
                </Link>
                <Link
                  to="/signup"
                  className="rounded-lg bg-[#375E2C] hover:bg-[#2D4D24] text-white px-4 py-1.5 text-[13px] font-bold no-underline shadow-sm transition-all active:scale-95"
                >
                  {t("auth.sign_up", "Sign Up")}
                </Link>
              </div>
            )}

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-[34px] w-[34px] items-center justify-center rounded-md border-[1.5px] border-line bg-surface-muted text-ink sm:hidden"
              aria-label={mobileOpen ? t("common.close", "Close") : t("common.menu", "Menu")}
            >
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Signature strip: mandi rate-board ticker ────────────── */}
      {user && (
        <div className="fn-ticker">
          <span className="fn-ticker-dot" />
          <span>{t(`auth.${user.role}`, user.role)?.toString().toUpperCase()}</span>
          <span className="fn-ticker-sep">·</span>
          <span>
            {t("app_name")?.toString().toUpperCase()} {t("nav.coordination_board")}
          </span>
          <span className="fn-ticker-sep">·</span>
          <span>{dateFormatted}</span>
        </div>
      )}

      {/* ── Mobile drawer ───────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="fixed left-0 right-0 top-14 z-[199] border-t border-line bg-surface-card px-4 pb-4 pt-2 shadow-card sm:hidden"
          >
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "mb-0.5 block rounded-md px-3 py-2.5 text-sm font-medium no-underline",
                  isActive(to) ? "bg-accent-pale font-bold text-accent" : "text-ink"
                )}
              >
                {label}
              </Link>
            ))}
            <div className="flex gap-1.5 px-3 pb-1 pt-2.5">
              {LANGUAGES.map(({ code, label }) => (
                <button
                  key={code}
                  onClick={() => handleLang(code)}
                  className={cn(
                    "rounded-md border-[1.5px] px-2.5 py-1 text-[11px] font-semibold",
                    i18n.language === code
                      ? "border-accent bg-accent-pale text-accent"
                      : "border-line bg-surface-muted text-ink-muted"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {user && (
              <button
                onClick={handleLogout}
                className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-medium text-danger"
              >
                <LogOut size={14} /> {t("nav.sign_out")}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
