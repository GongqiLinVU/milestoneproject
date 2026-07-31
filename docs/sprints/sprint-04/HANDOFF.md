# Sprint 4 Handoff

**Status: Closed at the agreed Phase 3 boundary on 31 July 2026**

## Production baseline

Sprint 4 was delivered through Phase 3. The latest Phase 3 change was merged in
PR #35 with merge commit `9047090`.

Production now includes:

- block-scoped formal teams, Project Catalogue and team project assignments
- NIT3003 → NIT3004 project continuity
- a selection-first Week 1–4 student journey
- roster-derived team and project context
- teacher Week 1–4 evidence filtering
- Week 3–4 unresolved follow-up queues linked to Week 2 evidence
- Project Setup pagination, stacked layout and explicit assignment saving

## Product review decision

After the basic workflow became complete, the activity experience was reviewed.
Two low-value activities will be removed from the active experience:

- Class Pulse
- Team Conversation

They should not remain as student tasks merely because their original database
tables and historical records exist. Historical data must be preserved unless a
separate, explicitly approved retention decision is made.

The next foundation is roster-based student authentication without open
registration. Login must reduce later work by automatically resolving the
student, teaching block, team and project.

## Deferred work

The former Sprint 4 Phase 4 and Phase 5 move to Sprint 5:

- trajectory and teaching analytics
- export hardening
- privacy, RLS and production validation

## Continue in Sprint 5

Read:

- `docs/sprints/sprint-05/PLAN.md`
- `docs/sprints/sprint-05/HANDOFF.md`

Do not reopen Sprint 4 or implement the old Phase 4 directly. Sprint 5 begins
with activity cleanup and an authentication design gate before any login code is
written.
