from fastapi import APIRouter, Depends
from pydantic import BaseModel
from datetime import datetime, UTC

from app.models.domain import Learner
from app.api.auth import get_current_learner
from app.repository import state_repo

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])

class OnboardingRequest(BaseModel):
    target_role_id: str
    target_domain: str | None = None
    goals: list[str] = []
    experience_level: str
    prior_experience: str | None = None
    known_skills: list[str] = []
    self_reported_proficiency: dict[str, float] = {}
    interests: list[str] = []
    learning_style: str | None = None
    weekly_time: int | None = None

@router.get("/")
def get_onboarding_options():
    # Return available options for the frontend wizard
    return {
        "roles": [
            {"id": "role_de", "title": "Data Engineer", "description": "Master scalable pipelines.", "icon": "Database"},
            {"id": "role_ai", "title": "AI Engineer", "description": "Build intelligent systems.", "icon": "BrainCircuit"},
            {"id": "role_be", "title": "Backend Developer", "description": "Create robust APIs.", "icon": "TerminalSquare"}
        ],
        "experience_levels": ["Beginner", "Intermediate", "Expert"]
    }

@router.post("/")
def save_onboarding(req: OnboardingRequest, learner: Learner = Depends(get_current_learner)):
    learner.target_role_id = req.target_role_id
    learner.target_domain = req.target_domain
    learner.goals = req.goals
    learner.experience_level = req.experience_level
    learner.prior_experience = req.prior_experience
    learner.known_skills = req.known_skills
    learner.self_reported_proficiency = req.self_reported_proficiency
    learner.interests = req.interests
    learner.learning_style = req.learning_style
    learner.weekly_time = req.weekly_time
    
    learner.onboarding_completed = True
    learner.onboarding_version = 1
    learner.onboarding_completed_at = datetime.now(UTC).isoformat()
    learner.updated_at = learner.onboarding_completed_at
    
    state_repo.update_learner(learner)
    
    # 5. Onboarding & Verification Engine Integration
    # The actual verification/skill gaps and path generation is done by the backend here or later
    # For now, trigger path generation
    try:
        from app.services import replanning_service

        state_repo.db.setdefault("learner_profiles", {})[learner.learner_id] = {
            "target_role": req.target_role_id
        }
        if not state_repo.get_active_path(learner.learner_id):
            replanning_service.generate_path_for_learner(
                learner.learner_id, req.target_role_id
            )
    except Exception as e:
        print(f"Failed to generate path: {e}")

    return {"message": "Onboarding completed successfully"}

