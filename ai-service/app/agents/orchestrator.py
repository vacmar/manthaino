from langchain_openai import ChatOpenAI
from app.tools.path_tools import get_skill_gaps, get_candidate_paths
from app.context.context_builder import build_learner_context
from app.models.structured_outputs import PathRecommendation

# For local MVP testing without an API key, we mock the orchestrator response.
def run_orchestration(learner_id: str, query: str) -> dict:
    context = build_learner_context(learner_id)
    gaps = get_skill_gaps.invoke({"learner_id": learner_id})
    paths = get_candidate_paths.invoke({"learner_id": learner_id})
    
    # Mocking a structured LLM response
    return {
        "context_used": context,
        "tools_called": ["get_skill_gaps", "get_candidate_paths"],
        "recommendation": PathRecommendation(
            recommended_node_id="course_101",
            reasoning=f"Based on gaps ({gaps}), {paths} is the best next step."
        ).model_dump()
    }
