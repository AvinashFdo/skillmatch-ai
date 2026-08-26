import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import useAnalysis from "../hooks/useAnalysis";
import { computeAnalysisStats, estimateRoadmapWeeks } from "../utils/analysisStats";

/**
 * Page 4 of 4 - the priority-tiered missing-skills checklist (with
 * progress toggling), recommended resources, suggested projects, and
 * the Generate Report link. Moved here from what used to be inline on
 * the single Dashboard page.
 *
 * The checkbox containing-block fix from the earlier scroll-jump bug
 * (`.priority-checklist-row { position: relative; }` in index.css)
 * lives at the CSS-class level, not tied to which page renders this
 * markup - so it applies here unchanged. Re-verified live after the
 * page split rather than assumed (see CLAUDE_LOG.md).
 */
export default function RoadmapPage() {
  const { result, completedSkills, profile, loading, toggleSkill } = useAnalysis();
  const navigate = useNavigate();
  const stats = computeAnalysisStats(result, completedSkills);
  const estimate = result
    ? estimateRoadmapWeeks(stats.allMissingSkills, completedSkills, profile.studyHoursPerWeek)
    : null;

  return (
    <div className="app-shell">
      <Sidebar active="Roadmap" />

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-heading">
            <div className="app-topbar-title">Roadmap</div>
            <div className="app-topbar-subtitle">Your prioritized plan for the recommended role</div>
          </div>
        </header>

        <div className="app-content">
          {loading && <p>Loading...</p>}

          {!loading && !result && (
            <section className="card">
              <div className="card-title">No analysis yet</div>
              <p>
                Analyze a CV on the <Link to="/dashboard">Dashboard</Link> first to see your roadmap.
              </p>
            </section>
          )}

          {!loading && result && (
            <section className="card">
              <div className="card-title">Recommended role: {stats.roadmap.role_name}</div>
              <p className="readiness-summary">{stats.roadmap.readiness_summary}</p>
              <p className="readiness-progress">
                READINESS {stats.readinessPercent}% · {stats.completedCount} OF {stats.totalMissing} SKILLS
                COMPLETE
              </p>

              {stats.totalMissing > stats.completedCount && (
                <p className="roadmap-estimate">
                  {profile.studyHoursPerWeek ? (
                    estimate && (
                      <>
                        At {profile.studyHoursPerWeek} hour{profile.studyHoursPerWeek === 1 ? "" : "s"}/week,
                        this roadmap would take approximately{" "}
                        <strong>
                          {estimate.weeks} week{estimate.weeks === 1 ? "" : "s"}
                        </strong>{" "}
                        to complete ({estimate.remainingCount} skill{estimate.remainingCount === 1 ? "" : "s"}{" "}
                        remaining).
                      </>
                    )
                  ) : (
                    <>
                      Set your study time on the <Link to="/dashboard">Dashboard</Link> to see an estimated
                      completion time for this roadmap.
                    </>
                  )}
                </p>
              )}

              <h3 className="section-heading" style={{ marginTop: 8 }}>
                Roadmap
              </h3>
              {stats.roadmap.learning_order.length === 0 ? (
                <p className="fully-matched-banner">You're fully matched - no skill gaps for this role.</p>
              ) : (
                <div className="priority-grid">
                  {stats.roadmap.learning_order.map((group) => (
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
                                onChange={() => toggleSkill(s.skill)}
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
                {stats.roadmap.recommended_resources.map((r) => (
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
                {stats.roadmap.suggested_projects.map((project) => (
                  <li key={project}>{project}</li>
                ))}
              </ul>

              <div style={{ marginTop: 20 }}>
                <button className="btn btn-primary" onClick={() => navigate("/report")}>
                  Generate report
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
