import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, MessageCircle, ShieldCheck } from "lucide-react";
import API from "../services/api";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await API.post("/auth/register", form);
      localStorage.setItem("user", JSON.stringify(res.data));
      navigate("/messenger");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-visual">
          <div className="brand-row">
            <div className="brand-logo">
              <MessageCircle size={24} />
            </div>
            <h2>SafeChat AI</h2>
          </div>

          <div className="visual-content">
            <h1>Create your secure chat account.</h1>
            <p>
              Start real-time conversations with authentication, online status,
              typing indicators, and AI-ready moderation.
            </p>

            <div className="security-card">
              <ShieldCheck size={34} />
              <div>
                <h3>Privacy first</h3>
                <span>Encrypted-style auth flow with JWT protection</span>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-panel">
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-title">
              <h1>Create account 🚀</h1>
              <p>Join SafeChat and start messaging safely.</p>
            </div>

            {error && <p className="error">{error}</p>}

            <label>Username</label>
            <div className="input-group">
              <User size={18} />
              <input
                name="username"
                placeholder="john_doe"
                onChange={handleChange}
                required
              />
            </div>

            <label>Email</label>
            <div className="input-group">
              <Mail size={18} />
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                onChange={handleChange}
                required
              />
            </div>

            <label>Password</label>
            <div className="input-group">
              <Lock size={18} />
              <input
                name="password"
                type="password"
                placeholder="Create a password"
                onChange={handleChange}
                required
              />
            </div>

            <button className="auth-btn" type="submit">
              Create Account
            </button>

            <p className="auth-link-text">
              Already have an account? <Link to="/">Login</Link>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}

export default Register;