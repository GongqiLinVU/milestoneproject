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

Phase 2C guided AI Intake workspace is **merged** (PR #65, commit `a7956a6`,
present on `main` and `origin/main`). The form-first prototype progressed to a
conversational UI, floating current/history evidence panel and OpenAI calls in
the controlled pilot. User traces revealed extraction, routing and confirmation
failures; **merge of the code does not establish end-to-end application
acceptance.** Local policy and mocked-endpoint regressions pass. The Phase 2C
**database audit** and **authenticated Preview submission remain pending** and
gate closeout (Phase D). See `PHASE2C_ADAPTIVE_ROUND.md` for rollout and cases,
and the reconciled merge/acceptance table below.

Harness v1 (Visual Harness Debug) is **merged** (PR #66, commit `55fae87`, on
`main` and `origin/main`): per-field accept/reject/repair, dialogue-only
continuation, one bounded provider retry and nonterminal fallback. De-identified
S3 source-pointer and future API 500 replays live in the adaptive suite. See
`PHASE2C_HARNESS.md`. No migration execution has been approved; no deploy has
been performed.

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

---

## Sprint 8 closeout direction (added 2026-09-30, Phase A)

Source: `Sprint8_Closeout_Plan_Claude_Handoff_EN_2026-09-30.md`. This section
records the closeout direction and the Phase A deliverables. It does **not** mark
Phase D complete, and does **not** supersede the unresolved application
acceptance requirements above (Phase 2C database audit and authenticated Preview
submission remain pending and required). PR #65 and PR #66 are **verified merged**
(see the reconciled table below); the merge is no longer a pending gate.

Closeout objective: establish a small, reproducible Intake benchmark, measure a
baseline, complete one measured improvement, perform necessary application
acceptance checks, then close Sprint 8. Research, general productization and large
datasets are later work, not closeout requirements.

Staged plan (only A is authorized now):

- **A — Standard + one trajectory prep (this round).** Deliverables produced:
  - `docs/sprints/sprint-08/BENCHMARK_STANDARD_v1.md` (draft C/R/S standard).
  - `docs/sprints/sprint-08/BENCHMARK_CASES_v1_DRAFT.md` (de-identified case draft
    + missing-input inventory).
  - `docs/sprints/sprint-08/S8-A_REPORT.md` (Phase A execution report).
- **B — Minimal runner + baseline.** **B1** done: Phase A documents corrected and
  one real replay baseline built (`S8-B1_REPORT.md`, `tests/ai-session-intake/replay/`),
  reporting R + state checks on the real S9 record (deterministic, no paid calls).
  **B2** done: one **synthetic** T1 four-Session **dynamic** baseline
  (`S8-B2_REPORT.md`, `gold-t1.json`, `run-dynamic-t1.mjs`) with a frozen T1
  scoring table, an offline smoke test (runner validation only:
  `C_mean=90 R_mean=90 S=25%`, 0 critical errors), calibration controls, and a
  prepared-but-unexecuted live mode. S9 replay kept as a separate R anchor. Live
  3× baseline (paid) remains gated on Joseph's model/spend approval.
  **B3** — **partial.** C/R attribution corrected and versioned
  (`intake-crs-scoring.v1.1` — a disclosed-but-unextracted fact is an R failure,
  not a C failure; offline re-scored `C_mean=95 R_mean=90 S=25%`), paraphrase
  routing + `pendingAdjudication` flags added, and live mode wired to the **real**
  `/api/session-intake-ai` workflow behind an approval gate (`S8-B3_REPORT.md`).
  **Live grader status:** the attempted live grader run produced **no parsed
  grades**, and same-student **carryover is not live-validated**. The single paid
  live trajectory remains gated on Joseph's model + spend approval (hard cap
  $0.20 requested; no paid call made).
- **C — One focused improvement + regression.** **Implemented and
  offline-verified this round** (`S8-C_REPORT.md`, incl. the Phase C follow-up).
  Three S9 failures fixed with the smallest coherent changes: (1) the
  explicitly-untested API-error path is preserved alongside the executed
  slow-connection test; (2) assistant-proposed details no longer enter the record
  — the "commit SHA" next action is rejected (semantic support now required
  beyond `sourceTurn` validity), and the **follow-up** removes the remaining
  unsupported specifics (the illustrative "500" and the method paraphrase
  "throttled network") so the record reflects the student's own "slow connection"
  words; (3) the UI defers to the backend's single authoritative review decision
  (the `accepted_action_ui_override` divergence is removed; correct outcome under
  policy is `continue`). Verified offline against the preserved S9 fixture with
  64 adaptive + 62 replay tests passing and a clean build; **no live S9 re-run and
  no paid provider call** were performed. A remaining general free-text
  semantic-grounding limitation is reported honestly (scoped sanitiser; §6 of the
  report). The single bounded live re-run is proposed as the next acceptance step.
- **D — Application acceptance + closeout.** **Not started / unverified.** The
  Phase 2C database audit and authenticated application acceptance (Preview UI
  submission, duplicate/cross-Block rejection, save-path RPC) remain unverified
  and gate closeout.

Current-state facts verified locally on 2026-09-30 (read-only):

- Working branch: `integration-tests-m4-m10-m14` (not `main`); uncommitted
  changes and untracked files present and preserved (not modified by Phase A/B1
  except the new closeout/benchmark documents and the new replay runner+test).
- Turn caps confirmed in code: `MAX_INTAKE_QUESTIONS = 8`, `MAX_INTAKE_TURNS = 17`
  (`src/intakePolicy.ts`). The technical maximum is not the desired teaching
  burden.
- No real consecutive same-student Intake **conversation** trajectory exists
  locally. The only real de-identified conversational record is a single S9
  (`recorded-cases-v2.json`, `s9-continuing-chat-provider-fallback`). The 2B1
  baseline is aggregated pre-Intake form analytics; the v0.5 T1/T2/T3
  trajectories are synthetic. See the missing-input inventory in
  `BENCHMARK_CASES_v1_DRAFT.md`.

### Verified merge/acceptance status (reconciled 2026-09-30 B1; re-verified 2026-10-07 Phase C)

The earlier "Current state" narrative above describes Phase 2C as an open Draft
PR #65 gated on merge approval. Verified against local + remote history, that is
now stale and is corrected here (the narrative is retained for history, not as the
current gate):

| Item | Status | Evidence |
|---|---|---|
| Phase 2C guided AI Intake workspace (PR #65) | **Verified merged** | commit `a7956a6` present on `main` and `origin/main` (`git branch --contains`) |
| Visual Harness Debug trace/replay (PR #66) | **Verified merged** | commit `55fae87` present on `main` and `origin/main` |
| Repeated-question / token-budget fixes | **Verified merged** | commits `63b1754`, `e7f44a3` on `main`; HEAD `main...HEAD` divergence = 0/0 |
| Phase 2C **database audit** (`sprint8_adaptive_intake_security_audit.sql`) | **Pending / unassessed** | not executed in Phase A/B1; requires a DB run, out of scope here |
| **Authenticated application acceptance** (Preview UI submission, duplicate/cross-Block rejection, save-path RPC) | **Pending / unassessed** | requires authenticated stack; not run in Phase A/B1 |

The database audit and authenticated application acceptance are kept **separate**
from the merge status: PR #65/#66 being merged does **not** imply those acceptance
checks passed. They remain required Sprint 8 exit items (Phase D).

Phase A does not authorize a runner, production changes, paid model calls, push,
merge, deploy or migration.
