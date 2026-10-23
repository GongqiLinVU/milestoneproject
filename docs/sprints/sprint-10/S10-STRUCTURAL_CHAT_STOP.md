# Structural chat stop v0.1

Based on main afe506e (PR #88). Conversation v3 adds `target` and `effect` to the small chat schema. Existing behavioral instructions and record instructions are unchanged. Targets are work, next, support, none; no conflict target. Target meanings are schema descriptions. No topic blacklist, reply-length gate, similarity threshold or per-round record extraction.

## Runtime contract

The pure chat controller is separate from legacy decideTurn. Only chat requests use it; record and legacy modes retain their behavior. A student may request review immediately. A valid model-ready response may also end immediately. A continuing proposal needs an allowed target not previously used by a verified question. Each target has one slot; total clarification messages have two slots. Effect is diagnostic only, never semantically graded. Invalid completed output or an invalid/no target ends interviewing and starts the existing final record task. Target exhaustion ends review directly, without asking the model to choose another target.

On a validated transcript with two clarification messages, the endpoint returns review before any provider call or usage reservation. Opening is structural index zero and is excluded. Subsequent assistant messages count regardless of client purpose labels. Only messages actually appended by the UI enter the subsequent count. Retried requests do not increment an external counter or create a new displayed question. A blocked model proposal never enters the source transcript. Count limits apply to question messages, not a semantic proof that a message contains exactly one question.

Transport/auth/session eligibility failures and provider-incomplete output retain their existing retry behavior. Complete malformed chat output (including output_parse) instead returns review; accepted student text is not rolled back. A failed final record preserves pendingReview and retries only extraction. The final student confirmation remains required; automatic review is not a claim of information completeness.

## Signed target receipts and limits of trust

The endpoint signs questionMeta with HMAC-SHA256 using the existing SUPABASE_SERVICE_ROLE_KEY, an already-required server-only secret, with a dedicated protocol domain. No new environment variable is required. The payload binds authenticated user ID, session UUID, structural question index, target and the actor/text transcript prefix through that question. The browser never receives the signing secret. Receipts are timing-safe verified, preserved in live turns, and excluded from model inputs and source_conversation saving. Existing sourceConversation projection explicitly strips extra fields. Debug may retain receipts; they are not credentials.

Missing, edited, cross-user/session, replayed-to-another-prefix or invalid receipts do not authenticate a target. Those questions still count toward the global allowance. Legacy in-flight clients without receipts therefore retain the global cap but cannot use authenticated target accounting. Key rotation has the same effect.

Important: the client supplies the transcript. HMAC proves a receipt belongs to a specific prefix; it does not prove the client submitted every past turn or prevent starting again with a truncated transcript. The guarantee is bounded interviewing for the supplied validated transcript and the normal UI flow, not an anti-abuse/student-account lifetime guarantee. Preventing resets, deletion or branching across requests would require durable server-owned chat state; no database migration or in-memory pseudo-security is introduced here. Model target classification and explicit-help recognition remain semantic judgments. Incorrect target labels can pass once, but do not expand the two-slot limit in a preserved transcript.

## Review, save and diagnostics

The UI advertises at most two follow-ups / up to three replies including the opening response. Review remains available without waiting for all slots. Detailed stop reasons live in chatControl and debug; the existing SQL categories are preserved: model_ready maps to sufficient_information, invalid_chat_format to provider_failure, structural allowance/target stops to budget_exhausted. The old SQL follow_up_count/question_purposes contract counts only questions beyond its original three core directions; those fields retain that legacy formula. Actual clarification counts and used targets are in chatControl.budget, including after saved-history restoration. No SQL change is needed.

Only executed chat-runtime stops produce chat_stop_intervention level A, with proposal, counts, reason and final decision. Model-ready is an O decision. Allowance stops before a model request explicitly record providerCalled=false. The observer itself executes no actions. Clarification/continue route normalization is no longer a route override. Compressed debug retains chatControl so A events survive reload. Historical traces without chatControl remain observation_only; controlled traces advertise O and A. No student ability/honesty verdict is introduced.

## Verification

- 209 offline adaptive/API tests pass: caps, target reuse, invalid output/target, valid receipts, tampering, missing metadata, retries, zero provider calls at cap, unchanged legacy/incomplete/network/eligibility behavior and exact S7-7 proposal replay.
- Five isolated review/SQL tests pass, including debug compaction retaining controls.
- Real React + isolated PostgreSQL browser exercise (synthetic model/Auth): invalid format transitions without losing the answer; repeated target stops; two allowed clarifications then no third provider call; record failure/retry; all three student answers retained; SQL confirmation/save succeeds; saved history restores the A event and actual count. This is structural integration evidence, not model-quality evidence.
- Production build passes on Linux. No paid calls, production writes, deployment or database migration.

S7-7 is frozen as conversation and actual raw proposals in s7-7-structural-stop.json. Because v2 did not output target labels, replay explicitly tests hypothetical labels. Repeated work labels stop earlier; distinct or missing metadata can allow two questions. A third clarification cannot pass the cap in the preserved transcript. This does not establish that the second question is semantically necessary.

Run offline: `npm test` and `npm run build`.

Run the opt-in browser test after `npm run test:build`, with local PGlite, Playwright and Chromium paths via S10_PGLITE_MODULE, S10_PLAYWRIGHT_MODULE and S10_CHROMIUM_EXECUTABLE:
`node tests/session-ai/chat-stop.browser.mjs`.

No new live evaluation is needed to prove the structural bound. Future model-quality checks should cover different projects and expressions, not claim success from one repaired prefix.
