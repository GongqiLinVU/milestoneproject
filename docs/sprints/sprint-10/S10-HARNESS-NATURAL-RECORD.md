# Natural dialogue and information retention — harness batch

Builds on the intervention audit in S10-HARNESS-REVIEW.md. That document describes the original PR #83 visibility-only snapshot; this batch intentionally changes behavior.

## Student-visible behavior

- Distinct progress, evidence, verification, executed testing, blocker and next-step text accumulates rather than silently replacing prior text. Exact repeated lines are deduplicated. Mixed progress kinds are conservatively represented as advanced, without declaring all work completed.
- An explicit student correction may use operation=replace. The model must include the complete corrected field summary, keeping unretracted facts. Review edits remain direct student edits. A retracted executed test can return to unknown without a fabricated observed result.
- The existing schema stores these groups as flat summaries. Multiple entries are separated by newlines, not presented as new typed claim/evidence associations. Mixed evidence types/availability become other/unknown rather than making every artifact available.
- Test method text is no longer stripped by English token comparison. Differences from the student wording are recorded as O observations. The original model candidate and student answer remain available for review; a paraphrase is not independently verified.
- Missing future-action keywords produce an uncertainty observation instead of deleting a source-grounded proposed action. Prompt instructions explicitly preserve can/try/tentative language and do not equate ability with commitment.
- Model decisions control closing; requests for Teacher help and completeness of extracted fields no longer force a stop. The agreed eight-round maximum still forces review. Safe model closing text is retained below that limit.

## Structured model changes

Parser version: intake-parser.v1.2.0. Dialogue revision: intake-dialogue.v1.2. Existing prompt/policy identifiers remain compatible with the installed SQL save contract; the manifest carries the new revisions.

Every new provider update includes operation (add/replace) and contextTurn (null or integer). Legacy updates without these properties remain accepted.

A clear brief agreement can cite the immediately preceding assistant question through contextTurn while sourceTurn still points at the student's actual reply. This is allowed only for next_action or verification_method, with a structurally valid adjacent context containing the proposed content. The acceptance inference is explicitly recorded as O; it is not independently proven by the runtime. The prompt forbids inferring acceptance from refusal or unresolved options. No new provider call is used to judge it.

## Retained boundaries and limitations

Authentication, enrolment, session availability/mode, duplicate-reporting, student confirmation, source indexes, schema, and text limits are retained. Unsupported artifact/identifier checks and source-overlap/source-repair heuristics remain active and visible; they are not a complete semantic verifier. Numeric-decoration stripping also remains a traced legacy action. These require future evidence-led review rather than wholesale removal.

Each accumulated field remains within its existing database limit. Overflow rejects that particular update with record_capacity_exceeded, keeps earlier content intact and retains the raw candidate in debug. It does not truncate text or stop dialogue. This batch does not implement unbounded record storage or guarantee every long response fits the summary; the student can edit the summary and inspect the conversation before confirming.

Provider failure still restores the draft for retry. Pricing remains observation-only. No database migration or production configuration change is required. Saved diagnostics remain bounded and can be compacted.

## Validation

- 157 adaptive/API tests: retained security, invented-artifact and malformed-result checks; updated assertions for the intentionally removed stop/strip rules; eight new behavior tests for accumulation, explicit correction/retraction, duplicate handling, capacity, help, and contextual source constraints.
- Three focused-review SQL/helper tests on isolated PGlite.
- Real React/browser and isolated SQL rehearsal: retry, desktop/mobile debug export, multiple facts retained through review and saved history, original test method retained, optional blanks accepted, debug decisions restored after reload, body scroll restored on close. Provider transport is synthetic and invokes the actual decideTurn implementation.
- TypeScript/Vite build; existing large-chunk warning only.
- Uploaded historical S5/S6 candidates replayed locally; no student trace files committed, no paid provider calls. Frozen replay verifies deterministic handling, not future live model compliance.

## Manual acceptance after the batch deploys

Use a fresh eligible Session for each scenario: completed work; partial progress with an unresolved team decision; no progress; a short acceptance of an already discussed step. Review should reflect the student's meaning, remain within five steps and permit optional omissions. Save, reopen and download debug once per scenario. Record a correction in one case to verify stale claims are removed deliberately.
