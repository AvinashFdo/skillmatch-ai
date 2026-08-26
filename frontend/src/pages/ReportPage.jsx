import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import useAnalysis from "../hooks/useAnalysis";
import { computeAnalysisStats } from "../utils/analysisStats";

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
 *
 * Previously received its data via react-router navigation state, set
 * by the (now-retired) single Dashboard page's "Generate Report"
 * button. Now that results live in the 4-page split, this instead
 * fetches the user's persisted lastAnalysis the same way every other
 * page does (useAnalysis) - which also means a direct visit or refresh
 * of /report correctly restores the report instead of going blank.
 */
export default function ReportPage() {
  const { user } = useAuth();
  const { result, completedSkills, loading } = useAnalysis();
  const stats = computeAnalysisStats(result, completedSkills);

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar active="Roadmap" />
        <div className="app-main">
          <div className="app-content">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="app-shell">
        <Sidebar active="Roadmap" />
        <div className="app-main">
          <div className="app-content">
            <p>No analysis data to report on. Analyze a CV first.</p>
            <Link to="/cv-profile">Go to CV &amp; Profile</Link>
          </div>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="app-shell">
      <Sidebar active="Roadmap" />

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-heading">
            <div className="app-topbar-title">Career readiness report</div>
            <div className="app-topbar-subtitle">Generated {today}</div>
          </div>
          <div className="app-topbar-actions no-print">
            <Link to="/roadmap" className="btn">
              Back to Roadmap
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
                {user?.name && <div className="report-doc-subtitle">{user.name}</div>}
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
                <div className="report-strip-value">{stats.topRole.role_name}</div>
              </div>
              <div className="report-strip-cell">
                <div className="report-strip-label">ROLE FIT</div>
                <div className="report-strip-value report-strip-value-mono">
                  {stats.topRole.fit_score_percent}%
                </div>
              </div>
            </div>

            <div className="report-section">
              <div className="report-section-title">1. Summary</div>
              <div className="report-section-body">{stats.roadmap.readiness_summary}</div>
            </div>

            <div className="report-two-col">
              <div className="report-section">
                <div className="report-section-title">2. Confirmed skills</div>
                <div className="report-section-body">{stats.extractedSkills.join(" · ")}</div>
              </div>

              <div className="report-section">
                <div className="report-section-title">3. Priority gaps</div>
                {stats.allMissingSkills.length === 0 ? (
                  <div className="report-section-body">No skill gaps - fully matched.</div>
                ) : (
                  <div className="report-gap-list">
                    {stats.allMissingSkills.map((s) => {
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
                {stats.completedCount} of {stats.allMissingSkills.length} roadmap skills complete.{" "}
                {stats.roadmap.recommended_resources.map((r) => r.title).join(", ")}
                {stats.roadmap.recommended_resources.length > 0 &&
                  stats.roadmap.suggested_projects.length > 0 &&
                  " · "}
                {stats.roadmap.suggested_projects.length > 0 &&
                  `Suggested portfolio work: ${stats.roadmap.suggested_projects.join("; ")}.`}
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
