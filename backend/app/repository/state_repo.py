from .mock_db import db
from app.models.domain import PathNode

def get_node(node_id: str) -> PathNode:
    if node_id in db["nodes"]:
        return db["nodes"][node_id]
    return None

def update_node(node: PathNode):
    db["nodes"][node.node_id] = node

def get_prerequisites(course_id: str):
    return db["prerequisites"].get(course_id, [])

def check_course_completed(course_id: str) -> bool:
    # simple mock logic: if any node for this course is completed
    for node in db["nodes"].values():
        if node.course_id == course_id and node.status.value == "COMPLETED":
            return True
    return False
