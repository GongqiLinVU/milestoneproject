# Sprint 9 — R04 Execution Report

Isolated authenticated-acceptance execution for the combined R01 + R02 + R03
changes, including the Form / AI Intake compatibility check.

Author: Claude (local execution). Plan/review: Joseph and ChatGPT.
Date: 11 October 2026. Language: English.

This report records **actual** execution against an isolated local database. It
does **not** close Sprint 8 Phase D in full and does **not** claim classroom
readiness. Items that were not executed are marked explicitly and are **not**
replaced with offline/model results reported as passed.

## 1. Environment identity and migration results

**Isolated environment (confirmed before any change):**

- Database: `postgresql://postgres:postgres@127.0.0.1:54322/postgres` — local
  Supabase Docker stack (`supabase_db_milestoneproject`, Postgres 17.6).
- API: `http://127.0.0.1:54321`. Studio `:54323`, Mailpit `:54324`.
- `supabase status` reports **Not linked** (no `supabase/.temp/project-ref`); the
  stack cannot reach any remote/production project. Keys are the standard local
  demo keys (not production secrets; redacted here).
- **Synthetic-only data confirmed** before migrating: auth users
  `s1001…s1010@student.vu.edu.au`, `t1bench01/02@student.vu.edu.au`,
  `teacher@example.edu`; blocks `2026 1B4 archived`, `2026 2B1 archived`,
  `2026 2B2 active`; `student_roster=12`, `student_accounts=12`,
  `student_session_intakes=0`, `studio_sessions=10`. No real names or PII.

**Migration sequence applied (isolated DB only):**

1. `20261008_sprint9_r02_teacher_intake_read.sql` → `CREATE FUNCTION … COMMIT`
   (clean).
2. `20261009_sprint9_r01_block_intake_mode.sql` → `CREATE FUNCTION … COMMIT`
   (clean).

Post-migration verification: `teaching_blocks.intake_mode` present, default
`disabled`; **all three existing blocks `disabled`** (nothing auto-enabled);
CHECK `in ('disabled','deterministic','ai')`; `get_teacher_session_intakes`
present; `get_my_student_context` exposes `intakeMode`.

**Read-only audits (actual results):**

| Audit | Result |
|---|---|
| `sprint9_r01_block_intake_mode_audit.sql` | 6 PASS + 1 REVIEW |
| `sprint9_r02_teacher_intake_read_audit.sql` | 16 / 16 PASS |
| `sprint8_phase2a_security_audit.sql` | 9 PASS + 1 FAIL + 1 CHECK (see below) |
| `sprint8_adaptive_intake_security_audit.sql` | 9 / 9 PASS (after a 1-line audit fix) |

Audit result interpretation:

- **R01 REVIEW** — "anon/authenticated cannot directly UPDATE … capability":
  `teaching_blocks` grants table `UPDATE` to `authenticated`, so the privilege
  check flags REVIEW. The real gate is RLS; **empirically verified** below
  (acceptance Row 9: a non-teacher `UPDATE intake_mode` affects 0 rows).
- **phase2a FAIL** — "Existing Sessions default Intake closed": the seed fixture
  (`seed-local-testdata.mjs`) deliberately set 9 of 10 `studio_sessions` to
  `intake_access='open'` for the mock pilot. This is pre-existing **seed state**,
  not a migration defect; no R01/R02/R03 migration opens sessions. (The companion
  "No 2B2 block auto-created = CHECK" is likewise the seeded mock block.)
- **adaptive FAIL → fixed** — "Chat RPC restricts 2B2" failed because R01
  **intentionally** replaced the hardcoded `block_code='2B2'` gate with the
  `intake_mode in ('deterministic','ai')` capability. The reused Sprint 8 audit
  still searched for the literal `2B2`. Fixed with the smallest change (§5): the
  check now accepts the 2B2 form (pre-R01) **or** the `intake_mode` form
  (post-R01) and now PASSes. The R01 audit independently asserts the new gate.

## 2. Old Form vs deterministic Intake — findings

Three distinct form-based workflows exist; they are **not** the same workflow:

| Workflow | UI entry | Fields / validation | Save RPC | Stored table | Teacher read |
|---|---|---|---|---|---|
| **Week 2 Progress Pre-check** (classroom-used, Sprint 3) | `ProgressReviewFields` | Week-2 pre-check questions | anon insert / weekly activation | `week2_progress_reviews` | Review & Follow-up |
| **Session Work Track** (classroom-used S6–S9, Sprint 6/7) | `SessionWorkTrackModal` | per-session progress path + requirement scores | `save_my_session_work_track` | `student_session_work_tracks` | `get_teacher_session_work_tracks` |
| **Deterministic Session Intake** (Sprint 8, this feature) | `FormSessionIntakePrototype` | Evidence Contract (responsibility / claim / evidence / testing / blocker / next action) | `save_my_session_intake_fallback` / `_ai` | `student_session_intakes` | `get_teacher_session_intakes` (R02) |

**Classification: different workflow, with shared Intake internals.**
`FormSessionIntakePrototype` is the **deterministic variant of the new Session
Intake** — it reuses the Intake Evidence Contract, `buildFallbackStudentRecord`,
`validateIntakeStudentRecord` and the Intake persistence/RPCs. It is **not** the
previously classroom-used Week 2 or Work Track form. It was **mock-piloted in
Sprint 8** (synthetic students), **not classroom-validated**. No classroom
validation of this Form is claimed from the older forms' classroom use.

**First-release Form / AI explicit-choice requirement — assessment:**

The requirement is **met by the existing R01 server-authoritative
`intake_mode`**; no substantial redesign was required or performed.

| Sub-requirement | How it is met | Evidence |
|---|---|---|
| Teachers explicitly choose Form or AI | `intake_mode` `deterministic` = Form, `ai` = AI, `disabled` = off; teacher-only via RLS | Row 15 (teacher sets mode), Row 9 (non-teacher denied) |
| Form works without provider calls | `deterministic` routes to `FormSessionIntakePrototype aiEnabled={false}`; AI endpoint refuses non-`ai` | Row 4 (deterministic save, no model), Row 10, offline RT |
| Mode changes preserve work + require student review before saving | chat modal mode-change handler → review (D4 fix, R04 pre-check); Form keeps React state and the RPC rejects an unauthorised save (no silent loss) | offline RT (D4), Row 19 |
| Confirmed history readable and unchanged | `get_my_session_intake` ungated by mode | Row 7 (readable under `disabled`) |
| Switching modes cannot bypass permissions or duplicate | save RPCs gate on `intake_mode`; `unique(session_id, student_id)` | Row 6 (duplicate), Row 10 (gate), Row 9 (permission) |

**Documented gap (not expanded this round):** the deterministic Form has no
*proactive* in-progress mode-change banner (only the chat/AI modal does). If a
teacher flips `deterministic → disabled` mid-form, the student's save is rejected
by the RPC and their entered answers remain in React state (no silent loss), but
there is no proactive message until they try to save. This is acceptable for
first release and is noted as a future enhancement, not a blocker.

## 3. Acceptance results (actual)

Executed against the deployed RPCs on the isolated DB, impersonating synthetic
users by setting `request.jwt.claims` (`sub`, `app_metadata.role`) inside a
transaction with `role authenticated` so RLS is enforced. Evidence classes:
**DEP** = deployed RPC/SQL result this round; **RT** = offline runtime test
(actual compiled code); **UI** = rendered browser (NOT run); **LIVE** = live
provider (NOT run).

| # | Scenario | Expected | Actual | Status |
|---|---|---|---|---|
| 15 | Teacher sets Block mode | `UPDATE 1` | `UPDATE 1`, 2B2 → mode | **DEP PASS** |
| 9 | Non-teacher UPDATE `intake_mode` | denied | `UPDATE 0`; 2B2 unchanged; `is_teacher()=false` | **DEP PASS** |
| 1–3 (routing source) | `get_my_student_context.intakeMode` = server value | reflects server | `intakeMode=deterministic` returned to student | **DEP PASS** |
| 4 | Form save in `deterministic` | saved, no model call | `sourceMode=deterministic_fallback` | **DEP PASS** |
| 5 | Reload after save | confirmed record + limitation | `confirmed=true`; `baseline="Not tested by student: the API error branch"` | **DEP PASS** |
| 6 | Duplicate submission | rejected | `This Session Intake has already been confirmed` | **DEP PASS** |
| 10 | `save_my_session_intake_ai` in `deterministic` | rejected (gate) | eligibility rejection ("…only be submitted while it is open") | **DEP PASS** |
| 3 (mode gate flip) | `_ai` eligibility passes only in `ai` | deterministic→eligibility reject; ai→past eligibility | ai reached conversation validation (line 72); deterministic rejected at eligibility | **DEP PASS** |
| 11 | Cross-student read | own only | s1002 sees `confirmedRecord:null`; **0 rows** via RLS | **DEP PASS** |
| 8 | Teacher roster counts (S1) | separated | `rosterSubmitted=1 rosterSize=12 missing=11 offRoster=0` | **DEP PASS** |
| 12 / 15 | Off-roster history (S2) | counted separately, not inflating roster | `rosterSubmitted=0 rosterSize=12 missing=12 offRoster=1 total=1`; ghost900 `onRoster=false submitted=true` | **DEP PASS** |
| 7 | Confirmed history readable when `disabled` | readable | `confirmedRecord present=true` | **DEP PASS** |
| 19 | Save refused when `disabled` | rejected, no success | eligibility rejection | **DEP PASS** |
| 8 (authz) | Non-teacher calls teacher RPC | `Teacher access required` | raised | **DEP PASS** |
| 12 (cross-session) | S2 record absent from S1 teacher read | absent | `s1003 in S1 submitted set = false` | **DEP PASS** |
| 13 | Executed testing + untested limitation coexist | both present | limitation round-tripped (Row 5) + offline RT (R03) | **DEP (storage) + RT PASS** |
| 14 | Correction retained + attestation reset | retained; reset | offline RT (R03 reducer model) | **RT PASS; UI not run** |
| 16 | Stale response after Session switch | dropped | offline MO (R02 guard) | **MO PASS; UI not run** |
| 17 | Same-student next-Session carryover | prior informs next | `previousConfirmed` logic present; offline | **not re-exercised DEP; UI not run** |
| 2 / 3 (rendered modes) | disabled/deterministic/ai render correctly | — | — | **UI not run** |
| 20 | Endpoint zero/one provider call by mode | 0 for non-ai, 1 for ai | offline RT (real compiled handler) | **RT PASS; LIVE not run** |

### Explicitly blocked / not run (not substituted)

- **Rendered browser UI** (student routing per mode, teacher panel display, R03
  review/drawer/history rendering, mode-change banners): not run — no browser
  session was driven this round. The JSX is build-verified only.
- **Live AI endpoint via `vercel dev`**: not run. The endpoint's capability gate
  and zero/one-provider-call behaviour are proven only by the offline tests that
  drive the **actual compiled handler** with a mocked provider, not by a live
  `vercel dev` request.
- **Live paid AI extraction**: not run (no paid calls this round).
- Rows 14/16/17 have offline runtime/model coverage but were **not** re-exercised
  as deployed UI flows; they are not reported as deployed-UI passes.

## 4. Implemented fixes and regression/build results

- **Audit fix (smallest change):** `sprint8_adaptive_intake_security_audit.sql` —
  the stale "Chat RPC restricts 2B2" check now accepts the pre-R01 `2B2` gate or
  the post-R01 `intake_mode` gate. Re-ran the audit against the isolated DB →
  **9/9 PASS**.
- No source or migration code was changed this round (the R04 pre-check already
  carried D1–D4). The deployed acceptance **confirmed D3** end to end (off-roster
  separated from roster completion) and **confirmed the R01 capability gate** on
  every save path.
- Offline regressions after the audit edit: `npm run build` **PASS**;
  `npm test` **96/96 PASS**.
- Synthetic test writes were cleaned up: `student_session_intakes=0`, `ghost900`
  account/user removed, `2B2` reset to `disabled`. The two R01/R02 migrations
  remain applied in the isolated env (intended for the rehearsal).

## 5. Remaining blockers for the Form-first teaching release

1. **Rendered UI acceptance** (student Form in `deterministic`, teacher panel,
   R03 displays, mode-change messaging) is unverified — needs a browser rehearsal
   against the isolated stack.
2. **Live AI path** (`vercel dev` endpoint + one live extraction) is unverified;
   gated on Joseph's bounded paid-call approval (pre-check §7, hard cap $0.20).
   The Form-first (deterministic) release does **not** depend on this.
3. **Carryover (Row 17)** not re-exercised as a deployed S1→S2 flow this round.
4. **Deterministic Form proactive mode-change messaging** is a documented gap
   (safe today via save-rejection + preserved state), optional for first release.
5. **November teaching Block** remains unresolved; configuring/activating a real
   Block is out of scope and must not be guessed or activated.
6. Sprint 8 Phase D is **not** fully closed: the deployed authorization slice is
   now verified, but rendered-UI and live-extraction acceptance remain open.

## 6. Verified-closed vs still-open

**Verified this round (deployed, isolated, synthetic):** R01 capability gate on
all save paths and the AI endpoint; teacher-only mode change (RLS); R02 teacher
read with roster/off-roster separation (D3); R03 limitation storage/round-trip;
duplicate prevention; cross-student / cross-session isolation; disabled-mode
history-readable + save-refused; the four read-only audits.

**Still open (unchanged):** rendered-UI acceptance; live AI endpoint and live
paid extraction; S1→S2 carryover as a deployed flow; Sprint 8 Phase D closeout.

## 7. Next concrete task

Run the **rendered-UI rehearsal** against the isolated stack: `npm run dev`
(or `vercel dev` for the API), sign in as the synthetic teacher and a synthetic
student, and walk Block `2B2` through `deterministic` → `ai` → `disabled`,
visually confirming student routing (Form vs chat vs none), a Form submission and
reload, the R03 limitation display and correction/attestation reset, the teacher
Intake panel counts (roster vs off-roster) and source/correction history, and the
in-progress mode-change messages. Capture redacted screenshots as evidence.
Decide separately on the bounded paid live `ai` extraction. Keep live extraction
and the remaining Sprint 8 Phase D items open until their evidence exists.
