import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import StepIndicator from "../components/StepIndicator";
import useAnalysis from "../hooks/useAnalysis";

/**
 * Page 3 of 4 - the role-fit table for all 4 roles (design_reference.html's
 * FIG 05 pattern), moved here from what used to be inline on the single
 * Dashboard page. The top row (index 0, highest fit_score_percent) is
 * the current recommended/target role - already sorted best-fit-first by
 * the AI service, and visually marked via the existing
 * data-table-row-lead class.
 */
export default function RolesPage() {
  const { result, loading } = useAnalysis();
  const roleFit = result?.role_fit || [];

  return (
    <div className="app-shell">
      <Sidebar active="Roles" />

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-heading">
            <div className="app-topbar-title">Role matches</div>
            <div className="app-topbar-subtitle">How you score against each entry-level IT role</div>
          </div>
          <StepIndicator current={3} />
        </header>

        <div className="app-content">
          {loading && <p>Loading...</p>}

          {!loading && !result && (
            <section className="card">
              <div className="card-title">No analysis yet</div>
              <p>
                Analyze a CV on the <Link to="/cv-profile">CV &amp; Profile</Link> page first to see your
                role matches.
              </p>
            </section>
          )}

          {!loading && result && (
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
                <span>SHOWING {roleFit.length} OF {roleFit.length} ROLES</span>
                <span>WEIGHTED SKILL MATCH BY PRIORITY</span>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
