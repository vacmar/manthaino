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

# --- Conversations ---
def get_conversation(conversation_id: str) -> list:
    """Read full conversation from DB"""
    return db["conversations"].get(conversation_id, [])

def save_conversation_message(conversation_id: str, message: dict):
    """Write message durably to DB"""
    if conversation_id not in db["conversations"]:
        db["conversations"][conversation_id] = []
    db["conversations"][conversation_id].append(message)

def get_conversation_summary(conversation_id: str) -> str:
    """Read durable summary"""
    return db.get("summaries", {}).get(conversation_id, "No summary available.")

def save_conversation_summary(conversation_id: str, summary: str):
    """Write durable summary"""
    if "summaries" not in db:
        db["summaries"] = {}
    db["summaries"][conversation_id] = summary

# --- Assessments ---
def get_assessment(assessment_id: str) -> dict:
    """Read final assessment result from DB"""
    return db["assessments"].get(assessment_id)

def save_assessment_result(assessment_id: str, state: dict):
    """Write final assessment durably to DB"""
    db["assessments"][assessment_id] = state

# --- Lessons & Context ---
def get_node_context(node_id: str) -> dict:
    """Read structured pedagogical context for a node."""
    return db["lessons"].get(node_id, {})

# --- Mistakes ---
def record_mistake(learner_id: str, node_id: str, concept: str, description: str, timestamp: str):
    """Record a mistake durably."""
    key = f"{learner_id}:{node_id}"
    if key not in db["mistakes"]:
        db["mistakes"][key] = []
    
    db["mistakes"][key].append({
        "learner_id": learner_id,
        "node_id": node_id,
        "concept": concept,
        "description": description,
        "timestamp": timestamp
    })

def get_mistakes(learner_id: str, node_id: str) -> list:
    """Retrieve mistakes for weak concept aggregation."""
    key = f"{learner_id}:{node_id}"
    return db["mistakes"].get(key, [])

# --- Progression & Skills ---
def get_course_skills(course_id: str) -> list:
    """Get the skills taught by a course."""
    return db["course_skills"].get(course_id, [])

def get_learner_proficiency(learner_id: str, skill_id: str) -> dict:
    """Get calculated proficiency for a learner's skill."""
    key = f"{learner_id}:{skill_id}"
    return db["proficiency"].get(key, {"learner_id": learner_id, "skill_id": skill_id, "proficiency": 0.0, "confidence": 0.0})

def update_learner_proficiency(learner_id: str, skill_id: str, proficiency: float, confidence: float):
    """Save calculated proficiency."""
    key = f"{learner_id}:{skill_id}"
    db["proficiency"][key] = {
        "learner_id": learner_id,
        "skill_id": skill_id,
        "proficiency": proficiency,
        "confidence": confidence
    }

def record_skill_evidence(learner_id: str, skill_id: str, source_type: str, source_id: str, score: float, confidence: float, timestamp: str):
    """Durably record evidence for a skill. Enforces idempotency per source."""
    key = f"{learner_id}:{skill_id}:{source_type}:{source_id}"
    db["evidence"][key] = {
        "learner_id": learner_id,
        "skill_id": skill_id,
        "source_type": source_type,
        "source_id": source_id,
        "score": score,
        "confidence": confidence,
        "timestamp": timestamp
    }

def get_skill_evidence(learner_id: str, skill_id: str) -> list:
    """Get all evidence records for a specific learner and skill."""
    records = []
    for k, v in db["evidence"].items():
        if v["learner_id"] == learner_id and v["skill_id"] == skill_id:
            records.append(v)
    return records
