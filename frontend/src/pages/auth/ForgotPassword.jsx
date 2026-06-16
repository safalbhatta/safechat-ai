import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, MessageSquare, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Later this will call backend email reset API.
    setSubmitted(true);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 12% 10%, rgba(99,102,241,0.30), transparent 30%), radial-gradient(circle at 88% 12%, rgba(139,92,246,0.26), transparent 32%), radial-gradient(circle at 50% 95%, rgba(6,182,212,0.14), transparent 35%), linear-gradient(135deg, #f8fbff 0%, #eef4ff 42%, #f7f3ff 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      <div
        className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.20) 0%, transparent 70%)",
          transform: "translate(-30%, -30%)",
        }}
      />

      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.16) 0%, transparent 70%)",
          transform: "translate(30%, -30%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div
          className="hover-3d rounded-3xl p-8"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
            boxShadow:
              "0 8px 16px rgba(0,0,0,0.04), 0 32px 80px rgba(99,102,241,0.22), 0 2px 4px rgba(0,0,0,0.02)",
            border: "1px solid rgba(226,232,240,0.8)",
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="inline-flex items-center gap-2 text-[#64748b] hover:text-[#6366F1] font-bold mb-6"
          >
            <ArrowLeft size={18} />
            Back to login
          </button>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] mb-4 shadow-[0_14px_34px_rgba(99,102,241,0.34)]">
              <MessageSquare className="text-white" size={32} />
            </div>

            <h1 className="text-3xl font-black mb-2 text-[#101742]">
              Forgot Password?
            </h1>

            <p className="text-[#64748b] leading-6">
              Enter your email and we will send you password reset instructions.
            </p>
          </div>

          {submitted ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-4 text-sm font-bold">
              If this email exists, a reset link will be sent.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                />

                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white/80 border border-[#dfe7f4] text-[#101742] placeholder:text-[#94a3b8] outline-none focus:ring-2 focus:ring-[#6366F1]/25 focus:border-[#A5B4FC] transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full h-12 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white font-black shadow-[0_14px_34px_rgba(99,102,241,0.34)] hover:scale-[1.01] transition-all"
              >
                Send Reset Link
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <span className="text-[#64748b]">Remember your password? </span>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-[#6366F1] hover:underline font-bold"
            >
              Sign in
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

