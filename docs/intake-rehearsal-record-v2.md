# Intake rehearsal: final record v2

The S1 and S3–S9 rehearsal exposed a record problem rather than a chat stopping problem: the extractor expanded student plans into technical prescriptions, duplicated action clauses, retained a stale role in scope, and put report progress in scope. The frozen fixture contains the supplied simulated student conversations and the actual provider outputs, unchanged. It does not represent new model calls or real classroom student data.

## Changes

- Chat schema, prompt, HMAC receipts, target budgets and two-clarification limit are unchanged.
- The once-only final record task uses `finalRecordSchema` and `intake-record.v2`. The legacy combined task retains its original schema and grounding behavior.
- Record-bound prose must be contiguous excerpts from the cited student turn. The validator normalizes Unicode composition and whitespace only. It does not rewrite or strip student words/numbers, relocate citations by token overlap, or use project topic filters.
- A short explicit acceptance may cite the immediately preceding assistant proposal. A substantive answer or refusal cannot import that proposal. The conservative acceptance vocabulary covers common English/Chinese confirmations, not every possible language or agreement phrase; unsupported forms remain in the transcript for review.
- Unsupported action text is rejected. Unsupported auxiliary text is omitted without discarding a sourced action. Executed testing still requires both a sourced method and a sourced observed result. Rejections and omissions remain in field decisions; the review displays a notice if details were omitted. If no progress was captured, the full response remains in debug and the existing record-only retry path is used. No automatic extra model call is added.
- Scope is derived from responsibility in final extraction, including an explicit scope update returned to the client. A responsibility correction in the review also updates scope. Progress about a report belongs in `claim`; the final output schema has no model-generated scope field.
- Overlapping action excerpts from the same source are consolidated; distinct actions in that source remain. Longer action excerpts are considered first. This is source-text containment, not semantic or fuzzy deduplication.
- Summary preparation has an accessible status and a visible spinner, including on narrow screens; reduced-motion disables animation. Retry/correction controls appear only after failure.
- Debug exports have `phase` (`chat`, `awaiting_reply`, `preparing_summary`, `summary_failed`, `review`, `saving`, `saved`) and `pendingStopReason`. The chat stop reason is set when summary preparation begins, rather than only after preparation succeeds.

## What is and is not established

The tests replay all eight original provider candidates without modifying them. Separate, explicitly synthetic contract-compliant candidates use excerpts from the same student messages to exercise the new projection. These tests prove source enforcement, field consistency, source containment deduplication and preservation of those supplied excerpts. They do **not** prove that a newly prompted model will reliably select all the right excerpts.

An exact excerpt is provenance, not semantic verification. The model can still misclassify a future artifact as available, select an incomplete excerpt, omit a fact, or miss that two differently worded statements mean the same thing. The extraction instructions address these issues, but student review and subsequent real outputs are still needed to evaluate quality. No topic-specific bans or semantic certainty claims have been introduced. This change does not repair already saved rehearsal records.

## Validation

- `npm test` (offline, including mocked API transport and frozen rehearsal replay).
- `npm run build`.
- Isolated PGlite focused-review/unknown-progress tests.
- Real React browser flow against isolated PGlite, with synthetic provider transport: loading at desktop and 390px, reduced motion, explicit debug phases, failure, record-only retry, confirmation, save and debug recovery from history.

No paid model calls, production database writes or migrations are required by this change. `scripts/evaluate-intake-conversation.mjs` now uses the same final record schema and validator option as production when a future live evaluation is explicitly authorized.
