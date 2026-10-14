# S10-UI01 — Focused teacher Session workspace

14 October 2026. Joseph approved the layout direction after reviewing the
S10-AI01 candidate. This frontend follow-up is included in the still-unmerged
PR #74, based on its implementation commit 8a0dcb2. No SQL was applied, no
production settings changed and no provider calls made.

## Teacher behavior

- Block selector and Session defaults form the global area. The default collection
  method stays visible, with the number of Session overrides and one relevant
  method explanation. AI trial usage/limits and Session plan setup are collapsed
  secondary controls. An AI reconciliation pause is visible without expanding.
- Entry defaults to one focused Session: effectively open Check-in first, then
  today's Session, next non-closed future Session, or the last Session. Date-only
  selection uses the browser's local calendar date, consistent with the existing
  schedule display; this does not introduce or change timetable timezone policy.
- S1–S10 navigation changes only the viewed Session. Teacher selection survives
  settings saves/readback. Return to current explicitly returns to the current
  candidate; changing Block resets the focus and comparison view.
- All Sessions shows compact comparable summaries: date/focus, Check-in state and
  count, effective collection method/source and effective submission window.
  Individual headers expand details; Expand all / Collapse all supports comparison.
  The focus header can also collapse/reopen without leaving that Session.
- Expanded details group Attendance, Progress collection and Student records.
  Explicit Open/Close/Reopen check-in labels replace ambiguous Open/Close labels.
  A single submission-window selector chooses Follow Session / Open / Closed,
  with the resulting state explained separately. It updates only the currently
  selected collection family's existing window field.
- Session method changes live under Change this Session's method; inheritance is
  an explicit option. Previous collection records, attendance table/CSV/reset,
  schedule/task editing and S10 Feedback remain available in their relevant groups.
  Reset's existing preservation and automatic-window-clearing behavior is stated.
- Responsive layout stacks the three groups on mobile. Native buttons, details,
  labels, pressed/expanded state, controlled panel IDs and visible keyboard focus
  preserve usable keyboard controls. No access or submission contract changed.

## Focused validation

- Production build PASS; existing >500 kB chunk warning remains.
- Chromium against actual components and the existing isolated SQL bridge PASS:
  seeded ten Sessions with S7 open; initial single-Session focus; all ten summaries;
  individual and bulk expand/collapse; S10 Feedback controls; S1 method override
  and submission-window round trip; persisted budget readback; restoration of
  inheritance; focus retained after saves; explicit return to S7; 390px focus and
  expanded comparison without horizontal overflow; no page errors.
- Desktop and mobile screenshots visually inspected. The synthetic bridge
  serializes PostgreSQL dates as date-only strings, matching PostgREST transport.
- Reuses S10-AI01's 138/138 API and isolated SQL contract evidence: endpoint and SQL
  code are unchanged in this UI follow-up. No broad regression rerun or new app
  dependency. This is not hosted authentication, live AI or production acceptance.

## Release

No additional migration or server configuration is introduced by this follow-up.
PR #74 still depends on its existing, unapplied
20261014_sprint10_ai01_session_controls.sql and matching API deployment. Review
that runbook in S10-AI01_REPORT.md before release. A short authorized teacher smoke
should confirm defaults, focused/current navigation, all-Session comparison and
one method/window change with existing test data. Production writes, merge and
release remain pending separate approval.
