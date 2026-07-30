# System Architecture

## Overview

Engineering Studio Platform is a browser-based teaching application with a React frontend, Supabase backend services and Vercel hosting.

```text
Student or Teacher Browser
          |
          v
React + TypeScript Application
          |
          +---- Supabase Auth
          |
          +---- Supabase Data API
          |
          v
PostgreSQL + Row Level Security
```

GitHub is the source of truth for application code, database schema and project documentation. Vercel deploys the frontend from the `main` branch.

## Team and project foundation

`teaching_blocks` owns the rollout mode (`teacher_assigned` or
`student_selection`). `teams` provides a stable block-scoped identity derived
from private roster team numbers. `projects` is a block-scoped catalogue, while
`team_project_assignments` enforces one current project per team. A project may
be assigned to several teams.

The current course lifecycle spans two units: NIT3003 establishes the team,
project and prototype; NIT3004 resumes that work after a break at an expected
approximately 80% completion baseline. Assignments therefore record
`origin_unit` and `continued_from_previous_unit`. Projects remain block-scoped
in this rollout-safe version; the platform records continuity without adding a
generic cross-course workflow or project-version system.

Student browsers never select directly from roster, team, assignment or
proposal tables. Restricted functions validate Student ID against the active
block before returning the matched team's project context, accepting a
team-level selection or recording a short proposal. Teachers manage the source
tables through RLS-protected Dashboard views. New identified activities
snapshot the current `project_id`; historical rows remain unchanged.

## Runtime components

### Student portal

The public application provides the four-week journey and activity forms.

Current activities:

- Week 1 check-in
- Class pulse
- Team conversation
- Four-week promise
- Poster peer review

The first version does not require a student account. Public clients use the Supabase publishable key and may only perform operations allowed by RLS.

### Teacher dashboard

The `/admin` route provides the protected teacher experience.

Authentication flow:

```text
Email and password
      |
      v
Supabase Auth session
      |
      v
JWT app_metadata.role
      |
      v
PostgreSQL is_teacher() policy check
      |
      v
Protected dashboard data
```

A teacher user currently requires:

```json
{
  "role": "teacher"
}
```

inside Supabase `app_metadata`.

### Supabase

Supabase currently provides:

- PostgreSQL database
- REST/Data API used by the JavaScript client
- Email/password authentication
- Session handling
- Row Level Security enforcement

The browser uses only:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

A service-role key must never be exposed to the browser.

### Vercel

Vercel builds and hosts the Vite application.

Current configuration:

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: repository root

Production and preview environments require the two Supabase browser variables. AI-enabled environments also require server-only `OPENAI_API_KEY`; `OPENAI_MODEL` is optional.

## Database model

### `portal_health`

Provides a minimal public read used to confirm that the portal can reach Supabase.

### `student_checkins`

Stores the student's four-week delivery goal and team identity.

Key rules:

- `student_id` is unique.
- Student ID is normalised before storage.
- Public clients may insert.
- Teachers may read.

### `week1_pulse`

Stores anonymous or lightweight class pulse information such as confidence, concern and AI usage.

### `team_conversations`

Stores one structured conversation record per team.

Key rule:

- `team_name` is unique.

### `student_promises`

Stores one four-week promise per student.

Key rule:

- `student_id` is unique.

### `poster_reviews`

Stores peer review scores and qualitative feedback.

Key rules:

- Reviewer team must differ from reviewed team.
- A reviewer may review a given team only once.

## Security model

### Public student access

The public browser may insert permitted activity records. It must not be able to select other students' submissions.

### Teacher access

Teacher access is based on an authenticated JWT and the `teacher` app metadata role.

Teacher policies allow protected reads and controlled update/delete operations
through `is_teacher()`. The dashboard can export only the currently loaded,
RLS-authorised records. Class Pulse export remains aggregate-only.

### RLS as the primary boundary

The Supabase publishable key is not treated as a secret. Security depends on database privileges, RLS policies, constraints and validation.

Any new table must:

1. Enable RLS.
2. Define explicit public and authenticated operations.
3. Avoid broad `using (true)` policies on sensitive records.
4. Include constraints for important business rules.

## Source and deployment flow

```text
Local or AI-assisted change
          |
          v
GitHub main branch
          |
          v
Vercel automatic build
          |
          v
Production deployment
```

Database changes do not deploy automatically. They require reviewed SQL to be run against Supabase and then synchronised into `supabase/schema.sql` or a future migration directory.

## Current architectural constraints

- The schema is activity-specific rather than fully generic.
- Students are anonymous from an authentication perspective.
- Teacher role assignment is managed through `app_metadata`.
- The dashboard shows summaries, protected activity records, teacher actions
  and selected-activity CSV export.
- The only server-side AI service is the narrow, teacher-triggered Phase 3B teaching suggestion endpoint; it does not persist output or make assessment decisions.

These are intentional first-version constraints. Changes should be driven by validated teaching needs rather than abstract platform ambitions.

## Architectural evolution

Likely next steps:

1. Add teacher update and delete policies.
2. Add detailed dashboard record views.
3. Introduce a migration convention for database changes.
4. Add teacher/tutor profile management if role administration becomes frequent.
5. Evaluate student authentication only after the anonymous workflow is proven.
6. Evaluate the Phase 3B AI teaching suggestion against privacy, usefulness and teacher-control safeguards before expanding AI scope.
