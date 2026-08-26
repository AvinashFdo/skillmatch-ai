import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import useAnalysis from "../hooks/useAnalysis";
import { computeAnalysisStats } from "../utils/analysisStats";

const ROLE_PREVIEW_COUNT = 5;

/**
 * Overview/landing page - matches design_reference.html's actual
 * Dashboard (FIG 02) more precisely than the earlier version of this
 * page did. Re-reading the reference closely showed its Dashboard has
 * NO CV upload and NO profile form at all - just the 4 stat cards and a
 * role-fit preview; those two other things live on their own "CV &
 * Profile" page. Moved both of them out to CvProfilePage.jsx
 * accordingly - this page is now purely a summary + navigation hub:
 * the 4 stat cards, a top-5 role-fit preview (linking to the full
 * table on /roles), and links into the other pages.
 *
 * The reference's Dashboard also has "next actions"/"activity" widgets
 * that aren't reproduced here - explicitly out of scope per the task
 * that introduced this restructure, since they'd need new data this
 * app doesn't track (e.g. an actual activity log).
 */
export default function DashboardPage() {
  const { result, completedSkills, loading } = useAnalysis();
  const stats = computeAnalysisStats(result, completedSkills);
  const hasResult = Boolean(result);
  const roleFitPreview = (result?.role_fit || []).slice(0, ROLE_PREVIEW_COUNT);

  return (
    <div className="app-shell">
      <Sidebar active="Dashboard" />

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-heading">
            <div className="app-topbar-title">Dashboard</div>
            <div className="app-topbar-subtitle">Your career readiness at a glance</div>
          </div>
        </header>

        <div className="app-content">
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
              <p>
                Head to <Link to="/cv-profile">CV &amp; Profile</Link> to paste your CV text or upload a
                file and get your first readiness score.
              </p>
            </section>
          )}

          {!loading && hasResult && (
            <section className="data-table">
              <div className="data-table-head role-fit-table-row">
                <div>CAREER ROLE</div>
                <div>MATCHED</div>
                <div>ROLE-FIT SCORE</div>
                <div style={{ textAlign: "right" }}>GAPS</div>
              </div>
              {roleFitPreview.map((role, index) => (
                <div
                  className={`data-table-row role-fit-table-row ${index === 0 ? "data-table-row-lead" : ""}`}
                  key={role.role_id}
                >
                  <div>
                    {role.role_name}
                    {index === 0 && <span className="role-fit-target-badge">TARGET</span>}
                  </div>
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
                <span>
                  SHOWING {roleFitPreview.length} OF {result.role_fit.length} ROLES
                </span>
                <Link to="/roles">See all role matches</Link>
              </div>
            </section>
          )}

          {!loading && (
            <section className="card">
              <div className="card-title">Explore your results</div>
              <div className="dashboard-nav-links">
                <Link to="/cv-profile" className="btn">
                  CV &amp; Profile
                </Link>
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
        </div>
      </div>
    </div>
  );
}
