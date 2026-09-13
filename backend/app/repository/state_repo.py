import logging

from app.models.domain import PathNode, LearningPath, Account, Learner
from . import exasol_db
from .mock_db import db

logger = logging.getLogger(__name__)


def _use_exasol_auth() -> bool:
    return exasol_db.exasol_configured()


def _save_account_mock(account: Account):
    db.setdefault("accounts", {})[account.account_id] = account


def _save_learner_mock(learner: Learner):
    db.setdefault("learners_by_id", {})[learner.learner_id] = learner
    db.setdefault("learners_by_account", {})[learner.account_id] = learner


# --- Accounts & Learners (Exasol or in-memory fallback) ---


def create_account(account: Account):
    if _use_exasol_auth():
        try:
            exasol_db.create_account(account)
            return
        except Exception as e:
            logger.warning("Exasol create_account failed, using mock store: %s", e)
    _save_account_mock(account)


def get_account_by_email(email: str) -> Account | None:
    if _use_exasol_auth():
        try:
            return exasol_db.get_account_by_email(email)
        except Exception as e:
            logger.warning("Exasol get_account_by_email failed, using mock store: %s", e)
    for acc in db.get("accounts", {}).values():
        if acc.email == email:
            return acc
    return None


def get_account_by_id(account_id: str) -> Account | None:
    if _use_exasol_auth():
        try:
            return exasol_db.get_account_by_id(account_id)
        except Exception as e:
            logger.warning("Exasol get_account_by_id failed, using mock store: %s", e)
    return db.get("accounts", {}).get(account_id)


def create_learner(learner: Learner):
    if _use_exasol_auth():
        try:
            exasol_db.create_learner(learner)
            _save_learner_mock(learner)  # keep local cache in sync
            return
        except Exception as e:
            logger.warning("Exasol create_learner failed, using mock store: %s", e)
    _save_learner_mock(learner)


def get_learner(learner_id: str) -> Learner | None:
    if _use_exasol_auth():
        try:
            found = exasol_db.get_learner(learner_id)
            if found:
                return found
        except Exception as e:
            logger.warning("Exasol get_learner failed, using mock store: %s", e)
    return db.get("learners_by_id", {}).get(learner_id)


def get_learner_by_account(account_id: str) -> Learner | None:
    if _use_exasol_auth():
        try:
            found = exasol_db.get_learner_by_account(account_id)
            if found:
                return found
        except Exception as e:
            logger.warning("Exasol get_learner_by_account failed, using mock store: %s", e)
    return db.get("learners_by_account", {}).get(account_id)


def update_learner(learner: Learner):
    if _use_exasol_auth():
        try:
            exasol_db.update_learner(learner)
            return
        except Exception as e:
            logger.warning("Exasol update_learner failed, using mock store: %s", e)
    _save_learner_mock(learner)

def get_node(node_id: str) -> PathNode | None:
    if node_id in db["nodes"]:
        return db["nodes"][node_id]
    return None


def update_node(node: PathNode):
    db["nodes"][node.node_id] = node


def get_nodes_for_path(path_id: str) -> list[PathNode]:
    return [n for n in db["nodes"].values() if n.path_id == path_id]


from app.models.domain import LearningPath


def get_active_path(learner_id: str) -> LearningPath | None:
    for path in db["paths"].values():
        if path.learner_id == learner_id and path.is_active:
            return path
    return None


def save_path(path: LearningPath):
    db["paths"][path.path_id] = path


def get_path(path_id: str) -> LearningPath | None:
    return db["paths"].get(path_id)


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
def record_mistake(
    learner_id: str, node_id: str, concept: str, description: str, timestamp: str
):
    """Record a mistake durably."""
    key = f"{learner_id}:{node_id}"
    if key not in db["mistakes"]:
        db["mistakes"][key] = []

    db["mistakes"][key].append(
        {
            "learner_id": learner_id,
            "node_id": node_id,
            "concept": concept,
            "description": description,
            "timestamp": timestamp,
        }
    )


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
    return db["proficiency"].get(
        key,
        {
            "learner_id": learner_id,
            "skill_id": skill_id,
            "proficiency": 0.0,
            "confidence": 0.0,
        },
    )


def update_learner_proficiency(
    learner_id: str, skill_id: str, proficiency: float, confidence: float
):
    """Save calculated proficiency."""
    key = f"{learner_id}:{skill_id}"
    db["proficiency"][key] = {
        "learner_id": learner_id,
        "skill_id": skill_id,
        "proficiency": proficiency,
        "confidence": confidence,
    }


def record_skill_evidence(
    learner_id: str,
    skill_id: str,
    source_type: str,
    source_id: str,
    score: float,
    confidence: float,
    timestamp: str,
):
    """Durably record evidence for a skill. Enforces idempotency per source."""
    key = f"{learner_id}:{skill_id}:{source_type}:{source_id}"
    db["evidence"][key] = {
        "learner_id": learner_id,
        "skill_id": skill_id,
        "source_type": source_type,
        "source_id": source_id,
        "score": score,
        "confidence": confidence,
        "timestamp": timestamp,
    }


def get_skill_evidence(learner_id: str, skill_id: str) -> list:
    """Get all evidence records for a specific learner and skill."""
    records = []
    for k, v in db["evidence"].items():
        if v["learner_id"] == learner_id and v["skill_id"] == skill_id:
            records.append(v)
    return records


# --- Projects ---
def get_project(project_id: str) -> dict:
    return db["projects"].get(project_id)


def get_project_skills(project_id: str) -> list:
    proj = db["projects"].get(project_id)
    if proj:
        return proj.get("taught_skills", [])
    return []


def get_project_submission(submission_id: str) -> dict:
    return db["project_submissions"].get(submission_id)


def get_project_submissions_for_learner(learner_id: str, project_id: str) -> list:
    results = []
    for sub in db["project_submissions"].values():
        if sub["learner_id"] == learner_id and sub["project_id"] == project_id:
            results.append(sub)
    return results


def save_project_submission(submission: dict):
    db["project_submissions"][submission["submission_id"]] = submission


# --- Goals ---
def save_goal(goal: dict):
    db.setdefault("goals", {})[goal["goal_id"]] = goal


def get_goal(goal_id: str) -> dict | None:
    return db.get("goals", {}).get(goal_id)


def get_goals_for_learner(learner_id: str) -> list:
    return [g for g in db.get("goals", {}).values() if g.get("learner_id") == learner_id]


# --- Learning progress ---
def get_learning_progress(learner_id: str, node_id: str) -> dict | None:
    key = f"{learner_id}:{node_id}"
    return db.get("learning_progress", {}).get(key)


def save_learning_progress(learner_id: str, node_id: str, progress: dict):
    key = f"{learner_id}:{node_id}"
    db.setdefault("learning_progress", {})[key] = progress


# --- Verification sessions ---
def save_verification_session(session_id: str, session: dict):
    db.setdefault("verification_sessions", {})[session_id] = session


def get_verification_session(session_id: str) -> dict | None:
    return db.get("verification_sessions", {}).get(session_id)


def get_verification_session_for_skill(learner_id: str, skill_id: str) -> dict | None:
    for session in db.get("verification_sessions", {}).values():
        if session.get("learner_id") == learner_id and session.get("skill_id") == skill_id:
            return session
    return None
