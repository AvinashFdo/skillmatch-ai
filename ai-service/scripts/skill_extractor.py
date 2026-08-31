import re
from pathlib import Path

import spacy

from roles_repository import fetch_all_roles

nlp = spacy.load("en_core_web_sm")


def load_skill_dictionary():
    all_skills = set()
    for role in fetch_all_roles():
        for skill_entry in role["technical_skills"]:
            all_skills.add(skill_entry["skill"])
        for skill_entry in role["soft_skills"]:
            all_skills.add(skill_entry["skill"])

    return all_skills


def preprocess_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_skills(cv_text: str, skill_dictionary: set) -> dict:
    processed_text = preprocess_text(cv_text)

    matched_skills = []
    for skill in skill_dictionary:
        skill_lower = skill.lower()
        # Word-boundary-safe matching so 'react' doesn't match inside 'reaction'
        pattern = r"(?<![a-zA-Z0-9])" + re.escape(skill_lower) + r"(?![a-zA-Z0-9])"
        if re.search(pattern, processed_text):
            matched_skills.append(skill)

    return {
        "matched_skills": sorted(matched_skills),
        "total_dictionary_skills_checked": len(skill_dictionary),
    }


def extract_skills_from_file(file_path: str) -> dict:
    with open(file_path, "r", encoding="utf-8") as f:
        cv_text = f.read()

    skill_dict = load_skill_dictionary()
    result = extract_skills(cv_text, skill_dict)
    result["source_file"] = file_path
    return result


if __name__ == "__main__":
    sample_path = Path(__file__).parent.parent / "data" / "sample_cv_1.txt"
    output = extract_skills_from_file(str(sample_path))

    print("=" * 50)
    print("SKILL EXTRACTION TEST RESULT")
    print("=" * 50)
    print(f"Source file: {output['source_file']}")
    print(f"Dictionary skills checked: {output['total_dictionary_skills_checked']}")
    print(f"\nMatched skills ({len(output['matched_skills'])}):")
    for skill in output["matched_skills"]:
        print(f"  - {skill}")
