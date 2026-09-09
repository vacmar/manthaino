from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/conversations", tags=["Conversations"])

@router.get("/{conversation_id}")
def get_conversation(conversation_id: str):
    return {"message": "Not implemented", "conversation_id": conversation_id}

@router.post("/{conversation_id}/messages")
def add_message(conversation_id: str):
    return {"message": "Not implemented", "conversation_id": conversation_id}
