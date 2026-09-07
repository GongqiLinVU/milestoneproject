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
- Teacher Block management exposes explicit Planned, Active and Archived
  transitions; archiving preserves all historical data and activation remains
  subject to the existing single-active-Block database constraint;
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

## Mock pilot result — 2026-09-07

The teacher completed the deterministic workflow with three mock students and
queried the persisted records directly from Supabase:

- four confirmed records exist only in `2026 · 2B2`;
- `test001` has an S1 → S2 longitudinal pair with the same responsibility,
  available evidence and executed testing; its blocker changes from active to
  resolved;
- `n2b002` preserves a broad backend claim as `expected_later` evidence with
  `planned_not_executed` testing;
- `n2b003` preserves an honest failed sensor experiment as
  `attempted_failed`, with available evidence, executed testing and an active
  blocker;
- every record reports zero Evidence Schema validation errors;
- every record uses `deterministic_fallback` and records `ai_used=false`.

This passes the Phase 2B persistence, scenario-fidelity and longitudinal-context
data gates. The raw teacher query export is not committed because it is
environment validation evidence rather than a repository fixture.

## Post-pilot migration and security recheck — 2026-09-07

The updated idempotent Phase 2A migration was re-run after the mock pilot. The
security audit confirmed all eight active security/configuration controls PASS:
RLS, RPC hardening, anon denial, authenticated read scope, direct-mutation
denial and 2B2 constraint support.

Two installation-time assertions are no longer expected to PASS after an
operational pilot:

- `Existing Sessions default Intake closed` reports FAIL because the teacher
  intentionally opened S1 through the Teacher UI;
- `No 2B2 block auto-created` reports CHECK because the teacher intentionally
  created 2026 · 2B2 through the dashboard.

These results do not indicate migration side effects or a security regression.
They record the expected post-setup state. The Phase 2B database gate is
satisfied.
