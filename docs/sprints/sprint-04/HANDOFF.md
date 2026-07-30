# Sprint 4 Handoff

**Status: Active — Phase 2 implemented locally; Draft PR pending**

## Starting point

Sprint 3 closed on 30 July 2026 with reusable teaching blocks, a private roster,
Student ID-only Find My Team, roster-authoritative activity team assignment,
Week 1–3 evidence and private Teacher Review. The first live cohort has 18
students in five teams and is already using Week 1.

## Current Phase

**Phase 2 — NIT3004 Recovery and Week-specific Engagement Journey**

Implemented on `agent/sprint4-phase2-continuity-journey`:

- replaces the repeated Week 1–3 generic check-out with a three-item common
  pulse: participation, weekly status and support need
- Week 1 checks inherited project access, NIT3003 team continuity and whether
  remaining work is understood after the break
- Week 2 checks implementation, traceable evidence and demo readiness as the
  quick 80% entry baseline; the detailed Implementation Pre-check remains the
  evidence and method-verification activity
- Week 3 checks product, testing, report and presentation readiness
- Week 4 adds a Final Delivery Check for rehearsal, demo fallback, speaking role
  and submission status
- all normal paths are selection-only with one optional 200-character note
- legacy generic Week 1–3 evidence remains readable
- Teacher Activity records and CSV include the new fields plus labelled legacy
  fields

Database delivery:

- migration:
  `supabase/migrations/20260730_sprint4_phase2_continuity_journey.sql`
- canonical final state synchronised in `supabase/schema.sql`
- Week 4 is permitted by the weekly evidence constraint
- existing grants, RLS, roster assignment trigger, block-scoped duplicate rule
  and Phase 1 project snapshot trigger remain unchanged

## Acceptance gate

- normal student completion requires no written response
- no project selection or repeated project description appears in NIT3004
- old submissions remain readable and correctly labelled
- duplicate, roster, block and project context remain authoritative
- anonymous and non-teacher users cannot read protected evidence
- teacher records and CSV remain block/team/project-aware
- build, SQL checks and role-based smoke tests pass
- focused Draft PR is created and not merged without approval

## Local verification

- TypeScript and Vite production build passed on 30 July 2026.
- `git diff --check` passed.
- Schema structure checks confirmed one canonical definition for each new
  project RPC and the formal teams table.
- The existing bundle-size warning remains and is not a Phase 1 functional
  failure.

## Next phase

After Phase 2 is deployed and validated, continue with Phase 3 — Week 3–4
follow-up continuity. Do not combine Phase 3 into this PR.
