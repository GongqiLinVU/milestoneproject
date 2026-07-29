# Sprint 3 Handoff

**Status: Active; Phase 1 implementation started**

## Starting point

- Sprint 2 was production validated and closed on 27 July 2026.
- Sprint 3 was revised on 29 July 2026 after confirming that only Monday is
  compulsory and that teaching decisions need evidence from the rest of each
  week.
- The Sprint now creates a continuous Week 1–3 engagement evidence loop.
- AI-assisted personalised teaching remains future scope.

## Current Phase

**Phase 1 — Week 1 Engagement Loop**

Implementation branch: `sprint-3-phase-1-engagement-loop`

Deliver:

- Team Conversation → individual Team Health Check
- Four-Week Action Plan → Week 1 Engagement Check-out
- Team Participation Temperature and coverage in Teacher Dashboard
- new create-only student tables with teacher-only reads
- retained historical tables and records
- migration, schema, tests and documentation

## Approved sequencing

1. Week 1 Engagement Loop
2. Week 2 Progress Review + Week 2 Check-out
3. Teacher Review + Week 3 Check-out
4. Three-week trajectory and teaching analytics
5. Export, privacy and production validation

## Completion records

Record PR, merge commit, migration, production verification, decisions and
remaining issues only after they are verified.


## Phase 1 implementation update — 2026-07-29

Implemented on PR #18:

- individual Team Health Check with conditional risk note;
- ten-question Week 1 Engagement Check-out with conditional detail note;
- Team Participation Temperature plus raw teacher records;
- shared Week 1–3 checkout table and dedicated health table;
- student insert-only and teacher-only read/manage access;
- historical Team Conversation and Four-Week Action Plan data preserved.

Pending before merge: apply the migration in Supabase and complete production smoke testing with real anonymous and teacher sessions.
