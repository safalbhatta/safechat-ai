import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ShieldCheck, MessageCircle } from "lucide-react";
import API from "../services/api";

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await API.post("/auth/login", form);
      localStorage.setItem("user", JSON.stringify(res.data));
      navigate("/messenger");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
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
            <h1>Secure conversations, AI protection.</h1>
            <p>
              Real-time messaging with safety checks for spam, abusive, and
              hateful content.
            </p>

            <div className="security-card">
              <ShieldCheck size={34} />
              <div>
                <h3>Protected messaging</h3>
                <span>JWT authentication + MongoDB storage</span>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-panel">
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-title">
              <h1>Welcome back 👋</h1>
              <p>Login to continue your conversations.</p>
            </div>

            {error && <p className="error">{error}</p>}

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
                placeholder="Enter your password"
                onChange={handleChange}
                required
              />
            </div>

            <button className="auth-btn" type="submit">
              Login
            </button>

            <p className="auth-link-text">
              Don&apos;t have an account? <Link to="/register">Register</Link>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}

export default Login;