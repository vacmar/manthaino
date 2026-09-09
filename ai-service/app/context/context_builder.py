def build_learner_context(learner_id: str) -> str:
    # In a real app, this calls the backend API to fetch the Learner profile, active Goal, and Path state.
    # For MVP, we return a mock context string.
    return f"Learner {learner_id} is currently focusing on mastering Python Data Structures."
