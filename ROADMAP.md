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

## Sprint 3 — Continuous Engagement, Review and Reusable Cohorts

**Status: Closed at the agreed delivery boundary on 30 July 2026**

Sprint 3 delivered the core Week 1–3 evidence and teacher-review workflow, then
expanded the platform for repeatable teaching blocks and roster-authoritative
team allocation.

Delivered:

- Week 1 individual Team Health Check and Engagement Check-out
- Week 2 Implementation Pre-check and Engagement Check-out
- private Teacher Review and Follow-up with Week 3 Check-out
- limited teacher-controlled AI suggestion pilot with advisory-only guardrails
- reusable teaching blocks with existing records backfilled to `2026 · 2B1`
- teacher-managed block roster and CSV import
- private Find My Team lookup using Student ID and a least-privilege RPC
- explicit block-scoped submissions and activity records
- automatic own-team assignment from `block_id + Student ID`
- target-team-only cross-team review forms

The remaining planned work was intentionally moved to Sprint 4 rather than
extending Sprint 3 further. Sprint 3's completed plan and evidence remain in
`docs/sprints/sprint-03/`.

## Sprint 4 — Project Foundation and Weekly Continuity

**Status: Closed at the agreed Phase 3 boundary on 31 July 2026**

Delivered:

- block-scoped formal teams, Project Catalogue and team project assignments
- NIT3003 → NIT3004 project continuation
- a selection-first Week 1–4 recovery and readiness journey
- roster-derived team and project context
- Week 3–4 teacher follow-up continuity linked to original Week 2 evidence
- Project Setup pagination, stacked layout and explicit assignment saving

The former Phase 4 trajectory/analytics work and Phase 5 export/privacy validation
were intentionally moved to Sprint 5. Detailed historical scope and evidence
remain in `docs/sprints/sprint-04/`.

## Sprint 5 — Student Identity and Experience Simplification

**Status: In progress — Phase 1–3 merged; Phase 4A final delivery underway**

Phase 3 uses a two-surface student experience: public course information at
`/`, and roster-authenticated Session Check-in plus weekly activities at
`/student`. Recurring attendance is separate from the historical Week 1
activation Check-in.

### Goal

Reduce the platform's student-facing complexity while introducing enough
identity to associate students reliably with their block, team, project and
evidence.

### Confirmed direction

- retire Class Pulse and Team Conversation from the active experience
- preserve their historical data
- provide roster-based student login without open registration
- use unique activation credentials rather than a shared default password
- automatically resolve Student, Block, Team and Project after login
- remove repeated identity fields and consolidate the student journey
- complete weekly activity management and Week 4 Presentation Order

Phase 1 removes Class Pulse and standalone Find My Team entry points from the
student UI and removes Class Pulse from current teacher Activity Records. Team
Conversation was already retired from the active UI in Sprint 3. Historical
`week1_pulse` and `team_conversations` rows and policies remain unchanged.

Phase 2 adds roster-prepared student accounts, individual activation
credentials, first-use password change, legacy Check-in recognition and a
student-only active block/team/project context. Open registration remains
disabled and the service-role key remains server-only.

### Delivery sequence

1. Activity cleanup and minimal information architecture
2. Student authentication foundation and security design
3. Authenticated student journey refactor
4. Weekly Activity Management and Presentation Order
5. Focused production regression and Sprint close

Detailed scope, security constraints, acceptance criteria and the new-session
handoff are stored in `docs/sprints/sprint-05/`.

## Sprint 6 — Trajectory, Analytics and AI-assisted Teaching

**Status: Future — renumbered from the former Sprint 5**

Potential scope:

- Student and Team trajectory across Week 1–4 evidence
- Block teaching analytics with evidence drill-down
- Block/team/project/student-aware enhanced exports
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
