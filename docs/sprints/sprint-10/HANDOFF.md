# Sprint 10 — Handoff

## Current checkpoint

13 October 2026: repository inspected and Sprint 10 plan prepared.
**Stop before feature implementation.** This branch contains planning documents
only. No SQL execution, production data change, paid call, merge or deployment.

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

## Next implementation slice: S10-01

S1–S9 Work Track availability + clear teacher submission-method guidance.

**Before coding**, Joseph must resolve the proposed S1–S5 question treatment:
short responsibility/current-progress/next-action fields, optional evidence/
blocker-help, with no mandatory late completion percentage (recommended),
or retain the three-requirement assessment from S1.
Do not silently choose this teaching tradeoff.

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
  Joseph supplies exact Block identity, timetable/timezone, roster/team/project
  data, continuing-student transitions and initial method. Do not guess 2B2.
  A new code outside the Block CHECK may need a separate additive migration.
  Verify recovery email/redirect and reset/password flow; no mail sent here.
- S10-03: chosen method S1→S2 continuity; distinguish prior evidence/current
  progress; complete missing hosted Form/Work Track chains once authorized.
- S10-AI optional: durable server usage controls, measured cost, separately
  bounded paid quality/safety run and institutional readiness.
  Five dataset levels remain unchanged; no grading/authorship/contribution verdict.
- Acceptance by 29 Oct; 30 Oct release/configuration/contingency; teaching 2 Nov.

## Planning validation and limits

Inspected latest main, Sprint 9 PLAN/HANDOFF, root release report, development
policy, student/teacher Work Track and Intake controls, SQL get/save/read gates,
account activation/recovery endpoints and AI usage output.
Documentation-only content/diff review; did not reinstall dependencies or rerun
the unchanged release build/tests. Release evidence is reported as prior evidence,
not new verification. Production configuration/data was not queried or changed.
