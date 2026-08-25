import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";
import AnalysisResults from "../components/AnalysisResults";

export default function DashboardPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [cvText, setCvText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    setError("");
    setResult(null);

    if (!cvText.trim()) {
      setError("Paste some CV text before analyzing.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post(
        "/cv/analyze",
        { cv_text: cvText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        // Token missing/expired - send back to login rather than
        // showing a confusing error on the dashboard.
        logout();
        navigate("/login");
        return;
      }
      setError(err.response?.data?.error || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>SkillMatch AI Dashboard</h1>
        <div>
          <span className="welcome-text">Welcome, {user?.name}</span>
          <Link to="/admin" className="admin-link">
            Admin
          </Link>
          <button
            className="logout-button"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Log out
          </button>
        </div>
      </header>

      <section className="upload-section">
        <h2>Paste Your CV</h2>
        <textarea
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
          placeholder="Paste your CV text here..."
          rows={12}
        />
        <button onClick={handleAnalyze} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>
        {error && <p className="error-text">{error}</p>}
      </section>

      {result && <AnalysisResults result={result} />}
    </div>
  );
}
