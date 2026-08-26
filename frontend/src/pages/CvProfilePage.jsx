import { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import useAnalysis from "../hooks/useAnalysis";

/**
 * CV & Profile page - matches design_reference.html's actual page
 * breakdown more precisely than the earlier 4-page split did. Re-
 * reading the reference's Dashboard (FIG 02) showed it has no CV
 * upload and no profile form at all - those live on a separate "CV &
 * Profile" page. This page is that page: the CV paste/file-upload
 * inputs and the Profile details panel, both moved here from what used
 * to be inline on Dashboard.
 *
 * Analyzing (either method) still auto-navigates to /skills afterward,
 * same behavior as before - just triggered from here now instead of
 * from Dashboard, since this is where the actual analyze action lives
 * structurally. /skills remains the right landing spot: it's still the
 * natural first thing to check after an analysis, regardless of which
 * page kicked it off.
 */
export default function CvProfilePage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const { result, setResult, profile, updateProfile, resetAnalysis, loading } = useAnalysis();

  const [cvText, setCvText] = useState("");
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [fileAnalyzing, setFileAnalyzing] = useState(false);

  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ programme: "", year: "", studyHoursPerWeek: "" });
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

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

  async function handleResetAnalysis() {
    const confirmed = window.confirm(
      "This will clear your current analysis and progress. Your profile details will be kept. Continue?"
    );
    if (!confirmed) return;

    setResetError("");
    setResetting(true);
    try {
      await resetAnalysis();
      setCvText("");
      setSelectedFile(null);
      setError("");
      setFileError("");
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate("/login");
        return;
      }
      setResetError(err.response?.data?.error || "Could not clear your analysis. Please try again.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar active="CV & Profile" />

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-heading">
            <div className="app-topbar-title">CV &amp; Profile</div>
            <div className="app-topbar-subtitle">Paste your CV or upload a file, and keep your profile up to date</div>
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

          {!loading && result && (
            <section className="card reset-analysis-card">
              <div className="card-title">Start fresh</div>
              <p>
                Clear your current analysis and progress to analyze a new CV from scratch. Your profile
                details (Programme, Year, Study time) are kept.
              </p>
              <div style={{ marginTop: 10 }}>
                <button className="btn" onClick={handleResetAnalysis} disabled={resetting}>
                  {resetting ? "Clearing..." : "Start fresh with a new CV"}
                </button>
              </div>
              {resetError && <p className="error-text">{resetError}</p>}
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
