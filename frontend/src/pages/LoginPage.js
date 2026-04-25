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

function useGoogleAuth(onSuccess) {
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";
    if (!CLIENT_ID) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true; script.defer = true;
    script.onload = () => {
      window.google?.accounts?.id?.initialize({ client_id: CLIENT_ID, callback: (r) => onSuccess(r.credential) });
      window.google?.accounts?.id?.renderButton(
        document.getElementById("google-signin-btn"),
        { theme: "outline", size: "large", width: "100%", text: "signin_with" }
      );
    };
    document.head.appendChild(script);
  }, [onSuccess]);
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
    { role: "farmer",   emoji: "🌾", label: t("auth.farmer"),   phone: "9000000001", pass: "farmer123",   color: "#7EC850", bg: "rgba(126,200,80,.1)",  border: "rgba(126,200,80,.3)",  desc: "Ramesh Jadhav · Kolhapur" },
    { role: "operator", emoji: "🏭", label: t("auth.operator"), phone: "9000000002", pass: "operator123", color: "#22D3EE", bg: "rgba(34,211,238,.1)",  border: "rgba(34,211,238,.3)",  desc: "Sunita Patil · Manager"   },
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
    try {
      const user = await loginWithGoogle(idToken, "customer");
      navigate(DEST[user.role] || "/marketplace", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Google sign-in failed");
    }
  };

  useGoogleAuth(handleGoogle);

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

          <div id="google-signin-btn" style={{ display: "flex", justifyContent: "center" }} />
          {!process.env.REACT_APP_GOOGLE_CLIENT_ID && (
            <button onClick={() => setError("Set REACT_APP_GOOGLE_CLIENT_ID in .env to enable Google login")}
              style={{ width: "100%", padding: "11px", borderRadius: "var(--r)",
                border: "1.5px solid var(--bd)", background: "var(--bg-m)",
                color: "var(--tx-m)", fontSize: "13px", fontWeight: 500, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              {t("auth.google_login")}
            </button>
          )}

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
