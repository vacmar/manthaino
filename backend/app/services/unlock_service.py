from app.models.domain import NodeStatus
from app.repository import state_repo


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
            reasons.append(
                {
                    "prerequisite_skill": skill_id,
                    "required_proficiency": required,
                    "current_proficiency": current,
                    "status": "INSUFFICIENT_MASTERY",
                }
            )

    return reasons


def check_unlocks(learner_id: str, path_id: str) -> list[str]:
    """Unlock the next path node only after prior nodes in sequence are COMPLETED."""
    nodes = [
        n
        for n in state_repo.db["nodes"].values()
        if n.path_id == path_id
    ]
    nodes.sort(key=lambda n: n.sequence_order)

    unlocked_nodes: list[str] = []
    for index, node in enumerate(nodes):
        if node.status != NodeStatus.LOCKED:
            continue
        # Sequence gate: every earlier node must be completed
        prior = nodes[:index]
        if prior and not all(p.status == NodeStatus.COMPLETED for p in prior):
            continue
        # Also respect skill prerequisites when defined
        reasons = _evaluate_prereqs(learner_id, node.course_id)
        if reasons:
            continue
        node.status = NodeStatus.UNLOCKED
        state_repo.update_node(node)
        unlocked_nodes.append(node.node_id)
    return unlocked_nodes


def get_lock_explanation(learner_id: str, node_id: str) -> dict:
    """Returns structured reasons for why a node is locked."""
    node = state_repo.get_node(node_id)
    if not node:
        return {"locked": False, "reasons": []}

    reasons = _evaluate_prereqs(learner_id, node.course_id)
    path_nodes = state_repo.get_nodes_for_path(node.path_id)
    path_nodes.sort(key=lambda n: n.sequence_order)
    for prior in path_nodes:
        if prior.sequence_order >= node.sequence_order:
            break
        if prior.status != NodeStatus.COMPLETED:
            course = state_repo.db.get("courses", {}).get(prior.course_id, {})
            title = course.get("title", prior.course_id)
            reasons.append(
                {
                    "prerequisite_skill": prior.course_id,
                    "required_proficiency": 1.0,
                    "current_proficiency": 0.0,
                    "status": "PRIOR_NODE_INCOMPLETE",
                    "message": f"Complete “{title}” first",
                }
            )

    return {"locked": len(reasons) > 0 or node.status == NodeStatus.LOCKED, "reasons": reasons}


def get_next_recommended_node(learner_id: str, path_id: str) -> str | None:
    """Ranks eligible nodes using a dependency-aware scoring formula and skips completed nodes."""
    eligible_nodes = []

    for node_id, node in state_repo.db["nodes"].items():
        if node.path_id == path_id and node.status in [
            NodeStatus.UNLOCKED,
            NodeStatus.IN_PROGRESS,
        ]:
            eligible_nodes.append(node)

    if not eligible_nodes:
        return None

    # Dependency-aware scoring (mocked simple logic for MVP)
    # Higher sequence_order but prioritizing IN_PROGRESS over UNLOCKED
    best_node = None
    best_score: float = -1.0

    for node in eligible_nodes:
        score: float = 0.0

        # 0.35 * skill_gap_reduction (mock 1.0 for simplicity)
        score += 0.35 * 1.0

        # 0.15 * prerequisite_validity (if IN_PROGRESS, it's very valid to continue)
        if node.status == NodeStatus.IN_PROGRESS:
            score += 0.50

        # Tie-breaker: sequence order (prefer earlier nodes)
        score -= node.sequence_order * 0.01

        if score > best_score:
            best_score = score
            best_node = node.node_id

    return best_node
