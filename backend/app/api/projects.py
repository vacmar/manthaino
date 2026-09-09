from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("/{project_id}")
def get_project(project_id: str):
    return {"message": "Not implemented", "project_id": project_id}

@router.post("/{project_id}/submit")
def submit_project(project_id: str):
    return {"message": "Not implemented", "project_id": project_id}

@router.post("/{project_id}/review")
def review_project(project_id: str):
    return {"message": "Not implemented", "project_id": project_id}
