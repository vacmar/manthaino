# In-memory store for MVP testing
db = {
    "nodes": {},
    "prerequisites": {
        "c2": [
            {"skill_id": "skill_py", "required_proficiency": 0.75}
        ]
    },  # course_id -> list of required skills and thresholds
    "lessons": {
        "n1": {
            "lesson": "# Introduction to Decorators\nA decorator is a function that takes another function...",
            "concepts": ["High-order functions", "functools.wraps"],
            "exercises": ["Write a @timer decorator"],
            "hints": ["Remember to return the wrapper function."]
        }
    },
    "mistakes": {},       # (learner_id, node_id) -> list of mistake dicts
    "course_skills": {
        "c1": ["skill_py"],
        "c2": ["skill_sql"]
    },
    "skills": {
        "skill_py": {"name": "Python"},
        "skill_sql": {"name": "SQL"}
    },
    "evidence": {},       # (learner_id, skill_id, source_type, source_id) -> evidence dict
    "proficiency": {},    # (learner_id, skill_id) -> proficiency dict
}
