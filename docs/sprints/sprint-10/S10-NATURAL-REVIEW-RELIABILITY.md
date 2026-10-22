# Natural review and record reliability

## Scope

Dialogue guidance (intake-dialogue.v1.5) asks useful clarification rather than negotiating demo dates, log formats or artifact locations. Intermediate acknowledgements stay short; a compact full summary belongs at review. The estimated 3–5 replies are not a quota. The LLM still chooses when to close; no minimum-round, yes/acknowledgement keyword or field-completeness route override was added.

## Record behavior

The provider nextStep contract retains a primary action plus up to three additionalActions, each separately attributed to a student turn and optional adjacent acceptance context. This keeps report work and an agreed demo together. The full snapshot replaces the previous action summary and is stored in the existing next_action string. Old candidates without additionalActions remain readable. The new array does not infer omitted actions: newly generated model output must supply them. The four review groups and existing database schema are unchanged.

Invalid context with an out-of-range or non-student source may recover through a unique directly grounded student turn. A valid student pointer that lacks grounding is not redirected to an earlier plan through this recovery, so a refusal or unrelated yes cannot be treated as renewed agreement. Contextual agreement still needs the adjacent proposal. Recovery is traced; grounding remains a heuristic, not semantic proof.

Accumulation ignores matching lines after whitespace and a terminal English sentence-period normalization. It does not lowercase, reorder, synonym-match or semantically merge claims. Reworded old-source claims remain in the record and receive claim_reemitted_from_earlier_turn observations. Prompt guidance asks for new facts only; explicit corrections still use replace and must preserve other facts. Additional-action rejection is observed as some_structured_steps_not_applied. These observations do not change conversation routing.

## Failed attempts

Retryable invalid-provider responses now include an allowlisted reason, request ID, failure stage, provider completion status and output character count. No raw provider text, credentials or arbitrary exception messages are exported. The frontend retains this metadata in debug, including compacted saved traces. Existing behavior preserves the student's draft and round count. No automatic extra model retry is added. These changes cannot recover the missing reason for the historical failed request.

## Validation boundaries

The original S7 demo/retry events, conversation and record are frozen in tests/ai-session-intake/fixtures/s7-demo-retry.json with source SHA256. Offline replay verifies pointer recovery and observations. Synthetic new-contract cases verify separately sourced multiple actions, deduplication and refusal protection; they are explicitly not historical model output. Transport tests verify bounded error diagnostics. Isolated browser checks cover failed-response draft restoration, diagnostic JSON, retry, save and history. No paid calls or production database writes are needed for these checks. Actual dialogue brevity and new-model action completeness still require a fresh live acceptance conversation.
