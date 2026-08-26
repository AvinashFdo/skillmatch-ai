import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import useAnalysis from "../hooks/useAnalysis";
import { computeAnalysisStats } from "../utils/analysisStats";

/**
 * Overview/landing page - part 1 of 4 (Dashboard/Skills/Roles/Roadmap),
 * split out from what used to be a single all-in-one Dashboard page, to
 * match design_reference.html's page breakdown. This page now only
 * owns: the top-level stat summary, the CV paste/file-upload inputs, and
 * navigation into the other 3 pages - the detailed skills list, role-fit
 * table, and roadmap/progress UI all moved to their own routes.
 *
 * On a successful analyze, this page auto-navigates to /skills rather
 * than showing a "view results" call-to-action - chosen over the
 * alternative because it's one less click and there's no ambiguity
 * about what "next" means (skills is always the first thing worth
 * checking after an analysis). See CLAUDE_LOG.md for the tradeoff note.
 */
export default function DashboardPage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const { result, setResult, completedSkills, profile, updateProfile, loading } = useAnalysis();

  const [cvText, setCvText] = useState("");
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [fileAnalyzing, setFileAnalyzing] = useState(false);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ programme: "", year: "", studyHoursPerWeek: "" });
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const stats = computeAnalysisStats(result, completedSkills);

  function startEditProfile() {
    setProfileForm({
      programme: profile.programme || "",
      year: profile.year || "",
      studyHoursPerWeek: profile.studyHoursPerWeek ?? "",
    });
    setProfileError("");
    setEditingProfile(true);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileError("");

    const hours = profileForm.studyHoursPerWeek === "" ? null : Number(profileForm.studyHoursPerWeek);
    if (hours !== null && (!Number.isFinite(hours) || hours <= 0)) {
      setProfileError("Study time must be a positive number of hours.");
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile({
        programme: profileForm.programme.trim(),
        year: profileForm.year.trim(),
        studyHoursPerWeek: hours,
      });
      setEditingProfile(false);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate("/login");
        return;
      }
      setProfileError(err.response?.data?.error || "Could not save profile. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAnalyze() {
    setError("");

    if (!cvText.trim()) {
      setError("Paste some CV text before analyzing.");
      return;
    }

    setAnalyzing(true);
    try {
      const res = await apiClient.post("/cv/analyze", { cv_text: cvText }, authHeaders);
      setResult(res.data);
      navigate("/skills");
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate("/login");
        return;
      }
      setError(err.response?.data?.error || "Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleAnalyzeFile() {
    setFileError("");

    if (!selectedFile) {
      setFileError("Choose a PDF or DOCX file before analyzing.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setFileAnalyzing(true);
    try {
      const res = await apiClient.post("/cv/analyze-file", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResult(res.data);
      navigate("/skills");
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate("/login");
        return;
      }
      setFileError(err.response?.data?.error || "File analysis failed. Please try again.");
    } finally {
      setFileAnalyzing(false);
    }
  }

  const hasResult = Boolean(result);

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
          {!loading && (
            <section className="card">
              <div className="card-title">Profile details</div>
              {!editingProfile ? (
                <>
                  <div className="profile-detail-list">
                    <div className="profile-detail-row">
                      <span className="profile-detail-label">Programme</span>
                      <span className="profile-detail-value">{profile.programme || "Not set"}</span>
                    </div>
                    <div className="profile-detail-row">
                      <span className="profile-detail-label">Year</span>
                      <span className="profile-detail-value">{profile.year || "Not set"}</span>
                    </div>
                    <div className="profile-detail-row">
                      <span className="profile-detail-label">Study time/week</span>
                      <span className="profile-detail-value">
                        {profile.studyHoursPerWeek ? `${profile.studyHoursPerWeek} hours` : "Not set"}
                      </span>
                    </div>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <button className="btn" onClick={startEditProfile}>
                      Edit profile
                    </button>
                  </div>
                </>
              ) : (
                <form className="profile-edit-form" onSubmit={handleSaveProfile}>
                  <label>
                    Programme
                    <input
                      value={profileForm.programme}
                      onChange={(e) => setProfileForm({ ...profileForm, programme: e.target.value })}
                      placeholder="e.g. BSc Computer Science"
                    />
                  </label>
                  <label>
                    Year
                    <input
                      value={profileForm.year}
                      onChange={(e) => setProfileForm({ ...profileForm, year: e.target.value })}
                      placeholder="e.g. Year 3"
                    />
                  </label>
                  <label>
                    Study time/week (hours)
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={profileForm.studyHoursPerWeek}
                      onChange={(e) => setProfileForm({ ...profileForm, studyHoursPerWeek: e.target.value })}
                      placeholder="e.g. 8"
                    />
                  </label>
                  {profileError && <p className="error-text">{profileError}</p>}
                  <div className="profile-edit-actions">
                    <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                      {savingProfile ? "Saving..." : "Save"}
                    </button>
                    <button type="button" className="btn" onClick={() => setEditingProfile(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}

          {!loading && hasResult && (
            <div className="stat-grid">
              <div className="stat-card">
                <div className="mono-label">READINESS SCORE</div>
                <div className="stat-card-value">
                  {stats.readinessPercent}
                  <span className="stat-card-value-suffix">%</span>
                </div>
                <div className="stat-card-bar">
                  <div className="stat-card-bar-fill" style={{ width: `${stats.readinessPercent}%` }} />
                </div>
                <div className="stat-card-caption">Target: {stats.roadmap.role_name}</div>
              </div>

              <div className="stat-card">
                <div className="mono-label">EXTRACTED SKILLS</div>
                <div className="stat-card-value">{stats.totalExtracted}</div>
                <div className="stat-card-bar">
                  <div className="stat-card-bar-fill" style={{ width: "100%" }} />
                </div>
                <div className="stat-card-caption">Identified from your CV</div>
              </div>

              <div className="stat-card">
                <div className="mono-label">MISSING SKILLS</div>
                <div className="stat-card-value">{stats.totalMissing}</div>
                <div className="stat-card-bar">
                  <div style={{ display: "flex", gap: 2, width: "100%" }}>
                    <div
                      style={{ flex: stats.priorityCounts.high || 0.0001, height: 4, background: "var(--color-high-fill)" }}
                    />
                    <div
                      style={{
                        flex: stats.priorityCounts.medium || 0.0001,
                        height: 4,
                        background: "var(--color-medium-fill)",
                      }}
                    />
                    <div
                      style={{ flex: stats.priorityCounts.low || 0.0001, height: 4, background: "var(--color-checkbox-border)" }}
                    />
                  </div>
                </div>
                <div className="stat-card-caption">
                  {stats.priorityCounts.high} high · {stats.priorityCounts.medium} medium · {stats.priorityCounts.low} low
                </div>
              </div>

              <div className="stat-card">
                <div className="mono-label">ROADMAP TASKS</div>
                <div className="stat-card-value">
                  {stats.completedCount}
                  <span className="stat-card-value-suffix">/{stats.totalMissing}</span>
                </div>
                <div className="stat-card-bar">
                  <div className="stat-card-bar-fill" style={{ width: `${stats.readinessPercent}%` }} />
                </div>
                <div className="stat-card-caption">Skills marked complete</div>
              </div>
            </div>
          )}

          {!loading && !hasResult && (
            <section className="card">
              <div className="card-title">No analysis yet</div>
              <p>Paste your CV text or upload a file below to get your first readiness score.</p>
            </section>
          )}

          {!loading && (
            <section className="card">
              <div className="card-title">Explore your results</div>
              <div className="dashboard-nav-links">
                <Link
                  to="/skills"
                  className="btn"
                  aria-disabled={!hasResult}
                  onClick={(e) => !hasResult && e.preventDefault()}
                  title={hasResult ? undefined : "Analyze a CV first"}
                >
                  Skills
                </Link>
                <Link
                  to="/roles"
                  className="btn"
                  aria-disabled={!hasResult}
                  onClick={(e) => !hasResult && e.preventDefault()}
                  title={hasResult ? undefined : "Analyze a CV first"}
                >
                  Role Matches
                </Link>
                <Link
                  to="/roadmap"
                  className="btn"
                  aria-disabled={!hasResult}
                  onClick={(e) => !hasResult && e.preventDefault()}
                  title={hasResult ? undefined : "Analyze a CV first"}
                >
                  Roadmap
                </Link>
              </div>
            </section>
          )}

          <section className="card upload-section">
            <div className="card-title">Paste your CV</div>
            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Paste your CV text here..."
              rows={10}
            />
            <div>
              <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? "Analyzing..." : "Analyze"}
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
              <button className="btn btn-primary" onClick={handleAnalyzeFile} disabled={fileAnalyzing}>
                {fileAnalyzing ? "Analyzing..." : "Analyze File"}
              </button>
            </div>
            {fileError && <p className="error-text">{fileError}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
