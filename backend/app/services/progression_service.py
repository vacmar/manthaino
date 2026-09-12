from app.models.domain import PathNode, NodeStatus
from app.models.payloads import CompletionRequest
from app.repository import state_repo
from app.services import unlock_service
from app.services.cache_service import invalidate_node_cache

def attempt_completion(node_id: str, req: CompletionRequest) -> bool:
    node = state_repo.get_node(node_id)
    if not node:
        raise ValueError("Node not found")
        
    # Rules: Assessment >= 80% and practical pass
    if req.assessment_score >= 80.0 and req.practical_pass:
        node.status = NodeStatus.COMPLETED
        state_repo.update_node(node)
        
        # Trigger cache invalidate (After DB commit)
        invalidate_node_cache(
            node_id=node_id, 
            conversation_id=f"conv_{node_id}", 
            assessment_id=f"assess_{node_id}"
        )
        
        # Trigger unlock check for remaining path
        unlock_service.check_unlocks(node.path_id)
        return True
        
    node.status = NodeStatus.REMEDIATION
    state_repo.update_node(node)
    return False
