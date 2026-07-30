# Sprint 4 — Weekly Journey, Follow-up and Teaching Analytics

**Status: Active — Phase 1 planned**

## Origin and boundary

Sprint 4 carries forward only the unstarted work from Sprint 3. It builds on the
production block, roster, private lookup, automatic team assignment, weekly
evidence and Teacher Review foundation delivered in Sprint 3.

Completed Sprint 3 behaviour is not reimplemented or redesigned unless a defect
prevents Sprint 4 acceptance criteria from being met.

## Goal

Complete a coherent Week 1–4 teaching journey that is quick for students,
operationally useful for teachers and reusable across teaching blocks.
Student-facing questions remain selection-first. Teacher judgement remains
private and separate from student self-report. Analytics remain descriptive,
evidence-linked and never assign marks or unsupported performance labels.

## Phase 1 — Week-specific engagement journey

Replace repeated generic weekly questions with a short common pulse plus
week-specific readiness questions:

- Week 1: project direction, role clarity and team alignment
- Week 2: implementation, demonstration and traceable evidence
- Week 3: completion, testing, report and presentation readiness
- Week 4: final presentation readiness and delivery confirmation where needed

Keep a small common pulse across Weeks 1–3 for longitudinal comparison. Prefer
selections and quick actions, with at most one optional short note. Student forms
must not ask for own-team information; block and team continue to resolve from
the active block and roster.

Acceptance:

- Each week has a clear teaching purpose and does not repeat another activity's
  evidence.
- Normal completion requires no written response.
- Existing submissions and receipts remain readable and correctly labelled.
- Duplicate prevention stays scoped to block, Student ID and week.
- Unmatched Student IDs are rejected without exposing roster data.
- Teacher Activity records and CSV retain block and roster-derived team context.
- Database changes include idempotent migration, schema synchronisation, grants,
  RLS, verification queries and rollback guidance.
- Production build and role-based smoke tests pass before merge.

## Phase 2 — Week 3–4 follow-up continuity

Surface Teacher Review items with Action required, In progress or Recheck next
session in later-week teacher views. Keep a single current review per student,
preserve updated timestamps and isolate every queue by teaching block.

Acceptance:

- Follow-up queues never mix blocks.
- Private review details remain collapsed by default and one student opens at a
  time.
- Teachers can move an item through existing operational statuses without
  changing student evidence.
- AI suggestions remain optional, temporary and advisory.
- Week 4 provides a practical closure path for unresolved items.

## Phase 3 — Three-week trajectory and teaching analytics

Show per-student Week 1–3 trajectories, Team Participation Temperature,
completion, evidence readiness, disagreement and follow-up queues. Every summary
must drill down to the submitted evidence used to produce it.

Acceptance:

- Missing data is distinct from a negative answer.
- Filters and counts are scoped to the teacher-selected block.
- Team summaries show response coverage and do not hide disagreement.
- No automated mark, disciplinary decision or unsupported performance label is
  produced.
- Sensitive individual evidence remains teacher-only.

## Phase 4 — Export, privacy and production validation

Stabilise teacher-authorised exports and verify the complete Sprint 4 journey.

Acceptance:

- Export headings and values are stable, explicit and block-scoped.
- Anonymous Class Pulse data remains aggregate-only.
- Conditional fields, duplicate rules and roster matching are verified.
- Anonymous and authenticated non-teacher users cannot read protected evidence.
- All required migrations, RLS checks, production builds and Vercel smoke tests
  pass.
- README, AI context, architecture, roadmap, changelog and Sprint handoff match
  verified production behaviour.

## Out of scope

- student authentication or profiles
- controlled student resubmission
- tutor or coordinator roles
- generic multi-course administration
- automatic grading or risk prediction
- expansion of the AI pilot beyond teacher-triggered advisory suggestions

## Delivery rules

- One focused Phase and one Draft PR at a time.
- Start every Phase from latest `main`.
- Update this Sprint's `HANDOFF.md` and `ROADMAP.md` with verified evidence.
- Do not merge without explicit user approval.
