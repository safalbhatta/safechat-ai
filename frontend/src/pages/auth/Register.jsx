import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, MessageSquare } from "lucide-react";
import { motion } from "motion/react";
import api from "../../lib/api.js";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/register", {
        username: formData.name,
        email: formData.email,
        password: formData.password,
      });

      alert("Account created successfully. Please sign in.");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Register failed");
    } finally {
      setLoading(false);
    }
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
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] mb-4 shadow-[0_14px_34px_rgba(99,102,241,0.34)]">
              <MessageSquare className="text-white" size={32} />
            </div>

            <h1 className="text-3xl font-black mb-2 text-[#101742]">
              Create Account
            </h1>

            <p className="text-[#64748b]">
              Join Chater and start messaging
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 px-4 py-3 text-sm font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="relative">
              <User
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]"
              />
              <input
                type="text"
                placeholder="Full name"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                required
                className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white/80 border border-[#dfe7f4] text-[#101742] placeholder:text-[#94a3b8] outline-none focus:ring-2 focus:ring-[#6366F1]/25 focus:border-[#A5B4FC] transition-all"
              />
            </div>

            <div className="relative">
              <Mail
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]"
              />
              <input
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
                className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white/80 border border-[#dfe7f4] text-[#101742] placeholder:text-[#94a3b8] outline-none focus:ring-2 focus:ring-[#6366F1]/25 focus:border-[#A5B4FC] transition-all"
              />
            </div>

            <div className="relative">
              <Lock
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]"
              />
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                required
                minLength={6}
                className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white/80 border border-[#dfe7f4] text-[#101742] placeholder:text-[#94a3b8] outline-none focus:ring-2 focus:ring-[#6366F1]/25 focus:border-[#A5B4FC] transition-all"
              />
            </div>

            <div className="relative">
              <Lock
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]"
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                required
                minLength={6}
                className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white/80 border border-[#dfe7f4] text-[#101742] placeholder:text-[#94a3b8] outline-none focus:ring-2 focus:ring-[#6366F1]/25 focus:border-[#A5B4FC] transition-all"
              />
            </div>

            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 rounded accent-[#6366F1]"
                required
              />
              <span className="text-[#64748b]">
                I agree to the{" "}
                <span className="text-[#6366F1] font-semibold">
                  Terms of Service
                </span>{" "}
                and{" "}
                <span className="text-[#6366F1] font-semibold">
                  Privacy Policy
                </span>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white font-black shadow-[0_14px_34px_rgba(99,102,241,0.34)] hover:scale-[1.01] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-[#64748b]">Already have an account? </span>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-[#6366F1] hover:underline font-bold"
            >
              Sign in
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-[#64748b] mt-6">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}





