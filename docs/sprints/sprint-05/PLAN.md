# Sprint 5 — Student Identity and Experience Simplification

**Status: Planned — ready for a new session**

## Origin

Sprint 5 begins after Sprint 4 reached a stable Phase 3 production boundary.
The platform now has blocks, roster, teams, projects, weekly evidence and
teacher follow-up, but the student experience risks feeling like a collection of
extra assignments. Identity is also repeatedly reconstructed because students
do not log in.

A previously planned AI-assisted teaching Sprint 5 is renumbered to Sprint 6.

## Goal

Make the student experience simpler even as the platform becomes more complete:

- remove activities that do not create enough student or teaching value
- add roster-based student login without open registration
- automatically associate each student with their block, team and project
- reduce repeated identity fields and consolidate the student journey
- complete the deferred analytics, export and privacy work on the new identity
  foundation

## Product principles

- Simplicity is the primary acceptance criterion.
- Student login must remove more friction than it adds.
- Students activate a roster-prepared identity; they do not register or choose
  their own block, team or project.
- No shared default password.
- Normal student actions remain selection-first and should usually take under
  one minute.
- Teacher workflows may be complete internally, but the student surface stays
  small and task-oriented.
- Existing student evidence and historical activity data are preserved.
- Authentication is not permission by itself; RLS remains the security boundary.

## Phase 1 — Activity cleanup and information architecture

Remove Class Pulse and Team Conversation from the active product experience.

Scope:

- remove their student entry cards, modals and calls to action
- remove the standalone Find My Team entry because its capability will move into
  authenticated student context
- retain Week 1 Check-in temporarily, then convert it into the first-use Account
  Activation & Check-in journey in Phase 2
- remove Class Pulse and Team Conversation from teacher Overview metrics and
  primary Activity Records navigation
- preserve historical database rows and avoid destructive schema changes
- verify that shared counts, exports, CSS and activity routing do not leave dead
  links or misleading totals
- document any historical teacher-only access retained for audit purposes
- confirm the minimal future student navigation before implementing login

Target student navigation:

1. **This Week** — the current mission/checkpoint
2. **My Project** — read-only team, project and progress context
3. **Get Help** — a short structured support request

Acceptance:

- students no longer see Class Pulse, Team Conversation or a standalone Find My
  Team entry
- Week 1 Check-in remains available until the authenticated activation flow
  replaces it, so current students are not stranded between phases
- the teacher dashboard no longer presents the retired activities as current
  participation goals
- existing records remain intact
- no unrelated activity changes are bundled into this Phase
- production build and focused regression checks pass

## Phase 2 — Student authentication foundation

Implement roster-based login without public registration.

### Required design gate

Before coding, produce a short technical decision covering:

- how Student ID maps to a Supabase Auth identity
- how individual one-time activation credentials are generated and distributed
- first-login password change or an equally safe activation flow
- forgot-password/recovery using verified roster data
- teacher provisioning for CSV-imported roster changes
- duplicate Student ID and cross-block behaviour
- account removal, block archive and re-enrolment behaviour
- migration and rollback order
- RLS policy matrix for anonymous student, authenticated student,
  authenticated non-teacher and teacher roles

### Teacher provisioning workflow

After a teacher imports or updates a roster, the roster area shows an explicit
**Prepare student accounts** action.

Behaviour:

- the action is enabled only when the selected Teaching Block contains roster
  students who do not yet have an account
- the label includes the pending count, for example
  `Prepare 5 student accounts`
- clicking it creates accounts and unique one-time initial passwords only for
  students who are not already provisioned
- repeated clicks are idempotent and never reset an existing account, personal
  password or activation state
- after a later roster import, the action becomes available again only for the
  newly added students
- the teacher receives a controlled download/print view containing only the
  newly created credentials for secure individual distribution
- initial passwords are not retained or redisplayed as recoverable plaintext;
  losing one requires an explicit per-student reset action with confirmation
- duplicate or invalid Student IDs are blocked and reported for teacher
  correction rather than partially or ambiguously provisioned
- the roster shows a simple status per student: `Not prepared`, `Ready to
  activate`, or `Activated`

This remains a deliberate teacher action after import, not an automatic side
effect of uploading a CSV. That gives the teacher a chance to review roster
errors before authentication accounts are created.

Preferred UX:

First use — **Account Activation & Check-in**:

1. enter Student ID and the student's unique one-time initial password
2. set a personal password
3. load and confirm read-only Name, Teaching Block, Team and Project context
4. complete the short Week 1 recovery check
5. continue into the authenticated student home

Returning use:

- Student ID
- personal password
- Log in
- Forgot password
- no Sign up / Register option
- persistent browser session

The activation page replaces the former standalone Week 1 Check-in and Find My
Team journeys; it must not become three separate student tasks.

Security constraints:

- never use one shared initial password
- never expose a service-role key to the browser
- students may read only their own identity and permitted project context
- students may not enumerate the roster or other teams
- teachers retain access through the existing teacher role check
- existing historical submissions must be mapped conservatively; ambiguous
  records are not silently claimed by an account

Acceptance:

- an imported roster student can activate, set a personal password, confirm
  roster-derived context, complete Week 1 Check-in and later log in
- Find My Team is no longer required as a separate public lookup
- an unlisted user cannot self-register
- the session resolves exactly one current student context or presents a safe,
  actionable error
- a student cannot read another student's protected data
- teacher login and dashboard access continue to work
- migrations are idempotent and documented with verification and rollback

## Phase 3 — Authenticated student journey refactor

Use authenticated context to remove repeated identity work.

Scope:

- resolve Student, Teaching Block, Team and Project during activation and after
  every later login
- expose the same read-only team/project context through My Project rather than
  a standalone Find My Team tool
- stop asking for name, Student ID, team or project in normal activity flows
- replace the form catalogue with the minimal student navigation agreed in
  Phase 1
- present only the current week's primary action
- show read-only personal/team/project context and the student's own permitted
  history
- connect Get Help and weekly submissions to the authenticated student
- define a safe transition for legacy anonymous submissions and duplicate
  prevention

Acceptance:

- login creates visible value immediately
- the normal weekly path does not repeat known identity fields
- students cannot switch or overwrite roster-authoritative team/project context
- the interface remains usable on mobile and does not reproduce the teacher
  dashboard
- legacy evidence remains available to teachers
- focused production and role-based tests pass

## Phase 4 — Trajectory and teaching analytics

Carry forward the former Sprint 4 Phase 4 on the authenticated model.

Scope:

- show trajectory across available Week 1–4 evidence
- distinguish missing evidence from negative evidence
- keep summaries descriptive, evidence-linked and non-grading
- provide drill-down to underlying records
- reserve the AI Block Insights area for Sprint 6; do not add speculative AI
  output in this Phase

## Phase 5 — Export, privacy and production validation

Carry forward the former Sprint 4 Phase 5 and validate the complete Sprint 5
journey.

Scope:

- stabilise block/team/project/student-aware exports
- verify auth lifecycle, RLS boundaries and teacher access
- regression-test current student activities, peer review and follow-up
- verify production deployment and recovery steps
- synchronise architecture, AI context, roadmap, changelog and Sprint handoff

## Explicitly out of scope

- open student registration
- social profiles, avatars or messaging
- student-controlled team or project changes
- generic multi-course administration
- tutor/coordinator role expansion
- automatic grading or risk scoring
- AI summaries and teacher copilot work; these remain Sprint 6
- destructive deletion of historical Class Pulse or Team Conversation data

## Delivery rules

- Begin the new session from latest `main`.
- Work on one Phase and one focused Draft PR at a time.
- Phase 1 comes before authentication implementation.
- Phase 2 cannot start coding until its security and provisioning design gate is
  explicit and reviewable.
- Every database change requires an idempotent migration, matching
  `supabase/schema.sql`, verification queries, production order and rollback.
- Update this Sprint's `HANDOFF.md` and `ROADMAP.md` with verified evidence.
- Do not merge without explicit user approval.
