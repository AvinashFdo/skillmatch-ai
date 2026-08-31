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
    return {"roles": fetch_all_roles()}


@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    cv_text = request.cv_text.strip()

    if not cv_text:
        raise HTTPException(status_code=400, detail="cv_text must not be empty.")

    try:
        return analyze_cv(cv_text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")


@app.post("/rescore")
def rescore(request: RescoreRequest):
    try:
        return rescore_skills(request.skills)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Rescoring failed: {exc}")


@app.post("/analyze-file")
async def analyze_file(file: UploadFile = File(...)):
    file_bytes = await file.read()

    try:
        extraction = extract_text_from_file(file.filename or "", file_bytes)
    except FileExtractionError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        result = analyze_cv(extraction["text"])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")

    result["page_count"] = extraction["page_count"]
    return result
