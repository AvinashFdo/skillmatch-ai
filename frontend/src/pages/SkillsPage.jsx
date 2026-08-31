import { useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import StepIndicator from "../components/StepIndicator";
import useAnalysis from "../hooks/useAnalysis";
import { computeAnalysisStats } from "../utils/analysisStats";

// manualSkills is session-only, just for the "(added by you)" tag - the skill itself is persisted server-side
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

    if (stats.extractedSkills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      setCorrectionInput("");
      return;
    }

    setCorrectionInput("");

    try {
      await addCorrection(skill);
      setManualSkills((prev) => [...prev, skill]);
    } catch {
      setCorrectionError("Could not save that correction. Please try again.");
    }
  }

  const manualSkillsLower = manualSkills.map((s) => s.toLowerCase());
  const autoExtractedSkills = stats.extractedSkills.filter(
    (s) => !manualSkillsLower.includes(s.toLowerCase())
  );
  const totalExtracted = stats.totalExtracted;

  return (
    <div className="app-shell">
      <Sidebar active="Skills" />

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-heading">
            <div className="app-topbar-title">Skills</div>
            <div className="app-topbar-subtitle">Skills identified from your CV</div>
          </div>
          <StepIndicator current={2} />
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
                {autoExtractedSkills.map((skill) => (
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
