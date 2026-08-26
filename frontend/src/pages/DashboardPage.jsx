import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";
import AnalysisResults from "../components/AnalysisResults";
import Sidebar from "../components/Sidebar";

export default function DashboardPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [cvText, setCvText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [completedSkills, setCompletedSkills] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [fileLoading, setFileLoading] = useState(false);

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

  async function handleAnalyzeFile() {
    setFileError("");
    setResult(null);

    if (!selectedFile) {
      setFileError("Choose a PDF or DOCX file before analyzing.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setFileLoading(true);
    try {
      const res = await apiClient.post("/cv/analyze-file", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResult(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate("/login");
        return;
      }
      setFileError(err.response?.data?.error || "File analysis failed. Please try again.");
    } finally {
      setFileLoading(false);
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
    <div className="app-shell">
      <Sidebar active="Dashboard" />

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-heading">
            <div className="app-topbar-title">Dashboard</div>
            <div className="app-topbar-subtitle">Paste your CV or upload a file to get started</div>
          </div>
        </header>

        <div className="app-content">
          <section className="card upload-section">
            <div className="card-title">Paste your CV</div>
            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Paste your CV text here..."
              rows={10}
            />
            <div>
              <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading}>
                {loading ? "Analyzing..." : "Analyze"}
              </button>
            </div>
            {error && <p className="error-text">{error}</p>}

            <div className="upload-divider card-title">Or upload a CV file (PDF/DOCX)</div>
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => setSelectedFile(e.target.files[0] || null)}
            />
            <div>
              <button className="btn btn-primary" onClick={handleAnalyzeFile} disabled={fileLoading}>
                {fileLoading ? "Analyzing..." : "Analyze File"}
              </button>
            </div>
            {fileError && <p className="error-text">{fileError}</p>}
          </section>

          {result && (
            <AnalysisResults
              result={result}
              completedSkills={completedSkills}
              onToggleSkill={handleToggleSkill}
              onAddCorrection={handleAddCorrection}
              onGenerateReport={handleGenerateReport}
            />
          )}
        </div>
      </div>
    </div>
  );
}
