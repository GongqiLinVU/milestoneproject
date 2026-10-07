# Visual Harness Debug — first implementation

Status: isolated follow-up after PR #65. Read-only instrument for the current student's Intake; no database migration or teacher-field writes.

## Purpose and flow

The **Visual debug** button opens a side panel after the first turn. Select a turn to inspect its student input, raw model candidate, field decisions and source relocation, Harness route, and the final UI route. The panel displays specific rejection reasons and includes the complete Debug JSON export.

The comparison controls replay the *same recorded model candidate and input answer snapshot* through the deterministic Harness under two independently selectable policy dimensions:

- **Source-pointer policy** — `strict_pointer` in place of the deployed `repair_unique` policy in `validateCandidates()`.
- **Message-safety policy** — `legacy_v1` (the reconstructed pre-fix guardrail from commit 63b1754: a bare word blocklist plus a "message contains `?` anywhere" shape check) or `none` (no guardrail at all), in place of the deployed `current` guardrail in `decideTurn()`.

Either dimension can be varied alone, or both at once. It displays field counts and route, and — for the message-safety dimension, since that policy changes the text shown to the student rather than just field counts — the assistant message under each policy when they differ. It neither calls a model nor mutates the student record. The selected comparison exports as `intake-harness-comparison.v1` JSON with manifest, input, candidate, production decision and alternative decision (now including each side's `assistantMessage` and the selected `{sourcePolicy, messagePolicy}` pair). A change of model or prompt requires a separate live trial and cannot be inferred from this replay.

## Trace contract and limitations

New turn events store `answersSnapshot` before extraction, the full candidate returned by the endpoint, field decisions and both Harness and UI routing reasons. Earlier exports without the snapshot or candidate remain viewable, but comparison is disabled. The existing export contains student text; remove identities before sharing. Data remains in the current browser session until explicitly downloaded. The panel does not load other students' records.

This implementation compares two concrete policy dimensions (source-pointer, message-safety). More variants need named versioned manifests, isolated deterministic replay, regression cases and a safety gate before appearing in the UI. No experimental result can write a confirmed Evidence record. Validate in an authenticated Preview with a new unconfirmed 2B2 Session, including a wrong source pointer, a future API 500 action, and a provider failure. Run the pending adaptive migration and read-only security audit through the separate rollout process before testing confirmation.

**Open follow-up (not built here):** `decideTurn`'s strict server-side "established" check and `main.tsx`'s more lenient client-side `shouldReviewAcceptedAction` check can disagree about when to end an intake conversation (flagged in commit 63b1754's message). Worth a future look at whether the harness should compare that dimension too.
