# Sprint 3 — Week 2 Review and Teaching Analytics

**Status: Planned — do not start while Sprint 2 remains active unless explicitly approved**

## Origin and teaching problem

This Sprint extends the original Teaching Analytics direction after classroom use
on 27 July 2026. Twelve students submitted activity data, but only one team
completed the current Team Conversation. The feature is technically working,
but its shared, long-text format creates too much effort and unclear ownership.

Teachers also need structured evidence from every student before Week 2 team
reviews, plus a place to record feedback and agreed actions during the review.

## Goal

Create a low-effort evidence flow that helps every student report progress,
helps teachers prepare for team reviews, records agreed follow-up, and produces
descriptive team-level analytics without inferring marks or performance.

The intended flow is:

1. Individual Team Health Check
2. Week 2 Individual Progress Review
3. Teacher Review and Feedback
4. Team and class Teaching Analytics

## Entry conditions

- Sprint 2 remains the active Sprint until its remaining work is completed or
  the user explicitly approves switching priorities.
- Every Sprint 3 implementation Phase starts from the latest `main`.
- Do not modify or reopen the frozen scope of an earlier completed Sprint.
- Before implementation, reconcile this plan with Sprint 2 production evidence
  and any new classroom feedback.

## Phase 1 — Team Health Check

Replace the one-response-per-team Team Conversation with a quick individual
check completed by every student.

Student questions:

- Communicated with the team this week: Yes / No
- Role clarity: Clear / Partly clear / Not clear
- Contribution balance: Fair / Mostly fair / Concern
- Team delivery status: On track / Some risk / Blocked
- Main issue: None / Communication / Technical / Scope / Time / Other
- Teacher support: No / Maybe / Yes
- Optional teacher note, maximum 200 characters

Only reveal a short explanation field when the response indicates risk,
blocking, requested support or Other. Do not require long narrative answers.

Teacher experience:

- Group responses by team.
- Show response coverage, distribution and disagreement between members.
- Preserve individual evidence for authorised teachers; do not present one
  student's response as the team's definitive view.

Acceptance:

- Each student can submit one Health Check using the established lightweight
  identity pattern.
- Most students can finish the form in under one minute without typing.
- Conditional text appears only when relevant.
- Teacher views show response count and risk signals per team.
- Existing public-read restrictions and teacher-only reads remain enforced.

## Phase 2 — Week 2 Individual Progress Review

Add a short form for every student to complete before the teacher review.

Student questions:

- Current progress: On track / Slightly behind / At risk / Blocked
- Contribution areas, multi-select: Planning or research, UI/UX, development,
  testing, documentation, presentation, team coordination
- Evidence available: Yes / Not yet
- Optional evidence link or one-sentence evidence note
- Next task clarity: Clear / Partly clear / Not clear
- Support needed: No / Maybe / Yes
- Optional discussion note, maximum 300 characters

Acceptance:

- One create-only submission per student.
- The normal path is primarily selection based and can be completed in about
  two minutes.
- Evidence and support details are required only when the selected answer needs
  clarification.
- Teacher Dashboard can filter and open responses by team and student.
- Student responses cannot overwrite Teacher Review fields.

## Phase 3 — Teacher Review and Feedback

Add a teacher-only review section attached to the Week 2 student response.

Teacher fields:

- Outcome: Good progress / Monitor / Needs attention / At risk
- Teacher feedback
- Agreed next action
- Follow-up required: Yes / No
- Follow-up date or teaching week when required
- Reviewed timestamp and reviewing teacher identity where available

Acceptance:

- Only an authenticated teacher can create or update Teacher Review data.
- Student self-report and teacher judgement remain visibly separate.
- The review can be completed during the meeting without leaving the student's
  Progress Review.
- Required follow-up appears in the Teacher Dashboard.
- RLS, grants and UI behaviour are verified for anonymous, non-teacher and
  teacher roles.

## Phase 4 — Review workflow and teaching analytics

Create descriptive views that support the review process:

- Completion rates for Team Health Check and Progress Review
- Team response coverage
- Progress and support-request distributions
- Member disagreement on team status or contribution balance
- Students awaiting review
- Follow-up queue
- Team and student filters and search

Analytics must cite the underlying submitted evidence. Disagreement is a prompt
for teacher discussion, not an automatic risk or performance judgement.

Acceptance:

- A teacher can see which students and teams are ready for review.
- Counts drill down to the evidence they summarise.
- Missing submissions are clearly distinguished from negative answers.
- No automated mark, disciplinary decision or unsupported performance label is
  produced.

## Phase 5 — Export, privacy and production validation

- Export stable, explicit columns for authorised teacher use.
- Verify validation, conditional fields, duplicate prevention and create-only
  student behaviour.
- Verify teacher feedback permissions and follow-up filtering.
- Test anonymous, authenticated non-teacher and teacher access.
- Run production build, migration verification and Vercel smoke tests.
- Update README, AI context, roadmap and Sprint handoff with verified results.

Acceptance:

- Exported data matches the active filters and remains inside the teacher
  session.
- Sensitive free text is not included in aggregate cards or charts.
- All role and RLS tests pass.
- Production behaviour matches documented behaviour.

## Data and migration direction

Expected database work may include replacing or superseding
`team_conversations`, adding individual Team Health responses, Week 2 Progress
Reviews and teacher-owned review data. Final table and relationship design must
be proposed in the relevant Phase before migration.

Every database change requires:

- an idempotent migration
- matching `supabase/schema.sql` final state
- grants and RLS policies
- privacy and security impact
- verification queries
- production order and rollback guidance

Do not silently reinterpret existing Team Conversation rows as individual
responses. Current records are test evidence and may remain until an explicit
data reset or migration decision is approved.

## Out of scope

- Student accounts or unrestricted student edits
- Automated marks, performance predictions or disciplinary decisions
- AI-generated intervention recommendations
- Multi-course administration
- Generic workflow or survey builders
- Rewriting completed Sprint 2 deliverables

## Delivery rules

- Implement one Phase per focused Draft PR.
- Do not merge without explicit approval.
- Record only verified delivery evidence in `HANDOFF.md`.
- Keep this Plan stable once Sprint 3 implementation begins; new classroom
  requirements go to a later Sprint or an explicitly approved future Phase.
