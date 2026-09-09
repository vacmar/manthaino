from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Optional
from app.models.domain import EvidenceSource, AssessmentResult
from app.services.verification import VerificationEngine
from app.api.learners import MOCK_LEARNER_SKILLS
from app.services.progression_service import process_verification
from app.core import config

router = APIRouter(prefix="/assessments", tags=["Assessments"])

class AssessmentSubmission(BaseModel):
    node_id: str
    assessment_id: str # Maps to evidence_id
    attempt_id: str
    learner_id: str
    skill_id: str
    assessment_score: float = Field(..., ge=0.0, le=1.0)
    practical_score: Optional[float] = Field(None, ge=0.0, le=1.0)

@router.post("/start")
def start_assessment():
    return {"message": "Mock assessment generated. Submit answers to /answer."}

@router.post("/{assessment_id}/answer")
def submit_answer(assessment_id: str, request: AssessmentSubmission):
    if request.learner_id not in MOCK_LEARNER_SKILLS or request.skill_id not in MOCK_LEARNER_SKILLS[request.learner_id]:
        raise HTTPException(status_code=404, detail="Skill claim not found for learner.")
    
    learner_skill = MOCK_LEARNER_SKILLS[request.learner_id][request.skill_id]
    
    new_evidence = [
        EvidenceSource(
            evidence_id=request.assessment_id,
            attempt_id=request.attempt_id,
            source_type="ASSESSMENT", 
            score=request.assessment_score, 
            weight=config.VERIFICATION_WEIGHTS["ASSESSMENT"], 
            reliability=config.VERIFICATION_RELIABILITIES["ASSESSMENT"]
        )
    ]
    
    if request.practical_score is not None:
        new_evidence.append(
            EvidenceSource(
                evidence_id=request.assessment_id + "_prac",
                attempt_id=request.attempt_id + "_prac",
                source_type="PRACTICAL", 
                score=request.practical_score, 
                weight=config.VERIFICATION_WEIGHTS["PRACTICAL"], 
                reliability=config.VERIFICATION_RELIABILITIES["PRACTICAL"]
            )
        )
    
    result = VerificationEngine.verify_skill(learner_skill, new_evidence)
    
    # Progress node state
    try:
        progression_success = process_verification(
            node_id=request.node_id, 
            verification_result=result, 
            assessment_score=request.assessment_score, 
            practical_score=request.practical_score
        )
    except ValueError as e:
        # Atomic failure: If node mutation fails, return 400
        # Note: MOCK_LEARNER_SKILLS is in-memory so true rollback isn't possible,
        # but we follow existing error conventions.
        raise HTTPException(status_code=400, detail=str(e))
    
    return {
        "message": "Assessment processed",
        "assessment_id": assessment_id,
        "verification_result": result,
        "progression_success": progression_success
    }

@router.get("/{assessment_id}/result")
def get_assessment_result(assessment_id: str):
    return {"message": "Not implemented", "assessment_id": assessment_id}
