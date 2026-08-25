/**
 * Renders the full analyze_cv() response: extracted skills, role-fit
 * scores for all 4 roles, and the recommended role's roadmap - plus a
 * checkbox per missing skill so the user can track progress, and a
 * readiness % computed from how many of the top role's missing skills
 * are marked complete.
 */
export default function AnalysisResults({ result, completedSkills, onToggleSkill }) {
  const { extracted_skills: extractedSkills, role_fit: roleFit, recommended_role: roadmap } = result;

  const allMissingSkills = roadmap.learning_order.flatMap((group) => group.skills);
  const completedCount = allMissingSkills.filter((s) => completedSkills.includes(s.skill)).length;
  const totalMissing = allMissingSkills.length;
  const readinessPercent = totalMissing === 0 ? 100 : Math.round((completedCount / totalMissing) * 100);

  return (
    <div className="results">
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
        <h2>Role Fit</h2>
        <div className="role-fit-list">
          {roleFit.map((role) => (
            <RoleFitBar key={role.role_id} role={role} />
          ))}
        </div>
      </section>

      <section>
        <h2>Recommended Role: {roadmap.role_name}</h2>
        <p className="readiness-summary">{roadmap.readiness_summary}</p>
        <p className="readiness-progress">
          Readiness: {readinessPercent}% ({completedCount} of {totalMissing} skills completed)
        </p>

        <h3>Learning Order</h3>
        {roadmap.learning_order.length === 0 ? (
          <p>No skill gaps for this role - you're fully matched.</p>
        ) : (
          roadmap.learning_order.map((group) => (
            <div className="priority-group" key={group.priority}>
              <h4 className={`priority-label priority-${group.priority}`}>
                {group.priority} priority
              </h4>
              <div className="tag-list">
                {group.skills.map((s) => {
                  const isDone = completedSkills.includes(s.skill);
                  return (
                    <label className="tag tag-missing skill-checkbox" key={s.skill}>
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => onToggleSkill(s.skill)}
                      />
                      <span className={isDone ? "skill-done" : ""}>
                        {s.skill} <em>({s.category})</em>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))
        )}

        <h3>Recommended Resources</h3>
        <ul>
          {roadmap.recommended_resources.map((r) => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noreferrer">
                {r.title}
              </a>
            </li>
          ))}
        </ul>

        <h3>Suggested Projects</h3>
        <ul>
          {roadmap.suggested_projects.map((project) => (
            <li key={project}>{project}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function RoleFitBar({ role }) {
  return (
    <div className="role-fit-row">
      <div className="role-fit-label">
        <span>{role.role_name}</span>
        <span>{role.fit_score_percent}%</span>
      </div>
      <div className="role-fit-track">
        <div
          className="role-fit-fill"
          style={{ width: `${role.fit_score_percent}%` }}
        />
      </div>
      <div className="role-fit-meta">
        {role.skills_matched_count} / {role.skills_required_count} skills matched
      </div>
    </div>
  );
}
