# manthaino

Adaptive AI learning platform: verify what a learner knows, generate a dependency-aware path toward a target role, and teach interactively with an AI tutor — with progression owned by the backend, not the model.

This monorepo contains the **frontend**, **backend**, **AI service**, **Exasol** foundation, and product/docs specs.

---

## What the product does

1. **Auth** — Sign up / log in (session cookies). Learner profile stored in Exasol when enabled.
2. **Onboarding (7 steps)** — Name, target role (catalog or free-text Other), domain, experience, known skills, interests, learning style + weekly time.
3. **AI path generation** — Backend calls the AI service with the full profile. The model (or a profile-aware fallback) returns ordered stages + a capstone project. Backend materializes path nodes: **first unlocked**, rest **locked**.
4. **Dashboard / My Path** — Visual pathway; nodes unlock **one at a time** after completion.
5. **Interactive lesson** — Opening a node starts a ChatGPT-style AI lesson chat scoped to **that node**. Doubts about later topics are deferred to upcoming nodes. Practice notes + Complete node unlock the next step.
6. **Projects** — Capstone recommended from the AI path (role-aligned, not a hardcoded FastAPI project for everyone).
7. **Workspace / Progress / Assessments** — Additional learning surfaces (see `docs/`).

**Authority rule:** The LLM teaches and suggests; it does **not** unlock nodes or invent mastery. Unlock / complete are backend state-machine operations.

---

## Repository layout

```
mathaino/
├── frontend/          # Next.js App Router (UI)
├── backend/           # FastAPI (auth, paths, nodes, projects, onboarding)
├── ai-service/        # LangGraph + Hugging Face / OpenRouter / Groq / mock
├── docs/              # Architecture, API, deployment, ADRs
├── spec/              # Phase checklist and research notes
├── docker-compose.yml # redis + backend + ai-service + frontend
└── .env.example       # LLM provider secrets template (copy to .env)
```

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | `3000` | Learner UI |
| Backend | `8000` | Authoritative state API |
| AI service | `8001` | Path generation + tutor / lesson chat |
| Redis | `6379` | Sessions / ephemeral cache |
| Exasol Personal | `8563` | Durable accounts (host, not Docker on Apple Silicon) |

---

## Architecture (how pieces talk)

```text
Browser
  │
  ├─► Backend :8000     auth, onboarding, paths, nodes, projects
  │       │
  │       └─► AI service :8001   POST /path/generate  (onboarding)
  │
  └─► AI service :8001   POST /chat/lesson  (interactive lesson)
              │
              └─► Hugging Face Inference (or mock / Groq / OpenRouter)
```

- **Paths / unlocks / completion** live in the backend (in-memory `mock_db` for learning state in local MVP; accounts in Exasol when `EXASOL_ENABLED=true`).
- After a backend container restart, learning paths in memory are cleared. Use **Dashboard** (auto `POST /paths/me/ensure`) or **Restore my path** on the lesson page — no new user required.
- Secrets stay in `.env` (gitignored). Never commit API keys.

More detail: [docs/architecture.md](./docs/architecture.md), [docs/product-flow.md](./docs/product-flow.md), [docs/api.md](./docs/api.md).

---

## Quick start (local)

### 1. Exasol (macOS)

Do **not** run `exasol/docker-db` on Apple Silicon. Use Exasol Personal:

```bash
exakit start
# Password typically via file, e.g. ~/.exasol-starter-kit/credentials/personal_sys_password
```

See [docs/adr/0001-exasol-personal-on-macos.md](./docs/adr/0001-exasol-personal-on-macos.md).

### 2. Environment

```bash
cd mathaino
cp .env.example .env
# Set HUGGINGFACE_API_KEY (or switch LLM_PROVIDER=mock|groq|openrouter)
```

Compose defaults to Hugging Face when configured:

| Variable | Meaning |
|----------|---------|
| `LLM_PROVIDER` | `huggingface` \| `mock` \| `groq` \| `openrouter` |
| `HUGGINGFACE_API_KEY` | HF token with Inference Providers access |
| `HUGGINGFACE_MODEL` | Default: `meta-llama/Llama-3.1-8B-Instruct` |

### 3. Run the stack

```bash
docker compose up --build
```

- App: http://localhost:3000  
- Backend health: http://localhost:8000/health  
- AI health: http://localhost:8001/health (`provider` should match your LLM setting)

Backend-only tests without Exasol:

```bash
cd backend
EXASOL_ENABLED=false pytest -q
```

AI path-generation tests:

```bash
cd ai-service
LLM_PROVIDER=mock pytest tests/test_path_generate.py -q
```

---

## Learner journey (happy path)

1. Open http://localhost:3000 → **Sign up**.
2. Complete **onboarding** (Other works for any role title, e.g. Data Scientist / Software Developer).
3. Click **Generate My Path** — AI returns tailored stages + capstone.
4. On **My Path**, only the first node is unlocked.
5. Open the node → **AI Lesson Chat** teaches that topic; ask doubts; upcoming topics are deferred.
6. Add practice notes → **Complete node** → next node unlocks.
7. **Projects** shows the AI-recommended capstone for that path.

---

## Key APIs

| Endpoint | Service | Role |
|----------|---------|------|
| `POST /onboarding/` | Backend | Save profile; generate AI path |
| `GET /paths/me/active` | Backend | Current path + node titles |
| `POST /paths/me/ensure` | Backend | Recreate path if wiped after restart |
| `POST /nodes/{id}/complete` | Backend | Mark node complete; unlock next |
| `GET /projects/me/recommended` | Backend | Capstone for this learner |
| `POST /path/generate` | AI | Structured pathway + capstone from profile |
| `POST /chat/lesson` | AI | Conversational tutor scoped to current node |
| `POST /chat/tutor` | AI | General tutor persona (tools / orchestrator) |

---

## Implementation status (high level)

| Area | Status |
|------|--------|
| Auth + Exasol accounts | Working locally with Personal Exasol |
| Onboarding UX (7 steps) | Done |
| AI path generation (HF) | Done (mock fallback if LLM fails) |
| Sequence unlocks | Done |
| Interactive lesson chat | Done (MVP) |
| AI-gated “Complete node” | Planned |
| Persist chat + notes per node | Planned |
| Capstone / projects | Working; AI-recommended project |
| Full Exasol path persistence | Partial (paths still primarily in-memory) |
| CI / docs | Present under `.github/` and `docs/` |

Phase checklist: [spec/PHASES.md](./spec/PHASES.md). Deep notes: [docs/deep-research-report.md](./docs/deep-research-report.md).

---

## Documentation index

- [Architecture](./docs/architecture.md)
- [Product flow](./docs/product-flow.md)
- [Data model](./docs/data-model.md)
- [API](./docs/api.md)
- [Deployment](./docs/deployment.md)
- [Security](./docs/security.md)
- [Demo script](./docs/demo-script.md)
- [AI service README](./ai-service/README.md)
- [Backend / frontend](./backend/) · [frontend](./frontend/)

---

## Development notes

- **Frontend** talks to backend with `credentials: "include"` (cookies). Prefer `http://localhost:3000` consistently (not mixing `127.0.0.1`).
- **Docker** backend uses `AI_SERVICE_URL=http://ai-service:8001` and Exasol via `host.docker.internal:8563`.
- **Do not commit** `.env` / API keys. Rotate any key that was pasted into chat or logs.
- Branch for current AI path + lesson work: `feat/ai-path-generation-and-lesson-tutor`.

---

## License / contributing

See service-level READMEs and `.github/` for CI. Product direction and phase gates live in `spec/`.
