import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
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
            Know which role you fit, and what is missing before you apply.
          </div>
          <div className="auth-stub-body">
            Upload your CV. The system extracts your skills, scores you against our
            entry-level IT roles, and builds a roadmap for the gaps.
          </div>
        </div>
        <div className="auth-stub-foot">FOR IT UNDERGRADUATES · INTERNSHIP &amp; ENTRY LEVEL</div>
      </div>

      <div className="auth-form-panel">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-tabs">
            <span className="auth-tab auth-tab-active">Sign in</span>
            <Link to="/register" className="auth-tab">
              Register
            </Link>
          </div>

          {location.state?.justRegistered && (
            <p className="success-text">Account created - you can log in now.</p>
          )}

          <div className="auth-fields">
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
                required
              />
            </div>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="auth-actions">
            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </button>
            <p className="auth-switch">
              New here? <Link to="/register">Create a student account</Link> - takes about
              a minute.
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
