# Deployment

## Local (macOS recommended)

1. **Exasol Personal** — do not use `docker-db` on Apple Silicon; start native runtime:
   ```bash
   exakit start
   ```
2. Set credentials (prefer file over plain env):
   ```bash
   export EXASOL_PASSWORD_FILE="$HOME/.exasol/password"
   ```
3. **Application stack** (Redis + backend + ai-service + frontend):
   ```bash
   docker compose up --build
   ```
   Backend defaults to `EXASOL_DSN=host.docker.internal:8563` so containers reach host Exasol.

## Environment highlights

| Variable | Purpose |
|----------|---------|
| `EXASOL_ENABLED` | Set `false` in CI/unit runs without DB |
| `EXASOL_DSN` | Host:port for Exasol |
| `EXASOL_PASSWORD_FILE` | Preferred password delivery |
| `REDIS_URL` | Assessment session cache |
| `NEXT_PUBLIC_BACKEND_URL` | Frontend → backend |

Optional Linux profile: `docker compose --profile docker-exasol up` for `exasol/docker-db` (not for Mac dev).

## CI

GitHub Actions: lint, typecheck, tests, Docker build per service; `deploy.yml` smoke-tests `/health` with retries after `docker compose up`.

See [adr/0001-exasol-personal-on-macos.md](./adr/0001-exasol-personal-on-macos.md).
