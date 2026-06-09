import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield,
  MessageSquare,
  Zap,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import API from "../services/api";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await API.post("/auth/login", {
        email: form.email.trim(),
        password: form.password,
      });
      localStorage.setItem("user", JSON.stringify(res.data));
      navigate("/messenger");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setIsLoading(false);
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

        .auth-container {
          display: flex;
          min-height: 100vh;
          width: 100%;
          background-color: #0F172A;
          font-family: 'Poppins', sans-serif;
        }

        /* Left Panel - Hidden on Mobile */
        .auth-left {
          display: none;
          flex: 1;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #111827 0%, #0F172A 100%);
        }
        @media (min-width: 1024px) { .auth-left { display: flex; } }

        .auth-glow-1 { position: absolute; top: 25%; left: 25%; width: 24rem; height: 24rem; border-radius: 50%; background: radial-gradient(circle, #6C63FF, transparent); filter: blur(64px); opacity: 0.2; pointer-events: none; }
        .auth-glow-2 { position: absolute; bottom: 25%; right: 25%; width: 16rem; height: 16rem; border-radius: 50%; background: radial-gradient(circle, #8B5CF6, transparent); filter: blur(64px); opacity: 0.15; pointer-events: none; }

        .chat-bubble { position: absolute; padding: 0.75rem 1rem; border-radius: 1rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); backdrop-filter: blur(12px); display: flex; align-items: center; gap: 0.5rem; }
        .bubble-1 { top: -2rem; left: 1rem; border-bottom-left-radius: 0.125rem; background: rgba(108,99,255,0.25); border: 1px solid rgba(108,99,255,0.4); }
        .bubble-2 { top: 2rem; right: 1rem; border-bottom-right-radius: 0.125rem; background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.5); }
        .bubble-3 { bottom: 0; left: 2rem; border-bottom-left-radius: 0.125rem; background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.4); }

        .shield-core { position: relative; width: 10rem; height: 10rem; border-radius: 1.5rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); background: linear-gradient(135deg, rgba(108,99,255,0.3), rgba(139,92,246,0.2)); border: 1px solid rgba(108,99,255,0.4); backdrop-filter: blur(20px); }
        .feature-pill { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 9999px; background: rgba(108,99,255,0.12); border: 1px solid rgba(108,99,255,0.25); color: #94A3B8; font-size: 0.875rem; }

        /* Right Panel - Form */
        .auth-right { display: flex; flex: 1; align-items: center; justify-content: center; padding: 1.5rem; }
        .auth-card { width: 100%; max-width: 28rem; padding: 2rem; border-radius: 1rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); background: rgba(30,41,59,0.7); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(20px); }
        .auth-logo-box { width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #6C63FF, #8B5CF6); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
        
        .auth-input-wrapper { position: relative; display: flex; align-items: center; margin-bottom: 1.25rem; }
        .auth-input-icon { position: absolute; left: 0.75rem; color: #6C63FF; }
        .auth-input { width: 100%; height: 2.75rem; padding-left: 2.5rem; padding-right: 0.75rem; border-radius: 0.5rem; font-size: 0.875rem; color: #FFFFFF; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); outline: none; transition: all 0.2s; }
        .auth-input:focus { border-color: #6C63FF; box-shadow: 0 0 0 2px rgba(108,99,255,0.2); }
        .auth-input.pwd { padding-right: 2.5rem; }
        
        .auth-pwd-toggle { position: absolute; right: 0.75rem; color: #94A3B8; background: none; border: none; cursor: pointer; transition: color 0.2s; display: flex; align-items: center; justify-content: center; padding: 0; }
        .auth-pwd-toggle:hover { color: #FFFFFF; }
        
        .auth-btn-primary { width: 100%; height: 2.75rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; border: none; background: linear-gradient(135deg, #6C63FF, #8B5CF6); color: #FFFFFF; cursor: pointer; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center; margin-bottom: 1.25rem;}
        .auth-btn-primary:hover:not(:disabled) { opacity: 0.9; }
        .auth-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .auth-btn-google { width: 100%; height: 2.75rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: #FFFFFF; cursor: pointer; transition: background 0.2s; }
        .auth-btn-google:hover { background: rgba(255,255,255,0.08); }
      `}</style>

      <div className="auth-container">
        {/* Left side — illustration */}
        <div className="auth-left">
          <div className="auth-glow-1" />
          <div className="auth-glow-2" />

          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "28rem",
              marginBottom: "3rem",
            }}
          >
            <motion.div
              animate={{ y: [-6, 6, -6] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{ position: "relative" }}
            >
              <div className="chat-bubble bubble-1">
                <div
                  style={{
                    width: "1.5rem",
                    height: "1.5rem",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#6C63FF,#8B5CF6)",
                  }}
                />
                <span style={{ color: "white", fontSize: "0.875rem" }}>
                  Hey, how are you?
                </span>
              </div>

              <div className="chat-bubble bubble-2">
                <span style={{ color: "white", fontSize: "0.875rem" }}>
                  Buy cheap crypto now!!
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.125rem 0.5rem",
                    borderRadius: "9999px",
                    fontWeight: 600,
                    background: "rgba(245,158,11,0.3)",
                    color: "#F59E0B",
                  }}
                >
                  SPAM
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "14rem",
                }}
              >
                <div className="shield-core">
                  <div style={{ position: "relative" }}>
                    <Shield size={80} style={{ color: "#6C63FF" }} />
                    <Sparkles
                      size={24}
                      style={{
                        position: "absolute",
                        top: "-0.5rem",
                        right: "-0.5rem",
                        color: "#8B5CF6",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="chat-bubble bubble-3">
                <span style={{ color: "white", fontSize: "0.875rem" }}>
                  ✓ Message verified safe
                </span>
              </div>
            </motion.div>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              justifyContent: "center",
              marginBottom: "2.5rem",
            }}
          >
            <div className="feature-pill">
              <Zap size={16} color="#6C63FF" />
              <span>Real-time Detection</span>
            </div>
            <div className="feature-pill">
              <Shield size={16} color="#6C63FF" />
              <span>AI Moderation</span>
            </div>
            <div className="feature-pill">
              <MessageSquare size={16} color="#6C63FF" />
              <span>Safe Messaging</span>
            </div>
          </div>

          <div style={{ textAlign: "center", maxWidth: "24rem" }}>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "white",
                marginBottom: "0.75rem",
              }}
            >
              Secure Conversations with AI Protection
            </h1>
            <p style={{ color: "#94A3B8" }}>
              Real-time detection of spam, abusive and hateful messages —
              keeping your community safe.
            </p>
          </div>
        </div>

        {/* Right side — login form */}
        <div className="auth-right">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ width: "100%", maxWidth: "28rem" }}
          >
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
                Welcome back
              </h2>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#94A3B8",
                  marginBottom: "1.5rem",
                }}
              >
                Sign in to your SafeChat account
              </p>

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
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
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
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={handleChange}
                      disabled={isLoading}
                      className="auth-input"
                    />
                  </div>
                </div>

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
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={form.password}
                      onChange={handleChange}
                      disabled={isLoading}
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

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: "1.25rem",
                  }}
                >
                  <Link
                    to="/forgot-password"
                    style={{
                      fontSize: "0.875rem",
                      color: "#6C63FF",
                      textDecoration: "none",
                    }}
                    onMouseOver={(e) =>
                      (e.target.style.textDecoration = "underline")
                    }
                    onMouseOut={(e) => (e.target.style.textDecoration = "none")}
                  >
                    Forgot Password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="auth-btn-primary"
                >
                  {isLoading ? "Signing In..." : "Sign In"}
                </button>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.5rem 0",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: "1px",
                      background: "rgba(255,255,255,0.1)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "#94A3B8",
                      textTransform: "uppercase",
                    }}
                  >
                    or
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: "1px",
                      background: "rgba(255,255,255,0.1)",
                    }}
                  />
                </div>

                <button type="button" className="auth-btn-google">
                  <svg
                    style={{ width: "1rem", height: "1rem" }}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                  </svg>
                  Continue with Google
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
                Don't have an account?{" "}
                <Link
                  to="/register"
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
                  Create New Account
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
