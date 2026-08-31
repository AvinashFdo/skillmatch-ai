const PRIORITY_SORT_ORDER = { high: 0, medium: 1, low: 2 };

// Re-injects completed-but-now-matched skills back into learning_order so their checkbox stays visible
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
  const topRole = roleFit[0];

  const learningOrderSkillNames = new Set(
    roadmap.learning_order.flatMap((group) => group.skills.map((s) => s.skill))
  );

  const requiredSkillEntries = [
    ...topRole.matched_skills.technical.map((s) => ({ ...s, category: "technical" })),
    ...topRole.matched_skills.soft.map((s) => ({ ...s, category: "soft" })),
    ...topRole.missing_skills.technical.map((s) => ({ ...s, category: "technical" })),
    ...topRole.missing_skills.soft.map((s) => ({ ...s, category: "soft" })),
  ];
  const carriedCompletedEntries = requiredSkillEntries.filter(
    (entry) => completedSkills.includes(entry.skill) && !learningOrderSkillNames.has(entry.skill)
  );

  const augmentedLearningOrder = roadmap.learning_order.map((group) => ({
    ...group,
    skills: [...group.skills],
  }));
  carriedCompletedEntries.forEach((entry) => {
    let group = augmentedLearningOrder.find((g) => g.priority === entry.priority);
    if (!group) {
      group = { priority: entry.priority, skills: [] };
      augmentedLearningOrder.push(group);
    }
    group.skills.push({ skill: entry.skill, category: entry.category });
  });
  augmentedLearningOrder.sort(
    (a, b) => PRIORITY_SORT_ORDER[a.priority] - PRIORITY_SORT_ORDER[b.priority]
  );
  const augmentedRoadmap = { ...roadmap, learning_order: augmentedLearningOrder };

  const allMissingSkills = augmentedLearningOrder.flatMap((group) =>
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
    roadmap: augmentedRoadmap,
    topRole,
  };
}

// coarse effort-by-priority proxy, not a measured value
const ESTIMATED_HOURS_BY_PRIORITY = { high: 8, medium: 5, low: 3 };

export function estimateRoadmapWeeks(allMissingSkills, completedSkills, studyHoursPerWeek) {
  if (!studyHoursPerWeek || studyHoursPerWeek <= 0) return null;

  const remaining = allMissingSkills.filter((s) => !completedSkills.includes(s.skill));
  if (remaining.length === 0) return null;

  const totalHours = remaining.reduce((sum, s) => sum + (ESTIMATED_HOURS_BY_PRIORITY[s.priority] || 5), 0);
  const weeks = Math.ceil(totalHours / studyHoursPerWeek);

  return { weeks, totalHours, remainingCount: remaining.length };
}
