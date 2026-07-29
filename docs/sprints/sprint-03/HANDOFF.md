# Sprint 3 Handoff

**Status: Active; Phases 1–2 complete and Phase 3 in progress**

## Starting point

- Sprint 2 was production validated and closed on 27 July 2026.
- Sprint 3 was revised on 29 July 2026 after confirming that only Monday is
  compulsory and that teaching decisions need evidence from the rest of each
  week.
- The Sprint now creates a continuous Week 1–3 engagement evidence loop.
- Broader AI-assisted teaching remains future scope; Phase 3B is a limited teacher-controlled suggestion pilot.

## Current Phase

**Phase 3 — Teacher Review and Week 3 Check-out**

Implementation branch: `agent/sprint-3-phase-3-teacher-review`

Deliver:

- teacher-only verified review outcome after the compulsory implementation conversation
- Week 3 reuse of the ten-question Engagement Check-out
- clear separation between student self-report and teacher judgement
- one review per Student ID with teacher correction through the dashboard
- migration, schema, build, RLS and production verification

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

Phase 1 was migration-tested, smoke-tested and merged through PR #18 as commit `b7bd280`. The temperature range now reports answer health separately from response coverage.
\n\n## Phase 2 implementation update — 2026-07-29\n\nStarted the Week 2 Progress Review and Week 2 Check-out on a dedicated branch. Teacher review outcomes remain Phase 3 scope. Pending: preview build, migration application, anonymous/teacher smoke tests and explicit merge approval.\n

## Phase 3 implementation update — 2026-07-29

Implemented on a dedicated Draft PR branch:

- Week 3 Engagement Check-out in the Week 3 tab;
- private accordion list built from Week 2 Implementation Pre-checks;
- collapsed identity, team, deliverable and follow-up status, with only one student open at a time;
- read-only student claim, demo, code/evidence, method and remaining work;
- teacher verification, feedback, multi-select actions, operational status and optional Week 2–4 recheck;
- upserted one-record-per-student follow-up history with teacher-only grants and RLS.

Pending: preview build, migration application, role smoke tests and explicit merge approval.
\n\n## Phase 3B implementation update — 2026-07-29\n\nStarted a protected Vercel serverless endpoint and teacher-only suggestion card. The request excludes student identity and returns four structured teaching prompts. AI output remains temporary unless the teacher deliberately copies it into a follow-up and saves the review. No database migration is required. Pending: preview build, Vercel environment configuration, authenticated endpoint smoke tests and explicit merge approval.\n