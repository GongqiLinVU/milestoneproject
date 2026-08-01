# Sprint 5 Handoff

**Status: Finalisation — Phase 1–4A merged and tested; close-out PR pending**

## Delivered boundary

Sprint 5 completed the operational student identity and four-week activity
journey. Analytics and enhanced reporting are intentionally deferred to Sprint
6.

Delivered:

- retired Class Pulse, Team Conversation and standalone Find My Team from the
  active experience while preserving historical rows
- roster-prepared student accounts with unique temporary credentials, required
  personal-password setup, recovery and teacher-controlled reset
- public Landing Page plus authenticated Student Portal
- roster-derived Block, Team and Project context without repeated identity entry
- teacher-managed studio sessions and immutable student attendance
- block-aware Week 1–4 activity activation enforced in both UI and database
- six-step Week 2 Implementation Pre-check wizard with local draft recovery
- completed Pre-check read-only state and teacher-controlled submission reset
- staged AI teaching flow: Initial AI Review, saved Teacher Review and
  After-review Summary
- block-scoped Presentation Order with independent Draft and Published snapshots

## Merged delivery evidence

| PR | Delivery | Merge commit |
|---|---|---|
| #36–#43 | Sprint 5 Phase 1–3 and Activity Management foundation | See Git history |
| #44 | Weekly activation and Week 2 wizard | `f9991559` |
| #45 | Wizard hotfix, completed state and teacher reset | `c1882810` |
| #46 | AI Review permission and workflow clarification | `5aba582a` |
| #47 | Presentation Order and Sprint 5/6 scope split | `b909db5d` |

For PR #44–#47, the required migrations were applied where relevant, Preview
tests were confirmed by the product owner, Vercel checks passed and the tested
heads were merged without additional changes.

## Security and data decisions

- no open student registration
- service-role credentials remain server-only
- RLS and controlled RPCs remain the authorisation boundary
- students cannot enumerate the roster or choose their own Block, Team or Project
- activation, password reset and submission reset preserve existing evidence
- retired activity data is retained rather than destructively deleted
- weekly activity state and Presentation Order are isolated by Teaching Block
- AI output is advisory and does not mark students or change teacher records
  automatically

## Finalisation gate

Before this Sprint is marked Closed, complete
[`FINAL_VALIDATION.md`](FINAL_VALIDATION.md):

1. confirm the production deployment matches merge commit `b909db5d` or later
2. complete the short teacher, student and permission smoke checks
3. record any blocking result before merging the close-out PR
4. merge the close-out PR only when no Sprint 5 blocker remains

No new feature, analytics layer or export redesign belongs in this gate.

## Sprint 6 starting boundary

Sprint 6 begins from the latest `main` after Sprint 5 closes. Its planned scope
is:

- Student and Team Trajectory
- Block Teaching Analytics
- block/team/project/student-aware enhanced exports
- evidence-grounded AI Analytics and teacher assistance

Detailed scope belongs in `docs/sprints/sprint-06/`; Sprint 5 remains frozen
after closure.

## New-session prompt

> Continue Engineering Studio Platform from latest GitHub `main`. Read
> `AI_CONTEXT.md`, `ROADMAP.md`, `docs/sprints/sprint-05/HANDOFF.md` and
> the Sprint 6 plan. Confirm Sprint 5 is Closed before starting one focused
> Sprint 6 phase. Use the connected GitHub App, create one Draft PR and do not
> merge without explicit approval.
