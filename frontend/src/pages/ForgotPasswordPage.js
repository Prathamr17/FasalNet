// pages/ForgotPasswordPage.js — Forgot password with OTP
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import OTPVerification from "../components/OTPVerification";
import { otpAPI } from "../services/api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { Card } from "../components/ui/Card";
import Reveal from "../components/ui/Reveal";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=email, 2=new password
  const [email, setEmail] = useState("");
  const [verifiedOtp, setVerifiedOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOTP, setShowOTP] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError(t("auth.invalid_email", "Enter a valid email address"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      await otpAPI.send({ email, purpose: "FORGOT_PASSWORD" });
      setShowOTP(true);
    } catch (err) {
      setError(err.response?.data?.error || t("auth.otp_send_failed", "Failed to send OTP"));
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerified = (otp) => {
    setVerifiedOtp(otp);
    setShowOTP(false);
    setStep(2);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { setError(t("auth.password_min_length", "Password must be at least 6 characters")); return; }
    if (newPassword !== confirmPassword) { setError(t("auth.passwords_no_match", "Passwords do not match")); return; }
    setError("");
    setLoading(true);
    try {
      await otpAPI.resetPassword({ email, otp: verifiedOtp, new_password: newPassword });
      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (err) {
      setError(err.response?.data?.error || t("auth.password_reset_failed", "Password reset failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-56px)] items-center justify-center overflow-hidden px-4 py-8">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <motion.div
          className="absolute -right-[5%] -top-[5%] h-[30vw] w-[30vw] rounded-full bg-accent/10 blur-3xl"
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-[10%] -left-[5%] h-[25vw] w-[25vw] rounded-full bg-brand-harvest/10 blur-3xl"
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        <Reveal className="mb-7 text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-panel bg-accent-pale text-accent">
            <KeyRound size={24} />
          </div>
          <h1 className="font-display text-[1.75rem] font-extrabold text-accent">
            {t("auth.reset_password")}
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-muted">
            {step === 1 ? t("auth.forgot_subtitle_step1") : t("auth.forgot_subtitle_step2")}
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <Card className="p-7">
            {success ? (
              <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="py-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-safe-bg text-safe">
                  <CheckCircle2 size={26} />
                </div>
                <h2 className="font-display text-lg font-extrabold text-ink">{t("auth.password_reset_success")}</h2>
              </motion.div>
            ) : (
              <>
                {step === 1 && (
                  <form onSubmit={handleSendOTP} className="flex flex-col gap-3.5">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                        {t("auth.email_address")}
                      </label>
                      <Input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center gap-2 overflow-hidden rounded-md border border-danger bg-danger-bg px-3.5 py-2.5 text-[13px] text-danger"
                        >
                          <AlertCircle size={15} className="shrink-0" /> {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Button type="submit" disabled={loading} className="mt-1 w-full justify-center py-3 text-sm">
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          {t("auth.sending_otp")}
                        </span>
                      ) : (
                        <>{t("auth.send_otp")} <ArrowRight size={15} /></>
                      )}
                    </Button>
                  </form>
                )}

                {step === 2 && (
                  <form onSubmit={handleResetPassword} className="flex flex-col gap-3.5">
                    {[
                      [t("auth.new_password"), newPassword, setNewPassword, "password", t("auth.min_6_chars")],
                      [t("auth.confirm_password"), confirmPassword, setConfirmPassword, "password", t("auth.reenter_password")],
                    ].map(([label, val, setVal, type, ph]) => (
                      <div key={label}>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                          {label}
                        </label>
                        <Input type={type} placeholder={ph} value={val} onChange={(e) => setVal(e.target.value)} />
                      </div>
                    ))}

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center gap-2 overflow-hidden rounded-md border border-danger bg-danger-bg px-3.5 py-2.5 text-[13px] text-danger"
                        >
                          <AlertCircle size={15} className="shrink-0" /> {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Button type="submit" disabled={loading} className="mt-1 w-full justify-center py-3 text-sm">
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          {t("auth.resetting")}
                        </span>
                      ) : (
                        <>{t("auth.reset_password")} <ArrowRight size={15} /></>
                      )}
                    </Button>
                  </form>
                )}

                <p className="mt-4 text-center text-[13px]">
                  <Link to="/login" className="inline-flex items-center gap-1 font-bold text-accent no-underline hover:underline">
                    <ArrowLeft size={13} /> {t("auth.back_to_login")}
                  </Link>
                </p>
              </>
            )}
          </Card>
        </Reveal>
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
