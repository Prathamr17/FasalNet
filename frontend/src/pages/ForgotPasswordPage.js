// pages/ForgotPasswordPage.js — Forgot password with OTP
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import OTPVerification from "../components/OTPVerification";
import { otpAPI } from "../services/api";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step,            setStep]            = useState(1); // 1=email, 2=new password
  const [email,           setEmail]           = useState("");
  const [verifiedOtp,     setVerifiedOtp]     = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOTP,         setShowOTP]         = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");
  const [success,         setSuccess]         = useState(false);

  // Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("Enter a valid email address"); return;
    }
    setError(""); setLoading(true);
    try {
      await otpAPI.send({ email, purpose: "FORGOT_PASSWORD" });
      setShowOTP(true);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP");
    } finally { setLoading(false); }
  };

  // OTP verified — move to step 2
  const handleOTPVerified = (otp) => {
    setVerifiedOtp(otp);
    setShowOTP(false);
    setStep(2);
  };

  // Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6)          { setError("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword)  { setError("Passwords do not match"); return; }
    setError(""); setLoading(true);
    try {
      await otpAPI.resetPassword({ email, otp: verifiedOtp, new_password: newPassword });
      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (err) {
      setError(err.response?.data?.error || "Password reset failed");
    } finally { setLoading(false); }
  };

  const inputStyle = {
    width: "100%", background: "rgba(128,128,128,.06)", border: "1px solid var(--bd)",
    color: "var(--tx)", fontFamily: "var(--fb)", fontSize: "13px",
    padding: "10px 13px", borderRadius: "10px", outline: "none",
    transition: "all .2s", boxSizing: "border-box"
  };
  const btnStyle = {
    background: "linear-gradient(135deg,var(--cp),var(--cp-dark))",
    color: "var(--bg)", border: "none", borderRadius: "12px", padding: "13px",
    fontFamily: "var(--fd)", fontWeight: 800, fontSize: "15px", cursor: "pointer",
    boxShadow: "0 4px 20px var(--cp-glow)", marginTop: "8px",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%"
  };

  return (
    <div style={{ minHeight:"calc(100vh - 56px)", display:"flex", alignItems:"center",
      justifyContent:"center", padding:"2rem 1rem", position:"relative", overflow:"hidden" }}>

      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}>
        <div style={{ position:"absolute", top:"-5%", right:"10%", width:"30vw", height:"30vw",
          borderRadius:"50%", background:"radial-gradient(circle,var(--cp-glow),transparent 70%)",
          animation:"float 7s ease-in-out infinite" }} />
        <div style={{ position:"absolute", bottom:"-10%", left:"5%", width:"25vw", height:"25vw",
          borderRadius:"50%", background:"radial-gradient(circle,var(--cp-glow),transparent 70%)",
          animation:"float 5s ease-in-out infinite", animationDelay:"1.5s" }} />
      </div>

      <div style={{ width:"100%", maxWidth:"420px", position:"relative", zIndex:1 }}>
        <div className="au d1" style={{ textAlign:"center", marginBottom:"1.75rem" }}>
          <div style={{ fontSize:"2.5rem", marginBottom:"8px" }}>🔐</div>
          <h1 style={{ fontFamily:"var(--fd)", fontWeight:800, fontSize:"1.75rem", color:"var(--cp)" }}>
            Reset Password
          </h1>
          <p style={{ color:"var(--tx-m)", fontSize:"13px", marginTop:"6px" }}>
            {step === 1 ? "Enter your email to get a reset OTP" : "Create your new password"}
          </p>
        </div>

        <div className="glass au" style={{ borderRadius:"20px", padding:"1.75rem",
          border:"1px solid var(--bd)", boxShadow:"var(--sh)" }}>

          {success ? (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ fontSize:"3rem", marginBottom:"12px" }}>✅</div>
              <h2 style={{ fontFamily:"var(--fd)", fontWeight:800, fontSize:"1.3rem" }}>Password Reset!</h2>
              <p style={{ fontSize:"13px", color:"var(--tx-m)" }}>Redirecting to login…</p>
            </div>
          ) : (
            <>
              {step === 1 && (
                <form onSubmit={handleSendOTP} style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                  <div>
                    <label style={{ fontSize:"11px", fontWeight:600, textTransform:"uppercase",
                      letterSpacing:"1px", color:"var(--tx-m)", display:"block", marginBottom:"8px" }}>
                      Email Address
                    </label>
                    <input type="email" placeholder="you@email.com" value={email}
                      onChange={e => setEmail(e.target.value)} style={inputStyle}
                      onFocus={e => e.target.style.borderColor = "var(--cp)"}
                      onBlur={e => e.target.style.borderColor = "var(--bd)"} />
                  </div>

                  {error && (
                    <div style={{ background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.25)",
                      color:"var(--danger)", borderRadius:"10px", padding:"10px 14px", fontSize:"13px" }}>
                      ⚠️ {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.7 : 1 }}>
                    {loading
                      ? <><span className="aspin" style={{ width:16, height:16,
                          border:"2px solid var(--bg)", borderTopColor:"transparent", borderRadius:"50%" }} />Sending OTP…</>
                      : "Send OTP →"}
                  </button>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleResetPassword} style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                  {[
                    ["New Password",     newPassword,     setNewPassword,     "password", "Min 6 characters"],
                    ["Confirm Password", confirmPassword, setConfirmPassword, "password", "Re-enter password"],
                  ].map(([label, val, setVal, type, ph]) => (
                    <div key={label}>
                      <label style={{ fontSize:"11px", fontWeight:600, textTransform:"uppercase",
                        letterSpacing:"1px", color:"var(--tx-m)", display:"block", marginBottom:"8px" }}>
                        {label}
                      </label>
                      <input type={type} placeholder={ph} value={val}
                        onChange={e => setVal(e.target.value)} style={inputStyle}
                        onFocus={e => e.target.style.borderColor = "var(--cp)"}
                        onBlur={e => e.target.style.borderColor = "var(--bd)"} />
                    </div>
                  ))}

                  {error && (
                    <div style={{ background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.25)",
                      color:"var(--danger)", borderRadius:"10px", padding:"10px 14px", fontSize:"13px" }}>
                      ⚠️ {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.7 : 1 }}>
                    {loading
                      ? <><span className="aspin" style={{ width:16, height:16,
                          border:"2px solid var(--bg)", borderTopColor:"transparent", borderRadius:"50%" }} />Resetting…</>
                      : "Reset Password →"}
                  </button>
                </form>
              )}

              <p style={{ textAlign:"center", fontSize:"13px", color:"var(--tx-m)", marginTop:"16px" }}>
                <Link to="/login" style={{ color:"var(--cp)", fontWeight:700, textDecoration:"none" }}>
                  ← Back to Login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      {showOTP && (
        <OTPVerification
          email={email}
          purpose="FORGOT_PASSWORD"
          onVerified={handleOTPVerified}
          onCancel={() => setShowOTP(false)}
        />
      )}
    </div>
  );
}
