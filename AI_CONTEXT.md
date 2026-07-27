# AI Context — Engineering Studio Platform

This document provides durable project context for ChatGPT, Claude, Codex, Cursor and future contributors.

## Product purpose

Engineering Studio Platform supports studio-based software engineering education. The first production module is NIT3004 and focuses on the final four weeks of project delivery.

The platform should help students align as a team, provide evidence of progress, validate readiness and deliver with confidence. It should help teachers observe participation, identify risks and intervene using evidence rather than intuition alone.

This is a real production application, not a disposable demonstration.

## Core principles

1. **Education first** — features must support a clear teaching objective.
2. **Simple before smart** — stabilise workflows before introducing AI.
3. **Evidence driven** — recommendations and interventions must trace back to submitted evidence.
4. **Production quality** — security, validation, maintainability and deployment matter from the start.
5. **Modular design** — features should be reusable for other courses and studio activities.
6. **GitHub is the source of truth** — code and durable project documentation live in this repository.

## Production environment

- Repository: `GongqiLinVU/milestoneproject`
- Student portal: `https://milestoneproject-two.vercel.app/`
- Teacher dashboard: `https://milestoneproject-two.vercel.app/admin`
- Hosting: Vercel
- Backend: Supabase
- Database: PostgreSQL
- Authentication: Supabase Auth
- Authorisation: PostgreSQL Row Level Security

Do not place service-role keys, database passwords or third-party secrets in client code, documentation or Git history.

## Technology stack

- React 19
- TypeScript
- Vite
- Supabase JavaScript client
- Supabase Auth
- PostgreSQL
- Row Level Security
- Vercel

## Current production capabilities

### Student portal

- Four-week journey: Commit, Prove, Validate, Deliver
- Week 1 check-in
- Week 1 class pulse
- Team conversation
- Four-week promise
- Week 3 poster peer review
- Health indicator showing Supabase connectivity

### Teacher dashboard

- Email/password sign-in
- Access restricted to users with `app_metadata.role = teacher`
- Summary counts for:
  - student check-ins
  - week 1 pulse submissions
  - team conversations
  - student promises
  - poster reviews
- Supabase session restoration and explicit teacher sign-out
- Clear authenticated, non-teacher, loading, empty and error states
- Refreshable Student Check-in details showing name, Student ID, team, goal and
  timestamps
- Clickable summary panels that switch between protected record views for all
  five activities, with stable activity-specific fields and states

## Current database tables

- `portal_health`
- `student_checkins`
- `week1_pulse`
- `team_conversations`
- `student_promises`
- `poster_reviews`

The repository schema is stored in `supabase/schema.sql`.

Important current rules:

- Public users may insert student activity records but may not read them.
- Teachers may read protected activity data.
- Student IDs are normalised to lowercase where relevant.
- Student check-in IDs are unique.
- Student promise IDs are unique.
- Team conversation names are unique.
- Poster reviewers cannot review their own team.
- A reviewer cannot review the same team more than once.

## Confirmed production tests

- Production page loads successfully.
- `portal_health` returns live connectivity.
- A Week 1 check-in can be inserted.
- The `goal` value is stored in `student_checkins`.
- A second check-in using the same student ID is rejected.
- A teacher user can sign in.
- Teacher RLS permissions allow dashboard summary reads.

## Student activity semantics

- Class Pulse is anonymous, is not an assessment and uses a 1–5 confidence
  scale where 1 is lowest and 5 is highest.
- Team Conversation is one shared response per team.
- Four-Week Promise is one individual commitment per student.
- Form errors must be scoped to the active form and must not expose raw
  database details to students.
- Existing database changes require a reproducible file in
  `supabase/migrations`; rerunning `schema.sql` alone does not alter an
  existing table created with `create table if not exists`.
- Production activity tables use `created_at` and `updated_at` timestamps.
- Team Conversation stores `proudest_achievement` and
  `biggest_delivery_risk`.
- Poster Review stores `presentation_quality` and `highest_priority`.
- Successful submissions are remembered in browser local storage using hashed,
  activity-specific fingerprints. No student name or plain-text Student ID is
  stored. This prevents accidental repeat submissions only on the same browser;
  database constraints remain the authoritative cross-device protection.
- Class Pulse checks local storage when the form opens. Identity-dependent
  activities check after the relevant Student ID or team selection is entered,
  then show the recorded time and lock the form before another submission.
- New local submission receipts also retain the non-identity answers needed for
  a read-only confirmation view. Student names and Student IDs are excluded.
  Older timestamp-only receipts remain valid but cannot display past answers.
- The Poster Peer Review entry point is currently disabled in the student
  portal and labelled as opening in Week 3. A teacher-managed activity window,
  including database enforcement, is deferred to Sprint 2.

## Current product decisions

- Students currently submit without an account.
- Student activity forms are create-only in the first version.
- Incorrect submissions are intended to be managed by teachers rather than allowing unrestricted student edits.
- Teacher roles currently use Supabase `app_metadata`.
- The current database structure remains in place during Sprint 2.
- AI features are deferred until the operational workflow is stable.

## Active sprint

**Sprint 2 — Teacher Operations and Activity Control**

Sprint 1 is working in production. Do not reopen completed Sprint 1 work unless a reproducible regression is found.

Implementation order:

1. Dashboard foundation is implemented in the current Draft PR: preserved
   summary cards; session restoration; sign-out; access, loading, empty and
   error states; refresh; and detailed Student Check-in records.
2. Next, generalise the record view to Class Pulse, Team Conversation,
   Four-Week Promise and Poster Peer Review.
3. Add teacher-only edit and confirmed delete, backed by explicit grants and `is_teacher()` RLS policies.
4. Add **Open peer review** to Admin. It is off by default; its state is stored in Supabase, safely readable by the public portal, writable only by teachers, and enforced by the Poster Review INSERT policy.
5. Add CSV export after record management is stable.
6. Complete role, RLS, migration, build and production smoke tests.

Student submissions remain create-once. Do not add student authentication, student-side editing, AI features, multi-course administration or a major database redesign in Sprint 2.

The temporary hard-coded Peer Review disabled state is only a Sprint 1 safety measure. Sprint 2 must replace it with teacher-controlled runtime state and database enforcement; it must not merely enable the button in frontend code.

Detailed scope and acceptance criteria are in
`docs/sprints/sprint-02/PLAN.md`. Actual progress and evidence belong in
`docs/sprints/sprint-02/HANDOFF.md`. New sessions must use
`prompts/START_SESSION.md`.

## Sprint continuity

- Sprints form one linear delivery history and all work starts from latest
  GitHub `main`.
- A completed Sprint is frozen as a historical record. New requirements extend
  the product in a later Sprint rather than creating versions such as
  `Sprint 2-1`.
- Phases are execution slices inside a Sprint, not long-lived code branches or
  versions.
- A current Sprint may fix defects required by its accepted scope. Changed or
  additional behaviour belongs in a later Sprint.
- `PLAN.md` defines intended scope; `HANDOFF.md` records verified delivery,
  pull requests, merge commits and remaining issues.

## Rules for AI-assisted changes

Before proposing or implementing a change:

1. State the user or teaching problem.
2. Identify the affected frontend files.
3. Identify the affected database tables, RLS policies and migrations.
4. Explain security and privacy impact.
5. Define acceptance criteria.
6. Define local and production tests.
7. Update relevant documentation.

Do not redesign the whole architecture for a small feature. Do not add AI merely because it is possible. Prefer the smallest maintainable solution that advances the current sprint.
