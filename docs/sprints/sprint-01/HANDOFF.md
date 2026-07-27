# Sprint 1 Handoff

**Status: Completed and production validated**

## Production state

- Student portal: `https://milestoneproject-two.vercel.app/`
- Teacher dashboard: `https://milestoneproject-two.vercel.app/admin`
- Final Sprint 1 production commit: `2d648cf8457c5e50b33709144a447cec9741695b`

## Verified behaviour

- All four Week 1 activities submit correctly.
- Activity modal state and errors do not leak between forms.
- Same-browser submission memory checks before submit, shows a locked read-only
  receipt and excludes student names and plain-text Student IDs.
- Database constraints and RLS remain the cross-browser authority.
- Teacher authentication and protected summary reads work.
- Peer Review remains visible but its student entry point is disabled and
  labelled **Peer review opens in Week 3**.
- Merges to `main` trigger Vercel production deployment.

## Handoff to Sprint 2

Sprint 2 must turn the summary dashboard into an operational teacher tool and
replace the temporary Peer Review UI lock with teacher-controlled runtime state
and database enforcement.

Do not reopen Sprint 1 unless a reproducible regression violates its delivered
scope or acceptance behaviour.

