from app.models.domain import PathNode, NodeStatus
from app.models.payloads import CompletionRequest
from app.repository import state_repo
from app.services import unlock_service

def attempt_completion(node_id: str, req: CompletionRequest) -> bool:
    node = state_repo.get_node(node_id)
    if not node:
        raise ValueError("Node not found")
        
    # Rules: Assessment >= 80% and practical pass
    if req.assessment_score >= 80.0 and req.practical_pass:
        node.status = NodeStatus.COMPLETED
        state_repo.update_node(node)
        
        # Trigger unlock check for remaining path
        unlock_service.check_unlocks(node.path_id)
        return True
        
    node.status = NodeStatus.REMEDIATION
    state_repo.update_node(node)
    return False

def process_verification(node_id: str, verification_result: dict, assessment_score: float, practical_score: float = None) -> bool:
    """
    Integrates psychometric verification actions with the existing state machine.
    """
    node = state_repo.get_node(node_id)
    if not node:
        raise ValueError(f"Node {node_id} not found")
        
    action = verification_result.get("action")
    
    if action == "REMEDIATION":
        node.status = NodeStatus.REMEDIATION
        state_repo.update_node(node)
        return False
        
    # For ALIGNED, FAST_TRACK_PARTIAL, and FAST_TRACK_FULL
    # We explicitly reuse the existing `attempt_completion` semantics (which requires an 80% pass).
    req = CompletionRequest(
        assessment_score=assessment_score * 100, # Converting 0.0-1.0 to 0-100 for attempt_completion
        practical_pass=(practical_score is not None and practical_score >= 0.80)
    )
    
    return attempt_completion(node_id, req)
