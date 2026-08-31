import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await register(name, email, password);
      navigate("/login", { state: { justRegistered: true } });
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-stub">
        <div className="auth-wordmark">SkillMatch AI</div>
        <div className="auth-stub-copy">
          <div className="auth-stub-headline">
            See exactly what stands between you and the role you want.
          </div>
          <div className="auth-stub-body">
            Create a student account to upload your CV, get scored against our
            entry-level IT roles, and track your readiness over time.
          </div>
        </div>
        <div className="auth-stub-foot">FOR IT UNDERGRADUATES · INTERNSHIP &amp; ENTRY LEVEL</div>
      </div>

      <div className="auth-form-panel">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-tabs">
            <Link to="/login" className="auth-tab">
              Sign in
            </Link>
            <span className="auth-tab auth-tab-active">Register</span>
          </div>

          <div className="auth-fields">
            <div className="auth-field">
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="auth-field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="auth-actions">
            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting ? "Creating account..." : "Create account"}
            </button>
            <p className="auth-switch">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>

          <div className="auth-footnote">
            CV FILES ARE PROCESSED FOR SKILL EXTRACTION ONLY.
            <br />
            NO PERSONAL CONTACT DATA IS STORED.
          </div>
        </form>
      </div>
    </div>
  );
}
