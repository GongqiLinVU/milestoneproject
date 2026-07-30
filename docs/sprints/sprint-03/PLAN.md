# Sprint 3 — Continuous Engagement and Teaching Review

**Status: Active — Phase 3C-1 complete; Phase 3C-2 in progress**

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

Add a two-minute Individual Progress Review before the compulsory Monday review and reuse the ten-question Engagement Check-out with week number 2. The progress review captures current progress, contribution areas, evidence status and reference, next-task clarity, support needs and a conditional discussion note. Week 2 evidence prepares the project demo, method verification and individual discussion.

Acceptance:

- Each Student ID submits one Progress Review and one Week 2 Check-out.
- Contribution areas support multiple selections.
- Written notes appear only where evidence needs clarification or a risk/support answer is selected.
- Students can insert but cannot read or manage submissions.
- Teachers can review raw evidence and identify review readiness without automated marks.
- Week 1 records and receipts remain separate and unchanged.
- Build, migration and RLS verification pass before merge.

## Phase 3 — Teacher Review and Week 3 Check-out

Add a teacher-only Review & Follow-up workflow inside each student's Week 2 Implementation Pre-check. The collapsed card shows only name, Student ID, team, deliverable and follow-up status; one card opens at a time for a private student conversation. Student claims remain read-only. The teacher compares the claim with the live demo and code, then records review outcome, demonstration, method, evidence, contribution, Progress Report alignment, feedback, agreed actions, follow-up status and an optional Week 2–4 recheck.

Reuse the Engagement Check-out with week number 3, emphasising final-delivery participation, evidence readiness and unresolved risk. Student self-report and teacher judgement remain separate.

Acceptance:

- Only authenticated teachers can create, read, update or delete Teacher Review records.
- One Teacher Review is retained per Student ID; saving again updates the same follow-up record.
- Student pre-check evidence is read-only and separate from teacher feedback.
- Only one student card is expanded at a time; other students' feedback remains closed during the conversation.
- Follow-up status supports Not reviewed, No follow-up needed, Action required, In progress, Recheck next session and Resolved.
- Teacher Review outcomes are descriptive evidence and never an automatic mark.
- Students can submit one Week 3 Check-out using the existing Student ID + week constraint.
- Week 1 and Week 2 records remain unchanged.
- Build, migration and RLS verification pass before merge.

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


## Phase 3 delivery slices

### Phase 3A — Review foundation

- Keep one student review open at a time.
- Add a compact Project Snapshot to the student pre-check.
- Preserve student submissions as read-only evidence.
- Keep the Private Teacher Record collapsed by default.
- Separate verification outcome from operational follow-up status.
- Preserve existing Phase 2 rows when adding project context.

### Phase 3B — AI teaching suggestion

- Provide two teacher-triggered checkpoints: a starting suggestion before verification and a closing suggestion after verification.
- The starting suggestion uses only Project Snapshot and student pre-check evidence; the closing suggestion adds teacher verification.
- Call OpenAI from a server-side function; never expose the API key in the browser.
- Send project context and review evidence only; exclude student name, ID and email.
- Return short structured fields appropriate to each checkpoint, including what changed after review in the closing suggestion.
- Label all output as AI-generated and require teacher review.
- AI must never set verification status, follow-up status or marks.
- Allow the teacher to use, edit, regenerate or dismiss a suggestion.

### Phase 3C — Follow-up continuity

- Surface Action required, In progress and Recheck items in later-week teacher views.
- Keep a single current review per student while preserving updated timestamps.
- Provide a compact follow-up queue for Week 3 and Week 4.

Phase 3B acceptance:

- Only a valid Supabase teacher session can call the AI endpoint.
- `OPENAI_API_KEY` is server-only and absent from browser bundles.
- Requests exclude name, Student ID, email and team.
- Project name, description and implementation claim are required for both checkpoints; begun teacher verification is required only for closing.
- Starting output contains an initial signal, one question, what to verify and a teaching spark.
- Closing output contains a final signal, what the review clarified, what changed, one next action and a closing teaching message.
- Suggestions remain temporary until the teacher explicitly copies content and saves the review.
- AI cannot set marks, verification outcome or follow-up status.
- Starting and closing suggestions can be generated, edited, regenerated and dismissed independently.
- Only the closing suggestion can be copied into the formal follow-up note.


## Phase 3C — Reusable Cohorts and Weekly Engagement Journey

Class delivery repeats across four blocks each academic year: `1B1`, `1B4`,
`2B1` and `2B4`. Each block has a different roster and team allocation.
Sprint 3C therefore introduces cohort identity before changing the weekly
questions. Existing `2026 · 2B1` classroom records must be retained and
assigned to the initial active teaching block.

### Phase 3C-1 — Multi-block foundation

- Add `teaching_blocks` with academic year, block code, dates and lifecycle
  status.
- Seed `2026 · 2B1` as the active block for migration of existing records.
- Scope activity settings and every identified student/team activity to a
  `block_id`.
- Replace global duplicate rules with block-scoped uniqueness.
- Keep current production forms working during migration by defaulting new
  inserts to the single active block.
- Allow only one active block at a time in the first version.
- Keep archived blocks teacher-readable and prevent records leaking between
  dashboard block selections.

Acceptance:

- Existing production rows are retained and linked to `2026 · 2B1`.
- The same Student ID may submit the same activity in a later block.
- The same team number may be reused in every block.
- Duplicate submissions remain rejected within one block.
- Existing student forms continue to insert into the active block without
  requiring student authentication.
- Teachers can read teaching blocks; public users can read only the minimal
  active-block identity required by the portal.
- Migration, RLS checks and production smoke tests pass before merge.

### Phase 3C-2 — Team allocation and Find My Team

- Add a teacher-managed roster scoped to `block_id`.
- Support manual entry and CSV import of Student ID, name, VU email and team.
- Add a private lookup using Student ID plus VU email.
- Return only the matched student's block, team number, project name and
  teammates' preferred names; never return a class list, IDs or email addresses.
- Add server-side rate limiting and generic mismatch responses to reduce roster
  enumeration.
- Auto-fill the verified team in later forms while keeping student accounts out
  of scope. This follows after roster lookup is production-validated so existing
  form submission behaviour is not changed in the same release.

3C-2 first-release acceptance:

- Teacher selects a teaching block and sees only that block's roster.
- Teacher can add/update one student or import the documented CSV columns.
- Student ID and VU email are unique within a block but reusable in later blocks.
- Find My Team accepts Student ID + VU email and returns only the matching team,
  optional project, and teammates' preferred names.
- Browser roles cannot read the roster directly.
- The lookup endpoint uses a server-only service role, hashes lookup identifiers,
  limits attempts, disables caching and returns one generic mismatch response.
- No student account is introduced and no existing weekly form is blocked.

### Phase 3C-3 — Week-specific engagement journey

- Retain a short common pulse across Weeks 1–3 for longitudinal comparison.
- Week 1 focuses on project direction, role clarity and team alignment.
- Week 2 focuses on implementation, demonstration and traceable evidence.
- Week 3 focuses on completion, testing, report and presentation readiness.
- Carry unresolved teacher follow-up within the same block only.
- Prefer selections and quick actions; keep one optional short note.

The reusable relationship is:

`Teaching block → roster → teams → weekly submissions → teacher review`

Longer-term comparison between blocks must use aggregated, preferably
de-identified teaching signals. Individual student records are operational
teaching evidence, not performance analytics across cohorts.
