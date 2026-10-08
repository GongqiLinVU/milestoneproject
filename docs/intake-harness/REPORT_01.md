# AI Session Intake — Integration Harness Report 01

Status: first report. Establishes what the integration harness is, how each
scenario maps to a manual candidate case, and a benchmark (metrics) so we can
measure and improve the harness's effectiveness over time.

Date: 2026-09-27
Scope: `tests/integration/` (driver + scenarios), `scripts/run-integration-tests.sh`.
Relationship to existing work: complements — does not replace — the deterministic
Harness v1/v2 suites in `tests/ai-session-intake/adaptive/` and the manual
candidate case matrix in `tests/ai-session-intake/adaptive/README.md`.

---

## 1. Why this harness exists

The adaptive suites (`policy.test.mjs`, `policy-v2.test.mjs`) are fast,
deterministic unit tests: they call `decideTurn()` directly with recorded model
candidates and mock the provider and database. They verify the *decision logic*
in isolation, which is essential but does not prove the *deployed system* behaves
correctly.

The Sprint 8 manual candidate case matrix
(`tests/ai-session-intake/adaptive/README.md`) closes that gap by hand: a person
logs in as a mock student, types answers into the UI, and observes the result.
That is accurate but slow, non-repeatable, and easy to skip under time pressure —
exactly the concern raised for this work.

This harness automates that manual, UI-equivalent flow. It exercises the same
path a student's browser uses:

```
student login (real Supabase token)
  → resolve a real 2B2 Session id
  → POST /api/session-intake-ai  (mode="turn")   ← real endpoint
  → real OpenAI call when OPENAI_API_KEY is on the server
  → assert the endpoint's contract
```

It is an **integration** test, not a unit test: real auth, real database reads,
real HTTP, and the real LLM when configured.

---

## 2. What was designed and built

### 2.1 Components

| File | Role |
|---|---|
| `tests/integration/lib/intake-client.mjs` | Driver library: `loginStudent`, `resolveSessionId`, `callIntake`, `runConversation`, `minimalConversation`, `providerConfigured`. |
| `tests/integration/intake-scenarios.test.mjs` | 7 `node:test` scenarios asserting the endpoint contract. |
| `scripts/run-integration-tests.sh` | Orchestration: checks Supabase + API server + seeded fixture, exports `.env.local`, runs the suite. |
| `package.json` scripts | `test:integration`, plus `seed:local` and `dev:api` helpers. |

### 2.2 Key design decisions

- **Contract assertions, not wording.** The real LLM is non-deterministic. The
  harness asserts *structural* properties (HTTP status, `route` ∈ a known set,
  `readyForReview`, `budget.maxQuestions`, no fabricated evidence state, clean
  termination). These hold across model/prompt drift, so the suite stays green
  when wording changes but fails when behaviour regresses.
- **Faithful UI mirroring.** `runConversation` reproduces `src/main.tsx`'s
  transcript exactly: a leading `system` "session starting point" turn, student
  answers as `{actor:"student", purpose:"student response"}`, and assistant
  replies appended back as `{actor:"system", purpose:<route>}`. This matters —
  see the finding in §5.
- **Provider-agnostic.** With a key on the server the suite drives the real LLM;
  without one it still asserts the documented fallback contract. Either way the
  assertions hold.
- **Local-only and secret-safe.** The orchestration script refuses any
  non-local `SUPABASE_URL`. The OpenAI key lives only in the server process;
  the tests never read, log, or transmit it. `.env.local`, `.test-build`, and
  `.test-api` are gitignored.
- **Skips cleanly.** If the stack is not up, the suite reports a skip with a
  reason rather than a false failure.

### 2.3 How to run

```sh
supabase start           # local Docker stack
npm run seed:local       # one-time fixture (2B2 block, 10 students, S1–S9 open)
npm run dev:api          # real api/*.ts on :3010 (separate terminal)
npm run test:integration # drives the endpoint + real LLM
```

---

## 3. Scenario coverage and mapping to manual cases

The manual matrix in `README.md` defines 11 candidate cases. This first report
automates 7 scenarios covering 6 of them, plus 2 access/validation guards that
the manual matrix assumes implicitly.

| # | Integration scenario | Manual case covered | What it verifies |
|---|---|---|---|
| 1 | access control: non-2B2 / out-of-range Session rejected | (implicit) Locked history / eligibility | Unknown/ineligible `sessionId` → HTTP 403 with an error code. |
| 2 | request validation: turn must end in a student answer | (implicit) conversation shape | A conversation not ending in a student turn → HTTP 400. |
| 3 | short-but-specific answer returns a valid route within budget | **Short but specific** | 200; `route` valid; non-empty `assistantMessage`; `budget.maxQuestions == 8`. |
| 4 | sparse / no-progress never fabricates evidence | **Sparse / no progress** | 200; valid route; no accepted evidence update in state `available` or `executed`. |
| 5 | multi-turn stays within the 8-question ceiling | **Full budget** | Every turn 200; `questionsAsked ≤ 8`; conversation terminates (review / teacher_help / fallback). |
| 6 | teacher-help request routes to support | **Teacher help** | 200; valid route (support path reachable end-to-end). |
| 7 | provider configuration is observable | **Provider failure** (partial) | Endpoint answers a probe; real-LLM vs documented-fallback both accepted. |

### 3.1 Coverage gaps (not yet automated)

These manual cases are **not** covered by this first report and remain manual:

- **Complex** (two completed changes + one untested state + API dependency; must
  separate facts, unknown testing, and blocker without repeat questions).
- **Demonstration** (live-demo claim must be classified `live_demonstration`,
  not repository change or executed test).
- **Early review** (all three directions + accepted action in the first reply;
  may finish immediately without using all follow-ups).
- **Correction** (changing an extracted claim at review resets attestation;
  original + correction saved separately).
- **Accepted future test** (planned API-500 test must not overwrite an already
  executed loading observation; never asks for a future result now).
- **Provider failure — deterministic** (currently only *observed*, not *forced*;
  see §6).
- **Persistence / save path** (the `save_my_session_intake_*` RPCs, saved schema
  version, ordered source conversation, cross-Block and duplicate rejection,
  and `sprint8_adaptive_intake_security_audit.sql`) — entirely manual today.

---

## 4. Benchmark: how we measure harness effectiveness

We cannot improve what we do not measure. This report defines the metrics, then
records the first baseline. The goal is to judge the *harness*, not the model.

### 4.1 Metric definitions

| Metric | Definition | Why it matters | Target direction |
|---|---|---|---|
| **Case coverage** | automated scenarios ÷ manual candidate cases | How much manual testing is replaced | ↑ toward 11/11 |
| **Contract-assertion count** | distinct behavioural assertions across the suite | Depth of verification per run | ↑ |
| **Defect yield** | real endpoint/system defects the harness has caught | Direct evidence the harness earns its cost | ↑ (each finding logged) |
| **Pass rate** | passing scenarios ÷ total, on a healthy stack | Suite stability / flakiness | 100% on green stack |
| **Flake rate** | non-deterministic failures ÷ runs (same code) | Trust in a red result | → 0% |
| **Wall-clock latency** | total and per-scenario duration | Feasibility in a pre-merge loop | ↓ (or parallelise) |
| **Setup friction** | manual steps before a run can start | Likelihood the suite is actually run | ↓ |
| **False-skip rate** | runs that skip when the stack *was* available | Silent no-op protection | → 0% |

### 4.2 Baseline (measured 2026-09-27, real LLM, local stack)

Two consecutive healthy runs of `npm run test:integration`:

| Scenario | Run A (ms) | Run B (ms) |
|---|---|---|
| access control | 763 | 817 |
| request validation | 775 | 806 |
| short-but-specific | 21,071 | 25,619 |
| sparse / no-progress | 10,438 | 17,868 |
| multi-turn (8-question ceiling) | 156,273 | 209,561 |
| teacher-help | 12,735 | 14,307 |
| provider configuration | 11,330 | 13,484 |
| **Suite total** | **214,233** | **283,981** |
| **Pass / total** | **7 / 7** | **7 / 7** |

Derived baseline figures:

- **Case coverage:** 6 of 11 manual cases automated (≈ 55%), plus 2 implicit
  guards → 7 scenarios total.
- **Contract-assertion count:** ~15 distinct assertions across the suite.
- **Defect yield:** **1** (the `fallbackQuestion` crash — see §5).
- **Pass rate:** 100% on a healthy stack (both runs).
- **Flake rate:** 0% observed across 2 runs (too few runs to certify; see §6).
- **Wall-clock latency:** dominated by the multi-turn scenario (73–74% of total)
  because it makes up to 8 sequential real-LLM calls. The two non-LLM guards
  finish in < 1 s each.
- **Setup friction:** 3 manual preconditions (`supabase start`, `seed:local`,
  `dev:api`); the orchestration script verifies all three and fails with a
  specific remedy if any is missing.
- **False-skip rate:** 0% observed.

### 4.3 Reading the baseline

- Latency variance is high (multi-turn: 156 s vs 210 s) because real-LLM
  turn latency varies. This makes wall-clock a **capacity/feasibility** signal,
  not a precise regression signal — do not gate on absolute milliseconds yet.
- The suite is currently **serial**. The four independent single-turn scenarios
  (3, 4, 6, 7) could run concurrently to cut wall-clock materially.
- 55% case coverage with one confirmed defect already justifies the harness; the
  clearest improvement lever is coverage, then latency.

---

## 5. Defect found by this harness (defect yield = 1)

On the first end-to-end run, four scenarios failed with **HTTP 500 / empty body**.
The functions log showed:

```
TypeError: Cannot read properties of undefined (reading 'progress')
    at fallbackQuestion (src/intakeHarness.ts:117)
    at handler (api/session-intake-ai.ts:308)
```

Root cause: the turn-mode provider-failure fallback calls
`fallbackQuestion(req.body.answers, …)`. When a turn request omits `answers`
(a first turn, or any conversation-only client), `answers` is `undefined` and
`fallbackQuestion` dereferenced `answers.progress`, throwing — so the function
crashed into a raw 500 instead of serving the deterministic 200 fallback. That
violates the Sprint 8 guardrail *"provider failure must preserve answers and
allow fallback submission."*

Fix: made `fallbackQuestion` null-safe (`const a = answers ?? {}`) in
`src/intakeHarness.ts`, plus a deterministic regression test
(`tests/ai-session-intake/adaptive/fallback-nullsafe.test.mjs`, 3 cases).

Verification after fix:
- Integration suite: 7/7 pass against the live endpoint with the real LLM.
- Unit suite: 45/45 pass (42 prior + 3 new).

Secondary finding (harness self-correction): the real validated conversation
contract is strict alternation (even index = `system`, odd = `student`), actors
are `system`/`student` (not `assistant`), every turn needs a `purpose` (3–80
chars), a minimum of 2 turns, and the last turn must be `student`. The driver
now mirrors this exactly (`minimalConversation`, `runConversation`).

---

## 6. Known limitations

- **Provider failure is observed, not forced.** Scenario 7 only confirms the
  endpoint answers; it cannot deterministically drive the fallback branch from
  the client because the key lives on the server. A future harness mode should
  point the server at an injected failing provider to assert the 200 fallback
  contract directly (the `fallbackQuestion` bug lived precisely there).
- **No persistence assertions.** The save RPCs, saved schema version, ordered
  source conversation, corrections, and duplicate/cross-Block rejection are not
  yet checked; nor is `sprint8_adaptive_intake_security_audit.sql`.
- **Small sample.** Flake rate is based on 2 runs. The manual standard is
  "repeat each real-model case at least three times"; the harness should adopt a
  repeat-count and record variance before any quality claim.
- **No cost/token capture.** The endpoint returns `usage`; the harness does not
  yet record tokens or cost per scenario.
- **Content quality is out of scope.** The harness verifies the contract, not
  whether questions are pedagogically good — that remains human/Teacher review.

---

## 7. Recommended next steps (priority order)

1. **Raise case coverage toward 11/11** — add Complex, Demonstration, Early
   review, Correction, and Accepted-future-test scenarios. Target metric:
   coverage ≥ 90%.
2. **Add a deterministic provider-failure mode** — inject a failing provider so
   the 200-fallback contract is asserted directly, not just observed.
3. **Add persistence + security assertions** — drive a full confirm/save and
   verify the saved record, then run the security audit as part of the flow.
4. **Parallelise independent single-turn scenarios** — cut wall-clock; keep
   multi-turn serial.
5. **Record per-scenario `usage`/latency to a JSON artifact** — turn the §4
   table into an automatically emitted benchmark file so trends are tracked run
   over run.
6. **Adopt a repeat-count (≥ 3)** for real-model scenarios and report variance,
   aligning with the manual candidate standard.

---

## 8. Summary

The harness automates the previously-manual UI intake flow, asserts the endpoint
contract against the real LLM, and has already paid for itself by catching a
production crash on the provider-failure path. Baseline metrics are recorded:
55% case coverage, 100% pass rate on a healthy stack, 0% observed flake over 2
runs, ~214–284 s wall-clock (multi-turn dominated), and defect yield 1. The
biggest improvement levers are case coverage, a deterministic provider-failure
mode, and persistence/security assertions.
