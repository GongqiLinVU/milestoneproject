# Changelog

All notable changes to Engineering Studio Platform will be recorded here.

## Unreleased — Sprint 5 Phase 2

### Added

- Teacher-controlled preparation of unique student activation accounts.
- Student ID login, password recovery and Account Activation & Check-in.
- Student account RLS, authenticated project context and legacy Check-in links.

## Unreleased — Sprint 5 Phase 1

### Changed

- Retired Class Pulse and standalone Find My Team from the active student
  experience.
- Removed Class Pulse from current teacher Activity Records and CSV choices.
- Confirmed Team Conversation was already replaced by Team Health Check in
  Sprint 3.
- Preserved historical Class Pulse and Team Conversation database records,
  grants, RLS policies and migrations.

The project currently uses simple milestone-based versions while the production workflow is being established.

## Sprint 4 Phase 3 — Week 3–4 follow-up continuity

- Added Week 1–4 filtering to Teacher Weekly Check-out records and filtered CSV
  exports.
- Added a Week 3 and Week 4 follow-up queue based on unresolved private Teacher
  Reviews in the selected teaching block.
- Distinguished submitted evidence from missing check-outs without treating
  missing data as a negative result.
- Linked follow-up items back to the original Week 2 evidence and private
  review.

## Sprint 4 Phase 2 — NIT3004 continuity journey

- Replaced repeated Week 1–3 generic check-outs with a short common pulse and
  week-specific readiness checks.
- Reframed Week 1 around inherited project access, NIT3003 team continuity and
  remaining-work clarity after the break.
- Added a Week 2 80% entry-baseline pulse while retaining the detailed
  Implementation Pre-check for evidence and method verification.
- Added Week 3 completion-quality checks for product, testing, report and
  presentation readiness.
- Added a Week 4 Final Delivery Check for rehearsal, demo fallback, individual
  speaking readiness and final submission.
- Preserved historical generic evidence and labelled it explicitly in Teacher
  Activity records and CSV exports.

## Sprint 4 Phase 1 — Team & Project foundation

- Added formal block-scoped teams derived from the private roster.
- Added teacher-managed Project Catalogue, one current project per team and
  team-level student proposals.
- Added block rollout modes: current `2026 · 2B1` stays teacher-assigned while
  future blocks may enable student selection during Check-in.
- Added restricted student project context, selection and proposal functions
  without opening direct roster or assignment reads.
- Changed Week 2 project context from repeated student entry to a
  roster-derived Project Snapshot.
- Preserved existing Week 1 evidence and imported nonblank legacy roster
  project names into the new foundation.
- Recorded assignment origin and continuation so current 2B1 projects are
  explicitly recognised as NIT3003 work resumed in NIT3004.
- Restricted future student project selection semantics to NIT3003; NIT3004
  restores the existing team/project and begins from an 80% entry baseline.

## [0.2.0] — 2026-07-26

### Added

- Added teacher edit and confirmed delete for identified activity records
- Added least-privilege teacher UPDATE/DELETE grants and `is_teacher()` RLS
  policies while keeping Class Pulse aggregate-only
- Production deployment on Vercel
- Supabase PostgreSQL integration
- Live portal health indicator
- Week 1 student check-in
- Week 1 class pulse
- Team conversation activity
- Four-week promise activity
- Poster peer review activity
- Supabase Auth teacher login
- Protected Teacher Dashboard route at `/admin`
- Teacher-only dashboard summary counts
- Row Level Security policies
- Student ID normalisation
- Duplicate check-in prevention
- Duplicate promise prevention
- Team conversation duplicate prevention
- Poster self-review prevention
- Poster duplicate-review prevention

### Fixed

- Added the `goal` field required by the Week 1 check-in form
- Confirmed that duplicate student IDs are rejected by the database constraint

### Verified

- Production site loads successfully
- Supabase connectivity displays as live
- Student check-in data writes successfully
- Teacher authentication succeeds
- Teacher RLS-protected summary reads succeed

## [0.1.0] — 2026-07-26

### Added

- Initial React 19, Vite and TypeScript project
- Four-week journey design: Commit, Prove, Validate, Deliver
- Engineering Studio landing page
- Initial student activity modal designs
- Initial Teacher Dashboard interface
- GitHub repository setup
- Vercel configuration
- Supabase schema foundation

## Unreleased

### Added

- Added teacher-only CSV export for the currently selected dashboard activity
- Added aggregate-only Class Pulse export to preserve response anonymity
- Added a repeatable Sprint 2 production security and smoke-test checklist
- Added a teacher-controlled Poster Peer Review open/closed control
- Added a safe public activity-state read and teacher-only update policy
- Enforced the Peer Review closed state in the anonymous INSERT policy
- Added anonymous Class Pulse charts for confidence, concerns and AI usage
- Added a manual one-off script for clearing disposable activity test data
- Reframed Four-Week Promise as a concrete Four-Week Action Plan
- Added clickable Teacher Dashboard panels for all five activity record views
- Added activity-specific record headings, columns, descriptions and empty states
- Restored authenticated Teacher Dashboard sessions across page refreshes
- Added teacher sign-out and visible signed-in account status
- Added a protected non-teacher access state that does not load student records
- Added a refreshable Student Check-in table with identity, team, goal and
  timestamps
- Added accessible loading, empty and actionable dashboard error states
- Made all five summary cards stable while dashboard data loads and refreshes

### Fixed

- Disabled the Poster Peer Review entry point until Week 3
- Displayed a read-only, same-browser receipt after submission and on reopening
- Excluded student names and Student IDs from locally stored receipt details
- Checked local submission memory before submit and locked previously completed forms with a timestamped notice
- Updated production URLs to `milestoneproject-two.vercel.app`
- Isolated modal state by activity so success and error messages cannot carry into another form
- Made the 1–5 scale direction visible without requiring students to open help
- Added hashed same-browser submission memory to reduce accidental duplicate submissions
- Added an idempotent migration for the missing `week1_pulse.concern` column
- Clarified that Class Pulse confidence uses 1 as the lowest and 5 as the highest
- Added accessible help for confidence and poster-review rating scales
- Prevented form errors from carrying over into other activity modals
- Replaced raw database errors with student-friendly messages
- Added frontend field limits that match database constraints
- Clarified that Team Conversation is submitted once per team and Four-Week Promise once per student
- Aligned Team Conversation and Poster Review insert payloads with production column names
- Synchronised `supabase/schema.sql` with the deployed activity-table columns and timestamps
- Added an idempotent least-privilege migration for activity-table grants and insert policies
- Aligned repository trigger and policy definitions with production naming

### Planned for Sprint 2

- CSV export after record management is stable
- Full anonymous, non-teacher and teacher authorisation verification
- Linear Sprint plans and evidence-based handoffs under `docs/sprints`
- A reusable new-session protocol at `prompts/START_SESSION.md`

### Deferred

- Student authentication
- Multi-course administration
- Generic activity schema redesign
- AI teaching assistant
- Risk prediction


## 2026-07-29 — Sprint 3 Phase 1

- Replaced the Week 1 Team Conversation student entry with an individual Team Health Check.
- Replaced the Four-Week Action Plan student entry with a ten-question Week 1 Engagement Check-out.
- Added risk-triggered notes limited to 200 characters.
- Added Team Participation Temperature and raw response review to the Teacher Dashboard.
- Added shared Week 1–3 engagement schema with student create-only and teacher-only management policies.
\n\n## 2026-07-29 — Sprint 3 Phase 2 (in progress)\n\n- Added Week 2 Individual Progress Review and a Week 2 instance of Weekly Engagement Check-out.\n- Added teacher views for Week 2 progress evidence and week-labelled check-outs.\n- Added insert-only student and teacher-only management policies for progress reviews.\n
