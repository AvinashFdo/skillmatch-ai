import { useState } from "react";

/**
 * Renders the full analyze_cv() response: extracted skills, role-fit
 * scores for all 4 roles, and the recommended role's roadmap - plus a
 * checkbox per missing skill so the user can track progress, and a
 * readiness % computed from how many of the top role's missing skills
 * are marked complete.
 *
 * Visual language matches design_reference.html exactly (stat cards,
 * data table, priority-tier checklist cards) - see CLAUDE_LOG.md for
 * the extraction notes. All 4 stat cards below are computed purely
 * from data the app already has (extracted skills, role-fit numbers,
 * the priority-grouped missing-skill list) - nothing fabricated to
 * match the reference's own stat cards (which show fields like
 * "+9 since 04 August" that we have no historical data for).
 *
 * Also lets the user manually add a skill the extractor missed. Per a
 * deliberate scoping decision (see CLAUDE_LOG.md), this only adds the
 * skill to the displayed list and logs the correction - it does NOT
 * re-run scoring/roadmap generation for the corrected skill set, since
 * that would mean re-calling the AI service and reworking the existing,
 * already-tested analyze flow for a lecturer-requested logging feature
 * that's about the correction record itself, not about improving this
 * one session's results.
 */
export default function AnalysisResults({
  result,
  completedSkills,
  onToggleSkill,
  onAddCorrection,
  onGenerateReport,
}) {
  const { extracted_skills: extractedSkills, role_fit: roleFit, recommended_role: roadmap } = result;

  const [manualSkills, setManualSkills] = useState([]);
  const [correctionInput, setCorrectionInput] = useState("");
  const [correctionError, setCorrectionError] = useState("");

  const allMissingSkills = roadmap.learning_order.flatMap((group) =>
    group.skills.map((s) => ({ ...s, priority: group.priority }))
  );
  const completedCount = allMissingSkills.filter((s) => completedSkills.includes(s.skill)).length;
  const totalMissing = allMissingSkills.length;
  const readinessPercent = totalMissing === 0 ? 100 : Math.round((completedCount / totalMissing) * 100);
  const totalExtracted = extractedSkills.length + manualSkills.length;
  const priorityCounts = { high: 0, medium: 0, low: 0 };
  allMissingSkills.forEach((s) => {
    priorityCounts[s.priority] = (priorityCounts[s.priority] || 0) + 1;
  });

  async function handleAddCorrection(e) {
    e.preventDefault();
    setCorrectionError("");

    const skill = correctionInput.trim();
    if (!skill) return;

    if (extractedSkills.includes(skill) || manualSkills.includes(skill)) {
      setCorrectionInput("");
      return;
    }

    // Show the addition immediately regardless of whether logging it
    // succeeds - the visual acknowledgement and the correction log are
    // two separate concerns.
    setManualSkills((prev) => [...prev, skill]);
    setCorrectionInput("");

    try {
      await onAddCorrection(skill);
    } catch {
      setCorrectionError("Skill added above, but logging the correction failed.");
    }
  }

  return (
    <>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="mono-label">READINESS SCORE</div>
          <div className="stat-card-value">
            {readinessPercent}
            <span className="stat-card-value-suffix">%</span>
          </div>
          <div className="stat-card-bar">
            <div className="stat-card-bar-fill" style={{ width: `${readinessPercent}%` }} />
          </div>
          <div className="stat-card-caption">Target: {roadmap.role_name}</div>
        </div>

        <div className="stat-card">
          <div className="mono-label">EXTRACTED SKILLS</div>
          <div className="stat-card-value">{totalExtracted}</div>
          <div className="stat-card-bar">
            <div className="stat-card-bar-fill" style={{ width: "100%" }} />
          </div>
          <div className="stat-card-caption">Identified from your CV</div>
        </div>

        <div className="stat-card">
          <div className="mono-label">MISSING SKILLS</div>
          <div className="stat-card-value">{totalMissing}</div>
          <div className="stat-card-bar">
            <div style={{ display: "flex", gap: 2, width: "100%" }}>
              <div style={{ flex: priorityCounts.high || 0.0001, height: 4, background: "var(--color-high-fill)" }} />
              <div
                style={{ flex: priorityCounts.medium || 0.0001, height: 4, background: "var(--color-medium-fill)" }}
              />
              <div style={{ flex: priorityCounts.low || 0.0001, height: 4, background: "var(--color-checkbox-border)" }} />
            </div>
          </div>
          <div className="stat-card-caption">
            {priorityCounts.high} high · {priorityCounts.medium} medium · {priorityCounts.low} low
          </div>
        </div>

        <div className="stat-card">
          <div className="mono-label">ROADMAP TASKS</div>
          <div className="stat-card-value">
            {completedCount}
            <span className="stat-card-value-suffix">/{totalMissing}</span>
          </div>
          <div className="stat-card-bar">
            <div className="stat-card-bar-fill" style={{ width: `${readinessPercent}%` }} />
          </div>
          <div className="stat-card-caption">Skills marked complete</div>
        </div>
      </div>

      <section className="card">
        <div className="card-title">Extracted skills ({totalExtracted})</div>
        <div className="tag-list">
          {extractedSkills.map((skill) => (
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

      <section className="data-table">
        <div className="data-table-head role-fit-table-row">
          <div>CAREER ROLE</div>
          <div>MATCHED</div>
          <div>ROLE-FIT SCORE</div>
          <div style={{ textAlign: "right" }}>GAPS</div>
        </div>
        {roleFit.map((role, index) => (
          <div
            className={`data-table-row role-fit-table-row ${index === 0 ? "data-table-row-lead" : ""}`}
            key={role.role_id}
          >
            <div>{role.role_name}</div>
            <div className="data-table-figure">
              {role.skills_matched_count} / {role.skills_required_count}
            </div>
            <div className="role-fit-score-bar">
              <div className="role-fit-score-track">
                <div className="role-fit-score-fill" style={{ width: `${role.fit_score_percent}%` }} />
              </div>
              <span className="role-fit-score-value">{role.fit_score_percent}%</span>
            </div>
            <div className="data-table-figure" style={{ textAlign: "right" }}>
              {role.skills_required_count - role.skills_matched_count}
            </div>
          </div>
        ))}
        <div className="data-table-foot">
          <span>SHOWING {roleFit.length} OF {roleFit.length} ROLES</span>
          <span>WEIGHTED SKILL MATCH BY PRIORITY</span>
        </div>
      </section>

      <section className="card">
        <div className="card-title">Recommended role: {roadmap.role_name}</div>
        <p className="readiness-summary">{roadmap.readiness_summary}</p>
        <p className="readiness-progress">
          READINESS {readinessPercent}% · {completedCount} OF {totalMissing} SKILLS COMPLETE
        </p>

        <h3 className="section-heading" style={{ marginTop: 8 }}>
          Roadmap
        </h3>
        {roadmap.learning_order.length === 0 ? (
          <p className="fully-matched-banner">You're fully matched - no skill gaps for this role.</p>
        ) : (
          <div className="priority-grid">
            {roadmap.learning_order.map((group) => (
              <div className={`priority-card priority-card-${group.priority}`} key={group.priority}>
                <div className="priority-card-head">
                  <div className="priority-card-title">{group.priority} priority</div>
                  <div className="priority-card-count">{group.skills.length} SKILLS</div>
                </div>
                <div>
                  {group.skills.map((s) => {
                    const isDone = completedSkills.includes(s.skill);
                    return (
                      <label
                        className={`priority-checklist-row ${isDone ? "priority-checklist-row-done" : ""}`}
                        key={s.skill}
                      >
                        <input
                          type="checkbox"
                          className="priority-checkbox-input"
                          checked={isDone}
                          onChange={() => onToggleSkill(s.skill)}
                        />
                        <span className="priority-checkbox-visual" aria-hidden="true" />
                        <span className="priority-checklist-label">
                          <span className="priority-checklist-skill">{s.skill}</span>
                          <span className="priority-checklist-category">{s.category}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <h3 className="section-heading" style={{ marginTop: 20 }}>
          Recommended resources
        </h3>
        <ul>
          {roadmap.recommended_resources.map((r) => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noreferrer">
                {r.title}
              </a>
            </li>
          ))}
        </ul>

        <h3 className="section-heading" style={{ marginTop: 20 }}>
          Suggested projects
        </h3>
        <ul>
          {roadmap.suggested_projects.map((project) => (
            <li key={project}>{project}</li>
          ))}
        </ul>

        <div style={{ marginTop: 20 }}>
          <button className="btn btn-primary" onClick={onGenerateReport}>
            Generate report
          </button>
        </div>
      </section>
    </>
  );
}
