# Sprint 5 — Student Identity and Experience Simplification

**Status: In progress — Phase 1–3 merged; Phase 4A underway**

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
- an existing Week 1 Check-in matched uniquely by Student ID is linked to the
  activated account and is not resubmitted; only students without a valid
  existing Check-in complete the short Week 1 recovery check

Acceptance:

- an imported roster student can activate, set a personal password, confirm
  roster-derived context and later log in
- a student with an existing valid Week 1 Check-in sees it recognised and does
  not repeat it; a student without one completes it during activation
- Find My Team is no longer required as a separate public lookup
- an unlisted user cannot self-register
- the session resolves exactly one current student context or presents a safe,
  actionable error
- a student cannot read another student's protected data
- teacher login and dashboard access continue to work
- migrations are idempotent and documented with verification and rollback

Testing-stage account controls:

- teacher may prepare one selected student's missing account without provisioning
  the whole block
- teacher may reset one existing student's password to a new one-time temporary
  credential; the account returns to required activation
- reset preserves the Auth user, Student ID, roster links, Check-ins, session
  attendance and activity evidence
- previous passwords become invalid immediately and temporary credentials are
  returned only in the current response/download

## Phase 3 — Public landing, session check-in and student portal

Keep general course information public while moving student-specific work behind
an authenticated session check-in.

Scope:

- keep `/` as a public Landing Page with course introduction, four-week journey,
  deliverables and clear Student/Teacher entry points
- move the authenticated experience to `/student`
- add teacher-opened studio sessions; only one session may be open per block
- allow activated students to log in and use their Student Portal at any time;
  Session Check-in is a separate teacher-controlled action
- show Check-in only while the teacher has an open session; students cannot
  pre-check-in, select another date, reopen history or check in after closure
- record each student's attendance once per session without reusing or changing
  the historical Week 1 activation Check-in
- preserve a read-only Session History for teachers, including attendance lists
  and CSV export, and show each student only their own My Attendance history
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

- unauthenticated visitors can read the Landing Page without seeing weekly
  activities or protected student context
- `/student` requires roster-prepared login; no open registration is introduced
- without a teacher-opened session, the student can still use the portal but
  sees that Session Check-in is unavailable
- students cannot check in before the teacher opens a session, and historical
  sessions cannot be reopened or used for late check-in
- teacher and student history views refer to the same preserved attendance
  records; students see only their own records
- the same student cannot create duplicate attendance for one session
- a student cannot check in to another block or a closed session
- login creates visible value immediately
- the normal weekly path does not repeat known identity fields
- students cannot switch or overwrite roster-authoritative team/project context

### Phase 3 session-management refinement

- Replace the full-width Student Portal attendance banner with a compact,
  attention state shown only when a session is actually open and the student
  has not checked in.
- Add `Sessions` to the student navigation and show the student's immutable
  attendance history from the same records used by the teacher.
- Allow a teacher to prepare the standard ten-session block plan in one action,
  then edit each title, date and optional automatic start/end window.
- Support both scheduled windows and explicit `Open now` / `Close` controls.
- Preserve closed sessions and attendance as read-only history; preparing a new
  plan never overwrites old records.
- Resolve full Project Catalogue content for My Project: problem, description,
  target users, expected outcomes, category and difficulty. When only a legacy
  roster project name exists, show that the catalogue assignment is incomplete.
- the interface remains usable on mobile and does not reproduce the teacher
  dashboard
- legacy evidence remains available to teachers
- focused production and role-based tests pass

## Phase 4 — Activity management, trajectory and teaching analytics

Phase 4 first makes weekly activity delivery intentional and manageable, then
builds analytics on the resulting authenticated evidence.

### Phase 4A — Weekly Activity Experience & Management

Replace the ageing Activity Records page with one block-aware teacher workspace.

Teacher information architecture:

1. **Weekly Activities** — activate or close Week 1–4 for the selected block
2. **Student Records** — review only current activity types and retained evidence
3. **Presentation Order** — prepare, reorder and publish the selected block's
   Week 4 presentation sequence

Current records are Team Health Check, Week 2 Implementation Pre-check, Weekly
Engagement Check-outs and Poster Peer Review. Retired Student Check-in, Class
Pulse and Team Conversation rows remain in the database for audit, but are not
shown as current activities.

Weekly activity rules:

- every Teaching Block has an independent Week 1–4 open/closed state
- all weeks are closed by default and a teacher manually activates the week
- activation opens that week's student activities, including Engagement
- students may see locked future weeks but cannot open or submit them
- submission authorization is enforced by the database, not only the UI
- closing or reopening a week never removes historical submissions
- the existing standalone Poster Peer Review control is absorbed into the Week
  3 activity state

Week 2 Implementation Pre-check becomes a six-step wizard: Project Context, My
Contribution, Implementation Status, Evidence & Verification, Blockers & Next
Step, and Review & Submit. It shows progress, supports Back/Continue, retains a
local draft and creates the formal record only at final submission.

Presentation Order is block-based. It starts in natural Team-number order,
supports drag or move controls, keeps Draft separate from Published, and exposes
only the latest published snapshot to students in Week 4.

Delivery is split into focused Draft PRs:

1. Activity Management layout and current Student Records
2. Weekly activation and Week 2 wizard
3. Presentation Order management and publication

### Phase 4B — Student and Team trajectory foundation

- show trajectory across available Week 1–4 evidence
- distinguish Submitted, Missing and Not required
- keep summaries descriptive, evidence-linked and non-grading
- support block, team, project and student filtering
- provide drill-down to the underlying record

### Phase 4C — Block teaching analytics and drill-down

- summarise block-level participation and completion patterns
- compare session attendance with activity completion without scoring students
- surface unresolved support and teacher follow-up continuity
- reserve AI Block Insights for Sprint 6; do not add speculative AI output here

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
