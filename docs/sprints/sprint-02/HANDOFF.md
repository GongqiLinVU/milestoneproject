# Sprint 2 Handoff

**Status: Phase 1 implemented in Draft PR; review and production verification pending**

## Starting point

- Base all work on latest GitHub `main`.
- Sprint 1 is complete and production validated. See
  `docs/sprints/sprint-01/HANDOFF.md`.
- Peer Review is currently hard-disabled only in the student UI.
- No Sprint 2 frontend behaviour or database migration has been implemented.

## Next Phase

**Phase 2 — Activity record views**

After Phase 1 is reviewed and merged, reuse its protected query, refresh,
status and table patterns for the remaining four activity types. Do not start
Phase 2 from the unmerged Phase 1 branch.

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
Implemented; local build and diff checks passed. Draft PR review and production
verification pending.

PR:
Pending

Merge commit:
Not merged

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

- Review and merge the Draft PR only after approval.
- Verify sign-in, refresh persistence, sign-out, teacher reads and non-teacher
  denial in the deployed environment.
- Implement the other four activity record views in Phase 2 after Phase 1 is
  merged.
