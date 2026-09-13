from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.repository import state_repo
from app.services import project_service

router = APIRouter(prefix="/projects", tags=["Projects"])


class ProjectSubmission(BaseModel):
    learner_id: str
    artifact: str


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
    requirements: list[RequirementEvaluation]
    skills_demonstrated: list[SkillDemonstration]
    strengths: list[str]
    improvements: list[str]


@router.get("/{project_id}")
def get_project(project_id: str):
    project = state_repo.get_project(project_id)
    if not project:
        # Auto-seed MVP project for UI testing
        project = {
            "title": "Build a Scalable Data Pipeline",
            "description": "Apply your Data Engineering knowledge to build a robust, fault-tolerant data pipeline.",
            "tasks": [
                {"id": 1, "title": "Setup infrastructure (AWS S3 & EC2)", "completed": True},
                {"id": 2, "title": "Deploy Apache Kafka", "completed": True},
                {"id": 3, "title": "Create Spark Streaming job", "completed": False},
                {"id": 4, "title": "Write unit and integration tests", "completed": False}
            ]
        }
        # Ideally we'd save this to state_repo, but since it's just a mock dict for now:
        return project
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
