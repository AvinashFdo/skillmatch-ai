import { Link, useLocation } from "react-router-dom";

/**
 * Read-only summary of the most recent analysis, formatted for
 * printing/saving as a PDF via the browser's own "Print" dialog -
 * deliberately not a custom PDF generator, per the project's time
 * constraints.
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
      <div className="dashboard">
        <p>No analysis data to report on. Analyze a CV first.</p>
        <Link to="/dashboard">Back to Dashboard</Link>
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
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="dashboard report-page">
      <div className="no-print">
        <Link to="/dashboard">Back to Dashboard</Link>
        <button onClick={() => window.print()}>Print / Save as PDF</button>
      </div>

      <h1>Career Readiness Report</h1>
      <p className="report-meta">
        {userName ? `Prepared for ${userName} - ` : ""}
        {today}
      </p>

      <section>
        <h2>Top Role Match</h2>
        <p>
          <strong>{topRole.role_name}</strong> - {topRole.fit_score_percent}% fit (
          {topRole.skills_matched_count} / {topRole.skills_required_count} skills matched)
        </p>
      </section>

      <section>
        <h2>Extracted Skills ({extractedSkills.length})</h2>
        <div className="tag-list">
          {extractedSkills.map((skill) => (
            <span className="tag" key={skill}>
              {skill}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2>
          Skill Gaps for {roadmap.role_name} ({completedCount} / {allMissingSkills.length} completed)
        </h2>
        {allMissingSkills.length === 0 ? (
          <p>No skill gaps - fully matched.</p>
        ) : (
          <ul>
            {allMissingSkills.map((s) => {
              const isDone = completedSkills.includes(s.skill);
              return (
                <li key={s.skill}>
                  {isDone ? "[Done] " : "[ ] "}
                  <span className={isDone ? "skill-done" : ""}>
                    {s.skill} ({s.category}, {s.priority} priority)
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2>Recommended Resources</h2>
        <ul>
          {roadmap.recommended_resources.map((r) => (
            <li key={r.url}>
              {r.title} - {r.url}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Suggested Projects</h2>
        <ul>
          {roadmap.suggested_projects.map((project) => (
            <li key={project}>{project}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
