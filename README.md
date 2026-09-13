# manthaino

**Adaptive AI learning on Exasol Personal (Local)** — onboard any career role, generate an AI learning path, teach node-by-node with a live tutor. The **backend** owns unlocks and mastery; the LLM only teaches.

**Devjam deployment choice:** **Exasol Personal → Local** (`exakit` on your machine + Docker Compose for the app).

---

## Table of contents

1. [What you need](#1-what-you-need)
2. [Clone the repo (path matters)](#2-clone-the-repo-path-matters)
3. [Start Exasol Personal (Local)](#3-start-exasol-personal-local)
4. [Create `.env`](#4-create-env)
5. [Confirm the Exasol password file](#5-confirm-the-exasol-password-file)
6. [Start the stack with Docker](#6-start-the-stack-with-docker)
7. [Verify everything works](#7-verify-everything-works)
8. [Use the product](#8-use-the-product)
9. [Stop / restart / rebuild](#9-stop--restart--rebuild)
10. [Troubleshooting](#10-troubleshooting)
11. [Project overview & docs](#11-project-overview--docs)

Follow steps **1 → 7 in order**. Do not skip Exasol on Mac.

---

## 1. What you need

Install these **before** any Docker commands:

| Tool | Why |
|------|-----|
| **Git** | Clone the repo |
| **Docker Desktop** | Runs Redis, backend, AI service, frontend |
| **Exasol Personal / Exakit** | Mandatory Devjam data platform (`exakit start`) |
| **Hugging Face token** (optional but recommended) | Live AI path + lesson tutor; use `mock` without it |

**Ports that must be free:** `3000`, `8000`, `8001`, `6379`, `8563`.

**macOS note:** Do **not** run `exasol/docker-db` on Apple Silicon. Use **Exasol Personal** only.

---

## 2. Clone the repo (path matters)

All commands below assume this directory is your working directory:

```text
<your-home>/…/mathaino
```

Example on this machine:

```text
/Users/vaaheesan/manthaino/mathaino
```

That folder must contain `docker-compose.yml`, `frontend/`, `backend/`, `ai-service/`, and `docs/`.

```bash
git clone https://github.com/vacmar/mathaino.git
cd mathaino
```

If you cloned into a nested folder, `cd` until you see:

```bash
ls
# expect: docker-compose.yml  frontend  backend  ai-service  docs  README.md  .env.example
```

**Always run `docker compose` from this directory** (the one with `docker-compose.yml`).

Check Docker is running:

```bash
docker version
docker compose version
```

---

## 3. Start Exasol Personal (Local)

Exasol runs **on the host**, not inside the default Compose stack.

```bash
exakit start
```

Wait until Personal is ready. Confirm port **8563**:

```bash
# macOS
lsof -iTCP:8563 -sTCP:LISTEN || true
nc -vz 127.0.0.1 8563
```

You want a successful connect on `127.0.0.1:8563`.

More background: [docs/adr/0001-exasol-personal-on-macos.md](./docs/adr/0001-exasol-personal-on-macos.md).

---

## 4. Create `.env`

Still in the repo root (same folder as `docker-compose.yml`):

```bash
cp .env.example .env
```

Edit `.env` (open in any editor):

```bash
# macOS
open -e .env
# or: nano .env
```

**Minimum for a live AI demo:**

```env
LLM_PROVIDER=huggingface
HUGGINGFACE_API_KEY=hf_your_token_here
HUGGINGFACE_MODEL=meta-llama/Llama-3.1-8B-Instruct

EXASOL_ENABLED=true
EXASOL_DSN=host.docker.internal:8563
EXASOL_USER=sys
EXASOL_SCHEMA=MANTHAINO
```

**Without an HF key** (UI + mock paths only):

```env
LLM_PROVIDER=mock
EXASOL_ENABLED=true
EXASOL_DSN=host.docker.internal:8563
EXASOL_USER=sys
EXASOL_SCHEMA=MANTHAINO
```

| Variable | Required | Meaning |
|----------|----------|---------|
| `LLM_PROVIDER` | Yes | `huggingface` or `mock` (or `groq` / `openrouter`) |
| `HUGGINGFACE_API_KEY` | If using HF | Inference token |
| `HUGGINGFACE_MODEL` | Recommended | Default `meta-llama/Llama-3.1-8B-Instruct` |
| `EXASOL_ENABLED` | Yes | `true` for Local Personal |
| `EXASOL_DSN` | Yes | From Docker → host Exasol: `host.docker.internal:8563` |
| `EXASOL_USER` | Yes | Usually `sys` |
| `EXASOL_SCHEMA` | Yes | `MANTHAINO` (created on startup) |

**Do not commit `.env`.** It is gitignored.

---

## 5. Confirm the Exasol password file

Compose mounts this **host file** into the backend container:

```text
${HOME}/.exasol-starter-kit/credentials/personal_sys_password
  →  /run/secrets/exasol_sys_password   (inside backend)
```

Check it exists on your Mac:

```bash
ls -la "$HOME/.exasol-starter-kit/credentials/personal_sys_password"
```

If the path differs on your Exakit install, either:

- copy/symlink the real password file to that path, **or**
- edit `docker-compose.yml` volume line under `backend.volumes` to your real file, **or**
- put `EXASOL_PASSWORD=...` in `.env` (never commit it)

```bash
# optional fallback in .env only
EXASOL_PASSWORD=your_sys_password
```

---

## 6. Start the stack with Docker

From the **repo root** (`pwd` shows the folder with `docker-compose.yml`):

```bash
pwd
# .../mathaino

docker compose down
docker compose up --build -d
```

What this starts:

| Service | Container role | Host URL |
|---------|----------------|----------|
| `redis` | Sessions + path/lesson cache | `localhost:6379` |
| `ai-service` | Path generate + lesson tutor | http://localhost:8001 |
| `backend` | Auth, paths, nodes (talks to Exasol + Redis + AI) | http://localhost:8000 |
| `frontend` | Learner UI | http://localhost:3000 |

Watch logs if needed:

```bash
docker compose ps
docker compose logs -f --tail=100
# Ctrl+C stops following logs; containers keep running
```

First build can take several minutes (frontend `npm` build + Python images).

---

## 7. Verify everything works

Run these **in order**:

```bash
# 7a. Containers running
docker compose ps

# 7b. Backend + Exasol
curl -s http://localhost:8000/health
# Expect JSON including:
#   "status": "ok"
#   "exasol_enabled": true
#   "exasol_connected": true

# 7c. AI service
curl -s http://localhost:8001/health
# Expect "provider":"huggingface"  (or "mock" if LLM_PROVIDER=mock)

# 7d. Frontend
curl -sf -o /dev/null -w "frontend_http=%{http_code}\n" http://localhost:3000
# Expect frontend_http=200
```

Open the app in a browser:

```text
http://localhost:3000
```

**Important:** use **`localhost`**, not `127.0.0.1` (cookies / auth break if you mix them).

If `exasol_connected` is `false`, fix Exasol / password file **before** signing up (see [Troubleshooting](#10-troubleshooting)).

---

## 8. Use the product

1. Open http://localhost:3000 → **Sign up**.  
2. Complete **7-step onboarding** (role **Other** works for any title).  
3. Wait for **AI path generation** → **Dashboard**.  
4. Open the **active** lesson (sidebar hides; chat + rich notes).  
5. Chat until **Confirm mastery** → next node unlocks.  
6. Check **My Path**, **Progress**, **Projects**.

Demo narration (≤3 min): [docs/demo-script.md](./docs/demo-script.md).

---

## 9. Stop / restart / rebuild

```bash
# Stop containers (keep Redis volume / cached paths)
docker compose stop

# Start again without rebuild
docker compose start

# Full stop
docker compose down

# Rebuild after code or .env LLM changes
docker compose up --build -d

# Nuclear: wipe Redis cache volumes too (paths/sessions cleared)
docker compose down -v
docker compose up --build -d
```

Exasol Personal keeps its own data on the host until you reset it via Exakit.

---

## 10. Troubleshooting

| Symptom | What to do (in order) |
|---------|------------------------|
| `docker compose`: no config file | `cd` to the folder that contains `docker-compose.yml` |
| `exasol_connected: false` | 1) `exakit start` 2) `nc -vz 127.0.0.1 8563` 3) check password file path 4) `docker compose logs backend` |
| Password file missing | Create/symlink `$HOME/.exasol-starter-kit/credentials/personal_sys_password` or set `EXASOL_PASSWORD` in `.env` |
| Frontend loads, login fails | Stay on `http://localhost:3000`; check backend health |
| Dashboard spins forever | Check `curl localhost:8001/health` and HF key; first path gen calls the LLM |
| Port already in use | Quit old Compose / other apps using 3000/8000/8001/6379/8563 |
| Apple Silicon + docker-db | Don’t use it; Personal Local only |
| After rebuild, path missing | Reload Dashboard (Redis restore) or use **Restore my path** on the lesson page |

Backend logs:

```bash
docker compose logs backend --tail=200
```

AI logs:

```bash
docker compose logs ai-service --tail=200
```

---

## 11. Project overview & docs

### Features

- Auth (cookies) with **Exasol** accounts/learners  
- AI path from full onboarding (any role)  
- Sequential unlocks; AI-gated mastery  
- Focus lesson UI + rich notes; Redis/Exasol lesson persistence  
- AI-recommended capstone on Projects  

### Architecture (short)

```text
Browser :3000
  ├─► Backend :8000 ──► Exasol Personal :8563 (host)
  │         └─────────► Redis :6379
  │         └─────────► AI :8001  (path generate)
  └─► AI :8001  (lesson chat) ──► Hugging Face
```

### Submission / extra docs

| Doc | Path |
|-----|------|
| Run guide (extra detail) | [docs/RUN_GUIDE.md](./docs/RUN_GUIDE.md) |
| Demo video script | [docs/demo-script.md](./docs/demo-script.md) |
| Pitch deck content | [docs/PITCH_DECK_CONTENT.md](./docs/PITCH_DECK_CONTENT.md) |
| Architecture / API | [docs/](./docs/) |

### Known limits

- Multi-track Duolingo-style switcher: designed, not fully shipped  
- Sandboxed code Run / full auto project eval: not in this cut  
- Paths primarily Redis-cached; Exasol holds accounts (+ lesson session table when connected)

### Dev tests (optional)

```bash
cd backend && EXASOL_ENABLED=false pytest -q
cd ../ai-service && LLM_PROVIDER=mock pytest -q
cd ../frontend && npm ci && npm run lint && npx tsc --noEmit && npm run build
```

---

## Quick copy-paste (happy path)

After Exakit is installed and Docker Desktop is running:

```bash
git clone https://github.com/vacmar/mathaino.git
cd mathaino

exakit start
ls -la "$HOME/.exasol-starter-kit/credentials/personal_sys_password"

cp .env.example .env
# edit .env → set HUGGINGFACE_API_KEY=...

docker compose up --build -d

curl -s http://localhost:8000/health
curl -s http://localhost:8001/health
open http://localhost:3000
```

**Deployment label for the form:** Exasol Personal — **Local**.
