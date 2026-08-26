import { useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import useAnalysis from "../hooks/useAnalysis";
import { computeAnalysisStats } from "../utils/analysisStats";

/**
 * Page 2 of 4 - the detailed extracted-skills list plus the "Add a skill
 * we missed?" correction form, moved here from what used to be inline
 * on the single Dashboard page (see AnalysisResults.jsx, now retired).
 *
 * manualSkills (skills added via the correction form) stays local
 * component state, same as before the page split - it's a session-only
 * visual acknowledgement, not persisted server-side (only the
 * correction LOG entry is persisted, via POST /cv/correction). That
 * means navigating away from /skills and back, or refreshing, resets
 * the "(added by you)" tags even though the underlying correction was
 * already logged - a pre-existing limitation, not a regression from the
 * page split. See CLAUDE_LOG.md.
 */
export default function SkillsPage() {
  const { result, completedSkills, loading, addCorrection } = useAnalysis();
  const stats = computeAnalysisStats(result, completedSkills);

  const [manualSkills, setManualSkills] = useState([]);
  const [correctionInput, setCorrectionInput] = useState("");
  const [correctionError, setCorrectionError] = useState("");

  async function handleAddCorrection(e) {
    e.preventDefault();
    setCorrectionError("");

    const skill = correctionInput.trim();
    if (!skill) return;

    if (stats.extractedSkills.includes(skill) || manualSkills.includes(skill)) {
      setCorrectionInput("");
      return;
    }

    setManualSkills((prev) => [...prev, skill]);
    setCorrectionInput("");

    try {
      await addCorrection(skill);
    } catch {
      setCorrectionError("Skill added above, but logging the correction failed.");
    }
  }

  const totalExtracted = stats.totalExtracted + manualSkills.length;

  return (
    <div className="app-shell">
      <Sidebar active="Skills" />

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-heading">
            <div className="app-topbar-title">Skills</div>
            <div className="app-topbar-subtitle">Skills identified from your CV</div>
          </div>
        </header>

        <div className="app-content">
          {loading && <p>Loading...</p>}

          {!loading && !result && (
            <section className="card">
              <div className="card-title">No analysis yet</div>
              <p>
                Analyze a CV on the <Link to="/cv-profile">CV &amp; Profile</Link> page first to see your
                extracted skills.
              </p>
            </section>
          )}

          {!loading && result && (
            <section className="card">
              <div className="card-title">Extracted skills ({totalExtracted})</div>
              <div className="tag-list">
                {stats.extractedSkills.map((skill) => (
                  <span className="tag" key={skill}>
                    {skill}
                  </span>
                ))}
                {manualSkills.map((skill) => (
                  <span className="tag tag-manual" key={skill}>
                    {skill} <em>(added by you)</em>
                  </span>
                ))}
              </div>
              <form className="correction-form" onSubmit={handleAddCorrection}>
                <input
                  value={correctionInput}
                  onChange={(e) => setCorrectionInput(e.target.value)}
                  placeholder="Add a skill we missed?"
                />
                <button type="submit">Add</button>
              </form>
              {correctionError && <p className="error-text">{correctionError}</p>}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
