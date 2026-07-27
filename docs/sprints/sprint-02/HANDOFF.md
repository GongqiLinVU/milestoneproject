# Sprint 2 Handoff

**Status: Phase 4 merged and migrated; Phase 5 in progress**

## Starting point

- Base all work on latest GitHub `main`.
- Sprint 1 is complete and production validated. See
  `docs/sprints/sprint-01/HANDOFF.md`.
- The Poster Peer Review window is now controlled from the Teacher Dashboard.
- Phase 1 was merged in PR #7 (`5a93a170745d91b834eba78e20a8190a67eb74a4`).
- Phase 2 was merged in PR #9 (`b6cd0efe6384c78b9c33c97a382d179d96c5a9d8`).
- The Phase 2 privacy and language refinement was merged in PR #10
  (`f619d048e5edd1b5fd570d873918af870d078280`).

## Next Phase

**Phase 5 — Export, security and production**

Refine the Poster Peer Review form using structured selections, then add
selected-activity CSV export and complete the Sprint 2 role, RLS and production
verification matrix.

## Completion records

Add one entry per completed Phase:

```text
Phase:
Status:
PR:
Merge commit:
Database migration:
Production verified:
Decisions:
Remaining issues:
```

Record only verified results. Do not use this file to rewrite the Sprint plan.

Phase:
Phase 1 — Dashboard foundation

Status:
Merged.

PR:
#7

Merge commit:
`5a93a170745d91b834eba78e20a8190a67eb74a4`

Database migration:
None. Existing authenticated SELECT grants and `is_teacher()` RLS policies
cover the Phase 1 reads.

Production verified:
No

Decisions:

- Supabase's persisted browser session is restored with `getSession()` and kept
  current through `onAuthStateChange()`.
- The UI checks teacher role metadata to give non-teachers an explicit access
  state before any activity query; PostgreSQL RLS remains the security boundary.
- Five counts and the Check-in detail query share one refresh operation.
- Check-in rows are ordered newest first and timestamps use the viewer's locale.
- No database or student-portal behaviour changed.

Remaining issues:

- Verify sign-in, refresh persistence, sign-out, teacher reads and non-teacher
  denial in the deployed environment.

Phase:
Phase 2 — Activity record views

Status:
Merged, including the privacy and activity-language refinement.

PR:
#9 and #10

Merge commit:
`b6cd0efe6384c78b9c33c97a382d179d96c5a9d8`

Database migration:
None. Existing authenticated SELECT grants and `is_teacher()` RLS policies
cover all five activity reads.

Production verified:
No

Decisions:

- The five summary panels are keyboard-accessible activity selectors.
- The selected panel controls a single activity-specific query and record table.
- Each activity defines stable headings, explanatory text and empty state.
- Records are cleared before a selection loads so rows from the previous
  activity are never shown under a new heading.
- Rating fields are displayed consistently as values out of five.
- Anonymous Class Pulse responses are visualised only as class-level
  distributions; individual rows and timestamps are intentionally hidden.
- Four-Week Promise is reframed as a Four-Week Action Plan so the initial
  Check-in captures the goal and the later activity captures action, success
  evidence and support.
- A one-off manual SQL script can clear disposable test submissions. It is not
  an automatic migration.

Remaining issues:

- Verify all five selectors, Class Pulse charts, tables, empty states and error
  states in production.

Phase:
Phase 3 — Teacher actions

Status:
Merged; migration applied.

PR:
#12

Merge commit:
`2133a60df835e84e4c7732947437292e75a85713`

Database migration:
`supabase/migrations/20260727_add_teacher_record_actions.sql`

Production verified:
No

Decisions:

- Teachers can edit and explicitly confirm deletion for the four identified
  activity tables.
- Class Pulse remains anonymous and has no row-level edit/delete UI, grant or
  RLS policy.
- Mutations refresh the selected records and all five summary counts.
- Database constraint and authorisation errors are translated into concise
  teacher-facing messages.
- UPDATE/DELETE access is limited to authenticated users and still requires
  `public.is_teacher()` through RLS.

Remaining issues:

- Classroom use confirmed that student submissions and dashboard data were
  operating with twelve student records visible.
- Complete explicit production verification of teacher update/delete,
  constraint errors, anonymous denial and authenticated non-teacher denial.

Phase:
Phase 4 — Peer Review control

Status:
Merged and migrated.

PR:
#14

Merge commit:
`a6c6000496b3c90a282551d93878ae368ab00c42`

Database migration:
`supabase/migrations/20260727_add_peer_review_control.sql` — applied manually
before merge.

Production verified:
No

Decisions:

- One singleton `activity_settings` row controls Poster Peer Review; no generic
  scheduling engine was introduced.
- The setting is false on first install and exposes only its non-sensitive
  open/closed state to public readers.
- Only authenticated teachers can update the setting through `is_teacher()`
  RLS; anonymous and non-teacher users have no update permission.
- The student portal reads the setting at runtime and keeps the Week 3 entry
  visible but disabled while closed.
- The `poster_reviews` INSERT policy also checks the setting, so closing the
  activity blocks direct API inserts while preserving existing records.

Remaining issues:

- Verify closed/open/closed behaviour through the student UI and direct
  Supabase requests.
- Verify anonymous and authenticated non-teacher users cannot change the
  setting.

Phase:
Phase 5 — Poster Review form refinement

Status:
Implemented in Draft PR; no migration required.

PR:
Pending

Merge commit:
Pending

Database migration:
None. Existing Poster Review columns and constraints are reused.

Production verified:
No

Decisions:

- Labels distinguish `Your team (from team)` from `Team being reviewed (to
  team)`.
- The existing client validation and database constraint continue to prevent
  self-review.
- Five numeric ratings use descriptive, directly selectable cards while
  retaining the existing 1–5 data model and dashboard analytics.
- Strongest area and highest priority use predefined selections instead of
  required written comments.

Remaining issues:

- Verify the mobile and desktop form in the Vercel preview.
- Continue Phase 5 with CSV export and the production security matrix.
