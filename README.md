# Engineering Studio Platform

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
- guided AI Session Intake (Sprint 8, pilot) — a bounded evidence interview that
  captures responsibility, evidence/verification and blocker/next action, with
  student confirmation and a deterministic fallback when the AI provider is
  unavailable

### Teacher dashboard

- Supabase email/password authentication
- Teacher-only access through `app_metadata.role = teacher`
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

Sprints 1–6 are closed and production validated. Sprint 6 closed on 12 August
2026 after Production build, database security audit and role-based workflow
regression all passed. Sprint 7 completed a read-only observation of the full
2026 · 2B1 journey, establishing that report text and self-reported completion
cannot be treated as verified participation — Teacher Review and specific work
evidence were decisive.

The active sprint is **Sprint 8 — AI Session Intake & Evidence Verification**.
It pilots a bounded, guided AI Session Intake that turns a short adaptive
evidence interview into a structured Progress Report using a versioned
Claim / Evidence / Owner / Verification / Action model. Phase 1, Phase 2A and
Phase 2B are merged to `main`. Phase 2C (the conversational Intake workspace,
adaptive follow-up policy and read-only Visual Harness Debug replay tool)
remains an open Draft under active development; its database audit and
authenticated Preview submission are still pending, and merge is gated on
mock-student validation.

AI does not publish marks, determine authorship, accuse copying, or replace
live demonstration and Teacher academic judgement. When the AI provider is
unavailable, Session Intake preserves the student's answers and serves a
deterministic fallback.

See the [Sprint 8 plan](docs/sprints/sprint-08/PLAN.md), current
[handoff](docs/sprints/sprint-08/HANDOFF.md), and reusable
[session start protocol](prompts/START_SESSION.md).


### Sprint 3 — continuous engagement evidence

Week 1 uses an individual Team Health Check and a ten-question Engagement Check-out. Week 2 adds an Implementation Pre-check. Phase 3 adds a private teacher Review & Follow-up workflow linked to each Implementation Pre-check, plus a Week 3 Check-out. The Teacher Dashboard retains raw evidence and presents descriptive teaching signals only—never an automatic mark or performance judgement. Phase 3B adds an optional AI suggestion card that a teacher may edit, use as a follow-up, regenerate or dismiss.
