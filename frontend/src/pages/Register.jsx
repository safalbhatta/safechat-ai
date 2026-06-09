import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  AtSign,
  Camera,
  Zap,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import API from "../services/api";

export default function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [avatar, setAvatar] = useState(null);

  // Expanded form state to match the new UI
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setAvatar(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    // setIsLoading(true); // Optional: add loading state later like login

    // Add a quick check to ensure passwords match before sending to backend
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      // Sending only the fields your backend currently expects
      const res = await API.post("/auth/register", {
        username: form.username,
        email: form.email,
        password: form.password,
      });
      localStorage.setItem("user", JSON.stringify(res.data));
      navigate("/messenger");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <>
      <style>{`
        /* Override Vite's default index.css layout constraints */
        :root, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          max-width: 100%;
          min-height: 100vh;
          text-align: left;
        }
        * { box-sizing: border-box; }

        .auth-container { display: flex; min-height: 100vh; width: 100%; background-color: #0F172A; font-family: 'Poppins', sans-serif; }
        
        /* Left Panel - Hidden on Mobile */
        .auth-left { display: none; flex: 1; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; position: relative; overflow: hidden; background: linear-gradient(135deg, #111827 0%, #0F172A 100%); }
        @media (min-width: 1024px) { .auth-left { display: flex; } }
        
        .auth-glow { position: absolute; top: 33%; left: 33%; width: 20rem; height: 20rem; border-radius: 50%; background: radial-gradient(circle, #6C63FF, transparent); filter: blur(64px); opacity: 0.2; pointer-events: none; }
        
        .hero-icon-box { width: 12rem; height: 12rem; border-radius: 1.5rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); background: linear-gradient(135deg, rgba(108,99,255,0.25), rgba(139,92,246,0.15)); border: 1px solid rgba(108,99,255,0.35); backdrop-filter: blur(20px); }
        
        .stat-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; width: 100%; max-width: 20rem; margin-top: 2rem; }
        .stat-card { padding: 1rem; border-radius: 0.75rem; text-align: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); background: rgba(108,99,255,0.1); border: 1px solid rgba(108,99,255,0.2); }

        /* Right Panel - Form */
        .auth-right { display: flex; flex: 1; align-items: center; justify-content: center; padding: 1.5rem; overflow-y: auto; }
        .auth-card { width: 100%; max-width: 28rem; padding: 2rem; border-radius: 1rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); background: rgba(30,41,59,0.7); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(20px); }
        .auth-logo-box { width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #6C63FF, #8B5CF6); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
        
        .avatar-upload-wrapper { display: flex; justify-content: center; margin-bottom: 1.5rem; }
        .avatar-upload { position: relative; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 5rem; height: 5rem; border-radius: 50%; overflow: hidden; background: rgba(108,99,255,0.15); border: 2px dashed rgba(108,99,255,0.5); transition: opacity 0.2s; }
        .avatar-upload:hover { opacity: 0.8; }
        .avatar-img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-badge { position: absolute; bottom: 0; right: 0; width: 1.5rem; height: 1.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); background: #6C63FF; }
        
        .auth-input-wrapper { position: relative; display: flex; align-items: center; margin-bottom: 1rem; }
        .auth-input-icon { position: absolute; left: 0.75rem; color: #6C63FF; }
        .auth-input { width: 100%; height: 2.75rem; padding-left: 2.5rem; padding-right: 0.75rem; border-radius: 0.5rem; font-size: 0.875rem; color: #FFFFFF; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); outline: none; transition: all 0.2s; }
        .auth-input:focus { border-color: #6C63FF; box-shadow: 0 0 0 2px rgba(108,99,255,0.2); }
        .auth-input.pwd { padding-right: 2.5rem; }
        
        .auth-pwd-toggle { position: absolute; right: 0.75rem; color: #94A3B8; background: none; border: none; cursor: pointer; transition: color 0.2s; display: flex; align-items: center; justify-content: center; padding: 0; }
        .auth-pwd-toggle:hover { color: #FFFFFF; }
        
        .auth-btn-primary { width: 100%; height: 2.75rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; border: none; background: linear-gradient(135deg, #6C63FF, #8B5CF6); color: #FFFFFF; cursor: pointer; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center; margin-top: 1.5rem; }
        .auth-btn-primary:hover:not(:disabled) { opacity: 0.9; }
        .auth-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div className="auth-container">
        {/* Left panel */}
        <div className="auth-left">
          <div className="auth-glow" />

          <motion.div
            animate={{ y: [-8, 8, -8] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            style={{ marginBottom: "2.5rem" }}
          >
            <div className="hero-icon-box">
              <User size={96} style={{ color: "#6C63FF" }} />
            </div>
          </motion.div>

          <div style={{ textAlign: "center", maxWidth: "20rem" }}>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "white",
                marginBottom: "0.75rem",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              Join the Safe Community
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#94A3B8" }}>
              Create your account and experience AI-powered moderation that
              keeps conversations respectful.
            </p>
          </div>

          <div className="stat-grid">
            {[
              { label: "Active Users", value: "24K+" },
              { label: "Messages/Day", value: "1.2M+" },
              { label: "Threats Blocked", value: "98.4%" },
              { label: "AI Accuracy", value: "99.1%" },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 700,
                    color: "#6C63FF",
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    marginTop: "0.25rem",
                    color: "#94A3B8",
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — form */}
        <div className="auth-right">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ width: "100%", maxWidth: "28rem", padding: "2rem 0" }}
          >
            {/* Logo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "2rem",
              }}
            >
              <div className="auth-logo-box">
                <Shield size={20} color="white" />
              </div>
              <span
                style={{ fontSize: "1.5rem", fontWeight: 700, color: "white" }}
              >
                SafeChat <span style={{ color: "#6C63FF" }}>AI</span>
              </span>
            </div>

            <div className="auth-card">
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: "white",
                  marginBottom: "0.25rem",
                }}
              >
                Create Account
              </h2>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#94A3B8",
                  marginBottom: "1.5rem",
                }}
              >
                Fill in your details to get started
              </p>

              {/* Error Message Display */}
              {error && (
                <div
                  style={{
                    marginBottom: "1.5rem",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem",
                    color: "#f87171",
                    background: "rgba(248,113,113,0.1)",
                    border: "1px solid rgba(248,113,113,0.2)",
                    textAlign: "center",
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Avatar upload */}
                <div className="avatar-upload-wrapper">
                  <div style={{ position: "relative" }}>
                    <label className="avatar-upload">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt="Profile"
                          className="avatar-img"
                        />
                      ) : (
                        <User size={32} style={{ color: "#6C63FF" }} />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleAvatarChange}
                      />
                    </label>
                    <div className="avatar-badge pointer-events-none">
                      <Camera size={12} color="white" />
                    </div>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#94A3B8",
                      marginBottom: "0.375rem",
                    }}
                  >
                    Full Name
                  </label>
                  <div className="auth-input-wrapper">
                    <User size={16} className="auth-input-icon" />
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className="auth-input"
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#94A3B8",
                      marginBottom: "0.375rem",
                    }}
                  >
                    Username
                  </label>
                  <div className="auth-input-wrapper">
                    <AtSign size={16} className="auth-input-icon" />
                    <input
                      name="username"
                      required
                      value={form.username}
                      onChange={handleChange}
                      placeholder="johndoe"
                      className="auth-input"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#94A3B8",
                      marginBottom: "0.375rem",
                    }}
                  >
                    Email
                  </label>
                  <div className="auth-input-wrapper">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className="auth-input"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#94A3B8",
                      marginBottom: "0.375rem",
                    }}
                  >
                    Password
                  </label>
                  <div className="auth-input-wrapper">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      name="password"
                      required
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="auth-input pwd"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="auth-pwd-toggle"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#94A3B8",
                      marginBottom: "0.375rem",
                    }}
                  >
                    Confirm Password
                  </label>
                  <div className="auth-input-wrapper">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      name="confirmPassword"
                      required
                      type={showConfirm ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="auth-input pwd"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="auth-pwd-toggle"
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button type="submit" className="auth-btn-primary">
                  Create Account
                </button>
              </form>

              <p
                style={{
                  marginTop: "2rem",
                  textAlign: "center",
                  fontSize: "0.875rem",
                  color: "#94A3B8",
                }}
              >
                Already have an account?{" "}
                <Link
                  to="/"
                  style={{
                    fontWeight: 500,
                    color: "#6C63FF",
                    textDecoration: "none",
                    marginLeft: "0.25rem",
                  }}
                  onMouseOver={(e) =>
                    (e.target.style.textDecoration = "underline")
                  }
                  onMouseOut={(e) => (e.target.style.textDecoration = "none")}
                >
                  Sign In
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
