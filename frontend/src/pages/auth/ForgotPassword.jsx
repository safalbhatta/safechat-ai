import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, MessageSquare, ArrowLeft, KeyRound, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import api from "../../lib/api";

// ── Step indicators ─────────────────────────────────────────────────────────
const steps = ["Email", "Verify OTP", "New Password"];

export default function ForgotPassword() {
  const navigate = useNavigate();

  // step: 1 = email, 2 = otp, 3 = new password, 4 = done
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const otpRefs = useRef([]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password/send-otp", { email });
      setStep(2);
      setResendTimer(60);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password/send-otp", { email });
      setOtp(["", "", "", "", "", ""]);
      setResendTimer(60);
      otpRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpStr = otp.join("");
    if (otpStr.length < 6) {
      setError("Please enter all 6 digits.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password/verify-otp", { email, otp: otpStr });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password/reset-password", {
        email,
        otp: otp.join(""),
        newPassword,
      });
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  // ── Shared styles ──────────────────────────────────────────────────────────
  const card = {
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(32px)",
    WebkitBackdropFilter: "blur(32px)",
    boxShadow: "0 8px 16px rgba(0,0,0,0.04), 0 32px 80px rgba(99,102,241,0.22), 0 2px 4px rgba(0,0,0,0.02)",
    border: "1px solid rgba(226,232,240,0.8)",
  };

  const inputClass =
    "w-full h-12 pl-11 pr-4 rounded-2xl bg-white/80 border border-[#dfe7f4] text-[#101742] placeholder:text-[#94a3b8] outline-none focus:ring-2 focus:ring-[#6366F1]/25 focus:border-[#A5B4FC] transition-all";

  const btnClass =
    "w-full h-12 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white font-black shadow-[0_14px_34px_rgba(99,102,241,0.34)] hover:scale-[1.01] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100";

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 12% 10%, rgba(99,102,241,0.30), transparent 30%), radial-gradient(circle at 88% 12%, rgba(139,92,246,0.26), transparent 32%), radial-gradient(circle at 50% 95%, rgba(6,182,212,0.14), transparent 35%), linear-gradient(135deg, #f8fbff 0%, #eef4ff 42%, #f7f3ff 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.20) 0%, transparent 70%)", transform: "translate(-30%, -30%)" }} />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.16) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="hover-3d rounded-3xl p-8" style={card}>

          {/* Back button */}
          {step < 4 && (
            <button
              type="button"
              onClick={() => (step === 1 ? navigate("/login") : setStep((s) => s - 1))}
              className="inline-flex items-center gap-2 text-[#64748b] hover:text-[#6366F1] font-bold mb-6"
            >
              <ArrowLeft size={18} />
              {step === 1 ? "Back to login" : "Back"}
            </button>
          )}

          {/* Logo + title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] mb-4 shadow-[0_14px_34px_rgba(99,102,241,0.34)]">
              <MessageSquare className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-black mb-1 text-[#101742]">Forgot Password?</h1>
            <p className="text-[#64748b] text-sm leading-6">
              {step === 1 && "Enter your email to receive a 6-digit OTP."}
              {step === 2 && `We sent a code to ${email}`}
              {step === 3 && "Create your new password."}
            </p>
          </div>

          {/* Step indicator */}
          {step < 4 && (
            <div className="flex items-center justify-center gap-2 mb-6">
              {steps.map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i + 1 < step ? "bg-[#6366F1] text-white" : i + 1 === step ? "bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white shadow-[0_4px_12px_rgba(99,102,241,0.35)]" : "bg-[#e2e8f0] text-[#94a3b8]"}`}>
                    {i + 1 < step ? "✓" : i + 1}
                  </div>
                  {i < steps.length - 1 && <div className={`h-0.5 w-8 rounded transition-all ${i + 1 < step ? "bg-[#6366F1]" : "bg-[#e2e8f0]"}`} />}
                </div>
              ))}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 px-4 py-3 text-sm font-semibold">
              {error}
            </div>
          )}

          {/* ── Step 1: Email ── */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleSendOtp} className="space-y-5">
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
                </div>
                <button type="submit" disabled={loading} className={btnClass}>
                  {loading ? "Sending…" : "Send OTP"}
                </button>
              </motion.form>
            )}

            {/* ── Step 2: OTP ── */}
            {step === 2 && (
              <motion.form key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-11 h-14 text-center text-2xl font-black rounded-2xl bg-white/80 border-2 border-[#dfe7f4] text-[#101742] outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                <button type="submit" disabled={loading} className={btnClass}>
                  {loading ? "Verifying…" : "Verify Code"}
                </button>

                <div className="text-center text-sm">
                  <span className="text-[#64748b]">Didn't receive it? </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0 || loading}
                    className="text-[#6366F1] hover:underline font-bold disabled:text-[#94a3b8] disabled:no-underline"
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                  </button>
                </div>
              </motion.form>
            )}

            {/* ── Step 3: New Password ── */}
            {step === 3 && (
              <motion.form key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleResetPassword} className="space-y-5">
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="New password (min. 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className={inputClass + " pr-11"}
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#6366F1]">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>

                <button type="submit" disabled={loading} className={btnClass}>
                  {loading ? "Resetting…" : "Reset Password"}
                </button>
              </motion.form>
            )}

            {/* ── Step 4: Success ── */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-5">
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-[0_14px_34px_rgba(16,185,129,0.30)]">
                    <CheckCircle className="text-white" size={42} />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[#101742] mb-2">Password Reset!</h2>
                  <p className="text-[#64748b] text-sm">Your password has been changed successfully. You can now sign in.</p>
                </div>
                <button onClick={() => navigate("/login")} className={btnClass}>
                  Go to Login
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom link */}
          {step < 4 && (
            <div className="mt-6 text-center text-sm">
              <span className="text-[#64748b]">Remember your password? </span>
              <button type="button" onClick={() => navigate("/login")} className="text-[#6366F1] hover:underline font-bold">
                Sign in
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
