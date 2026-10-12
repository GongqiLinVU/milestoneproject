# NIT3004 Platform — Block Readiness Review and Implementation Plan

Review date: 8 October 2026. Source: main commit `96d2aee84bacced9f332af1e1421cce840accaea` (PR #67).
Teaching starts 2 November 2026. Complete testing before 30 October: target acceptance by 29 October, with 30 October reserved for release/configuration checks and contingency.

## Evidence and scope

Fetched GitHub main and inspected the merged source, API handlers, migration definitions, Sprint 7/8 plans, benchmark assets, student portal, teacher controls and account/team setup. Re-ran `npm test`: 65/65 passed. Re-ran `npm run build`: passed, with a large-chunk warning. Build/test verification is independent of Claude's reported results. No paid calls, database operations, deployments or changes to project source were performed. Authenticated browser journeys, deployed schema, roster and actual classroom schedule were not inspected; they remain acceptance work. Production deployment and HTTP 200 are reported by Claude, not independently established in this review.

This is a source-level review and implementation prioritization, not a complete security audit or classroom-readiness certification.

## Existing capabilities to reuse

- Teacher-managed teaching Blocks, roster CSV preview/import, accounts and team/project assignment (`src/TeamAllocation.tsx`, `src/StudentAccess.tsx`, account APIs).
- Student login and recovery, project context, weekly activation, classroom activities, check-in and session history.
- Teacher S1–S10 preparation/edit/open/close controls, attendance CSV, legacy Work Track viewing/verification, platform-feedback completion status.
- Conversational Intake, per-field validation, review/correction/attestation, source conversation persistence, same-student history and bounded fallback dialogue.
- Existing SQL audit scripts, offline runtime regressions and local integration harness. Reuse these; do not create another testing engine.

## Prioritized findings

### P0 — Launch dependencies

**R01: Intake remains limited to the mock-pilot Block.**
Student routing checks a display label matching 2026 2B2 (`StudentPortal`); teacher controls check block_code 2B2; the AI endpoint rejects other block codes; `save_my_session_intake_chat` also requires 2B2. The new November Block code has not been supplied. If it is not 2B2, the current AI journey cannot be used unchanged. Even if it is 2B2, do not mix real teaching with mock roster/history.
Action: identify the actual teaching Block and introduce one server-authoritative, opt-in per-Block Intake mode (disabled, deterministic, AI) or an equivalent explicit capability. Derive UI capabilities from trusted context, not display-label regex. Align API and SQL eligibility. Default other Blocks to their existing behavior; preserve archived history. Use a reviewed additive migration if needed; do not edit an old applied migration as the deployment mechanism.
Acceptance: real teaching Block works; mock and archived Blocks remain isolated; a forged client capability does not authorize AI or save access; disabled mode does not call the provider.

**R02: New Intake lacks a teacher-facing reading workflow.**
No use of `student_session_intakes` or teacher Intake RPC was found in src. `StudioSessionControl.openEvidence` reads legacy `get_teacher_session_work_tracks`; the Work Track button is hidden for supportsIntake sessions. Existing SQL allows teachers to select Intake rows, but there is no corresponding teacher UI found.
Action: implement a minimal Block/Session-filtered Intake list, submitted/missing status, student-confirmed summary, testing limitations, source conversation and corrections. Reuse existing teacher review where appropriate. Do not build grading, analytics or a full new verification subsystem for launch.
Acceptance: a student submission is visible to the teacher in the correct Block; source can be inspected; student corrections and reported facts remain distinct from teacher judgement; unauthorized students cannot read the list.

**R03: Untested-path limitation is stored but absent from the visible review.**
`baseline_or_expected` stores the Phase C limitation. The chat review editors omit testingBaseline, and Evidence renders method/result without baseline_or_expected.
Action: display the scoped limitation in student review, confirmed history and teacher view. Allow a traceable student correction of that field. Keep executed observation and untested path separate.
Acceptance: the same S9 record visibly shows both before confirmation and after reload; correction resets attestation and preserves extraction/correction history.

**R04: Required authenticated and database acceptance is incomplete.**
Sprint 8 D remains unverified. SQL definitions in Git do not establish deployed database policies or grants.
Action: run appropriate read-only audit scripts and a controlled authenticated rehearsal: login, eligible Session, confirm/save/reload, duplicate rejection, other-student/cross-Block rejection, teacher read and next-Session history. Use isolated approved fixtures and retain results. This includes non-AI classroom flows.
Acceptance: persisted output and authorization results, not screenshots or HTTP 200 alone. Any paid live Intake run requires a concrete model/call scope and budget approved separately.

### P1 — Required before classroom rollout

**R05: Conversation draft safety.**
`SessionIntakeModal` keeps answers/turns in React state; its close callback unmounts it. No draft recovery or unsaved-work guard was found for that component. Older progress forms have localStorage drafts, which do not protect Intake.
Action: provide explicit unsaved-exit protection; implement scoped draft recovery if needed, with user/Block/Session isolation and clear-on-confirm/logout behavior. Choose storage deliberately because transcripts may contain personal information.
Acceptance: accidental exit does not silently discard work; drafts never appear for another student; save failure preserves retryable content.

**R06: Make provider-independent completion directly usable.**
A deterministic form prototype exists, but no mount of that component was found in the active chat journey. Repeated provider failure preserves transcript but not necessarily structured answers; students may reach the cap and manually reconstruct the review.
Action: provide a clear non-AI completion path reusing existing contract/persistence logic, preserving already-entered content. Give a student-readable failure message; remove migration instructions from the student save-error UI. Add an operator AI-off control as part of R01.
Acceptance: with provider unavailable, a student can produce, correct, save and reload a valid record without repeated model calls or retyping all known facts.

**R07: Server-side usage control.**
API bounds request size/output and question count from the submitted conversation; no durable per-student/Session rate or spending enforcement was found in the handler. Client-supplied short transcripts can be resubmitted. Benchmark budget ledgers do not limit classroom API usage.
Action: add bounded server-side request/attempt controls and measurable classroom usage, distinct from evaluator/simulator cost. Use explicit incomplete/fallback outcomes rather than reporting false sufficiency. Select thresholds from measured baseline and pilot results.
Acceptance: repeated requests cannot evade the chosen policy; failures/retries are accounted for; disabled AI remains usable through deterministic completion.

**R08: Session configuration and activation transition.**
`prepareTen()` uses fixed offsets 0,2,3,7,9,10,14,16,17,21 from starts_on, and assumes missing Session numbers begin after sessions.length. It falls back to today's date if starts_on is missing. These are defaults, not a confirmed timetable. RPC definitions require a student to belong to exactly one active Block.
Action: configure actual start/end dates and timetable, validate timezone and open windows, preview before writing. Make preparation idempotent by missing Session number if partial setup is possible. Check continuing students' old/new active enrollment transition without deleting history.
Acceptance: correct S1–S10 dates, one current Session with deliberate catch-up availability, correct activities by week, continuing accounts resolve to the intended Block. Do not activate the real Block during read-only planning.

**R09: Dataset/benchmark credibility and minimum safety suite.**
Keep the approved five representative Levels; only L1 has been drafted in this conversation and remains pending Joseph's review. Do not expand to a large variant taxonomy. Existing T1 R checks often test field population, not fact fidelity; authorizedRepeat can return Session-wide facts without updating disclosure IDs; offline/live routers differ. These are review findings on the merged runners, not proof that every stored run took the defective path.
Action: repair the measurement mechanisms before using them for acceptance. Preserve gold/formulas and historical results, version tooling and establish a new baseline. Finish the five reviewed case JSONs incrementally. Reuse mandatory safety cases and add the essential Hannes/Soh boundary checks: legitimate criticism, unrelated redirect, fabricated-evidence refusal, injection and unauthorized access.
Acceptance: disclosure text/ledger agree; R checks actual fact meaning; pairwise supported paraphrases are not rejected; safety and quality are reported separately. Model sampling does not establish classroom effectiveness.

### P2 — Defer beyond launch unless evidence changes priority

General semantic-grounding engine, automatic marks/authorship/contribution decisions, advanced longitudinal analytics, general Harness productization, extensive scenario variants, large dataset expansion and two-model comparison. Chunk splitting is useful later; the current build warning alone is not a launch blocker.

## Teaching usage plan — draft for Joseph's review

| Stage | Student use | Teacher use | Deliverable |
|---|---|---|---|
| Week 1 / Commit | Login, verify team/project, check-in, bounded responsibility/first action, existing commitment activities | Open scheduled Session/activities; resolve roster and responsibility problems | Account/team checks and clear initial action |
| Week 2 / Prove | Short Intake on changes/evidence; existing pre-check; respond to teacher feedback | Read Intake before focused demonstration/review; capture teacher judgement separately | Inspectable progress and actionable support |
| Week 3 / Validate | Integration/test outcomes and gaps; poster/peer activities; final readiness | Follow unresolved failures; inspect artifacts; prioritize support | Explicit tested/untested state and delivery gaps |
| Week 4 / Deliver | Final presentation/report through the existing course process; platform feedback | Use source records as supporting evidence; retain grading authority | Final delivery and feedback |

Do not automatically require an Intake and a duplicate report/form on the same content in every Session. Joseph selects the collection points and which existing activities remain. Treat S10 as the existing feedback/final-presentation path; current Intake supports S1–S9. This table does not change official assessment requirements or approve research use of classroom data.

## Delivery checkpoints

- 8–11 October: freeze November Block identity, scope and timetable draft; agree P0/P1 backlog and five-case design.
- 12–18 October: implement Block capabilities, teacher Intake read view, visible limitations and usable fallback; audit/rehearse the resulting slice.
- 19–25 October: complete five-case evaluation, authorization and authenticated full-platform rehearsal; measure usage and teacher/student burden where feasible.
- 26–29 October: fix blockers and recheck changed paths; complete release acceptance and short user/operator instructions.
- 30 October: deployment/configuration verification and contingency only; testing is intended complete beforehand.
- 2 November: classroom delivery, record issues and representative cases for later dataset additions.

AI rollout additionally depends on the applicable institutional use/approval arrangements. If that path is not ready, the whole Platform must remain usable through existing activities and deterministic intake. Do not treat one university's approval as another's approval.

## Claude task 1 — local planning and first implementation slice

Read applicable repository rules and inspect current main and local changes. Use main 96d2aee as the reviewed reference, but verify actual HEAD. Joseph/ChatGPT plan and review; Claude implements locally and reports in English.

First reconcile this review against code and produce docs/sprints/sprint-09/PLAN.md and HANDOFF.md with current evidence, prioritized tasks and the 29/30 October and 2 November dates. Do not claim Sprint 8 is closed. Preserve its remaining D and live-validation status. Resolve the exact November Block code from authoritative local records; if unavailable, identify it as Joseph's one setup input rather than guessing or creating live data.

Implement R03 first: show the scoped testing limitation in student review and confirmed history, and allow a traceable correction with attestation reset. Add focused regressions, run relevant offline checks/build, and report before/after behavior. Assess the minimum secure teacher read workflow for R02 and the capability change for R01; document the concrete next implementation slice and any additive migration required, without applying it.

Authorized: ordinary reads, local reversible implementation, offline tests and repository planning documents. Not authorized by this task: paid calls, production database writes, migrations, commit/push/merge/deploy or new dataset expansion. Protect unrelated changes. Stop after the English implementation report for review.
