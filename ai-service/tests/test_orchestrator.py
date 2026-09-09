from app.agents.orchestrator import run_orchestration

def test_orchestration_mock():
    res = run_orchestration("learner_123", "What should I do next?")
    assert "course_101" in res["recommendation"]["recommended_node_id"]
    assert "tools_called" in res
