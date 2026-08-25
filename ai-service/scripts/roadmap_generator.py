"""
roadmap_generator.py
---------------------
Turns a role's missing_skills breakdown (from role_fit_scorer.py) into a
structured learning roadmap: what to learn first, what resources to use,
and what projects to build to demonstrate the closed skill gap.

This module has no dependency on how the missing skills were computed -
it only needs the role_id and a missing_skills dict of the shape produced
by role_fit_scorer.score_role()/score_all_roles():

    {
        "technical": [{"skill": str, "priority": "high"|"medium"|"low"}, ...],
        "soft": [{"skill": str, "priority": "high"|"medium"|"low"}, ...],
    }
"""

import json
from pathlib import Path

DATA_PATH = Path(__file__).parent.parent / "data" / "career_roles.json"

# Defines the learning order: high priority gaps should be tackled first.
PRIORITY_ORDER = ["high", "medium", "low"]


def load_role(role_id: str) -> dict:
    """Loads a single role definition from career_roles.json by role_id."""
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    for role in data["roles"]:
        if role["role_id"] == role_id:
            return role

    raise ValueError(f"Unknown role_id: {role_id}")


def _group_by_priority(missing_skills: dict) -> dict:
    """
    Merges technical + soft missing skills into one learning-order list
    per priority level. Each entry keeps its category so the dashboard
    can show whether a gap is technical or a soft skill.
    """
    grouped = {level: [] for level in PRIORITY_ORDER}

    for category in ("technical", "soft"):
        for entry in missing_skills.get(category, []):
            grouped[entry["priority"]].append(
                {"skill": entry["skill"], "category": category}
            )

    return grouped


def _build_readiness_summary(grouped: dict) -> str:
    """
    Builds a one-line, human-readable readiness summary, e.g.
    "You are missing 3 high priority skills, 2 medium priority skills,
    and 1 low priority skill for this role."
    """
    counts = {level: len(grouped[level]) for level in PRIORITY_ORDER}

    if sum(counts.values()) == 0:
        return "You already meet all required skills for this role."

    parts = [
        f"{counts[level]} {level} priority skill{'s' if counts[level] != 1 else ''}"
        for level in PRIORITY_ORDER
        if counts[level] > 0
    ]

    if len(parts) == 1:
        joined = parts[0]
    elif len(parts) == 2:
        joined = f"{parts[0]} and {parts[1]}"
    else:
        joined = ", ".join(parts[:-1]) + f", and {parts[-1]}"

    return f"You are missing {joined} for this role."


def generate_roadmap(role_id: str, missing_skills: dict, role: dict = None) -> dict:
    """
    Builds the full roadmap for a target role.

    Args:
        role_id: the target role's id, e.g. "frontend_developer".
        missing_skills: the missing_skills dict for this role, as
            returned by role_fit_scorer.score_role().
        role: optional pre-loaded role dict (avoids re-reading the JSON
            file if the caller already has it, e.g. from analyze_cv.py).

    Returns a JSON-serialisable roadmap dict.
    """
    if role is None:
        role = load_role(role_id)

    grouped = _group_by_priority(missing_skills)

    learning_order = [
        {"priority": level, "skills": grouped[level]}
        for level in PRIORITY_ORDER
        if grouped[level]
    ]

    return {
        "role_id": role["role_id"],
        "role_name": role["role_name"],
        "readiness_summary": _build_readiness_summary(grouped),
        "learning_order": learning_order,
        "recommended_resources": role["learning_resources"],
        "suggested_projects": role["portfolio_projects"],
    }


if __name__ == "__main__":
    # Manual end-to-end test: extract -> score -> generate roadmap for
    # the frontend_developer role using the sample CV.
    from skill_extractor import extract_skills_from_file
    from role_fit_scorer import score_role

    sample_path = Path(__file__).parent.parent / "data" / "sample_cv_1.txt"
    extraction = extract_skills_from_file(str(sample_path))

    target_role_id = "frontend_developer"
    role = load_role(target_role_id)
    fit_result = score_role(extraction["matched_skills"], role)

    roadmap = generate_roadmap(target_role_id, fit_result["missing_skills"], role)

    print(json.dumps(roadmap, indent=2))
