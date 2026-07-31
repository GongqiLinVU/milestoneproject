# Sprint 4 — Project Foundation, Weekly Journey and Teaching Analytics

**Status: Active — Phase 3 in progress**

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
- assignment origin and continuation markers for the NIT3003 → NIT3004 handoff
- a short team-level student Project Proposal path for NIT3003
- project identity captured on later activity submissions

Rollout:

- `2026 · 2B1` remains `teacher_assigned`.
- Existing roster project names are imported into catalogue and assignment
  records without changing Week 1 evidence.
- The teacher creates and links the five current team projects.
- A future NIT3003 block may enable `student_selection`; one team member selects
  during Check-in and teammates see the same project.
- NIT3004 restores the existing team/project, records it as a continuation and
  does not ask students to select a new project.
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

## Phase 2 — NIT3004 recovery and week-specific engagement journey

Replace repeated generic questions with a short common pulse plus week-specific
readiness questions. Week 4 receives a brief Final Delivery Check. Normal
completion remains selection-first with at most one optional note.

The four-week sequence is grounded in the real course handoff:

- Week 1 — Project Recovery & Team Health: confirm access to the inherited
  project, team continuity, realistic remaining work and blockers after the break.
- Week 2 — 80% Entry Baseline & Project Review: verify the running prototype,
  traceable evidence, technical explanation and remaining delivery scope.
- Week 3 — Completion Quality: integration, testing, bug fixing, report evidence
  and individual contribution evidence.
- Week 4 — Final Delivery Readiness: presentation, demo fallback, individual
  speaking readiness and final submission state.

Acceptance:

- Week 1 checks access to inherited project resources, team continuity and
  remaining-work clarity after the break.
- Week 2 provides a short 80% baseline pulse without duplicating the detailed
  Implementation Pre-check or teacher demo review.
- Week 3 focuses on integration, testing, report and presentation completion.
- Week 4 provides an actionable final delivery check.
- Normal completion requires selections only; one short note remains optional.
- Existing Week 1–3 rows remain readable and new submissions retain
  roster-derived team and project context.
- Week 4 is block-scoped and follows the same duplicate and privacy rules.

## Phase 3 — Week 3–4 follow-up continuity

Surface unresolved Teacher Review work in later-week teacher views, isolated by
teaching block and linked to evidence.

Acceptance:

- Weekly teacher records can be filtered to one Week 1–4 view.
- Week 3 and Week 4 show unresolved Teacher Reviews due by the selected week.
- Each follow-up shows whether that student has submitted the selected week’s
  check-out without treating missing evidence as a negative response.
- The teacher can return directly to the original Week 2 evidence and private
  review record.
- Resolved work and reviews marked `No follow-up needed` stay out of the queue.
- Follow-up records and evidence are matched only inside the selected teaching
  block.

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
