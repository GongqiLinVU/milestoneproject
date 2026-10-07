# S8-B3 Raw-Response Availability Check — US$0.65 T1 run

Version: v1.0 · 4 October 2026 · Prepared by Claude for Joseph review
Scope: forensic check only — did the raw provider responses from the latest
US$0.65 T1 run survive locally? No new model calls, no reconstruction, no code
changes.

---

## Verdict

**No raw provider responses were saved locally.** Only *derived* trace data
survives. This is a **benchmark-driver capture gap plus endpoint `store:false` and
failure-only logging** — there is **no evidence** of loss inside the model or the
Harness decision logic.

## Where I checked (and what each held)

| Location | Result |
|---|---|
| `tests/ai-session-intake/replay/out/dynamic-t1-live.json` (run trace) | Derived fields only. Per-turn entries store `questionAsked`, `route`, `acceptedFields`, `rejected` *reasons*, `usage`, `providerFailure` — **no** `rawCandidate`, **no** raw provider HTTP body. (Verified: no raw/choices/output_text keys anywhere.) |
| `out/dynamic-t1-live.PRE-065-RUN.json` (prior run backup) | Same shape; no raw fields. |
| `run-live-t1.mjs` (driver) | Line 178 reads `json.rawCandidate` to re-run `decideTurn`, but the `turns.push` (lines 181–185) **does not persist `rawCandidate`**. The parsed candidate existed transiently and was discarded. `turn_results: []` was sent to the save RPC (line 253), so even the one persisted S4 record held no raw candidate. |
| `/tmp/dev-api-065.log` (this run's server log) | 18 lines, **startup/shutdown only** — 0 provider/usage/raw lines. |
| `/tmp/dev-with-api-functions.log` | Startup lines only. |
| `api/session-intake-ai.ts` | Sets **`store: false`** on the OpenAI call (not retrievable provider-side). Only `console.error`s on provider **failure** (line 281). This run had `callsMissingUsage=0` and no failures, so nothing was logged. |
| DB `student_session_intakes.ai_assistance` | Driver sent `turn_results: []`; the single S4 row (since cleaned) carried no raw candidate. |
| Debug export files (`session-intake-debug*.json`, harness traces) | None on disk for this run (only unrelated git refs match `*debug*`). |

## What survives — captured vs derived (clearly distinguished)

Exported to `tests/ai-session-intake/replay/out/dynamic-t1-live-raw-recovery.json`
(`intake-raw-recovery.v1`) for S1, S3, S4. For each:

- **CAPTURED (original run data):** the exact input conversation (every system
  question + student answer), the run-level resolved context
  (student `t1bench01`, block 2B2, team 4, project "Booking portal", the four
  Session UUIDs), routing ambiguities, and the explicit review-stage corrections
  (field/before/after/authorizedSource).
- **DERIVED (computed by the driver/`decideTurn`, NOT the raw response):** the
  accepted-field list, the rejected *reasons*, the `turnLoopCandidate`
  (pre-correction extraction), and the resulting `candidateConfirmedOutput` record.
- **MISSING (explicitly):** (2) the raw provider response and its original
  candidate values, and (3) the parsed candidate with full accepted/rejected
  candidate objects. (1) input/context and (4) resulting record are present but (4)
  is derived, not raw.

The three requested examples are present at the **captured conversation + derived
record** level only:
- **S1:** design/no-UI disclosure ("I own the booking UI … drawing the flow; no UI
  is built yet") and the subsequent repo-path questioning — the model asked for the
  repo path and the student returned the honest "not recorded" answer **7 times**
  (`repo_path_honest_no_leak`). Raw provider output for these turns: missing.
- **S3:** "We connected the live modules and attempted the real flow" and
  "after selecting another slot, the confirmation showed the old one. That path
  failed." Raw provider output: missing.
- **S4:** "Normal booking saved correctly on rerun" and the changed-slot retest
  recorded as not executed. Raw provider output: missing.

## Why this is a capture gap, not a model/Harness loss (evidence)

- The endpoint **returned** `rawCandidate` in its 200 response (visible in
  `api/session-intake-ai.ts` turn response) — the model produced parseable output;
  all 31 calls had usage and none failed. So the data existed at response time.
- The **benchmark driver chose not to persist** `rawCandidate`/raw body — the
  `turns.push` object omits them. That is the single, located cause.
- `store: false` on the provider call and failure-only `console.error` logging mean
  neither the provider nor the server log retained a copy.
- No Harness decision was lost: the derived accepted/rejected results are retained;
  only the *pre-decision raw candidate* was never written.

## Deliverables and limits

- `tests/ai-session-intake/replay/out/dynamic-t1-live-raw-recovery.json` — recovered
  (derived) trace for S1/S3/S4, labeled captured vs derived, missing stages marked.
  Credential scan: 0 credential-like strings (the trace never stored tokens; only
  the service-role key would be sensitive and it is not in any artifact).
- No code change was made. Capturing raw responses for a future run would require a
  one-line driver change (persist `json.rawCandidate` and optionally a raw-body
  field) — noted for the next phase, **not** applied here.

No new model calls, no reconstruction, no production changes. Check complete.
