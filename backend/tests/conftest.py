import os

import pytest

# Tests must not block on a live Exasol instance.
os.environ.setdefault("EXASOL_ENABLED", "false")
os.environ.setdefault("EXASOL_PASSWORD", "")


@pytest.fixture(scope="session", autouse=True)
def disable_exasol_for_tests():
    os.environ["EXASOL_ENABLED"] = "false"
    os.environ["EXASOL_PASSWORD"] = ""
