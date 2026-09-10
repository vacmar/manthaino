from fastapi import APIRouter, HTTPException

from app.models.structured import ChatRequest, ChatResponse
from app.orchestrator.graph import orchestrator_graph

router = APIRouter(prefix="/chat", tags=["Chat & Personas"])


async def _run_persona(request: ChatRequest, persona: str) -> ChatResponse:
    try:
        init_state = {
            "messages": [],
            "persona": persona,
            "user_message": request.message,
            "learner_id": request.learner_id,
            "node_id": request.node_id,
            "conversation_id": request.conversation_id,
            "role_id": request.role_id,
            "project_id": request.project_id,
            "tool_calls_executed": [],
            "final_response": None,
            "structured_data": None,
            "loop_count": 0,
        }
        result = await orchestrator_graph.ainvoke(init_state)
        return ChatResponse(
            message=result.get("final_response") or "Response generated.",
            persona=persona,
            structured=result.get("structured_data"),
            tool_calls=result.get("tool_calls_executed", []),
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Agent orchestration failed: {e!s}")


@router.post("/tutor", response_model=ChatResponse)
async def chat_tutor(request: ChatRequest) -> ChatResponse:
    """Invoke the Adaptive AI Tutor persona for learning workspace dialogues."""
    return await _run_persona(request, "tutor")


@router.post("/pathway-explanation", response_model=ChatResponse)
async def chat_pathway(request: ChatRequest) -> ChatResponse:
    """Invoke the Pathway Reasoner to explain course orderings, prerequisites, and gap reductions."""
    return await _run_persona(request, "pathway_reasoner")


@router.post("/project-mentor", response_model=ChatResponse)
async def chat_mentor(request: ChatRequest) -> ChatResponse:
    """Invoke the Project Mentor to review milestones, evaluate code, and submit skill evidence."""
    return await _run_persona(request, "project_mentor")
