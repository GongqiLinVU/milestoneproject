# Product Roadmap

## Product direction

Engineering Studio Platform will evolve from a single-course delivery portal into a reusable studio-based teaching platform. The roadmap deliberately prioritises reliable teaching workflows before analytics and AI.

## Sprint 1 — Production foundation

**Status: Completed and production validated**

Delivered:

- React, Vite and TypeScript application
- GitHub repository and Vercel production deployment
- Supabase integration, health check, grants and Row Level Security
- Week 1 student check-in, class pulse, team conversation and four-week promise
- Week 3 poster peer review with self-review and duplicate-review prevention
- Teacher authentication and teacher-only dashboard summary reads
- Student-friendly validation and duplicate-submission messages
- Activity-scoped modal state
- Same-browser duplicate prevention and read-only submission receipts
- Poster Peer Review student entry point temporarily disabled until Sprint 2 adds the formal teacher control

Production validation completed for all Sprint 1 student forms, teacher login, dashboard summary reads, database constraints and automatic Vercel deployment.

## Sprint 2 — Teacher operations and activity control

**Status: In progress — Phase 1 implemented in Draft PR**

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

- Add record views for Class Pulse, Team Conversation, Four-Week Promise and
  Poster Peer Review.
- Reuse the table, query, refresh and status patterns established in Phase 1.
- Preserve teacher-only reads and activity-specific state.

#### Phase 3 — Teacher actions

- Allow authorised teachers to edit incorrect records.
- Allow authorised teachers to delete invalid records after explicit confirmation.
- Refresh affected rows and summary counts after mutations.
- Preserve database constraints during edits and translate constraint failures into understandable messages.
- Add teacher-only UPDATE and DELETE grants and RLS policies for each managed activity table.

#### Phase 4 — Poster Peer Review Week 3 control

- Add an Admin control labelled **Open peer review**.
- Default the control to off.
- Keep the student Peer Review button visible but disabled while closed, with **Peer review opens in Week 3**.
- When a teacher opens the activity, enable the student entry point without a redeployment.
- Store the activity state in Supabase as non-sensitive configuration.
- Permit public read of only the safe activity-open state.
- Permit state changes only for authenticated teachers.
- Enforce the closed state in the Poster Review INSERT policy so a direct API request cannot bypass the UI.
- Existing review records remain readable and manageable by teachers whether the activity is open or closed.

#### Phase 5 — Export and production hardening

- Add CSV export only after record viewing and management are stable.
- Export the currently selected activity with explicit, stable column headings.
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

## Sprint 3 — Teaching analytics

**Status: Planned**

Potential scope:

- Participation overview
- Submission completion by activity
- Team-level aggregation
- Confidence distribution
- Poster review averages
- Missing submission indicators
- Filter and search
- Downloadable reporting

Analytics must remain descriptive and evidence based. They must not infer student performance without sufficient evidence.

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
