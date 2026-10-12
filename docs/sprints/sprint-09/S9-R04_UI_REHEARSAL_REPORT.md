# Sprint 9 — R04 Rendered-UI Teaching Rehearsal Report

Rendered browser rehearsal of the student→teacher workflow on the isolated local
environment, plus the fallback-identity resolution and the phase2a audit
exception.

Author: Claude (local execution). Plan/review: Joseph and ChatGPT.
Date: 11 October 2026. Language: English.

This report records **actual rendered-UI outcomes** driven through a real
headless browser against the isolated local stack, kept separate from SQL/RPC
evidence. It does **not** claim classroom readiness; required paths that remain
unverified are listed in §6.

## 1. Fallback identity — the classroom-tested Session Work Track remains usable

Three distinct workflows, with the following **actual entry paths** (traced in
`src/main.tsx`):

| Workflow | Student entry | Teacher entry | Data path |
|---|---|---|---|
| **Session Work Track** (classroom-used, S6–S9) | `LegacyStudentSessions` renders a **Work Track** button per S6–S9 session when `intake_mode='disabled'` (the non-pilot path) | `StudioSessionControl`: Work Track controls render under `supportsTrack && !supportsIntake` | `save_my_session_work_track` → `student_session_work_tracks` → `get_teacher_session_work_tracks` |
| **Deterministic Intake Form** | `StudentPortal` routes to `StudentSessions` (Intake-first) when `intake_mode='deterministic'`; the per-session entry is **Start guided Intake** (`FormSessionIntakePrototype aiEnabled=false`) | Teacher sees Intake session-access + the **Intakes** read panel when `intake_mode!=='disabled'` | `save_my_session_intake_fallback` → `student_session_intakes` → `get_teacher_session_intakes` |
| **AI Intake** | Same routing when `intake_mode='ai'`; entry opens `SessionIntakeModal` (chat) | same as deterministic | `save_my_session_intake_chat`/`_ai` → `student_session_intakes` → `get_teacher_session_intakes` |

**Finding: a safe teacher-selectable legacy fallback already exists.** When the
Block's `intake_mode='disabled'` (the migration default), the student portal
renders `LegacyStudentSessions` and the **Session Work Track remains fully
reachable** for S6–S9; the teacher sees the Work Track controls. The three modes
are **mutually exclusive per Block** (a Block runs Work Track *or* the Intake,
not both at once). `disabled` is therefore the classroom-tested fallback, and it
is selected simply by leaving/setting the Block to `disabled`. **No change is
required to preserve the legacy fallback, and the new deterministic Form is NOT
redefined as the classroom-tested fallback.**

**Smallest-change gap (reported, not implemented):** there is **no teacher UI
control to set `intake_mode`** — the dashboard only exposes per-session
`intake_access` (open/close/follow). The capability is currently changed only via
SQL/RLS (teacher-only, verified). For the first release's "teacher explicitly
chooses Form or AI", the smallest required change is a teacher-dashboard
`intake_mode` selector (a `<select>` writing `teaching_blocks.intake_mode`,
reusing the existing `"teachers manage teaching blocks"` RLS). Compatibility:
additive UI only; default stays `disabled`; no migration needed (the column and
RLS already exist from R01). This is listed as a first-release blocker in §6.

## 2. Rendered browser acceptance — outcomes and evidence

**Tooling / method (no scope expansion):** the project has no browser-automation
dependency, and none was added. The rendered UI was driven with **headless
Chrome (already installed) over the DevTools Protocol using Node's built-in
`WebSocket`** (Node v25) — zero new packages. The app was served by **plain
`vite`** (`localhost:5173`) against the isolated local Supabase stack. Synthetic
student sessions were established by fetching a token from the **local GoTrue
REST** endpoint and calling `supabase.auth.setSession` through a **dev-only
`window.__supabase` hook** (guarded by `import.meta.env.DEV`; verified
tree-shaken out of the production `dist/` bundle). The teacher signed in through
the **real `/admin` login form** (`signInWithPassword`). AI mode was not driven
live (deterministic focus; mocked/again-refused provider).

**Concrete blocker found and resolved:** `vercel dev` (needed for `/api/*`)
**mis-serves Vite modules** — `GET /src/main.tsx` returned `index.html` and Vite
raised `Internal server error: … invalid JS syntax … .html file format`, leaving
`#root` empty. This is a `vercel dev` + Vite dev-command integration issue. Plain
`vite` serves modules correctly, so the rehearsal used plain `vite` + direct
`supabase.rpc` calls (the deterministic Form needs no `/api/*` function). The
`/api/student-login` 503 under `vercel dev` was separately traced to env not
reaching the function runtime and resolved by exporting `.env.local` into the
process — recorded for completeness, not required for this rehearsal.

**Rendered outcomes** (browser evidence — screenshots in `/tmp/cdp-rehearsal/`):

| # | Scenario | Rendered result | Screenshot |
|---|---|---|---|
| 1 | Student enters correct workflow (deterministic) | Portal loads as synthetic `s1001` "Ava Chen · Team 1"; S9 shows **Start guided Intake**; **Work Track button absent** | `10-portal.png` |
| 2 | Student fills Form (steps 1–3) | Responsibility/progress/scope, evidence, **executed testing + "Expected result or baseline" (untested limitation)**, next action entered | `21`–`23` |
| 3 | Review + testing limitation visible | Step 5 review shows "TESTING executed · … Expected / limitation: **Not tested by student: the API error branch**" | `25-step5-review.png` |
| 4 | Attest + submit | "**Session Intake confirmed.** Your claims still require Teacher verification." | `26-after-submit.png` |
| 5 | Reload → read-only history | "Confirmed history · read-only", "Intake confirmed", **0 editable textareas** | `30`,`31` |
| 6 | Teacher sees submission + roster counts | `/admin` → Studio Sessions · 2026 2B2 → S9 **Intakes** panel: "**1 / 12 roster submitted · 11 missing**" | `40`,`41` |
| 7 | Teacher sees limitation + separation | Detail: "EXECUTED TESTING executed · … observed: Spinner…" distinct from "**UNTESTED LIMITATION** Not tested by student: the API error branch"; "**TEACHER VERIFICATION Not recorded in Intake (teacher judgement is separate)**"; Source conversation present | `42`,`43` |
| 8 | Duplicate submission prevented (UI) | Confirmed session offers only the read-only "View confirmed Intake"; no re-submit path | `31` (+ RPC-level duplicate proven in the SQL round) |
| 9 | Mode change during a draft | Opened an S1 catch-up draft (work entered); teacher set `2B2=disabled` mid-draft; **entered work preserved** through step 4 → review | `50-draft-before-disable.png` |
| 10 | Disabled prevents submission without success | On submit: message "**Session Intake can only be submitted while it is open**"; **no "confirmed" success shown**; **work still present** after the rejected submit | `52-disabled-submit-rejected.png` |

**Evidence separation.** The above are **rendered-browser** results (DOM reads +
screenshots). The **SQL/RPC** authorization results (save gating by mode,
non-teacher UPDATE denied, cross-student/cross-session isolation, off-roster
counts) were established in the prior round's execution report and are **not**
re-counted here as browser evidence.

**Accuracy note (not a blocker):** on a disabled-mode submit the deterministic
Form surfaces the raw RPC message ("…can only be submitted while it is open").
It is accurate and preserves work, but is less specific than the chat modal's
tailored "AI Intake is no longer available…" message. A clearer deterministic
message is a small future polish.

## 3. phase2a audit exception — resolved

- **Exact assertion** (`sprint8_phase2a_security_audit.sql`):
  `'Existing Sessions default Intake closed'` =
  `not exists (select 1 from public.studio_sessions where intake_access <> 'closed')`.
- **Expected:** no session has `intake_access <> 'closed'` — i.e. applying the
  Phase 2A migration (column default `'closed'`) does not open any session.
- **Actual (before):** S1–S9 had `intake_access='open'` (S10 closed) → FAIL.
- **Root cause:** the **local seed fixture** (`seed-local-testdata.mjs`)
  deliberately opened S1–S9 for the mock pilot. The migration default is correct;
  no migration opens sessions.
- **Real-config impact:** none. The assertion verifies migration behaviour; in a
  real environment sessions default to `closed` and a teacher opens them
  deliberately. The seed script is local-only and never runs against production.
- **Correction (isolated fixture):** reset the seeded sessions'
  `intake_access` to `'closed'` in the isolated DB (the migration default), then
  re-ran the audit → **PASS**.

After the fix, all four read-only audits report **0 FAIL**:
`sprint9_r01` (6 PASS + 1 informational REVIEW — the table-grant-vs-RLS note,
empirically confirmed: a non-teacher `UPDATE intake_mode` affects 0 rows),
`sprint9_r02` (16/16), `sprint8_phase2a` (now PASS), `sprint8_adaptive` (9/9).

## 4. Fixes, regressions and build

- **Small fix this round:** added a **dev-only `window.__supabase` hook** in
  `src/main.tsx`, guarded by `import.meta.env.DEV`, to enable the isolated
  rendered rehearsal's session injection. Verified **absent from the production
  `dist/` bundle** (tree-shaken). No production behaviour changes.
- **Isolated-fixture fix:** reset seeded `studio_sessions.intake_access` to
  `'closed'` (synthetic-data correction, cleaned up).
- Offline: `npm run build` **PASS**; `npm test` **96/96 PASS**.
- **Cleanup:** deleted all synthetic intakes (`student_session_intakes = 0`),
  reset all blocks to `intake_mode='disabled'` and all sessions to
  `intake_access='closed'`, and stopped the dev servers and headless Chrome.

## 5. Confirmed teacher mode-control behaviour

- The **server-authoritative capability** works end-to-end: setting
  `teaching_blocks.intake_mode` (teacher-only via RLS) changed the student's
  rendered routing (deterministic → "Start guided Intake"; disabled → Work Track
  path / submission refused) and the teacher's rendered controls.
- **However, mode selection has no rendered teacher control** — it was performed
  via SQL in this rehearsal. The teacher dashboard exposes only per-session
  `intake_access`. "Teacher explicitly chooses Form or AI" is therefore **not yet
  demonstrable through the UI** (see §1 gap and §6).

## 6. Remaining first-release blockers

1. **No teacher UI to select `intake_mode`** (Form vs AI vs disabled). Smallest
   change: a dashboard `intake_mode` selector writing `teaching_blocks.intake_mode`
   (RLS + column already exist; additive, no migration). **Required** for the
   first-release "teacher chooses Form or AI" criterion.
2. **AI mode not rendered-verified**: the live `ai` conversational path and the
   `/api/session-intake-ai` behaviour under a correctly-wired dev server are not
   browser-verified (endpoint zero/one-call is covered only by offline runtime
   tests). The deterministic Form release does not depend on this.
3. **`vercel dev` + Vite module-serving defect** blocks a single-server local run
   of app + API; the production Vercel build is unaffected, but a reliable local
   full-stack harness is still needed for AI-path UI testing.
4. **Deterministic disabled-submit message** could be more specific (polish).
5. **November teaching Block** remains unresolved; configuring/activating a real
   Block is out of scope and must not be guessed or activated.
6. **Sprint 8 Phase D** is **not** closed: the deterministic student→teacher UI
   path is now rendered-verified on the isolated stack, but AI-path UI and live
   extraction remain open.

## 7. Verified this round vs still open

**Verified (rendered browser, isolated, synthetic):** deterministic student
routing; Form fill → review (with R03 limitation) → attest → submit; reload
read-only confirmed history; teacher Intake panel with roster vs missing counts,
executed-testing-vs-untested-limitation separation, teacher-verification-unset,
source conversation; UI duplicate prevention (read-only confirmed view);
mode-change-during-draft work preservation; disabled-mode submission refused with
no success shown. phase2a audit exception resolved; all four audits 0 FAIL.

**Still open:** teacher `intake_mode` selector UI; AI-mode rendered path and live
extraction; reliable local app+API harness; Sprint 8 Phase D closeout.

## 8. One proposed next task

Implement the **teacher `intake_mode` selector** in `StudioSessionControl`: a
small per-Block control (`disabled` / `deterministic` / `ai`) that updates
`teaching_blocks.intake_mode` through the existing teacher-only RLS, with a
confirmation and a clear statement that it switches the whole Block between the
classroom Work Track (disabled), the deterministic Form, and AI Intake. Then
re-run this rendered rehearsal driving the mode change **through the UI** instead
of SQL. Keep AI-path UI and live extraction open until separately verified.
