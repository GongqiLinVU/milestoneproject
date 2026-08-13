# Intake Baseline — 13 August 2026

## Status and limitations

This is a mid-cycle product analysis, not a final course-outcome analysis.

- Starting cohort: 17
- Withdrawn: 3
- Active cohort used as the denominator: 14
- Teams represented: 6
- Exported records: 154
- The sample is sufficient for product-design learning but not for a predictive
  model or statistically generalisable student-risk scoring.
- Later-session averages are affected by selective submission and must always be
  shown with coverage.

## Coverage

| Evidence source | Records | Active students represented |
|---|---:|---:|
| Week 1 Check-in | 14 | 14 |
| Four-Week Promise | 5 | 5 |
| Team Health | 11 | 11 |
| Week 2 Pre-check | 13 | 13 |
| Weekly Check-out | 23 | 12 |
| Session Check-in | 49 | 12 |
| S6–S9 Work Track | 25 | 14 |

Weekly Check-out coverage declined from 12 students in Week 1 to 6 in Week 2 and
5 in Week 3.

Session Check-in coverage was 11 students in both S4 and S7, but only 6–7 in
S5, S6, S8 and S9. This supports the observation that classroom-supervised
Sessions create a much stronger participation rhythm than unsupervised online
Sessions.

## Finding 1 — Week 1 Check-in achieved entry, not actionable Intake

All 14 active students completed Week 1 Check-in, but only the broad four-week
goal contained data. Confidence, current status, concern and support fields were
empty in this cohort.

Goals mostly described a Team aspiration such as completing a functional
product. They rarely defined an individual responsibility, deliverable,
evidence or due Session. At least two students in one Team used the same goal,
which further indicates Team aspiration rather than individual commitment.

**Decision direction:** refine. Preserve the short, high-completion entry
experience, but replace the broad goal with responsibility, deliverable,
evidence, due Session and dependency/support fields.

## Finding 2 — Four-Week Promise should not remain independent

Only 5 of 14 active students completed the Promise, with submissions heavily
clustered in particular Teams. Its content overlaps the Week 1 goal and does not
justify a separate student workflow.

**Decision direction:** remove as a standalone form and absorb its teaching
purpose into the Session 1 responsibility agreement.

## Finding 3 — Team Health contains useful signals but invites ideal answers

Among 11 responses:

- communication: 11 Yes
- role clarity: 10 Clear, 1 Partly clear
- participation balance: 7 Balanced, 4 Some difference
- delivery status: 8 On track, 3 Some risk
- teacher support: 7 No, 4 Maybe, 0 Yes

Later missing submissions and observed contribution imbalance do not fully align
with the overwhelmingly positive answers. This should not be interpreted as
dishonesty; the questions are broad and easy to answer aspirationally.

The Team that consistently reported participation differences, technical
concerns and possible support needs produced a meaningful early signal.
However, the platform did not yet convert that signal into a tracked teacher
support loop.

**Decision direction:** refine toward factual questions about named
responsibilities, identifiable evidence, unowned work and whether task
redistribution is needed.

## Finding 4 — Week 2 Pre-check is the strongest current Intake evidence

Thirteen of 14 active students described a deliverable area, implementation
item, location, demonstration method, remaining issue, next action and desired
teacher verification. The free-text implementation and issue fields revealed
specific concerns such as incomplete integration, mock data, testing gaps,
network access, AI accuracy, LLM integration and unfinished access roles.

This is substantially more actionable than broad status questions.

Weaknesses remain:

- only 1 of 13 supplied an evidence reference;
- 8 claimed Implemented and verified;
- 4 simultaneously selected Implemented and verified and Complete
  implementation as the next action;
- no student selected Blocked;
- some state, verification and next-action combinations were internally
  inconsistent.

**Decision direction:** retain the concrete evidence model, but reduce reliance
on self-awarded status labels. Require or facilitate evidence and validate
incompatible answer combinations.

## Finding 5 — Completion must be reported with coverage

| Session | Work Track submissions | Mean submitted completion |
|---|---:|---:|
| S6 | 2 | 71.0% |
| S7 | 12 | 78.6% |
| S8 | 5 | 86.6% |
| S9 | 6 | 90.3% |

The upward trend is plausible, but S9's 90.3% describes only 6 of 14 active
students. It must not be presented as whole-cohort completion.

Every future completion view should show:

- submitted / eligible;
- missing;
- submitted-student average or distribution;
- teacher-confirmed versus unverified records.

**Decision direction:** retain Completion Percentage as a useful shared measure,
but never display it without coverage and verification context.

## Finding 6 — Personal responsibility is introduced too late

Week 2 Pre-check can distinguish Frontend, Backend, Database, Testing,
Documentation and Coordination contributions, but Week 1 did not establish the
responsibility map needed to follow those contributions from the start.

**Decision direction:** pilot a Session 1 responsibility agreement in the next
block and carry it into short later updates. The goal is early support and
responsible task redistribution, not commit-count surveillance.

## Provisional product implications

### Retain

- Completion Percentage
- individual implementation item
- work location
- demonstration method
- remaining issue
- desired teacher verification
- participation-balance signal
- explicit help request
- longitudinal Work Track evidence

### Refine

- Week 1 goal into individual responsibility and evidence
- Team Health into factual allocation and support questions
- self-reported implementation/verification states
- completion reporting with cohort coverage
- teacher follow-up from identified signals

### Remove or consolidate

- standalone Four-Week Promise
- repeated broad project goals
- broad questions that do not lead to a teacher or student action

### Investigate after final Session

- how S10 feedback explains non-Monday participation;
- whether teacher verification changes self-reported completion;
- whether early Team Health concerns align with final contribution balance;
- which missing submissions reflect communication, access, motivation or
  workflow design;
- whether a one-page Progress Report can support bounded AI extraction and
  personalised questions.

## AI boundary

No AI feature is justified solely by this mid-cycle dataset. A plausible future
use is emerging: extract responsibilities, progress, gaps and evidence from a
one-page Progress Report, compare them with confirmed student responsibility,
and generate a small number of review questions. This must be tested against the
final evidence before entering Sprint 8 implementation.
