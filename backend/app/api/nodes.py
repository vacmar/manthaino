from fastapi import APIRouter, HTTPException
from app.models.payloads import CompletionRequest
from app.services import progression_service

router = APIRouter(prefix="/nodes", tags=["Nodes"])

@router.get("/{node_id}")
def get_node(node_id: str):
    return {"message": "Not implemented", "node_id": node_id}

@router.post("/{node_id}/start")
def start_node(node_id: str):
    return {"message": "Not implemented", "node_id": node_id}

@router.get("/{node_id}/progress")
def get_node_progress(node_id: str):
    return {"message": "Not implemented", "node_id": node_id}

@router.post("/{node_id}/complete")
def complete_node(node_id: str, req: CompletionRequest):
    try:
        success = progression_service.attempt_completion(node_id, req)
        return {"success": success}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
