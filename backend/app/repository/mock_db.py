# In-memory store for MVP testing
db = {
    "nodes": {},
    "prerequisites": {},  # course_id -> list of required course_ids
    "conversations": {},  # conversation_id -> list of message dicts
    "assessments": {}     # assessment_id -> assessment state/result
}
