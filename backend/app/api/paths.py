from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/paths", tags=["Paths"])

@router.post("/generate")
def generate_path():
    return {"message": "Not implemented"}

@router.get("/{path_id}")
def get_path(path_id: str):
    return {"message": "Not implemented", "path_id": path_id}

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
