# S8-B3 Live-Comparison Readiness — gated trace, parity, grader, budget

Version: v1.0 · 4 October 2026 · Prepared by Claude for Joseph / ChatGPT review
Scope: complete live-comparison readiness offline. **No paid model calls, no
behavioral Harness changes, no migrations/push/merge/deploy.** Gated, trace-only
endpoint instrumentation (authorized). Existing edits and frozen artifacts
preserved.

> SYNTHETIC WARNING: T1 is synthetic. No model/Harness causation is claimed from
> simulator defects; the known defect was in the benchmark simulator (repaired
> earlier), not the model or the Harness.

## Config reload

`.env.local` reloaded; key presence verified **without printing values**:
`DEEPSEEK_API_KEY` is **present** (alongside OPENAI/Supabase keys). No paid call
was made during verification.

## 1. Gated local trace capture on the REAL execution path

The mock-only trace was insufficient, so I added **gated, trace-only** endpoint
instrumentation in `api/session-intake-ai.ts`:
- Opt-in behind `INTAKE_DEBUG_TOKEN` + header `x-intake-debug-token`; `x-intake-debug:1`
  adds a `debugTrace` to the response. **Default behavior is byte-identical** to
  production (no token ⇒ provider=openai, no trace). The Harness decision logic
  (`decideTurn`/validation/routing/record-update) is **unchanged**.
- Validated on the **real handler path** offline (`trace-capture.realpath.mjs`):
  real local Supabase auth + context resolution, with only the **provider `fetch`
  stubbed** (mock body) so **zero paid calls**. Captured, per the requirement:
  exact provider input payload (instructions + resolved context + transport),
  each attempt (incl. the retry loop), raw provider body, original output text,
  parsed candidate, validation (accept/reject) decisions, and **record before/after**.
  Sample: `out/realpath-trace-sample.mock.json`. Credential scan: 0.
- Raw trace access is restricted to the authorized local benchmark/debug flow
  (token-gated); production access is not broadened; no credentials are included
  in the trace.

## 2. Comparison parity

Both providers run the **same actual instructions, resolved context, candidate
contract, validation, routing and record-update logic** — only transport differs.

**Correction applied:** the earlier benchmark adapter called DeepSeek directly,
which would have **bypassed** the endpoint's processing chain. That is corrected:
the endpoint now has a provider switch so DeepSeek requests go through the **same**
chain (same `sharedInstructions`, same `input`, same `decideTurn`/validation/
routing). The real-path harness confirms `sameSharedInstructions=true` and
`sameParsedCandidateAccepted=true` for identical candidates.

Necessary transport differences (documented):

| | OpenAI | DeepSeek |
|---|---|---|
| API | Responses `/v1/responses` | Chat Completions `/chat/completions` |
| Output field | `output_text` | `choices[0].message.content` |
| Token param | `max_output_tokens` | `max_tokens` |
| Structured output | `text.format.json_schema` (strict) | `response_format:{type:'json_object'}` + schema in the user message |
| Incomplete signal | `status:'incomplete'` | `finish_reason:'length'` |
| Usage fields | `input_tokens`/`output_tokens` | `prompt_tokens`/`completion_tokens` (normalized by the endpoint) |

DeepSeek's `response_format:json_object` is weaker than OpenAI's strict JSON schema;
the shared `decideTurn`/validation still enforces the candidate contract, and a
non-conforming DeepSeek output falls back exactly like an OpenAI parse failure.
This is a transport limitation, documented, not a parity break in the decision
chain.

## 3. LLM-assisted grading (prepared first)

`grader-harness.mjs`, validated offline with a mock grader (`grader-harness.test.mjs`, 5/5):
- The LLM grader emits **only per-fact 0/1/2 judgments** with cited conversation +
  record evidence and an **uncertainty flag**. It does **not** compute C/R/S or
  Session-success and **does not see provider identity** (tasks are provider-blind;
  verified no `openai`/`deepseek`/model string leaks into a task).
- **Code retains** the schema checks, the C/R/S formulas and the Session-success
  decision (`computeScores`); the grader's per-fact scores are the only LLM-derived
  input. **Uncertainty blocks an automatic pass** → `needs_human_review`.
- Calibrated against the **manual adjudication** (`out/dynamic-t1-live-adjudicated-v2.json`,
  which contains **S1, S3, S4 only — no S2**; the calibration therefore covers those
  three Sessions).
  **Correction:** the earlier "100% agreement" came from a **prior deterministic
  mock that reproduced the references** (a tautology, not grader quality). The mock
  is now a keyword/field heuristic that does not read the references, so the offline
  mock mechanism test now **diverges honestly**: cAgreement 53% (8/15), rAgreement
  13% (1/8), 13 disagreements, 1 human-review flag. This validates that the pipeline
  **detects** agreement/disagreement; it is **not** live LLM calibration. A real
  DeepSeek grader will differ again and must be calibrated with a paid run before
  use. Divergence is surfaced as disagreements for human review.
- The **student simulator is NOT replaced by an LLM** (out of scope; the
  deterministic simulator remains).

## 4. Separated cost accounting (verified official pricing)

Pricing verified 2026-10-04:
- OpenAI `gpt-5-mini`: **$0.25/1M input, $2.00/1M output**.
- DeepSeek `deepseek-flash` (DeepSeek-V4.1-Flash, cache-miss, from
  api-docs.deepseek.com/quick_start/pricing): **input $0.15 off-peak / $0.30 peak;
  output $0.60 off-peak / $1.20 peak** per 1M. Figures below use **peak**
  (conservative). Historical per-call averages (from the $0.65 run): ~1,643 input
  / ~2,724 output tokens.

Costs are separated and the exact call counts stated:

| Component | Calls covered | Expected cost | Note |
|---|---|---|---|
| **Intake — OpenAI** | 1 T1 S1–S4 trajectory, ~20 requests (≤32), ≤2 attempts each | ~$0.117 (≤$0.188 at 32) | per-call retry reserve $0.0265 |
| **Intake — DeepSeek** | same, ~20 requests (≤32) | ~$0.075 (≤$0.120 at 32) | per-call retry reserve $0.0222; flash output is cheaper |
| **Grader** | 1 call/Session × 4 Sessions × 2 provider-runs = **8 grader calls**, on **deepseek-flash** (Joseph's first grader candidate) | ~$0.011 | per-fact 0/1/2; provider-blind |
| **Grader calibration** | **3 calls** (adjudication has S1, S3, S4 only — one grader call per Session), once | ~$0.004 | run before the comparison; this task prepares ONLY this calibration |
| **Retries** | reserve only, not expected spend | reserve ≤ $0.0265/call (OA), ≤$0.0222 (DS) | conservative budget guard |
| **Student simulation (later)** | deterministic — **$0 model cost** | $0 | an LLM student is future work, budgeted separately when proposed |

- **Evaluation expected total (both Intakes + grader + calibration): ≈ $0.22.**
- **Conservative accounting (known + unreported-retry reserve), 32 calls each
  provider:** OpenAI ≈ $0.61, DeepSeek ≈ $0.48.
- **Separation of evaluation vs eventual student-use costs:** all figures above are
  **evaluation** costs for this comparison. Eventual classroom student-use cost
  (real students running Intake at scale) is a **separate** budget, not included
  here and not implied by these figures.

### Proposed caps and stop rule (require NEW approval — not authorized here)
- Per-provider conservative budget guard **US$0.65** each (matches the validated
  single-run guard). Grader guard **US$0.10**. **Overall experiment guard US$1.50.**
- Each is a conservative budget guard, not a provable hard cap (token bound is an
  estimate). Stop before any request if the committed reserve would exceed that
  component's cap or the overall guard; report partial; never auto-increase.

## Proposed paid calibration/comparison commands

The paid provider-call wiring is **complete** (grader runners via `gradeWithLLM`,
Intake runner via the gated provider switch; all validated with mocked HTTP). The
**authoritative, reconciled command sequence** is in `S8-B3_RUNNER_WIRING.md` and
runs in this order, preserving one shared ledger across all stages:

1. init the shared ledger ONCE (reset only here);
2. **DeepSeek grader calibration first** (before the Intake comparison);
3. parallel Intake comparison (OpenAI + DeepSeek, separate students/histories/outputs);
4. **DeepSeek** grades both runs provider-blind.

The grader is **DeepSeek** (Joseph's first candidate), not gpt-5-mini. Nothing paid
is run here; a dual-model experiment needs a new explicit approval.

## Verified findings vs limitations

Verified offline (evidence):
- Real-path gated trace captures all required stages, both providers, no creds
  (`trace-capture.realpath.mjs`, `out/realpath-trace-sample.mock.json`).
- Parity: identical instructions/chain; identical accepted evidence from identical
  candidate.
- Grader is provider-blind, code owns C/R/S + Session-success, calibrated,
  uncertainty-flagged (5/5).
- Full suite 62 replay + 50 adaptive pass; `npm run build` exit 0; endpoint
  behavior preserved (8+50 adaptive).

Limitations (separated):
- DeepSeek structured-output is `json_object` (weaker than OpenAI strict schema);
  non-conforming output falls back like an OpenAI parse failure — documented, not a
  decision-chain parity break.
- The grader runner scripts and the `INTAKE_PROVIDER` threading into the live
  runner are now **complete and offline-validated** (not future work). The only
  unexecuted step is the paid call itself (no approval).
- DeepSeek live quality is unknown until a paid run (not authorized).
- No model/Harness causation is claimed from the earlier simulator defect.

## Frozen versions

`comparison-freeze.v1.json` updated to v2: gated endpoint instrumentation, DeepSeek
configured + pricing verified, grader harness, dataset/simulator/scorer/Harness
versions. Changing any requires a new freeze.

## Deliverables
- This report.
- Real-path mocked trace sample: `out/realpath-trace-sample.mock.json`.
- `grader-harness.mjs` (+ test), gated endpoint provider switch + trace in
  `api/session-intake-ai.ts`, `trace-capture.realpath.mjs`, updated freeze.
- Proposed paid commands + separated budget above.

No new metrics/formulas/trajectories; no behavioral Harness change (gated
trace-only); no migrations/push/merge/deploy; no paid calls. Stopping for review.
