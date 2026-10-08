# S8-B3 Grader Calibration Readiness — ONE live DeepSeek calibration, prepared and STOPPED for authorization

Version: v1.0 · 4 October 2026 · Prepared by Claude for Joseph / ChatGPT review
Scope: prepare **exactly one** live DeepSeek grader calibration over the manually
adjudicated T1 Sessions, then **stop**. **No paid call was made.** No Intake
comparison, no LLM student simulation, no prompt/label changes, no
push/merge/deploy/migration. Unrelated uncommitted edits preserved.

> SYNTHETIC WARNING: T1 is a synthetic Booking-portal trajectory. These are
> benchmark-mechanism and (when authorized) grader-calibration results, never a
> claim of classroom effectiveness. Mock agreement percentages do **not** measure
> model quality.

---

## 1. What this task did (and did not do)

Did (all offline, no paid calls):
- Confirmed the actual code matches the latest reported implementation.
- Confirmed the grader input excludes the manual reference scores/reasons and the
  Intake-provider identity.
- Added full preservation of the exact request, raw response, parsed grades,
  evidence-validation and per-fact disagreements to the calibration path.
- Re-ran the offline mock calibration, the full replay/adaptive suites and the
  build with no regression.
- Corrected the stale documentation (the false "100% agreement" wording, the stale
  replay-test counts, and the grader provider / calibration call count).

Did **not**:
- Make any paid model call (the $0.10 grader budget guard is **not yet approved**).
- Start the Intake comparison or any LLM student simulation (out of scope here).
- Change the grader prompt or the human labels to force agreement.

---

## 2. Code-vs-report verification (evidence)

| Check | Reported | Observed | Result |
|---|---|---|---|
| Replay tests | pass | `node --test …/replay/*.test.mjs` → **62 tests, 62 pass, 0 fail**, exit 0 | ✅ matches (count corrected from stale "54"/"50" → 62) |
| Adaptive tests | 50 pass | `npm run test:intake` → **50 pass, 0 fail** | ✅ |
| Build | passes | `npm run build` → **exit 0** | ✅ |
| Grader input excludes reference scores/reasons | yes | task-payload scan: `score` field absent, `c_ref`/`r_ref` absent | ✅ |
| Grader input excludes provider identity | yes | scan: no `openai` / `deepseek` / `gpt-5` strings in any task | ✅ |

The only `reference`/`adjudicat` substrings in the grader input are **benign**: the
gold anchor text `"vague reference"`, the record field name `"evidenceReference"`,
and student conversation text `"the change references"`. None are the manual
adjudication scores or reasons.

---

## 3. Correction of the "100% agreement" claim

The earlier reports stated the offline calibration showed **100% agreement**. That
number came from a **prior deterministic mock grader that reproduced the manual
references** — a tautology, not a measurement of grader quality, and never live LLM
calibration.

The mock grader is now a keyword/field heuristic that does **not** read the
references. The current offline mock mechanism test therefore **diverges honestly**
from the human labels:

```
cAgreement = 53%  (8 / 15)
rAgreement = 13%  (1 / 8)
disagreements = 13
human-review flags = 1  (T1S1-C5, grader_uncertain)
```

(`out/grader-calibration.mock.json`, `schema: intake-grader-calibration.v3`.)

This is the intended behaviour: the pipeline **detects** agreement and disagreement;
it does not manufacture agreement. These mock numbers measure the **mechanism**, not
DeepSeek. The live DeepSeek calibration will differ again and is the actual object
of this task — pending authorization.

---

## 4. Preservation guarantees (added in this task)

`gradeWithLLM` (`grader-harness.mjs`) now returns, and the calibration runner
(`run-grader-calibration.mjs`, `intake-grader-calibration.v3`) persists per Session:

- **Exact request** — `rawRequest`: URL, method, headers with the **Authorization
  bearer token REDACTED**, the parsed request body, and the verbatim rubric + user
  payload (the provider-blind tasks). No credential is ever written to disk
  (verified via a mocked fetch: no `Bearer <token>` appears in the output).
- **Raw response** — `rawResponse`: HTTP status, the parsed provider body, and the
  extracted output text.
- **Parsed grades** — `parsedGrades`: the full per-fact grades the grader returned.
- **Evidence-validation results** — `evidenceReview`: the code-owned C/R evidence
  checks (turn-range, exact-quote, record field-path/value), with
  `cEvidenceValid` / `rEvidenceValid` / `needsHumanReview` / `evidenceIssues`.
- **Per-fact disagreements** — `disagreements` plus `allComparisonRows` (every
  grader-vs-reference row), and `agreementCounts` with explicit
  **numerators and denominators** (agreed/judged) for C and R, plus the
  invalid-evidence, uncertain and human-review fact lists.

On a grade-parse failure the paid path **preserves the raw request + raw response**
(carried on the thrown error, written to `raw[sessionKey]`) and then **stops** — it
does not silently continue. The offline mock records a
`"no provider request/response"` note (there is no provider payload for a
deterministic mock).

---

## 5. Calibration scope and the S2 gap

The adjudication file `out/dynamic-t1-live-adjudicated-v2.json` contains **S1, S3,
S4 only — there is no S2**. The calibration iterates the adjudicated Sessions, so it
calibrates **three Sessions** (S1, S3, S4), one grader call each ⇒ **3 grader
calls**. Earlier docs said "4 calls (S1–S4)"; corrected to 3.

Conversation + record for calibration come from the preserved first run
`out/dynamic-t1-live.PRE-065-RUN.json` (its `candidateConfirmedOutput`; it has no
`turnLoopCandidate`, so the runner falls back to the confirmed output). The grader
is compared to the human labels **only after** it returns — the labels are never in
its input.

Preserve the earlier live runs as **independent-Session diagnostics**, not validated
longitudinal baselines; the original provider responses from those runs were not
saved and are unrecoverable. This calibration does not change that.

---

## 6. Cost (grounded estimate; nothing spent)

Grader: **DeepSeek `deepseek-flash`**, peak pricing (verified 2026-10-04):
input $0.30/1M, output $1.20/1M.

- 3 grader calls (S1, S3, S4). Estimated input ≈ 7,309 tokens total; output ≈ 2,700
  tokens total.
- **Expected known cost ≈ $0.0054.**
- **Conservative (2× input for a retry + 2,000 output tokens/call) ≈ $0.0116.**
- **Ledger reserve (6,000 in + 2,000 out per call) ≈ $0.0126** across 3 calls.
- All well under the proposed **grader budget guard $0.10** (a conservative guard,
  not a provable hard cap).

Token counts are estimates (~4 chars/token); the **actual known cost** is computed
from the provider's reported `usage` and recorded in the report and the shared
ledger. There is a separate **estimated unknown** reserve for a possibly-unreported
retry attempt. No automatic budget increase and no automatic rerun.

---

## 7. The exact command (run ONLY after Joseph authorizes)

Prereqs: `.env.local` has `DEEPSEEK_API_KEY` (present; never printed). Nothing below
is executed in this task.

```sh
# (optional) initialize the shared ledger with the grader component guard:
node -e "import('./tests/ai-session-intake/replay/budget-ledger.mjs').then(l=>l.initLedger({overallCapUsd:1.50,components:{grader:0.10},reset:true}))"

# ONE live DeepSeek grader calibration (3 calls: S1, S3, S4):
INTAKE_GRADER_APPROVED=1 INTAKE_GRADER_PROVIDER=deepseek INTAKE_USE_LEDGER=1 \
  node tests/ai-session-intake/replay/run-grader-calibration.mjs
```

Output: `out/grader-calibration.live.json` (schema `intake-grader-calibration.v3`)
with the agreement counts/denominators, all disagreements, all comparison rows, the
full parsed grades, the evidence-validation results, and the credential-free exact
request + raw response per Session, plus the actual known cost.

Offline equivalent (what was run here, no paid call): omit `INTAKE_GRADER_APPROVED`
→ the runner uses the deterministic mock grader and writes
`out/grader-calibration.mock.json`.

---

## 8. On authorization — what will be reported after the single run

Per the task's reporting contract, the single authorized run will report:
- C and R **agreement counts and denominators** (agreed/judged for C and R);
- **all disagreements** (every grader-vs-reference mismatch, per fact);
- **invalid evidence** facts (failed C/R evidence validation);
- **uncertainty** facts (grader `uncertain` → human review);
- **actual known cost** (from provider usage) and **estimated unknown cost**
  (retry reserve).

No prompt or human-label change during the run to force agreement. No automatic
budget increase. No rerun. Then stop again for Joseph / ChatGPT review.

---

## 9. STOP

The paid provider-call wiring is **complete and offline-validated**, but the paid
call is **not executed**: the $0.10 grader budget guard is **not yet approved**.
Stopping here for Joseph's authorization.

## Deliverables
- This report.
- Code: `grader-harness.mjs` (`gradeWithLLM` raw request/response + parsed grades,
  credential-redacted; preserve-on-parse-failure), `run-grader-calibration.mjs`
  (`intake-grader-calibration.v3`: counts/denominators, all comparison rows, parsed
  grades, evidence validation, raw request/response, calibrated-Sessions).
- Corrected docs: `S8-B3_RUNNER_WIRING.md`, `S8-B3_LIVE_READINESS.md`
  (100%→divergent-mock wording, 54/50→62 replay count, grader provider + 4→3
  calibration calls).
- Offline artifact (no paid call): `out/grader-calibration.mock.json`.

No paid calls, no Intake comparison, no LLM student simulation, no prompt/label
changes, no migrations/push/merge/deploy. Unrelated uncommitted edits preserved.
