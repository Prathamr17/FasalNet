// pages/LoginPage.js — Redesigned to match reference screenshot exactly
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const DEST = {
  farmer: "/discover",
  operator: "/operator",
  admin: "/discover",
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
              width: btnEl.offsetWidth > 200 ? btnEl.offsetWidth : 356,
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

// ─── SVG ICONS MATCHING REFERENCE SCREENSHOT ──────────────────────────────────
function SproutLeafIcon({ className = "w-10 h-10" }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Central Stem */}
      <path
        d="M17 41C19 33 24.5 22 35 14"
        stroke="#5B8F4C"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Top Leaf */}
      <path
        d="M35 14C33 8.5 38 3.5 42 4.5C43 8.5 39.5 13 35 14Z"
        fill="#8BC34A"
      />
      {/* Right Leaf */}
      <path
        d="M29.5 19.5C35 18 39.5 21 39.5 25C35 26.5 30.5 23.5 29.5 19.5Z"
        fill="#9CCC65"
      />
      {/* Left Leaf */}
      <path
        d="M25 23.5C19.5 22 16.5 17 17.5 13C22 13 25 18 25 23.5Z"
        fill="#7CB342"
      />
      {/* Bottom-left Leaf */}
      <path
        d="M21 31C15.5 32 12.5 28.5 13.5 24.5C17.5 24.5 20 28 21 31Z"
        fill="#558B2F"
      />
    </svg>
  );
}

function WheatIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M12 22V7" stroke="#3F6B33" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 7C10.5 5 10.5 2.5 12 1.5C13.5 2.5 13.5 5 12 7Z" fill="#D4AF37" />
      <path d="M11 10.5C9.2 9.5 8.2 7 10 5.8C10.8 7.5 11.2 9 11 10.5Z" fill="#E5C158" />
      <path d="M13 10.5C14.8 9.5 15.8 7 14 5.8C13.2 7.5 12.8 9 13 10.5Z" fill="#D4AF37" />
      <path d="M11 14.5C9.2 13.5 8.2 11 10 9.8C10.8 11.5 11.2 13 11 14.5Z" fill="#E5C158" />
      <path d="M13 14.5C14.8 13.5 15.8 11 14 9.8C13.2 11.5 12.8 13 13 14.5Z" fill="#D4AF37" />
      <path d="M12 18C9.5 18 7.5 15.5 8.5 13C10.5 14 11.5 16 12 18Z" fill="#558B2F" />
      <path d="M12 18C14.5 18 16.5 15.5 15.5 13C13.5 14 12.5 16 12 18Z" fill="#689F38" />
    </svg>
  );
}

function StorageFactoryIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3 21H21V12L16 15V12L11 15V9L3 13V21Z" fill="#CBD5E1" stroke="#2B4570" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M17 5H19V12H17V5Z" fill="#F87171" />
      <path d="M13 7H15V12H13V7Z" fill="#FB923C" />
      <circle cx="6.5" cy="17" r="1.3" fill="#2B4570" />
      <circle cx="11.5" cy="17" r="1.3" fill="#2B4570" />
      <circle cx="16.5" cy="17" r="1.3" fill="#2B4570" />
    </svg>
  );
}

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone: "", password: "" });
  const [loading, setLoad] = useState(false);
  const [error, setError] = useState("");
  const [filled, setFilled] = useState(null);
  const phoneInputRef = useRef(null);

  const DEMO_ACCOUNTS = [
    {
      role: "farmer",
      icon: <WheatIcon className="w-6 h-6" />,
      label: t("auth.farmer", "Farmer"),
      phone: "9000000001",
      pass: "farmer123",
      desc: "Ramesh Jadhav · Kolhapur",
      titleColor: "text-[#2D5A27] dark:text-[#86EFAC]",
    },
    {
      role: "operator",
      icon: <StorageFactoryIcon className="w-6 h-6" />,
      label: t("auth.operator", "Storage Operator"),
      phone: "9000000002",
      pass: "operator123",
      desc: "Sunita Patil · Manager",
      titleColor: "text-[#2B4570] dark:text-[#93C5FD]",
    },
  ];

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoad(true);
    try {
      const user = await login(form.phone, form.password);
      navigate(DEST[user.role] || "/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || t("auth.invalid_creds", "Invalid phone or password"));
    } finally {
      setLoad(false);
    }
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

  const fillDemo = (acc) => {
    setForm({ phone: acc.phone, password: acc.pass });
    setFilled(acc.role);
    setError("");
    if (phoneInputRef.current) {
      phoneInputRef.current.focus();
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-60px)] w-full overflow-hidden bg-[#F6F4EE] dark:bg-[#161914] text-[#23281F] dark:text-[#EDE8D8] flex flex-col items-center justify-center px-4 py-8 sm:py-12 transition-colors duration-200">
      {/* ── Ambient Soft Sage / Pale-Green Radial Glows ───────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <motion.div
          className="absolute -left-28 top-[24%] h-[40vw] w-[40vw] max-w-[520px] max-h-[520px] rounded-full bg-[#B4D5A4]/25 dark:bg-[#2A3E23]/20 blur-[100px]"
          animate={{ y: [0, -14, 0], x: [0, 8, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-28 top-[18%] h-[42vw] w-[42vw] max-w-[560px] max-h-[560px] rounded-full bg-[#C6E2B8]/22 dark:bg-[#2D4525]/18 blur-[110px]"
          animate={{ y: [0, 16, 0], x: [0, -10, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        />
        <motion.div
          className="absolute left-[20%] bottom-[-8%] h-[35vw] w-[50vw] max-w-[650px] max-h-[380px] rounded-full bg-[#D2EAC4]/20 dark:bg-[#20301B]/18 blur-[100px]"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
        />
      </div>

      {/* ── Main Content Container (strictly centered & proportioned) ─ */}
      <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center">
        {/* 1. Brand Hero Area */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="mb-6 flex flex-col items-center text-center"
        >
          {/* Delicate 4-Leaf Sprout Icon */}
          <motion.div
            className="mb-2 flex items-center justify-center cursor-pointer"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <SproutLeafIcon className="w-10 h-10 drop-shadow-sm" />
          </motion.div>

          {/* FasalNet Title */}
          <h1 className="font-display text-[38px] sm:text-[42px] font-extrabold text-[#2D5A27] dark:text-[#86EFAC] tracking-tight leading-tight">
            {t("app_name", "FasalNet")}
          </h1>

          {/* Subtitle */}
          <p className="mt-1.5 text-[12.5px] sm:text-[13px] font-medium text-[#5A6B56] dark:text-neutral-400 tracking-[0.01em]">
            {t("tagline", "Real-Time Cold Storage Discovery & Smart Farm Intelligence")}
          </p>
        </motion.div>

        {/* 2. Quick Login — Demo Accounts */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: "easeOut" }}
          className="w-full mb-4"
        >
          <div className="flex items-center justify-center gap-1.5 mb-2.5 text-[10.5px] font-bold tracking-[0.16em] uppercase text-[#6C7D67] dark:text-neutral-400">
            <span className="text-[#F59E0B]">⚡</span>
            <span>{t("auth.quick_login", "QUICK LOGIN — DEMO ACCOUNTS")}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            {DEMO_ACCOUNTS.map((acc) => {
              const active = filled === acc.role;
              return (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  className={`relative flex flex-col items-center justify-center py-3.5 px-3 rounded-[14px] border transition-all duration-200 text-center cursor-pointer ${
                    active
                      ? "bg-[#FBFDF9] dark:bg-[#222B1E] border-[#3F6B33] ring-2 ring-[#3F6B33]/25 shadow-md -translate-y-0.5"
                      : "bg-white dark:bg-[#1E2419] border-[#E2DDD0] dark:border-[#333B2C] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#3F6B33]/60 hover:shadow-md hover:-translate-y-0.5"
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-center">
                    {acc.icon}
                  </div>
                  <div className={`font-display text-[13px] font-bold leading-snug ${acc.titleColor}`}>
                    {acc.label}
                  </div>
                  <div className="text-[10.5px] font-medium text-[#71856C] dark:text-neutral-400 mt-0.5 leading-tight">
                    {acc.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* 3. Main Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14, ease: "easeOut" }}
          className="w-full bg-white dark:bg-[#1E2419] rounded-[22px] border border-[#E2DDD0] dark:border-[#333B2C] shadow-[0_12px_40px_-8px_rgba(45,55,40,0.08),0_4px_12px_rgba(0,0,0,0.03)] p-7 sm:p-8"
        >
          {/* Welcome Back Title */}
          <h2 className="font-display text-[24px] sm:text-[25px] font-bold text-[#2D5A27] dark:text-[#86EFAC] mb-5 tracking-tight">
            {t("auth.login_title", "Welcome Back")}
          </h2>

          {/* Error Notice */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="flex items-center gap-2 overflow-hidden rounded-[10px] border border-[#8B3A2B]/40 bg-[#F0DCD4] dark:bg-[#38211E] px-3.5 py-2.5 text-[12.5px] text-[#8B3A2B] dark:text-[#FFAAA0]"
              >
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Phone Number Field */}
            <div>
              <label
                htmlFor="login-phone"
                className="block text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#6A7B66] dark:text-neutral-400 mb-1.5"
              >
                {t("auth.phone", "PHONE NUMBER")}
              </label>
              <input
                ref={phoneInputRef}
                id="login-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder={t("auth.phone_placeholder", "10-digit mobile number")}
                required
                className="w-full rounded-[10px] border border-[#DFD9CC] dark:border-[#3C4634] bg-[#FCFBF8] dark:bg-[#252B21] px-3.5 py-2.5 text-sm text-[#23281F] dark:text-[#EDE8D8] placeholder:text-[#9FA99B] focus:bg-white dark:focus:bg-[#1E2419] focus:border-[#3F6B33] focus:ring-2 focus:ring-[#3F6B33]/20 outline-none transition-all duration-150"
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#6A7B66] dark:text-neutral-400 mb-1.5"
              >
                {t("auth.password", "PASSWORD")}
              </label>
              <input
                id="login-password"
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-[10px] border border-[#DFD9CC] dark:border-[#3C4634] bg-[#FCFBF8] dark:bg-[#252B21] px-3.5 py-2.5 text-sm text-[#23281F] dark:text-[#EDE8D8] placeholder:text-[#9FA99B] focus:bg-white dark:focus:bg-[#1E2419] focus:border-[#3F6B33] focus:ring-2 focus:ring-[#3F6B33]/20 outline-none transition-all duration-150"
              />
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-[10px] bg-[#375E2C] hover:bg-[#2D4E23] active:scale-[0.99] text-white py-3 px-4 font-body font-semibold text-sm tracking-wide shadow-sm transition-all duration-150 flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer mt-1"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <span>{t("auth.login_btn", "Sign In")}</span>
                  <span className="text-base font-bold leading-none ml-0.5">›</span>
                </>
              )}
            </button>
          </form>

          {/* Divider with 'or' */}
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#E4DFD3] dark:bg-[#363E30]" />
            <span className="text-xs text-[#8A9A85] dark:text-neutral-400 font-normal px-1">
              {t("auth.or", "or")}
            </span>
            <div className="h-px flex-1 bg-[#E4DFD3] dark:bg-[#363E30]" />
          </div>

          {/* Google Sign-In Container */}
          <div className="flex min-h-[44px] w-full flex-col items-center justify-center">
            <div id="google-signin-btn" className="flex w-full justify-center" />
          </div>

          {/* Don't have an account? Sign Up */}
          <p className="mt-4 text-center text-[12.5px] text-[#6A7B66] dark:text-neutral-400">
            {t("auth.no_account", "Don't have an account?")}{" "}
            <Link
              to="/signup"
              className="font-bold text-[#2D5A27] dark:text-[#86EFAC] no-underline hover:underline ml-1"
            >
              {t("auth.sign_up", "Sign Up")}
            </Link>
          </p>

          {/* Forgot Password Link */}
          <p className="mt-2 text-center text-xs text-[#71856C] dark:text-neutral-400">
            <Link
              to="/forgot-password"
              className="no-underline hover:text-[#2D5A27] dark:hover:text-[#86EFAC] hover:underline transition-colors"
            >
              {t("auth.forgot_password", "Forgot Password?")}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
