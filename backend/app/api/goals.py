from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/goals", tags=["Goals"])

@router.post("/")
def create_goal():
    return {"message": "Not implemented"}

@router.get("/{goal_id}")
def get_goal(goal_id: str):
    return {"message": "Not implemented", "goal_id": goal_id}
