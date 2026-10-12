# Sprint 9 — R04 Pre-check Report

Authenticated-acceptance preparation for the combined R01 + R02 + R03 changes.

Author: Claude (local execution). Plan/review: Joseph and ChatGPT.
Date: 11 October 2026. Language: English.

This is a pre-check and preparation report. It does **not** close Sprint 8
Phase D and does **not** claim classroom readiness. Reported offline test counts
are **not** evidence of deployed acceptance.

## 1. Reviewed code references and changed files

- Committed HEAD: `656f55f8f15ffbaadc95c37596f44d1af21a8e21` — tree identical to
  reviewed main `96d2aee` (PR #67 merge; `git diff 96d2aee..HEAD` empty).
- Working tree holds uncommitted R01 + R02 + R03 changes plus this round's R04
  defect fixes. Nothing is committed this sprint.

Reviewed in the combined diff:

- `api/session-intake-ai.ts` — AI endpoint capability gate (`intake_mode === "ai"`).
- `src/intakePolicy.ts` — `changedEvidenceFields` (+`testingBaseline`), and the
  `conversationErrors` / `sourceConversation` **save contract** (odd length,
  final `review transition`).
- `src/StudentAccess.tsx` — `Context.intakeMode`.
- `src/main.tsx` — R01 server-authoritative routing + teacher gates + mode-change
  handler; R02 teacher Intake panel; R03 limitation displays/correction.
- `supabase/migrations/20261008_sprint9_r02_teacher_intake_read.sql` — teacher
  read RPC.
- `supabase/migrations/20261009_sprint9_r01_block_intake_mode.sql` — capability
  column + re-gated RPCs + `get_my_student_context`.
- `supabase/scripts/sprint9_r01_*`, `sprint9_r02_*` — read-only audits.

Changed/added this round (R04 fixes + tests):

- `src/main.tsx` — defect fixes D1, D2, D4 (below).
- `supabase/migrations/20261008_sprint9_r02_teacher_intake_read.sql` — defect fix
  D3 (separated counts).
- `supabase/scripts/sprint9_r02_teacher_intake_read_audit.sql` — updated count
  check.
- `tests/ai-session-intake/adaptive/r02-teacher-intake-read.test.mjs` — updated
  for separated counts + a roster-rate regression.
- `tests/ai-session-intake/adaptive/r04-mode-change.test.mjs` — new (6 tests).

## 2. Defects found and fixes (smallest coherent changes)

**D1 — misleading mode-change message.** The `ai → non-ai` handler message
promised "it will be saved without any AI call", which is false when the Block
became `disabled` (the save is rejected). Fixed: the message now states the save
only succeeds if the Session still accepts a provider-independent Intake, and
that if Intake was turned off, confirming will report submission is unavailable
and answers remain. (`src/main.tsx`, `SessionIntakeModal.send()` catch.)

**D2 — operator/migration instruction leaked to students.** The chat save-error
message said "If the chat RPC is missing, apply the reviewed adaptive-intake
migration before retrying." Removed from the student UI; replaced with a
student-appropriate message that the Intake could not be submitted, the answers
are preserved, and to retry or ask the Teacher. (`src/main.tsx` chat `submit()`.)
The deterministic modal surfaces a raw `error.message` but carries no migration
instruction; its friendlier wording is R06 scope and is noted, not changed here.

**D3 — off-roster submissions inflated roster completion.** The R02 RPC merged
off-roster (orphan) confirmed Intakes into a single `submittedCount`, so a
completion rate would be inflated. Fixed: the RPC now returns `rosterSize`,
`rosterSubmittedCount`, `missingCount` and `offRosterCount` separately;
`submittedCount` is retained only as a documented display-only grand total. The
teacher panel shows "X / rosterSize roster submitted", "missing", and
"off-roster (history, not counted in roster completion)" distinctly. The modelled
test and audit were updated, and a regression asserts a 1/2 roster rate is not
inflated to 2/2 or 2/3 by an off-roster record.

**D4 — ai → deterministic save blocked by conversation shape.** The mode-change
handler preserved a conversation ending on a student turn, but the save contract
(`conversationErrors(turns, true)` via `sourceConversation`) requires an odd
length ending in a `review transition` turn. The authorized deterministic save
would therefore throw on shape before reaching the RPC. Fixed: the handler now
appends a `review transition` system turn to the preserved conversation, matching
the normal review path. A new RUNTIME regression proves the contract fails
without the appended turn and passes with it.

No gold anchors, adjudications or C/R/S formulas were touched.

## 3. SQL authorization and migration-ordering findings

- **teaching_blocks capability is teacher-only.** `teaching_blocks` grants table
  `UPDATE` to `authenticated`, but the only `UPDATE`-applicable RLS policy is
  `"teachers manage teaching blocks"` (`FOR ALL ... USING is_teacher() WITH CHECK
  is_teacher()`); the `"public reads active teaching block"` policy is
  `FOR SELECT` only. A non-teacher `UPDATE` of `intake_mode` therefore matches no
  permitting policy and is denied. The R01 audit flags the table grant as REVIEW
  and checks the policy explicitly — correct, but the protection is RLS, not the
  table grant. (Deployed enforcement is a §4 deployed-SQL check, not established
  here.)
- **intake_mode constraint validates cleanly.** The column is added with
  `default 'disabled'`, so every existing row satisfies the `CHECK`; the
  `not valid` + `validate` sequence passes without a table rewrite.
- **No existing Block is auto-enabled**; `block_code` CHECK is not widened; the
  November Block code is not assumed.
- **Migration ordering** (apply lexicographically by filename):
  1. existing `20260903` (foundation), `20260912` (ai save), `20260916` (chat
     save) must already be applied;
  2. `20261008_sprint9_r02_teacher_intake_read.sql` — independent additive
     function; depends only on existing tables and `is_teacher()`;
  3. `20261009_sprint9_r01_block_intake_mode.sql` — re-creates
     `get_my_student_context` and `save_my_session_intake_chat/_ai/_fallback`
     (all defined earlier) and adds the capability column. It must run **after**
     those three foundation migrations; it is independent of R02.
  R01 (`20261009`) running after R02 (`20261008`) is correct and conflict-free
  (R02 does not touch the re-created functions).

## 4. R04 acceptance matrix

Evidence classes are kept explicitly separate:
**RT** = offline runtime test (actual code);
**MO** = modelled test (faithful model of a contract);
**SQL** = deployed read-only SQL check (audit script, NOT yet run);
**UI** = rendered browser check (NOT yet run).

| # | Scenario | App/API/RPC path | Expected result | Evidence to retain | Class / status |
|---|---|---|---|---|---|
| 1 | Block `disabled`: student portal | `get_my_student_context().intakeMode` → `StudentPortal` | No Intake entry; existing non-Intake workflow | screenshot + context JSON | UI (pending); MO ✓ (routing model) |
| 2 | Block `deterministic`: student portal | routing → `FormSessionIntakePrototype aiEnabled=false` | Provider-independent form; **zero** `/api/session-intake-ai` calls | network log (no provider), screenshot | UI (pending); RT ✓ (endpoint refuses) |
| 3 | Block `ai`: student portal | routing → `SessionIntakeModal` | Conversational Intake with deterministic fallback | screenshot, one provider call | UI (pending); RT ✓ (endpoint 200, 1 call) |
| 4 | Authenticated student saves | `save_my_session_intake_chat`/`_fallback` | Record persisted; one row | returned `intakeId`, row read-back | SQL/UI (pending) |
| 5 | Reload after save | `get_my_session_intake` | Confirmed record returns; read-only | reloaded JSON, read-only UI | SQL/UI (pending) |
| 6 | Duplicate submission | same save RPC | Rejected ("already confirmed") | RPC error | SQL (pending); contract in RPC |
| 7 | Confirmed history after Block set `disabled` | `get_my_session_intake` | History still readable | JSON under disabled mode | SQL/UI (pending); MO ✓ (ungated) |
| 8 | Unauthorized user → teacher read | `get_teacher_session_intakes` | `Teacher access required` | RPC error for non-teacher | SQL (pending); MO ✓; audit check |
| 9 | Forged client mode | portal / endpoint / RPC | Client value ignored; server capability decides | request with bad mode refused | RT ✓ (endpoint); MO ✓; SQL (pending) |
| 10 | Direct RPC call by student (`save_my_session_intake_ai`) in deterministic Block | RPC | Rejected (gate `intake_mode='ai'`) | RPC error | SQL (pending); MO ✓ |
| 11 | Cross-student read | `get_my_session_intake` RLS `auth_user_id=auth.uid()` | Only own record | other student's id returns none | SQL (pending) |
| 12 | Cross-Block / cross-Session attach | `get_teacher_session_intakes` join on `block_id`+`session_id` | Foreign rows never attach | seeded foreign row absent | SQL (pending); MO ✓ |
| 13 | Executed testing + untested limitation | `buildFallbackStudentRecord` → `testing[0]` | Both coexist; limitation visible | record JSON; review/drawer screenshot | RT ✓ (R03); UI (pending) |
| 14 | Correction history + attestation reset | `correct()` → `corrections[]`, `confirmed=false` | Original kept as `before`; attestation re-required | saved `corrections`, UI reset | RT ✓ (R03 model); UI (pending) |
| 15 | Teacher roster submitted/missing + off-roster | `get_teacher_session_intakes` counts | `rosterSubmittedCount/rosterSize`, `missingCount`, `offRosterCount` separate | panel screenshot, RPC JSON | RT ✓ (R02 model); SQL/UI (pending) |
| 16 | Stale response after changing Session | `openIntake` `intakeRequestRef` guard | Superseded/mismatched payload dropped | rapid-switch capture | MO ✓; UI (pending) |
| 17 | Same-student next-Session carryover | `get_my_session_intake` `previousConfirmed` / endpoint `previousRecord` | Prior record informs next Session | S1→S2 pair JSON | SQL/UI (pending) |
| 18 | ai → deterministic mid-conversation | `send()` catch → review → `save_my_session_intake_chat` | Work preserved; authorized deterministic save | preserved answers, saved row | RT ✓ (contract); SQL/UI (pending) |
| 19 | ai → disabled mid-conversation | `send()` catch → review → chat RPC rejects | Work preserved; **no successful save**; message explains unavailable | message, RPC rejection | RT ✓ (endpoint+contract); SQL/UI (pending) |
| 20 | disabled/deterministic make no provider call | `/api/session-intake-ai` | 403 before any model call | handler result, 0 provider calls | RT ✓ |

RT-covered rows are proven by `npm test` (96/96). MO rows are modelled. SQL and
UI rows remain to be executed in the authenticated rehearsal.

## 5. Migration / configuration sequence and rollback

Target: an **isolated** environment only (see §6). Not production; no shared
Block configuration changed.

Apply order:

```
# 1. Ensure foundations are present (already applied in a maintained env):
#    20260903_sprint8_phase2a_intake_foundation.sql
#    20260912_sprint8_phase2c_ai_intake.sql
#    20260916_sprint8_adaptive_intake.sql
# 2. R02 teacher read (independent, additive):
supabase/migrations/20261008_sprint9_r02_teacher_intake_read.sql
# 3. R01 capability + re-gated RPCs (after the three foundations):
supabase/migrations/20261009_sprint9_r01_block_intake_mode.sql
```

Post-apply read-only audits (retain output):

```
supabase/scripts/sprint9_r01_block_intake_mode_audit.sql
supabase/scripts/sprint9_r02_teacher_intake_read_audit.sql
supabase/scripts/sprint8_phase2a_security_audit.sql
supabase/scripts/sprint8_adaptive_intake_security_audit.sql
```

Configuration for the rehearsal (teacher action in the isolated env only; do not
touch production, do not create or activate the November Block):

```
-- Set the EXISTING isolated mock Block (2B2) to each mode in turn, as a teacher:
update public.teaching_blocks set intake_mode = 'disabled'      where academic_year=2026 and block_code='2B2';
update public.teaching_blocks set intake_mode = 'deterministic' where academic_year=2026 and block_code='2B2';
update public.teaching_blocks set intake_mode = 'ai'            where academic_year=2026 and block_code='2B2';
-- Open a Session's intake_access as needed (teacher control), per scenario.
```

Rollback:

```
-- Functions: restore the prior definitions by re-applying 20260903/20260912/
-- 20260916 (and the prior get_my_student_context) — create or replace is
-- reversible by re-running the earlier migration bodies.
-- R02 function:
drop function if exists public.get_teacher_session_intakes(uuid);
-- Capability column (only if removing the feature; safe to leave inert):
alter table public.teaching_blocks drop column if exists intake_mode;
-- Reset any rehearsal mode change:
update public.teaching_blocks set intake_mode = 'disabled' where academic_year=2026 and block_code='2B2';
```

Do not drop `intake_mode` while a deployed function still references it; drop the
functions (or restore prior bodies) first.

## 6. Environment prerequisites

- **Isolated environment identity**: a local Supabase (Docker) stack. Evidence:
  `supabase/config.toml` `project_id = "milestoneproject"`; `.env.local`
  (gitignored) points at the local stack and, by its own header comment, never
  reaches Vercel or the remote project. This stack was **not** started, migrated
  or read in this round.
- Required to run the rehearsal: start the local stack, apply the §5 sequence,
  seed isolated mock users (one teacher, ≥2 students, one off-roster student) and
  an S1→S2 pair. **Do not use production student data as fixtures.**
- `vercel dev` (or equivalent) to serve `/api/session-intake-ai` against the
  local stack for scenarios 2/3/9/18–20.
- No production credentials; the service-role key stays server-side in the
  isolated env.

## 7. Bounded paid-call proposal (only if live AI testing is required)

The acceptance matrix needs **no** paid call for the authorization, save,
teacher-read, mode-change and history scenarios — those use the deterministic
path and mocked/again-refused provider calls. A paid call is only needed to
confirm the live `ai`-mode conversation end to end (scenario 3 with a real
model). If Joseph wants that:

- Scope: 1 Block in `ai` mode, 1 mock student, 1 Session, ≤ 8 model calls
  (`MAX_INTAKE_QUESTIONS`), one extraction.
- Model + hard cap: the previously requested `gpt-5-mini` (or Joseph's choice),
  hard cap **$0.20**, single trajectory, no retries beyond the one bounded retry
  already in the handler.
- Not required for R04 sign-off of R01/R02/R03 authorization; it only validates
  live extraction quality, which overlaps R09.

No paid call was made in this round.

## 8. Offline results (actual)

```
npm run build  -> PASS; dist/assets/index-*.js 712.93 kB (large-chunk warning only)
npm test       -> tests 96 | pass 96 | fail 0
```

Suite composition: 65 base + 4 R03 + 9 R02 (incl. the new roster-rate regression)
+ 11 R01/endpoint + 6 R04 mode-change + the remainder of the existing adaptive
suite. These are **offline** results and do not establish deployed acceptance.

## 9. Remaining unverified items and next step

Unverified (all require the authenticated rehearsal in §5–§6):

- Deployed SQL privileges, RLS enforcement and function configuration (run the
  §5 audits).
- Rendered UI for all three modes, the teacher panel counts, R03 displays and the
  mode-change messages.
- End-to-end save / reload / duplicate / cross-student / cross-Block /
  cross-Session / carryover behaviour against a real database.
- Sprint 8 Phase D (Phase 2C database audit + authenticated application
  acceptance) remains **open**.

Next concrete step: in the isolated local Supabase stack, apply the §5 sequence,
run the four audit scripts, and execute acceptance-matrix rows 1–19 for the mock
`2B2` Block cycled through disabled → deterministic → ai, retaining the audit
output and per-row evidence. Decide separately whether the §7 bounded paid live
`ai` run is in scope.
