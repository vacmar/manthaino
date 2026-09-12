from fastapi import APIRouter

router = APIRouter(prefix="/learners", tags=["Learners"])


@router.get("/{learner_id}/profile")
def get_learner_profile(learner_id: str):
    return {"message": "Not implemented", "learner_id": learner_id}


@router.post("/{learner_id}/skills")
def add_learner_skills(learner_id: str):
    return {"message": "Not implemented", "learner_id": learner_id}


@router.post("/{learner_id}/evidence")
def add_learner_evidence(learner_id: str):
    return {"message": "Not implemented", "learner_id": learner_id}
