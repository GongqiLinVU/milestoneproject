# Sprint 8 — Phase C Report (S9 intake failures)

One focused, measurable improvement based on the S9 debug trace
`session-intake-debug-S9 (1).json`. Scope is strictly the three observed S9
failures; no dataset expansion, no model comparison, no readiness re-opening.

- **Author role:** Claude (local code, tests, repository documentation).
  Plan/review by Joseph and ChatGPT.
- **Baseline commit:** `8e770b6ac502927d9c77e1f6496497b151e7ed7f`
- **Branch:** `integration-tests-m4-m10-m14`
- **Final code ref:** working tree on the baseline commit (changes not yet
  committed; no push/merge/deploy performed, per the boundaries).

> **Revision history.** Phase C (initial) implemented F1 and F3 and the
> rejection half of F2, but the final record still contained unsupported "500"
> and "throttled network" details, so F2 was only **partially** resolved. The
> **Phase C follow-up** (this revision, §4a) adds a general specificity
> sanitiser that removes those unsupported details while preserving the
> supported content. See §4a for the same-fixture before/after and §6 for the
> remaining general limitation.

## 1. Baseline fixture (preserved unchanged)

The exported trace is stored verbatim and treated as read-only history:

- `tests/ai-session-intake/fixtures/session-intake-debug-S9-phaseC-baseline.json`
- SHA-256 `2c2edd72496909c3d640e0d5db0eda7abc6865b3e58ca4d413004a78292b12d0`
  (byte-identical to the Downloads original; verified with `shasum -a 256`).

Before/after values below are produced by replaying this fixture's recorded
provider candidates through the **actual runtime logic** (no provider calls):

- `tests/ai-session-intake/fixtures/phaseC-baseline-capture.mjs` — before/after
  capture harness (prints legacy UI composition vs the fixed single-authority UI
  decision side by side).

## 2. Changed files

| File | Change |
|------|--------|
| `src/intakeHarness.ts` | F1: allow a student-disclosed untested testing state (`missing`) and relax the bare-numeric identifier guard for that state only (an absence cannot cite an artifact). F2: add `unsupportedArtifact()` and reject `next_action`/`verification_method`/`evidence` candidates that name a verification artifact (commit/SHA/screenshot/upload/log) absent from the sourced student turn. |
| `src/intakePolicy.ts` | F1: `applyEvidenceUpdates` records a `missing` testing disclosure as a `baseline_or_expected` limitation note without erasing an executed test. F3: add `uiReviewDecision()` — a single authoritative UI review decision that defers to the backend `decideTurn` result. |
| `src/main.tsx` | F3: `SessionIntakeModal.send` now calls `uiReviewDecision()` instead of recomputing a UI verdict from the model's self-reported assessment; the `accepted_action_ui_override` path is removed. |
| `tests/ai-session-intake/adaptive/phaseC-s9.test.mjs` | New offline regressions (8 tests) driving the actual runtime + UI decision path over the preserved fixture. |
| `tests/ai-session-intake/fixtures/…` | Preserved baseline fixture + before/after capture harness. |

Source diffstat: `src/intakeHarness.ts +38/-2`, `src/intakePolicy.ts +46/-0`,
`src/main.tsx +10/-6`.

## 3. Before / after on the same S9 fixture

### 3.1 Route decisions

| Turn | Authority | Before | After |
|------|-----------|--------|-------|
| Turn 1 | backend `decideTurn` | `small_step`, readyForReview=false | `small_step`, readyForReview=false (unchanged) |
| Turn 2 | backend `decideTurn` | `continue`, readyForReview=false | `continue`, readyForReview=false (unchanged — correct under policy) |
| Turn 2 | UI decision | **review**, reason `accepted_action_ui_override` (diverged from backend) | **continue**, reason `continue_collecting`, source `backend` (agrees with backend) |

The correct outcome under the existing policy is **continue, not review**:
`decideTurn` only releases to review when an accepted next action AND established
evidence coexist, where "established" requires a populated `verificationMethod`.
In this trace `verificationMethod` was never set (the model's `verification_method`
candidate used a disallowed state), so `continue` is correct. The case was **not**
forced into review to satisfy a test.

### 3.2 Final record (testing + next_action) — same fixture

**Before (observed in the exported trace / reproduced by the baseline capture):**

```json
"testing": [
  { "test_id": "T1", "execution_status": "executed",
    "method": "manual functional test (throttled network)",
    "observed_result": "Spinner appeared until cards loaded",
    "baseline_or_expected": null }      // untested API-error path DROPPED
],
"next_action": {
  "action": "Locate API error, fix UI error state, and demonstrate the fix live to the teacher (or provide commit SHA)",
  "expected_evidence": "Live demonstration of error handling (or commit SHA for the fix)"   // "commit SHA" = assistant proposal, not student commitment
}
```

**After (actual runtime over the same fixture):**

```json
// Turn 1 — both testing facts preserved in one schema-valid entry
"testing": [
  { "test_id": "T1", "execution_status": "executed",
    "method": "manual functional test (throttled network)",
    "observed_result": "Spinner appeared until cards loaded",
    "baseline_or_expected": "Not tested by student: API error handling (e.g., 500) not tested" }
]

// Turn 2 — the assistant-originated next_action is rejected, so no unsupported
// detail enters the record:
//   next_action decision: outcome=rejected, reason=student_source_not_semantically_supported
```

## 4. Per-failure results

| # | Original evidence (baseline trace) | Fix | Verification | Remaining limitation |
|---|-------------------------------------|-----|--------------|----------------------|
| **1. Untested path dropped** | Turn 1 `fieldDecisions[4]`: `testing` candidate (`state:"missing"`, "API error handling … not tested") → `rejected: state_not_allowed_for_field`. Final record had a single executed test; the untested API path was absent. | `missing` is now an allowed testing state. `applyEvidenceUpdates` stores it as a `baseline_or_expected` limitation note and never overwrites an executed test (degrades to `unknown` only if no executed test exists). `grounded()` no longer treats a bare numeric as a must-match identifier for a `missing` disclosure. **Follow-up:** `sanitiseAgainstSource()` now strips the unsupported "500" from the recorded note. | Offline, actual runtime: both testing decisions `accepted`; record `testing[0]` keeps `execution_status:"executed"` + observed result AND `baseline_or_expected:"Not tested by student: API error handling not tested"` (no "500"). See `phaseC-s9.test.mjs` → "F1 …" and "follow-up: unsupported '500' …". | The note keeps the student-supported fact without added specificity. Fully general paraphrase fidelity of free text remains a prompt/model matter (§6). |
| **2. Unsupported details** | Turn 2 `fieldDecisions[2]`: `next_action` accepted (`student_source_valid`) though it imported "or provide commit SHA" (assistant turn 2). Separately, the executed test's `method` recorded the model paraphrase "throttled network" and the untested note recorded "500" — neither stated by the student. | (a) `unsupportedArtifact()` rejects a `next_action`/`verification_method`/`evidence` candidate that names a verification artifact (commit, SHA, screenshot, upload, log) absent from the sourced student turn. (b) **Follow-up:** `sanitiseAgainstSource()` strips unsupported standalone numbers from all record-bound text, and for an executed test rebuilds the `method` from generic scaffolding + the student's own grounded condition clause instead of a model synonym. | Offline, actual runtime: turn-2 `next_action` → `rejected: student_source_not_semantically_supported`; recorded `method` = "manual functional test (loaded the page over a slow connection)" (no "throttled"); untested note has no "500". Control tests confirm a student-stated "500" or "throttled" is preserved, and a morphological evidence paraphrase is not stripped. See `phaseC-s9.test.mjs` → "follow-up …". | Significant-token stripping is scoped to the `method` field only; other free text (evidence/observed) keeps the model wording. Fully general faithfulness of all free text is a prompt/model matter (§6). |
| **3. Dual review authority** | Turn 2: backend `routeDecision.final:"continue"`, `readyForReview:false`, but the UI entered review via `accepted_action_ui_override` and reported `sufficient_information`. Two authorities disagreed on the same turn. | The UI now defers to one authority: `uiReviewDecision()` returns the backend `decideTurn` verdict (`readyForReview || route==="review"`), folding in the question-budget limit for the transition message only. The model-assessment override is removed from `src/main.tsx`. | Offline, actual runtime + UI path: `uiReviewDecision` returns `{review:false, reason:"continue_collecting", source:"backend"}`; `fixed_diverged=false` in the capture harness. A second test confirms the UI still enters review when the **backend** decides review (budget limit). See `phaseC-s9.test.mjs` → "F3 …" and "follow-up: … review decision is preserved". | None for this case. The UI depends on the backend decision; if a future backend policy change alters review timing, the UI follows it automatically (by design). |

## 4a. Phase C follow-up — specificity (same S9 fixture, before/after)

The follow-up targets only the two unsupported specifics that survived into the
record: the illustrative HTTP status "500" and the method paraphrase "throttled
network". The sourced student turn (turn 1) says, verbatim: "When I loaded the
page over a **slow connection**, the spinner appeared until the cards loaded. I
still have **not tested** what happens when the API returns an error." The
student never said "500" or "throttled".

**Smallest runtime fix (general, not fixture-specific):** `sanitiseAgainstSource()`
in `src/intakeHarness.ts`, applied to each accepted candidate against its sourced
student turn:

- strip an unsupported **bare, free-standing number** absent from the student
  turn (and any now-empty "(e.g., N)" wrapper) from all record-bound free text;
  a digit run inside a **structured token** (version `v2.1.0`, date `2026-10-08`,
  filename `report_v2.sql`, path, hex/identifier, or a unit like `500ms`) is
  **not** stripped, because those digits carry a fact (possibly disclosed in an
  earlier student turn) rather than illustrative decoration;
- for an **executed test**, rebuild `method` as generic scaffolding + the
  student's own grounded condition clause, dropping unsupported significant
  tokens (so no undisclosed procedure is asserted);
- leave other free text (evidence/observed/next action) unchanged to preserve
  legitimate student paraphrase and morphology.

> **Publish-time correction.** During the close-out review the bare-number rule
> was found to also mangle structured tokens (an early form turned `v2.1.0` into
> `v2..`). The regex was tightened to match only a digit run with no adjacent
> word character or `.`/`-`/`/`/`:`, with a targeted regression
> ("structured tokens … survive number stripping"). The illustrative-"500" fix
> is unchanged.

`record.testing[0]` built from the same fixture's turn-1 candidates:

```jsonc
// BEFORE (original exported trace / pre-follow-up runtime)
{ "execution_status": "executed",
  "method": "manual functional test (throttled network)",     // model paraphrase
  "observed_result": "Spinner appeared until cards loaded",
  "baseline_or_expected": null }                                // untested path dropped (pre-F1)

// AFTER (Phase C follow-up runtime, same fixture)
{ "execution_status": "executed",
  "method": "manual functional test (loaded the page over a slow connection)", // student's words
  "observed_result": "Spinner appeared until cards loaded",
  "baseline_or_expected": "Not tested by student: API error handling not tested" } // untested path kept, no "500"
```

Checks on the after-record (asserted in `phaseC-s9.test.mjs`): contains no
`500`; contains no `throttl*`; `method` contains "slow connection"; executed
status + observed result preserved; untested API-error path present and in a
distinct field.

## 5. Implemented vs offline-verified vs live-verified

- **Implemented (code):** F1, F2, F3 and the follow-up specificity sanitiser in
  `src/`. Build passes (`npm run build`: `tsc -b && vite build`, clean).
- **Offline-verified (deterministic, no provider):**
  - `npm test` (adaptive suite incl. 8 Phase C + 7 follow-up tests): **65/65 pass**.
  - Replay suite (provider-free + mocked-HTTP adapters): **62/62 pass**.
  - These prove the **deterministic safeguards** (validation, state
    accumulation, record construction, specificity sanitiser, UI decision).
    Frozen-candidate replay is **not** evidence that live model extraction
    improved.
- **Live-verified:** **none in this round.** `npm run test:integration` was
  **not** run because its runner exercises the real LLM when `OPENAI_API_KEY` is
  set, which would be a paid provider call (outside this round's boundaries). No
  live S9 re-run was performed.

## 6. Honest residuals (require future model/prompt evaluation)

1. The specificity sanitiser is **general but scoped**: it strips unsupported
   standalone numbers from all record-bound free text, and strips unsupported
   significant tokens **only from the testing `method`** (the field that asserts
   a procedure). Other free text (evidence reference, observed result, next
   action) keeps the model's wording to avoid discarding legitimate student
   paraphrase and morphological variants ("loaded"→"load", "appeared"→"showed").
   Fully general semantic-grounding of all free text is **not** solved
   deterministically and remains a prompt/model matter.
2. The executed-test `method` is reconstructed from generic scaffolding plus the
   student's own grounded condition clause. The clause extractor is heuristic
   (connector-based); for atypical phrasings it may select a shorter clause or
   none, in which case the method degrades to generic scaffolding ("manual
   test") rather than an undisclosed paraphrase. This is safe (asserts nothing
   the student did not say) but not always maximally descriptive.
3. The fixes are verified on the **single preserved S9 trace** and via targeted
   unit cases. Whether the **live** model emits clean candidates is a
   model-behaviour question; the deterministic layer only guarantees that
   unsupported numbers and undisclosed method procedures do not reach the record.

## 6a. Database / deployment compatibility

This change is **frontend/runtime logic only** (`src/intakeHarness.ts`,
`src/intakePolicy.ts`, `src/main.tsx`) plus tests and documentation. It adds **no
schema change, no new column, no RPC signature change, and no migration**:

- The new testing state `missing` is already permitted by the deployed
  `/api/session-intake-ai` candidate schema (`state` enum includes `missing`).
- The untested-path limitation is stored in the existing
  `testing[].baseline_or_expected` field; `validateIntakeStudentRecord` and the
  existing `save_my_session_intake_*` RPCs accept the record unchanged.
- The sanitiser operates on in-memory candidates before any save.

Therefore `main` can run this code safely with the **currently deployed
database**; no unapplied migration or configuration change gates this merge.
(The separately-tracked Phase 2C database audit remains a Sprint 8 exit item but
is **not** a prerequisite for this specific change.)

## 7. Proposed next acceptance step

Run **one** authenticated, local, live S9 re-run (real endpoint + local Supabase
+ real provider) with the same student inputs, then diff the confirmed record and
route decisions against this report's "after" values. Acceptance criteria:

1. Final `testing` keeps the executed slow-connection entry **and** a
   student-grounded untested-API-error limitation.
2. No `commit`/`SHA` (or other assistant-proposed artifact) appears in
   `next_action`/`expected_evidence` unless the student states it.
3. Backend and UI report the **same** review decision for every turn
   (no `accepted_action_ui_override`).

This is the single, bounded live check that would convert the offline-verified
result into a live-verified one. It is explicitly a paid-provider step and is
therefore left for a separate, approved run.
