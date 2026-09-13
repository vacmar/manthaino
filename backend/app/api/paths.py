from fastapi import APIRouter, Depends, HTTPException
from app.repository import state_repo
from app.api.auth import get_current_learner
from app.models.domain import Learner

router = APIRouter(prefix="/paths", tags=["Paths"])


@router.post("/generate")
def generate_path(learner: Learner = Depends(get_current_learner)):
    from app.services import replanning_service

    if learner.target_role_id:
        state_repo.db.setdefault("learner_profiles", {})[learner.learner_id] = {
            "target_role": learner.target_role_id
        }
    try:
        result = replanning_service.generate_path_for_learner(
            learner.learner_id, learner.target_role_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me/active")
def get_me_active_path(learner=Depends(get_current_learner)):
    learner_id = learner.learner_id
    path = state_repo.get_active_path(learner_id)
    if not path:
        raise HTTPException(
            status_code=404,
            detail="No active path found. Complete onboarding first.",
        )

    nodes = state_repo.get_nodes_for_path(path.path_id)
    return {
        "path_id": path.path_id,
        "nodes": nodes,
        "is_active": True,
        "goal": learner.goals[0] if learner.goals else "Personalized Pathway",
    }


@router.get("/{path_id}")
def get_path(path_id: str):
    path = state_repo.get_path(path_id)
    if not path:
        raise HTTPException(status_code=404, detail="Path not found")
    nodes = state_repo.get_nodes_for_path(path_id)
    return {
        "path_id": path.path_id,
        "learner_id": path.learner_id,
        "version": path.version,
        "is_active": path.is_active,
        "nodes": [n.model_dump() for n in nodes],
    }


from pydantic import BaseModel


class RegenerateRequest(BaseModel):
    learner_id: str


@router.post("/{path_id}/regenerate")
def regenerate_path(path_id: str, req: RegenerateRequest):
    from app.services import replanning_service

    try:
        res = replanning_service.regenerate_path(req.learner_id, path_id)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{path_id}/next-node")
def get_next_node(path_id: str, learner_id: str):
    from app.services import unlock_service

    next_node = unlock_service.get_next_recommended_node(learner_id, path_id)
    if not next_node:
        raise HTTPException(status_code=404, detail="No eligible next node found")
    return {"next_recommended_node": next_node}
