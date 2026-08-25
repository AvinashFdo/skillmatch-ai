"""
evaluate_extraction.py
-----------------------
Evaluates skill_extractor.py's accuracy against manually-verified
ground truth annotations (data/ground_truth_annotations.json), using
standard Precision/Recall/F1-Score metrics - the basis for this
project's Testing and Evaluation chapter.

Per-CV metrics show where extraction is strong or weak on a specific
profile. The overall score is micro-averaged (TP/FP/FN summed across
all CVs first, then the three metrics computed once on the totals) -
the standard approach for this kind of evaluation, since it weights
every individual skill decision equally rather than every CV equally
(a CV with many skills would otherwise be under-weighted relative to a
sparse one).

Matching between system output and ground truth is case-insensitive
(the dictionary/ground truth otherwise use consistent canonical
casing, e.g. "Node.js", but this avoids a trivial casing mismatch being
mistaken for a real extraction failure).

Run with: python evaluate_extraction.py (from ai-service/scripts/)
"""

import json
from pathlib import Path

from skill_extractor import extract_skills_from_file

DATA_DIR = Path(__file__).parent.parent / "data"
GROUND_TRUTH_PATH = DATA_DIR / "ground_truth_annotations.json"


def load_annotations() -> list:
    with open(GROUND_TRUTH_PATH, "r", encoding="utf-8") as f:
        return json.load(f)["annotations"]


def compute_metrics(tp: int, fp: int, fn: int) -> tuple:
    """Precision/Recall/F1 from raw counts. 0.0 when a denominator is 0
    (e.g. nothing extracted, or nothing in ground truth) rather than
    raising a ZeroDivisionError."""
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    return precision, recall, f1


def evaluate_cv(cv_path: Path, ground_truth_skills: list) -> dict:
    """Runs the real extractor against one CV and diffs it against that
    CV's ground truth, case-insensitively."""
    extraction = extract_skills_from_file(str(cv_path))
    system_skills = extraction["matched_skills"]

    # Map lowercased -> original casing, so TP/FP/FN can be reported
    # back using each side's own canonical spelling.
    system_lower = {s.lower(): s for s in system_skills}
    truth_lower = {s.lower(): s for s in ground_truth_skills}

    tp_keys = set(system_lower) & set(truth_lower)
    fp_keys = set(system_lower) - set(truth_lower)
    fn_keys = set(truth_lower) - set(system_lower)

    return {
        "tp": len(tp_keys),
        "fp": len(fp_keys),
        "fn": len(fn_keys),
        "false_positives": sorted(system_lower[k] for k in fp_keys),
        "false_negatives": sorted(truth_lower[k] for k in fn_keys),
    }


def print_table(rows: list, overall: dict) -> None:
    header = f"{'CV File':<32} {'TP':>4} {'FP':>4} {'FN':>4} {'Precision':>10} {'Recall':>8} {'F1':>8}"
    separator = "-" * len(header)

    print(separator)
    print(header)
    print(separator)

    for row in rows:
        print(
            f"{row['cv_file']:<32} {row['tp']:>4} {row['fp']:>4} {row['fn']:>4} "
            f"{row['precision']:>10.3f} {row['recall']:>8.3f} {row['f1']:>8.3f}"
        )

    print(separator)
    print(
        f"{'OVERALL (micro-averaged)':<32} {overall['tp']:>4} {overall['fp']:>4} {overall['fn']:>4} "
        f"{overall['precision']:>10.3f} {overall['recall']:>8.3f} {overall['f1']:>8.3f}"
    )
    print(separator)


def main():
    annotations = load_annotations()

    rows = []
    total_tp = total_fp = total_fn = 0
    missing_files = []

    for entry in annotations:
        cv_path = DATA_DIR / entry["cv_file"]

        if not cv_path.exists():
            missing_files.append(entry["cv_file"])
            continue

        metrics = evaluate_cv(cv_path, entry["ground_truth_skills"])
        precision, recall, f1 = compute_metrics(metrics["tp"], metrics["fp"], metrics["fn"])

        rows.append(
            {
                "cv_file": entry["cv_file"],
                "profile": entry["profile"],
                **metrics,
                "precision": precision,
                "recall": recall,
                "f1": f1,
            }
        )

        total_tp += metrics["tp"]
        total_fp += metrics["fp"]
        total_fn += metrics["fn"]

    if missing_files:
        print("=" * 70)
        print("WARNING: ground_truth_annotations.json references CV files that")
        print("were not found in ai-service/data/ - these were SKIPPED, not")
        print("counted as failures. Add the missing files to include them:")
        for name in missing_files:
            print(f"  - {name}")
        print("=" * 70)
        print()

    overall_precision, overall_recall, overall_f1 = compute_metrics(total_tp, total_fp, total_fn)
    overall = {
        "tp": total_tp,
        "fp": total_fp,
        "fn": total_fn,
        "precision": overall_precision,
        "recall": overall_recall,
        "f1": overall_f1,
    }

    print(f"SKILL EXTRACTION EVALUATION - {len(rows)} of {len(annotations)} CVs evaluated")
    print()
    print_table(rows, overall)

    # False negatives called out explicitly for the two CVs designed to
    # probe known limitations - this is the evidence trail for the
    # dissertation's limitations discussion.
    for target_file in ("sample_cv_6_uncommon_phrasing.txt", "sample_cv_7_sparse.txt"):
        row = next((r for r in rows if r["cv_file"] == target_file), None)
        if row is None:
            continue

        print()
        print(f"Missed ground-truth skills (False Negatives) for {target_file}")
        print(f"  Profile: {row['profile']}")
        if row["false_negatives"]:
            for skill in row["false_negatives"]:
                print(f"  - {skill}")
        else:
            print("  (none - every ground-truth skill was extracted)")


if __name__ == "__main__":
    main()
