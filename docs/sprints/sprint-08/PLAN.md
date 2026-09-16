# Sprint 8 Plan — AI Session Intake & Evidence Verification

**Status:** Phase 1, Phase 2A and Phase 2B complete; Phase 2C conversational pilot iteration; application-first research workstream planned
**Source baseline:** Sprint 7 final observation of 2026 2B1  
**Product area:** NIT3004 Engineering Studio Platform

## Sprint goal

Pilot a guided AI Session Intake that helps students progress while producing
a bounded evidence record. The experience combines a short conversation with a
live evidence workspace instead of exposing the Evidence Schema as the normal
student form.

Each Session should help the student state what actually happened, identify
supporting evidence, choose a realistic next step or request Teacher help.
Students with little or no progress remain first-class cases. Academic judgement
and verification remain with the Teacher.

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
- cover three core directions; the approved next policy allows zero to five adaptive
  follow-ups, normally one to three, with early stopping when sufficient
- the existing three-follow-up/six-question contract remains the implementation
  baseline until a coordinated versioned policy, validator and regression update;
  five is a ceiling, not a target, and API retries are not additional questions
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
- confirmation freezes the Session conversation and confirmed evidence as
  read-only student history
- Teacher review, comments and actions are stored separately and cannot rewrite
  the student's historical claim
- students respond to unresolved Teacher Actions through the next Session
  Intake, not by editing or replying inside history
- preserve source conversation and structured extraction for traceability
- every AI inference shown to a teacher links to the supporting source record
- use “insufficient evidence to verify,” not stronger unsupported conclusions

## Evaluation-first development gate

AI implementation must not begin from subjective impressions that a response
“looks good.” Sprint 8 uses the independent, versioned evaluation workspace at
`tests/ai-session-intake/`.

Before UI, provider or database implementation:

- approve `ai-intake-eval.v1.0.0`;
- approve the mandatory labelled case catalogue;
- create isolated test Block `NIT3004-2B2` without modifying existing Blocks;
- prepare three mock students in one mock Team;
- evaluate deterministic contract/safety, AI response quality and teaching
  utility as separate gates;
- record schema, prompt, model and test-suite versions for every candidate run.

A high AI-quality score cannot compensate for an authority, privacy, schema,
fallback or cross-Block isolation failure. Every material prompt, model,
conversation-policy or schema change must rerun the mandatory regression suite.
The test standard and cases are durable assets intended for later prompt and
scenario iteration.

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
- independent versioned AI evaluation standard and reusable test folder
- labelled test cases from the five final projects and observed student journeys

Acceptance:

- the same structured fields can be compared across Sessions and projects
- missing evidence is distinct from no work and not required
- AI output cannot write Teacher status or marks
- a student can complete a useful fallback Intake without AI
- generated questions are bounded, relevant and non-accusatory
- Gate A hard requirements and Gate B quality thresholds are approved before AI implementation

## Phase 2 — Student AI Session Intake Pilot

### Phase 2A — Mock Pilot Foundation

Build the non-AI foundation before provider integration:

- permit an isolated `NIT3004-2B2` test Block without creating or activating it automatically;
- add an opt-in, default-closed Session Intake store;
- enforce Block/Student/Session identity and RLS;
- implement the versioned TypeScript and database validators;
- implement provider-independent fallback persistence;
- add deterministic fixtures and security audit;
- preserve 2B1 and all existing Session behaviour.

The Teacher creates the planned Block, Team and three mock students only after
the migration and security audit are reviewed. Full Student UI and model calls
remain later Phase 2 work.

### Phase 2B — Deterministic Student Pilot UI

Deliver the provider-independent path before any AI call:

- expose Session Intake only to authenticated students in the isolated 2B2 pilot;
- replace the pilot's S1–S9 Work Track entry point without removing historical Work Track data;
- collect the three core questions as structured inputs;
- apply at most three deterministic clarification rules;
- show an editable review summary and explicit student attestation;
- save only through the Phase 2A fallback RPC;
- let the Teacher open, close or bind Intake to the Session schedule only in 2B2;
- keep all other Blocks and the S10 Platform Feedback journey unchanged.

Phase 2B does not call a model, create users, create a Block or add a database
migration. Its purpose is to verify the interaction, evidence contract and
fallback path with the three mock students before provider integration.

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

### Phase 2C — Guided AI Intake and Evidence Workspace

The form-first prototype has progressed to a conversational UI with a floating
current/history evidence panel and OpenAI calls in the controlled pilot. User
traces now expose extraction, routing and final-confirmation issues. Phase 2C
remains under iteration; successful dialogue alone does not establish successful
persistence or acceptance.

Candidate interaction:

- present one natural-language question at a time;
- update a separate live evidence workspace during the conversation;
- cover responsibility/change, evidence/verification and blocker/next action
  through adaptive paths rather than a fixed visible questionnaire;
- use current Session teaching focus and bounded same-student continuity;
- support evidence, clarification, small-next-step and Teacher-help routes;
- stop evidence interrogation when the student clearly reports no progress;
- allow a valid outcome with evidence, missing evidence, an accepted small
  action or a Teacher guidance request;
- retain the full structured form as provider-independent fallback;
- keep student confirmation and all existing authority/privacy boundaries.

The UI-first design sequence remains the layout baseline:

1. place one expanded Current Session at the top of the student portal;
2. move Class Activities to a collapsed bottom section;
3. group completed, catch-up and upcoming Sessions behind collapsed summaries;
4. build one full-page responsive Intake workspace reused by every Session;
5. validate navigation, scrolling and multiple-open-Session behaviour;
6. then connect the conversation routes, schema delta and evidence extraction.

The Intake record remains bound to one Session, while the UI exposes one shared
workspace and one primary Session action. Multiple Intake-access Sessions appear
as secondary catch-up options and cannot create parallel workspaces.

Detailed design:
`docs/sprints/sprint-08/PHASE2C_EXPERIENCE_DESIGN.md`.

UI architecture:
`docs/sprints/sprint-08/PHASE2C_UI_ARCHITECTURE.md`.

Implementation status and retained technical boundaries:
`docs/sprints/sprint-08/PHASE2C_IMPLEMENTATION.md`.

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

## Application-first research workstream — decision 2026-09-16

Research is a secondary workstream within the same application. Product delivery
remains the priority. We will collect reproducible observations at existing
validation gates, then decide whether they support a research contribution.
There is no separate premium implementation or publication requirement for
Sprint 8 acceptance.

Working question:

> Under a bounded interaction budget, when should the assistant ask for more
> evidence, help a student define a small next action, or defer to the Teacher?

The initial hypothesis is that routing by the remaining evidence gap and support
need can produce more useful, verifiable records with less unnecessary
questioning than fixed follow-ups. This is an untested hypothesis, not an
established novelty or learning benefit. IJCAI-27 remains an aspirational
extension; venue fit and submission scope follow the evidence.

### Next application slice

1. Stabilise confirmation and preserve the complete source conversation,
   extraction and student corrections; never truncate turns to satisfy an old
   validator.
2. Correct evidence fidelity: responsibility is distinct from progress;
   offered demonstration is not an executed test; unknown is distinct from
   not applicable; planned actions are not completed work.
3. Introduce the approved zero-to-five follow-up policy through a coordinated
   version update across prompts, client/server limits, persistence validators
   and evaluation cases. Retain three core collection directions, allow early
   stopping, and budget tokens/latency separately from question count.
4. Use a compact assessment of specificity, evidence and verification readiness,
   testing maturity, uncertainty, actionability and support need to select the
   next route. Complexity means information to organise, not student ability.
   Assess and respond within the same model call where practical.
5. For sparse answers, distinguish evidence not yet explained from evidence that
   does not exist; offer a bounded action or Teacher help when appropriate.
   For detailed answers, extract what is already supplied and target only the
   material gap. Do not infer motivation or competence from length.
6. Regression-test source fidelity, short/complex replies, no progress, honest
   failure, route changes, early stop, maximum budget and provider failure.

Record the selected route, source-linked gap and brief decision reason, not
hidden model reasoning. Teacher verification and Teacher actions remain
exclusively Teacher-controlled.

### Lightweight study and records

Begin with the existing fixed/rule-based flow as a baseline and the adaptive
policy as a candidate in the same application. When the candidate is stable,
compare against a fixed-policy LLM condition with comparable model, context and
budget so that model access is not confused with routing benefit. Freeze cases
and versions before comparison; repeat stochastic cases and retain unsuccessful
runs. More elaborate optimisation or separate assessment calls require evidence
of practical value first.

Reuse regression/debug records: case and Session identifiers, schema/prompt/
policy/test-suite versions, configured and returned model when available,
source-linked extraction and corrections, route, question count, stopping
reason, confirmation outcome, failures and measured tokens/latency. Missing
measurements must remain missing. Keep raw student traces out of public Git.

Primary application measures are claim/evidence fidelity, Teacher verification
usefulness and review time, student burden and completion, and cost/reliability.
Later, measure whether student-accepted next actions lead to new evidence in a
subsequent Session and independent Teacher verification. Longer answers, more
filled fields and student attestation alone do not establish learning or
verified achievement.

### When to aggregate results

| Trigger | Summary to produce | Decision supported |
|---|---|---|
| Confirmation and source-preservation regressions pass | Baseline failure cases and fixes, with unresolved limitations | Is the record trustworthy enough to evaluate? |
| Controlled mock suite passes after adaptive-policy update | Versioned baseline/candidate comparison, including failures, burden and cost | Does adaptation improve the application enough for a real pilot? |
| Approved classroom pilot has Teacher reviews | Verification usefulness, review time, student corrections and completion | Which routes help in classroom practice? |
| S1–S4 longitudinal records and rechecks are available | Accepted next actions versus later evidence and Teacher verification | Is there evidence of follow-through beyond a single chat? |
| Sprint close or sufficient comparable observations | Concise evidence synthesis and limitations | Continue product iteration and decide the defensible paper question |

These are event-based checkpoints, not promised research findings or a fixed
sample-size claim. Mock cases establish controlled behaviour, not educational
effectiveness. Before using real classroom records for research, obtain the
applicable institutional ethics/consent arrangements and define de-identification,
access and retention. Existing teaching records are not automatically a research
dataset. Formal study design and sample size follow the pilot feasibility data.

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
