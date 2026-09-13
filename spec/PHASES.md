# manthaino — Antigravity Phase Checklist

Use `ANTIGRAVITY_MASTER_PROMPT.md` as the architecture contract. Execute phases in order while allowing repositories to work in parallel.

Phases **0–11** are the original build track. Phases **12+** are the remediation track after the first runnable local stack (see `deep-research-report.md`). Original phases may still be backfilled or merged.

## Phase 0 — GitHub organization

- Create organization: `manthaino`
- Create:
  - `manthaino-frontend`
  - `manthaino-backend`
  - `manthaino-ai-service`
  - `manthaino-infra`
  - `manthaino-docs`
- Add README, LICENSE, CONTRIBUTING, CODEOWNERS, `.env.example`
- Add PR and issue templates
- Add GitHub Actions CI
- Protect `main`
- Establish owners and branch conventions

**Exit criteria:** every repo builds/tests through CI.

## Phase 1 — Exasol

- Design normalized schema
- Seed 5 coherent career paths
- Add skills, courses, projects and prerequisites
- Add learner/path/assessment/conversation tables
- Write gap analysis
- Write prerequisite analysis
- Write course coverage
- Write candidate path ranking
- Add seed/reset scripts
- Document data dictionary

**Exit criteria:** a learner + target can produce a meaningful candidate path using Exasol alone.

## Phase 2 — Backend

- Create FastAPI service
- Add Pydantic models
- Add Exasol repository layer
- Implement goal/profile/skill APIs
- Implement assessment APIs
- Implement path/node APIs
- Implement conversation APIs
- Implement project APIs
- Implement lock/unlock rules
- Implement completion rules
- Add tests and `/health`

**Exit criteria:** non-AI state machine works.

## Phase 3 — AI service

- Create AI service
- Implement orchestrator
- Implement tool schemas
- Connect Exasol-backed tools
- Implement pathway reasoning
- Implement tutor
- Implement project mentor
- Implement context builder
- Implement structured output validation
- Add MCP where useful
- Add tool/agent tests

**Exit criteria:** agent makes real tool calls and produces grounded structured results.

## Phase 4 — Frontend

- Next.js + TypeScript
- Tailwind + shadcn/ui
- App shell
- Onboarding
- Goal screen
- Profile/skills
- Assessment
- Dashboard
- Path visualization
- Learning workspace
- Persistent chat
- Progress
- Project workspace

**Exit criteria:** all primary screens function against API/mocks.

## Phase 5 — Verification

- Self-assessment
- Adaptive questions
- Practical tasks
- Evidence fusion
- Confidence score
- Verified proficiency
- Discrepancy display
- Remediation

**Exit criteria:** the system can prove that a claimed level may be wrong.

## Phase 6 — Learning

- Node state
- Lesson context
- Streaming tutor
- Conversation persistence
- Conversation summary
- Exercises
- Hints
- Mistake tracking
- Assessment
- Mastery
- Resume previous session

**Exit criteria:** Python can be entered, learned, exited and resumed with state intact.

## Phase 7 — Progression

- Mastery thresholds
- Completion transition
- Skill evidence update
- Unlock conditions
- Lock explanation
- Next-node recommendation

**Exit criteria:** passing Python unlocks the next eligible node; failing keeps it locked.

## Phase 8 — Projects

- Project requirements
- Task tracking
- AI mentor
- Submission
- Evaluation
- Evidence
- Skill update

**Exit criteria:** a completed project contributes structured evidence.

## Phase 9 — Replanning

- Recalculate skill gaps
- Recalculate dependencies
- Re-rank remaining path
- Explain path changes
- Preserve completed history

**Exit criteria:** learner state can change the remaining path safely.

## Phase 10 — CI/CD

For each repository:

- lint
- typecheck/static checks
- unit tests
- build
- Docker build

For main:

- deploy
- health checks
- smoke tests

**Exit criteria:** a clean merge to protected main can deploy successfully.

## Phase 11 — Documentation

`manthaino-docs`:

- architecture
- product flow
- data model
- API
- deployment
- security
- demo script
- ADRs

Every repo:
- setup
- environment variables
- development
- testing
- deployment
- ownership

## Phase 12 — Local runtime foundation

Shipped / harden:

- Exasol Personal on macOS (`exakit start`); avoid docker-db on Apple Silicon
- Compose stack: redis, backend, ai-service, frontend → host Exasol
- Schema/seed/apply scripts; auth accounts + learners in Exasol
- Signup/login sessions (Redis); orphan learner repair
- Cookie/CORS host alignment (`localhost`); Docker rebuild for `NEXT_PUBLIC_*`
- Runtime docs/ADR; CI smoke hardening

**Exit criteria:** signup → cookie session → `/auth/me` works on http://localhost:3000.

## Phase 13 — Onboarding UX hardening

- Fix skills/interests comma/space input bug
- Learning style options (not free text)
- Weekly time chips/slider
- More roles + **Other** custom role
- Human-readable role titles in review/dashboard
- Persist and display full onboarding profile

**Exit criteria:** onboarding completes without input bugs; review shows real labels.

## Phase 14 — Path locking & richer curricula

- Friendly course titles (no raw `C_PY` / `C_SQL` in UI)
- Longer catalogue-backed paths from Exasol
- Enforce lock/unlock/completion gates; one next recommended node
- Rank/length using experience, skills, weekly time
- Lock reasons on path UI

**Exit criteria:** beginner path starts locked except first node; completion unlocks the next.

## Phase 15 — Interactive mastery loop

- Remove free Mark as Mastered
- Lesson + tutor + exercises + assessment required for completion
- Workspace bound to active node context
- Progress reflects weak concepts and evidence

**Exit criteria:** first node cannot complete without interactive learning evidence.

## Phase 16 — Workspace execution & project validation

- Sandboxed code execution API + UI Run
- Real project submit/evaluate pipeline + mentor grounding
- Evidence on pass written to learner profile

**Exit criteria:** snippet run + project evaluation produce durable evidence.

## Phase 17 — AI grounding, E2E polish, feature freeze

- Tools grounded on Exasol gap/rank APIs
- E2E: auth → onboard → learn → unlock → project
- UX polish, docs, demo script
- Then freeze: bugs, tests, performance, deployment, demo only

**Exit criteria:** demo loop runs without mock-only shortcuts; major architecture frozen.
