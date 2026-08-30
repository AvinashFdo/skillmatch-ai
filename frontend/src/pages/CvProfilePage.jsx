import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import Modal from "../components/Modal";
import useAnalysis from "../hooks/useAnalysis";

function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * CV & Profile page - matches design_reference.html's actual page
 * breakdown more precisely than the earlier 4-page split did. Re-
 * reading the reference's Dashboard (FIG 02) showed it has no CV
 * upload and no profile form at all - those live on a separate "CV &
 * Profile" page. This page is that page: the CV paste/file-upload
 * inputs and the Profile details panel, both moved here from what used
 * to be inline on Dashboard.
 *
 * Design decision (confirmed with the project owner before building):
 * analyzing no longer auto-navigates to /skills. The reference's own
 * FIG 03 shows a manual "Continue to skill validation" step, not an
 * auto-redirect - and this page now needs to actually display the
 * analysis results (file metadata, pipeline breakdown) right after
 * analyzing, which an instant redirect would cut off before the user
 * could see it. The user reviews the results here, then moves on via
 * the sidebar or the "Continue to Skills" link whenever ready.
 *
 * The results panel reads directly off `result` from useAnalysis()
 * rather than separate local state - result.word_count and
 * result.skill_dictionary_size come back from EVERY analysis (text or
 * file - see analyze_cv.py), and result.fileName/fileSize/page_count
 * only exist for file-based analyses (added by cv.js/main.py
 * respectively). Since this is the same persisted result every other
 * page reads, a refresh of this page keeps showing the last analysis's
 * real numbers too - not just a one-time toast.
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
  const [resetModalOpen, setResetModalOpen] = useState(false);

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

  function handleResetAnalysis() {
    setResetModalOpen(true);
  }

  async function handleConfirmReset() {
    setResetError("");
    setResetting(true);
    try {
      await resetAnalysis();
      setCvText("");
      setSelectedFile(null);
      setError("");
      setFileError("");
      setResetModalOpen(false);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate("/login");
        return;
      }
      setResetError(err.response?.data?.error || "Could not clear your analysis. Please try again.");
      setResetModalOpen(false);
    } finally {
      setResetting(false);
    }
  }

  const isFileAnalysis = Boolean(result?.fileName);
  const fileIsPdf = isFileAnalysis && result.fileName.toLowerCase().endsWith(".pdf");
  // word_count/skill_dictionary_size were added to the analyze pipeline
  // alongside this panel - an analysis saved before that change (an
  // older lastAnalysis already persisted for an existing account) won't
  // have them. Guard rather than assume, so re-visiting this page with
  // old data shows a graceful fallback instead of crashing on
  // `undefined.toLocaleString()`.
  const hasPipelineMeta = result && typeof result.word_count === "number" && typeof result.skill_dictionary_size === "number";

  return (
    <div className="app-shell">
      <Sidebar active="CV & Profile" />

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-heading">
            <div className="app-topbar-title">CV &amp; Profile</div>
            <div className="app-topbar-subtitle">Paste your CV or upload a file, and keep your profile up to date</div>
          </div>
          <div className="step-indicator" aria-label="Step 1 of 3: Upload">
            <div className="step-indicator-item step-indicator-item-active">
              <span className="step-indicator-circle">1</span>
              <span>Upload</span>
            </div>
            <div className="step-indicator-connector" />
            <div className="step-indicator-item">
              <span className="step-indicator-circle">2</span>
              <span>Skills</span>
            </div>
            <div className="step-indicator-connector" />
            <div className="step-indicator-item">
              <span className="step-indicator-circle">3</span>
              <span>Roles</span>
            </div>
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

          {!loading && result && (
            <section className="card">
              <div className="card-title">Analysis complete</div>

              {isFileAnalysis && (
                <div className="file-info-panel">
                  <div className="file-info-row">
                    <span className="file-info-name">{result.fileName}</span>
                    <span className="file-info-size">{formatFileSize(result.fileSize)}</span>
                  </div>
                  {hasPipelineMeta && (
                    <div className="file-info-caption">
                      TEXT EXTRACTED · {result.word_count.toLocaleString()} WORDS
                      {fileIsPdf && result.page_count ? ` · ${result.page_count} PAGES` : ""}
                    </div>
                  )}
                </div>
              )}

              {hasPipelineMeta ? (
                <>
                  <div className="pipeline-log">
                    <div className="pipeline-log-row">
                      <span className="pipeline-log-step">Text extraction</span>
                      <span className="pipeline-log-detail">
                        {isFileAnalysis
                          ? `Extracted from ${fileIsPdf ? "PDF" : "DOCX"} - ${result.word_count.toLocaleString()} words`
                          : `From pasted text - ${result.word_count.toLocaleString()} words`}
                      </span>
                    </div>
                    <div className="pipeline-log-row">
                      <span className="pipeline-log-step">Preprocessing</span>
                      <span className="pipeline-log-detail">Lowercased, whitespace normalized</span>
                    </div>
                    <div className="pipeline-log-row">
                      <span className="pipeline-log-step">Dictionary matching</span>
                      <span className="pipeline-log-detail">
                        {result.extracted_skills.length} skill{result.extracted_skills.length === 1 ? "" : "s"} matched
                        against a {result.skill_dictionary_size}-term skill dictionary
                      </span>
                    </div>
                  </div>
                  <p className="pipeline-note">
                    Matching uses exact-term dictionary lookup (case-insensitive, word-boundary-safe), not fuzzy or
                    confidence-based matching - every skill above is a literal occurrence of a known skill name found
                    in your CV text. Missed a skill? Add it manually on the Skills page.
                  </p>
                </>
              ) : (
                <p className="pipeline-note">
                  {result.extracted_skills.length} skill{result.extracted_skills.length === 1 ? "" : "s"} extracted
                  from your last analysis. (Detailed pipeline numbers aren't available for analyses run before this
                  feature was added - re-analyze your CV to see them.)
                </p>
              )}

              <div style={{ marginTop: 4 }}>
                <Link to="/skills" className="btn btn-primary">
                  Continue to Skills
                </Link>
              </div>
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

          <section className="card">
            <div className="card-title">Before you upload</div>
            <ul>
              <li>Text-based PDFs extract best. Scanned or image-only CVs cannot be read.</li>
              <li>Keep skills in a clearly labelled section (e.g. "Skills" or "Technical Skills") so the parser can find them.</li>
              <li>You can add any missed skills manually on the Skills page afterward.</li>
            </ul>
          </section>

          <section className="card data-handling-card">
            <div className="mono-label">Data handling</div>
            <p>
              Only your extracted skills, role-fit results, and roadmap are stored. Uploaded files are processed
              in memory and are not written to disk or retained anywhere after analysis.
            </p>
          </section>
        </div>
      </div>

      <Modal
        open={resetModalOpen}
        title="Start fresh with a new CV?"
        message="This will clear your current analysis and progress. Your profile details (Programme, Year, Study time) will be kept."
        confirmLabel="Continue"
        cancelLabel="Cancel"
        onConfirm={handleConfirmReset}
        onCancel={() => setResetModalOpen(false)}
        confirming={resetting}
      />
    </div>
  );
}
