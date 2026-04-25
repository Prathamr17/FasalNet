// components/common/Navbar.js — multilang: English + Marathi only
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import i18n from "../../i18n";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "mr", label: "म"  },
];

export default function Navbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate       = useNavigate();
  const location       = useLocation();
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount,  setUnreadCount]  = useState(0);
  const menuRef = useRef(null);

  const NAV_LINKS = {
    farmer:   [
      { to: "/discover",   label: t("nav.discover")        },
      { to: "/ml-predict", label: t("nav.ml_predictions")  },
      { to: "/bookings",   label: t("nav.bookings")        },
    ],
    operator: [
      { to: "/operator",   label: t("nav.dashboard") },
    ],
    admin: [
      { to: "/discover",   label: t("nav.discover")  },
      { to: "/operator",   label: t("nav.dashboard") },
    ],
  };

  const ROLE_COLORS = {
    farmer:   { bg: "#DCFCE7", color: "#16A34A" },
    operator: { bg: "#DBEAFE", color: "#2563EB" },
    admin:    { bg: "#EDE9FE", color: "#7C3AED" },
  };

  useEffect(() => {
    if (user?.role !== "customer") return;
    const fetch = () => {};
    fetch();
    const timer = setInterval(fetch, 30000);
    return () => clearInterval(timer);
  }, [user]);

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLang   = code => { i18n.changeLanguage(code); localStorage.setItem("fasalnet_lang", code); };
  const handleLogout = () => { logout(); navigate("/login"); setMobileOpen(false); setUserMenuOpen(false); };

  const links    = NAV_LINKS[user?.role] || [];
  const isActive = path => location.pathname === path || location.pathname.startsWith(path + "/");
  const roleClr  = ROLE_COLORS[user?.role] || {};

  return (
    <>
      <nav style={{
        position: "sticky", top: 0, zIndex: 200,
        background: "var(--bg-l)",
        borderBottom: "1.5px solid var(--bd)",
        boxShadow: "0 1px 4px rgba(0,0,0,.05)",
      }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 20px",
          height: "56px", display: "flex", alignItems: "center", gap: "12px" }}>

          {/* Logo */}
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: "8px",
            textDecoration: "none", flexShrink: 0 }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "8px",
              background: "linear-gradient(135deg,#16A34A,#15803D)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" }}>
              🌿
            </div>
            <span style={{ fontFamily: "var(--fd)", fontWeight: 800, fontSize: "16px",
              color: "var(--tx)", letterSpacing: "-.3px" }}>
              {t("app_name")}
            </span>
          </Link>

          {/* Separator */}
          <div style={{ width: "1px", height: "20px", background: "var(--bd)", flexShrink: 0 }} className="hidden-mobile" />

          {/* Desktop nav links */}
          <div style={{ display: "flex", gap: "2px", alignItems: "center", flex: 1 }} className="hidden-mobile">
            {links.map(({ to, label }) => (
              <Link key={to} to={to} style={{
                padding: "6px 12px", borderRadius: "8px", textDecoration: "none",
                fontSize: "13px", fontWeight: isActive(to) ? 700 : 500,
                color:      isActive(to) ? "var(--cp)"      : "var(--tx-m)",
                background: isActive(to) ? "var(--cp-pale)" : "transparent",
                transition: "all .15s",
              }}>
                {label}
              </Link>
            ))}
          </div>

          {/* Right side controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>

            {/* Theme toggle */}
            <button onClick={toggleTheme}
              title={theme === "light" ? t("common.theme_dark") : t("common.theme_light")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "34px", height: "34px", borderRadius: "8px",
                background: "var(--bg-m)", border: "1.5px solid var(--bd)",
                fontSize: "16px", cursor: "pointer", flexShrink: 0,
                transition: "all .15s",
              }}>
              {theme === "light" ? "🌙" : "☀️"}
            </button>

            {/* Language switcher */}
            <div style={{ display: "flex", gap: "2px" }} className="hidden-mobile">
              {LANGUAGES.map(({ code, label }) => (
                <button key={code} onClick={() => handleLang(code)} style={{
                  background: i18n.language === code ? "var(--bg-m)" : "transparent",
                  border: "none", borderRadius: "6px", padding: "4px 7px",
                  fontSize: "11px", fontWeight: 600, cursor: "pointer",
                  color: i18n.language === code ? "var(--tx)" : "var(--tx-s)",
                }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Customer notification bell */}
            {user?.role === "customer" && (
              <Link to="/my-orders" title={t("common.notifications")} style={{
                position: "relative", textDecoration: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "34px", height: "34px", borderRadius: "8px",
                background: "var(--bg-m)", border: "1.5px solid var(--bd)",
                fontSize: "15px", flexShrink: 0,
              }}>
                🔔
                {unreadCount > 0 && (
                  <span style={{
                    position: "absolute", top: "-5px", right: "-5px",
                    background: "var(--danger)", color: "#fff",
                    borderRadius: "50%", width: "16px", height: "16px",
                    fontSize: "9px", fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "2px solid var(--bg-l)",
                  }}>
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}

            {/* User avatar / menu */}
            {user ? (
              <div ref={menuRef} style={{ position: "relative" }}>
                <button onClick={() => setUserMenuOpen(v => !v)} style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  background: "var(--bg-m)", border: "1.5px solid var(--bd)",
                  borderRadius: "9px", padding: "5px 10px",
                  cursor: "pointer", transition: "border-color .15s",
                }}>
                  <div style={{
                    width: "24px", height: "24px", borderRadius: "50%",
                    background: roleClr.bg || "var(--cp-pale)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: 800, color: roleClr.color || "var(--cp)",
                  }}>
                    {user.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }} className="hidden-mobile">
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--tx)", lineHeight: 1.2 }}>
                      {user.name?.split(" ")[0]}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--tx-m)", textTransform: "capitalize" }}>
                      {user.role}
                    </span>
                  </div>
                  <span style={{ color: "var(--tx-s)", fontSize: "9px" }}>▼</span>
                </button>

                {userMenuOpen && (
                  <div className="card" style={{
                    position: "absolute", right: 0, top: "calc(100% + 6px)",
                    width: "170px", padding: "6px", zIndex: 999,
                    boxShadow: "var(--sh3)",
                  }}>
                    <Link to="/settings" onClick={() => setUserMenuOpen(false)} style={{
                      display: "block", padding: "8px 12px", borderRadius: "7px",
                      fontSize: "13px", color: "var(--tx)", textDecoration: "none",
                      fontWeight: 500,
                    }}>
                      ⚙️ {t("nav.settings")}
                    </Link>
                    <button onClick={handleLogout} style={{
                      width: "100%", padding: "8px 12px", borderRadius: "7px",
                      fontSize: "13px", color: "var(--danger)", background: "transparent",
                      border: "none", cursor: "pointer", textAlign: "left", fontWeight: 500,
                    }}>
                      ↪ {t("nav.sign_out")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", gap: "6px" }}>
                <Link to="/login"  className="btn btn-ghost"   style={{ fontSize: "12px", padding: "6px 14px" }}>{t("auth.sign_in")}</Link>
                <Link to="/signup" className="btn btn-primary" style={{ fontSize: "12px", padding: "6px 14px" }}>{t("auth.sign_up")}</Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(v => !v)} className="show-mobile" style={{
              background: "var(--bg-m)", border: "1.5px solid var(--bd)",
              borderRadius: "8px", padding: "6px 9px", cursor: "pointer",
              fontSize: "15px", color: "var(--tx)",
            }}>
              {mobileOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="card" style={{
          position: "fixed", top: "57px", left: 0, right: 0, zIndex: 199,
          borderTop: 0, borderRadius: 0, borderLeft: "none", borderRight: "none",
          padding: "8px 16px 16px",
          boxShadow: "0 8px 24px rgba(0,0,0,.08)",
        }}>
          {links.map(({ to, label }) => (
            <Link key={to} to={to} style={{
              display: "block", padding: "10px 12px", borderRadius: "8px",
              fontSize: "14px", fontWeight: isActive(to) ? 700 : 500,
              color:      isActive(to) ? "var(--cp)"    : "var(--tx)",
              background: isActive(to) ? "var(--cp-pale)" : "transparent",
              textDecoration: "none", marginBottom: "2px",
            }}>
              {label}
            </Link>
          ))}
          {/* Mobile language switcher */}
          <div style={{ display: "flex", gap: "6px", padding: "10px 12px 4px" }}>
            {LANGUAGES.map(({ code, label }) => (
              <button key={code} onClick={() => handleLang(code)} style={{
                background: i18n.language === code ? "var(--cp-pale)" : "var(--bg-m)",
                border: `1.5px solid ${i18n.language === code ? "var(--cp)" : "var(--bd)"}`,
                borderRadius: "6px", padding: "4px 10px", fontSize: "11px",
                fontWeight: 600, cursor: "pointer",
                color: i18n.language === code ? "var(--cp)" : "var(--tx-m)",
              }}>
                {label}
              </button>
            ))}
          </div>
          {user && (
            <button onClick={handleLogout} style={{
              width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: "8px",
              fontSize: "14px", color: "var(--danger)", background: "transparent",
              border: "none", cursor: "pointer", marginTop: "4px",
            }}>
              ↪ {t("nav.sign_out")}
            </button>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .hidden-mobile { display: none !important; }
          .show-mobile   { display: flex !important; }
        }
        @media (min-width: 641px) {
          .hidden-mobile { display: flex !important; }
          .show-mobile   { display: none !important; }
        }
      `}</style>
    </>
  );
}
