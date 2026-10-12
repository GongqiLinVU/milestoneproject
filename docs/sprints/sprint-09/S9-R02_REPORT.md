# Sprint 9 — R02 Implementation Report

Minimum secure teacher Intake read workflow.

Author: Claude (local implementation). Plan/review: Joseph and ChatGPT.
Date: 8 October 2026. Language: English.

## 1. Branch, HEAD and working tree

- Working branch: `integration-tests-m4-m10-m14`.
- **Committed HEAD**: `656f55f8f15ffbaadc95c37596f44d1af21a8e21`. Its tree is
  byte-identical to reviewed main `96d2aee` (PR #67 merge commit whose second
  parent is this HEAD; `git diff 96d2aee..HEAD` empty).
- **Working tree**: carries the uncommitted **R03** changes (from the previous
  round) **and** the **R02** changes added here. Nothing is committed this
  sprint. "Tree identical to baseline" describes the committed HEAD, not the
  working tree.
- The R03 work was preserved throughout this round (verified in `git status`:
  `M src/intakePolicy.ts`, `M src/main.tsx` still present and intact; the R02
  edits were additive to `src/main.tsx`).

## 2. Changed files

New (untracked):

- `supabase/migrations/20261008_sprint9_r02_teacher_intake_read.sql` — additive
  migration creating one function, `public.get_teacher_session_intakes(uuid)`.
- `supabase/scripts/sprint9_r02_teacher_intake_read_audit.sql` — read-only audit
  for the function's configuration, grants and authorization shape (prepared, not
  executed).
- `tests/ai-session-intake/adaptive/r02-teacher-intake-read.test.mjs` — nine
  focused offline regressions.
- `docs/sprints/sprint-09/S9-R02_REPORT.md` — this report.

Modified:

- `src/main.tsx` — teacher Intake panel in `StudioSessionControl` (types, state,
  loader with stale-response guard, button, modal). Additive to the file; the
  R03 edits in the same file are unchanged.

Updated documents: `PLAN.md`, `HANDOFF.md`, `S9-R03_REPORT.md` (baseline wording,
R02 status, R03 test labelling, R01 Block-code independence).

No table, column, policy, block, session or row was created or altered. No
migration was executed. No AI provider was called.

## 3. SQL access design

### Decision: SECURITY DEFINER function, not a direct RLS select

The RLS policy `"teachers read session intakes"` (`schema.sql:1866`) already lets
a teacher `SELECT` existing rows in `student_session_intakes`. That policy alone
cannot produce the **missing** entries this workflow needs — a roster student
with no row — because RLS filters rows that exist; it cannot invent an absence.
Surfacing "missing" requires the **roster as the list base**, left-joined to
intakes, and `student_roster` is not conveniently selectable by the
`authenticated` role for this shape. The narrowest pattern that satisfies the
requirement, and matches the existing `get_teacher_session_work_tracks`
convention, is a single `SECURITY DEFINER` function with an explicit
`is_teacher()` gate.

### Function `public.get_teacher_session_intakes(p_session_id uuid)`

- `language plpgsql`, `stable`, `security definer`, `set search_path = ''`
  (all referenced objects schema-qualified, e.g. `public.student_roster`,
  `public.studio_sessions`, `public.student_session_intakes`, `public.is_teacher`).
- First statement: `if not public.is_teacher() then raise ... 'Teacher access
  required'`. No anon/student path.
- Resolves the Block from the selected Session
  (`select ... from public.studio_sessions where id = p_session_id`). An unknown
  Session returns a well-formed empty payload (counts 0, empty `intakes`), not an
  error — matching the work-track convention.
- **List base = roster of the Session's Block**, left-joined to the confirmed
  intake for this Session and this student on
  `(session_id = v_session.id and block_id = v_session.block_id and student_id =
  roster.student_id)`. The `block_id` term makes it impossible for a row from
  another Block, and the `session_id` term for another Session, to attach here.
- Each roster row returns `submitted` (true iff an intake exists), the student
  identity and team, and — when submitted — `studentRecord` (the whole confirmed
  record, so `testing[].baseline_or_expected` is present verbatim),
  `sourceConversation`, `corrections` (from `student_confirmation -> corrections`),
  `studentAttestation`, and `teacherVerification = {status:'unset',
  recorded:false}`.
- **Historical preservation (orphans)**: a second pass collects confirmed intakes
  for this Session whose `student_id` has no matching roster row, and appends them
  flagged `onRoster:false`, counted as submitted. A confirmed record is therefore
  **never silently dropped** because its student left the roster.
- Returns `{ sessionId, sessionNumber, blockId, submittedCount, missingCount,
  intakes[] }`. `submittedCount` = roster-submitted + orphans; `missingCount` =
  roster rows with no intake.
- The function performs `SELECT` only. It writes nothing; the table has no
  writable teacher-judgement field, so teacher verification is reported as unset.

### Grants (least privilege)

```
revoke all on function public.get_teacher_session_intakes(uuid) from public;
revoke all on function public.get_teacher_session_intakes(uuid) from anon;
grant execute on function public.get_teacher_session_intakes(uuid) to authenticated;
```

The `authenticated` grant plus the in-function `is_teacher()` gate restricts the
effective caller to teachers (same model as `get_teacher_session_work_tracks`).

### Rollback

`drop function public.get_teacher_session_intakes(uuid);` — no table/policy/row
changes to reverse.

## 4. Teacher Intake panel (`StudioSessionControl`)

- New types `TeacherIntakeRow` / `TeacherIntakeData`.
- New state `intakeSession`, `intakeData`, `intakeLoading`, `intakeError`, and an
  `intakeRequestRef` **stale-response guard** keyed `` `${blockId}:${item.id}` ``.
  `openIntake` tags each request; when a response returns, it is dropped if the
  current request key has changed (teacher switched Block/Session) or if the
  payload's `sessionId` does not match the requested Session.
- An **Intakes** button appears in the existing `supportsIntake` controls (which
  are already gated to the `2B2` pilot Block via `supportsIntake`).
- The modal reuses the existing `.session-work-track-modal` /
  `.teacher-track-*` styles and shows:
  - **submitted / missing counts**;
  - per row: student name, student id, team (or "off-roster (history preserved)"),
    and a Submitted/Missing state;
  - for a submission: responsibility; progress claims (kind + percent); evidence
    (availability, reference, verification); **executed testing** (status, method,
    observed result) kept **distinct** from the **untested limitation**
    (`baseline_or_expected`); blocker + support; next action; source mode;
  - **teacher verification shown separately and "Not recorded (separate from this
    student claim)"**;
  - collapsible **source conversation** and **correction history**;
  - loading, empty and error states.
- No grading, AI summary or new verification subsystem was added.

## 5. Offline checks — actual results

```
npm run build  -> PASS; dist/assets/index-*.js 691.61 kB (large-chunk warning only)
npm test       -> tests 78 | pass 78 | fail 0   (65 prior + 4 R03 + 9 R02)
```

New regressions (`r02-teacher-intake-read.test.mjs`), all passing:

1. A **real** confirmed record (built by `buildFallbackStudentRecord`,
   validated by `validateIntakeStudentRecord`) exposes
   `testing[0].baseline_or_expected` in the exact shape the panel binds to.
2. An AI-appended untested path (via the real `applyEvidenceUpdates`) still
   reaches the limitation field.
3. Roster is the list base; a student with no intake is **missing**
   (submitted=false, studentRecord null).
4. An intake from another Block or another Session **never attaches**.
5. An off-roster confirmed intake is **preserved** (onRoster=false, counted
   submitted), not dropped.
6. Corrections and the unset teacher-verification separation are carried per row.
7. (Modelled) the function contract rejects a non-teacher before returning rows.
8. A superseded intake response is dropped by the request guard.
9. A session-mismatched payload is ignored for the current request.

**These offline tests do not prove the deployed SQL privileges.** Tests 1–6 and 8–9
exercise the real record builder/policy and faithful JavaScript models of the
SQL row algebra and the client guard. Test 7 is a **modelled** contract check.
The deployed `SECURITY DEFINER` config, `search_path`, `is_teacher()`
enforcement, `GRANT`/`REVOKE` and RLS can only be established by running
`supabase/scripts/sprint9_r02_teacher_intake_read_audit.sql` against a real
database (not executed here).

## 6. Migration requirements

- Apply `20261008_sprint9_r02_teacher_intake_read.sql` **after** the Phase 2A
  foundation (`20260903`) and the adaptive-intake migration (`20260916`) are in
  place (it depends on `student_session_intakes`, `student_roster`,
  `studio_sessions`, `teaching_blocks` and `public.is_teacher()`).
- It is additive (one new function + grant); it must be reviewed and then applied
  as its own migration, not by editing an applied migration.
- After apply, run the read-only audit script and retain the PASS/FAIL output.
- No frontend behaviour depends on the migration until it is deployed; until
  then the panel's RPC call returns an error and the panel shows its error state.

## 7. Limitations

- **Deployed privileges unverified**: the audit script has not been run; SQL
  authorization and RLS are asserted by design and by the modelled test, not by a
  database result.
- **Rendered UI unverified**: no browser/Supabase/authenticated teacher session
  was available offline; the panel JSX was type-checked and built but not
  rendered. The record/model tests are not UI proof.
- **Orphan display name**: an off-roster confirmed intake shows the `student_id`
  as the name (the roster, which held the human name, no longer has the row). This
  is intentional — the record is preserved rather than hidden — but the display
  name is the id.
- **Scope**: read-only. No teacher verification/write path, no grading, no
  analytics were added. The panel is gated to the `2B2` pilot via the existing
  `supportsIntake`; a general per-Block capability is R01.
- Sprint 8 Phase D and the R03 rendered-UI acceptance remain **open**.

## 8. One proposed next task

Implement **R01 — one server-authoritative, opt-in per-Block Intake capability**
(`teaching_blocks.intake_mode in ('disabled','deterministic','ai')`, additive
migration), and align the four current `2B2` gates (student routing
`src/main.tsx:834`, teacher controls `src/main.tsx:2364,2398`, the AI endpoint
`api/session-intake-ai.ts:42`, and the save RPC) to read this capability from
trusted server context instead of the display-label regex. The generic
capability and its offline tests can proceed **now without the November Block
code**; only configuring/activating the real Block (R08) needs it. This lets the
R02 teacher read and the R03 limitation apply to the real teaching Block safely.
