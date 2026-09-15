# Sprint 8 Handoff — AI Session Intake

## Current state

Phase 1 Evidence Contract and Evaluation Standard were merged through PR #62
(commit `2db40024d97c1efe67d67f1550da1ded92a61142`).

Phase 2A Mock Pilot Foundation was squash-merged through PR #63 (commit
`133cee3483f1b4ec6a060ac2d77452ee6360f5a3`). The migration was applied and its
read-only database security audit returned 10/10 PASS.

Phase 2B Deterministic Student Pilot UI was squash-merged through PR #64
(commit `c8c1d59404e23f6bb31e164b7b21b35f6552e5c5`). Three mock students
produced four valid 2B2 records, including one S1 → S2 longitudinal pair. The
provider-independent workflow, fallback persistence and post-pilot security
checks passed.

Phase 2C is open in Draft PR #65. Its first implementation proved bounded model
calls, validation, persistence and fallback, but retained a form-first student
experience. Review determined that this does not satisfy the intended AI Intake
experience. Phase 2C is now in a guided-workspace design round before further
implementation.

## Confirmed product direction

Session Intake is a guided learning assistant and evidence workspace. It has
three stable collection directions:

- responsibility and change;
- evidence and verification;
- blocker and next action.

The normal UI will combine a one-question-at-a-time conversation with a live
evidence area. Current Session focus and the same student's previous confirmed
record shape the questions, while every Session remains an independent record.

The assistant supports four routes: evidence, clarification, a small next step,
and Teacher help. Little/no progress is a valid fact. The assistant should stop
asking for nonexistent evidence, help the student accept a bounded action when
possible, or create a concise Teacher guidance handoff.

Detailed candidate design:
`docs/sprints/sprint-08/PHASE2C_EXPERIENCE_DESIGN.md`.

## Existing foundation retained

- 2B2-only controlled Intake entry;
- Block, student and Session authority resolved by the system;
- versioned Evidence Contract and validators;
- separate original conversation and confirmed record;
- student correction and confirmation;
- deterministic fallback persistence;
- Teacher-controlled Intake access;
- archived 2B1 history remains available;
- existing-account reuse when a student continues into a later Block.

## Phase 2C current UI-first round

The portal and Intake workspace stabilise before conversation logic is
connected:

1. show one expanded Current Session at the top;
2. place My Project below it in compact form;
3. collapse completed, catch-up and upcoming Session groups;
4. move Class Activities to the bottom and collapse them on login;
5. use one dedicated full-page Intake workspace for every selected Session;
6. keep catch-up Sessions accessible but secondary when several Intakes are
   open;
7. validate desktop/mobile scrolling, navigation and draft protection;
8. then connect routes, schema delta and AI extraction.

Session status determines the primary class focus. Intake access only determines
whether a Session may accept an Intake. Therefore S1 and S2 may remain open for
catch-up while S3 is the single Current Session.

Detailed UI decision:
`docs/sprints/sprint-08/PHASE2C_UI_ARCHITECTURE.md`.

The form-first prototype remains on the branch as a reference. Do not run the
Phase 2C migration yet.

## Guardrails

- maximum three adaptive follow-ups and six questions before summary;
- no identity questions or user-supplied Block/Team/Session authority;
- no other-student raw conversation in provider input;
- no invented evidence, progress or reason for no progress;
- no AI Teacher verification, Teacher Action, mark or contribution decision;
- no accusation or automatic risk label;
- student correction cannot be silently overwritten;
- every flag and Teacher question links to a source;
- provider failure must preserve answers and allow fallback submission;
- 2B1 remains unchanged;
- merge only after explicit approval.

## Review sequence

1. approve the experience design and three example interactions;
2. approve wireframes and schema delta;
3. implement the guided workspace;
4. execute the mandatory mock candidate regression in 2B2;
5. apply the reviewed migration and run the security audit;
6. confirm provider failure and 2B1 isolation;
7. review PR #65 for merge.
