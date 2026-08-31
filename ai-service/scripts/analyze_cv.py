import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from skill_extractor import load_skill_dictionary, extract_skills
from role_fit_scorer import load_career_roles, score_all_roles
from roadmap_generator import generate_roadmap

DATA_PATH = Path(__file__).parent.parent / "data" / "sample_cv_1.txt"


def rescore_skills(matched_skills: list) -> dict:
    roles = load_career_roles()
    role_fit_results = score_all_roles(matched_skills, roles)

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
    skill_dictionary = load_skill_dictionary()
    extraction = extract_skills(cv_text, skill_dictionary)
    matched_skills = extraction["matched_skills"]

    result = rescore_skills(matched_skills)
    result["word_count"] = len(cv_text.split())
    result["skill_dictionary_size"] = extraction["total_dictionary_skills_checked"]
    return result


def analyze_cv_file(file_path: str) -> dict:
    with open(file_path, "r", encoding="utf-8") as f:
        cv_text = f.read()
    return analyze_cv(cv_text)


if __name__ == "__main__":
    result = analyze_cv_file(str(DATA_PATH))
    print(json.dumps(result, indent=2))
