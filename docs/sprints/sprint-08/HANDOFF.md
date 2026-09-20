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

Phase 2C remains open in Draft PR #65. The form-first prototype has progressed
to a conversational UI, floating current/history evidence panel and OpenAI
calls in the controlled pilot. User traces revealed extraction, routing and
confirmation failures; dialogue quality does not establish end-to-end acceptance.
The adaptive candidate is implemented on the Draft branch; local policy and
mocked-endpoint regressions pass. Database audit and authenticated Preview
submission remain pending. See `PHASE2C_ADAPTIVE_ROUND.md` for rollout and cases.

## Confirmed product direction

Session Intake is a guided learning assistant and evidence workspace. It has
three stable collection directions:

- responsibility and change;
- evidence and verification;
- blocker and next action.

The normal UI combines a one-question-at-a-time conversation with a floating
evidence area, normally hidden and opened from per-answer update summaries. Current Session focus and the same student's previous confirmed
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

## Phase 2C UI baseline

Retain the agreed portal and workspace design while improving the conversation:

1. show one expanded Current Session at the top;
2. place My Project below it in compact form;
3. collapse completed, catch-up and upcoming Session groups;
4. move Class Activities to the bottom and collapse them on login;
5. use one dedicated full-page Intake workspace for every selected Session;
6. keep catch-up Sessions accessible but secondary when several Intakes are
   open;
7. validate desktop/mobile scrolling, navigation and draft protection;
8. refine routes and AI extraction without reopening the agreed layout.

Session status determines the primary class focus. Intake access only determines
whether a Session may accept an Intake. Therefore S1 and S2 may remain open for
catch-up while S3 is the single Current Session.

Detailed UI decision:
`docs/sprints/sprint-08/PHASE2C_UI_ARCHITECTURE.md`.

This planning update does not execute or authorise a new database migration.
Any required persistence changes must be reviewed and audited before use.

## Guardrails

- approved next policy: zero to five adaptive follow-ups, normally one to three,
  with early stopping; the new chat policy/prompt, additive v1.1 persistence RPC
  and candidate suite are updated together. Historical v1.0 paths remain intact;
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

## Next application round

1. Resolve final confirmation failures while preserving every source turn and
   student correction; add a regression for complete conversation persistence.
2. Correct claim/evidence classification and unknown/not-applicable handling.
3. Implement the approved bounded adaptive policy with a compact source-linked
   assessment: specificity, evidence/verification readiness, testing maturity,
   uncertainty, actionability and support need. Short answers are not evidence
   of low ability; detailed answers should not trigger redundant questions.
4. Route to targeted clarification, a student-accepted small action or Teacher
   help; stop early when useful collection is complete. Five follow-ups are a
   ceiling, not a quota. Track token cost separately.
5. Run the mandatory mock suite, including sparse/complex replies, source
   fidelity, early stopping, budget limits, provider failure and 2B1 isolation.
6. Review any required migration and audit results, then review PR #65 for merge
   only after explicit user approval.

## Research workstream — secondary to delivery

Decision 2026-09-16: keep the research direction simple and application-led.
Study when to ask for evidence, help define a small next action, or defer to the
Teacher under a bounded interaction budget. This is a hypothesis to test, not
a demonstrated contribution or claim of improved learning.

Use the same application's versioned regression and pilot traces. Begin with
fixed/rule-based and adaptive cases; once stable, compare a fixed-policy LLM
condition under comparable model/context/budget. Do not build a separate
research engine or require a publication result to ship the application.

Aggregate at these checkpoints:

- reliable confirmation/source preservation: baseline failure and regression report;
- passing adaptive mock suite: frozen baseline/candidate comparison;
- approved classroom pilot with Teacher reviews: usefulness, burden and review time;
- S1–S4 with rechecks: next-action follow-through and independently verified evidence;
- Sprint close: findings, limitations and whether a paper question is supported.

Record versions, source-linked changes, routes, budgets, failures and measured
cost/latency without inventing missing metrics. Keep raw student traces out of
public Git. Obtain applicable ethics/consent arrangements before research use of
classroom records; do not automatically repurpose historical teaching data.

See the application-first research workstream in
`docs/sprints/sprint-08/PLAN.md` for measures and aggregation decisions.
IJCAI-27 is an aspirational extension, not a product gate or guaranteed outcome.
