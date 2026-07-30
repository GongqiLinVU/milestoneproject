# Sprint 4 — Project Foundation, Weekly Journey and Teaching Analytics

**Status: Active — Phase 1 in progress**

## Origin and boundary

Sprint 4 builds on the production block, roster, private lookup, automatic team
assignment, weekly evidence and Teacher Review foundation delivered in Sprint 3.
The first live cohort already has 18 students in five teams and started Week 1,
so rollout safety and fast teacher setup take priority over platform
generality.

## Goal

Create a stable `Teaching Block → Team → Project Assignment` foundation, then
complete a coherent Week 1–4 teaching journey. Students should not repeatedly
type project information. Teacher judgement stays private and analytics remain
descriptive, evidence-linked and non-grading.

## Phase 1 — Team & Project foundation

Establish only the reusable identities needed by current teaching:

- formal block-scoped teams derived from the private roster
- a teacher-managed, block-scoped Project Catalogue
- exactly one current project assignment per team
- a block mode of `teacher_assigned` or `student_selection`
- a short team-level student Project Proposal path
- project identity captured on later activity submissions

Rollout:

- `2026 · 2B1` remains `teacher_assigned`.
- Existing roster project names are imported into catalogue and assignment
  records without changing Week 1 evidence.
- The teacher creates and links the five current team projects.
- A future block may enable `student_selection`; one team member selects during
  Check-in and teammates see the same project.
- Teacher confirmation prevents later student overwrites.

Acceptance:

- One team has no more than one current project; multiple teams may use the same
  project.
- Student project lookup never exposes the roster or another team's members.
- Current students are not required to reselect or re-enter project details.
- Week 2 shows a roster-derived, read-only Project Snapshot.
- A proposal approval creates a published project and confirmed assignment.
- Existing activity data remains readable; new identified submissions capture
  `project_id` when available.
- Migration is idempotent and includes grants, RLS, verification queries and
  rollback guidance.
- Production build and role-based database checks pass before merge.

Not included in Phase 1:

- project capacity, exclusivity or recommendation
- project versioning
- multi-stage approval or generic workflow
- student accounts
- generic course/activity configuration

## Phase 2 — Week-specific engagement journey

Replace repeated generic questions with a short common pulse plus week-specific
readiness questions. Week 4 receives a brief Final Delivery Check. Normal
completion remains selection-first with at most one optional note.

## Phase 3 — Week 3–4 follow-up continuity

Surface unresolved Teacher Review work in later-week teacher views, isolated by
teaching block and linked to evidence.

## Phase 4 — Three-week trajectory and teaching analytics

Show completion, evidence readiness, participation temperature and follow-up
queues with drill-down to submitted evidence. Missing data must remain distinct
from negative evidence.

## Phase 5 — Export, privacy and production validation

Stabilise block/team/project-aware exports and verify the complete Sprint 4
journey, RLS boundaries and production deployment.

## Delivery rules

- One focused Phase and one Draft PR at a time.
- Start every Phase from latest `main`.
- Update this Sprint's `HANDOFF.md` and `ROADMAP.md` with verified evidence.
- Do not merge without explicit user approval.
