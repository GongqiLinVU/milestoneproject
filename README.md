# Engineering Studio Platform

## Current phase — Sprint 11 and classroom feedback

Joseph opened [Sprint 11](docs/sprints/sprint-11/PLAN.md) on **26 October 2026**. The approved NIT3004 increment covers S1–S9: short stage-specific opening questions, optional guidance and separately displayed last-check-in context. Structural stopping and record extraction remain unchanged; full historical role/action context is retained. NIT3003 design is deferred. See [the handoff](docs/sprints/sprint-11/HANDOFF.md).

Sprint 10 closed on **24 October 2026**, following Joseph's successful basic rehearsal, new-teacher Session creation and student login. See [closeout](docs/sprints/sprint-10/CLOSEOUT.md) and the active [feedback plan](docs/feedback/PLAN.md).

The delivered baseline supports independent classes and teacher assignments, teacher-owned student rosters/accounts, explicit team/project allocation, password-only activation, S1–S9 progress methods, bounded AI Intake with focused review/debug, draft preservation on auth refresh and administrator-controlled reference-budget ceilings. Real classroom usability, record usefulness and actual latency/cost are the next evidence to collect; no automatic grading is claimed.

A production-deployed teaching platform that turns the final four weeks of NIT3004 into an engineering delivery studio.

The current module guides students through a four-week journey:

**Commit → Prove → Validate → Deliver**

## Live application

- Student portal: `https://milestoneproject-two.vercel.app/`
- Teacher dashboard: `https://milestoneproject-two.vercel.app/admin`
- Repository: `GongqiLinVU/milestoneproject`

## Current capabilities

### Student portal

- Public course Landing Page and authenticated Student Portal
- roster-prepared activation, login, recovery and personal password setup
- roster-derived Block, Team and Project context
- teacher-opened Session Check-in and personal attendance history
- block-controlled Week 1–4 activities
- Team Health, weekly engagement, Week 2 Implementation Pre-check and Poster
  Peer Review
- six-step Week 2 wizard with local draft recovery and read-only completion
- Published Week 4 Presentation Order
- duplicate and own-team review prevention
- guided AI Session Intake (Sprint 8, pilot) — a structurally bounded progress conversation, separate record extraction,
  focused student confirmation and retained debug exports; preserve answers
  when a request fails

### Teacher dashboard

- Supabase email/password authentication
- Teacher identity plus active profiles/class memberships; super administrator manages teachers and independent classes
- RLS-protected records and counts for current activities
- Restored authenticated sessions with explicit sign-out and access status
- Clickable activity panels with detailed records for identified activities
- Teacher edit and confirmed delete for identified activity records
- Teacher mutations protected by `is_teacher()` UPDATE/DELETE RLS policies
- Private student-by-student implementation Review & Follow-up with operational status and recheck actions
- Optional teacher-triggered AI teaching suggestions using de-identified project and verification evidence
- block-aware Week 1–4 activation and current Student Records
- teacher-controlled Week 2 submission reset
- Draft and Published Presentation Order management
- Export the currently selected activity as a stable UTF-8 CSV
- Accessible loading, empty, refresh and actionable error states

## Technology stack

- React 19
- TypeScript
- Vite
- Supabase Auth
- Supabase PostgreSQL
- Row Level Security
- Vercel
- GitHub

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Required local environment variables:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

The Supabase publishable key is intended for browser use. Never commit a service-role key, database password, or other secret.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Create a teacher user through **Authentication → Users → Create user**.
4. Assign the teacher role:

```sql
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"role":"teacher"}'::jsonb
where email = 'teacher@example.edu';
```

For an existing environment, apply the reviewed SQL files in
`supabase/migrations` before deploying frontend code that depends on them.
The schema file creates new environments; `create table if not exists` does
not add missing columns to an existing table.

Disposable activity submissions can be cleared manually with
`supabase/scripts/reset_test_activity_data.sql`. This one-off script is not a
migration and must not be used after real classroom responses begin.

## Vercel deployment

Import this GitHub repository into Vercel and configure:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; required by student account
  provisioning/login/recovery endpoints)
- `OPENAI_API_KEY` (server-only; used by the AI Session Intake endpoint. When
  absent, Session Intake serves its deterministic fallback rather than failing)

Every push to `main` triggers a production deployment.

## Project documentation

- [AI context](AI_CONTEXT.md)
- [Architecture](ARCHITECTURE.md)
- [Roadmap](ROADMAP.md)
- [Session start protocol](prompts/START_SESSION.md)
- [Sprint records](docs/sprints)
- [Contributing guide](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## Current status

Sprint 10 is closed. The latest accepted baseline is main `901fd72` (PR #97); future fixes start from actual latest main. Basic live rehearsal is accepted, while comprehensive classroom load, AI quality/safety, recovery email and teaching impact are not claimed as fully verified. Read the [closure limits](docs/sprints/sprint-10/CLOSEOUT.md).

AI supports evidence collection and teacher review. It does not publish marks, determine authorship or replace teacher academic judgement. Reference budgets monitor usage; rounds bound conversations. Collect real feedback before adding further harness rules or feature scope.

The remaining older sprint descriptions are historical snapshots.

### Sprint 3 — continuous engagement evidence

Week 1 uses an individual Team Health Check and a ten-question Engagement Check-out. Week 2 adds an Implementation Pre-check. Phase 3 adds a private teacher Review & Follow-up workflow linked to each Implementation Pre-check, plus a Week 3 Check-out. The Teacher Dashboard retains raw evidence and presents descriptive teaching signals only—never an automatic mark or performance judgement. Phase 3B adds an optional AI suggestion card that a teacher may edit, use as a follow-up, regenerate or dismiss.

### Compact early Work Track — delivered in Sprint 10

S1–S5 use short responsibility/progress/next-action records with optional evidence/help; S6–S9 retain assessment. Earlier implementation evidence is in [S10-01B_REPORT.md](docs/sprints/sprint-10/S10-01B_REPORT.md); current status is the Sprint 10 closeout.
