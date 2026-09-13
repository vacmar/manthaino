from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.core.cache import get_redis_client
from app.main import app
from app.models.domain import LearningPath, NodeStatus, PathNode
from app.repository import state_repo
from tests.test_caching import fake_redis

app.dependency_overrides[get_redis_client] = lambda: fake_redis
client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_state():
    fake_redis.flushall()
    state_repo.db["paths"].clear()
    state_repo.db["nodes"].clear()
    state_repo.db["learning_progress"].clear()
    state_repo.db["learner_profiles"]["L1"] = {"target_role": "role_be"}


def test_path_generate_python_first():
    from app.models.domain import Learner

    learner = Learner(
        learner_id="L1",
        account_id="a1",
        name="Demo",
        target_role_id="role_be",
        created_at=datetime.now(UTC).isoformat(),
        updated_at=datetime.now(UTC).isoformat(),
    )
    state_repo.create_learner(learner)

    res = client.post("/paths/generate")
    assert res.status_code == 401  # requires auth cookie

    # Direct service call for ranking assertion
    from app.services import replanning_service

    out = replanning_service.generate_path_for_learner("L1", "role_be")
    course_ids = [n["course_id"] for n in out["nodes"]]
    assert course_ids[0] == "c_py"


def test_node_start_and_progress():
    path_id = "p_stub"
    state_repo.save_path(
        LearningPath(
            path_id=path_id,
            learner_id="L1",
            version=1,
            created_at=datetime.now(UTC).isoformat(),
            is_active=True,
        )
    )
    node = PathNode(
        node_id="n_stub",
        path_id=path_id,
        course_id="c_py",
        sequence_order=1,
        status=NodeStatus.UNLOCKED,
    )
    state_repo.update_node(node)

    res = client.post(
        "/nodes/n_stub/start",
        json={"learner_id": "L1", "current_module": "lesson"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "IN_PROGRESS"
    assert data["progress"]["started_at"]

    prog = client.get("/nodes/n_stub/progress?learner_id=L1")
    assert prog.status_code == 200
    assert prog.json()["progress"]["current_module"] == "lesson"


def test_assessment_scoring_not_flat_85():
    client.post("/assessments/start?assessment_id=a_stub")
    client.post(
        "/assessments/a_stub/answer",
        json={"question_id": "py_q1", "answer": "def"},
    )
    client.post(
        "/assessments/a_stub/answer",
        json={"question_id": "py_q2", "answer": "wrong"},
    )
    fin = client.post("/assessments/a_stub/finalize")
    assert fin.status_code == 200
    score = fin.json()["result"]["score"]
    assert score != 85.0
    assert score == 50.0
