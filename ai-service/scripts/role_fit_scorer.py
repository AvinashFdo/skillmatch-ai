import json
from pathlib import Path

from roles_repository import fetch_all_roles

# Priority-to-weight mapping used by the AI service's scoring formula
PRIORITY_WEIGHTS = {"high": 3, "medium": 2, "low": 1}


def load_career_roles() -> list:
    return fetch_all_roles()


def _score_category(matched_lower: set, skill_entries: list) -> dict:
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

    missing.sort(key=lambda e: PRIORITY_WEIGHTS[e["priority"]], reverse=True)

    return {
        "matched": matched,
        "missing": missing,
        "achieved_weight": achieved_weight,
        "possible_weight": possible_weight,
    }


def score_role(matched_skills, role: dict) -> dict:
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
    if roles is None:
        roles = load_career_roles()

    results = [score_role(matched_skills, role) for role in roles]
    results.sort(key=lambda r: r["fit_score_percent"], reverse=True)
    return results


if __name__ == "__main__":
    from skill_extractor import extract_skills_from_file

    sample_path = Path(__file__).parent.parent / "data" / "sample_cv_1.txt"
    extraction = extract_skills_from_file(str(sample_path))

    results = score_all_roles(extraction["matched_skills"])

    print(json.dumps(results, indent=2))
