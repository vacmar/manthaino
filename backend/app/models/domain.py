from enum import Enum

from pydantic import BaseModel


class NodeStatus(str, Enum):
    LOCKED = "LOCKED"
    UNLOCKED = "UNLOCKED"
    IN_PROGRESS = "IN_PROGRESS"
    ASSESSMENT_READY = "ASSESSMENT_READY"
    REMEDIATION = "REMEDIATION"
    COMPLETED = "COMPLETED"
    REVIEW = "REVIEW"


class Learner(BaseModel):
    learner_id: str
    name: str


class Skill(BaseModel):
    skill_id: str
    name: str


class PathNode(BaseModel):
    node_id: str
    path_id: str
    course_id: str
    sequence_order: int
    status: NodeStatus = NodeStatus.LOCKED


class LearningPath(BaseModel):
    path_id: str
    learner_id: str
    version: int
    previous_path_id: str | None = None
    created_at: str
    is_active: bool
