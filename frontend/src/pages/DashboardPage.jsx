import { useEffect, useState } from "react";
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
  const [completedSkills, setCompletedSkills] = useState([]);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    // Restores checkbox state on load/refresh, so progress isn't tied
    // to a single analyze session.
    apiClient
      .get("/user/me", authHeaders)
      .then((res) => setCompletedSkills(res.data.completedSkills || []))
      .catch(() => {
        /* non-critical - checkboxes just start unchecked if this fails */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        authHeaders
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

  async function handleToggleSkill(skill) {
    // Optimistic update so the checkbox feels instant; the PATCH
    // response is the source of truth and overwrites this if different.
    setCompletedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );

    try {
      const res = await apiClient.patch("/user/progress", { skill }, authHeaders);
      setCompletedSkills(res.data.completedSkills);
    } catch {
      // Revert the optimistic update on failure.
      setCompletedSkills((prev) =>
        prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
      );
    }
  }

  async function handleAddCorrection(skill) {
    // Fire-and-forget from the UI's perspective (AnalysisResults already
    // shows the skill regardless) - just logs the correction. Throws on
    // failure so AnalysisResults can show its own inline error.
    await apiClient.post("/cv/correction", { skill, cv_text: cvText }, authHeaders);
  }

  function handleGenerateReport() {
    navigate("/report", { state: { result, completedSkills, userName: user?.name } });
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

      {result && (
        <>
          <AnalysisResults
            result={result}
            completedSkills={completedSkills}
            onToggleSkill={handleToggleSkill}
            onAddCorrection={handleAddCorrection}
          />
          <button className="report-button" onClick={handleGenerateReport}>
            Generate Report
          </button>
        </>
      )}
    </div>
  );
}
