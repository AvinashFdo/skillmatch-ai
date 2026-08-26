/**
 * Derives the same readiness/progress numbers from an analysis result +
 * completedSkills that used to be computed once inline inside
 * AnalysisResults.jsx. Now shared because the Dashboard's overview stat
 * cards and the Roadmap page's progress display both need the identical
 * numbers computed from the same two inputs.
 */
export function computeAnalysisStats(result, completedSkills) {
  if (!result) {
    return {
      extractedSkills: [],
      totalExtracted: 0,
      allMissingSkills: [],
      totalMissing: 0,
      completedCount: 0,
      readinessPercent: 0,
      priorityCounts: { high: 0, medium: 0, low: 0 },
      roadmap: null,
      topRole: null,
    };
  }

  const { extracted_skills: extractedSkills, role_fit: roleFit, recommended_role: roadmap } = result;

  const allMissingSkills = roadmap.learning_order.flatMap((group) =>
    group.skills.map((s) => ({ ...s, priority: group.priority }))
  );
  const completedCount = allMissingSkills.filter((s) => completedSkills.includes(s.skill)).length;
  const totalMissing = allMissingSkills.length;
  const readinessPercent = totalMissing === 0 ? 100 : Math.round((completedCount / totalMissing) * 100);
  const priorityCounts = { high: 0, medium: 0, low: 0 };
  allMissingSkills.forEach((s) => {
    priorityCounts[s.priority] = (priorityCounts[s.priority] || 0) + 1;
  });

  return {
    extractedSkills,
    totalExtracted: extractedSkills.length,
    allMissingSkills,
    totalMissing,
    completedCount,
    readinessPercent,
    priorityCounts,
    roadmap,
    topRole: roleFit[0],
  };
}

// Estimated hours to learn a single skill, by priority tier. Deliberately
// a simple, coarse assumption rather than a precise model - there's no
// real per-skill effort data anywhere in this project (the dataset only
// carries high/medium/low priority, not learning-time estimates), so
// this ties estimated effort to priority as a reasonable proxy: higher-
// priority skills tend to be the more foundational/involved ones (e.g.
// "Responsive Design" vs. "Curiosity"), so they're weighted as taking
// longer. These numbers are a rough planning aid, not a precise
// prediction - documented here and in CLAUDE_LOG.md since it's an
// estimate, not a measured value.
const ESTIMATED_HOURS_BY_PRIORITY = { high: 8, medium: 5, low: 3 };

/**
 * Estimates how many weeks it would take to finish the remaining
 * (not-yet-completed) roadmap skills, given a study pace in
 * hours/week. Returns null if studyHoursPerWeek isn't set or there are
 * no remaining skills to estimate (nothing to show in either case - the
 * caller decides what to render for each).
 */
export function estimateRoadmapWeeks(allMissingSkills, completedSkills, studyHoursPerWeek) {
  if (!studyHoursPerWeek || studyHoursPerWeek <= 0) return null;

  const remaining = allMissingSkills.filter((s) => !completedSkills.includes(s.skill));
  if (remaining.length === 0) return null;

  const totalHours = remaining.reduce((sum, s) => sum + (ESTIMATED_HOURS_BY_PRIORITY[s.priority] || 5), 0);
  const weeks = Math.ceil(totalHours / studyHoursPerWeek);

  return { weeks, totalHours, remainingCount: remaining.length };
}
