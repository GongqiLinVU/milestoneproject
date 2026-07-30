# Product Roadmap

## Product direction

Engineering Studio Platform will evolve from a single-course delivery portal into a reusable studio-based teaching platform. The roadmap deliberately prioritises reliable teaching workflows before analytics and AI.

## Sprint 1 — Production foundation

**Status: Completed and production validated**

Delivered:

- React, Vite and TypeScript application
- GitHub repository and Vercel production deployment
- Supabase integration, health check, grants and Row Level Security
- Week 1 student check-in, class pulse, team conversation and four-week action plan
- Week 3 poster peer review with self-review and duplicate-review prevention
- Teacher authentication and teacher-only dashboard summary reads
- Student-friendly validation and duplicate-submission messages
- Activity-scoped modal state
- Same-browser duplicate prevention and read-only submission receipts
- Poster Peer Review student entry point temporarily disabled until Sprint 2 adds the formal teacher control

Production validation completed for all Sprint 1 student forms, teacher login, dashboard summary reads, database constraints and automatic Vercel deployment.

## Sprint 2 — Teacher operations and activity control

**Status: Completed and production validated**

### Goal

Turn the dashboard from a summary screen into a safe operational teaching tool. Teachers must be able to inspect and correct submitted evidence, remove invalid records, export data and control when Poster Peer Review opens. Student submissions remain create-once and students remain unauthenticated.

Detailed scope, Phase acceptance criteria and the current handoff are stored in
`docs/sprints/sprint-02/`.

### Delivery sequence

#### Phase 1 — Dashboard foundation

- Implemented while preserving authentication and the five summary cards.
- Restores Supabase sessions and provides explicit teacher sign-out and access
  status, including a clear non-teacher state.
- Provides loading, empty, refresh and actionable error states.
- Shows a detailed Student Check-in table with name, Student ID, team, goal,
  created time and updated time.
- Establishes reusable table, query, refresh and status patterns for Phase 2.

#### Phase 2 — Activity record views

- Implemented clickable summary panels for all five activity record views.
- Added stable activity-specific headings, fields, descriptions and empty states.
- Reused the protected query, refresh and table patterns established in Phase 1.
- Clears previous rows during switching to preserve activity-specific state.
- Presents anonymous Class Pulse responses only as class-level distributions.
- Separates the initial Check-in goal from a later Four-Week Action Plan focused
  on action, success evidence and required support.

#### Phase 3 — Teacher actions

- Implemented authorised edit and explicit confirmed delete for identified
  activity records.
- Refreshes the selected records and all summary counts after mutations.
- Preserves database constraints and translates common failures into
  understandable teacher-facing messages.
- Adds minimum authenticated UPDATE/DELETE grants backed by `is_teacher()` RLS.
- Keeps anonymous Class Pulse rows outside record management.

#### Phase 4 — Poster Peer Review Week 3 control

- Implemented an Admin control labelled **Open peer review**, defaulting to off.
- Keeps the student Peer Review button visible but disabled while closed, with **Peer review opens in Week 3**.
- Enables the student entry point from Supabase state without a redeployment.
- Stores one non-sensitive activity state row with public read and
  teacher-only update access.
- Enforces the closed state in the Poster Review INSERT policy so a direct API
  request cannot bypass the UI.
- Keeps existing review records readable and manageable whether open or closed.
- Requires migration application and production verification before Phase 4 is
  complete.

#### Phase 5 — Export and production hardening

- Refined Poster Peer Review so the two teams are unambiguous and responses use
  descriptive selections instead of required written comments.
- Added CSV export after record viewing and management became stable.
- Exports the currently selected activity with explicit, stable column headings.
- Keeps Class Pulse anonymous by exporting aggregates rather than individual
  response rows.
- Re-test duplicate, self-review and create-only student behaviour.
- Verify anonymous and authenticated non-teacher users cannot read or mutate protected records.
- Run production build, apply reviewed migration SQL, verify production policies and test the Vercel deployment.

### Out of scope

- Student accounts or student-side editing
- AI summaries, recommendations or risk prediction
- Major or generic database redesign
- Multi-course administration
- Tutor/coordinator role expansion
- Scheduling multiple activity windows

### Security and privacy requirements

- RLS remains the primary security boundary.
- The browser must never receive a service-role key.
- Anonymous users may insert only where the relevant activity policy permits and may not read student submissions.
- Authenticated non-teachers must not gain teacher access.
- Teacher UPDATE and DELETE policies must call the existing `is_teacher()` role check.
- Every database change requires an idempotent migration, matching `schema.sql`, production verification queries and documented recovery steps.
- Raw PostgreSQL or Supabase errors must not be displayed to students.

### Acceptance criteria

- An unauthenticated user cannot access dashboard records.
- An authenticated non-teacher cannot select, update or delete protected records.
- A teacher can sign in, sign out and view each activity's records.
- The Student Check-in table shows name, Student ID, team, goal and timestamps.
- A teacher edit is persisted, immediately reflected in the UI and still obeys constraints.
- Delete requires explicit confirmation, removes only the selected record and refreshes counts.
- Loading, empty and error states are understandable and accessible.
- CSV export matches the selected activity and does not expose data outside the teacher session.
- **Open peer review** is off by default.
- While closed, the student button is disabled and direct anonymous Poster Review inserts are rejected by RLS.
- When opened by a teacher, the student form becomes available without redeployment and valid inserts succeed.
- Closing the activity again blocks new submissions without changing existing records.
- `npm run build`, migration verification and production smoke tests pass.
- README, AI context, architecture, roadmap and changelog are synchronised with the implemented behaviour.

## Sprint 3 — Week 2 Review and Teaching Analytics

**Status: Active — Phase 3C-2 team allocation in progress**

Sprint 3 combines the original Teaching Analytics direction with classroom
feedback gathered on 27 July 2026. The current shared, long-text Team
Conversation had low participation, and teachers need structured individual
evidence before Week 2 reviews plus a place to record feedback and follow-up.

Planned delivery sequence:

1. Replace Team Conversation with an individual, selection-first Team Health
   Check and team response summaries.
2. Add a short Week 2 Individual Progress Review completed before the teacher
   meeting.
3. Add teacher-only review outcome, feedback, agreed action and follow-up.
4. Add completion, team health, disagreement and follow-up analytics that drill
   down to submitted evidence.
6. Add authorised export, privacy verification and production hardening.

Most student questions use selections. Short text is conditional or optional.
Analytics remain descriptive and must not infer marks or performance without
sufficient evidence.

Detailed scope, Phase acceptance criteria and activation rules are stored in
`docs/sprints/sprint-03/`. Sprint 2 was production validated on 27 July 2026. Sprint 3 is now the active
Sprint; new Sessions should begin with Phase 1 unless the user explicitly
changes priority.

## Sprint 4 — Student identity and team management

**Status: Planned**

Potential scope:

- Student authentication using approved university identity options
- Student profile
- Team membership
- Controlled resubmission or correction workflow
- Additional teacher-managed activity windows
- Tutor and coordinator roles

The current anonymous submission workflow should remain available until authenticated student onboarding is proven usable.

## Sprint 5 — AI-assisted teaching

**Status: Future**

Potential scope:

- Weekly evidence summary
- Common concern clustering
- Suggested teacher interventions
- Team health signals
- Reflection support
- Teacher copilot

Guardrails:

- AI must cite the underlying student evidence.
- AI output is advisory, not an automatic mark or disciplinary decision.
- Sensitive student information must be minimised.
- Teachers retain final judgement.

## Longer-term platform direction

Possible future modules:

- NIT3003
- AI workshops
- Industry project studios
- Developer meeting facilitation
- Reusable course and activity configuration
- Multi-course teacher administration

These expansions should only begin after the NIT3004 workflow is stable and demonstrably useful.

## Sprint lifecycle

- Every Sprint builds on latest `main`; Sprint names are not long-lived code
  branches.
- Completed Sprint plans and handoffs are frozen historical records.
- New requirements discovered after completion move to a later Sprint and cite
  their origin. Do not create revision names such as `Sprint 2-1`.
- Phases divide one Sprint into reviewable sessions and focused Draft PRs.
- `docs/sprints/sprint-xx/PLAN.md` defines scope, while `HANDOFF.md` records
  verified progress and evidence.


### Sprint 3 Phase 1 — Week 1 Engagement Loop

Implemented in PR #18: individual Team Health Check, Week 1 Engagement Check-out, Team Participation Temperature, create-only student access and teacher-only review. Historical Team Conversation and Four-Week Action Plan records are retained.


### Sprint 3 Phase 2 — Week 2 Progress Review and Check-out (in progress)

- Add an individual pre-review progress snapshot.
- Reuse the ten-question engagement check-out with Week 2 identity.
- Prepare teacher review readiness from progress, evidence and support signals.
- Keep teacher judgement and feedback separate for Phase 3.


### Sprint 3 Phase 3B — AI Teaching Suggestion (completed)

A narrow teacher-controlled pilot adds one structured teaching suggestion inside the private Review & Follow-up. The server excludes student identity, requires a teacher session, does not persist AI output automatically and never changes marks, verification or follow-up status.


### Sprint 3 Phase 3C — Reusable blocks, teams and weekly engagement

Delivery order:

1. Multi-block foundation: academic year + block, active/archive lifecycle,
   existing `2026 · 2B1` backfill and block-scoped duplicate rules.
2. Team allocation and private Find My Team: teacher roster management, CSV
   import and Student ID + VU email lookup without public class lists.
3. Week-specific engagement: a comparable common pulse plus different Week 1,
   Week 2 and Week 3 readiness questions.

This expands reusable cohort management without introducing student accounts or
a generic multi-course administration framework.
