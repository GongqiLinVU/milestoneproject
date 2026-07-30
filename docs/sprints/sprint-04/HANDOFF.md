# Sprint 4 Handoff

**Status: Active — Phase 1 implemented locally; Draft PR pending**

## Starting point

Sprint 3 closed on 30 July 2026 with reusable teaching blocks, a private roster,
Student ID-only Find My Team, roster-authoritative activity team assignment,
Week 1–3 evidence and private Teacher Review. The first live cohort has 18
students in five teams and is already using Week 1.

## Current Phase

**Phase 1 — Team & Project foundation**

The stable core is:

`NIT3003 project origin → Teaching Block → Team → Team Project Assignment → NIT3004 Week 1–4 evidence`

Projects are separated from assignments so several teams may use one project
while every team has at most one current project.

### Rollout rules

- `2026 · 2B1`: teacher creates projects and connects each team.
- Future NIT3003 blocks: teacher may enable student selection at Check-in.
- NIT3004 blocks restore the existing project rather than asking students to
  select again; current assignments are marked as NIT3003 continuations.
- Student selection is team-level; teacher confirmation locks it.
- Students with their own idea submit a short team proposal.
- Approved proposals become published projects and confirmed assignments.
- Students never read the private roster directly.

### Phase 1 delivery

- Add formal teams derived from roster team numbers.
- Add projects, team assignments and proposals.
- Add block-level `teacher_assigned` / `student_selection`.
- Backfill existing nonblank roster project names safely.
- Add Teacher Dashboard Project setup.
- Add Check-in project lookup, selection and proposal path.
- Replace Week 2 project re-entry with a read-only snapshot.
- Capture project identity on new identified activity evidence.
- Preserve old submissions and current Week 1 usage.

## Acceptance gate

- current block remains teacher-assigned after migration
- five live teams can be connected without student action
- future student selection cannot expose roster data or cross blocks
- one current assignment per team is enforced in the database
- teacher-confirmed assignments cannot be overwritten through student RPC
- build, diff and SQL structure checks pass
- focused Draft PR is created and not merged without approval

## Local verification

- TypeScript and Vite production build passed on 30 July 2026.
- `git diff --check` passed.
- Schema structure checks confirmed one canonical definition for each new
  project RPC and the formal teams table.
- The existing bundle-size warning remains and is not a Phase 1 functional
  failure.

## Next phase

After Phase 1 and the continuity patch are deployed and validated, continue with
Phase 2 — NIT3004 Recovery and Week-specific Engagement Journey. Its sequence is
Project Recovery & Team Health, 80% Entry Baseline & Project Review, Completion
Quality and Final Delivery Readiness. Do not combine Phase 2 into this PR.
