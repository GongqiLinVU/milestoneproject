# Sprint 7 Plan — Trajectory, Teaching Analytics & AI Insight

**Status:** Planned  
**Source baseline:** Begins after Sprint 6 closes  
**Product area:** NIT3004 Engineering Studio Platform

## Sprint goal

Turn the evidence accumulated across Sessions, weekly activities, teacher review
and project work into a useful longitudinal teaching view.

Sprint 7 is intentionally an **evidence-consumption sprint**. Sprint 6 first adds
richer Session Work Track evidence; Sprint 7 then connects, aggregates and
interprets that evidence. The goal is not more data entry. It is to help the
teacher understand progression, find students/Teams that need attention and move
quickly from a signal back to its source evidence.

## Start gate

Do not begin analytical interpretation merely because Sprint 6 code exists.
Before Sprint 7 implementation:

- Sprint 6 must be production-tested and closed.
- Session Work Track must have real or representative classroom records.
- Existing Week 1–4 activity, attendance and Teacher Review evidence must remain
  available.
- The product owner confirms that the available evidence is representative enough
  to design useful views.

If evidence is still too sparse, collect more sessions rather than inventing
scores or weak analytics.

## Delivery principles

- Evidence first; interpretation second; AI last.
- Every summary or signal should drill down to the source evidence.
- Separate attendance, activity completion, Work Track and teacher judgment
  instead of treating them as interchangeable measures.
- Prefer descriptive change over opaque scores.
- Reuse Block, Team, Project and Student identity from authoritative records.
- AI remains advisory and teacher-controlled.
- Do not automatically generate marks, disciplinary decisions, attendance
  decisions or unsupported risk labels.
- Keep completed Sprint 1–6 workflows stable unless an integration explicitly
  requires change.

## Proposed delivery sequence

### Phase 1 — Evidence Model & Student/Team Trajectory

Create a coherent longitudinal view from the source records already collected.

Evidence sources may include:

- Session attendance
- Session Work Track
- weekly activity submissions
- Week 2 Implementation Pre-check
- teacher review / follow-up status
- peer feedback where pedagogically relevant

Teacher navigation should support:

**Block → Team → Project → Student**

The trajectory should show time/order and source type clearly, including:

- Submitted / Missing / Not required where applicable
- Work Track status and work area
- help-needed / blocked evidence
- teacher follow-up continuity
- original source evidence on drill-down

Trajectory is not a renamed completion checklist. The design should make change
over time visible while preserving the distinctions between different evidence
types.

#### Phase 1 acceptance criteria

- Teacher can open a Student or Team trajectory within the selected Block.
- Evidence is ordered and labelled by source/session/week.
- Original source records are accessible from trajectory items.
- Historical/retired activities can be represented without returning to the
  active student experience.
- Missing evidence is distinguished from Not required.
- No automatic score or risk prediction is created.

### Phase 2 — Block Teaching Analytics

Aggregate Phase 1 evidence into a practical class-level teaching view.

Candidate views:

- Session participation and Work Track completion
- work-area distribution
- Completed / In progress / Blocked work status
- teacher-help requests
- weekly activity completion
- attendance vs activity/Work Track evidence
- unresolved support requests and teacher follow-up continuity

Support Block, Team, Project and Student filters. Summary values must remain
drillable to the underlying evidence.

Analytics should answer teaching questions such as:

- Who needs attention today?
- Which Teams are repeatedly blocked?
- Is a student attending but leaving little work evidence?
- Which kinds of work dominate this stage of the project?
- Which support requests remain unresolved?

These are investigation prompts, not automatic judgments.

### Phase 3 — Enhanced Evidence Export

Provide stable, reusable evidence exports for teaching review and downstream
analysis.

- Block/Team/Project/Student-aware filters
- stable headings and explicit source/status fields
- Session attendance and Work Track fields
- weekly activity and teacher follow-up fields where appropriate
- predictable treatment of missing/not-required values
- no hidden AI-only fields required to understand the export

Prefer a small number of well-defined exports over many overlapping CSV actions.

### Phase 4 — AI-assisted Teaching Insight

Only after the deterministic trajectory and analytics views are useful, add AI
as a teacher-assistance layer.

Potential capabilities:

- weekly evidence summaries grounded in named source records
- common concern / blocker clustering
- suggested teacher follow-up or intervention
- reflection questions for the teacher
- concise Team/Student context before a review conversation

Requirements:

- distinguish student evidence, teacher evidence and AI inference
- link/cite the source records used for a conclusion
- avoid exposing unnecessary student identity in aggregated summaries
- teacher decides whether to use an AI suggestion
- AI does not write marks, attendance, disciplinary outcomes or Teacher Review
  status automatically

### Phase 5 — Production Hardening & Sprint Close

- Validate Block isolation and Student/Teacher authorisation boundaries.
- Validate trajectory and analytics counts against source records.
- Test missing, sparse and contradictory evidence cases.
- Verify export correctness and stable headings.
- Test AI traceability and failure/fallback behaviour.
- Run production build and relevant migration verification.
- Update README, AI Context, Architecture, Roadmap, Changelog and Sprint Handoff.
- Record verified Production evidence before closing Sprint 7.

## Explicitly out of scope

- automatic student grading
- opaque engagement/risk scores
- predictive disciplinary or attendance decisions
- AI changing Teacher Review records autonomously
- replacing source evidence with generated summaries
- a general business-intelligence dashboard
- adding student data-entry solely to make analytics look richer
