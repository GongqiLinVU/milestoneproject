# Sprint 4 — Project Foundation and Weekly Continuity

**Status: Closed at the agreed Phase 3 boundary on 31 July 2026**

## Origin and boundary

Sprint 4 built on the production block, roster, private lookup, automatic team
assignment, weekly evidence and Teacher Review foundation delivered in Sprint 3.
The first live cohort already had 18 students in five teams, so rollout safety
and fast teacher setup took priority over platform generality.

## Goal

Create a stable `Teaching Block → Team → Project Assignment` foundation and a
coherent Week 1–4 teaching journey. Students should not repeatedly type project
information, teacher judgement stays private, and later-week follow-up remains
linked to original evidence.

## Delivered

### Phase 1 — Team & Project foundation

- formal block-scoped teams derived from the private roster
- a teacher-managed, block-scoped Project Catalogue
- exactly one current project assignment per team
- teacher-assigned and future student-selection block modes
- NIT3003 → NIT3004 continuation markers
- roster-derived, read-only project context for students
- project identity captured on later activity submissions
- Project Setup usability improvements: paginated lists, stacked sections and a
  deliberate Save Assignments action

### Phase 2 — NIT3004 recovery and week-specific journey

- Week 1 Project Recovery and Team Health
- Week 2 80% Entry Baseline and Project Review
- Week 3 Completion Quality
- Week 4 Final Delivery Readiness
- selection-first completion with at most one optional note
- roster-derived team and project context instead of repeated student entry
- historical weekly evidence remains readable

### Phase 3 — Week 3–4 follow-up continuity

- Week 1–4 filtering in teacher Weekly Check-out records
- unresolved Teacher Review queues in Week 3 and Week 4
- explicit `Submitted` versus `Missing` evidence state
- direct return to the original Week 2 evidence and private review
- block-scoped matching that excludes resolved and no-follow-up reviews

## Deferred to Sprint 5

The former Sprint 4 Phase 4 and Phase 5 are intentionally moved to Sprint 5 so
the platform can first simplify student activities and introduce a reliable
student identity:

- trajectory and teaching analytics
- block/team/project-aware export hardening
- privacy, RLS and production validation for the complete authenticated journey

Sprint 4 is a historical delivery boundary. New behaviour must be planned in
Sprint 5 rather than added back to this Sprint.
