// pages/LoginPage.js — multilang: English + Marathi
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

const DEST = {
  farmer:   "/discover",
  operator: "/operator",
  admin:    "/discover",
};

const DEFAULT_GOOGLE_CLIENT_ID = "908938746183-nk466eofdifsrj865ftkh50aheftvkb3.apps.googleusercontent.com";

function useGoogleAuth(onSuccess, onError) {
  useEffect(() => {
    const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
    if (!CLIENT_ID) return;

    const renderGoogleBtn = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: CLIENT_ID,
            callback: (res) => {
              if (res && res.credential) {
                onSuccess(res.credential);
              } else if (onError) {
                onError("Google sign-in did not return valid credentials.");
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          const btnEl = document.getElementById("google-signin-btn");
          if (btnEl) {
            btnEl.innerHTML = "";
            window.google.accounts.id.renderButton(btnEl, {
              type: "standard",
              theme: "outline",
              size: "large",
              text: "continue_with",
              shape: "rectangular",
              logo_alignment: "left",
              width: btnEl.offsetWidth > 200 ? btnEl.offsetWidth : 392,
            });
          }
        } catch (e) {
          console.warn("Google Identity initialize error:", e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      renderGoogleBtn();
    } else {
      let script = document.getElementById("google-gsi-client");
      if (!script) {
        script = document.createElement("script");
        script.id = "google-gsi-client";
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = renderGoogleBtn;
        document.head.appendChild(script);
      } else {
        script.addEventListener("load", renderGoogleBtn);
      }
    }
  }, [onSuccess, onError]);
}

export default function LoginPage() {
  const { t }                       = useTranslation();
  const { login, loginWithGoogle }  = useAuth();
  const navigate                    = useNavigate();
  const [form,    setForm]          = useState({ phone: "", password: "" });
  const [loading, setLoad]          = useState(false);
  const [error,   setError]         = useState("");
  const [filled,  setFilled]        = useState(null);

  const DEMO_ACCOUNTS = [
    { role: "farmer",   emoji: "🌾", label: t("auth.farmer"),   phone: "9000000001", pass: "farmer123",   color: "#3F6B33", bg: "rgba(126,200,80,.1)",  border: "rgba(126,200,80,.3)",  desc: "Ramesh Jadhav · Kolhapur" },
    { role: "operator", emoji: "🏭", label: t("auth.operator"), phone: "9000000002", pass: "operator123", color: "#2B4570", bg: "rgba(43,69,112,.1)",  border: "rgba(43,69,112,.3)",  desc: "Sunita Patil · Manager"   },
  ];

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoad(true);
    try {
      const user = await login(form.phone, form.password);
      navigate(DEST[user.role] || "/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || t("auth.invalid_creds"));
    } finally { setLoad(false); }
  };

  const handleGoogle = async (idToken) => {
    setError("");
    setLoad(true);
    try {
      const user = await loginWithGoogle(idToken, "farmer");
      navigate(DEST[user.role] || "/discover", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Google sign-in failed. Please try again.");
    } finally {
      setLoad(false);
    }
  };

  useGoogleAuth(handleGoogle, (err) => setError(err));

  const fillDemo = (acc) => { setForm({ phone: acc.phone, password: acc.pass }); setFilled(acc.role); setError(""); };

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "2rem 1rem", position: "relative", overflow: "hidden" }}>

      {/* BG orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "40vw", height: "40vw", borderRadius: "50%",
          background: "radial-gradient(circle,var(--cp-glow),transparent 70%)", animation: "float 6s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-15%", right: "-5%", width: "35vw", height: "35vw", borderRadius: "50%",
          background: "radial-gradient(circle,var(--cp-glow),transparent 70%)", animation: "float 8s ease-in-out infinite", animationDelay: "2s" }} />
      </div>

      <div style={{ width: "100%", maxWidth: "440px", position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div className="au d1" style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "8px" }} className="afr">🌿</div>
          <h1 style={{ fontFamily: "var(--fd)", fontWeight: 800, fontSize: "2rem", color: "var(--cp)", marginBottom: "4px" }}>
            {t("app_name")}
          </h1>
          <p style={{ color: "var(--tx-m)", fontSize: "13px" }}>{t("tagline")}</p>
        </div>

        {/* Demo accounts */}
        <div className="au d2" style={{ marginBottom: "1.25rem" }}>
          <p style={{ fontSize: "11px", color: "var(--tx-m)", textAlign: "center", marginBottom: "8px",
            textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600 }}>
            ⚡ {t("auth.quick_login")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "8px" }}>
            {DEMO_ACCOUNTS.map(acc => (
              <button key={acc.role} onClick={() => fillDemo(acc)}
                style={{ padding: "10px 8px", borderRadius: "12px", border: "1.5px solid",
                  borderColor: filled === acc.role ? acc.color : acc.border,
                  background: filled === acc.role ? acc.bg : "var(--bg-l)",
                  cursor: "pointer", transition: "all .2s", textAlign: "center",
                  boxShadow: filled === acc.role ? `0 0 0 2px ${acc.color}40` : "none" }}>
                <div style={{ fontSize: "20px", marginBottom: "4px" }}>{acc.emoji}</div>
                <div style={{ fontFamily: "var(--fd)", fontWeight: 700, fontSize: "12px", color: acc.color }}>{acc.label}</div>
                <div style={{ fontSize: "10px", color: "var(--tx-m)", marginTop: "2px" }}>{acc.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Login card */}
        <div className="au d3" style={{ background: "var(--bg-l)", border: "1px solid var(--bd)",
          borderRadius: "20px", padding: "24px", boxShadow: "var(--sh)" }}>
          <h2 style={{ fontFamily: "var(--fd)", fontWeight: 800, fontSize: "1.4rem", color: "var(--cp)", marginBottom: "20px" }}>
            {t("auth.login_title")}
          </h2>

          {error && (
            <div style={{ background: "rgba(255,82,82,.1)", border: "1px solid rgba(255,82,82,.25)",
              borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "var(--danger)", marginBottom: "14px" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "var(--tx-m)", marginBottom: "6px",
                fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                {t("auth.phone")}
              </label>
              <input className="inp" type="tel" placeholder={t("auth.phone_placeholder")}
                value={form.phone} onChange={e => set("phone", e.target.value)} required />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "var(--tx-m)", marginBottom: "6px",
                fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                {t("auth.password")}
              </label>
              <input className="inp" type="password" placeholder="••••••••"
                value={form.password} onChange={e => set("password", e.target.value)} required />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary"
              style={{ width: "100%", padding: "12px", fontSize: "14px" }}>
              {loading
                ? <span className="aspin" style={{ width: 16, height: 16,
                    border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff" }} />
                : `${t("auth.login_btn")} →`
              }
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "18px 0" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--bd)" }} />
            <span style={{ fontSize: "12px", color: "var(--tx-s)" }}>{t("auth.or")}</span>
            <div style={{ flex: 1, height: "1px", background: "var(--bd)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", minHeight: "44px" }}>
            <div id="google-signin-btn" style={{ width: "100%", display: "flex", justifyContent: "center" }} />
          </div>

          <p style={{ textAlign: "center", fontSize: "13px", color: "var(--tx-m)", marginTop: "16px" }}>
            {t("auth.no_account")}{" "}
            <Link to="/signup" style={{ color: "var(--cp)", fontWeight: 700, textDecoration: "none" }}>{t("auth.sign_up")}</Link>
          </p>
          <p style={{ textAlign: "center", fontSize: "12px", color: "var(--tx-m)", marginTop: "8px" }}>
            <Link to="/forgot-password" style={{ color: "var(--tx-m)", textDecoration: "underline" }}>{t("auth.forgot_password")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
