# Sprint 3 — Continuous Engagement and Teaching Review

**Status: Active — Phase 1 complete; Phase 2 in progress**

## Teaching problem

Only Monday is compulsory. Wednesday and Thursday attendance is lower, so final
submissions and Monday observations alone do not provide enough evidence of each
student's ongoing participation. The existing shared Team Conversation had low
participation, while the Four-Week Action Plan duplicates the assessed Progress
Report.

## Goal

Create a lightweight evidence loop across Weeks 1–3. Students report individual
team experience and weekly engagement primarily through selections. Teachers use
the evidence to prepare compulsory Monday conversations and make fairer,
evidence-informed judgements. The system remains descriptive: it does not assign
marks, responsibility or performance labels.

## Phase 1 — Week 1 Engagement Loop

Replace the two low-value Week 1 activities:

1. Keep the existing Monday Week 1 Check-in.
2. Replace Team Conversation with an individual Team Health Check, completed by
   every student during Week 1.
3. Replace Four-Week Action Plan with Week 1 Engagement Check-out, completed in
   Session 3 or remotely.
4. Add teacher-facing Team Participation Temperature and Week 1 coverage.

Team Health questions are selection-first: communication, role clarity,
participation balance, delivery status, ability to express a view, teacher
support and main issue. A maximum 200-character note appears only for a risk,
block, support request or Other.

Weekly Engagement Check-out uses ten core questions:

1. participation beyond Monday
2. time invested
3. contribution areas
4. committed-task completion
5. evidence availability
6. team communication
7. participation balance
8. next-task clarity
9. current work status
10. focus for the next compulsory Monday conversation

A maximum 200-character note appears only for a negative/risk answer or Other.

Team Participation Temperature shows Warm, Cool, Cold or Insufficient data,
alongside response coverage, component signals and member disagreement. It is a
discussion prompt, never a performance score.

Acceptance:

- Each Student ID submits Team Health once and Week 1 Check-out once.
- Normal completion requires no written response.
- Students can insert but cannot select, update or delete these records.
- Teachers can inspect individual evidence and team summaries.
- Missing data is distinct from a negative answer.
- Existing Team Conversation and Four-Week Plan records remain as history.
- Build, migration and RLS verification pass before merge.

## Phase 2 — Week 2 Progress Review and Check-out

Add a two-minute Individual Progress Review before the compulsory Monday review and reuse the ten-question Engagement Check-out with week number 2. The progress review captures current progress, contribution areas, evidence status and reference, next-task clarity, support needs and a conditional discussion note. Week 2 evidence prepares the project demo, method verification and individual discussion.\n\nAcceptance:\n\n- Each Student ID submits one Progress Review and one Week 2 Check-out.\n- Contribution areas support multiple selections.\n- Written notes appear only where evidence needs clarification or a risk/support answer is selected.\n- Students can insert but cannot read or manage submissions.\n- Teachers can review raw evidence and identify review readiness without automated marks.\n- Week 1 records and receipts remain separate and unchanged.\n- Build, migration and RLS verification pass before merge.

## Phase 3 — Teacher Review and Week 3 Check-out

Add teacher-only review outcome, feedback, agreed action and follow-up. Reuse the
Engagement Check-out with week number 3, emphasising individual responsibility
and final-delivery risk. Student self-report and teacher judgement remain
separate.

## Phase 4 — Three-week trajectory and teaching analytics

Show per-student Week 1–3 trajectories, Team Participation Temperature,
completion, evidence readiness, disagreement and follow-up queues. Every summary
must drill down to submitted evidence. No automated mark or unsupported
performance judgement is allowed.

## Phase 5 — Export, privacy and production validation

Export stable teacher-authorised data; verify conditional fields, duplicates,
RLS roles and sensitive-text boundaries; run build, migration and production
smoke tests; synchronise project documentation.

## Data direction

Use new individual tables rather than reinterpreting historical
`team_conversations` or `student_promises`. Weekly check-outs use one shared
table with a week number and a unique Student ID + week constraint so Weeks 2
and 3 can reuse the same structure.

Every database change requires an idempotent migration, matching
`supabase/schema.sql`, grants, RLS, verification SQL and rollback guidance.

## Future direction

AI-assisted personalised teaching is deferred. Later AI may summarise a
student's evidence trajectory, identify contradictions to verify and suggest
Monday discussion questions, but teachers retain final judgement.

## Delivery rules

- One focused Draft PR per Phase.
- Start from latest `main`.
- Do not merge without explicit approval.
- Record verified evidence only in `HANDOFF.md`.
