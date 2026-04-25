// pages/SignupPage.js — multilang: English + Marathi only
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import OTPVerification from "../components/OTPVerification";
import { otpAPI } from "../services/api";

const DEST_MAP = {
  farmer:   "/discover",
  operator: "/operator",
};

export default function SignupPage() {
  const { t }         = useTranslation();
  const { login }     = useAuth();
  const navigate      = useNavigate();

  const ROLES = [
    { id: "farmer",   emoji: "🌾", label: t("auth.farmer"),   desc: t("auth.upload_produce"), color: "#CCDA47", bg: "rgba(204,218,71,.1)", border: "rgba(204,218,71,.3)" },
    { id: "operator", emoji: "🏭", label: t("auth.operator"), desc: t("auth.manage_facility"), color: "#38bdf8", bg: "rgba(56,189,248,.1)", border: "rgba(56,189,248,.3)" },
  ];

  const [form, setForm] = useState({
    name: "", phone: "", email: "", password: "", role: "farmer",
    district: "", state: "Maharashtra", language: "en",
    storage_name: "", storage_capacity: "", storage_address: "",
    storage_district: "", storage_state: "Maharashtra",
    storage_lat: "", storage_lon: "",
  });
  const [loading,  setLoad]     = useState(false);
  const [error,    setError]    = useState("");
  const [errors,   setErrs]     = useState({});
  const [step,     setStep]     = useState(1);
  const [showOTP,  setShowOTP]  = useState(false);
  const [locating, setLocating] = useState(false);

  const set          = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selectedRole = ROLES.find(r => r.id === form.role);

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setForm(f => ({ ...f, storage_lat: lat.toFixed(6), storage_lon: lon.toFixed(6) }));
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
          const d    = await res.json();
          const addr = d.address || {};
          setForm(f => ({
            ...f,
            storage_district: addr.county || addr.city || addr.town || f.storage_district,
            storage_state:    addr.state  || f.storage_state,
            storage_address:  d.display_name || f.storage_address,
          }));
        } catch {}
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())                                     e.name     = t("auth.name") + " required";
    if (!/^\d{10}$/.test(form.phone))                         e.phone    = "Valid 10-digit phone required";
    if (!form.email.trim())                                    e.email    = t("auth.email") + " required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))      e.email    = "Valid email required";
    if (form.password.length < 6)                             e.password = "Min 6 characters";
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const validateStorage = () => {
    const e = {};
    if (!form.storage_name.trim())    e.storage_name     = "Cold storage name required";
    if (!form.storage_capacity || isNaN(parseFloat(form.storage_capacity)) || parseFloat(form.storage_capacity) <= 0)
                                      e.storage_capacity = "Valid capacity in kg required";
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
      localStorage.setItem("fasalnet_user",  JSON.stringify(data.user));
      await login(form.phone, form.password).catch(() => {});
      navigate(DEST_MAP[form.role] || "/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed. Please try again.");
      setShowOTP(false);
    } finally { setLoad(false); }
  };

  const inp = (key) => ({
    width: "100%", background: "rgba(128,128,128,.06)", border: "1px solid",
    borderColor: errors[key] ? "var(--danger)" : "var(--bd)",
    color: "var(--tx)", fontFamily: "var(--fb)", fontSize: "13px",
    padding: "10px 13px", borderRadius: "10px", outline: "none",
    transition: "all .2s", boxSizing: "border-box",
  });

  const labelStyle = {
    fontSize: "11px", fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "1px", color: "var(--tx-m)", display: "block", marginBottom: "5px",
  };

  return (
    <div style={{ minHeight: "calc(100vh - 56px)", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "2rem 1rem", position: "relative", overflow: "hidden" }}>

      {/* BG orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-5%", right: "10%", width: "30vw", height: "30vw",
          borderRadius: "50%", background: "radial-gradient(circle,var(--cp-glow),transparent 70%)",
          animation: "float 7s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-10%", left: "5%", width: "25vw", height: "25vw",
          borderRadius: "50%", background: "radial-gradient(circle,var(--cp-glow),transparent 70%)",
          animation: "float 5s ease-in-out infinite", animationDelay: "1.5s" }} />
      </div>

      <div style={{ width: "100%", maxWidth: "480px", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div className="au d1" style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "6px" }} className="af">✨</div>
          <h1 style={{ fontFamily: "var(--fd)", fontWeight: 800, fontSize: "24px", color: "var(--tx)", marginBottom: "4px" }}>
            {t("auth.join_title")}
          </h1>
          <p style={{ color: "var(--tx-m)", fontSize: "13px", marginTop: "4px" }}>
            {step === 1 ? t("auth.choose_role")
             : step === 3 ? t("auth.cold_storage_step")
                          : `${t("auth.setting_up")} — ${selectedRole?.label}`}
          </p>
        </div>

        {/* ── STEP 1: Role selection ── */}
        {step === 1 && (
          <div className="ap">
            <div style={{ display: "grid", gap: "12px", marginBottom: "1.5rem" }}>
              {ROLES.map(r => (
                <button key={r.id} onClick={() => set("role", r.id)}
                  className="press hbr"
                  style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px 18px",
                    borderRadius: "16px", border: "2px solid",
                    borderColor: form.role === r.id ? r.color : r.border,
                    background:  form.role === r.id ? r.bg : "var(--bg-l)",
                    cursor: "pointer", transition: "all .25s", textAlign: "left",
                    boxShadow: form.role === r.id ? `0 0 0 3px ${r.color}25` : "none" }}>
                  <span style={{ fontSize: "2rem" }}>{r.emoji}</span>
                  <div>
                    <div style={{ fontFamily: "var(--fd)", fontWeight: 700, fontSize: "15px", color: r.color }}>{r.label}</div>
                    <div style={{ fontSize: "12px", color: "var(--tx-m)", marginTop: "2px" }}>{r.desc}</div>
                  </div>
                  <div style={{ marginLeft: "auto", width: "20px", height: "20px", borderRadius: "50%",
                    border: `2px solid ${r.color}`, display: "flex", alignItems: "center", justifyContent: "center",
                    background: form.role === r.id ? r.color : "transparent", transition: "all .2s" }}>
                    {form.role === r.id && <span style={{ fontSize: "11px", color: "white", fontWeight: 800 }}>✓</span>}
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="ripple-btn press"
              style={{ width: "100%", background: "linear-gradient(135deg,var(--cp),var(--cp-dark))",
                color: "var(--bg)", border: "none", borderRadius: "12px", padding: "13px",
                fontFamily: "var(--fd)", fontWeight: 800, fontSize: "15px", cursor: "pointer",
                boxShadow: "0 4px 20px var(--cp-glow)" }}>
              {t("auth.continue_as")} {selectedRole?.label} →
            </button>
          </div>
        )}

        {/* ── STEP 2: Details ── */}
        {step === 2 && (
          <div className="glass au" style={{ borderRadius: "20px", padding: "1.75rem",
            border: "1px solid var(--bd)", boxShadow: "var(--sh)" }}>

            <button onClick={() => setStep(1)}
              style={{ background: "none", border: "none", color: "var(--tx-m)",
                cursor: "pointer", fontSize: "13px", marginBottom: "16px",
                display: "flex", alignItems: "center", gap: "6px" }}>
              {t("auth.back")}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px",
              padding: "10px 14px", borderRadius: "12px", background: selectedRole?.bg,
              border: `1px solid ${selectedRole?.border}` }}>
              <span style={{ fontSize: "1.5rem" }}>{selectedRole?.emoji}</span>
              <div style={{ fontFamily: "var(--fd)", fontWeight: 700, color: selectedRole?.color }}>
                {selectedRole?.label}
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                ["name",     t("auth.name"),     "Ramesh Jadhav",    "text"],
                ["phone",    t("auth.phone"),     "9876543210",       "tel"],
                ["email",    t("auth.email"),     "you@email.com",    "email"],
                ["password", t("auth.password"),  "Min 6 characters", "password"],
                ["district", t("auth.district"),  "Kolhapur",         "text"],
                ["state",    t("auth.state"),     "Maharashtra",      "text"],
              ].map(([key, label, ph, type]) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input type={type} placeholder={ph} value={form[key]}
                    onChange={e => set(key, e.target.value)} style={inp(key)}
                    onFocus={e => e.target.style.borderColor = "var(--cp)"}
                    onBlur={e => e.target.style.borderColor = errors[key] ? "var(--danger)" : "var(--bd)"} />
                  {errors[key] && <p style={{ fontSize: "11px", color: "var(--danger)", marginTop: "3px" }}>{errors[key]}</p>}
                </div>
              ))}

              {/* Language — English + Marathi only */}
              <div>
                <label style={labelStyle}>{t("auth.preferred_language")}</label>
                <select value={form.language} onChange={e => set("language", e.target.value)}
                  style={{ ...inp("language"), background: "var(--bg-l)" }}>
                  <option value="en">{t("common.english")}</option>
                  <option value="mr">{t("common.marathi")}</option>
                </select>
              </div>

              {error && (
                <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)",
                  color: "var(--danger)", borderRadius: "10px", padding: "10px 14px", fontSize: "13px" }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="ripple-btn press"
                style={{ background: "linear-gradient(135deg,var(--cp),var(--cp-dark))",
                  color: "var(--bg)", border: "none", borderRadius: "12px", padding: "13px",
                  fontFamily: "var(--fd)", fontWeight: 800, fontSize: "15px", cursor: "pointer",
                  boxShadow: "0 4px 20px var(--cp-glow)", marginTop: "4px",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  opacity: loading ? 0.7 : 1 }}>
                {loading
                  ? <><span className="aspin" style={{ width: "18px", height: "18px",
                      border: "2px solid var(--bg)", borderTopColor: "transparent",
                      borderRadius: "50%", display: "inline-block" }} />{t("auth.sending_otp")}</>
                  : `${t("auth.signup_btn")} →`}
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 3: Cold storage info (operator only) ── */}
        {step === 3 && (
          <div className="glass au" style={{ borderRadius: "20px", padding: "1.75rem",
            border: "1px solid var(--bd)", boxShadow: "var(--sh)" }}>

            <button onClick={() => setStep(2)}
              style={{ background: "none", border: "none", color: "var(--tx-m)",
                cursor: "pointer", fontSize: "13px", marginBottom: "16px",
                display: "flex", alignItems: "center", gap: "6px" }}>
              {t("auth.back")}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px",
              padding: "10px 14px", borderRadius: "12px", background: "rgba(56,189,248,.1)",
              border: "1px solid rgba(56,189,248,.3)" }}>
              <span style={{ fontSize: "1.5rem" }}>🏭</span>
              <div style={{ fontFamily: "var(--fd)", fontWeight: 700, color: "#38bdf8" }}>
                {t("auth.cold_storage_details")}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={labelStyle}>{t("operator.storage_capacity").replace("Update ", "")} Name *</label>
                <input type="text" placeholder="e.g. Jadhav Cold Storage" value={form.storage_name}
                  onChange={e => set("storage_name", e.target.value)} style={inp("storage_name")} />
                {errors.storage_name && <p style={{ fontSize: "11px", color: "var(--danger)", marginTop: "3px" }}>{errors.storage_name}</p>}
              </div>

              <div>
                <label style={labelStyle}>{t("operator.storage_capacity")} (kg) *</label>
                <input type="number" placeholder="e.g. 50000" min="1" value={form.storage_capacity}
                  onChange={e => set("storage_capacity", e.target.value)} style={inp("storage_capacity")} />
                {errors.storage_capacity && <p style={{ fontSize: "11px", color: "var(--danger)", marginTop: "3px" }}>{errors.storage_capacity}</p>}
              </div>

              <div>
                <label style={labelStyle}>Address</label>
                <input type="text" placeholder="Full address of storage facility" value={form.storage_address}
                  onChange={e => set("storage_address", e.target.value)} style={inp("storage_address")} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>{t("auth.district")}</label>
                  <input type="text" placeholder="Kolhapur" value={form.storage_district}
                    onChange={e => set("storage_district", e.target.value)} style={inp("storage_district")} />
                </div>
                <div>
                  <label style={labelStyle}>{t("auth.state")}</label>
                  <input type="text" placeholder="Maharashtra" value={form.storage_state}
                    onChange={e => set("storage_state", e.target.value)} style={inp("storage_state")} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>{t("farmer.location")} (for map)</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input type="text" placeholder="Latitude" value={form.storage_lat}
                    onChange={e => set("storage_lat", e.target.value)} style={{ ...inp("storage_lat"), flex: 1 }} />
                  <input type="text" placeholder="Longitude" value={form.storage_lon}
                    onChange={e => set("storage_lon", e.target.value)} style={{ ...inp("storage_lon"), flex: 1 }} />
                  <button type="button" onClick={detectLocation} disabled={locating}
                    title="Detect my location"
                    style={{ flexShrink: 0, background: "var(--bg-m)", border: "1px solid var(--bd)",
                      color: "var(--tx)", borderRadius: "10px", padding: "10px 14px",
                      cursor: "pointer", fontSize: "16px" }}>
                    {locating ? "⏳" : "📍"}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)",
                  color: "var(--danger)", borderRadius: "10px", padding: "10px 14px", fontSize: "13px" }}>
                  {error}
                </div>
              )}

              <button type="button" disabled={loading} onClick={handleStorageNext}
                className="ripple-btn press"
                style={{ background: "linear-gradient(135deg,var(--cp),var(--cp-dark))",
                  color: "var(--bg)", border: "none", borderRadius: "12px", padding: "13px",
                  fontFamily: "var(--fd)", fontWeight: 800, fontSize: "15px", cursor: "pointer",
                  boxShadow: "0 4px 20px var(--cp-glow)", marginTop: "4px",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  opacity: loading ? 0.7 : 1 }}>
                {loading
                  ? <><span className="aspin" style={{ width: "18px", height: "18px",
                      border: "2px solid var(--bg)", borderTopColor: "transparent",
                      borderRadius: "50%", display: "inline-block" }} />{t("auth.sending_otp")}</>
                  : "Verify Email & Create Account →"}
              </button>
            </div>
          </div>
        )}

        <p style={{ color: "var(--tx-m)", marginTop: "1.25rem", textAlign: "center" }}>
          {t("auth.have_account")}{" "}
          <Link to="/login" style={{ color: "var(--cp)", fontWeight: 700, textDecoration: "none" }}>{t("auth.login_btn")}</Link>
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
