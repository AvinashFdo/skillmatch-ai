"""
skill_extractor.py
------------------
Extracts technical and soft skills from CV text by matching against the
skill dictionary drawn from every role in MongoDB. Uses spaCy for text
preprocessing (tokenization, lemmatization) and simple phrase matching
against known skills.

Role data (and therefore the skill dictionary) now lives in MongoDB,
edited via the admin panel, rather than in the original
career_roles.json file - see roles_repository.py. This module is no
longer fully standalone: running its __main__ block now requires a
working MONGODB_URI, unlike before.
"""

import re
from pathlib import Path

import spacy

from roles_repository import fetch_all_roles

# Load spaCy's small English model once
nlp = spacy.load("en_core_web_sm")


def load_skill_dictionary():
    """
    Loads all technical and soft skills across all roles into a single
    de-duplicated set. This becomes our master 'known skills' vocabulary
    for extraction, regardless of which role the student targets later.
    """
    all_skills = set()
    for role in fetch_all_roles():
        for skill_entry in role["technical_skills"]:
            all_skills.add(skill_entry["skill"])
        for skill_entry in role["soft_skills"]:
            all_skills.add(skill_entry["skill"])

    return all_skills


def preprocess_text(text: str) -> str:
    """
    Basic text preprocessing: lowercase, remove excess whitespace.
    We keep punctuation minimal removal since some skills contain
    dots or plus signs (e.g. 'Node.js', 'C++').
    """
    text = text.lower()
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_skills(cv_text: str, skill_dictionary: set) -> dict:
    """
    Matches known skills from the dictionary against the CV text using
    simple case-insensitive substring/phrase matching.

    Returns a dict with:
      - matched_skills: list of skills found in the CV
      - unmatched_dictionary_skills: skills in our dictionary NOT found
        (useful for skill gap analysis later)
    """
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
    """
    Reads a .txt CV file and runs skill extraction.
    (PDF/DOCX support will be added once this core logic is verified.)
    """
    with open(file_path, "r", encoding="utf-8") as f:
        cv_text = f.read()

    skill_dict = load_skill_dictionary()
    result = extract_skills(cv_text, skill_dict)
    result["source_file"] = file_path
    return result


if __name__ == "__main__":
    # Quick manual test using our fictional sample CV
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
