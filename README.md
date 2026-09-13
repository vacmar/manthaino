# manthaino

**Adaptive AI learning on Exasol** — verify what a learner knows, generate a dependency-aware path toward any target role, and teach interactively with an AI tutor. Progression is owned by the **backend**, not the LLM.

Built for **Exasol Devjam** using **Exasol Personal** as the mandatory data platform.

---

## Project overview

manthaino turns free-form career goals (Backend, Android, Data Science, “Other” custom roles, …) into a **personalized learning path**, then teaches each node in a **ChatGPT-style lesson** until the tutor marks mastery. Notes and chat persist; nodes unlock one at a time.

| Layer | Stack |
|-------|--------|
| Frontend | Next.js 16, TypeScript, Tailwind |
| Backend | FastAPI — auth, paths, nodes, projects, lessons |
| AI | LangChain/LangGraph + Hugging Face Inference |
| Data | **Exasol Personal** (accounts/learners) + Redis (sessions, path/lesson cache) |

**Authority rule:** the model teaches and suggests; it does **not** unlock nodes or invent mastery scores. Unlock / complete are backend state-machine operations.

---

## Submission package (Devjam)

| Deliverable | Location |
|-------------|----------|
| Clean README (this file) | `/README.md` |
| Deployment / run guide | [`docs/RUN_GUIDE.md`](./docs/RUN_GUIDE.md) |
| Demo script (≤3 min video) | [`docs/demo-script.md`](./docs/demo-script.md) |
| Pitch deck content (for PPT) | [`docs/PITCH_DECK_CONTENT.md`](./docs/PITCH_DECK_CONTENT.md) |
| Architecture & API | [`docs/`](./docs/) |

Public repo: use this monorepo as the submission GitHub repository.

---

## Features (what works in the demo)

1. **Auth** — Sign up / log in (HTTP-only session cookies). Accounts & learners stored in **Exasol** when enabled.
2. **Onboarding (7 steps)** — Name, target role (catalog or free-text Other), domain, experience, known skills, interests, learning style + weekly time.
3. **AI path generation** — Full profile → AI stages + capstone → backend materializes nodes (**first unlocked**, rest locked).
4. **Dashboard / Curriculum Map** — Pathway view; lock reasons show **complete previous node** (readable titles).
5. **Focus lesson workspace** — App sidebar hidden; AI chat + **rich notes** (title, bold, lists, tables). Chat/notes saved via Redis + Exasol lesson sessions.
6. **AI-gated mastery** — No free “Complete”; tutor sets ready → user confirms → next node unlocks; Progress updates.
7. **Projects** — Capstone recommended from the AI path (role-aligned).
8. **Path cache** — Active path restored from Redis after backend restart (no full AI regen on every login).

---

## Repository layout

```
mathaino/
├── frontend/           # Next.js learner UI (:3000)
├── backend/            # FastAPI authoritative state (:8000)
├── ai-service/         # Path gen + lesson tutor (:8001)
├── docs/               # Run guide, pitch content, architecture
├── spec/               # Phase checklist
├── docker-compose.yml  # redis + backend + ai-service + frontend
└── .env.example        # LLM secrets template
```

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | `3000` | Learner UI |
| Backend | `8000` | Auth, paths, nodes, lessons, projects |
| AI service | `8001` | `POST /path/generate`, `POST /chat/lesson` |
| Redis | `6379` | Sessions + path/lesson cache |
| Exasol Personal | `8563` | Durable accounts (host; not Docker on Apple Silicon) |

---

## Setup instructions

### Prerequisites

- Docker Desktop
- **Exasol Personal** (`exakit start`) — **required** for Devjam data platform
- Hugging Face token with Inference access (or set `LLM_PROVIDER=mock` for offline UI)

### 1. Start Exasol Personal (macOS)

Do **not** use `exasol/docker-db` on Apple Silicon.

```bash
exakit start
# Password file typically under ~/.exasol-starter-kit/credentials/
```

Details: [docs/adr/0001-exasol-personal-on-macos.md](./docs/adr/0001-exasol-personal-on-macos.md).

### 2. Configure environment

```bash
cd mathaino
cp .env.example .env
# Set HUGGINGFACE_API_KEY=...
# Optional: EXASOL_PASSWORD_FILE=/path/to/password
```

| Variable | Meaning |
|----------|---------|
| `LLM_PROVIDER` | `huggingface` (default) \| `mock` \| `groq` \| `openrouter` |
| `HUGGINGFACE_API_KEY` | HF token |
| `HUGGINGFACE_MODEL` | Default `meta-llama/Llama-3.1-8B-Instruct` |
| `EXASOL_ENABLED` | `true` for Personal; `false` for unit tests only |

### 3. Run

```bash
docker compose up --build
```

- App: http://localhost:3000  
- Backend health: http://localhost:8000/health → `"exasol_connected": true`  
- AI health: http://localhost:8001/health → `"provider":"huggingface"`

Full step-by-step + troubleshooting: **[docs/RUN_GUIDE.md](./docs/RUN_GUIDE.md)**.

---

## Usage instructions

1. Open http://localhost:3000 → **Sign up** (use `localhost`, not `127.0.0.1`).
2. Complete **onboarding** (try **Other** + any role, e.g. Android Developer).
3. Wait for **AI path generation** → land on **Dashboard**.
4. Open the **active** node → focus lesson (chat + notes).
5. Learn until the tutor offers **Confirm mastery** → next node unlocks.
6. Check **My Path**, **Progress**, and **Projects** (AI capstone).

**3-minute demo narration:** [docs/demo-script.md](./docs/demo-script.md).

---

## Architecture (short)

```text
Browser → Backend :8000  (Exasol accounts, Redis sessions/paths)
              └─► AI :8001  POST /path/generate
Browser → AI :8001       POST /chat/lesson  → Hugging Face
```

- Paths unlock **sequentially** in the backend.
- After restart, Redis restores the active path; `POST /paths/me/ensure` regenerates only if nothing is cached.

More: [docs/architecture.md](./docs/architecture.md) · [docs/api.md](./docs/api.md) · [docs/product-flow.md](./docs/product-flow.md).

---

## Known limits (honest for judges)

- Multi-track “Duolingo switcher” (multiple roles at once) is **designed, not shipped** under the hackathon window.
- Code sandbox Run / full project auto-eval (Phase 16) is **not** in this cut.
- Learning path nodes are cached in Redis (+ lesson sessions in Exasol); full relational path history in Exasol is partial.

---

## Development / CI

```bash
# Backend tests without Exasol
cd backend && EXASOL_ENABLED=false pytest -q

# AI path tests (mock LLM)
cd ai-service && LLM_PROVIDER=mock pytest -q

# Frontend
cd frontend && npm ci && npm run lint && npx tsc --noEmit && npm run build
```

GitHub Actions: three CI workflows on PR; Deploy smoke on push to `main`.

---

## License / contributing

See service READMEs and `.github/`. Product phases: [spec/PHASES.md](./spec/PHASES.md).
