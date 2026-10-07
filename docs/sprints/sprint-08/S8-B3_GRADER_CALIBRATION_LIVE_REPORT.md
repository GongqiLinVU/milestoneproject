# S8-B3 Live DeepSeek Grader Calibration — three-Session PARTIAL (stopped on S1)

Version: v1.0 · 4 October 2026 · Prepared by Claude for Joseph / ChatGPT review
Authorization: ONE live DeepSeek calibration over the adjudicated T1 Sessions S1,
S3, S4; isolated **US$0.10** guard (incl. retries and estimated unreported
attempts). Retries disabled. **No rerun** after failure. No Intake comparison, no
LLM student simulation, no push/merge/deploy/migration. Unrelated local changes
preserved.

> SYNTHETIC WARNING: T1 is a synthetic Booking-portal trajectory. This is a
> grader-mechanism/calibration result, never a claim of classroom effectiveness.

## Outcome in one line

The single authorized run was issued and **failed on the first Session (S1)** with a
provider-configuration blocker: **`deepseek-flash` is a reasoning model that spent
the entire 2,000-token output budget on reasoning and returned empty content**
(`finish_reason: "length"`), so there was **no JSON grade to parse**. The run
**stopped** (retries disabled, no rerun). **No live C/R agreement could be
computed.** This is a **three-Session partial calibration attempt that completed 0
of 3 Sessions**; S2 is absent and this run does **not** validate four-Session
longitudinal carryover.

## 1. Actual provider / model and Sessions completed

| | Value |
|---|---|
| Grader provider / model | **DeepSeek `deepseek-flash`** (real `/chat/completions` call, HTTP 200) |
| Sessions targeted | **S1, S3, S4** (adjudication has no S2) |
| Sessions attempted | **S1 only** |
| Sessions completed (parsed grade) | **0** |
| Run status | `partial_failed` (stopped on S1; no rerun) |

## 2. C / R exact agreement counts and denominators

No live grade parsed, so there is nothing to compare against the human references.

| Metric | Agreed | Judged (denominator) | Agreement |
|---|---|---|---|
| C | 0 | **0** | N/A |
| R | 0 | **0** | N/A |

No disagreement rows exist (no grader scores were produced). Do **not** read any
agreement number from the offline mock (`grader-calibration.mock.json`,
cAgreement 53% / rAgreement 13%): that is a deterministic **mechanism** test and
does **not** measure DeepSeek.

## 3. Every disagreement with evidence and human rationale

None — there are **zero** grader-vs-reference rows, because the grader produced no
parseable scores. The manual references (unchanged, authoritative) remain:
S1 `C1=2,C2=2,C3=0,C4=1,C5=0`; `R_pre` `C1=2,C2=1,C4=1`. They were **not** sent to
the grader and were **not** altered.

## 4. Invalid evidence, uncertainty, human-review flags

- Invalid evidence: none produced (no grades).
- Uncertainty flags: none produced.
- Human-review flags: the **entire S1 call** requires human review — a billable
  provider response with empty content and `finish_reason: "length"`. Under the
  standard, "invalid evidence or uncertainty requires human review", and an API
  failure in a valid task without a final record is **not** a success.

## 5. R record-stage provenance and before/after availability

- **R stage that would have been used:** the pre-review record
  (`turnLoopCandidate`). The calibration source `out/dynamic-t1-live.PRE-065-RUN.json`
  has **no `turnLoopCandidate`**, so the runner falls back to
  `candidateConfirmedOutput` — i.e. the **post-confirmation** record. This stage
  label matters and is recorded explicitly.
- **R before vs after correction:** **not available** for this run. No live grade
  was produced, and the preserved source does not carry a separate pre-review slice
  for these Sessions, so a before/after-correction R comparison **cannot** be made
  here and is marked unavailable. No records or labels were reconstructed.

## 6. Cost — known vs unknown, recorded as GRADER EVALUATION cost

Recorded as **grader evaluation** cost, separate from Intake, future
student-simulator, and classroom student-use costs. Isolated ledger
`out/ledger/calibration-ledger.json` (US$0.10 guard, this calibration only). The
US$1.50 experiment ledger was **not** initialized.

| Item | Value |
|---|---|
| Requests issued | **1** |
| Attempts | **1** (retries disabled; none issued) |
| **Actual known cost** | **US$0.003166** (2,554 input × \$0.30/1M + 2,000 output × \$1.20/1M, peak) |
| **Estimated unknown cost** | **US$0** (no retry; the single attempt's cost is fully known from provider usage) |
| Budget guard | US$0.10 (this calibration only) — **not breached** (used ~3.2%) |

The failed attempt **was billable**: the output tokens were reasoning tokens, which
DeepSeek charges, even though `content` was empty. The ledger was corrected from an
initial `knownUsd=0 / unknownUsd=0.0042` to the **actual** `knownUsd=0.003166 /
unknownUsd=0`.

## 7. The concrete execution blocker (root cause)

`deepseek-flash` emits a `reasoning_content` stream and only then the final
`content`. With `max_tokens: 2000`, the response hit the cap **inside reasoning**
(`completion_tokens: 2000`, all `reasoning_tokens`), leaving `content: ""` and
`finish_reason: "length"`. The grader harness correctly rejected the empty output
as `grader_output_parse` rather than inventing a grade.

This is a **transport/config** issue, not a prompt, routing, gold-anchor, or
human-label issue — none of which were changed. Resolving it requires a config
change (a much larger output-token budget to fit reasoning + the JSON answer, or a
non-reasoning grader model/endpoint), which is a **new** decision and a **new**
paid attempt — **not authorized**. No rerun was performed.

## 8. What was preserved (deliverable #1)

`out/grader-calibration.live.json` (`status: partial_failed`) preserves, for the S1
attempt: the **credential-redacted exact request** (URL, method, headers with the
bearer token redacted, body; the full verbatim task payload is in the run error log
and omitted from the artifact only for length — it was confirmed to contain **no**
reference scores/reasons and **no** Intake-provider identity), the **raw response**
(status 200, empty content, `finish_reason: length`, usage 2,554/2,000 with 2,000
reasoning tokens), the **actual known cost**, and the **failure marker**. Parsed
grades, evidence-validation and comparison rows are empty because none were
produced. A credential scan of the artifact and ledger found nothing.

## 9. Code corrections made during this run (no extra paid call)

A real defect surfaced: the runner **crashed** instead of writing the partial
artifact, and charged the billable failed attempt as \$0. Fixed:
- `grader-harness.mjs`: the thrown `grader_output_parse` error now also carries the
  attempt's `usage` and `knownUsd`.
- `run-grader-calibration.mjs`: on failure it now **settles the ledger with the
  actual known cost**, records the failed attempt (raw request/response + usage),
  sets `status: partial_failed` + a `failure` marker, **breaks** (fail-stop), still
  **writes the partial `grader-calibration.live.json`**, and exits non-zero.
- `budget-ledger.mjs`: added an opt-in `INTAKE_LEDGER_FILE` so this calibration used
  an **isolated** ledger without resetting/overwriting or initializing the US$1.50
  experiment ledger.

The partial `grader-calibration.live.json` for the attempt that already occurred was
reconstructed from the preserved raw response — **no new paid call was made** to
produce it. Verified after the fixes: grader-live.test 8/8, replay 62/62 pass.

## 10. Status and stop

Three-Session partial calibration, **0/3 completed**, stopped on S1 by a provider
reasoning-model/token-budget blocker. Actual known grader-evaluation cost
**US$0.003166**; estimated unknown **US$0**. **S2 is absent; this run does not
validate four-Session longitudinal carryover.** No rerun, no additional paid
experiment, no Intake comparison, no student simulation. Stopping after reporting
for Joseph / ChatGPT review.

## Deliverables
1. `out/grader-calibration.live.json` — partial result (S1 attempt, fail markers,
   credential-free raw request/response, actual cost).
2. This report.

Isolated ledger: `out/ledger/calibration-ledger.json` (known US$0.003166; US$1.50
experiment ledger not created). Unrelated local changes preserved.
