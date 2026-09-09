from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

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

class ProficiencyLevel(str, Enum):
    NONE = "NONE"
    BEGINNER = "BEGINNER"
    BASIC = "BASIC"
    INTERMEDIATE = "INTERMEDIATE"
    ADVANCED = "ADVANCED"
    EXPERT = "EXPERT"

class EvidenceSource(BaseModel):
    evidence_id: str
    attempt_id: str
    source_type: str # "ASSESSMENT", "PRACTICAL", "COURSEWORK", "EXTERNAL"
    score: float = Field(..., ge=0.0, le=1.0)
    weight: float = Field(..., ge=0.0, le=1.0)
    reliability: float = Field(1.0, ge=0.0, le=1.0)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    details: Optional[str] = None

class LearnerSkill(BaseModel):
    learner_id: str
    skill_id: str
    claimed_score: float = Field(..., ge=0.0, le=1.0)
    verified_score: float = Field(0.0, ge=0.0, le=1.0)
    coverage: float = Field(0.0, ge=0.0, le=1.0)
    evidence_sources: List[EvidenceSource] = Field(default_factory=list)
    last_assessed: Optional[datetime] = None
    
class AssessmentResult(BaseModel):
    assessment_id: str
    skill_id: str
    learner_id: str
    score: float = Field(..., ge=0.0, le=1.0)
    practical_score: float = Field(0.0, ge=0.0, le=1.0)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
