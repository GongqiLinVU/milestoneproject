# Phase 2C adaptive round — 2026-09-16

## Changes

The normal experience remains chat with an on-demand evidence drawer. Each reply
uses one model call for assessment, route and source-linked typed updates. There
is no additional final extraction call: this avoids stale React conversation
state excluding the last answer and reduces unneeded model work.

The policy covers three core directions with zero to five additional questions
(maximum eight questions). It can stop early. Brief assessment describes
information, evidence/verification readiness, testing maturity, actionability,
remaining gap and a short source-linked routing reason. It is not a student
ability/motivation score or private chain-of-thought. Sparse answers may route to
small-step or Teacher-help; complex answers should be extracted before asking
for a material gap. These routing effects still need real-model evaluation.

Evidence type, testing method and observed result are separate. Testing can be
unknown. The model is instructed to preserve historical responsibility unless
changed by the student. Debug retains actual/configured model, usage when
returned, endpoint latency, policy/budget, assessment and source links. Student
text may contain identifying details; exports are not automatically de-identified.

Review provides editable fields and resets attestation after any edit. The
original extraction and the final student record are stored separately along
with field corrections and the full source transcript. A failed provider call
retries once and continues with a targeted deterministic question; its latest
answer remains in the transcript with extraction pending. At the question cap
the student moves to editable review. Teacher-help is a support
request; this round does not dispatch a notification or set a Teacher action.

## Database rollout

Apply only the new increment after the existing Phase 2A foundation:

1. `supabase/migrations/20260916_sprint8_adaptive_intake.sql`
2. `supabase/scripts/sprint8_adaptive_intake_security_audit.sql`

The new `save_my_session_intake_chat` RPC serves both AI-assisted and fallback
chat submissions. Historical v1.0 RPCs remain unchanged. The schema constraint
accepts both v1.0 and v1.1; v1.1 explicitly supports unknown testing. The new
validator delegates common rules to the existing validator. The RPC derives
identity, requires an open 2B2 S1–S9 Intake, preserves up to 17 ordered messages,
validates source references and prevents duplicate confirmation. It makes no
changes to Block status, roster or existing records, grants no direct writes,
and revokes PUBLIC/anon function execution.

Do not rerun old migrations to install this update. If the new RPC is missing,
the UI keeps the record and displays a retryable error instead of silently
switching to an older RPC and truncating the conversation.

Recovery: redeploy the previous UI/API revision to use historical RPCs. Retain
v1.1 rows and the expanded schema constraint; do not downgrade stored records.
The additive RPC can have authenticated EXECUTE revoked if rollout is paused.

## Validation and remaining gate

- 15 focused policy/record regressions: PASS.
- 4 mocked endpoint regressions: PASS (no real OpenAI calls).
- Frontend production build and separate API TypeScript check: PASS.
- Browser could not access the local harness (`ERR_BLOCKED_BY_CLIENT`); no UI
  pass is claimed.
- Migration and read-only audit have not been executed against Supabase.
- Preview authenticated submission, duplicate/isolation tests and repeated
  real-model case evaluation remain required before merge.

Candidate cases and reproducible commands:
`tests/ai-session-intake/adaptive/README.md`.
Research aggregation waits for reliable persistence and controlled case results;
this round does not claim improved learning or research novelty.
