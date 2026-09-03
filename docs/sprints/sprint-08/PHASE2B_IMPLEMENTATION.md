# Sprint 8 Phase 2B — Deterministic Intake UI

**Branch:** `sprint-08-phase2b-deterministic-intake-ui`  
**Schema:** `session-intake.v1.0.0`  
**Test suite:** `ai-intake-suite.v1.0.0`

## Teaching problem

Students should be able to produce a comparable progress record without writing
an essay or relying on an AI provider. The first interaction must prove that the
evidence contract, clarification rules and confirmation mechanism are usable.

## Behaviour

The 2B2 pilot replaces the S1–S9 Work Track entry point with Session Intake.
Every other Block keeps its existing UI and data. S10 remains Platform Feedback.

The interaction has five bounded stages:

1. responsibility and progress;
2. evidence, verification and testing;
3. next action and blocker;
4. zero to three deterministic clarifications;
5. structured review and explicit confirmation.

Clarification priority is stable: specific scope, evidence plan, testing result,
then changed blocker. Only the first three applicable rules are used. The stored
conversation therefore contains six to twelve turns.

## Persistence and authority

- load: `get_my_session_intake`;
- confirm: `save_my_session_intake_fallback`;
- Student identity, Block and Session are resolved by the database;
- the client cannot write Teacher fields or insert directly;
- confirmed submissions are read-only;
- Teacher changes only `studio_sessions.intake_access` and only sees this control
  when the selected Block code is `2B2`;
- database RLS remains the final authority.

## Privacy and AI boundary

No model endpoint, prompt, API key or provider payload exists in this Phase.
The deterministic conversation stores only the student's answers and fixed
question text. Student name, email and Auth ID are not copied into the evidence
record or conversation.

## Validation evidence

- strict TypeScript and Vite production build: PASS;
- valid deterministic record: PASS;
- normal zero-follow-up path: PASS;
- broad claim plus missing evidence selects two ordered follow-ups: PASS;
- bounded fallback conversation validation: PASS.

Preview testing with three mock students remains required before merge.
