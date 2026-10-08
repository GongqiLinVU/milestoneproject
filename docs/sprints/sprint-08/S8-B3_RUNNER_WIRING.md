# S8-B3 Runner Wiring Complete — provider selection, grader, ledger, isolation

Version: v1.0 · 4 October 2026 · Prepared by Claude for Joseph / ChatGPT review
Scope: complete the remaining runner wiring within existing scope. **No paid
calls, no behavioral Harness changes, no migrations/push/merge/deploy, no new
planning phase.** DeepSeek is the first grader candidate (Joseph's request).

> SYNTHETIC WARNING: T1 is synthetic. All grader results below are OFFLINE MOCK
> mechanism tests, not live LLM grades/calibration.

## What was wired

1. **Provider selection** (`run-live-t1.mjs`): `INTAKE_PROVIDER=openai|deepseek`
   sends the gated `x-intake-provider` + `x-intake-debug-token` headers so the
   endpoint routes transport while running the identical chain. Per-provider
   pricing applied (gpt-5-mini $0.25/$2.00; deepseek-flash peak $0.30/$1.20).
2. **Grader calibration runner** (`run-grader-calibration.mjs`): calibrates the
   grader against the manual T1 adjudication; offline mock mode validates the
   mechanism without paid calls; paid mode is gated behind `INTAKE_GRADER_APPROVED=1`.
3. **Grading runner** (`run-grader.mjs`): grades a provider's Intake run
   **provider-blind**, validates grader evidence, and lets **code** compute C/R/S +
   Session-success. Separate output file per graded input.
4. **Separate mock students / history / output paths**: OpenAI → `t1bench01`
   (team 4) → `out/dynamic-t1-live-openai.json`; DeepSeek → `t1bench02` (team 5) →
   `out/dynamic-t1-live-deepseek.json`. Distinct students (separate
   `student_session_intakes` histories), distinct output files, distinct ledger
   components → **parallel runs cannot share history or overwrite artifacts**.
   `t1bench02` seeded via `seed-t1-benchmark-fixture.mjs` (parameterized).
5. **Shared budget ledger** (`budget-ledger.mjs`): component caps + an overall
   guard, coordinated across **parallel processes** by an **atomic file lock**
   (reserve-before / settle-after; known vs unknown kept separate; unused reserve
   released).

## DeepSeek as the first grader candidate

The grader is **configurable** (`INTAKE_GRADER_PROVIDER`, default **deepseek**) and
**provider-blind** to the Intake: grading tasks carry conversation + record
evidence and 0/1/2 anchors with **no Intake-provider identity** (verified no
`openai`/`deepseek`/model string leaks into a task). The grader emits only per-fact
0/1/2 + cited evidence + an uncertainty flag; **code** owns the formulas and the
Session-success decision. The student simulator is **not** replaced by an LLM.

## Corrected wording

The earlier report's "100% agreement" was produced by a **prior deterministic mock
grader that reproduced the manual references** — a tautology, **not** a measure of
grader quality and **not** live LLM calibration. The mock grader is now a
keyword/field heuristic that does **not** read the references, so the offline mock
mechanism test now honestly **diverges** from the human labels:
**cAgreement = 53% (8/15), rAgreement = 13% (1/8), 13 disagreements, 1
human-review flag** (`out/grader-calibration.mock.json`,
`schema: intake-grader-calibration.v3`). This is the intended behaviour: the
pipeline **detects** agreement and disagreement; it does not manufacture
agreement. Live LLM (DeepSeek) calibration requires a paid run and will differ
again; it is not executed here.

## Offline validation (evidence)

- **Both provider selections reach the intended transport:**
  `trace-capture.realpath.mjs` drives the REAL endpoint handler with a stubbed
  provider fetch — `stagesOk=true`, `sameInstructions=true`,
  `sameAcceptedEvidence=true`; transport = `responses:/v1/responses` (openai) vs
  `chat_completions:/chat/completions` (deepseek).
- **Full raw traces survive runner export:** `run-live-t1.mjs` now captures
  `debugTrace` (provider input, attempts, raw body, output text, record
  before/after), `rawCandidate`, and `fieldDecisions` per turn (gated behind the
  debug token). Validated via the real-path harness sample
  `out/realpath-trace-sample.mock.json`.
- **Parallel runs cannot share history or overwrite artifacts:** distinct students
  (`t1bench01`/`t1bench02`), distinct output files (`-openai`/`-deepseek`), distinct
  ledger components (`intake_openai`/`intake_deepseek`).
- **Budget reservations are coordinated:** `budget-ledger.test.mjs` (4/4) — component
  cap blocks over-reservation; overall guard blocks even with component room;
  settle releases reserve + records known/unknown; parallel reservations serialized
  by the atomic lock so exactly one fits under the overall guard.
- **Grader evidence is checked; invalid/uncertain → human review:** `validateGraderEvidence`
  checks cited conversation turns are in range and that claimed retention has a
  non-empty record slice; `grader-harness.test.mjs` (5/5). The grading runner
  surfaced `needs_human_review` on a fact where collection was claimed but the
  record slice was empty.
- Full suite: **62 replay + 50 adaptive tests pass**; `npm run build` exit 0;
  endpoint behavior preserved (gated; default path unchanged).
- **Raw request/response preservation (added):** `gradeWithLLM` now returns
  `rawRequest` (URL, method, headers with the **Authorization bearer token
  REDACTED**, the parsed request body, and the exact rubric + user payload) and
  `rawResponse` (HTTP status, parsed provider body, extracted output text) plus the
  parsed `grades`. On a grade-parse failure it throws an error that **carries the
  raw request + raw response** so nothing is lost. The calibration runner
  (`intake-grader-calibration.v3`) persists, per Session: `agreementCounts` (agreed
  / judged denominators for C and R), `allComparisonRows` (every grader-vs-reference
  row), `parsedGrades` (full per-fact grades), `evidenceReview` (code-owned C/R
  evidence validation), and `raw` (the credential-free exact request + raw response;
  paid mode only — the offline mock records a "no provider request/response" note).
  Verified via a mocked fetch that **no bearer token is written** to the output.

## Updated budget (DeepSeek grader)

Verified pricing (2026-10-04): gpt-5-mini $0.25/$2.00; deepseek-flash peak
$0.30/$1.20 per 1M.

| Component | Calls | Grader provider | Expected cost |
|---|---|---|---|
| Intake — OpenAI | ~20 (≤32) | — | ~$0.117 (≤$0.188) |
| Intake — DeepSeek | ~20 (≤32) | — | ~$0.075 (≤$0.120) |
| Grader calibration | 3 (S1,S3,S4; one call/Session) | **deepseek** | ~$0.0042 |
| Grading (8 calls = 4 Sessions × 2 Intake runs) | 8 | **deepseek** | ~$0.0113 |
| Student simulation | deterministic | — | $0 |

- **Grader total (DeepSeek, 12 calls): ~$0.017** (vs ~$0.024 if graded on OpenAI).
- **Evaluation expected total (both Intakes + DeepSeek grader): ≈ $0.21.**
- **Conservative accounting (known + unreported-retry reserve), 32 calls each
  Intake:** OpenAI ≈ $0.61, DeepSeek ≈ $0.48.
- **Proposed caps (require NEW approval):** Intake per-provider budget guard
  **$0.65** each; grader guard **$0.10**; **overall guard $1.50** — all coordinated
  by the shared ledger. Each is a conservative budget guard, not a provable hard
  cap. Evaluation costs are separate from eventual classroom student-use costs.

## Executable commands

Prereqs (local, no secrets printed): stack up, both fixtures seeded, endpoint
compiled, `INTAKE_DEBUG_TOKEN` set in local env; keys in `.env.local`.

```sh
# 0. Seed the second isolated student (DeepSeek Intake history), once:
T1_STUDENT_ID=t1bench02 T1_TEAM_NUMBER=5 node scripts/seed-t1-benchmark-fixture.mjs

# 1. Initialize the shared ledger ONCE at the start of the experiment (reset ONLY
#    here; the ledger is PRESERVED across all later stages — never reset mid-run):
node -e "import('./tests/ai-session-intake/replay/budget-ledger.mjs').then(l=>l.initLedger({overallCapUsd:1.50,components:{grader:0.10,intake_openai:0.65,intake_deepseek:0.65},reset:true}))"

# 2. DeepSeek grader calibration FIRST (before the Intake comparison), ledger-charged:
INTAKE_GRADER_APPROVED=1 INTAKE_GRADER_PROVIDER=deepseek INTAKE_USE_LEDGER=1 \
  node tests/ai-session-intake/replay/run-grader-calibration.mjs

# 3. PARALLEL Intake comparison (separate students/histories/outputs; SAME ledger):
INTAKE_LIVE=1 INTAKE_LIVE_APPROVED=1 INTAKE_USE_LEDGER=1 INTAKE_CAPTURE_TRACE=1 \
  INTAKE_PROVIDER=openai   INTAKE_DEBUG_TOKEN=$INTAKE_DEBUG_TOKEN \
  node tests/ai-session-intake/replay/run-live-t1.mjs &
INTAKE_LIVE=1 INTAKE_LIVE_APPROVED=1 INTAKE_USE_LEDGER=1 INTAKE_CAPTURE_TRACE=1 \
  INTAKE_PROVIDER=deepseek INTAKE_DEBUG_TOKEN=$INTAKE_DEBUG_TOKEN \
  node tests/ai-session-intake/replay/run-live-t1.mjs &
wait

# 4. DeepSeek grades BOTH Intake runs provider-blind (SAME ledger, grader component):
INTAKE_GRADER_APPROVED=1 INTAKE_GRADER_PROVIDER=deepseek INTAKE_USE_LEDGER=1 \
  INTAKE_GRADE_INPUT=out/dynamic-t1-live-openai.json   node tests/ai-session-intake/replay/run-grader.mjs
INTAKE_GRADER_APPROVED=1 INTAKE_GRADER_PROVIDER=deepseek INTAKE_USE_LEDGER=1 \
  INTAKE_GRADE_INPUT=out/dynamic-t1-live-deepseek.json node tests/ai-session-intake/replay/run-grader.mjs
```
Offline equivalents (no paid calls, used for this validation): omit
`INTAKE_GRADER_APPROVED` (runners default to the mock grader); the Intake runners'
provider reach and trace are validated by `trace-capture.realpath.mjs`.

The paid provider-call wiring is **complete** in both grader runners (via
`gradeWithLLM`, validated with mocked HTTP) and in the Intake runner; it is simply
**not executed** here (no paid approval). The ledger is initialized once (step 1)
and preserved across the calibration, Intake and grading stages.

## Final budget breakdown (one line)

One dual-provider T1 comparison + DeepSeek grading: **expected ≈ $0.21 actual**;
**conservative ≈ $1.10** (both Intakes conservative + grader); **overall guard
$1.50** — requires a new explicit approval; never auto-increased.

## Deliverables
- This report; corrected `S8-B3_LIVE_READINESS.md` wording.
- Wiring: `run-live-t1.mjs` (provider selection, per-provider student/output,
  ledger, trace), `budget-ledger.mjs`, `run-grader-calibration.mjs`,
  `run-grader.mjs`, grader-harness grader-provider + evidence validation,
  parameterized `seed-t1-benchmark-fixture.mjs`, `live-auth.mjs` per-student.
- Tests: `budget-ledger.test.mjs` (4/4); grader-harness/provider-adapter/
  routing/scorer suites still pass (62 replay total).
- Offline artifacts: `out/grader-calibration.mock.json`,
  `out/grading-dynamic-t1-live-openai.mock.json`,
  `out/grading-dynamic-t1-live-deepseek.mock.json`,
  `out/realpath-trace-sample.mock.json`.

No paid calls, no Harness behavioral changes (gated endpoint only; default path
unchanged), no migrations/push/merge/deploy. Original results and frozen artifacts
preserved. Stopping for review.
