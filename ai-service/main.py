"""
main.py
-------
FastAPI entry point for the SkillMatch AI microservice.

Endpoints:
    GET  /health        - liveness check
    GET  /roles         - full role dataset, read live from MongoDB
    POST /analyze       - runs the full pipeline (extract -> score ->
                           roadmap) on submitted CV text
    POST /analyze-file   - same pipeline, but takes an uploaded PDF/DOCX
                           file instead of raw text

Run locally with:
    uvicorn main:app --reload --port 8000

Run in production (e.g. Render) with:
    uvicorn main:app --host 0.0.0.0 --port $PORT
Render (and most PaaS hosts) inject the PORT env var and route external
traffic to it - binding to 0.0.0.0 (not the 127.0.0.1 default) is
required for the platform's proxy to reach the process at all.
"""

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from scripts.analyze_cv import analyze_cv, rescore_skills
from scripts.file_extractor import FileExtractionError, extract_text_from_file
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


class RescoreRequest(BaseModel):
    skills: list[str] = Field(..., description="Full updated list of matched skill names.")


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


@app.post("/rescore")
def rescore(request: RescoreRequest):
    """
    Re-runs role-fit scoring and roadmap generation for an already-known
    skill list (no text extraction). Used by the backend's /cv/correction
    route to fold a manually-added skill into an existing analysis's
    Role Matches/Roadmap without needing the original CV text, which the
    backend never persists.
    """
    if not request.skills:
        raise HTTPException(status_code=400, detail="skills must not be empty.")

    try:
        return rescore_skills(request.skills)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Rescoring failed: {exc}")


@app.post("/analyze-file")
async def analyze_file(file: UploadFile = File(...)):
    """
    Extracts plain text from an uploaded PDF/DOCX and runs it through
    the exact same analyze_cv() pipeline /analyze uses - no duplicated
    scoring/roadmap logic, just a different source of the raw CV text.
    """
    file_bytes = await file.read()

    try:
        extraction = extract_text_from_file(file.filename or "", file_bytes)
    except FileExtractionError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        result = analyze_cv(extraction["text"])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")

    # page_count is only ever real for PDFs (None for DOCX - see
    # file_extractor.extract_text_from_docx) - merged in here rather
    # than inside analyze_cv() since it's about the SOURCE FILE, not
    # the analysis pipeline itself, and analyze_cv() is also used by
    # the plain-text /analyze endpoint, which has no file/page concept
    # at all.
    result["page_count"] = extraction["page_count"]
    return result
