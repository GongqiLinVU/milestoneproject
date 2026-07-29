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

- Week 1 check-in
- Class pulse
- Individual Team Health Check\n- Week 1 Engagement Check-out\n- Week 2 Individual Progress Review\n- Week 2 Engagement Check-out
- Week 3 Engagement Check-out
- Week 3 poster peer review
- Supabase-backed submissions
- Duplicate submission prevention
- Self-review prevention for poster reviews

### Teacher dashboard

- Supabase email/password authentication
- Teacher-only access through `app_metadata.role = teacher`
- RLS-protected summary counts for all activity types
- Restored authenticated sessions with explicit sign-out and access status
- Clickable activity panels with detailed records for identified activities
- Anonymous Class Pulse charts for confidence, concerns and AI usage
- Teacher edit and confirmed delete for identified activity records
- Teacher mutations protected by `is_teacher()` UPDATE/DELETE RLS policies
- Teacher-only implementation review outcomes
- Teacher-controlled Poster Peer Review opening and closing
- Export the currently selected activity as a stable UTF-8 CSV; Class Pulse
  exports only aggregate distributions
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

Every push to `main` triggers a production deployment.

## Project documentation

- [AI context](AI_CONTEXT.md)
- [Architecture](ARCHITECTURE.md)
- [Roadmap](ROADMAP.md)
- [Session start protocol](prompts/START_SESSION.md)
- [Sprint records](docs/sprints)
- [Contributing guide](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## Current priority

Sprint 1 is working in production. Sprint 2 Phase 5 is implemented and awaits
the documented production verification:

- Verify the role and RLS access matrix
- Verify duplicate, self-review and create-once constraints
- Complete closed/open/closed Peer Review and CSV smoke tests

Students remain unauthenticated and their submissions remain create-once. AI features, student-side editing and major database redesign are intentionally out of scope.

See [Sprint 2 roadmap](ROADMAP.md#sprint-2--teacher-operations-and-activity-control),
the detailed [Sprint 2 plan](docs/sprints/sprint-02/PLAN.md), and the reusable
[session start protocol](prompts/START_SESSION.md).


### Sprint 3 — continuous engagement evidence

Week 1 uses an individual Team Health Check and a ten-question Engagement Check-out. Week 2 adds an Implementation Pre-check. Phase 3 adds teacher-only verification outcomes and a Week 3 Check-out. The Teacher Dashboard retains raw evidence and presents descriptive teaching signals only—never an automatic mark or performance judgement.
