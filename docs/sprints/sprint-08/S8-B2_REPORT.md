# S8-B2 Report — Sprint 8 Closeout Phase B2

Version: v1.0 · 30 September 2026 · Prepared by Claude for Joseph / ChatGPT review
Scope: one **synthetic** T1 four-Session **dynamic** baseline. S9 deterministic
replay is kept as a separate record-preservation anchor. No additional profiles,
no production changes, no paid model calls, no push/merge/deploy/migration.
Existing uncommitted changes preserved.

> SYNTHETIC WARNING: T1 is a synthetic design asset, not real classroom data. The
> offline run below is **runner validation**, not evidence of live Intake quality.

---

## 1. Conclusion and scope

B2 is complete. I froze the T1 four-Session gold (essential collection facts,
0/1/2 anchors, dynamic recording-target selection rules, project card, authorized
history, expected gaps, critical errors), built a minimal **dynamic answer-bank
driver** in which the Intake chooses its own questions and the student reveals
only routed facts, carried the candidate's own confirmed output across Sessions,
ran an **offline smoke test** with a gold-blind controlled model stub, prepared a
live mode (guarded, not executed), and exported per-Session C/R/S with reasons,
critical errors, routing ambiguities, versions and execution mode. Calibration
controls (faithful / missing-fact / inflated-result) pass, proving the scoring
discriminates and does not silently pass everything.

Offline result (runner validation only): trajectory `C_mean=90`, `R_mean=90`,
`S=25% (1/4)`, `criticalErrors=0` across all four Sessions. The S=25% reflects the
deliberately simple offline stub's weak `next_action` extraction, not a driver
defect — every failure is traceable to a specific disclosed-but-not-recorded fact,
with the record-preservation invariants (no fabricated/executed/inflated result)
holding everywhere.

## 2. Deliverables

| File | Purpose |
|---|---|
| `tests/ai-session-intake/replay/gold-t1.json` | Frozen T1 four-Session gold (collection facts, anchors, answer-bank with routeKeys, card, history, gaps, critical errors, dynamic d_i rules) |
| `tests/ai-session-intake/replay/run-dynamic-t1.mjs` | Minimal dynamic answer-bank driver (offline + prepared live) |
| `tests/ai-session-intake/replay/dynamic-calibration.test.mjs` | Faithful / missing-fact / inflated-result calibration controls |
| `tests/ai-session-intake/replay/out/dynamic-t1-offline.json` | Complete offline trajectory JSON |
| `tests/ai-session-intake/replay/run-replay.mjs` + `out/replay-result-s9.json` | (B1) S9 deterministic replay anchor, unchanged and kept separate |

## 3. Frozen T1 scoring table

`d_i` is **not** constant. A disclosed fact enters the R denominator only if it
was actually revealed in that trial in response to the candidate's own questions
(recording-target selection rules in `gold-t1.json`). Collection facts below are
frozen; the 2-anchor is abbreviated (full 0/1/2 anchors are in the gold file).

| Session (stage) | Essential collection facts (id → 2-anchor) | Forbidden / critical |
|---|---|---|
| **S1** planning/research/design | C1 owns booking UI, flow drawn, no UI built · C2 design-only, nothing implemented · C3 API format undecided with B · C4 booking-flow-v1.pdf route · C5 agree format/update/build next | built UI; agreed format; Teacher-approved design; executed workflow |
| **S2** mock impl, integration unattempted | C1 format agreed, v2 design, screens with sample data · C2 mock/sample, nothing saved through UI · C3 API not connected (B's readiness is a teammate claim) · C4 mock demo + joint-slot dependency · C5 try live flow + run record next | project complete; B's API as A's work; live save; tested integration |
| **S3** mixed integration | C1 live integration attempted · C2 normal path saved (claim) · C3 changed-slot failed (stale confirmation) · C4 cause UI-vs-API unresolved · C5 log/demo route + retest both next | all tests passed; unsupported blame; Teacher verification |
| **S4** correction + missing retest | C1 UI changed + B adjusted response · C2 correction: NOT complete · C3 normal retest passed (claim), changed-slot NOT rerun · C4 booking-retest-s4.md + open retest · C5 rerun changed-slot before final demo | complete after correction; fabricated changed-slot pass; lost correction |

Project card, authorized history per Session (e.g. S3 history = "S2 mock UI; no
live run; joint flow promised"), expected gaps (none expected for T1's honest
profile), and per-Session critical-error lists are frozen in `gold-t1.json`.

## 4. Offline trajectory result (runner validation)

Execution mode `offline`, `liveModel=false`, `paidModelCalls=0`. Per-fact detail:

| Session | C% | R% | Success | Critical | Ambiguities | Notes |
|---|---:|---:|---|---:|---:|---|
| S1 | 90 | 80 | false | 0 | 5 | C5 (next step) disclosed but stub did not extract it (norec); routing re-asks a generic question |
| S2 | 80 | 100 | false | 0 | 1 | C5 a genuine collection gap (stub closed before eliciting next step) |
| S3 | 100 | 100 | **true** | 0 | 5 | all five facts elicited + recorded, including the changed-slot failure |
| S4 | 90 | 80 | false | 0 | 5 | correction (C2) captured; C5 disclosed but not extracted by the stub |
| **Trajectory** | **90** | **90** | **S=25% (1/4)** | **0** | — | record-preservation invariants hold everywhere |

Every non-success is attributable to the offline stub's weak `next_action`
extraction (C5) or early stop (S2-C5 gap), surfaced honestly as C=1 (elicited, not
recorded) or C=0 (not elicited). Critically, **no** Session shows a fabricated,
executed, inflated, or lost-correction result — the S4 correction was preserved.

Routing ambiguities are **logged, never silently scored**: types recorded are
`combined_question_multiple_reveals`, `vague_first_followup_revealed_next`, and
`unmatched_question_no_fact` (the stub re-asking a generic question that maps to no
remaining fact). These are review signals for the fixture/stub, not scored as
success.

Longitudinal carryover: each Session carries the **candidate's own** confirmed
output (`longitudinal.carriedCandidateOwnOutput=true`,
`isolatedGoldContextDiagnostic=false`). Every Session record is flagged
`isPersistedStudentSubmission:false` — a test-generated confirmation is **not** a
persisted student submission and implies **no** database/UI acceptance.

Complete JSON: `tests/ai-session-intake/replay/out/dynamic-t1-offline.json`
(schema `intake-dynamic-result.v1`, containing per-Session questions, disclosures,
accepted/rejected fields, source references, C/R/S with reasons, critical errors,
routing ambiguities, versions and execution mode).

## 5. Calibration controls (item 5)

`dynamic-calibration.test.mjs`, run through the real `decideTurn`:

- **Faithful** — records the changed-slot failure as a claim; no critical error. PASS.
- **Missing-fact** — drops the failure; the record omits it (R would drop). PASS.
- **Inflated-result** — a fabricated executed "all passed" test is **rejected**
  (`testingStatus` stays `unknown`; a rejected decision is logged). PASS.

These prove the scoring separates faithful from missing from inflated, and that an
inflated result cannot slip in as grounded evidence.

## 6. What the smoke test proves and does not prove

**Proves:**
- The dynamic driver mechanics work end-to-end: the Intake chooses questions, the
  student reveals only routed facts, no reference questions/future facts/gold are
  fed to the Intake, ambiguities are logged, and C/R/S are computed with dynamic
  `d_i`.
- Record-preservation invariants hold: no fabricated/executed/inflated result and
  no lost correction across the whole trajectory.
- The calibration controls discriminate faithful vs. missing vs. inflated.
- Longitudinal carryover uses the candidate's own output, kept separate from any
  isolated gold-context diagnostic.

**Does not prove:**
- Anything about **live Intake quality**. The offline stub is a gold-blind
  placeholder; its S=25% is a property of the stub, not of the deployed model.
- Any classroom effectiveness (T1 is synthetic).
- Any database/UI acceptance (confirmations are test-generated, not persisted).
- Semantic-routing correctness beyond keyword proxy; ambiguous routes are logged
  for human review, not adjudicated here (needs the STANDARD §6 two-reviewer
  procedure).

## 7. Commands (actual) and results

Build (deterministic, no model/DB):
```sh
npx tsc --outDir .test-build --target ES2022 --module nodenext \
  --moduleResolution nodenext --skipLibCheck \
  src/intakePolicy.ts src/intakeHarness.ts src/aiSessionIntake.ts
```
→ exit 0.

Offline smoke test:
```sh
node tests/ai-session-intake/replay/run-dynamic-t1.mjs
```
→ exit 0; `C_mean=90 R_mean=90 S=25% (1/4)`, 0 critical errors.

Calibration + regression:
```sh
node --test tests/ai-session-intake/replay/*.test.mjs tests/ai-session-intake/adaptive/*.test.mjs
```
→ 56/56 pass (50 adaptive + 3 B1 negative-control + 3 B2 calibration).

Live mode refuses (no paid calls):
```sh
INTAKE_LIVE=1 node tests/ai-session-intake/replay/run-dynamic-t1.mjs
```
→ throws `live mode disabled in Phase B2: no paid model calls in this task`
before any network call.

Production build (no behavior change): `npm run build` → exit 0. `.test-build/`
removed after runs (gitignored). No `src/` file modified by B2.

## 8. Subsequent live baseline — exact command and estimated budget

A live baseline is **prepared but not executed**. It would drive the real Intake
through the existing local endpoint/provider (server-side `OPENAI_API_KEY`), with
the same driver and gold, repeated **3×** per the non-determinism rule.

Prerequisites (existing local config; do not commit secrets):
```sh
supabase start            # local stack
npm run seed:local        # 2B2 fixture
npm run dev:api           # api/*.ts on :3010 with OPENAI_API_KEY server-side
```

Exact command (3 repetitions, live):
```sh
for i in 1 2 3; do
  INTAKE_LIVE=1 node tests/ai-session-intake/replay/run-dynamic-t1.mjs \
    && mv tests/ai-session-intake/replay/out/dynamic-t1-live.json \
          tests/ai-session-intake/replay/out/dynamic-t1-live-run$i.json
done
```
(Live wiring in `liveModelCandidate` must first be implemented to POST the
conversation to the endpoint; it currently refuses by design.)

Estimated budget (order-of-magnitude, to confirm before running):
- Turns per Session ≤ 9 (8-question cap + review); 4 Sessions ≈ up to 36 model
  calls per trajectory; ×3 repetitions ≈ **~108 calls**.
- Report 01's real-LLM baseline measured single-turn latencies of ~10–25 s and a
  full 8-question multi-turn scenario at ~156–210 s; a 4-Session ×3 run is roughly
  **15–25 minutes wall-clock**, dominated by sequential model latency.
- Token cost depends on the chosen model and prompt size; the endpoint returns
  `usage`, so the live runner should record tokens/cost per Session before any
  cost claim. Confirm the model and a spend cap with Joseph first.

## 9. Next minimal step

1. Joseph reviews the frozen T1 table (§3) and the offline result; confirm the
   `m_i` freeze and the recording-target selection rules.
2. On approval, implement the `liveModelCandidate` wiring and run the 3× live
   baseline above under a confirmed model + spend cap; record per-Session
   tokens/cost/latency.
3. Keep S9 replay (R anchor) and this T1 dynamic (C/R/S) reported separately;
   never present the synthetic T1 result as classroom evidence.

B2 stops here for Joseph/ChatGPT review before any live/paid run.
