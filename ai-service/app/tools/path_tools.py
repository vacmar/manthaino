from langchain_core.tools import tool

@tool
def get_skill_gaps(learner_id: str) -> str:
    """Simulates executing the Exasol skill gap query for the given learner."""
    return "Learner lacks skill: HashMaps (Weight: 80)"

@tool
def get_candidate_paths(learner_id: str) -> str:
    """Simulates executing the Exasol candidate path query."""
    return "[Node: Intro to Dictionaries (course_101)]"
