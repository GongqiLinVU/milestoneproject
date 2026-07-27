# Sprint 2 — Teacher Operations and Activity Control

**Status: Ready to start**

## Goal

Turn the Teacher Dashboard from a summary screen into a safe operational
teaching tool. Teachers can inspect and correct submitted evidence, remove
invalid records, export data and control when Poster Peer Review opens.
Students remain unauthenticated and submissions remain create-once.

## Phase 1 — Dashboard foundation

- Preserve authentication and current summary cards.
- Add teacher sign-out and clear authenticated-session status.
- Add accessible loading, empty, success and actionable error states.
- Add a detailed Student Check-in table with name, Student ID, team, goal,
  `created_at` and `updated_at`.
- Establish reusable table, query and refresh patterns.

Acceptance:

- A teacher can sign in, sign out and view the detailed Check-in records.
- Unauthenticated and authenticated non-teacher users cannot access the data.
- Loading, empty and error states are understandable and accessible.
- Summary cards continue to work and `npm run build` passes.

## Phase 2 — Activity record views

- Reuse the Phase 1 patterns for `week1_pulse`, `team_conversations`,
  `student_promises` and `poster_reviews`.
- Provide clear activity navigation and stable field labels.
- Preserve protected teacher-only reads.

Acceptance:

- A teacher can inspect records for all five activity types.
- Empty and error states are activity-specific.
- Switching activities does not leak stale rows or status.

## Phase 3 — Teacher actions

- Add authorised teacher edit for incorrect records.
- Add authorised teacher delete for invalid records with explicit confirmation.
- Refresh the affected row and summary counts after each mutation.
- Preserve uniqueness, rating, self-review and duplicate-review constraints.
- Translate constraint failures into understandable UI messages.
- Add only the minimum UPDATE/DELETE grants and RLS policies required, using
  the existing `is_teacher()` check.

Acceptance:

- Teacher edits persist and continue to obey database constraints.
- Delete removes only the selected record after confirmation.
- Anonymous and authenticated non-teacher users cannot update or delete.

## Phase 4 — Peer Review control

- Add an Admin control labelled **Open peer review**, off by default.
- Keep the student entry point visible but disabled while closed, with
  **Peer review opens in Week 3**.
- Persist the non-sensitive state in Supabase.
- Permit public read of only the safe open/closed setting.
- Permit changes only for authenticated teachers.
- Require the anonymous `poster_reviews` INSERT policy to check the setting.
- Opening or closing takes effect without code changes or redeployment.
- Closing blocks only new reviews; existing records remain unchanged.

Prefer one activity-settings row for Poster Peer Review. Do not build a generic
scheduling engine.

Acceptance:

- Closed state disables the UI and rejects direct anonymous inserts.
- Open state enables the form and permits valid inserts.
- Closing again blocks new inserts without changing existing records.
- Non-teachers cannot change the setting.

## Phase 5 — Export, security and production

- Export the selected activity to CSV with explicit, stable headings.
- Verify anonymous, authenticated non-teacher and teacher access.
- Re-test duplicate, self-review and create-once student behaviour.
- Verify closed/open/closed Peer Review through the UI and direct Supabase
  requests.
- Run `npm run build`, migration verification queries and production smoke
  tests.

Acceptance:

- CSV content matches the selected activity and stays inside the teacher
  session.
- All role and Peer Review control checks pass.
- Documentation matches production behaviour.

## Non-negotiable constraints

- No student authentication or student-side update/resubmission.
- No AI, multi-course administration or major/generic database redesign.
- No tutor/coordinator role expansion or multi-window scheduling.
- Never expose a service-role key to the browser.
- RLS, grants and constraints are security boundaries, not frontend checks.
- Do not display raw Supabase/PostgreSQL errors to students.
- Every database change requires an idempotent migration, matching
  `supabase/schema.sql`, security/privacy impact, production order,
  verification queries and rollback guidance.
- Each session implements one Phase in a focused Draft PR. Do not merge without
  explicit approval.

