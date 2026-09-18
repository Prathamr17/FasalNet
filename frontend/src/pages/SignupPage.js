// pages/SignupPage.js — multilang: English + Marathi only
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowLeft, ArrowRight, MapPin, AlertCircle, Sprout, Factory } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import OTPVerification from "../components/OTPVerification";
import { otpAPI } from "../services/api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { Card } from "../components/ui/Card";
import Reveal from "../components/ui/Reveal";

const DEST_MAP = {
  farmer: "/discover",
  operator: "/operator",
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
                onError("Google sign-up did not return valid credentials.");
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          const btnEl = document.getElementById("google-signup-btn");
          if (btnEl) {
            btnEl.innerHTML = "";
            window.google.accounts.id.renderButton(btnEl, {
              type: "standard",
              theme: "outline",
              size: "large",
              text: "signup_with",
              shape: "rectangular",
              logo_alignment: "left",
              width: btnEl.offsetWidth > 200 ? btnEl.offsetWidth : 432,
            });
          }
        } catch (e) {
          console.warn("Google Identity error:", e);
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

export default function SignupPage() {
  const { t } = useTranslation();
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const ROLES = [
    { id: "farmer", Icon: Sprout, label: t("auth.farmer"), desc: t("auth.upload_produce") },
    { id: "operator", Icon: Factory, label: t("auth.operator"), desc: t("auth.manage_facility") },
  ];

  const [form, setForm] = useState({
    name: "", phone: "", email: "", password: "", role: "farmer",
    district: "", state: "Maharashtra", language: "en",
    storage_name: "", storage_capacity: "", storage_address: "",
    storage_district: "", storage_state: "Maharashtra",
    storage_lat: "", storage_lon: "",
  });
  const [loading, setLoad] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrs] = useState({});
  const [step, setStep] = useState(1);
  const [showOTP, setShowOTP] = useState(false);
  const [locating, setLocating] = useState(false);

  const totalSteps = form.role === "operator" ? 3 : 2;

  const handleGoogleSignup = async (idToken) => {
    setError("");
    setLoad(true);
    try {
      const user = await loginWithGoogle(idToken, form.role || "farmer");
      navigate(DEST_MAP[user.role] || "/discover", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Google sign-up failed. Please try again.");
    } finally {
      setLoad(false);
    }
  };

  useGoogleAuth(handleGoogleSignup, (err) => setError(err));

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const selectedRole = ROLES.find((r) => r.id === form.role);

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setForm((f) => ({ ...f, storage_lat: lat.toFixed(6), storage_lon: lon.toFixed(6) }));
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
          const d = await res.json();
          const addr = d.address || {};
          setForm((f) => ({
            ...f,
            storage_district: addr.county || addr.city || addr.town || f.storage_district,
            storage_state: addr.state || f.storage_state,
            storage_address: d.display_name || f.storage_address,
          }));
        } catch {}
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = t("auth.field_required");
    if (!/^\d{10}$/.test(form.phone)) e.phone = t("auth.phone_invalid");
    if (!form.email.trim()) e.email = t("auth.field_required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t("auth.email_invalid");
    if (form.password.length < 6) e.password = t("auth.password_min_length");
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const validateStorage = () => {
    const e = {};
    if (!form.storage_name.trim()) e.storage_name = t("auth.field_required");
    if (!form.storage_capacity || isNaN(parseFloat(form.storage_capacity)) || parseFloat(form.storage_capacity) <= 0)
      e.storage_capacity = t("auth.field_required");
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    if (form.role === "operator") { setStep(3); return; }
    setError(""); setLoad(true);
    try {
      await otpAPI.send({ email: form.email, purpose: "SIGNUP" });
      setShowOTP(true);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP. Check your email and try again.");
    } finally { setLoad(false); }
  };

  const handleStorageNext = async () => {
    if (!validateStorage()) return;
    setError(""); setLoad(true);
    try {
      await otpAPI.send({ email: form.email, purpose: "SIGNUP" });
      setShowOTP(true);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP. Check your email and try again.");
    } finally { setLoad(false); }
  };

  const handleOTPVerified = async (otp) => {
    setLoad(true);
    try {
      const { data } = await otpAPI.signupWithOtp({ ...form, otp });
      localStorage.setItem("fasalnet_token", data.token);
      localStorage.setItem("fasalnet_user", JSON.stringify(data.user));
      await login(form.phone, form.password).catch(() => {});
      navigate(DEST_MAP[form.role] || "/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed. Please try again.");
      setShowOTP(false);
    } finally { setLoad(false); }
  };

  const ErrorBanner = ({ msg }) => (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-2 overflow-hidden rounded-md border border-danger bg-danger-bg px-3.5 py-2.5 text-[13px] text-danger"
        >
          <AlertCircle size={15} className="shrink-0" /> {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );

  const FieldError = ({ msg }) => (msg ? <p className="mt-1 text-[11px] text-danger">{msg}</p> : null);

  return (
    <div className="relative flex min-h-[calc(100vh-56px)] items-center justify-center overflow-hidden px-4 py-8">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <motion.div
          className="absolute -right-[10%] -top-[5%] h-[30vw] w-[30vw] rounded-full bg-accent/10 blur-3xl"
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-[10%] left-[5%] h-[25vw] w-[25vw] rounded-full bg-brand-harvest/10 blur-3xl"
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[480px]">
        <Reveal className="mb-6 text-center">
          <motion.div
            className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-panel bg-accent-pale text-accent"
            animate={{ rotate: [0, 6, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sprout size={22} />
          </motion.div>
          <h1 className="font-display text-2xl font-extrabold text-ink">{t("auth.join_title")}</h1>
          <p className="mt-1 text-[13px] text-ink-muted">
            {step === 1
              ? t("auth.choose_role")
              : step === 3
              ? t("auth.cold_storage_step")
              : `${t("auth.setting_up")} — ${selectedRole?.label}`}
          </p>

          {/* Step progress dots */}
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-pill transition-all duration-300"
                style={{
                  width: step === i + 1 ? "22px" : "8px",
                  background: step > i ? "var(--cp)" : "var(--bd)",
                }}
              />
            ))}
          </div>
        </Reveal>

        <AnimatePresence mode="wait">
          {/* ── STEP 1: Role selection ── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-5 grid gap-2.5">
                {ROLES.map((r) => {
                  const active = form.role === r.id;
                  return (
                    <motion.button
                      key={r.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => set("role", r.id)}
                      className={`flex items-center gap-3.5 rounded-panel border-[1.5px] p-4 text-left transition-all duration-200 ${
                        active ? "border-accent bg-accent-pale shadow-glow-accent" : "border-line bg-surface-card hover:border-accent/40"
                      }`}
                    >
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${active ? "bg-accent text-accent-fg" : "bg-surface-muted text-ink-muted"}`}>
                        <r.Icon size={20} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-sm font-bold text-ink">{r.label}</div>
                        <div className="mt-0.5 text-xs text-ink-muted">{r.desc}</div>
                      </div>
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                        style={{ borderColor: active ? "var(--cp)" : "var(--bd)", background: active ? "var(--cp)" : "transparent" }}
                      >
                        {active && <Check size={12} className="text-white" strokeWidth={3} />}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <Button onClick={() => setStep(2)} className="w-full justify-center py-3 text-sm">
                {t("auth.continue_as")} {selectedRole?.label} <ArrowRight size={15} />
              </Button>

              <div className="my-4 flex items-center gap-2.5">
                <div className="h-px flex-1 bg-line" />
                <span className="text-xs text-ink-soft">{t("auth.or")}</span>
                <div className="h-px flex-1 bg-line" />
              </div>

              <div className="flex min-h-[44px] w-full flex-col items-center">
                <div id="google-signup-btn" className="flex w-full justify-center" />
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: Details ── */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
              <Card className="p-6">
                <button onClick={() => setStep(1)} className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-ink-muted hover:text-accent">
                  <ArrowLeft size={14} /> {t("auth.back")}
                </button>

                <div className="mb-5 flex items-center gap-2.5 rounded-md border border-accent/25 bg-accent-pale px-3.5 py-2.5">
                  <selectedRole.Icon size={18} className="text-accent" />
                  <span className="font-display text-sm font-bold text-accent-dark">{selectedRole?.label}</span>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  {[
                    ["name", t("auth.name"), "Ramesh Jadhav", "text"],
                    ["phone", t("auth.phone"), "9876543210", "tel"],
                    ["email", t("auth.email"), "you@email.com", "email"],
                    ["password", t("auth.password"), t("auth.min_6_chars"), "password"],
                    ["district", t("auth.district"), "Kolhapur", "text"],
                    ["state", t("auth.state"), "Maharashtra", "text"],
                  ].map(([key, label, ph, type]) => (
                    <div key={key}>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</label>
                      <Input
                        type={type}
                        placeholder={ph}
                        value={form[key]}
                        onChange={(e) => set(key, e.target.value)}
                        className={errors[key] ? "border-danger focus:border-danger" : ""}
                      />
                      <FieldError msg={errors[key]} />
                    </div>
                  ))}

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                      {t("auth.preferred_language")}
                    </label>
                    <select
                      value={form.language}
                      onChange={(e) => set("language", e.target.value)}
                      className="w-full rounded-sm border-[1.5px] border-line bg-surface-light px-3.5 py-2.5 text-sm text-ink outline-none transition-all focus:border-accent focus:shadow-glow-accent"
                    >
                      <option value="en">{t("common.english")}</option>
                      <option value="mr">{t("common.marathi")}</option>
                    </select>
                  </div>

                  <ErrorBanner msg={error} />

                  <Button type="submit" disabled={loading} className="mt-1 w-full justify-center py-3 text-sm">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        {t("auth.sending_otp")}
                      </span>
                    ) : (
                      <>{t("auth.signup_btn")} <ArrowRight size={15} /></>
                    )}
                  </Button>
                </form>
              </Card>
            </motion.div>
          )}

          {/* ── STEP 3: Cold storage info (operator only) ── */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
              <Card className="p-6">
                <button onClick={() => setStep(2)} className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-ink-muted hover:text-accent">
                  <ArrowLeft size={14} /> {t("auth.back")}
                </button>

                <div className="mb-5 flex items-center gap-2.5 rounded-md border border-info/25 bg-info-bg px-3.5 py-2.5">
                  <Factory size={18} className="text-info" />
                  <span className="font-display text-sm font-bold text-info">{t("auth.cold_storage_details")}</span>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                      {t("auth.storage_name_label")} *
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Jadhav Cold Storage"
                      value={form.storage_name}
                      onChange={(e) => set("storage_name", e.target.value)}
                      className={errors.storage_name ? "border-danger" : ""}
                    />
                    <FieldError msg={errors.storage_name} />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                      {t("auth.storage_capacity_label")} (kg) *
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g. 50000"
                      min="1"
                      value={form.storage_capacity}
                      onChange={(e) => set("storage_capacity", e.target.value)}
                      className={errors.storage_capacity ? "border-danger" : ""}
                    />
                    <FieldError msg={errors.storage_capacity} />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                      {t("auth.storage_address_label")}
                    </label>
                    <Input
                      type="text"
                      placeholder="Full address of storage facility"
                      value={form.storage_address}
                      onChange={(e) => set("storage_address", e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{t("auth.district")}</label>
                      <Input type="text" placeholder="Kolhapur" value={form.storage_district} onChange={(e) => set("storage_district", e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{t("auth.state")}</label>
                      <Input type="text" placeholder="Maharashtra" value={form.storage_state} onChange={(e) => set("storage_state", e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                      {t("farmer.location")} (for map)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input type="text" placeholder="Latitude" value={form.storage_lat} onChange={(e) => set("storage_lat", e.target.value)} />
                      <Input type="text" placeholder="Longitude" value={form.storage_lon} onChange={(e) => set("storage_lon", e.target.value)} />
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        type="button"
                        onClick={detectLocation}
                        disabled={locating}
                        title={t("auth.detect_location")}
                        className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-sm border-[1.5px] border-line bg-surface-muted text-ink-muted transition-colors hover:text-accent disabled:opacity-60"
                      >
                        <MapPin size={16} className={locating ? "animate-pulse" : ""} />
                      </motion.button>
                    </div>
                  </div>

                  <ErrorBanner msg={error} />

                  <Button type="button" disabled={loading} onClick={handleStorageNext} className="mt-1 w-full justify-center py-3 text-sm">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        {t("auth.sending_otp")}
                      </span>
                    ) : (
                      <>{t("auth.verify_create_account")} <ArrowRight size={15} /></>
                    )}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-5 text-center text-[13px] text-ink-muted">
          {t("auth.have_account")}{" "}
          <Link to="/login" className="font-bold text-accent no-underline hover:underline">
            {t("auth.login_btn")}
          </Link>
        </p>
      </div>

      {showOTP && (
        <OTPVerification
          email={form.email}
          purpose="SIGNUP"
          onVerified={handleOTPVerified}
          onCancel={() => setShowOTP(false)}
        />
      )}
    </div>
  );
}
