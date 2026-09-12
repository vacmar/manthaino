from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services import project_service
from app.repository import state_repo

router = APIRouter(prefix="/projects", tags=["Projects"])

class ProjectSubmission(BaseModel):
    learner_id: str
    artifact: str

from typing import List

class RequirementEvaluation(BaseModel):
    requirement_id: str
    status: str
    evidence: str

class SkillDemonstration(BaseModel):
    skill_id: str
    score: float
    confidence: float

class ProjectEvaluation(BaseModel):
    submission_id: str
    score: float
    passed: bool
    requirements: List[RequirementEvaluation]
    skills_demonstrated: List[SkillDemonstration]
    strengths: List[str]
    improvements: List[str]

@router.get("/{project_id}")
def get_project(project_id: str):
    project = state_repo.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"project_id": project_id, "project": project}

@router.post("/{project_id}/submit")
def submit_project(project_id: str, req: ProjectSubmission):
    try:
        res = project_service.submit_project(req.learner_id, project_id, req.artifact)
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{project_id}/evaluate")
def evaluate_project(project_id: str, req: ProjectEvaluation):
    try:
        # Pass the full structured req dictionary to the service
        res = project_service.evaluate_project(project_id, req.model_dump())
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
