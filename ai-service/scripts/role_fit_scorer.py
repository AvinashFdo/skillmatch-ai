"""
role_fit_scorer.py
-------------------
Takes the skills extracted by skill_extractor.py and scores how well a
candidate fits each of the 4 supported career roles defined in
career_roles.json.

Scoring approach (weighted priority matching):
    Each required skill (technical or soft) carries a priority of
    "high", "medium", or "low". These map to numeric weights so that
    matching a "high" priority skill contributes more to the fit score
    than matching a "low" priority one.

    fit_score = (sum of weights of matched required skills)
                / (sum of weights of all required skills for the role)
                * 100

Missing skills are the required skills NOT found in the candidate's
extracted skill list. They are returned grouped by category
(technical/soft) and sorted with higher-priority gaps first, since
those are the most impactful for the candidate to close.

This module has no dependency on skill_extractor.py's internals - it
only needs a list/set of matched skill names - so it can be wired into
a FastAPI endpoint independently.
"""

import json
from pathlib import Path

DATA_PATH = Path(__file__).parent.parent / "data" / "career_roles.json"

# Numeric weight assigned to each priority level. Used both for scoring
# and for ranking missing skills (higher weight = more important gap).
PRIORITY_WEIGHTS = {"high": 3, "medium": 2, "low": 1}


def load_career_roles() -> list:
    """Loads the list of role definitions from career_roles.json."""
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["roles"]


def _score_category(matched_lower: set, skill_entries: list) -> dict:
    """
    Scores a single skill category (technical or soft) for one role.

    Args:
        matched_lower: set of the candidate's matched skills, lowercased.
        skill_entries: list of {"skill": str, "priority": str} dicts
            from the role definition for this category.

    Returns a dict with the achieved/possible weight totals plus the
    matched and missing skill entries (missing sorted by priority desc).
    """
    matched = []
    missing = []
    achieved_weight = 0
    possible_weight = 0

    for entry in skill_entries:
        weight = PRIORITY_WEIGHTS[entry["priority"]]
        possible_weight += weight

        if entry["skill"].lower() in matched_lower:
            achieved_weight += weight
            matched.append(entry)
        else:
            missing.append(entry)

    # Rank missing skills so the highest-priority gaps appear first -
    # this ordering drives the roadmap recommendation step later.
    missing.sort(key=lambda e: PRIORITY_WEIGHTS[e["priority"]], reverse=True)

    return {
        "matched": matched,
        "missing": missing,
        "achieved_weight": achieved_weight,
        "possible_weight": possible_weight,
    }


def score_role(matched_skills, role: dict) -> dict:
    """
    Scores a candidate's fit against a single role.

    Args:
        matched_skills: iterable of skill name strings the candidate has
            (as produced by skill_extractor.extract_skills).
        role: one role dict from career_roles.json.

    Returns a JSON-serialisable dict describing the fit score and the
    skill gap breakdown for this role.
    """
    matched_lower = {s.lower() for s in matched_skills}

    technical = _score_category(matched_lower, role["technical_skills"])
    soft = _score_category(matched_lower, role["soft_skills"])

    total_achieved = technical["achieved_weight"] + soft["achieved_weight"]
    total_possible = technical["possible_weight"] + soft["possible_weight"]
    fit_score_percent = (
        round((total_achieved / total_possible) * 100, 1) if total_possible else 0.0
    )

    return {
        "role_id": role["role_id"],
        "role_name": role["role_name"],
        "fit_score_percent": fit_score_percent,
        "skills_matched_count": len(technical["matched"]) + len(soft["matched"]),
        "skills_required_count": len(role["technical_skills"]) + len(role["soft_skills"]),
        "matched_skills": {
            "technical": technical["matched"],
            "soft": soft["matched"],
        },
        "missing_skills": {
            "technical": technical["missing"],
            "soft": soft["missing"],
        },
    }


def score_all_roles(matched_skills, roles: list = None) -> list:
    """
    Scores a candidate against every role, sorted best-fit first.
    This is the shape that will be returned by the FastAPI endpoint.
    """
    if roles is None:
        roles = load_career_roles()

    results = [score_role(matched_skills, role) for role in roles]
    results.sort(key=lambda r: r["fit_score_percent"], reverse=True)
    return results


if __name__ == "__main__":
    # Manual end-to-end test: extract skills from the sample CV, then
    # score that skill set against all 4 roles.
    from skill_extractor import extract_skills_from_file

    sample_path = Path(__file__).parent.parent / "data" / "sample_cv_1.txt"
    extraction = extract_skills_from_file(str(sample_path))

    results = score_all_roles(extraction["matched_skills"])

    print(json.dumps(results, indent=2))
