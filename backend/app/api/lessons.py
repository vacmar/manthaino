"""Per-node lesson chat + practice notes for the interactive tutor."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.auth import get_current_learner
from app.models.domain import Learner
from app.repository import state_repo

router = APIRouter(prefix="/lessons", tags=["Lessons"])


class LessonMessage(BaseModel):
    role: str
    content: str


class NotesPayload(BaseModel):
    practice_notes: str = Field(default="")


class MessagesReplacePayload(BaseModel):
    """Replace or append the full visible chat transcript for a node."""

    messages: list[LessonMessage] = Field(default_factory=list)
    replace: bool = True


@router.get("/me/{node_id}/session")
def get_lesson_session(node_id: str, learner: Learner = Depends(get_current_learner)):
    conv_id = state_repo.lesson_conversation_id(learner.learner_id, node_id)
    messages = state_repo.get_conversation(conv_id)
    notes = state_repo.get_lesson_notes(learner.learner_id, node_id)
    return {
        "node_id": node_id,
        "conversation_id": conv_id,
        "messages": messages,
        "practice_notes": notes,
    }


@router.put("/me/{node_id}/notes")
def save_lesson_notes(
    node_id: str,
    payload: NotesPayload,
    learner: Learner = Depends(get_current_learner),
):
    saved = state_repo.save_lesson_notes(
        learner.learner_id, node_id, payload.practice_notes or ""
    )
    return {"node_id": node_id, "practice_notes": saved, "saved": True}


@router.post("/me/{node_id}/messages")
def save_lesson_messages(
    node_id: str,
    payload: MessagesReplacePayload,
    learner: Learner = Depends(get_current_learner),
):
    conv_id = state_repo.lesson_conversation_id(learner.learner_id, node_id)
    now = datetime.now(UTC).isoformat()

    if payload.replace:
        state_repo.db.setdefault("conversations", {})[conv_id] = []

    for msg in payload.messages:
        if not msg.content or not msg.content.strip():
            continue
        if msg.content.strip() in {
            "Starting your AI lesson…",
            "Preparing your AI lesson…",
        }:
            continue
        state_repo.save_conversation_message(
            conv_id,
            {
                "role": msg.role,
                "content": msg.content,
                "created_at": now,
            },
        )

    return {
        "node_id": node_id,
        "conversation_id": conv_id,
        "message_count": len(state_repo.get_conversation(conv_id)),
    }
