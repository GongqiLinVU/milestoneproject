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

### Fixed

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

- Detailed student check-in table
- Teacher edit capability
- Teacher delete capability
- Teacher sign-out
- Loading, empty and error states
- Clear duplicate-submission feedback
- CSV export

### Deferred

- Student authentication
- Multi-course administration
- Generic activity schema redesign
- AI teaching assistant
- Risk prediction
