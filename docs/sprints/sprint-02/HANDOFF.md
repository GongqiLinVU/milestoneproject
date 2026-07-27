# Sprint 2 Handoff

**Status: Phase 2 implemented; Draft PR review and production verification pending**

## Starting point

- Base all work on latest GitHub `main`.
- Sprint 1 is complete and production validated. See
  `docs/sprints/sprint-01/HANDOFF.md`.
- Peer Review is currently hard-disabled only in the student UI.
- Phase 1 was merged in PR #7 (`5a93a170745d91b834eba78e20a8190a67eb74a4`).

## Next Phase

**Phase 3 — Teacher actions**

After Phase 2 is reviewed, merged and production verified, add authorised edit
and delete actions with the minimum required grants and RLS policies. Do not
start Phase 3 from the unmerged Phase 2 branch.

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
Implemented; production build and diff checks passed. Draft PR review and
production verification pending.

PR:
Pending

Merge commit:
Not merged

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

Remaining issues:

- Review and merge the Phase 2 Draft PR only after approval.
- Verify all five selectors, tables, empty states and error states in production.
- Begin Phase 3 only from the merged Phase 2 `main`.
