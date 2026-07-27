# Changelog

All notable changes to Engineering Studio Platform will be recorded here.

The project currently uses simple milestone-based versions while the production workflow is being established.

## [0.2.0] — 2026-07-26

### Added

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

- Detailed teacher record views for the remaining four activities
- Teacher-only edit and confirmed delete
- Admin **Open peer review** control, off by default
- Supabase-backed activity state and RLS enforcement that blocks direct Poster Review inserts while closed
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
