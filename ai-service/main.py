"""
main.py
-------
FastAPI entry point for the SkillMatch AI microservice.

Endpoints:
    GET  /health   - liveness check
    GET  /roles    - full role dataset, read live from MongoDB
    POST /analyze  - runs the full pipeline (extract -> score -> roadmap)
                      on submitted CV text

Run locally with:
    uvicorn main:app --reload --port 8000

Run in production (e.g. Render) with:
    uvicorn main:app --host 0.0.0.0 --port $PORT
Render (and most PaaS hosts) inject the PORT env var and route external
traffic to it - binding to 0.0.0.0 (not the 127.0.0.1 default) is
required for the platform's proxy to reach the process at all.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from scripts.analyze_cv import analyze_cv
from scripts.roles_repository import fetch_all_roles

app = FastAPI(
    title="SkillMatch AI Service",
    description="NLP-based skill extraction, role-fit scoring, and roadmap generation.",
    version="1.0.0",
)

# Allow the local Node/Express backend and React dev server to call this
# service directly during development. Tightened to explicit origins
# rather than "*" since /analyze accepts arbitrary text input.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # React dev server (CRA/default)
        "http://localhost:5173",   # React dev server (Vite default)
        "http://localhost:5000",   # Node/Express dev server
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    cv_text: str = Field(..., description="Raw CV text to analyze.")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/roles")
def get_roles():
    """Returns the full role dataset (roles, skills, resources, projects)."""
    return {"roles": fetch_all_roles()}


@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    """
    Runs the full skill-extraction -> role-fit -> roadmap pipeline on the
    submitted CV text and returns the combined result.
    """
    cv_text = request.cv_text.strip()

    if not cv_text:
        raise HTTPException(status_code=400, detail="cv_text must not be empty.")

    try:
        return analyze_cv(cv_text)
    except Exception as exc:
        # Any unexpected pipeline failure (bad dataset, extraction error,
        # etc.) is surfaced as a 500 rather than crashing the process.
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")
