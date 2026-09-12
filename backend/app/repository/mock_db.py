# In-memory store for MVP testing
db = {
    "nodes": {},
    "prerequisites": {},  # course_id -> list of required course_ids
    "conversations": {},  # conversation_id -> list of message dicts
    "assessments": {},    # assessment_id -> assessment state/result
    "lessons": {
        "n1": {
            "lesson": "# Introduction to Decorators\nA decorator is a function that takes another function...",
            "concepts": ["High-order functions", "functools.wraps"],
            "exercises": ["Write a @timer decorator"],
            "hints": ["Remember to return the wrapper function."]
        }
    },
    "mistakes": {}        # (learner_id, node_id) -> list of mistake dicts
}
