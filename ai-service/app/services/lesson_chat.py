"""Conversational lesson tutor — ChatGPT-style, scoped to the active path node."""

from __future__ import annotations

import logging
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.core.llm import get_llm
from app.models.structured import ChatRequest, ChatResponse
from app.personas.prompts import LESSON_CHAT_SYSTEM_PROMPT

logger = logging.getLogger(__name__)


def _lesson_state_block(req: ChatRequest) -> str:
    ctx = req.lesson_context or {}
    current = ctx.get("current_node_title") or req.node_id or "Current lesson"
    upcoming = ctx.get("upcoming_nodes") or []
    completed = ctx.get("completed_nodes") or []
    goal = ctx.get("goal") or "their learning goal"
    lines = [
        f"Learner ID: {req.learner_id}",
        f"Goal: {goal}",
        f"CURRENT NODE (teach only this): {current}",
        f"Completed nodes: {', '.join(completed) if completed else 'none yet'}",
        f"Upcoming nodes (defer these topics): {', '.join(upcoming) if upcoming else 'none listed'}",
    ]
    return "\n".join(lines)


async def run_lesson_chat(req: ChatRequest) -> ChatResponse:
    """Reply in a live conversational lesson, grounded to the current node."""
    system = (
        f"{LESSON_CHAT_SYSTEM_PROMPT}\n\n"
        f"[LESSON SCOPE — AUTHORITATIVE]\n{_lesson_state_block(req)}"
    )
    messages: list[Any] = [SystemMessage(content=system)]

    for turn in (req.history or [])[-12:]:
        role = (turn.get("role") or "").lower()
        content = (turn.get("content") or "").strip()
        if not content:
            continue
        if role == "user":
            messages.append(HumanMessage(content=content))
        elif role == "assistant":
            messages.append(AIMessage(content=content))

    messages.append(HumanMessage(content=req.message))

    try:
        llm = get_llm(temperature=0.4)
        # Plain chat — no tool binding, so replies stay conversational
        response = await llm.ainvoke(messages)
        text = str(response.content or "").strip() or (
            "I'm here — tell me what part you'd like to go over again."
        )
        return ChatResponse(
            message=text,
            persona="tutor",
            structured={
                "content": text,
                "concept_focus": (req.lesson_context or {}).get(
                    "current_node_title", "Current lesson"
                ),
                "mode": "lesson_chat",
            },
            tool_calls=[],
        )
    except Exception as e:
        logger.warning("Lesson chat LLM failed: %s", e)
        current = (req.lesson_context or {}).get("current_node_title") or "this lesson"
        return ChatResponse(
            message=(
                f"I hit a temporary snag talking to the model. "
                f"While we reconnect, what specifically about {current} are you stuck on?"
            ),
            persona="tutor",
            structured={"content": "", "mode": "lesson_chat_fallback"},
            tool_calls=[],
        )
