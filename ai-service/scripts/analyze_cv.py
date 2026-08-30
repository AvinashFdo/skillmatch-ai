"""
analyze_cv.py
-------------
Orchestrator that chains the full SkillMatch AI pipeline:

    CV text -> skill extraction -> role-fit scoring (all 4 roles)
            -> roadmap generation for the best-fit role

Exposes a single importable function, analyze_cv(), which is the
function the FastAPI endpoint will call directly. Nothing in this
module prints or reads files other than career_roles.json - CV text is
passed in by the caller, who is responsible for reading the upload.
"""

import json
import sys
from pathlib import Path

# Ensure sibling modules resolve whether this file is run directly
# (python analyze_cv.py) or imported as a package (scripts.analyze_cv,
# as done by ../main.py for the FastAPI app).
sys.path.insert(0, str(Path(__file__).parent))

from skill_extractor import load_skill_dictionary, extract_skills
from role_fit_scorer import load_career_roles, score_all_roles
from roadmap_generator import generate_roadmap

DATA_PATH = Path(__file__).parent.parent / "data" / "sample_cv_1.txt"


def rescore_skills(matched_skills: list) -> dict:
    """
    Re-runs role-fit scoring and roadmap generation for an already-known
    skill list, without re-extracting from CV text. Split out of
    analyze_cv() so a manually-added correction skill (see
    backend/src/routes/cv.js's /correction route) can be folded into an
    existing analysis's extracted_skills and have Role Matches/Roadmap
    recomputed against it, without needing the original CV text at all -
    which the backend doesn't even have (cv_text is never persisted, by
    design).

    Args:
        matched_skills: full list of skill name strings the candidate
            has - both originally-extracted and manually-added.

    Returns:
        dict with the same "extracted_skills"/"role_fit"/
        "recommended_role" shape analyze_cv() returns (minus the
        text-extraction-specific word_count/skill_dictionary_size,
        which have no meaning here since no text was involved).
    """
    roles = load_career_roles()
    role_fit_results = score_all_roles(matched_skills, roles)

    # role_fit_results is sorted best-fit first (see role_fit_scorer.score_all_roles)
    top_result = role_fit_results[0]
    top_role = next(r for r in roles if r["role_id"] == top_result["role_id"])

    roadmap = generate_roadmap(
        top_result["role_id"], top_result["missing_skills"], role=top_role
    )

    return {
        "extracted_skills": matched_skills,
        "role_fit": role_fit_results,
        "recommended_role": roadmap,
    }


def analyze_cv(cv_text: str) -> dict:
    """
    Runs the full pipeline on raw CV text and returns one combined
    JSON-serialisable result:

        {
            "extracted_skills": [...],
            "role_fit": [ ... all 4 roles, best-fit first ... ],
            "recommended_role": { ...roadmap for the top-scoring role... }
        }

    Args:
        cv_text: raw text content of the candidate's CV.

    Returns:
        dict combining extraction, scoring, and roadmap results.
    """
    skill_dictionary = load_skill_dictionary()
    extraction = extract_skills(cv_text, skill_dictionary)
    matched_skills = extraction["matched_skills"]

    result = rescore_skills(matched_skills)
    # Real pipeline numbers for the frontend's "honest pipeline
    # breakdown" display (CV & Profile page) - word_count is of whatever
    # text was actually analyzed (pasted or extracted from a file, the
    # caller doesn't need to distinguish here since cv_text is already
    # just a string either way), and skill_dictionary_size is
    # extraction["total_dictionary_skills_checked"] under a clearer name
    # for API consumers outside this module.
    result["word_count"] = len(cv_text.split())
    result["skill_dictionary_size"] = extraction["total_dictionary_skills_checked"]
    return result


def analyze_cv_file(file_path: str) -> dict:
    """Convenience wrapper: reads a .txt CV file and runs analyze_cv()."""
    with open(file_path, "r", encoding="utf-8") as f:
        cv_text = f.read()
    return analyze_cv(cv_text)


if __name__ == "__main__":
    # Manual end-to-end test using the fictional sample CV.
    result = analyze_cv_file(str(DATA_PATH))
    print(json.dumps(result, indent=2))
