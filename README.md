# manthaino - Monorepo

Welcome to the `manthaino` project! This repository contains the unified codebase for the adaptive AI learning platform. 

The project has been structured as a monorepo consisting of a Next.js frontend, a FastAPI backend core, and a Python-based AI orchestrator service.

## Current Implementation Status

We have successfully completed **Phases 0, 1, and 2** of the Antigravity Master Build Prompt.

### Phase 0: Repository Foundation
- Established a unified monorepo structure containing `frontend`, `backend`, and `ai-service` directories.
- Stripped out nested `.git` folders to ensure smooth tracking from the root.
- Consolidated all GitHub Actions workflows (`frontend-ci.yml`, `backend-ci.yml`, `ai-service-ci.yml`) into the `.github/workflows/` directory.
- Scaffolded standard `README`, `CONTRIBUTING.md`, `CODEOWNERS`, and issue/PR templates.
- Added a robust root `.gitignore` file.

### Phase 1: Exasol Data Foundation
The authoritative data layer was mapped out inside `backend/infra/exasol/`:
- **`schema.sql`**: Fully normalized schema managing learners, skills, goals, courses, path nodes, conversations, and progression ledgers.
- **`seed.sql`**: Extensive generated mock data covering 5 career paths, 46 skills, and 62 courses, fully mapped with prerequisites and skill contribution weights.
- **`queries.sql`**: Complex analytical Exasol queries to execute skill gap analysis, prerequisite coverage checks, and candidate path ranking without needing LLM intervention.
- **`docs/data-model.md`**: Architectural documentation of the data structures.

### Phase 2: Backend Core MVP
The core FastAPI application has been built inside `backend/app/`:
- **Pydantic Models**: Strictly typed `domain.py`, `payloads.py`, and `state.py` models mapped to the database entities.
- **Mock Repository Layer**: An in-memory database (`mock_db.py`, `state_repo.py`) to permit local execution of the state machine logic without an active Exasol connection.
- **State Machine Services**:
  - `progression_service.py`: Enforces completion criteria (e.g. assessment scores).
  - `unlock_service.py`: Cascades unlocks to dependent courses when prerequisites are met.
- **API Endpoints**: All required API routers were scaffolded (`goals`, `learners`, `assessments`, `paths`, `nodes`, `conversations`, `projects`) and integrated into `main.py`.
- **Validation**: Wrote `pytest` suites to verify that the core node unlocking state transitions function exactly as specified.

### Next Up
- **Phase 3**: AI Service (Orchestrator, context builder, structured tool calls).
