from app.repository import state_repo
from app.models.domain import NodeStatus

def check_unlocks(path_id: str):
    # Iterate through all nodes in the path to see if any can be unlocked
    # A node unlocks if all mandatory prerequisites are COMPLETED
    for node_id, node in state_repo.db["nodes"].items():
        if node.path_id == path_id and node.status == NodeStatus.LOCKED:
            prereqs = state_repo.get_prerequisites(node.course_id)
            can_unlock = True
            for req_course_id in prereqs:
                if not state_repo.check_course_completed(req_course_id):
                    can_unlock = False
                    break
            
            if can_unlock:
                node.status = NodeStatus.UNLOCKED
                state_repo.update_node(node)
