# Sprint 9 — Teacher Mode Selector & Fallback/History Rehearsal Report

Author: Claude (local execution). Plan/review: Joseph and ChatGPT.
Date: 11 October 2026. Language: English.

Rendered through a real headless browser (Chrome DevTools Protocol, no new
dependency) against the **isolated local Supabase stack** (`127.0.0.1`, not
linked, synthetic data only). No production/shared changes, no paid calls, no
commit/push/merge/deploy. This report records **actual** outcomes and marks
unverified paths explicitly. It does **not** claim classroom readiness, and
Sprint 8 Phase D remains open.

## 1. Changed files

- `src/main.tsx` (+158/−15) — three additions in `StudioSessionControl` and
  `LegacyStudentSessions`:
  1. **Teacher Block-level Intake mode selector** (`StudioSessionControl`):
     `modeOverride`/`modeBusy`/`modeMessage`/`modeError` state; an `effectiveMode`
     derivation; `setBlockMode()` that updates `teaching_blocks.intake_mode` and
     then **re-reads the row to confirm the persisted value before showing
     success**; a `.intake-mode-selector` panel with the three labelled options,
     a Block-wide explainer, and pending/error/success states. `setIntakeState`
     and `supportsIntake` now read `effectiveMode`.
  2. **Student read-only confirmed-Intake history** (`LegacyStudentSessions`,
     the `disabled`-mode branch): fetches which S1–S9 sessions have a confirmed
     Intake and renders a read-only "Confirmed Session Intake history" list that
     opens the existing read-only confirmed view. No submission path is added.
  3. **Teacher disabled-mode "Intake history" button**: for S1–S9 when
     `effectiveMode==='disabled'`, opens the existing read-only teacher Intake
     panel so confirmed records stay reachable.
- `docs/sprints/sprint-09/evidence/ui-rehearsal/` + `INDEX.md` — 26 screenshots.
- `docs/sprints/sprint-09/PLAN.md`, `HANDOFF.md` — reconciled status.
- (Carried from prior rounds, unchanged this round: R01/R02 migrations + audits,
  R01–R04 tests, the `endpoint.test.mjs` + adaptive-audit edits, and the dev-only
  `window.__supabase` hook — guarded by `import.meta.env.DEV`, **verified absent
  from the production `dist/` bundle**.)

No migration was changed this round; the mode selector reuses the existing R01
`teaching_blocks.intake_mode` column and the `"teachers manage teaching blocks"`
RLS. No further app-global test hooks were added.

## 2. Teacher mode selector — behaviour and rendered outcome

Labels, exactly as required: **Existing classroom workflow (disabled)** /
**Intake Form (deterministic)** / **AI Intake (ai)**. The panel explains the
choice "Applies to the whole … Block. Per-Session Intake availability is still
controlled separately below. The legacy Session Work Track applies to S6–S9."

Rendered outcomes (isolated stack, synthetic teacher `teacher@example.edu`):

- Selector present with the three labels and the explainer `[60]`.
- Selecting **Intake Form (deterministic)** → after the update the code
  **re-reads `intake_mode` and only then** shows the concise success "This Block
  now uses: Intake Form. Per-Session Intake availability is still controlled
  separately below." `[61]`. No repeated prompts; a single confirmation.
- DB persisted: `2B2 intake_mode=deterministic`; **session access was not reset**
  (`open_sessions=0` before/after the mode change) and no submitted record was
  altered.
- The session list immediately reflected the mode: **Intakes** controls shown,
  Work Track hidden (via `effectiveMode`).
- Setting back to **Existing classroom workflow (disabled)** → success message;
  the confirmed Intake row remained in the DB (`intakes=1`).
- Error path: `setBlockMode` surfaces a distinct error and does **not** show
  success if the update fails or the persisted value cannot be confirmed (not
  triggered under the teacher role; the branch is present and build-checked).

## 3. Rendered acceptance — student routing, fallback and history

Synthetic student `s1001` ("Ava Chen"), isolated stack, mocked/again-refused AI.

| Path | Rendered outcome | Evidence |
|---|---|---|
| Teacher selects deterministic → student routing | Student routed to "Start guided Intake"; Work Track hidden | `[60][61]`, prior `[10]` |
| Deterministic Intake submit (under UI-selected mode) | Fill → review (R03 limitation shown) → attest → "Session Intake confirmed" | `[62]`, detail `[25][26]` |
| Reload → read-only history | "Confirmed history · read-only", 0 editable fields | `[30][31]` |
| Teacher read | Intake panel "1 / 12 roster submitted · 11 missing"; executed-testing vs untested-limitation; "Teacher verification: Not recorded in Intake"; source conversation | `[41][42][43]` |
| Duplicate prevention (UI) | Confirmed session offers only the read-only view; no re-submit path | `[31]` |
| Mode change during a draft | Entered work preserved; on submit under `disabled` → "Session Intake can only be submitted while it is open", no success | `[50][51][52]` (prior round) |
| **Student history after return to `disabled`** | **Gap found** `[63]` then **fixed**: read-only "Confirmed Session Intake history" list; opening it shows "Confirmed history · read-only", 0 editable fields | `[63][64][65]` |
| **Teacher history after return to `disabled`** | **Gap found** (Intakes button hidden) then **fixed**: "Intake history" read-only button opens the panel ("1 / 12 roster submitted"); no access controls that reopen submission | `[66]` |
| Legacy Work Track (S6–S9) in `disabled` | Teacher opens S9 Work Track; student sees "Complete Track →"; the "Session Task + Work Track" modal opens | `[70][71]` |

Scope honesty:
- The legacy **Work Track applies to S6–S9 only** (never S1–S5). Only its **entry
  and modal reachability** were captured this round, not a full branching-form
  submission.
- **AI-mode selection does not prove AI conversation functionality.** The AI
  conversational path was not driven; it remains unverified.

## 4. Fallback identity (confirmed)

The classroom-tested **Session Work Track remains the student/teacher experience
when `intake_mode='disabled'`** (the default). The modes are mutually exclusive
per Block. The deterministic Intake Form is a **distinct new workflow** sharing
the Intake Evidence Contract/persistence; it is **not** the classroom-tested
fallback and no classroom validation is claimed for it from the old forms. The
two read-only history additions ensure a Block can return to the classroom
workflow **without losing access to** any Intake already confirmed.

## 5. Normal student login (no injection) — endpoint verified, rendered path blocked

- **Supported endpoint verified**: `POST /api/student-login` with
  `s1001 / Student123!` (no `window.__supabase` injection) returned
  `accessToken` + `refreshToken` against the isolated stack.
- **Concrete blocker (reported, not worked around)**: the rendered `/student`
  SPA **does not mount under `vercel dev`** — `GET /src/main.tsx` returns
  `index.html`, Vite raises "invalid JS … .html file format" (500), and `#root`
  stays empty, so the login form never renders. Plain `vite` renders the SPA but
  does not serve `/api/*`. Therefore an **end-to-end rendered, non-injected
  student login is blocked by the `vercel dev` + Vite module-serving defect**.
- Injected-session rendering is **not** counted as login/activation acceptance.

## 6. Evidence

26 screenshots in `docs/sprints/sprint-09/evidence/ui-rehearsal/` with
`INDEX.md` mapping each file to its scenario and outcome. Images were scanned for
JWT / `sb_secret` / `sb_publishable` / `service_role` / password strings before
being committed; **none were found**. Unavailable/not-covered evidence (AI path,
full Work Track submit, rendered login) is listed in the index.

## 7. Validation

- `npm run build` **PASS**; `npm test` **96/96 PASS**.
- Dev-only hook confirmed **absent from `dist/`** (tree-shaken).
- Isolated DB cleaned after evidence capture: all blocks `intake_mode='disabled'`,
  `student_session_intakes=0`, all sessions `intake_access`/`work_track_access`
  = `closed`.
- HEAD `656f55f` unchanged; nothing committed.

## 8. Remaining first-release blockers

1. **Rendered non-injected student login** — blocked by the `vercel dev` + Vite
   module-serving defect; needs a reliable local app+API harness.
2. **AI-mode rendered path** and the live `/api/session-intake-ai` endpoint; live
   paid extraction (bounded, hard cap $0.20, separate approval).
3. **S1→S2 carryover** as a rendered/deployed flow.
4. **Preview/production** acceptance of all Sprint 9 changes (nothing deployed).
5. **November teaching Block** unresolved; must not be guessed or activated.
6. Sprint 8 **Phase D** stays open until the above evidence exists.

## 9. One proposed next task

Resolve the local **app+API serving defect** (fix or work around `vercel dev` +
Vite module serving) so the SPA mounts while `/api/*` is served, then verify a
**real rendered student login** (no injection) end to end and the **AI-mode
rendered path with a mocked provider**. Keep a bounded paid live `ai` run and the
deployed carryover as separate explicit decisions, and keep Sprint 8 Phase D open
until that evidence exists.
