// components/common/Navbar.js — v10 final
// Fixes:
//   - "ML Predictions" → "Crop Advisor" (clearer label)
//   - "Market" added for farmer role
//   - Mobile drawer z-index isolated to prevent rendering on desktop
//   - No icon prefixes on nav labels (clean, no visual clutter)

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth }  from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import i18n from "../../i18n";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "mr", label: "म"  },
];

export default function Navbar() {
  const { t }            = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // ── Nav link definitions per role ──────────────────────────────
  const NAV_LINKS = {
    farmer: [
      { to: "/discover",   label: t("nav.discover")     },   // cold storage + spoilage risk
      { to: "/market",     label: t("nav.market")       },   // live APMC data + ARIMA
      { to: "/ml-predict", label: t("nav.crop_advisor") },   // price predict + best market
      { to: "/bookings",   label: t("nav.bookings")     },
    ],
    operator: [
      { to: "/operator",   label: t("nav.dashboard") },
    ],
    admin: [
      { to: "/discover",   label: t("nav.discover")  },
      { to: "/market",     label: t("nav.market")    },
      { to: "/operator",   label: t("nav.dashboard") },
    ],
  };

  const ROLE_COLORS = {
    farmer:   { bg: "#DCE8D2", color: "#3F6B33" },
    operator: { bg: "#DCE2EC", color: "#2B4570" },
    admin:    { bg: "#E7DCE7", color: "#5C3A5C" },
  };

  // Close user-menu on outside click
  useEffect(() => {
    const h = e => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLang   = code => { i18n.changeLanguage(code); localStorage.setItem("fasalnet_lang", code); };
  const handleLogout = () => { logout(); navigate("/login"); setMobileOpen(false); setUserMenuOpen(false); };

  const links    = NAV_LINKS[user?.role] || [];
  const isActive = path => location.pathname === path || location.pathname.startsWith(path + "/");
  const roleClr  = ROLE_COLORS[user?.role] || {};

  return (
    <>
      {/* ── Top bar ────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 200,
        background: "var(--bg-l)",
        borderBottom: "1.5px solid var(--bd)",
        boxShadow: "0 1px 4px rgba(0,0,0,.05)",
      }}>
        <div style={{
          maxWidth: "1280px", margin: "0 auto", padding: "0 20px",
          height: "56px", display: "flex", alignItems: "center", gap: "12px",
        }}>

          {/* Logo */}
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: "8px",
            textDecoration: "none", flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: 6,
              background: "linear-gradient(135deg,#3F6B33,#2E4F25)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
              🌿
            </div>
            <span style={{ fontFamily: "var(--fd)", fontWeight: 600, fontSize: 18,
              color: "var(--tx)", letterSpacing: "-.2px" }}>
              {t("app_name")}
            </span>
          </Link>

          {/* Divider — desktop only */}
          <div className="fnav-desktop-only"
            style={{ width: 1, height: 20, background: "var(--bd)", flexShrink: 0 }} />

          {/* Desktop nav links */}
          <div className="fnav-desktop-only"
            style={{ display: "flex", gap: 2, alignItems: "center", flex: 1 }}>
            {links.map(({ to, label }) => (
              <Link key={to} to={to} style={{
                padding: "6px 12px", borderRadius: 8, textDecoration: "none",
                fontSize: 13, fontWeight: isActive(to) ? 700 : 500,
                color:      isActive(to) ? "var(--cp)"      : "var(--tx-m)",
                background: isActive(to) ? "var(--cp-pale)" : "transparent",
                transition: "all .15s",
              }}>
                {label}
              </Link>
            ))}
          </div>

          {/* Right controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>

            {/* Theme toggle */}
            <button onClick={toggleTheme}
              title={theme === "light" ? t("common.theme_dark") : t("common.theme_light")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 34, height: 34, borderRadius: 8,
                background: "var(--bg-m)", border: "1.5px solid var(--bd)",
                fontSize: 16, cursor: "pointer", flexShrink: 0,
              }}>
              {theme === "light" ? "🌙" : "☀️"}
            </button>

            {/* Language switcher — desktop only */}
            <div className="fnav-desktop-only" style={{ display: "flex", gap: 2 }}>
              {LANGUAGES.map(({ code, label }) => (
                <button key={code} onClick={() => handleLang(code)} style={{
                  background: i18n.language === code ? "var(--bg-m)" : "transparent",
                  border: "none", borderRadius: 6, padding: "4px 7px",
                  fontSize: 11, fontWeight: 600, cursor: "pointer",
                  color: i18n.language === code ? "var(--tx)" : "var(--tx-s)",
                }}>
                  {label}
                </button>
              ))}
            </div>

            {/* User menu */}
            {user ? (
              <div ref={menuRef} style={{ position: "relative" }}>
                <button onClick={() => setUserMenuOpen(v => !v)} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "var(--bg-m)", border: "1.5px solid var(--bd)",
                  borderRadius: 9, padding: "5px 10px", cursor: "pointer",
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: roleClr.bg || "var(--cp-pale)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, color: roleClr.color || "var(--cp)",
                  }}>
                    {user.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="fnav-desktop-only"
                    style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--tx)", lineHeight: 1.2 }}>
                      {user.name?.split(" ")[0]}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--tx-m)", textTransform: "capitalize" }}>
                      {user.role}
                    </span>
                  </div>
                  <span style={{ color: "var(--tx-s)", fontSize: 9 }}>▼</span>
                </button>

                {userMenuOpen && (
                  <div className="card" style={{
                    position: "absolute", right: 0, top: "calc(100% + 6px)",
                    width: 170, padding: 6, zIndex: 999,
                    boxShadow: "var(--sh3)",
                  }}>
                    <Link to="/settings" onClick={() => setUserMenuOpen(false)} style={{
                      display: "block", padding: "8px 12px", borderRadius: 7,
                      fontSize: 13, color: "var(--tx)", textDecoration: "none", fontWeight: 500,
                    }}>
                      ⚙️ {t("nav.settings")}
                    </Link>
                    <button onClick={handleLogout} style={{
                      width: "100%", padding: "8px 12px", borderRadius: 7,
                      fontSize: 13, color: "var(--danger)", background: "transparent",
                      border: "none", cursor: "pointer", textAlign: "left", fontWeight: 500,
                    }}>
                      ↪ {t("nav.sign_out")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <Link to="/login"  className="btn btn-ghost"   style={{ fontSize: 12, padding: "6px 14px" }}>{t("auth.sign_in")}</Link>
                <Link to="/signup" className="btn btn-primary" style={{ fontSize: 12, padding: "6px 14px" }}>{t("auth.sign_up")}</Link>
              </div>
            )}

            {/* Hamburger — mobile only */}
            <button onClick={() => setMobileOpen(v => !v)}
              className="fnav-mobile-only"
              style={{
                background: "var(--bg-m)", border: "1.5px solid var(--bd)",
                borderRadius: 8, padding: "6px 9px", cursor: "pointer",
                fontSize: 15, color: "var(--tx)",
              }}>
              {mobileOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Signature strip: mandi rate-board ticker ────────────── */}
      {user && (
        <div className="fn-ticker">
          <span className="fn-ticker-dot" />
          <span>{t(`nav.role_${user.role}`, user.role)?.toString().toUpperCase()}</span>
          <span className="fn-ticker-sep">·</span>
          <span>{t("app_name")?.toString().toUpperCase()} COORDINATION BOARD</span>
          <span className="fn-ticker-sep">·</span>
          <span>{new Date().toLocaleDateString(i18n.language === "mr" ? "mr-IN" : "en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
        </div>
      )}

      {/* ── Mobile drawer (only mounts when open) ──────────────── */}
      {mobileOpen && (
        <div className="card" style={{
          position: "fixed", top: 57, left: 0, right: 0, zIndex: 199,
          borderTop: 0, borderRadius: 0, borderLeft: "none", borderRight: "none",
          padding: "8px 16px 16px",
          boxShadow: "0 8px 24px rgba(0,0,0,.08)",
        }}>
          {links.map(({ to, label }) => (
            <Link key={to} to={to} style={{
              display: "block", padding: "10px 12px", borderRadius: 8,
              fontSize: 14, fontWeight: isActive(to) ? 700 : 500,
              color:      isActive(to) ? "var(--cp)"      : "var(--tx)",
              background: isActive(to) ? "var(--cp-pale)" : "transparent",
              textDecoration: "none", marginBottom: 2,
            }}>
              {label}
            </Link>
          ))}
          <div style={{ display: "flex", gap: 6, padding: "10px 12px 4px" }}>
            {LANGUAGES.map(({ code, label }) => (
              <button key={code} onClick={() => handleLang(code)} style={{
                background: i18n.language === code ? "var(--cp-pale)" : "var(--bg-m)",
                border: `1.5px solid ${i18n.language === code ? "var(--cp)" : "var(--bd)"}`,
                borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600,
                cursor: "pointer", color: i18n.language === code ? "var(--cp)" : "var(--tx-m)",
              }}>
                {label}
              </button>
            ))}
          </div>
          {user && (
            <button onClick={handleLogout} style={{
              width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 8,
              fontSize: 14, color: "var(--danger)", background: "transparent",
              border: "none", cursor: "pointer", marginTop: 4,
            }}>
              ↪ {t("nav.sign_out")}
            </button>
          )}
        </div>
      )}

      {/*
        CSS strategy: use unique class names (fnav-*) to avoid conflicts
        with any global .hidden-mobile / .show-mobile rules in index.css
      */}
      <style>{`
        @media (max-width: 640px) {
          .fnav-desktop-only { display: none !important; }
          .fnav-mobile-only  { display: flex !important; }
        }
        @media (min-width: 641px) {
          .fnav-desktop-only { display: flex !important; }
          .fnav-mobile-only  { display: none !important; }
        }
      `}</style>
    </>
  );
}
