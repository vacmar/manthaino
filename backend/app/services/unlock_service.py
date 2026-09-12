from app.repository import state_repo
from app.models.domain import NodeStatus

def _evaluate_prereqs(learner_id: str, course_id: str) -> list:
    """Returns a list of structured lock reasons if prerequisites are unmet."""
    prereqs = state_repo.get_prerequisites(course_id)
    reasons = []
    
    for req in prereqs:
        skill_id = req["skill_id"]
        required = req["required_proficiency"]
        
        prof = state_repo.get_learner_proficiency(learner_id, skill_id)
        current = prof["proficiency"]
        
        if current < required:
            reasons.append({
                "prerequisite_skill": skill_id,
                "required_proficiency": required,
                "current_proficiency": current,
                "status": "INSUFFICIENT_MASTERY"
            })
            
    return reasons

def check_unlocks(learner_id: str, path_id: str) -> list[str]:
    """Evaluates locks and returns a list of newly unlocked node IDs."""
    unlocked_nodes = []
    for node_id, node in state_repo.db["nodes"].items():
        if node.path_id == path_id and node.status == NodeStatus.LOCKED:
            reasons = _evaluate_prereqs(learner_id, node.course_id)
            if not reasons:
                node.status = NodeStatus.UNLOCKED
                state_repo.update_node(node)
                unlocked_nodes.append(node_id)
    return unlocked_nodes

def get_lock_explanation(learner_id: str, node_id: str) -> dict:
    """Returns structured reasons for why a node is locked."""
    node = state_repo.get_node(node_id)
    if not node:
        return {"locked": False, "reasons": []}
        
    reasons = _evaluate_prereqs(learner_id, node.course_id)
    return {
        "locked": len(reasons) > 0,
        "reasons": reasons
    }

def get_next_recommended_node(learner_id: str, path_id: str) -> str:
    """Ranks eligible nodes using a dependency-aware scoring formula and skips completed nodes."""
    eligible_nodes = []
    
    for node_id, node in state_repo.db["nodes"].items():
        if node.path_id == path_id and node.status in [NodeStatus.UNLOCKED, NodeStatus.IN_PROGRESS]:
            eligible_nodes.append(node)
            
    if not eligible_nodes:
        return None
        
    # Dependency-aware scoring (mocked simple logic for MVP)
    # Higher sequence_order but prioritizing IN_PROGRESS over UNLOCKED
    best_node = None
    best_score = -1
    
    for node in eligible_nodes:
        score = 0
        
        # 0.35 * skill_gap_reduction (mock 1.0 for simplicity)
        score += 0.35 * 1.0
        
        # 0.15 * prerequisite_validity (if IN_PROGRESS, it's very valid to continue)
        if node.status == NodeStatus.IN_PROGRESS:
            score += 0.50
            
        # Tie-breaker: sequence order (prefer earlier nodes)
        score -= (node.sequence_order * 0.01)
        
        if score > best_score:
            best_score = score
            best_node = node.node_id
            
    return best_node
