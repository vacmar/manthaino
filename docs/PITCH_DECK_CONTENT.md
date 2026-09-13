# Pitch deck content — manthaino (Exasol Devjam)

**Use this file to build the PPT/PDF.**  
One section = one slide (or two if noted). Keep visuals dark, product screenshots on demo slides.

Suggested filename: `manthaino-devjam-pitch.pptx`  
Length: **8–10 slides** (judges skim fast).

---

## Slide 1 — Title

**Title:** manthaino  
**Subtitle:** Adaptive AI learning on Exasol — learn on your phase  

**Footer:** Exasol Devjam · Team: [YOUR TEAM NAMES] · GitHub: `vacmar/mathaino`

**Speaker note:** 10 seconds. Name the product and Exasol.

---

## Slide 2 — Problem

**Title:** Learning platforms guess. Careers don’t.

**Bullets:**
- Fixed curricula ignore prior skills and odd/niche roles  
- “Mark complete” without proof creates fake progress  
- Chat tutors aren’t wired to unlock rules or durable learner state  
- Switching goals often wipes history instead of preserving tracks  

**Visual:** split — generic course list vs confused learner icon  

**Speaker note:** Pain = one-size paths + soft completion.

---

## Slide 3 — Solution

**Title:** Personalized path + interactive mastery on Exasol

**Bullets:**
- **Onboard once** (7 answers, any role including Other)  
- **AI authors** a dependency-aware path + capstone  
- **Backend owns** lock / unlock / mastery (LLM cannot cheat)  
- **Lesson focus UI** — tutor chat + rich notes, persisted  
- **Exasol Personal** stores accounts & learners; Redis speeds restore  

**Tagline:** The model teaches. Exasol + the API remember and decide.

---

## Slide 4 — Why Exasol

**Title:** Mandatory data platform — used for real

**Bullets:**
- Learner **accounts & profiles** in Exasol Personal (`exakit`)  
- Schema init + auth read/write through backend repository  
- Health check exposes `exasol_connected` for demo honesty  
- Analytics-ready foundation for skills, evidence, paths (schema in repo)  
- Local / AWS / Azure: same app stack; point `EXASOL_DSN` at Personal or cloud  

**Visual:** logo Exasol + `GET /health` screenshot snippet  

**Do not claim:** “every chat message only in Exasol” — be accurate: accounts in Exasol; path/lesson cache also Redis.

---

## Slide 5 — Architecture

**Title:** Three services, clear authority

**Diagram (boxes):**

```
Learner UI (Next.js)
    │
    ├─► Backend FastAPI ──► Exasol Personal
    │         │         └──► Redis (sessions, path/lesson cache)
    │         └─► AI service (path generate)
    └─► AI service (lesson chat) ──► Hugging Face LLM
```

**Callouts:**
- `POST /path/generate` → stages + capstone  
- `POST /chat/lesson` → scoped tutor JSON → UI shows prose  
- `POST /nodes/{id}/complete` → unlock next (state machine)

---

## Slide 6 — Product walkthrough

**Title:** Demo flow (what judges will see)

**Numbered:**
1. Sign up → Exasol-backed session  
2. Onboarding (Other role works)  
3. AI path — first node open, rest locked  
4. Focus lesson — chat + notes  
5. Confirm mastery → Progress + next unlock  
6. Projects — AI-recommended capstone  

**Visual:** 3 screenshots (Dashboard, Lesson, Path)

---

## Slide 7 — Hackathon differentiators

**Title:** What we optimized for Devjam

| Strength | Detail |
|----------|--------|
| Exasol-first auth | Personal required; documented run guide |
| Any role | Free-text Other → tailored AI stages |
| Honest AI | No free complete; tutor-gated mastery |
| Durable enough | Redis path restore; lesson sessions dual-write |
| Ship discipline | CI on PR; compose smoke on main |

**Also say:** Multi-track Duolingo-style switcher is the **next** product step (designed).

---

## Slide 8 — Roadmap (2-hour honesty)

**Title:** Shipped now vs next

**Shipped**
- Auth + onboarding + AI path + lesson tutor + notes  
- Sequential unlocks + progress  
- Run guide + demo script + this deck content  

**Next (post-deadline)**
- Multi-track goals (Backend ↔ Android like language switch)  
- Sandboxed code Run + project auto-eval  
- Full Exasol path/history analytics  

---

## Slide 9 — How to run

**Title:** Judge / mentor quick start

```bash
exakit start
cp .env.example .env   # HF key + Exasol password file
docker compose up --build
open http://localhost:3000
```

**Docs:** `README.md` · `docs/RUN_GUIDE.md` · `docs/demo-script.md`

---

## Slide 10 — Close / ask

**Title:** manthaino — LEARN on ur phase

**Closing line:**  
Adaptive careers need adaptive paths — grounded in Exasol, taught by AI, governed by software.

**Team:** [NAMES]  
**Repo:** https://github.com/vacmar/mathaino  
**Contact:** [EMAIL]

**Thank you — questions?**

---

## Optional appendix slides (only if needed)

### A1 — Tech stack list  
Next.js · FastAPI · LangChain · Hugging Face · Redis · Exasol Personal · Docker Compose  

### A2 — Security note  
HTTP-only cookies · secrets in `.env` · LLM cannot mutate unlocks  

### A3 — Metrics we care about (future)  
Time-to-first-unlock · nodes completed / week · path regen rate · Exasol query latency  

---

## Design tips for whoever builds the PPT

- Dark background; one accent color (avoid generic purple-glow cliché if possible — deep indigo + teal works)  
- Max **6 words** in titles; max **5 bullets** per slide  
- Prefer product screenshots over stock photos  
- Put Exasol logo on slides 1, 4, 10  
- Export **PDF** as well as PPT for the submission portal  

---

## 30-second verbal pitch (memorize)

> manthaino uses Exasol Personal for learner identity, generates an AI learning path for any career goal, and teaches each step in an interactive lesson where the backend—not the model—controls mastery and unlocks. That’s adaptive learning you can trust and demo in three minutes.
