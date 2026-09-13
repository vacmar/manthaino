# manthaino-ai-service

LangGraph orchestrator: tutor, pathway reasoning, project mentor; tools call the backend API.

## Setup

```bash
cd ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## Environment

| Variable | Purpose |
|----------|---------|
| `BACKEND_URL` | Backend base URL (default `http://localhost:8000`) |
| `REDIS_URL` | Optional cache |
| `OPENROUTER_API_KEY` / Groq keys | Live LLM (mock model used when unset) |

## Development

```bash
PYTHONPATH=. uvicorn app.main:app --reload --port 8001
```

## Test

```bash
PYTHONPATH=. pytest -v
ruff check .
```
