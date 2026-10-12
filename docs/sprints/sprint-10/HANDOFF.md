# Sprint 10 — Handoff

## Current checkpoint

## Latest release checkpoint — S10-01b (13 October)

- Joseph confirmed 20261013_sprint10_s01b_compact_work_track.sql applied.
- Anonymous get_my_session_work_track and save_my_session_work_track both refuse
  HTTP 401 / SQLSTATE 42501; no student row modified by the probes.
- PR #73 merged as **6b2009c4c2941cc9c93545b2d3ec92b951972e76**.
- Vercel production status success:
  https://vercel.com/guccimasters-projects/milestoneproject/8ChWCdd5ZWJTHF5x8nccR9paJuzG
- /student returns 200 and serves /assets/index-Dsy_bNWw.js containing the compact
  choices, explicit responsibility confirmation and compact.v1 capability.
- No production student writes, Block mode changes or AI calls by ChatGPT.
- **Pending:** Joseph's authorized test account fills one early Session, saves,
  reloads and checks teacher read; a following Session can verify explicit
  responsibility/prior-action carryover. Local evidence is already recorded in
  S10-01B_REPORT.md; that implementation-time report is superseded for release
  status by this checkpoint and PR #73.
- Session AI override / durable usage controls remain next optional development;
  2B3 rehearsal and actual 2B4 setup remain separate. Do not assume AI readiness.



13 October 2026: **S10-01 released to production**, PR #71 merged as
ff66c6f0876cb3b8a9fb4116e901f3e7e97793e9; Vercel status success and the new
production JS bundle verified. Joseph applied both Work Track and privilege
migrations. Anonymous reads now refuse all three checked RPCs (401/42501).
See S10-01_REPORT.md for the authoritative checkpoint.

Next: authorized test-account S1/S7 save/reload/teacher-read smoke, then S10-02.
Do not claim that hosted acceptance passed: only isolated submission evidence,
hosted asset checks and anonymous permission probes exist so far.
No student-data write, paid call or Block-method change by ChatGPT.
Planning PR #70 is also merged. Preserve current 2B2 configuration.

Start the next task by fetching actual latest main and inspecting the planning
PR status. Reviewed main for this checkpoint:
**6df9282220a3acf7bb2084368b0d187db66ecbfa**.
Do not branch from a stale Sprint 9 local workspace.
GitHub connector is the normal interface; Draft PR per focused increment.
Joseph decides teaching/product behavior; ChatGPT develops/reviews; Claude is backup.

## Authoritative state

- Sprint 9 **first production release delivered**, PR #68 / merge 6549171.
- Release documentation merged through PR #69 / 6df9282.
- Report: repository root FIRST_PRODUCTION_RELEASE_REPORT.md.
- Production: https://milestoneproject-two.vercel.app
- Shared Supabase target: gwihaizxivclamzehupk. Preview does not isolate data.
- Both Sprint 9 R02/R01 migrations applied by Joseph and verified per report.
- Existing release evidence: build PASS, tests 134/134 PASS; production login →
  context → S3 Check-in save → reload → teacher read PASS.
- Production Work Track submission and full Guided Form submission not accepted
  yet. Joseph saw a Guided Form after switching test 2026 · 2B2 to deterministic.
  Current modes were not read during planning; release-time AI-off statements
  must not be treated as live configuration.
- Local Work Track/Form/mocked AI and authorization evidence remains reusable.
  Live AI quality has no release acceptance.
- Historical contradictory Sprint 9 statuses are superseded by this checkpoint,
  PLAN.md and merged release evidence. Phase D's remaining hosted/continuity/
  live-quality checks stay open; do not recreate completed local acceptance.

No AGENTS.md found in the repository. Read CONTRIBUTING.md and AI_CONTEXT.md;
current connector-first and proportional-check rules apply. Repository documents
are English, conversation with Joseph Chinese.

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

## Implemented review candidate: S10-01

S1–S9 Work Track availability + clear teacher submission-method guidance.

Joseph approved the planned S1–S5 treatment: short responsibility/current-progress/
next-action fields, optional evidence/blocker-help, without late completion percentages.
The next step is focused authenticated hosted smoke; S10-02 is the next feature
increment. Implementation pointers below describe the already-released slice.

Methods share a progress-recording goal but not persistence semantics:
- disabled → Existing classroom workflow → updateable Work Track.
- deterministic → Guided Form → confirmed read-only Intake.
- ai → AI Conversation → same Intake family with model assistance.

Keep one active reporting entry and preserve source-specific history.
Block selects method; relevant Session control opens submissions; Check-in is
separate attendance. S10 remains existing feedback/final presentation.
Do not migrate or unify schemas.

### Files and contracts to inspect/change in implementation

- src/main.tsx: SessionWorkTrackModal (fields and isComplete), Journey routing,
  teacher supportsTrack/task editing, method labels and selected guidance,
  teacher early-response display and history reachability across method changes.
- 20260813_sprint7_phase1a_independent_work_track.sql: latest Work Track
  get/save, previous-record lookup and get_my_session_journey definitions.
- 20260805_sprint6_phase2b_session_work_track.sql: teacher read/verification,
  storage and grants. Check subsequent definitions before replacing any RPC.
- src/intakePolicy.ts and existing Intake form content: reuse responsibility,
  progress, evidence, blocker/help and next action rather than a new large form.
- Relevant analytics/teacher consumers of completionPercent: distinguish absent
  early assessment from 0% and do not invent comparable scores.
- Intake save gates in applied 20261009 migration and api/session-intake-ai.ts:
  already method-aware. Work Track save currently lacks an intake_mode check;
  align its write permission while retaining history reads.

Prepare **one new additive Work Track migration** for affected get/save/journey
definitions and early validation. No applied migration edits. Preserve activated
identity/roster Block checks, teacher permissions, empty search_path, grants and
late calculation. Sync schema.sql and supply narrow verification SQL plus
deployment compatibility/rollback notes. Migration application is a separate
authorized step; frontend alone cannot release early Work Track.

### Focused validation

One early S1 and one existing late S7:
teacher open → student submission → reload → correct teacher read.
Check changed range/window/method gates, S10 exclusion, other-student/Block
denial and teacher-only controls. Preserve S7 update and verification-reset
semantics. Guidance matches selected method, Check-in independent, no paid
calls for non-AI modes, history retained.
Use build/relevant tests and a short browser smoke; reuse unchanged Sprint 9
evidence. Do not expand a broad acceptance matrix.
Production test writes require separate authorization.

## Remaining sequence and inputs

See PLAN.md for target windows, scope and acceptance:
- S10-02: November setup preview/idempotency + activation/recovery.
  Real Block is confirmed as 2026 · 2B4; Joseph supplies timetable/timezone,
  roster/team/project data, continuing-student transitions and initial method,
  or creates it himself. Continue 2B2 testing and use synthetic 2B3 for the next
  Block rehearsal. 2B3 needs a new additive CHECK migration; 2B4 is permitted.
  Verify recovery email/redirect and reset/password flow; no mail sent here.
- S10-03: chosen method S1→S2 continuity; distinguish prior evidence/current
  progress; complete missing hosted Form/Work Track chains once authorized.
- S10-AI optional: durable server usage controls, measured cost, separately
  bounded paid quality/safety run and institutional readiness.
  Five dataset levels remain unchanged; no grading/authorship/contribution verdict.
- Acceptance by 29 Oct; 30 Oct release/configuration/contingency; teaching 2 Nov.

## Original planning validation (history)

Inspected latest main, Sprint 9 PLAN/HANDOFF, root release report, development
policy, student/teacher Work Track and Intake controls, SQL get/save/read gates,
account activation/recovery endpoints and AI usage output.
Documentation-only content/diff review; did not reinstall dependencies or rerun
the unchanged release build/tests. Release evidence is reported as prior evidence,
not new verification. Production configuration/data was not queried or changed.

## Latest teaching direction — 13 October

Joseph approved compact option-led S1–S5 Work Track: choices plus short concrete
progress/next action, conditional help/evidence and labelled prior responsibility/
action continuity. S10-01b is now released, preserving
existing records and S6–S9. See PLAN.md's confirmed usability direction.

November remains primarily form-based. Joseph wants selected Monday Sessions
manually overridden to AI for observation. Plan nullable Session method override:
inherit Block by default; "Use AI Conversation for this Session" / "Restore Block
default", effective-method resolution across student/UI/read/save/AI gates,
separate opening windows and no duplicate report after method changes.
Do not implement a frontend-only switch or conflate compact Work Track with the
separate confirmed Intake contract. This later slice must include durable paid
usage limits and bounded live/safety acceptance before student observation.
No AI enabled or paid call authorized by this planning update.
