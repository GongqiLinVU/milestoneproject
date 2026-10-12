# First Production Release Report

**Engineering Studio Platform — first usable hosted production release (non-AI).**

- Date: 13 October 2026.
- Scope: legacy classroom workflow is the default; **AI stays off**; the real
  November teaching Block is **not** configured or activated.
- Authorization: Joseph passed the local legacy-workflow rehearsal and authorized
  this merge, deployment and the two reviewed additive migrations.

This release is delivered as a usable increment, not an all-or-nothing launch.
A non-AI first release does not require every Sprint 9 R01–R09 item; AI and the
November Block configuration remain later, separately-gated steps.

---

## 1. Code release — PR, merged commit, deployed commit

| Item | Value |
|---|---|
| Pull request | [#68](https://github.com/GongqiLinVU/milestoneproject/pull/68) — "Sprint 9: first production release (legacy default, AI off)" |
| Release commit | `bcd2d45` (coherent Sprint 9 slice) |
| Release branch | `release/sprint9-first-production` |
| Merge commit on `main` | `6549171` (merge of PR #68; previous `main` was `96d2aee` / PR #67) |
| Base before release | `96d2aee` (whose second parent is the prior working HEAD `656f55f`) |

The release commit carries the server-authoritative per-Block Intake capability
(R01), the teacher Intake read workflow (R02), the visible/correctable testing
limitation (R03), the unsaved-exit guard (R05), the provider-independent
completion path (R06), and the two reviewed additive migrations. Local rehearsal
tooling (synthetic seed, `preview:api`, docs) is included but is inert to hosted
routing (governed by `vercel.json`) and is required by `npm test` and the
documented local workflow.

### Pre-merge validation (reused, not re-run broadly)

- `npm run build` — **PASS** (`tsc -b` + `vite build` clean).
- `npm test` — **134 / 134 PASS**.
- Only non-blocker: a `> 500 kB` chunk-size build warning (performance note; P2,
  not a launch blocker).

---

## 2. Deployment — production URL and result

| Item | Value |
|---|---|
| Production URL (alias) | https://milestoneproject-two.vercel.app/ |
| Student portal | https://milestoneproject-two.vercel.app/student |
| Teacher dashboard | https://milestoneproject-two.vercel.app/admin |
| Vercel deployment | `milestoneproject-eldvi5b1i` — **Ready** |
| Trigger | Push to `main` (merge `6549171`) auto-deployed to production |
| Routes | `/`, `/student`, `/admin` all **HTTP 200** |
| GitHub "Vercel" commit status | **success** (initially lagged as `pending` while the deployment was already Ready; the lag was cosmetic) |

The production alias `milestoneproject-two.vercel.app` resolves to the new
deployment `milestoneproject-eldvi5b1i` (confirmed via `vercel inspect`). The
production bundle hash differs from a local build hash, which is expected —
Vercel builds independently from the same source.

### Production configuration verification

- Client bundle references the intended production Supabase target
  `https://gwihaizxivclamzehupk.supabase.co`.
- **No `service_role` reference in the client bundle.** The client key is a
  publishable/anon key (`sb_publishable_…`), which is browser-safe by design.
- `SUPABASE_SERVICE_ROLE_KEY` exists in production **only as a server-side Secret**
  (not `VITE_`-prefixed, never shipped to the client).
- **Provider mock is off in production**: no `INTAKE_MOCK_PROVIDER` /
  `INTAKE_MOCK_ALLOW` variables exist in the production environment, and the
  endpoint's `resolveMockGate()` fails closed outside an isolated local runtime.
- **AI remains disabled**: the only active Block is `intake_mode = 'disabled'`,
  and the AI endpoint is reachable only for a Block explicitly set to `'ai'`.

---

## 3. Database upgrade — migrations previously missing and actually applied

A **read-only** production audit (anon-level, before any change) compared the
repository migrations with production and found exactly **two** additive
migrations pending; all other repository migration objects were already present,
and no schema drift was observed.

| Order | Migration | Object | Pre-apply state | Post-apply state |
|---|---|---|---|---|
| 1 | `20261008_sprint9_r02_teacher_intake_read.sql` | `get_teacher_session_intakes(uuid)` RPC | Missing (`PGRST202`) | Exists; anon denied (`42501`); `authenticated` + `is_teacher()` gated |
| 2 | `20261009_sprint9_r01_block_intake_mode.sql` | `teaching_blocks.intake_mode` column + re-created context/save RPCs | Column missing (`42703`) | Column exists; default `disabled`; RPCs exist, anon revoked |

- Both migrations are **additive**: a new read-only RPC (R02) and a new column
  with a safe default plus function re-creations that preserve prior bodies and
  only change the Block capability gate (R01). No table/row deletion, no
  destructive change, no drift repair, and **no modification of real teaching
  records**.
- Applied by **Joseph through the Supabase SQL Editor**, in order
  (`20261008` then `20261009`). No `supabase db push` was run.

### Post-migration authorization re-audit (read-only) — all PASS

- `teaching_blocks.intake_mode` exists; the only active Block (`2026 · 2B2`) is
  `disabled` — the legacy default, **not** auto-enabled.
- **Block modes remain disabled unless explicitly configured.** A forged
  anon `UPDATE intake_mode = 'ai'` was **refused** (`42501` permission denied on
  the table); the Block stayed `disabled`. Only `is_teacher()` may change it.
- `get_teacher_session_intakes` (R02) exists and refuses the anon role; a
  student token is refused with `Teacher access required`.
- The R01-re-created RPCs (`get_my_student_context`,
  `save_my_session_intake_chat` / `_ai` / `_fallback`, `get_my_session_intake`)
  all exist with anon correctly revoked and `authenticated` execute preserved.

---

## 4. Smoke test — result and known minor limitations

Executed against production with the **authorized test student account**
(`test001`), using clearly identified test records only. **No real student
submission was altered.**

| Step | Result |
|---|---|
| 1. Login | **PASS** — `test001` via `/api/student-login` → HTTP 200 |
| 2. Correct context | **PASS** — Block `2026 · 2B2`, Team 1, project "AI Agent for students"; `intakeMode = disabled` (legacy); status `activated` |
| 3. Legacy save | **PASS** — Session Check-in to the open Session 3 (`check_in_to_studio_session`) → HTTP 200; idempotent (no duplicate row) |
| 4. Reload | **PASS** — fresh re-login and journey re-read show the Session 3 check-in persisted |
| 5. Teacher read | **PASS** — Joseph confirmed in the teacher dashboard that `test001`'s Session 3 check-in is visible; teacher-only RPCs also refuse a student token |

### Known minor limitations (not blockers)

- **Legacy Work Track save (S6–S9) not exercised in production.** Those Sessions
  are teacher-gated and were `scheduled` (not open) at test time, so the Session
  Check-in — the currently-open legacy save — was used instead. The Work Track
  save path is verified on the isolated local stack but not re-exercised in
  production this round.
- **Account activation/recovery and S1→S2 carryover** were not exercised as
  rendered production flows this round.
- **AI path and live model quality** are intentionally out of scope (AI off).
- The `> 500 kB` chunk-size build warning (performance note only).

---

## 5. Rollback / recovery (appropriate to additive migrations)

Because both migrations are additive, rollback is low-risk and does not require
touching teaching records.

**Code / deployment rollback**

- In Vercel, promote the previous production deployment (the one built from
  `96d2aee`) back to the `milestoneproject-two.vercel.app` alias, or `git revert`
  the merge commit `6549171` on `main` and let the push redeploy.
- The deployed frontend degrades safely if the capability column is absent:
  `intakeMode ?? 'disabled'` keeps the legacy workflow working. Reverting the
  frontend without reverting the database is safe.

**Database rollback (only if required)**

- R02: `drop function if exists public.get_teacher_session_intakes(uuid);`
  (no table/row changes to reverse).
- R01: the capability column may be **left in place inert** (every Block defaults
  to `disabled`), which is the recommended choice. If removal is explicitly
  required, first restore the previous function bodies, then
  `alter table public.teaching_blocks drop column if exists intake_mode;`.
  Do **not** drop the column while a deployed function references it.

No data migration or destructive change needs to be reversed. Keeping the
additive objects in place is the safe default; a full revert is only needed if a
specific defect is found.

---

## 6. Repository state — continuing development from GitHub (e.g. in ChatGPT)

- Default branch `main` is at merge commit **`6549171`** and contains release
  commit **`bcd2d45`**. This is the authoritative baseline for the next
  increment.
- The release branch `release/sprint9-first-production` is pushed and merged; it
  can be deleted or kept for reference.
- Clone/pull `main` to continue:
  `git clone https://github.com/GongqiLinVU/milestoneproject.git` then work from
  `main` (or branch from `6549171`).
- Production environment variables live in Vercel (server-side Secrets). Never
  commit secrets. The Supabase publishable key is browser-safe; the service-role
  key and provider keys are server-only.
- The two Sprint 9 migrations are now part of the production schema; the next
  change must be a **new** additive migration (never edit an applied migration).

### What remains for later increments (not first-release blockers)

1. Resolve and configure the **real November teaching Block** (R08: code,
   timetable, Session dates/windows) — must not be guessed or activated until
   supplied.
2. Exercise **account activation/recovery** and **S1→S2 carryover** as rendered
   production flows.
3. **AI Intake** — gated on institutional approval and a separately budgeted
   live model-quality run; keep AI off until both exist.
4. R07 usage controls, R09 dataset/safety suite, and remaining P1/P2 items.

---

## Summary

| Dimension | Result |
|---|---|
| Deployment | **Done** — production live at `milestoneproject-two.vercel.app`, deployment Ready, routes 200 |
| Database upgrade | **Done** — two additive migrations applied in order and verified; no real records touched |
| Smoke test | **Pass** — login → context → legacy save → reload → teacher read, on the authorized test account |
| AI | **Off** (every Block `intake_mode = disabled`) |
| November Block | **Not configured/activated** (as required) |

The non-AI first production release is live and usable in the legacy classroom
workflow. Remaining work is staged for later increments.
