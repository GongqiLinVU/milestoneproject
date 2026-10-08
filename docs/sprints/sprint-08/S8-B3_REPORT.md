# S8-B3 Report — Sprint 8 Closeout Phase B3 (preparation, pre-paid-run)

Version: v1.0 · 30 September 2026 · Prepared by Claude for Joseph / ChatGPT review
Scope: prepare ONE live T1 four-Session trajectory before any repeated runs. This
task completes items 1–4 (attribution audit + re-score, routing review, live-mode
verification, exact budget/cap) and **stops before paid execution** (item 5) until
Joseph approves the concrete budget. No production changes, no push/merge/deploy/
migration. Existing uncommitted changes preserved.

> SYNTHETIC WARNING: T1 is synthetic. Offline results are runner validation, not
> live Intake quality or classroom effectiveness.

---

## 1. C/R attribution audit and re-score (item 1)

**Finding.** The B2 scorer conflated collection with recording: when an essential
fact was disclosed in the conversation but the extraction did not capture it, it
scored **C=1**. That is wrong. C evaluates whether the essential fact was
**established in the conversation** (elicited); R evaluates whether a **disclosed**
fact was **faithfully retained**. A clearly-disclosed next action omitted from
extraction is an **R failure, not a C failure**.

**Correction (versioned `intake-crs-scoring.v1.1`, result schema
`intake-dynamic-result.v1.1`).** In `run-dynamic-t1.mjs`:
- C now scores 2 if the fact was elicited in the conversation, 0 if never elicited
  (a genuine collection gap). It no longer depends on extraction.
- R (over facts actually disclosed this trial) scores 2 if retained, 0 if dropped
  from extraction — this is where an omitted disclosed next action now lands.

No production code changed (the correction is in the benchmark driver only).

**Re-scored offline result** (`out/dynamic-t1-offline.json`,
`scoringVersion: intake-crs-scoring.v1.1`):

| Session | C% (v1.0 → v1.1) | R% | Success | Critical | Why the C moved |
|---|---|---:|---|---:|---|
| S1 | 90 → **100** | 80 | false | 0 | next-step fact **was elicited** (C=2); extraction miss now only in R |
| S2 | 80 → **80** | 100 | false | 0 | unchanged: S2-C5 is a real collection gap (never elicited; stub stopped early) |
| S3 | 100 → **100** | 100 | **true** | 0 | all facts elicited + recorded |
| S4 | 90 → **100** | 80 | false | 0 | next-step fact elicited; extraction miss now only in R |
| **Trajectory** | 90 → **95** | 90 | S=25% | 0 | attribution corrected; S unchanged (extraction misses still fail the Session via R) |

The re-score confirms the fix discriminates: S1/S4 collection was faithful (C=100)
and only their extraction lagged (R=80), whereas S2 remains a true collection gap
(C=80). Session success is unchanged because an R failure still prevents success.

## 2. Routing review and adjudication (item 2)

- **Paraphrase robustness added.** The student router now matches routeKeys as
  substrings **and** as stem tokens, so "integrated"/"integration",
  "connect"/"connected" and similar paraphrases still route. Verified by
  `routing-adjudication.test.mjs` (paraphrase + stemming tests pass).
- **Valid combined questions** that hit multiple directions reveal multiple
  relevant facts and are flagged `combined_question_multiple_reveals` with
  `pendingAdjudication: true` — valid, not a failure.
- **Genuine uncertainty is flagged, never silently scored.** `unmatched_question_no_fact`
  and `vague_first_followup_revealed_next` now carry `pendingAdjudication: true`.
  They neither pass nor fail the Intake automatically; a reviewer adjudicates
  (STANDARD §6 two-reviewer procedure). C/R depend only on what was elicited and
  retained, so an ambiguous route cannot silently become a pass or an Intake
  failure.
- The offline stub's repeated generic questions (the 5 ambiguities/Session) are a
  **stub** artifact, now surfaced as pending-adjudication routing logs — not a
  Harness defect. Per item 5, the Harness is **not** modified based on stub
  behavior.

## 3. Live-mode verification (item 3)

Live mode now calls the **real Intake workflow** and nothing else:
- It POSTs to `POST /api/session-intake-ai` with `mode:"turn"`, so the endpoint
  runs its **actual prompt** (the long turn `instructions`), **DB-resolved
  context** (`resolvePreviousRecord`: 2B2 eligibility, session focus, same-student
  previous confirmed record), **real extraction/validation/routing** (`decideTurn`
  over the provider's `rawCandidate`), and the **real model** (`OPENAI_INTAKE_MODEL
  || OPENAI_MODEL || "gpt-5-mini"`). No benchmark-only prompt and no predetermined
  questions are used.
- **Gold isolation preserved:** only conversation text and the candidate's own
  accumulated `answers` + `capturedFields` are sent. Gold (facts, anchors,
  routeKeys) is never sent to the endpoint.
- **Carryover:** offline carries the candidate's own confirmed output in-process.
  In live mode the endpoint resolves previous confirmed records **from the DB** for
  the authenticated student, so cross-Session history reflects actual persisted
  intakes. A single non-persisted B3 trajectory therefore only has DB history for
  Sessions previously confirmed — this is documented in the driver, not silently
  assumed.
- **Refusal gate:** live mode throws unless `INTAKE_LIVE_APPROVED=1` **and**
  `INTAKE_STUDENT_TOKEN` + real 2B2 `INTAKE_SESSION_IDS` are supplied. Verified:
  `INTAKE_LIVE=1` alone refuses with the approval message before any network call.

## 4. Exact model, call breakdown and hard spending cap (item 4)

- **Model:** `gpt-5-mini` (the endpoint default; confirm or override via
  `OPENAI_INTAKE_MODEL`). Pricing (public, 2026): **$0.25 / 1M input**,
  **$2.00 / 1M output** tokens. gpt-5-mini reasoning tokens count toward output;
  the endpoint caps turn output at `max_output_tokens: 4000`.
- **Deterministic student routing and scoring:** the student answer-bank and C/R/S
  scoring are fully deterministic; only the Intake's own questions/extraction are
  stochastic. This isolates model non-determinism to the candidate side.
- **Call breakdown — ONE four-Session trajectory:**
  - Turns per Session: T1 has 5 essential facts → ~5 questions expected; hard
    ceiling 8 (`MAX_INTAKE_QUESTIONS`), each turn = 1 endpoint call.
  - Expected: ~5 × 4 = **~20 model calls**. Worst case: 8 × 4 = **~32 calls**.
  - Token estimate: ~2,500 input tokens/call (prompt + growing conversation +
    previous record); ~2,000 output tokens/call expected, 4,000 max.
- **Estimated cost (one trajectory):**
  - Expected (~20 calls): **~$0.09**.
  - Worst case (~32 calls at max output): **~$0.28**.
- **Hard spending cap requested for approval:** **US$0.20 for one trajectory.**
  If a live-run counter would exceed the cap, stop and report rather than
  continue. (For the later 3-repetition baseline: expected ~$0.28, suggested cap
  **$0.60**; that is a separate approval, not requested now.)

## 5. Run gate (item 5) — NOT executed in this task

No paid call was made. After Joseph approves the model and the $0.20 cap, the run
is one command with the local stack up (existing config; never print secrets):

```sh
supabase start && npm run seed:local && npm run dev:api   # existing local stack
npx tsc --outDir .test-build --target ES2022 --module nodenext \
  --moduleResolution nodenext --skipLibCheck \
  src/intakePolicy.ts src/intakeHarness.ts src/aiSessionIntake.ts
INTAKE_LIVE=1 INTAKE_LIVE_APPROVED=1 \
  INTAKE_API_BASE=http://localhost:3010 \
  INTAKE_STUDENT_TOKEN='<mock 2B2 student bearer>' \
  INTAKE_SESSION_IDS='<S1-uuid>,<S2-uuid>,<S3-uuid>,<S4-uuid>' \
  node tests/ai-session-intake/replay/run-dynamic-t1.mjs
# → tests/ai-session-intake/replay/out/dynamic-t1-live.json
```
On approval I will: run **once**, export the complete trace and per-fact scoring
evidence (the JSON already records `usageLog` per Session for token/cost
accounting), and report live results in a **separate** section from the stub
validation. Per item 5, I will **not** modify the Harness based on stub failures.

## 6. Deliverables and review bundle

New/changed in B3 (benchmark-only; no production files):
- `tests/ai-session-intake/replay/run-dynamic-t1.mjs` — v1.1 scoring, paraphrase
  routing, pending-adjudication flags, real-endpoint live mode with refusal gate.
- `tests/ai-session-intake/replay/routing-adjudication.test.mjs` — new routing tests.
- `tests/ai-session-intake/replay/out/dynamic-t1-offline.json` — re-scored (v1.1).

Prior reports and result JSONs included for review:
- `docs/sprints/sprint-08/S8-B1_REPORT.md` + `out/replay-result-s9.json` (S9 real
  replay, R anchor, kept separate).
- `docs/sprints/sprint-08/S8-B2_REPORT.md` + `out/dynamic-t1-offline.json` (T1
  synthetic dynamic baseline; now re-scored under v1.1).
- Standard/cases: `BENCHMARK_STANDARD_v1.md`, `BENCHMARK_CASES_v1_DRAFT.md`.

## 7. Verification (commands actually run)

- Build: `tsc ...` → exit 0.
- Offline re-score: `node run-dynamic-t1.mjs` → `C_mean=95 R_mean=90 S=25%`, 0
  critical errors (v1.1 scoring).
- Tests: `node --test tests/ai-session-intake/replay/*.test.mjs` → 10/10;
  full `replay + adaptive` → **60/60 pass** (50 adaptive + 3 negative-control + 3
  calibration + 4 routing-adjudication).
- Live refusal: `INTAKE_LIVE=1 node run-dynamic-t1.mjs` → refuses (no network call).
- Production build: `npm run build` → exit 0. `.test-build/` cleaned. No `src/`,
  `api/` or `supabase/` file modified by B3; pre-existing uncommitted changes
  preserved.

## 8. Decision needed from Joseph (to proceed to item 5)

1. Approve **model = gpt-5-mini** (or specify an override).
2. Approve the **hard cap of US$0.20** for one four-Session trajectory.
3. Confirm a mock 2B2 student token + four real Session UUIDs are available, and
   whether cross-Session DB history should be pre-seeded (affects live carryover).

On approval I run once, export the trace + scoring evidence, and report live
results separately. B3 stops here.
