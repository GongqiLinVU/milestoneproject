# NIT3004 Engineering Studio — Local Release Candidate

A **local, hands-on release candidate** for Joseph to rehearse the course on his
own machine. It runs entirely against an **isolated local Supabase stack with
synthetic data** — nothing here touches the shared/production database, and no
paid AI calls are made.

- **Default workflow:** the **legacy classroom workflow** (Session Check-in,
  Weekly Activities, Session Work Track). This is the first-release experience.
- **Deterministic Intake:** available for testing — the teacher switches it on
  from the dashboard. It needs **no AI provider**.
- **AI Intake:** **OFF** for this release candidate. (Any "mock provider" is a
  local test harness only and must not be confused with live AI — see
  [AI is off](#ai-is-off-for-this-candidate).)

> This is a **local rehearsal**. Local serving is **not** proof of hosted
> production acceptance. The active Block `2026 · 2B2` is a **synthetic rehearsal
> Block**, not the real November teaching Block (that code is still unresolved and
> must not be guessed or activated).

---

## 1. Prerequisites (one time)

- Node.js (already used for this repo), `npm install` done.
- Docker running (for local Supabase).
- Supabase CLI and Vercel CLI installed (`supabase`, `vercel`).
- A `.env.local` file with the **local** Supabase values (see `.env.example`).
  The values come from `supabase status`. Required keys:
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`,
  `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
  (`OPENAI_API_KEY` is **not needed** for this candidate.)

---

## 2. Start / stop / reset

### Start (first run)

```bash
# 1. Start the local database (Docker).
supabase start

# 2. Load the synthetic classroom fixture (idempotent).
npm run seed:local

# 3a. Serve the PRODUCTION build with API routing (recommended for rehearsal):
npm run preview:api
#     -> open  http://localhost:4173
#
# 3b. OR serve the DEV build (hot reload) with API routing:
npm run dev:api
#     -> open  http://localhost:5173
```

### URLs and logins

| What | URL |
|---|---|
| Student portal (prod preview) | `http://localhost:4173/student` |
| Teacher dashboard (prod preview) | `http://localhost:4173/admin` |
| Student portal (dev) | `http://localhost:5173/student` |
| Teacher dashboard (dev) | `http://localhost:5173/admin` |

> **Production preview binds IPv6 `localhost`.** Use `http://localhost:4173`,
> **not** `http://127.0.0.1:4173` (the latter returns no response). The dev
> server (`:5173`) works on both.

### Stop

Press `Ctrl+C` in the terminal running `preview:api` / `dev:api` (it stops both
the frontend and the API functions). To stop the database:

```bash
supabase stop
```

### Reset (explicit, destructive to local synthetic data only)

Reset is **deliberate** and never automatic. It wipes the local database and
re-applies all migrations, then re-seeds the fixture:

```bash
supabase db reset        # wipes LOCAL db, re-applies migrations
npm run seed:local       # re-creates the synthetic classroom fixture
```

A **soft refresh** of the fixture (without wiping the database) is just
`npm run seed:local` again — it is idempotent and restores the intended Session /
week / workflow controls.

> **Fixture data persists** between runs. After you finish, the synthetic
> classroom stays in the local database so Joseph can keep testing; nothing is
> cleared automatically.

---

## 3. Synthetic logins

Password for **all** students: `Student123!`

| Role | Login | Password |
|---|---|---|
| Teacher | `teacher@example.edu` | `LocalTeacher123!` |
| Student (Team 1) | `s1001@student.vu.edu.au` … `s1004@…` | `Student123!` |
| Student (Team 2) | `s1005@student.vu.edu.au` … `s1008@…` | `Student123!` |
| Student (Team 3) | `s1009@student.vu.edu.au`, `s1010@…` | `Student123!` |

The student login screen accepts the **student id** (e.g. `s1001`) and the
password.

---

## 4. Block / team / project setup

- **Active rehearsal Block:** `2026 · 2B2` (synthetic; **not** the November
  Block). Workflow default: **legacy** (`intake_mode = disabled`).
- **Archived Blocks (untouched):** `2026 · 1B4` and `2026 · 2B1` (history).
- **Roster:** 10 students across **3 teams** (4 / 4 / 2).
- **Projects (one per team):**
  - Team 1 → **EduPath AI Tutor**
  - Team 2 → **TriageAssist Health Companion**
  - Team 3 → **FarmSense Crop Advisor**
  - (Two extra projects — SignBridge, EcoRoute — exist as published options.)
- **Sessions:** S1–S10 exist. **S7 is the current open Session** (Check-in +
  Work Track). **S6–S9** have the Work Track open. **S1–S9** have Intake access
  open (used only if the teacher turns on deterministic Intake).
- **Class Activities:** **Weeks 1–4 are open.**

The teacher can open/close Sessions, weeks and Intake from the dashboard — these
are deliberate controls, not fixed.

---

## 5. Teacher / student walkthrough

### Teacher (dashboard, `/admin`)

1. Sign in as `teacher@example.edu`.
2. Confirm the active Block `2026 · 2B2`, the roster, teams and projects, and the
   current Session records.
3. Open/close a Session, toggle a Week's activities, and open/close the Work
   Track — observe the student side reflect it.
4. Review a student's submitted **Work Track** (and, if deterministic Intake is
   enabled, the **Intakes** panel).
5. **To test deterministic Intake:** use the Block **Intake mode** selector to
   switch `2B2` to **deterministic (Form)**. Switch it back to **disabled** to
   return to the legacy default. **Do not** select AI for this candidate.

### Student (portal, `/student`)

1. Sign in as `s1001` / `Student123!`.
2. Confirm the context: **Team 1**, project **EduPath AI Tutor**, Block
   `2026 · 2B2`.
3. **Legacy workflow (default):** check in to the open Session (S7), open the
   **Class Activities** (Weeks 1–4), and complete the **Session Work Track** for
   S7 (assess the three core requirements with the 0/25/50/75/100 scale, set
   readiness and blocker). Save, reload, and see it as saved.
4. If the teacher enabled **deterministic Intake**, the portal switches to the
   Intake-first layout and the Session entry opens the **deterministic Form**
   (no AI). Fill it, review (the testing-limitation line is shown), attest,
   submit; reload shows read-only confirmed history.

### Smoke-tested chain (reused evidence)

The data path **student login → correct context → one submission (S7 Work Track)
→ reload → teacher read** was exercised against this exact local fixture and
passed, as did the **deterministic Intake routing** switch (teacher sets Form →
student context routes to the Form → restored to legacy). No AI was used.

---

## 6. Known issues

### Release blockers (must fix before a production release)
*None identified for the non-AI first release.* The legacy classroom workflow and
the deterministic Intake are usable locally end-to-end.

### Acceptable minor issues (do not block the local rehearsal)

- **IPv6-only production preview.** `vite preview` serves on IPv6 `localhost`;
  use `http://localhost:4173`, not `127.0.0.1`. (Dev `:5173` is unaffected.)
- **Two local processes.** Local app + API run as two processes (frontend +
  `vercel dev`) because `vercel.json`'s SPA rewrite is for hosted routing. This is
  a local-serving detail only; hosted routing is unchanged. One command
  (`npm run preview:api` / `dev:api`) starts both.
- **Build chunk-size warning.** The production build prints a >500 kB chunk
  warning. It is a performance note, not a functional blocker.
- **AI Intake not exercised.** By design for this candidate (see below).
- **R05 unsaved-exit guard** (deterministic/AI Intake) is unit-verified but its
  rendered browser behaviour is not part of this legacy-default rehearsal.

### AI is off for this candidate

AI Session Intake is intentionally **not enabled**. The repository contains a
**local provider-transport mock** used only for isolated testing; it is
positively gated to an isolated local runtime and **cannot** reach a paid
provider or run in Preview/production. **Mock testing is not live AI** and must
not be reported as model-quality evidence.

---

## 7. What remains to deploy the first production version (non-AI)

A **non-AI first release does not require every R01–R09 item.** The remaining
work for a first hosted production release of the legacy + deterministic workflow:

1. **Resolve the November teaching Block identity** (Joseph) — the real Block code
   and timetable. This blocks **R08** (actual Session dates/activation), not the
   generic workflow.
2. **Apply the reviewed migrations to the hosted database** (`20261008`,
   `20261009`) and run the read-only audits there.
3. **Preview deployment acceptance:** deploy to a Preview environment and re-run
   the login → context → submission → reload → teacher-read rehearsal **against
   Preview** (hosted routing via `vercel.json`, not the local two-process setup).
4. **Configure the real Block** (R08): correct S1–S10 dates/windows, open the
   intended current Session, and verify continuing-student enrolment.
5. **Operational checks** not exercised locally: account **activation/recovery**
   and **S1→S2 carryover** as rendered flows.
6. **Keep AI off** until (a) the applicable institutional AI approval exists and
   (b) a separately approved, budgeted live model-quality run is done. AI is a
   **later staged improvement**, not a first-release dependency.

See `docs/sprints/sprint-09/PLAN.md` and `docs/sprints/sprint-09/HANDOFF.md` for
the incremental release sequence.
