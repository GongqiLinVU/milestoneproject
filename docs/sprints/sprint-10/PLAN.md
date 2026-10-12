# Sprint 10 — Classroom continuity and November readiness

Status: S10-01 and S10-01b released; compact form deployed as 6b2009c. Joseph applied all three migrations and anonymous get/save permissions were rechecked. Authenticated hosted smoke pending.
Planning baseline inspected on 13 October 2026 (Australia/Melbourne).

## Goal and ownership

Make progress recording usable throughout S1–S9 and prepare the non-AI platform
for NIT3004 teaching on **2 November 2026**. Acceptance ends **29 October**;
**30 October** is reserved for release/configuration checks and contingency.

Joseph makes product/teaching decisions and reviews usable increments.
ChatGPT plans, reviews and develops through GitHub. Claude's local workspace is
backup, not the default implementation environment. Repository documents and
reports are English; discussion with Joseph is Chinese.

Use focused branches and Draft PRs. Ship small usable increments after review.
The initial planning task authorized documents only. Joseph subsequently
approved the plan and S10-01 implementation; production data changes, paid calls,
migration execution, merge and deployment remain separately authorized steps.

## Reconciled baseline

Latest fetched main: **6df9282220a3acf7bb2084368b0d187db66ecbfa**.
PR #68 merged as **65491711973391a14a3fb814e32a872a1b12bf98**; PR #69
adds release documentation. The actual report is
[FIRST_PRODUCTION_RELEASE_REPORT.md](../../../FIRST_PRODUCTION_RELEASE_REPORT.md).

**Sprint 9 first production release is delivered.** Historical statements about
uncommitted changes, no deployment and pending first-release acceptance in
Sprint 9 PLAN/HANDOFF are superseded by the merged code and release report.
The report's main SHA and disabled-mode statements are release-time snapshots,
not assertions about today's main or configuration.

- Hosted platform: https://milestoneproject-two.vercel.app
- Supabase project: gwihaizxivclamzehupk. Preview and Production share this
  backend according to AI_CONTEXT.md; Preview is not a data-isolation boundary.
- Joseph applied 20261008_sprint9_r02_teacher_intake_read.sql and
  20261009_sprint9_r01_block_intake_mode.sql through SQL Editor.
- Release evidence: build PASS, 134/134 tests PASS; production test001 login →
  correct context → S3 Check-in → reload → teacher read PASS.
- Local evidence covers S6–S9 Work Track, Guided Form, mocked AI, authorization
  isolation and persisted provider-failure completion. Reuse this evidence.
- Production Work Track submission and full Guided Form submission remain
  unverified. Joseph subsequently selected deterministic for test Block
  2026 · 2B2 and saw the Form. Current Block modes were not queried during this
  planning task; never assume all Blocks remain disabled.
- Live AI quality, durable usage controls, remaining hosted Phase D acceptance,
  activation/recovery, S1→S2 continuity and November setup remain open.
  Sprint 8 Phase D is carried forward by its remaining checks, not declared
  wholly passed or restarted.

No repository AGENTS.md was found. Applicable instructions were read in
CONTRIBUTING.md and AI_CONTEXT.md. Their current workflow policies apply;
older capability summaries are historical when contradicted by actual code.
Documentation-only validation is content/diff review; no repeated build needed.

## Confirmed Block sequence (Joseph, 13 October)

| Block | Purpose | Setup status |
|---|---|---|
| 2026 · 2B2 | Continue existing synthetic testing | Reuse existing test context and evidence |
| 2026 · 2B3 | Next synthetic test Block; consecutive-Block transition rehearsal | Not created by this task; dates/roster/method still to be supplied or reviewed |
| 2026 · 2B4 | Actual November teaching Block | Identity confirmed; Joseph will supply real details or create it in the teacher UI |

Use at least one continuing synthetic student with the same Student ID/account
in 2B2 and 2B3. Verify intended current context, no account duplication or
unnecessary password reset, retained old submissions and Block-scoped history.
Historical evidence must remain labelled by Block; do not automatically treat
a previous Block's evidence as current progress or blend same-number Sessions.
This is a narrow continuation check in S10-02/S10-03, not a new scenario matrix.

The repository's latest teaching_blocks_block_code_check allows
1B1, 1B4, 2B1, 2B2 and 2B4, **not 2B3**. Test preparation therefore requires
a new additive migration to permit 2B3, with schema synchronization; never edit
the applied Sprint 8 migration. 2B4 is already permitted by this CHECK.
Do not create/activate any Block, fabricate dates/rosters or execute SQL in
this planning task. If Joseph creates 2B4 himself, inspect and verify that
configuration before proposing further writes.

## Inspected contracts: one teaching goal, different implementations

| Method label | Stored setting | Contract and behavior | Opening control |
|---|---|---|---|
| Existing classroom workflow | disabled | student_session_work_tracks; JSON response, requirement completion calculated by server, update while open; teacher completion verification separate and reset after student update | work_track_access |
| Guided Form | deterministic | student_session_intakes; evidence record plus conversation/source/corrections; student attestation; confirmed record read-only and duplicate confirmation refused | intake_access |
| AI Conversation | ai | Same Intake record family; conversational extraction and provider-independent completion; live quality not accepted | intake_access |

The Block setting selects the collection method. The relevant Session control
selects when that method accepts submissions (follow Session / explicitly open /
explicitly closed). Session Check-in is attendance and remains separate.
S10 remains the existing feedback/final-presentation workflow.

Keep one active progress-submission entry per Session. Do not request both
Work Track and Intake for the same progress. Preserve existing history across
method switches, with its source visible; do not automatically convert records
or infer new completion metrics from Intake. Inspect Work Track history
reachability when switching methods: the current teacher controls hide Work
Track access in Intake mode, while Intake history already remains reachable
when disabled. Read-only history access must not create a second reporting duty.

## Source findings and required migration

- src/main.tsx: SessionWorkTrackModal only renders/validates S6–S9;
  Journey action routing, teacher supportsTrack and Task/Expected evidence editing
  restrict the range. Teacher method labels expose internal enum names.
- Work Track get/save and journey status definitions in
  supabase/migrations/20260813_sprint7_phase1a_independent_work_track.sql restrict
  session_number to 6–9; prior requirements lookup has the same restriction.
- Student Work Track save resolves activated identity and active roster Block,
  enforces work_track_access and validates the fixed three requirements.
  It does not currently check intake_mode: UI selection alone is not a
  server-side prohibition of duplicate method writes. Align the save contract
  with the selected method, preserving read-only access to prior records.
- Teacher read/verification definitions originate in
  20260805_sprint6_phase2b_session_work_track.sql; inspect affected teacher
  rendering and consumers before admitting early response fields.
- Guided Form and AI Intake already target S1–S9 through separate RPCs and
  api/session-intake-ai.ts. src/intakePolicy.ts has reusable responsibility,
  progress, evidence, blocker/support and next-action concepts.
- prepareTen() currently derives missing Session numbers from sessions.length,
  uses fixed date offsets and falls back to today. Real setup needs supplied
  dates and idempotency by actual Session number.
- Account paths exist in api/student-accounts.ts, student-login.ts,
  student-recovery.ts and src/main.tsx. Recovery sends to the account's VU email;
  its redirect uses request Origin. Verify configured redirect destination,
  recovery event handling, delivery and personal password completion before
  claiming usable recovery.
- AI endpoint exposes token usage but manifest cost is null; client conversation
  budget/output caps are not durable per-student/classroom spending controls.

**A new additive migration is required for the first implementation slice**:
replace affected Work Track RPC definitions to support S1–S9, widen prior-record
lookup and journey status, align selected-method write authorization, and
validate early responses appropriately. Existing JSON storage can hold early
fields; no new table or schema-unification is planned. Preserve auth checks,
empty search_path, grants, closed-window rejection and late-session calculation.
Synchronize supabase/schema.sql for changed definitions. Never edit an applied
migration. Include focused verification SQL and compatibility/rollback notes;
execute only after separate authorization. No migration is created in this PR.

## Sequence and target windows

Dates below are scheduling targets, not promises of unapproved deployment.

| Window | Increment | Dependency / usable result |
|---|---|---|
| 13–16 Oct | S10-01: S1–S9 Work Track + teacher method guidance | Joseph's early-question decision; new reviewed migration; one early and one late Session accepted |
| 16–21 Oct | S10-02: November setup preparation + activation/recovery | 2B4 identity confirmed; timetable, roster and continuing-student mapping pending; rehearse 2B2→2B3 before real setup |
| 21–26 Oct | S10-03: focused continuity / remaining non-AI hosted gaps | S1→S2 prior/current distinction; complete missing hosted Work Track and Form chain using authorized synthetic records |
| 26–29 Oct | Close non-AI classroom blockers and acceptance | Joseph hands-on review; short changed-path smoke; record accepted/deferred results |
| Later optional increment | S10-AI: durable usage controls, cost and bounded quality/safety evaluation | Explicit model/budget approval and institutional readiness; does not block non-AI use |
| 30 Oct | Release/configuration checks and contingency | Previously accepted increments and supplied actual configuration |
| 2 Nov | Teaching begins | Non-AI classroom workflow usable |

### S10-01 — first implementation slice (P0)

Extend Existing classroom workflow Work Track to S1–S9 across student entry,
form validation, teacher open/close/task controls, get/save/journey/prior-record
contracts and authorization. Retain S6–S9 questions and calculations.
Use the three preferred method labels, selected-method guidance and separate
Check-in explanations. Persisted server mode remains authoritative.

Early question set, **approved by Joseph with the plan on 13 October**:
responsibility / current progress (including no progress) / next action, with
optional evidence and blocker/help. Reuse Intake concepts and S6 next-focus/
blocker content. Do not force report-readiness or executed testing in S1–S5.
Approved treatment: early submissions do not require the late three-requirement
percentage assessment. They are short progress records, with unavailable
completion shown as absent rather than zero. Check teacher/trajectory consumers
before allowing this; no broad analytics refactor. S10-01 implements this treatment.

Focused acceptance:
1. One synthetic early Session (S1): teacher opens relevant collection window;
   student fills suitable questions → save → reload → correct teacher read.
2. One existing late Session (S7): existing questions/completion calculation →
   save → reload → teacher read. Update still resets prior teacher verification.
3. Focused changed-contract checks: closed window and S10 Work Track rejected;
   cross-student/cross-Block access denied; non-teacher controls denied;
   non-selected method cannot bypass progress write gate.
4. Selected guidance and controls match each method; Check-in remains separate;
   changing method never erases confirmed history. No provider call for
   Existing classroom workflow or Guided Form.
5. Build + relevant contract tests for this change; short rendered smoke.
   Reuse unchanged isolation/rehearsal evidence rather than expand a matrix.

### S10-02 — real Block and incoming accounts (P0)

Confirmed real teaching identity: 2026 · 2B4. Joseph's remaining inputs: actual S1–S10 dates,
start/end windows and Melbourne timezone; roster with IDs/VU emails/teams/
projects; continuing-student mappings and chosen initial method.
Joseph may supply those details or create 2B4 himself. Reuse 2B2 and prepare
synthetic 2B3 for consecutive-Block rehearsal; do not use test rosters as real data.

Prepare a reviewable setup preview and idempotent missing-Session preparation.
Retain archived history and existing continuing-student identities/passwords.
Prepare a new additive migration permitting synthetic test code 2B3; 2B4
already fits the current CHECK. Review only during planning; application and
Block creation require a separately authorized setup step.

Acceptance: preview matches supplied timetable/roster; retry creates no
duplicate Sessions; continuing student lands in intended current context while
historical data is retained. One synthetic new-account activation → personal
password → login, and recovery link → new password → login. Check invalid/
expired recovery response and authorized teacher reset as needed for the actual
changed path. Email delivery/redirect configuration is an external dependency;
use a controlled test mailbox only after authorization.

### S10-03 — continuous use (P1)

Verify S1→S2 for the chosen November method and the narrow 2B2→2B3
continuing-student transition described above. Show previous record as previous
evidence, not a fresh current progress claim; collect what changed and next
action. Work Track presently carries previous requirements/next focus, whereas
Intake carries confirmed evidence/history. Do not promise cross-schema carryover
or invent prior testing. Fix only a concrete continuity gap.
Complete missing hosted Guided Form save/reload/teacher-read and Work Track
submission checks once authorized; Joseph seeing a Form is routing evidence only.

### S10-AI — optional readiness (P1, can continue after Sprint 10)

Add durable server-side student/Session and Block usage accounting/limits that
survive reload, concurrent requests, replay and retries; record token/model/
pricing version and measurable cost with conservative handling of missing usage.
Fail closed before paid calls at the budget boundary and offer non-AI completion.
Budget limits and paid evaluation model/call/spend scope require Joseph approval.

Use five primary dataset levels only: substantial progress/clear answers;
smooth progress/vague answers; average progress; little progress; no progress.
Reuse existing gold anchors and C/R/S criteria. Minimum safety checks cover
instruction injection, unrelated/unsafe questions, unsupported evidence and
privacy isolation. Confirm refusal/redirection and teacher-help behavior;
no automatic grading, authorship accusations or contribution verdicts.
Mocked AI acceptance is not live quality acceptance. Institutional approval is
a dependency for classroom AI use.

## Release discipline and deferrals

Each increment reports its changed behavior, evidence reused, focused results,
migration/deployment needs and remaining limitations. Merge/deploy/production
test writes need separate authorization. No broad acceptance taxonomy,
new knowledge base, grading engine, schema unification, questionnaire expansion,
unneeded refactor, draft-sync storage or bundle optimization in S10-01.
AI readiness does not block non-AI teaching.

Resolved product decision: Joseph approved the plan and implementation on
13 October; S1–S5 use short progress records with no mandatory late assessment.
November inputs block S10-02 configuration, not S10-01 development.


## Confirmed usability direction — 13 October (next increments)

Joseph approved an option-led, compact non-AI Work Track and wants the November
Block primarily form-based, with selected Monday Sessions using AI Conversation
for in-class observation. Monday is a manually selected Session, not a recurring
scheduler rule. No AI activation, paid run or institutional acceptance is implied.

### S10-01b: compact S1–S5 form (released; hosted smoke pending)

Replace large free-text boxes with work-area choices, progress-state choice plus
one concrete sentence, a short next action, conditional help details and optional
evidence reference. Retain responsibilities without forcing retyping; any reuse
is labelled and explicitly confirmed. Previous next action is shown as historical
context; completion/partial/not done/changed-plan is a current self-report, not
proof of completion. Target 1–2 minutes, subject to Joseph's hands-on review.
Keep S6–S9 unchanged and preserve existing early records/readability.
Existing classroom Work Track and Guided Form still have different save and
confirmation contracts; compact Work Track is not automatically Guided Form.
Do not force schema unification to create the future AI handoff.

### S10-Session method override: bounded AI observation (later slice)

Keep Block collection method as the default. Add a nullable Session override
using the existing method enum; null means inherit Block. The common teacher
action when the default is form-based is "Use AI Conversation for this Session",
with "Restore Block default" afterward. Show the **effective** method and whether
it is inherited or overridden; restoring inheritance is not universally "AI off"
if a Block itself defaults to AI.

Resolve the effective method from trusted Session + Block data everywhere:
student Session entry, read/open metadata, Intake save RPCs, Work Track write
gate and AI endpoint. Retain Block-level default metadata; do not use it alone
to route every Session after mixed methods are supported. A new additive
migration and focused mixed-Session contract tests are required. Collection
method and submission window remain independent; selecting AI does not open a
Session or start a provider request.

Example: a form-default Block has Monday Session AI, next Session inheriting form.
Each student has one active collection entry; saved source-specific history
remains readable. A method switch after a confirmed submission does not require
another report or convert/delete the confirmed record. Preserve unsaved work and
make the current method authoritative before another save/provider request.
If a record already exists in the alternative family, show completion/history
rather than introduce a second reporting requirement. No cross-schema merge.

Implement the override only alongside minimum durable server attempt/spend limits,
measured usage, provider-independent completion and a bounded quality/safety
check. The live observation remains separately authorized for model, student/
Session scope, calls and hard budget; institutional readiness remains a dependency
for classroom AI. The switch must not imply that AI has already been accepted.
No automatic marking or contribution/authorship verdicts.

Focused acceptance: form-default Block with one AI-overridden Session and one
inherited form Session; UI/server agree, closed window still refuses, forged
client mode cannot call AI, confirmed history survives restore-default and no
second progress submission is requested. Extend existing checks only for these
changed boundaries.
