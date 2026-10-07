# S8-B3 Reliability Repair + Trace Capture + Dual-Provider Prep

Version: v1.0 · 4 October 2026 · Prepared by Claude for Joseph / ChatGPT review
Scope: offline repair, full-trace capture, DeepSeek integration prep. **No paid
model calls, no production/Harness behavioral changes, no migrations/push/merge/
deploy.** All four parts completed offline; original results preserved.

> SYNTHETIC WARNING: T1 is synthetic; results are not classroom evidence.

---

## 1. Corrected review of the latest ($0.65) trace

Re-adjudicated `out/dynamic-t1-live.json` against the **entire conversation** (C)
and the **pre-review record** (R), one answer allowed to establish multiple facts,
routed disclosure IDs NOT used as authority, review-stage additions excluded from
C, R before/after correction separate, keeping C/R/S formulas. Full per-fact
adjudication (source turns, output values, scores, reasons, semantic-uncertainty
flags): `out/dynamic-t1-live-adjudicated-v2.json`. Original trace preserved; the
first run is at `out/dynamic-t1-live.PRE-065-RUN.json`.

Key corrected findings (R failures the driver's R=100 masked):
- **S1 design/no-UI:** elicited (U1) → C=2; but `progressKind=no_progress`
  contradicts "drawing the flow" → **R=1** (contradiction). Evidence route
  (booking-flow-v1.pdf) only partial, flagged for review.
- **S3 lost integration + failed-test:** "connected the live modules" (U1) and the
  changed-slot failure (U2) were elicited (C=2 each) but the pre-review record kept
  only "cannot rerun now" in progress and `testingStatus=unknown` with no result →
  **both facts R=0** (lost). Normal-path success was never asked (C gap).
- **S4 contradictory testing/progress:** own UI change elicited (U1) but
  `progressKind=no_progress` contradicts it (R=1); the student reported an executed
  normal retest pass + an unexecuted changed-slot retest (U3), yet the record marks
  `testingStatus=not_applicable` with no result → **testing facts R=0**
  (contradiction/loss).

Focused regression checks pinning these: `scorer-regression-v2.test.mjs` (5/5),
plus a guard that a bare keyword/accepted-field must not earn R=2. The first-run
checks remain valid against the preserved backup (`scorer-regression.test.mjs`,
repointed).

## 2. Root causes and focused fixes

- **Dominant root cause — simulator, not model:** the deterministic student
  answer-bank **repeated one honest answer 4–8×** (S1 repo-path ×7; S3/S4 "cannot
  rerun" ×6/×4) because the repo-path/run-now **keyword rules fired before fact
  routing and overrode the actual (changed) question**, starving collection of
  C3/C4/C5. **Fix (B3 part 2):** fact routing now takes **priority**; honest
  answers fire only when no unrevealed fact matches AND the question is genuinely
  on-topic, and only **once** per topic (an `askHistory` set) — a repeat becomes an
  authorized repeat, so the simulator never loops. Filename/report/demo evidence
  routes are accepted without inventing URLs; combined "A or B?" questions answer
  the feasible alternatives; authorized facts are repeated on clarification; no
  future facts or gold are released. Validated: `routing-repair-v2.test.mjs` (5/5).
- **Persistence root cause — empty `claim.scope`:** S1–S3 failed to persist because
  `validate_session_intake_student_record_v11` requires `scope` (2–500 chars) and
  the review step never collected it. **Fix:** the review/correction step now fills
  **required `scope`** from the student's own authorized `confirmField.scope`
  (mirroring the real UI's scope field), with explicit before/after + authorized
  source; no gold/scoring-target fill. (Benchmark driver change only; the
  production Harness/endpoint is unchanged.)

## 3. Four-Session offline persistence / carryover evidence

`persistence-flow.test.mjs` drives controlled turn-loop candidates (scope left
empty) through review/correction → save → read-back on the isolated fixture
`t1bench01`, no provider calls:

```
S1: recordValid=true save=OK scopeCorrected=true priorHistoryBefore=0
S2: recordValid=true save=OK scopeCorrected=true priorHistoryBefore=1
S3: recordValid=true save=OK scopeCorrected=true priorHistoryBefore=2
S4: recordValid=true save=OK scopeCorrected=true priorHistoryBefore=3
persisted rows: 4/4
PASS: all four Sessions persist with scope correction; carryover chain intact
```

Every later Session saw the real persisted prior history (1→2→3), confirming
genuine saved-history carryover using only isolated local test data; no
gold/expected history was substituted. Cleaned up after; fixture roster preserved.

## 4. Complete processing-trace capture

**`rawCandidate` provenance (identified first, as required):** in
`api/session-intake-ai.ts` (line ~297/304) `rawCandidate = JSON.parse(outputText(provider))`
— it is the **parsed candidate object**, NOT the raw provider HTTP body. The
genuine raw body is `provider` (`await response.json()`) and its `output_text`,
which the endpoint consumes internally and does not currently return.

Validated with **offline mock** provider responses (`trace-capture.mock.mjs` →
`out/complete-trace-sample.mock.json`) that every required stage survives export:
provider input payload (driver-side, credentials excluded), each provider attempt
including a **retry** and an **incomplete** case, the **raw provider body** and
**original output_text**, the **parsed candidate** (correctly labeled vs raw),
each **accepted/rejected candidate with value + reason**, **record before/after**
each turn, routing decisions, incomplete details, usage, and **known-vs-unknown
cost**. No endpoint change, no paid calls, no reconstruction of the (unrecoverable)
historical responses.

**Limitation (plainly):** the production endpoint does not currently return the raw
provider body/output_text to the client. Capturing them in a *live* run would need
a **gated, trace-only** endpoint field (local/benchmark-restricted, no credential
exposure, behavior unchanged by default). That is **documented here, not applied**,
to preserve the stable comparison target per this task's constraints.

## 5. Dual-provider configuration and proposed comparison commands

Adapter: `tests/ai-session-intake/replay/provider-adapter.mjs` (benchmark-only;
normalizes both providers to the same parsed-candidate shape; shared instructions,
no provider-specific prompt tuning). Validated offline: `provider-adapter.test.mjs`
(7/7).

| Provider | API | Endpoint | Model | Output field | Configured locally |
|---|---|---|---|---|---|
| OpenAI | Responses | existing `/api/session-intake-ai` (unchanged) | `gpt-5-mini` | `output_text` | yes (server key) |
| DeepSeek | Chat Completions (OpenAI-compatible) | `https://api.deepseek.com/chat/completions` | `deepseek-flash` | `choices[0].message.content` | **no — `DEEPSEEK_API_KEY` not set** |

DeepSeek config verified 2026-10-04 from `https://api-docs.deepseek.com/`. API
differences recorded: `/chat/completions` vs `/v1/responses`; `max_tokens` vs
`max_output_tokens`; `response_format:{type:'json_object'}` vs
`text.format.json_schema`; `finish_reason:'length'` ⇒ incomplete.

Proposed comparison modes (NOT run — no approval for a dual-model experiment):
- **Fixed-conversation:** feed identical recorded conversations to both providers;
  compare parsed candidates + extraction fidelity (no simulator variance).
- **Parallel dynamic:** separate mock students and **separate isolated histories**
  per provider; carryover never shared across providers.

Proposed commands (for a FUTURE approved run; DeepSeek key via local env only):
```sh
# OpenAI (existing path, unchanged)
INTAKE_LIVE=1 INTAKE_LIVE_APPROVED=1 INTAKE_COST_CAP_USD=<approved> \
  INTAKE_PROVIDER=openai node tests/ai-session-intake/replay/run-live-t1.mjs

# DeepSeek (requires DEEPSEEK_API_KEY in local env; separate isolated mock student)
INTAKE_LIVE=1 INTAKE_LIVE_APPROVED=1 INTAKE_COST_CAP_USD=<approved> \
  INTAKE_PROVIDER=deepseek node tests/ai-session-intake/replay/run-live-t1.mjs
```
(The `INTAKE_PROVIDER` wiring into the live runner is a small future change; the
adapter and normalization are ready and tested. Not wired/launched in this task.)

## 6. Budget proposal for the later paid comparison

Independent per-provider accounting plus one overall guard. Previous single-run
approval does **not** authorize this; a new approval is required.
- **Model/pricing:** OpenAI `gpt-5-mini` ($0.25/$2.00 per 1M in/out). DeepSeek
  `deepseek-flash` — confirm current price from the DeepSeek pricing page before
  running (not asserted here).
- **Per provider, one T1 S1–S4 trajectory:** ~20 expected requests (up to ~32),
  ≤2 attempts each. OpenAI expected ≈ $0.12 actual; conservative accounting
  (incl. unreported-retry reserve) ≈ $0.38–$0.61.
- **Proposed caps:** per-provider conservative budget guard **US$0.65** each
  (matching the validated single-run guard); **overall experiment guard US$1.40**
  (two providers + margin). Each guard is conservative, not a provable hard cap.
- **Stop rule (per provider and overall):** stop before a request if the committed
  conservative reserve would exceed that provider's cap or the overall guard;
  report partial; never auto-increase.

## 7. Verified findings vs remaining limitations

Verified (offline, with evidence):
- Simulator no longer loops; fact routing beats keyword rules (5/5 tests).
- Four-Session persistence + carryover works with the scope correction (4/4).
- Every trace stage survives export under mocks (retry + incomplete included).
- Provider adapter normalizes both shapes identically (7/7).
- Full suite: 45 replay + 50 adaptive tests pass; `npm run build` exit 0.

Remaining limitations (clearly separated):
- **Historical raw responses are unrecoverable** (not reconstructed).
- **Live raw-body capture** needs a future gated endpoint field (not applied).
- **DeepSeek is offline-only** here (`DEEPSEEK_API_KEY` absent); live comparison
  blocked until the key is provided in local env.
- **Scope correction** supplies the student's authorized scope at review; whether
  that is the right teaching behavior (vs requiring the Intake to elicit scope) is a
  product question for the later Harness phase — not fixed here.
- The repeated repo-path / run-now model behavior remains a product concern logged
  for the later Harness phase; no behavioral Harness fix was made (stable target).

## 8. Frozen versions for the comparison

Recorded in `tests/ai-session-intake/replay/comparison-freeze.v1.json`:
dataset (T1 gold + B3 fields), simulator (`intake-sim.v2`), scorer
(`intake-crs-scoring.v1.1`), Harness (`adaptive-intake.v1.1.0` /
`session-intake-ai.v1.3.0` / `intake-parser.v1.0.0`, endpoint unchanged), driver
(review/scope/persistence/cost), and provider config (OpenAI Responses via the
existing endpoint; DeepSeek `deepseek-flash` Chat Completions, offline-only).

## 9. Deliverables

- This report.
- `out/dynamic-t1-live-adjudicated-v2.json` — corrected per-fact review (original
  trace preserved; first run at `out/dynamic-t1-live.PRE-065-RUN.json`).
- `out/complete-trace-sample.mock.json` — sample complete trace from offline mocks.
- `comparison-freeze.v1.json` — frozen versions.
- Benchmark-only code: repaired `run-live-t1.mjs` (simulator + scope review),
  `gold-t1.json` (scope in confirmField), `provider-adapter.mjs`, and tests
  (`scorer-regression-v2`, `routing-repair-v2`, `provider-adapter`,
  `trace-capture.mock`, four-Session `persistence-flow`).

No new metrics/formulas/trajectories; no production src/api/migration changes; no
push/merge/deploy; no paid calls. Unrelated local changes and original results
preserved. Checks run; stopping with this report.
