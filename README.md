# Engineering Studio Platform

A production-deployed teaching platform that turns the final four weeks of NIT3004 into an engineering delivery studio.

The current module guides students through a four-week journey:

**Commit → Prove → Validate → Deliver**

## Live application

- Student portal: `https://milestoneproject-gaerotzi4-guccimasters-projects.vercel.app/`
- Teacher dashboard: `https://milestoneproject-gaerotzi4-guccimasters-projects.vercel.app/admin`
- Repository: `GongqiLinVU/milestoneproject`

## Current capabilities

### Student portal

- Week 1 check-in
- Class pulse
- Team conversation
- Four-week promise
- Week 3 poster peer review
- Supabase-backed submissions
- Duplicate submission prevention
- Self-review prevention for poster reviews

### Teacher dashboard

- Supabase email/password authentication
- Teacher-only access through `app_metadata.role = teacher`
- RLS-protected summary counts for all activity types

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
- [Contributing guide](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## Current priority

Sprint 2 focuses on making the Teacher Dashboard operational rather than only informational:

- View submission records
- Edit incorrect student information
- Delete invalid submissions
- Export CSV
- Improve user-facing validation messages

AI features are intentionally deferred until the core teaching workflow is stable.
