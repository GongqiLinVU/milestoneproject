# Sprint 8 Plan — AI Session Intake & Evidence Verification

**Status:** Planned  
**Source baseline:** Sprint 7 final observation of 2026 2B1  
**Product area:** NIT3004 Engineering Studio Platform

## Sprint goal

Pilot a short, adaptive AI Session Intake that replaces repetitive fixed progress
forms with a bounded evidence interview.

Each Session should produce a structured Progress Report without requiring the
student to write a long report. AI asks personalised follow-up questions,
extracts a stable evidence record and prepares targeted Teacher verification
questions. Academic judgement remains with the teacher.

## Product proposition

> AI decides how to ask; the evidence schema decides what must be captured; the
> teacher decides what is verified.

This satisfies the curriculum goal of a Report from every Session while avoiding
a system that rewards polished or AI-generated prose as proof of participation.

## Evidence model

Every completed Intake should produce structured fields:

- current responsibility
- progress claim since the previous Session
- evidence type and reference
- verification or demonstration method
- testing performed and observed result
- dependency or overlapping ownership
- blocker
- next action and due Session
- AI questions asked
- student-confirmed summary
- Teacher verification status, action and recheck state

The flexible conversation must never replace this stable output contract.

## Delivery principles

- three to five minutes for the normal student path
- three core questions, at most three adaptive follow-ups, then confirmation
- reuse authenticated Block, Team, Project, Student and previous-Session context
- do not ask students to re-enter authoritative identity or known context
- treat student text as a claim until supported or verified
- language quality, length and technical vocabulary are not evidence strength
- AI may extract, clarify, compare, summarise and suggest questions
- AI must not publish marks, determine authorship, accuse copying or confirm
  contribution
- deterministic validation controls required fields, limits, permissions,
  Session availability and persistence
- student confirms or corrects the generated summary before submission
- preserve source conversation and structured extraction for traceability
- every AI inference shown to a teacher links to the supporting source record
- use “insufficient evidence to verify,” not stronger unsupported conclusions

## Phase 1 — Evidence Contract & Conversation Design

Design before connecting a model.

Deliver:

- versioned Session Intake schema
- definition of Claim, Evidence, Owner, Verification and Teacher Action
- question policy and maximum-turn rules
- evidence types and minimum acceptable references
- previous-Session context rules
- contradiction and overlapping-responsibility flag definitions
- student confirmation and correction flow
- privacy, retention and prompt-input boundaries
- deterministic fallback when the AI provider is unavailable
- labelled test cases from the five final projects and observed student journeys

Acceptance:

- the same structured fields can be compared across Sessions and projects
- missing evidence is distinct from no work and not required
- AI output cannot write Teacher status or marks
- a student can complete a useful fallback Intake without AI
- generated questions are bounded, relevant and non-accusatory

## Phase 2 — Student AI Session Intake Pilot

Replace the active Session Work Track interaction for a controlled pilot; do not
remove historical data or all legacy forms at once.

Core questions:

1. What did you personally complete or advance since the previous Session?
2. What evidence can support that claim and how can it be verified?
3. What is your next action and is anything blocked?

Adaptive follow-ups should respond to cases such as:

- broad “backend complete” or “testing complete” statements
- claimed 100% completion without evidence
- change from a previous unresolved blocker
- repeated text with no described change
- overlapping responsibility across Team members
- model-performance claims without data, metric or baseline
- honest failure requiring diagnosis and retest evidence

Acceptance:

- normal path completes within three to five minutes
- maximum-turn rules are enforced
- previous Teacher action and responsibility are visible
- student can correct the summary before final confirmation
- the saved record distinguishes original student text, structured extraction
  and AI-generated summary
- provider failure does not block deterministic submission

## Phase 3 — Teacher Verification Queue

Do not show teachers fourteen generated essays. Provide a concise queue with:

- current claim
- evidence presence/type
- previous unresolved Teacher action
- cross-Session change
- missing or contradictory evidence flag
- up to three suggested verification questions
- Confirm / Partially verify / Evidence required
- required action and recheck Session

Acceptance:

- Teacher can move from signal to original evidence
- AI suggestions never change verification state automatically
- Teacher action becomes context for the next Student Intake
- unresolved actions remain visible until reviewed or resolved
- workload is measured against the current Teacher Review process

## Phase 4 — Session Progress Report & Longitudinal Comparison

Generate a concise Session Report from the student-confirmed structured record.
The report is an output view, not an additional writing task.

Add deterministic and AI-assisted comparison across Sessions:

- responsibility changes
- new evidence
- unresolved blockers
- repeated claims
- Teacher action response
- student completion versus Teacher verification
- Team responsibility overlaps or gaps for Teacher clarification

Do not label a student dishonest or infer non-participation from prose alone.

## Phase 5 — Final Report Evaluation Prototype

Use the five completed project cases as the first labelled evaluation set.

Prototype outputs:

- inferred project core outcome
- five rubric-dimension recommendations
- claim-to-evidence map
- executed versus planned testing distinction
- missing evidence and contradictions
- confidence and Teacher review flags
- team baseline
- individual-adjustment evidence inputs
- targeted presentation questions

The prototype must reproduce decisive reasoning, not merely final marks:

- unsupported breadth
- structured but shallow evidence
- original work with missing experiment/testing
- genuine failure, iteration and uneven contribution
- infrastructure delivered without the promised analytical outcome

It remains advisory and does not publish grades.

## Phase 6 — Validation & Evidence-Based Close

Validate:

- participation compared with fixed-form baselines
- median completion time and abandonment rate
- proportion of Intakes with usable responsibility/evidence/next action
- Teacher time per student review
- suggested-question usefulness
- AI extraction accuracy against student-confirmed summaries
- false contradiction and overlap flags
- provider failure/fallback
- Block isolation, RLS and identity privacy
- prompt injection and pasted AI-generated prose cases

Success is not “more reports.” Success is better verified evidence with less
Teacher review time.

## Deferred until pilot evidence exists

- general analytics dashboard
- automatic engagement or risk scoring
- autonomous grading
- attendance or disciplinary prediction
- replacing Poster, Peer Feedback, Session Check-in or S10 Feedback
- unrestricted chatbot conversations
- email/reminder automation
- full removal of legacy forms

## Explicit non-goals

- detect whether a student used generative AI
- judge honesty from writing style
- equate a polished report with technical quality
- replace live demonstration
- replace Teacher academic judgement
