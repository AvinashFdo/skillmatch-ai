import { Link, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";

/**
 * Read-only summary of the most recent analysis, formatted for
 * printing/saving as a PDF via the browser's own "Print" dialog -
 * deliberately not a custom PDF generator, per the project's time
 * constraints.
 *
 * Structure matches design_reference.html's FIG 11 (numbered sections
 * on an A4-proportioned document) - but every section is built purely
 * from data the app already produces:
 *   1. Summary       -> the existing roadmap.readiness_summary sentence
 *   2. Confirmed skills -> extracted_skills
 *   3. Priority gaps  -> the existing priority-grouped missing skills
 *   4. Recommended plan -> the existing resources + projects lists
 *   5. Notes and limitations -> static disclaimer copy (not data-driven)
 * No "readiness band" label or other derived concept from the
 * reference was added - only real, already-computed numbers are shown.
 *
 * Data is passed via react-router navigation state (set by
 * DashboardPage's "Generate Report" button) rather than a dedicated
 * backend endpoint, since everything shown here already exists in the
 * analyze response the dashboard already has in memory. This means a
 * direct visit/refresh of /report with no prior analysis has nothing
 * to show - handled below rather than crashing.
 */
export default function ReportPage() {
  const location = useLocation();
  const { result, completedSkills = [], userName } = location.state || {};

  if (!result) {
    return (
      <div className="app-shell">
        <Sidebar active="Dashboard" />
        <div className="app-main">
          <div className="app-content">
            <p>No analysis data to report on. Analyze a CV first.</p>
            <Link to="/dashboard">Back to Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  const { extracted_skills: extractedSkills, role_fit: roleFit, recommended_role: roadmap } = result;
  const topRole = roleFit[0];
  const allMissingSkills = roadmap.learning_order.flatMap((group) =>
    group.skills.map((s) => ({ ...s, priority: group.priority }))
  );
  const completedCount = allMissingSkills.filter((s) => completedSkills.includes(s.skill)).length;
  const today = new Date().toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="app-shell">
      <Sidebar active="Dashboard" />

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-heading">
            <div className="app-topbar-title">Career readiness report</div>
            <div className="app-topbar-subtitle">Generated {today}</div>
          </div>
          <div className="app-topbar-actions no-print">
            <Link to="/dashboard" className="btn">
              Back to Dashboard
            </Link>
            <button className="btn btn-primary" onClick={() => window.print()}>
              Print / Save as PDF
            </button>
          </div>
        </header>

        <div className="report-shell">
          <div className="report-doc">
            <div className="report-doc-header">
              <div>
                <div className="report-doc-title">Career Readiness Report</div>
                {userName && <div className="report-doc-subtitle">{userName}</div>}
              </div>
              <div className="report-doc-meta">
                SKILLMATCH AI
                <br />
                {today.toUpperCase()}
              </div>
            </div>

            <div className="report-strip">
              <div className="report-strip-cell">
                <div className="report-strip-label">TARGET ROLE</div>
                <div className="report-strip-value">{topRole.role_name}</div>
              </div>
              <div className="report-strip-cell">
                <div className="report-strip-label">ROLE FIT</div>
                <div className="report-strip-value report-strip-value-mono">
                  {topRole.fit_score_percent}%
                </div>
              </div>
            </div>

            <div className="report-section">
              <div className="report-section-title">1. Summary</div>
              <div className="report-section-body">{roadmap.readiness_summary}</div>
            </div>

            <div className="report-two-col">
              <div className="report-section">
                <div className="report-section-title">2. Confirmed skills</div>
                <div className="report-section-body">{extractedSkills.join(" · ")}</div>
              </div>

              <div className="report-section">
                <div className="report-section-title">3. Priority gaps</div>
                {allMissingSkills.length === 0 ? (
                  <div className="report-section-body">No skill gaps - fully matched.</div>
                ) : (
                  <div className="report-gap-list">
                    {allMissingSkills.map((s) => {
                      const isDone = completedSkills.includes(s.skill);
                      return (
                        <div className="report-gap-row" key={s.skill}>
                          <span className={isDone ? "skill-done" : ""}>{s.skill}</span>
                          <span className={`report-gap-priority report-gap-priority-${s.priority}`}>
                            {isDone ? "DONE" : s.priority.toUpperCase()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="report-section">
              <div className="report-section-title">4. Recommended plan</div>
              <div className="report-section-body">
                {completedCount} of {allMissingSkills.length} roadmap skills complete.{" "}
                {roadmap.recommended_resources.map((r) => r.title).join(", ")}
                {roadmap.recommended_resources.length > 0 && roadmap.suggested_projects.length > 0 && " · "}
                {roadmap.suggested_projects.length > 0 &&
                  `Suggested portfolio work: ${roadmap.suggested_projects.join("; ")}.`}
              </div>
            </div>

            <div className="report-section">
              <div className="report-section-title">5. Notes and limitations</div>
              <div className="report-section-body" style={{ fontSize: 12.5 }}>
                Scores are derived from a curated dataset of entry-level IT roles and from
                skills automatically extracted from your CV, which you may correct. This
                report supports career preparation decisions and does not predict hiring
                outcomes.
              </div>
            </div>

            <div className="report-footer">
              <span>SKILLMATCH AI · CAREER READINESS REPORT</span>
              <span>PAGE 1 OF 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
