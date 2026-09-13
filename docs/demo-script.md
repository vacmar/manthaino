# Demo script — manthaino (max 3 minutes)

Use this as the **short demo video** narration (Exasol Devjam: ≤ 3 minutes).  
Record screen at **http://localhost:3000** with stack already running.

**Suggested length:** 2:30–2:50.

---

## Before you hit record

- [ ] `exakit start` + `docker compose up` healthy  
- [ ] `/health` shows Exasol connected + HF provider  
- [ ] Browser on `localhost:3000`  
- [ ] Optional: one pre-created account ready if signup is slow  

---

## Script (timed)

### 0:00–0:20 — Hook + Exasol

> “manthaino is an adaptive learning platform on **Exasol Personal**.  
> Learners pick any career goal — we store identity in Exasol, generate an AI path, and teach node-by-node with a live tutor.”

Show briefly: terminal `curl localhost:8000/health` with `exasol_connected: true`.

### 0:20–0:50 — Onboarding

> “Seven onboarding answers — including a free-text **Other** role — not a fixed catalog.”

Screen: signup → onboarding. Pick **Other** / e.g. Android or Data Scientist. Submit.

### 0:50–1:20 — AI path

> “The AI service returns ordered stages and a capstone. The **backend** materializes the path: first node unlocked, the rest locked. The model cannot unlock nodes by itself.”

Screen: Dashboard / My Path. Point at lock line: “Complete previous node first.”

### 1:20–2:10 — Interactive lesson

> “Opening a lesson hides the sidebar — focus mode. Chat is scoped to this node; upcoming topics are deferred. Rich notes save to our durable store, not cookies.”

Screen: lesson chat — ask one doubt; type a short note; Save. Show tutor reply as plain text (not JSON).

### 2:10–2:40 — Mastery + progress

> “When the tutor judges the node ready, the learner confirms mastery. Progress updates and the next node unlocks — still one at a time.”

Screen: Confirm mastery → Dashboard/Progress.

### 2:40–2:55 — Close

> “Exasol for durable learner accounts, Redis for fast path restore, Hugging Face for generation and tutoring.  
> Next: multi-track paths like Duolingo courses — designed, not fully shipped in this window.  
> That’s manthaino — learn on your phase.”

End on logo / dashboard.

---

## B-roll / cutaways (optional)

- `docs/architecture.md` diagram (1–2 sec)  
- Projects page showing AI capstone title  
- Redis note: “path survives backend restart”

---

## If something fails live

| Failure | Line to say | Cut to |
|---------|-------------|--------|
| LLM timeout | “Fallback path still materializes from profile rules.” | Dashboard with path |
| Exasol blip | “Auth is Exasol-backed; we fail closed if Personal is down.” | health JSON |
| Wrong password UI | Show clean “Wrong email or password.” | login |

---

## Longer stakeholder version (~8–10 min)

See historical sections in git history if needed; for Devjam **prefer this 3-minute cut only**.
