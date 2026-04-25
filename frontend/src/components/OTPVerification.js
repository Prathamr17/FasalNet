// components/OTPVerification.js — OTP modal (verification done by parent)
import { useState } from "react";
import { otpAPI } from "../services/api";

export default function OTPVerification({ email, purpose = "SIGNUP", onVerified, onCancel }) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const startCooldown = () => {
    setCooldown(60);
    const t = setInterval(() => setCooldown(p => {
      if (p <= 1) { clearInterval(t); return 0; }
      return p - 1;
    }), 1000);
  };

  const handleResend = async () => {
    setLoading(true); setError("");
    try {
      await otpAPI.send({ email, purpose });
      startCooldown();
    } catch (e) {
      setError(e.response?.data?.error || "Failed to resend OTP");
    } finally { setLoading(false); }
  };

  // ✅ KEY FIX: Don't call API here — just pass OTP up to parent
  // Parent (SignupPage / ForgotPasswordPage) will do the actual API verification
  const handleVerify = () => {
    if (otp.length !== 6) { setError("Enter 6-digit OTP"); return; }
    setSuccess(true);
    setTimeout(() => onVerified?.(otp), 1200);
  };

  const inputStyle = {
    width: "100%", background: "rgba(128,128,128,.06)",
    border: "1px solid var(--bd)", color: "var(--tx)",
    fontFamily: "monospace", fontSize: "26px", fontWeight: 700,
    padding: "16px", borderRadius: "12px", outline: "none",
    textAlign: "center", letterSpacing: "10px", transition: "all .2s",
    boxSizing: "border-box"
  };

  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", alignItems: "center",
      justifyContent: "center", background: "rgba(0,0,0,0.65)",
      zIndex: 9999, backdropFilter: "blur(5px)"
    }}>
      <div className="glass" style={{
        borderRadius: "20px", padding: "2rem", width: "90%", maxWidth: "400px",
        border: "1px solid var(--bd)", boxShadow: "var(--sh)"
      }}>
        {!success ? (
          <>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>🔐</div>
              <h2 style={{ fontFamily: "var(--fd)", fontWeight: 800, fontSize: "1.4rem", margin: 0 }}>
                Verify Email
              </h2>
              <p style={{ color: "var(--tx-m)", fontSize: "13px", marginTop: "8px" }}>
                6-digit code sent to<br /><strong>{email}</strong>
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input
                type="text" maxLength="6" placeholder="000000" value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && handleVerify()}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "var(--cp)"}
                onBlur={e => e.target.style.borderColor = "var(--bd)"}
                autoFocus
              />

              {error && (
                <div style={{
                  background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)",
                  color: "var(--danger)", borderRadius: "10px", padding: "10px 14px", fontSize: "13px"
                }}>
                  ⚠️ {error}
                </div>
              )}

              <button
                onClick={handleVerify}
                disabled={otp.length !== 6}
                className="ripple-btn press"
                style={{
                  background: "linear-gradient(135deg,var(--cp),var(--cp-dark))",
                  color: "var(--bg)", border: "none", borderRadius: "12px", padding: "13px",
                  fontFamily: "var(--fd)", fontWeight: 800, fontSize: "15px", cursor: "pointer",
                  boxShadow: "0 4px 20px var(--cp-glow)",
                  opacity: otp.length !== 6 ? 0.6 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                }}
              >
                Verify OTP →
              </button>

              <button
                onClick={handleResend}
                disabled={loading || cooldown > 0}
                style={{
                  background: "none", border: "1px solid var(--bd)", borderRadius: "10px",
                  padding: "11px", color: "var(--tx-m)", fontSize: "13px", fontWeight: 600,
                  cursor: (loading || cooldown > 0) ? "default" : "pointer",
                  opacity: (loading || cooldown > 0) ? 0.5 : 1
                }}
              >
                {loading ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
              </button>

              <button onClick={onCancel} style={{
                background: "none", border: "none", color: "var(--tx-m)",
                fontSize: "12px", cursor: "pointer", padding: "4px"
              }}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "12px" }}>✅</div>
            <h2 style={{ fontFamily: "var(--fd)", fontWeight: 800, fontSize: "1.3rem" }}>Verified!</h2>
            <p style={{ color: "var(--tx-m)", fontSize: "13px" }}>Email verified successfully.</p>
          </div>
        )}
      </div>
    </div>
  );
}