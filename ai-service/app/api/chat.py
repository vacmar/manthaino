from fastapi import APIRouter
from pydantic import BaseModel
from app.agents.orchestrator import run_orchestration

router = APIRouter(prefix="/ai", tags=["AI Orchestration"])

class OrchestrationRequest(BaseModel):
    learner_id: str
    query: str

@router.post("/orchestrate")
def orchestrate(req: OrchestrationRequest):
    result = run_orchestration(req.learner_id, req.query)
    return result
