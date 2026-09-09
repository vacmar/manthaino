# manthaino

**LEARN on ur phase**

manthaino is an adaptive AI learning platform that verifies what a learner knows, builds a dependency-aware path toward a target, and provides persistent AI learning and project workspaces.

## Repositories

- `manthaino-frontend` — Next.js UI
- `manthaino-backend` — FastAPI and business logic
- `manthaino-ai-service` — AI orchestration
- `manthaino-infra` — CI/CD and infrastructure
- `manthaino-docs` — shared documentation

## Core loop

```text
Goal → Verify → Diagnose → Plan → Learn → Practice → Assess → Update → Unlock → Replan
```

## Architecture

```text
Next.js
   ↓
FastAPI
   ↓
AI Service
   ↓
Tools / MCP
   ↓
Exasol
```

The AI does not own authoritative progression state.

## Documentation

See `manthaino-docs` for the complete product, architecture, data and deployment specifications.
