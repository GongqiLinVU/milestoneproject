# S8-B3 Offline Review Report — repair the T1 benchmark tooling

Version: v1.0 · 30 September 2026 · Prepared by Claude for Joseph / ChatGPT review
Scope: offline repair + review of the T1 benchmark tooling before another live run.
Kept the T1 dataset, C/R/S metrics and 0/1/2 framework. **No benchmark expansion,
no production src/api/migration changes, no push/merge/deploy, no live run.**

Inputs used: `S8-B3_LIVE_REPORT.md`, `out/dynamic-t1-live.json`, the existing T1
gold/answer-bank/scorer/live driver, and the real UI/API confirmation/extraction/
save flow (`src/main.tsx`, `api/session-intake-ai.ts`, `save_my_session_intake_chat`).

---

## 1. Scoring review against the saved live trace

Every C/R fact was re-scored by reading the **actual conversation text and the
candidate output field**, not disclosure IDs or keyword presence. Full per-fact
adjudication (source turn, exact text, output field/value, score, justification)
is in the separate artifact `out/dynamic-t1-live-adjudicated.json`
(`intake-adjudicated-review.v1`). The turn-loop output is labelled an
**intermediate candidate, not a confirmed final submission**; its R is not
presented as final-record quality.

### Investigated cases (confirmed false positives / errors)

- **S3 — "normal booking saved" R was a false positive.** Student disclosed the
  normal pass at turn 7 ("Normal booking saved and the confirmation appeared"),
  but the retained `testingResult` holds **only** the changed-slot failure
  ("…showed the old one; that path failed"). The normal-path success is not
  represented as a passed test in the record → **R=0** for that fact (was R=2 by
  coarse presence). The changed-slot failure itself is faithfully retained (R=2).
- **S1 — progress lost the design/no-UI fact.** Student disclosed "design only …
  implemented no UI" (turn 3), but `progress="API response format undecided with
  teammate B"` and `progressKind=investigated` — the completed design work and the
  explicit "no UI" are **absent** from the record (overwritten by the blocker) →
  **R=0** for the design/no-UI fact. It was elicited, so **C=2**.
- **S4 — teammate work + no_progress ownership error.** Student said "I changed the
  UI handling and B adjusted the response" (turn 1), but `progress="B adjusted the
  response (team member)"` with `progressKind=no_progress`. The own UI change is
  missing from progress and the state contradicts a reported change → **R=0** for
  the own-work fact (own change survives only in `responsibility`, so it is a
  mis-attribution, not total loss). Elicited, so **C=2**. The S4 **correction**
  (turn 13, "NOT complete … changed-slot not rerun") is faithfully preserved →
  no lost-correction critical error.
- **S2 — "integration not attempted" is UNRESOLVED (partial).** The dedicated
  bank entry for "not attempted" was never routed by a model question; only "we
  need a joint slot to connect the modules" (turn 7) was disclosed. Whether that
  alone establishes "integration not attempted" is a **human teaching judgment** —
  marked **C=1 / R=1 partial** and flagged for adjudication, not auto-credited.

### Attribution correction (C vs R), versioned

The prior offline scorer scored a disclosed-but-unextracted fact as **C=1**. Per
the audit, C evaluates **elicitation in the conversation**; a disclosed fact
dropped from extraction is an **R failure**. Corrected and versioned as
`intake-crs-scoring.v1.1` in `run-dynamic-t1.mjs` (C = 2 if elicited, else 0; the
extraction miss lands in R). Offline re-scored under v1.1.

### Valid disclosures vs routing-released facts

Separated in the adjudicated JSON (`routingProvenanceNotes`): all S1/S3/S4 facts
and S2-C1/C2/C4/C5 were disclosed on-topic; S2-C3 was only partially established
via a different entry; the repeated "Which part do you mean?" turns leaked no
unauthorized fact but were a bank defect (fixed in §2).

### Determinism honesty

General semantic scoring is **not** claimed solved. The demonstrated false
positives are pinned by deterministic field-level checks
(`scorer-regression.test.mjs`); the S2-C3 case is explicitly retained for **human
adjudication** rather than auto-scored.

## 2. Answer-bank repair (deterministic simulator)

Repaired `studentRespond` in both `run-dynamic-t1.mjs` and `run-live-t1.mjs`, plus
per-Session `honestAnswers`/`authorizedRepeat` in `gold-t1.json`:

- Previously-disclosed facts are **repeated** on clarification/summary via
  `authorizedRepeat` (no new undisclosed fact released).
- Artifact-location / repo-path questions get an honest "not recorded" answer that
  **leaks no unrelated fact** and **never invents a path**.
- A model summary / "no further question" / ack **does not** auto-release the next
  undisclosed fact.
- Repeated questions with an authorized answer available no longer return "Which
  part do you mean?".
- "Run a test now" returns an honest "cannot run now" — **no fabricated execution
  or result**.
- Genuinely off-topic questions stay **inspectable** (`unmatched_question_no_fact`,
  `pendingAdjudication:true`), not silently rewarded.
- No future-Session facts or gold scoring targets are ever sent to the Intake.

Validated by `routing-repair.test.mjs` (6 checks, all against the actual
problematic questions from the trace). Simulator remains deterministic; no LLM
student simulator was added.

## 3. Driver submission-flow repair

Inspected the production flow (`src/main.tsx`): turn-loop → final extracted record
(`buildFallbackStudentRecord`) → **stage-4 review/correction** (`correct()` fills/
edits fields) → confirmation → `validateIntakeStudentRecord` → `submit()` →
`save_my_session_intake_chat`. The B3 live run failed persistence because it never
ran the review/correction step, so the turn-only record was schema-incomplete.

Reproduced that flow in the driver, distinguishing the four states explicitly:
**turn-loop candidate → final extracted record → student-confirmed record →
persisted submission**. The synthetic student fills **only missing required
fields**, and **only from its own authorized Session facts**
(`gold.sessions[key].confirmField`), mirroring the UI `correct()` step — no gold
scoring targets, no invented commitments/deadlines/verification/evidence. The
`due_session` uses the production UI's Session-`<select>` default and is documented
as such (`provenance: ui_default_due_session`). Missing, unauthorized facts stay
unknown/empty (recorded as a correction that left the field unknown).

Validated **offline** with controlled provider responses on the isolated fixture
(`persistence-flow.test.mjs`): review/correction filled 5 fields → record
validated → `save_my_session_intake_chat` **succeeded** → the saved S1 record is
**readable as S2's `previousRecord`** (carryover verified, not gold-substituted).

The production application flow **can** produce a valid submission (the dry save
and the offline flow both succeed with a schema-complete record). The B3 live
failure was a **benchmark driver/flow gap** (no review step), not a production
defect; no production code was changed or bypassed.

## 4. Provider-failure and cost accounting audit

From `out/dynamic-t1-live.json` (script audit):
- **28 turn entries; 26 with usage; 2 missing usage.** The 2 missing are the
  `provider_incomplete` turns in S3 and S4 (turn-level `providerFailure` count = 2;
  session-level `provider_incomplete` = 2).
- Recorded token totals (input 42,705; output 70,825) **exactly equal** the 26
  usage-bearing entries → the 2 incomplete calls contributed **$0** to the recorded
  cost. That is the accounting gap: **missing usage was treated as zero.**
- **Endpoint requests vs provider attempts / retries:** the endpoint runs **one
  in-turn retry** (`for attempt<2`) that "never consumes a question"; on a still-
  failing/incomplete response it returns the deterministic fallback. The trace
  records one turn entry per endpoint call, so internal retry attempts are **not
  individually itemised** in the client trace.
- **Incomplete reason / raw response:** the failure code is `provider_incomplete`
  (from `provider.status === "incomplete"`). The **raw provider response and its
  `incomplete_details` were not captured** in the trace, and the functions-server
  log was overwritten by a later server start (verified: `/tmp/dev-with-api-functions.log`
  now only contains startup lines). **I do not claim reasoning-token exhaustion** —
  the endpoint's code comment hypothesises it, but there is no captured evidence
  for this run.
- **Known vs unknown cost (repaired accounting):**
  - Known (26 calls): **$0.152326** (the figure the run reported as total).
  - Unknown (2 missing-usage calls): historical exact usage **unrecoverable**;
    conservative upper bound at the per-call reserve = **+$0.019** →
    honest upper bound **≈ $0.171**. Reported as known + unknown, not invented.

**Benchmark-side accounting repaired** in `run-live-t1.mjs`:
- Missing usage is charged the **conservative per-call maximum to `unknownUsd`**
  (never zero); tracked separately from `knownUsd`, with `callsWithUsage` /
  `callsMissingUsage` counts.
- A conservative maximum (`MAX_COST_PER_CALL` = 6000 in + 4000 out tokens) is
  **reserved before each request**; a call is issued only if committing that
  maximum stays within the cap, so an unobservable retry cannot blow the cap.
- **Limitation documented:** the endpoint does not expose per-retry usage or a
  pre-call token count, so the cap is guaranteed only via this conservative
  reserve, not via exact per-call metering.

No paid calls were made in this task.

## 5. Validation results (offline)

- Build: `tsc` exit 0; `npm run build` exit 0.
- `routing-adjudication.test.mjs` 4/4, `routing-repair.test.mjs` 6/6,
  `scorer-regression.test.mjs` 4/4, `dynamic-calibration.test.mjs` 3/3,
  `replay-negative-control.test.mjs` 3/3 → **20/20 replay tests pass**.
- Adaptive regression: **50/50 pass**.
- `persistence-flow.test.mjs`: **PASS** (review/correction → save → carryover on
  the isolated fixture, no provider call).
- Offline driver re-run under v1.1 + repaired routing: `C_mean=80 R_mean=94
  S=25%`, 0 critical errors. C dropped where the **offline stub** asks weak/vague
  questions — the repaired bank correctly no longer rewards a weak questioner
  (offline is runner-validation only, not model quality).

## 6. Remaining issues / product concerns (for the later Harness phase, not fixed here)

Recorded as candidates for the future Harness improvement phase, **not** production
fixes in this task:
- **Repeated repo-path requests** by the model (S1) — the model asked for a repo
  path several times; a product prompt/policy tweak may reduce this.
- **Requests to execute tests immediately** (S4 turns 6/14) — the model asked the
  student to "rerun now and paste output"; should route to a planned next action
  instead.
- **Lost progress / test outcomes** in extraction — the S1 design/no-UI, S2 mock
  qualifier, S3 normal-pass, and S4 own-change losses are extraction-fidelity gaps
  in the live model output (the reason these are false positives when scored by
  presence).
- **`provider_incomplete` on 2/4 Sessions** — cause uncaptured; a future run should
  log `incomplete_details` and raw responses to diagnose.

## 7. Readiness for a genuine longitudinal rerun

Ready **conditionally**:
- Scoring: attribution corrected (v1.1); false positives pinned by regression
  tests; unresolved S2-C3 flagged for human adjudication. ✅
- Answer-bank: honest/repeat/no-leak/no-fabrication behavior validated. ✅
- Driver: review/correction → save → carryover validated offline on the isolated
  fixture; a schema-complete record now persists. ✅
- Cost: known/unknown separation + pre-call reserve implemented; cap guaranteed
  via conservative reserve (limitation documented). ✅

Before a live longitudinal rerun (separate approval; **not** launched here): the
live run should also **capture `incomplete_details`/raw responses** so provider
incompletes are diagnosable, and the review/correction provenance should be
inspected by Joseph to confirm the `confirmField` facts are acceptable as
student-authorised (not over-filling). The single live run remains gated on that
approval.

## 8. Deliverables

- `docs/sprints/sprint-08/S8-B3_OFFLINE_REVIEW_REPORT.md` (this report).
- `tests/ai-session-intake/replay/out/dynamic-t1-live-adjudicated.json` — separate
  adjudicated review referencing the original trace (original live JSON preserved,
  unchanged except an additive `persistenceDiagnosis` block already present).
- Benchmark-only fixes: `gold-t1.json` (honestAnswers/authorizedRepeat/confirmField),
  `run-dynamic-t1.mjs` (v1.1 scoring + repaired routing), `run-live-t1.mjs`
  (repaired routing + review/correction step + repaired cost accounting).
- Focused offline tests: `scorer-regression.test.mjs`, `routing-repair.test.mjs`,
  `persistence-flow.test.mjs`.

No production src/api/migration changes; unrelated local changes and the original
`out/dynamic-t1-live.json` results preserved. Stopped after the report; no live run.

---

## 9. Final benchmark-only corrections (added, pre-rerun)

Two focused corrections completed offline. No metrics added, no production behavior
changed, no paid rerun.

### 9.1 Review-stage additions made explicit and scored separately

- Every review-stage addition/correction is now **explicit in the student trace**:
  the driver appends one `reviewStageCorrection` entry per correction to `turns`
  with `field`, `before`, `after`, and `authorizedSource` (provenance), plus a
  `reviewStageCorrections` array on the Session. Each is labelled "Added at student
  review, NOT elicited by the Intake conversation."
- **Conversational collection (C)** is scored only on Intake-elicited facts and
  **never credits** review-stage `confirmField` additions (a filled-at-review field
  stays a collection gap in C).
- **R is reported twice with the existing rubric, kept separate:**
  `recording.intakeOnly.R_percent` (Intake extraction fidelity on the turn-loop
  candidate **before** any correction) and `recording.afterCorrection.R_percent`
  (student-confirmed record **after** correction). Session success uses the
  **Intake-only** R so review-stage supplementation cannot inflate Intake success.
- Evidence: `review-separation.test.mjs` (3/3) — R=0 before / present after for a
  dropped nextAction while C is unchanged; corrections carry source+before/after;
  confirmField not credited to C. `run-live-t1.mjs` result schema now carries
  `turnLoopCandidate`, `reviewStageCorrections`, and both R figures.

### 9.2 Cost reservation corrected; historical upper-bound claim withdrawn

- **Reservation now covers every provider attempt.** The endpoint retries once
  in-turn (`for (attempt=0; attempt<2)` in `api/session-intake-ai.ts`) → **2
  attempts per endpoint call**. The reserve is `ATTEMPTS_PER_CALL(2) ×
  (MAX_IN_PER_ATTEMPT × in$ + MAX_OUT_PER_ATTEMPT × out$)`.
- **Input/output bounds verified behind the reserve:** output = endpoint
  `max_output_tokens` = 4000 (turn); input bound = request body cap
  `MAX_BODY_BYTES=64000` (≈18,286 tok at ~3.5 chars/tok) + server `instructions`
  (9,433 chars ≈ 2,696 tok) → **MAX_IN_PER_ATTEMPT = 21,000** (rounded up). Result:
  per-attempt max ≈ **$0.01325**, **per-call reserve ≈ $0.0265**.
- The chat/turn flow used here has **no separate extraction model call** (save is
  the deterministic `save_my_session_intake_chat`), so no extraction reserve is
  invented; a `questions`/`extract` model call, if ever added, must add its own
  reserve (documented in code).
- **Feasibility consequence (reported honestly):** under the $0.20 cap the
  conservative pre-call reserve permits only **⌊0.20/0.0265⌋ = 7 endpoint calls**.
  A 4-Session trajectory can need up to ~32 calls, so a fully pre-reserved
  trajectory **does not fit** in $0.20. The rerun must either raise the cap (a
  separate approval) or accept stopping at the reserve limit and reporting a
  partial run. Evidence: `cost-accounting.test.mjs` (4/4), incl. the refuse-at-cap
  check.
- **Historical unknown-cost reconciliation:** 28 endpoint calls, 26 with usage, 2
  without (the `provider_incomplete` turns). Known cost = **$0.152326** (equals the
  26 usage-bearing calls). The prior report's "+$0.019 → ≈$0.171 upper bound" used
  the **old under-sized reserve** (6000/4000, 1 attempt) and is **not supportable**;
  the raw responses/`incomplete_details` for the 2 incomplete calls were not
  captured and the functions log was overwritten, so their exact usage is
  **unrecoverable**. **The historical upper-bound claim is therefore WITHDRAWN.**
  Reported instead: known **$0.152326**; unknown = **2 calls, exact usage
  unrecoverable** (a forward-looking conservative reserve of $0.0265/call applies to
  future runs only, not as a historical total).

### 9.3 Validation summary (offline)

- Build `tsc` exit 0; `npm run build` exit 0.
- `review-separation.test.mjs` 3/3; `cost-accounting.test.mjs` 4/4.
- Full replay suite (incl. persistence-flow as a file) passes; adaptive 50/50.
- No `src/`/`api/`/`supabase/` changes; original live JSON preserved. No paid rerun.

---

## 10. Readiness check (scoring + cost) and budget recommendation

Short readiness check before one longitudinal T1 run. Code inspected; no paid
calls, no production/benchmark expansion. One minimal benchmark-only note applied
(§10.1); otherwise the implementation already satisfies the checkpoint.

### 10.1 Scoring record confirmed

Traced both the production application flow and the driver:

- **Production chat path** (`src/main.tsx`): `send()` calls `callAi("turn", …)`
  (line ~585); on review it calls `prepareReview(nextAnswers)` which builds the
  pre-edit record via `buildFallbackStudentRecord(nextAnswers, {}, …)`
  (line ~570); the student then edits via `correct()` (line ~575); `submit()`
  saves with `save_my_session_intake_chat` (line ~633). **The chat path has NO
  separate `extract` model call** — only the *form* path calls `callAi("extract")`
  (line ~430), which the benchmark does not use.
- **Therefore the record immediately before student edits IS the turn-loop
  candidate** (`buildFallbackStudentRecord` of the accumulated turn answers). There
  is no intermediate extraction step to align to in the chat path.
- **Driver alignment confirmed:** `run-live-t1.mjs` captures
  `turnLoopCandidate = { ...answers }` (line ~204) exactly before `reviewAndCorrect`
  runs, and scores **Intake-only R** and the **R component of Session success** on
  `turnLoopCandidate` (lines ~281, ~287). This matches the production pre-edit
  record. No change required.
- Preserved: C excludes review-stage additions; R before vs after correction are
  separate (`recording.intakeOnly` / `recording.afterCorrection`); corrections are
  explicit with `authorizedSource` + before/after; carryover is the actual
  persisted record (verified offline, §3). No new metric, no formula change.

### 10.2 Cost accounting confirmed and the "7 calls" statement reassessed

Endpoint (`api/session-intake-ai.ts`) facts:
- **Max provider attempts per request = 2:** `for (attempt=0; attempt<2)`
  (line ~268). It retries only when an attempt returns non-OK or throws; it
  `break`s on `response.ok`.
- **Returned `usage` reflects only the FINAL attempt:** `usage: provider.usage`
  is read from the single final `response` (lines ~304/306). A failed first
  attempt's tokens are not summed in — so **a successful request that required a
  retry under-reports the first attempt's cost.**
- **Review/save triggers NO paid call:** `save_my_session_intake_chat` is a
  deterministic RPC; the driver issues no `extract`/`questions` model call.

Reservation lifecycle (driver `run-live-t1.mjs`):
- **Before a request:** a conservative *budget guard* only — `canAffordAnotherCall()`
  checks `totalSpent() + MAX_COST_PER_CALL <= cap`. It does **not** add the reserve
  to the running total.
- **After completion:** `addUsage()` charges **actual** tokens to `knownUsd` when
  usage is present; if usage is missing it charges the per-call maximum to
  `unknownUsd`.
- **Unused reservation IS released:** the pre-check is never added to `totalSpent`,
  so a cheap call costs only its actual tokens.
- **Missing usage:** charged the conservative per-call maximum (2 attempts), never
  zero.

**Benchmark-only correction (this round): unreported retry cost is now reserved on
SUCCESSFUL requests too, not only failed ones.** Because returned `usage` reflects
only the final attempt, a silent retry's first attempt is unreported even on a
success. `addUsage()` now, for every usage-bearing call, charges actual tokens to
`knownUsd` **and** reserves one possible unreported extra attempt
(`MAX_COST_PER_ATTEMPT`) to `unknownUsd` (also surfaced as
`unreportedRetryReserveUsd`). Known usage cost and reserved unknown cost stay
**separate**. Validated by `cost-accounting.test.mjs` (4/4, incl. the
success-reserve assertion).

**Terminology correction:** the earlier phrase "hard-guaranteed cap" is replaced by
**"conservative budget guard"** throughout. The guard rests on an **estimated**
token bound (§10.3), not a provable one, so it is a conservative guard, not a
mathematical guarantee.

**Reassessment of "$0.20 permits only 7 calls":** that figure is the **worst-case
number of guaranteed starts** if every request hit its full `MAX_COST_PER_CALL`
reserve — it is **not** the expected number of calls. Because the reserve is a
released gate and historical actual cost averages **$0.00586 per usage-bearing
call** ($0.152326 / 26), expected throughput is far higher than 7; the "7"
describes the worst case, not expected behaviour.

### 10.3 21,000-token input bound — stated as an estimate, with its limitation

`MAX_IN_PER_ATTEMPT = 21,000` is derived from `MAX_BODY_BYTES=64000` and the
server `instructions` length via a ~3.5 chars/token ratio. **This is an estimate,
not a proven upper bound:** tokenization is content-dependent, so 64,000 bytes may
be more or fewer than ~18,286 tokens for a given payload. A **reliable** per-call
token bound cannot be established a priori from byte counts; it is only known
**after** a request from the provider payload's own `usage.input_tokens` (OpenAI's
tokenizer). The endpoint does not return a pre-call token estimate. **Limitation,
stated plainly:** the reserve is a *conservative engineering estimate* that has
been generous in practice (historical average input = **1,643 tokens/call**, far
below 21,000), but it is not a guaranteed ceiling; the cap is enforced by the
pre-call gate + conservative reserve, not by a proven token bound.

### 10.4 Historical cost reconciliation (unchanged conclusion, scope widened)

- Known reported usage cost = **$0.152326** (26 usage-bearing calls of 28).
- **Unreported attempt cost = unknown, and NOT restricted to the 2 failed turns.**
  Because returned `usage` reflects only the final attempt (§10.2), any of the 28
  requests that silently retried would have an unreported first-attempt cost. The
  implementation does not prove successful-request usage includes retries, so the
  unknown cost is **unbounded from the trace** and spans successful and failed
  requests alike. The earlier historical upper-bound remains **withdrawn**
  (unsupportable; raw payloads/log not retained).

### 10.5 Budget recommendation for ONE longitudinal T1 run (S1–S4)

- **Model (explicit): `gpt-5-mini`** (endpoint default `OPENAI_INTAKE_MODEL ||
  OPENAI_MODEL || "gpt-5-mini"`), pricing $0.25/1M input, $2.00/1M output.
- **Expected endpoint requests:** ~5 questions × 4 Sessions ≈ **20 requests**;
  up to the 8-question ceiling ≈ **32 requests**. **Provider attempts:** up to
  **2 per request** (retry only on failure).
- **Expected ACTUAL (known) cost:** ~20 × $0.00586 ≈ **$0.12** (assumptions:
  historical average per-call usage; most turns succeed on the first attempt;
  output below the 4,000 cap). This is the realistic spend.
- **Conservative accounting total (known + reserved unknown):** with the corrected
  model reserving one possible unreported attempt (~$0.01325) on **every** call
  plus the full per-call reserve for missing-usage calls, the conservative total is
  **≈ $0.38 for 20 calls** and **≈ $0.61 for 32 calls**. This is deliberately
  pessimistic headroom, not expected spend. Limitation: the reserve rests on an
  **estimated** token bound (§10.3), so it is a conservative guard, not a provable
  ceiling.
- **Recommended cap: US$0.65.** Rationale: the conservative budget guard stops a
  new call when `totalSpent + per-call-reserve` would exceed the cap; at the
  corrected conservative per-call figure (~$0.0191 known+reserve, plus the $0.0265
  guard margin) **$0.65 permits ~33 calls** before the guard stops — enough to
  complete the full ~20–32-call trajectory without a premature stop, while expected
  actual spend remains ≈ **$0.12**. A lower cap (e.g. $0.35) would stop the
  conservative accounting at ~17 calls and risk a mid-trajectory partial.
- **Stop rule:** before each request, if `totalSpent + MAX_COST_PER_CALL > cap`,
  **stop** and report a partial run (sessions completed, per-Session C / R-before /
  R-after, persistence, carryover, known vs reserved-unknown cost, and the guard
  state). Do **not** exclude incomplete Sessions to inflate S, and **never
  auto-increase the cap**. A completed run does not require high scores; failures
  and partials are preserved honestly.

### 10.6 Recommended command (for Joseph to approve the budget parameter)

With the local stack + T1 fixture up and the TS compiled (see
`run-replay.mjs` header), one run:

```sh
INTAKE_LIVE=1 INTAKE_LIVE_APPROVED=1 \
  INTAKE_COST_CAP_USD=0.65 \
  INTAKE_API_BASE=http://localhost:3010 \
  INTAKE_STUDENT_TOKEN='<fixture-generated bearer>' \
  INTAKE_SESSION_IDS='<S1>,<S2>,<S3>,<S4>' \
  node tests/ai-session-intake/replay/run-live-t1.mjs
```
(The driver obtains the token via `live-auth.mjs` and resolves Session IDs from
the fixture, so the explicit env vars are optional overrides.)

**One recommendation for approval: run one T1 S1–S4 longitudinal trajectory on
`gpt-5-mini` with a conservative budget guard of `INTAKE_COST_CAP_USD=0.65`**
(expected actual spend ≈ $0.12; conservative accounting ≈ $0.38–$0.61 including
reserved unknown cost for possibly-unreported retries on successful and failed
requests). The guard stops at the reserve limit and reports partial results if the
budget is insufficient. No repetitions; no auto-increase. The guard is conservative,
not a provable hard cap (estimated token bound, §10.3).

No paid calls, production changes, migrations, push, merge, or deployment were
made in this readiness check.
