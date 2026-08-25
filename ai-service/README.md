# SkillMatch AI — AI/NLP Service

FastAPI microservice providing CV skill extraction, role-fit scoring, and
roadmap generation for the SkillMatch AI dissertation project.

## Setup

```bash
cd ai-service
python -m venv venv
source venv/Scripts/activate   # Windows Git Bash; use venv\Scripts\activate on cmd
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

## Running

```bash
uvicorn main:app --reload --port 8000
```

Interactive API docs are then available at `http://localhost:8000/docs`.

## Endpoints

| Method | Path       | Description                                              |
|--------|------------|-----------------------------------------------------------|
| GET    | `/health`  | Liveness check — `{"status": "ok"}`                       |
| GET    | `/roles`   | Full `data/career_roles.json` content                     |
| POST   | `/analyze` | Runs the full pipeline on `{"cv_text": "..."}` CV text    |

### `POST /analyze` example

Request:
```json
{ "cv_text": "..." }
```

Response shape:
```json
{
  "extracted_skills": ["..."],
  "role_fit": [ /* all 4 roles, best-fit first */ ],
  "recommended_role": {
    "role_id": "...",
    "role_name": "...",
    "readiness_summary": "...",
    "learning_order": [ /* grouped by priority */ ],
    "recommended_resources": [ /* from career_roles.json */ ],
    "suggested_projects": [ /* from career_roles.json */ ]
  }
}
```

## Project structure

```
ai-service/
  data/
    career_roles.json      # 4 supported roles, skills, resources, projects
    sample_cv_1.txt         # fictional test CV (ethics-approved, no real data)
  scripts/
    skill_extractor.py      # spaCy + regex skill extraction
    role_fit_scorer.py      # weighted priority scoring per role
    roadmap_generator.py    # missing-skill roadmap for one role
    analyze_cv.py           # orchestrates the full pipeline
  main.py                   # FastAPI app
  requirements.txt
```

## Notes

- Only fictional/simulated CV data is used in this project, per ethics
  approval — see `data/sample_cv_1.txt`.
- CORS is enabled for local React (`:3000`, `:5173`) and Node/Express
  (`:5000`) dev servers only, not `*`.
