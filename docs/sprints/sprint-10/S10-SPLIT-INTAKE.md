# Split intake: brevity first

Status: implemented and verified with synthetic transport / isolated SQL. New live model behavior is not yet validated. Do not treat mocked tests or frozen replay as proof that the new conversation is concise. Keep this change in review until live acceptance passes.

## Priority and architecture

1. Ask only useful, short questions and stop when the teacher can understand concrete work/current state and next direction or support need.
2. Preserve answers and reliably reach an editable, saveable review.
3. Produce an accurate final record using the existing four review groups.
4. Measure token use and latency; no claims of lower total cost without real measurements.

The student UI now calls `chat` per reply and `record` once at review. The legacy `turn`, `questions` and `extract` contracts remain available for existing clients and tests, and retain their auth/mode/access checks.

The chat request receives indexed conversation, session context and prior role/next action. Its output has only assistantMessage, readyForReview and a short reason. Its compact independent prompt does not contain the legacy combined extraction instructions or field/state schemas. It asks one useful clarification for generic progress; a specific remaining booking API issue plus final-report/demo direction can finish. It does not negotiate repository permissions, exact dates or demo contents, diagnose bugs or insist on identifying parameters. There is no round minimum or keyword-based automatic close. The existing eight-student-reply ceiling remains.

The record request receives the complete accepted conversation with explicit zero-based indexes, plus prior role. It extracts distinct supported facts and all stated next actions with source pointers in the existing structured record contract. It starts from a fresh answer record, not accumulated per-round paraphrases. It does not interview. The same existing student confirmation and teacher rendering remain in use. No new persisted schema or SQL migration.

The student can choose Review and confirm, including an unsent draft. An unanswered last assistant question is omitted from that finalization transcript to preserve the existing alternating source format; prior questions remain in diagnostic requests. A failed record task preserves all accepted student answers and retries only record, without a new chat call or extra round. The student may add/correct information unless the existing round limit has been reached. Chat failure restores the unsent reply. Auth, closed-session and changed-mode errors still refuse unauthorized work. The static review-transition message has no LLM badge.

Before review, the sidebar describes conversation retention and pending final extraction; it does not claim to update structured evidence live. Saved history still shows the existing evidence chain and locked record. Debug separates chat/record events, records the review trigger (student/model), observes reply lengths and retains actual incomplete_details.reason, output/reasoning token counts and task budget. It exports no reasoning text or credentials.

## Provider limits

The default gpt-5-mini split tasks explicitly request low reasoning effort. This option is sent only for that exact configured model; other configured models retain their parameters. Chat has 2500 max output tokens including reasoning; record has 6000 once at finalization. This is an implementation choice, not a guarantee against incomplete responses. No extra automatic retry or model change is added. Diagnostics distinguish a reported max_output_tokens cause from other incomplete responses.

Official references checked 22 Oct 2026:
- https://developers.openai.com/api/docs/guides/reasoning
- https://developers.openai.com/api/docs/models/gpt-5-mini

## Acceptance

`tests/ai-session-intake/fixtures/conversation-acceptance.json` contains actual S7-6 prefixes, the final attempted unknown-cause answer, and an existing detailed first answer. The expected close points are teacher-review design decisions, not outputs produced by a new model. Four historical prefixes continued beyond their annotated useful end point. Historical replay must expose those failures; it must not be described as a passing new-model evaluation.

Run without model calls:

```sh
npm run test:build
node scripts/evaluate-intake-conversation.mjs --historical
```

The new conversation must pass these same cases via actual provider output before production merge. The evaluator caps calls at eight (seven conversation cases plus one final extraction), has no model retries, uses the real small conversation prompt/schema and reports close decisions, word counts, latency and usage. Brevity acceptance allows at most 45 English words (the prompt normally aims below 35); the meaningful close point is the main criterion. It does not claim that a word-count check detects every repetitive or low-value question.

An authorized environment with its own API key can run:

```sh
npm run test:build
INTAKE_CONVERSATION_EVAL_APPROVED=1 node scripts/evaluate-intake-conversation.mjs --live
```

Set OPENAI_API_KEY securely in that environment; never paste it into chat or commit it. This execution environment has no API key, so no live calls or quality pass are claimed. The batch evaluator also checks final extraction of the known booking issue, report/demo/invite plans and absence of invented tests/percentages. These checks do not replace human assessment of all semantic accuracy. It is repeatable developer-side validation, not a request for another manual student-chat loop.

## Local verification result

185 adaptive/API tests pass and the production build passes. Isolated React + SQL browser runs cover both model-requested and student-requested finalization; record failure then record-only retry; unsent draft inclusion; saved history/debug reload; desktop/mobile layout. Actual provider calls: zero. The historical comparison is 1/5 under the new brevity/close criteria: the initial clarification passes, all four annotated late-close points fail. This is the old-model baseline, not a new-model pass.


## Review of the first live evaluation (22 Oct 2026)

The reviewer ran exactly eight calls at 361e78f; the script passed 6/8. This is a failing result: tentative parameter speculation still caused another question, and final extraction lost report/invite actions. Responses were brief and did not invent executed tests or percentages. The prose report contradicts itself on prefix-2; use its original JSON before changing that expectation.

The follow-up renames the helper to intakeReviewSupport.ts to remove extensionless case collisions with IntakeReview.tsx. A portable source-stem regression check detects the original collision even on Linux. Action provenance now excludes auxiliary expectedEvidence; explicitly unsupported artifact metadata is omitted with an observable decision transformation, while unsupported artifacts in the action itself remain rejected. Synthetic regressions cover these paths, but do not establish the cause of the two live rejected actions without their original candidate/decision data. The chat prompt also says tentative bug hypotheses should not reopen an otherwise sufficient check-in. Future evaluator reports retain raw candidates and source conversations for offline replay.

Follow-up local verification: 189 adaptive/API tests and Linux production build pass. macOS build and the original failed extraction still require verification. No additional provider calls were made; no database or production changes. Keep this PR draft until the actual failures are verified, starting with offline replay of the original JSON rather than another paid batch.


## Original JSON replay and second follow-up

The uploaded `pr88_eval_out.json` is frozen byte-for-byte at `tests/ai-session-intake/fixtures/pr88-live-eval-361e78f.json` (SHA256 `8d57b8125ad25035686976a0326e55878992fd9106c84e9ec6efb245c143cd6c`). It confirms prefix-2 passed: the only failures were prefix-5 and final-record. Contrary to the prose report, the final report action was never emitted as an action; it appears only as a progress claim. The rejected actions were invitation and debugging, not report and invitation.

The invitation cited student turn 7 (`yes`) without contextTurn 6. Broad token matching saw both the generic code statement at turn 1 and the substantive invitation at turn 5. Action source repair now resolves competing matches only when one student turn has at least two action tokens exclusive to that turn among matches. Shared words cannot select a turn; competing distinctive sources remain rejected. The decision records `source_relocated_using_distinct_action_anchors`. This is lexical source location, not semantic verification, and has no effect on close decisions. Proper extraction can instead cite turn 5 directly or turn 7 with contextTurn 6. Artifact and identifier guards remain active.

Record instructions now explicitly separate mixed unfinished-work/next-direction clauses, retain current directions even without `will`, preserve all actions, and require acceptance context for brief confirmations. Planned demos are not testing unless the student describes a test. These are extraction instructions, not deterministic rules to synthesize missing facts.

Offline validation: 194 adaptive/API tests and Linux production build pass. Exact original candidate replay now preserves invite and demo; reportPlan remains false, deliberately, because the model omitted it. A separately labelled gold-input test proves three correctly sourced actions survive the full review contract. Neither is a revised-model pass. No paid calls or database changes. PR stays draft pending actual revised extraction and prefix-5 validation, plus macOS build verification.

```sh
npm run test:build
node scripts/replay-intake-evaluation.mjs tests/ai-session-intake/fixtures/pr88-live-eval-361e78f.json
```

This makes zero provider calls and exits 1 while the original report action is absent. It does not rerun the model. Future reports use their embedded conversation; only the exact known original report may use the frozen fallback transcript.
