# AI Context — Engineering Studio Platform

## Sprint 6 verified Production state

Sprint 6 closed on 12 August 2026 after Production build, a 24/24 database
security audit and manual Student, Teacher, signed-out and legacy workflow
regression testing passed.

- Week 3 Poster Gallery uses a private Block-scoped bucket, short-lived signed
  URLs, one-page PDF/PNG/JPEG validation and a 1 MB limit.
- S1–S10 form one Project Journey; S6–S9 use structured Work Track evidence and
  S10 uses individual Platform Feedback.
- Sprint 6 RPCs are `SECURITY DEFINER` with an empty `search_path`, explicit
  identity checks and no anonymous execution grant.
- Student identity, Block, Team and Project remain roster-authoritative.
- Session Check-in, Weekly Activities, Poster evidence and Work Track remain
  separate records.
- Trajectory, Block analytics, enhanced exports and AI interpretation are Sprint
  7 scope.

## Sprint 5 Phase 3 student surfaces

- `/` is public course information and never exposes weekly activities or
  student context.
- `/student` requires a roster-prepared account and a teacher-opened Session
  Check-in before activities appear.
- Login establishes identity; recurring Session Check-in establishes attendance.
- `student_checkins` remains historical Week 1 activation evidence.
- `student_session_checkins` stores recurring authenticated attendance.
- Normal activities reuse authenticated identity instead of asking students to
  re-enter roster-authoritative Name or Student ID.

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

## GitHub workflow and Codex usage discipline

These rules are durable project policy for every new session:

- This project uses the connected GitHub App as the normal GitHub interface.
- Use a connector-first workflow for repository reads, branches, file writes,
  commits, pull requests, reviews and merges whenever the GitHub App exposes the
  required operation.
- A missing local GitHub CLI (`gh`) is not by itself a blocker and must not
  trigger a request for the user to install or authenticate it.
- Local `git` or `gh` is only a fallback when the connected GitHub App cannot
  perform a necessary operation. State the exact connector gap before asking
  for a fallback; do not probe credentials or shift authentication work to the
  user unnecessarily.
- Start implementation from the latest GitHub `main`. Preserve unrelated local
  worktrees and never publish stale or mixed changes.
- Default to one focused deliverable and one Draft PR per session. Record
  additional ideas in the active Sprint plan instead of expanding the current
  PR.
- Reuse verified work, existing branches and prior build evidence when still
  valid. Do not repeat repository-wide scans, dependency installation, builds
  or implementation merely because a session changed.
- Match validation cost to change risk: documentation-only changes need content
  and diff review; UI changes need focused checks and a production build;
  migrations, RLS, authentication and cross-module changes need full relevant
  validation.
- Prefer lightweight reasoning for status checks, documentation and small UI
  refinements. Reserve deeper implementation work for database security,
  migrations, authentication, architecture and difficult defects.
- Create Draft PRs by default. Merge only after the user confirms testing or
  explicitly asks to merge.
- During production use, fix blocking, data-integrity and permission defects
  promptly; batch minor layout and wording refinements; place new capabilities
  into a later focused phase or Sprint.

## Production environment

- Repository: `GongqiLinVU/milestoneproject`
- Student portal: `https://milestoneproject-two.vercel.app/`
- Teacher dashboard: `https://milestoneproject-two.vercel.app/admin`
- Hosting: Vercel
- Backend: Supabase
- Database: PostgreSQL
- Authentication: Supabase Auth
- Authorisation: PostgreSQL Row Level Security

### Environment baseline

- Vercel Preview and Production currently connect to the same Supabase project and therefore share the same database, Auth, Storage and RPC state.
- A database migration applied through either deployment context changes that one shared Supabase backend; do not run the same migration again merely because the frontend is being promoted from Preview to Production.
- Before giving migration instructions, confirm the target Supabase project rather than inferring separate databases from the Vercel environment names.
- Keep migrations idempotent and committed under `supabase/migrations`, but treat one successful execution against the shared project as applied for both Preview and Production.

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

- Public Landing Page at `/` and authenticated Student Portal at `/student`
- roster-prepared activation, login, recovery and required personal password
- roster-derived Block, Team and Project context
- teacher-opened Session Check-in and personal attendance history
- block-controlled Week 1–4 activities with database enforcement
- Team Health, weekly engagement, Week 2 wizard and Poster Peer Review
- read-only completed Pre-check state and Published Week 4 Presentation Order

### Teacher dashboard

- teacher authentication and block-scoped roster, team, project and account
  operations
- editable studio-session planning, open/close controls, attendance history and
  CSV export
- Weekly Activities, current Student Records and Presentation Order workspace
- private Teacher Review and follow-up continuity
- staged Initial AI Review, saved Teacher Review and After-review Summary
- controlled Week 2 submission reset
- Draft/Published Presentation Order snapshots

## Current database tables

- `portal_health`
- `activity_settings`
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
- Four-Week Action Plan is one individual plan per student, focused on action,
  success evidence and support rather than repeating the Check-in goal.
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
- The Poster Peer Review entry point reads the singleton
  `activity_settings.poster_peer_review` state. It remains visible but disabled
  while closed, and the database INSERT policy independently enforces the same
  state.

## Current product decisions

- Students use roster-prepared accounts; open registration remains disabled.
- Student activity evidence is normally create-once; narrowly scoped teacher
  reset is available where the workflow explicitly requires a clean resubmission.
- Incorrect submissions are intended to be managed by teachers rather than allowing unrestricted student edits.
- Teacher roles currently use Supabase `app_metadata`.
- The current database structure remains in place during Sprint 2.
- AI features are deferred until the operational workflow is stable.

## Active sprint

**Sprint 6 — Closed; Sprint 7 planning is next**

Phase 1 retires Class Pulse, Team Conversation and the standalone Find My Team
page from the active experience without deleting historical rows. Week 1
Check-in remains operational until Phase 2 replaces it with Account Activation
& Check-in. The target student information architecture is **This Week**, **My
Project** and **Get Help**; authentication is not part of Phase 1.

Phase 2 introduces teacher-prepared Supabase Auth identities keyed by Student
ID, unique one-time credentials, required personal-password setup and
authenticated roster context. `SUPABASE_SERVICE_ROLE_KEY` is server-only.
Students cannot register, enumerate the roster or choose their block/team.

Detailed scope and acceptance criteria are in
`docs/sprints/sprint-05/PLAN.md`. Actual progress and evidence belong in
`docs/sprints/sprint-05/HANDOFF.md`. New sessions must use
`prompts/START_SESSION.md`.

Phase 1–4A are merged and product-owner tested. Sprint 5 closes after the
role-based Production checklist and documentation close-out PR. Student/Team Trajectory, Block Teaching Analytics, AI Analytics
and enhanced exports are grouped into Sprint 6.

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


## Sprint 3 Phase 1 implementation boundary

- Team Conversation is replaced in the student UI by an individual Team Health Check.
- Four-Week Action Plan is replaced by Week 1 Engagement Check-out; the historical tables remain untouched.
- `team_health_checks` is unique per Student ID.
- `weekly_engagement_checkouts` is unique per Student ID and week, and is designed for Weeks 1–3.
- Anonymous/authenticated students can insert but cannot read, update or delete these records; teacher reads and management use `is_teacher()`.
- Team Participation Temperature is descriptive, preserves raw answers and must not be used as an assessment score.
\n\n## Sprint 3 Phase 2 boundary\n\nPhase 2 adds student self-reported Week 2 progress and Week 2 engagement evidence. It does not add teacher outcomes, grading, responsibility attribution or AI judgement. The Monday review verifies the project demo, method and individual evidence; teacher feedback remains Phase 3.\n
