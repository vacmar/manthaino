# Demo script (GOAL → … → REPLAN)

**Audience:** stakeholder walkthrough (~10 minutes)

1. **GOAL** — Log in, open `/goal` or complete `/onboarding` with a target role (e.g. Data Engineering).
2. **PATH** — Open `/path` or `/dashboard`; show unlocked vs locked nodes; expand a locked node to read unlock-conditions (missing prerequisite mastery).
3. **LEARN** — Enter `/workspace` or `/lesson/{node_id}`; optional tutor chat; complete node via assessment criteria.
4. **VERIFY** — Run skill verification (backend `POST /verification/skills/{id}/start` + submit) or assessment; open `/profile` to show claimed vs verified discrepancy panel when results exist.
5. **PROJECT** — `/projects`: submit repository URL; backend submit + evaluate updates requirements and evidence.
6. **PROGRESS** — `/progress`: path completion %, mastery list, weak concepts, completed nodes, history.
7. **REPLAN** — On `/path`, click **Regenerate path**; review change list (nodes added/removed with reasons); confirm completed nodes preserved.

**Fallback:** If Exasol is offline, set `EXASOL_ENABLED=false` and use in-memory mock state for backend demos.
