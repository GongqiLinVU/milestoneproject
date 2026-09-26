# Visual Harness Debug — first implementation

Status: isolated follow-up after PR #65. Read-only instrument for the current student's Intake; no database migration or teacher-field writes.

## Purpose and flow

The **Visual debug** button opens a side panel after the first turn. Select a turn to inspect its student input, raw model candidate, field decisions and source relocation, Harness route, and the final UI route. The panel displays specific rejection reasons and includes the complete Debug JSON export.

The comparison switch replays the *same recorded model candidate and input answer snapshot* through the deterministic Harness with `strict_pointer` in place of the deployed `repair_unique` source policy. It displays field counts and route; it neither calls a model nor mutates the student record. The selected comparison exports as `intake-harness-comparison.v1` JSON with manifest, input, candidate, production decision and alternative decision. A change of model or prompt requires a separate live trial and cannot be inferred from this replay.

## Trace contract and limitations

New turn events store `answersSnapshot` before extraction, the full candidate returned by the endpoint, field decisions and both Harness and UI routing reasons. Earlier exports without the snapshot or candidate remain viewable, but comparison is disabled. The existing export contains student text; remove identities before sharing. Data remains in the current browser session until explicitly downloaded. The panel does not load other students' records.

This first implementation compares one concrete policy difference. More variants need named versioned manifests, isolated deterministic replay, regression cases and a safety gate before appearing in the UI. No experimental result can write a confirmed Evidence record. Validate in an authenticated Preview with a new unconfirmed 2B2 Session, including a wrong source pointer, a future API 500 action, and a provider failure. Run the pending adaptive migration and read-only security audit through the separate rollout process before testing confirmation.
