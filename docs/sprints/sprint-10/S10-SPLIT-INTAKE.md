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

The new conversation must pass these same cases via actual provider output before production merge. The evaluator caps calls at seven, has no model retries, uses the real small conversation prompt/schema and reports close decisions, word counts, latency and usage. Brevity acceptance allows at most 45 English words (the prompt normally aims below 35); the meaningful close point is the main criterion. It does not claim that a word-count check detects every repetitive or low-value question.

An authorized environment with its own API key can run:

```sh
npm run test:build
INTAKE_CONVERSATION_EVAL_APPROVED=1 node scripts/evaluate-intake-conversation.mjs --live
```

Set OPENAI_API_KEY securely in that environment; never paste it into chat or commit it. This execution environment has no API key, so no live calls or quality pass are claimed. The seven-case evaluator is repeatable developer-side validation, not a request for another manual student-chat loop.

## Local verification result

185 adaptive/API tests pass and the production build passes. Isolated React + SQL browser runs cover both model-requested and student-requested finalization; record failure then record-only retry; unsent draft inclusion; saved history/debug reload; desktop/mobile layout. Actual provider calls: zero. The historical comparison is 1/5 under the new brevity/close criteria: the initial clarification passes, all four annotated late-close points fail. This is the old-model baseline, not a new-model pass.
