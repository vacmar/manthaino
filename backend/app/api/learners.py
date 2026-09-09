from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.models.domain import LearnerSkill
from typing import Dict, List

router = APIRouter(prefix="/learners", tags=["Learners"])

# In-memory mock database
MOCK_LEARNER_SKILLS: Dict[str, Dict[str, LearnerSkill]] = {}

class SkillClaimRequest(BaseModel):
    skill_id: str
    claimed_score: float

@router.get("/{learner_id}/profile")
def get_learner_profile(learner_id: str):
    if learner_id not in MOCK_LEARNER_SKILLS:
        return {"learner_id": learner_id, "skills": []}
    return {"learner_id": learner_id, "skills": list(MOCK_LEARNER_SKILLS[learner_id].values())}

@router.post("/{learner_id}/skills")
def add_learner_skills(learner_id: str, request: SkillClaimRequest):
    if learner_id not in MOCK_LEARNER_SKILLS:
        MOCK_LEARNER_SKILLS[learner_id] = {}
    
    skill = LearnerSkill(
        learner_id=learner_id,
        skill_id=request.skill_id,
        claimed_score=request.claimed_score
    )
    MOCK_LEARNER_SKILLS[learner_id][request.skill_id] = skill
    return {"message": "Skill claimed", "skill": skill}

@router.post("/{learner_id}/evidence")
def add_learner_evidence(learner_id: str):
    return {"message": "Not implemented", "learner_id": learner_id}

