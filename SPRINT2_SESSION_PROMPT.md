# Sprint 2 — New ChatGPT Work Session Prompt

Copy the prompt below into a new ChatGPT Work session inside the **Engineering Studio Platform** project.

---

Continue the **Engineering Studio Platform** project from GitHub repository `GongqiLinVU/milestoneproject`.

Use the project documents in the repository as durable context, especially:

- `AI_CONTEXT.md`
- `ROADMAP.md`
- `ARCHITECTURE.md`
- `README.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`

GitHub `main` is the source of truth. Before changing anything, inspect the latest `main`, current open pull requests and the actual Supabase schema/migrations. Do not rely on an older local checkout or repeat fixes that are already merged.

## Current production state

Sprint 1 is complete and working properly.

Production:

- Student portal: `https://milestoneproject-two.vercel.app/`
- Teacher dashboard: `https://milestoneproject-two.vercel.app/admin`

Confirmed Sprint 1 behaviour:

- Week 1 Check-in, Class Pulse, Team Conversation and Four-Week Promise submit correctly.
- Student activity forms use student-friendly validation and do not leak state into one another.
- Same-browser local storage checks submissions before submit and shows locked, read-only receipts; it excludes student names and plain-text Student IDs.
- Database uniqueness and RLS remain the cross-browser authority.
- Poster Peer Review is currently visible but temporarily disabled with **Peer review opens in Week 3**.
- Teacher authentication and teacher-only summary reads work.
- Vercel automatically deploys updates merged to `main`.

Do not reopen Sprint 1 unless you can reproduce a regression.

## Sprint 2 goal

Turn the Teacher Dashboard from summary counts into a safe operational teaching tool, and replace the temporary Poster Peer Review disabled state with a teacher-controlled Week 3 opening mechanism.

Students must remain unauthenticated and student submissions must remain create-once. Corrections are teacher-managed.

## Required delivery order

### 1. Dashboard foundation

- Preserve login and current summary cards.
- Add teacher sign-out and clear session status.
- Add accessible loading, empty, success and error states.
- Add a detailed Student Check-in table with name, Student ID, team, goal, `created_at` and `updated_at`.
- Establish reusable table/query/refresh patterns before expanding to other activities.

### 2. Record management

- Add record views for `week1_pulse`, `team_conversations`, `student_promises` and `poster_reviews`.
- Add authorised teacher edit for incorrect records.
- Add authorised teacher delete for invalid records with explicit confirmation.
- Refresh the changed row and summary counts after each mutation.
- Preserve all existing uniqueness, rating, self-review and duplicate-review constraints.
- Translate constraint failures into understandable UI messages.
- Add only the minimum UPDATE/DELETE grants and RLS policies required, using the existing `is_teacher()` check.

### 3. Open peer review control

- Add an Admin control labelled **Open peer review**.
- It must be off by default.
- While off, keep the student button visible but disabled and show **Peer review opens in Week 3**.
- When a teacher opens it, the student form becomes available without a code change or Vercel redeploy.
- Persist the state in Supabase as non-sensitive configuration.
- Anonymous users may read only the safe open/closed setting.
- Only authenticated teachers may change it.
- The `poster_reviews` anonymous INSERT policy must check this setting, so direct API calls are rejected while closed.
- Closing it again blocks only new reviews; existing records remain unchanged and teacher-manageable.

Prefer the smallest maintainable data design. A single activity-settings row for Poster Peer Review is sufficient; do not build a generic scheduling engine.

### 4. Export and hardening

- Add CSV export only after record viewing/edit/delete are stable.
- Export the selected activity with explicit and stable headings.
- Verify unauthenticated and authenticated non-teacher users cannot read, edit, delete or control activities.
- Verify teacher reads and mutations.
- Verify closed/open/closed Peer Review behaviour from both UI and direct Supabase access.
- Run `npm run build`, migration verification queries and production smoke tests.

## Non-negotiable constraints

- No student authentication.
- No student-side update or resubmission.
- No AI features.
- No multi-course administration.
- No major or generic database redesign.
- Never expose a service-role key to the browser.
- RLS, grants and constraints are security boundaries, not frontend-only checks.
- Do not display raw Supabase/PostgreSQL errors to students.
- Every database change must include:
  - an idempotent file in `supabase/migrations`
  - the matching final state in `supabase/schema.sql`
  - tables/constraints/grants/RLS impact
  - security and privacy impact
  - production execution order
  - verification queries
  - recovery/rollback guidance
- Update README, AI context, architecture, roadmap and changelog whenever implemented behaviour changes.
- Prefer focused branches and small Draft PRs; do not merge until I explicitly approve.

## How to begin

Start by inspecting the current `main` code, schema, migrations and open PRs. Then report:

1. the exact current dashboard structure and reusable components;
2. the current grants and RLS policies for all five activity tables;
3. the smallest proposed Sprint 2 implementation slices;
4. the first slice's affected files, database impact, security impact, acceptance criteria and tests.

Do not implement the whole Sprint 2 in one change. Begin with **Dashboard foundation + detailed Student Check-in records**. Create a focused Draft PR after build and checks pass, then wait for my review before continuing or merging.
