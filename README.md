# manthaino - Monorepo

Unified codebase for the adaptive AI learning platform: Next.js frontend, FastAPI backend, Python AI orchestrator, and Exasol data foundation.

## Current implementation status

| Phase | Status | Notes |
|-------|--------|--------|
| 0–1 | Done | Repo layout, Exasol schema/seeds/queries |
| 2–3 | Done | Backend state machine, AI service + tools |
| 4 | Partial | Primary screens wired to APIs; `/progress`, path regenerate/unlocks, project submit/evaluate |
| 5–9 | Partial | Verification fusion, progression, replanning services exist; UI coverage varies |
| 10 | Partial | CI workflows; deploy smoke test waits on backend `/health` |
| 11 | Partial | Root `docs/` + per-service README basics |
| 12 | Not started | Feature freeze |

## Exasol on macOS

Do **not** rely on `docker-db` on Apple Silicon. Use Exasol Personal:

```bash
exakit start
export EXASOL_PASSWORD_FILE="$HOME/.exasol/password"   # recommended
docker compose up --build
```

Backend in Docker uses `host.docker.internal:8563` by default. See [docs/deployment.md](./docs/deployment.md) and [docs/adr/0001-exasol-personal-on-macos.md](./docs/adr/0001-exasol-personal-on-macos.md).

## Documentation

- [Architecture](./docs/architecture.md)
- [Product flow](./docs/product-flow.md)
- [Data model](./docs/data-model.md)
- [API](./docs/api.md)
- [Deployment](./docs/deployment.md)
- [Security](./docs/security.md)
- [Demo script](./docs/demo-script.md)

## Quick start

```bash
# Terminal 1 — database (macOS)
exakit start

# Terminal 2 — apps
cd mathaino
docker compose up --build
# Frontend http://localhost:3000 · Backend http://localhost:8000 · AI http://localhost:8001
```

For backend-only dev without Exasol: `EXASOL_ENABLED=false` and run pytest from `backend/`.
