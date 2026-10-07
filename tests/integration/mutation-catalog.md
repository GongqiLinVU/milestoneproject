# Seed Mutation Catalog — manual "meta-harness" for AI Session Intake

Purpose: make the **mutation score** metric from `docs/intake-harness/REPORT_02.md`
computable *today*, before StrykerJS is configured. Each row is a real,
one-line fault ("mutant") in the code under test, and the test expected to
**kill** it (fail when the mutant is applied). A surviving mutant is a concrete
"write/strengthen this test" instruction.

How to use manually:
1. Apply one mutant (edit the referenced line as described).
2. Rebuild + run the relevant suite: `npm test` (deterministic) and/or
   `npm run test:integration` (endpoint).
3. Record KILLED (a test failed) or SURVIVED (all green).
4. Revert the mutant. Never commit a mutant.

Mutation score = KILLED ÷ total. Track it in each harness report.

References are to `src/intakeHarness.ts` (IH), `src/intakePolicy.ts` (IP), and
`api/session-intake-ai.ts` (API) at the time of writing.

| ID | Location | Mutant (change) | Fault it simulates | Expected killer test |
|---|---|---|---|---|
| M1 | IH `fallbackQuestion` | Change `const a = answers ?? {}` back to using `answers` directly | The exact provider-failure crash from Report 01 | `fallback-nullsafe.test.mjs` (unit) + integration turn scenarios |
| M2 | IH `grounded` | Make the unknown-identifier check `return true` instead of `return false` | Accepts a commit/URL/ID the student never mentioned (fabricated reference) | adaptive `policy.test.mjs` grounding cases |
| M3 | IH `validateCandidates` | Delete the `executed_test_needs_method_and_observation` reject | Accepts an "executed" test with no method/result | `malformed executed test fails confirmation validation` |
| M4 | IH `validateCandidates` | Delete the `unexecuted_test_has_observation` reject | Lets a planned/unknown test carry a fabricated observed result | **MEASURED KILLED (2026-09-27)** by `M4: a planned testing candidate with a fabricated observed result is rejected...` + `M4: an unknown testing candidate carrying an observed result is likewise rejected...` (adaptive `policy.test.mjs`). NOTE: the previously-named killer `unknown test with fabricated observed result is rejected` targets `validateIntakeStudentRecord` (final-record validation, `aiSessionIntake.ts`), NOT this candidate-validation guard — that is why M4 first SURVIVED. |
| M5 | IH `validateCandidates` | Change `matches.length !== 1` to `>= 1` | Accepts an ambiguous source pointer (picks first of many) | adaptive source-grounding cases |
| M6 | IH `validateCandidates` | Remove the `future_action_not_student_accepted` reject | Records a future action the student never agreed to | `accepted next-session action closes...` / future-test cases |
| M7 | IH `decideTurn` | Change `limit = questionCount(...) >= MAX` to `> MAX` | Off-by-one: allows a 9th question past the budget | integration `multi-turn stays within the 8-question ceiling` |
| M8 | IH `decideTurn` | Force `const teacher = false` | Ignores an explicit Teacher-help request | integration `teacher-help request routes to support` + adaptive teacher case |
| M9 | IH `decideTurn` | Change `established` to drop the `verificationMethod` term | Marks review-ready without a verification route | adaptive early-review / established cases |
| M10 | IH `safeMessage` | Make `safeMessage` always return the string (skip `unsafeMessagePatterns`) | Lets the model claim it graded/verified/accused the student | **MEASURED KILLED (2026-09-27)** by `M10: an assistant message claiming the work was marked/verified is discarded...` + `M10: ...accusing the student of cheating is discarded, but valid evidence...is still extracted` (adaptive `policy.test.mjs`); the pre-existing `the none message policy lets an actually unsafe assistant message through` also fails under the mutant. Prior state was GAP (no dedicated killer). |
| M11 | IP `conversationErrors` | Change `turns.length < 2` to `< 1` | Accepts a malformed single-turn conversation | integration `request validation` + adaptive record tests |
| M12 | IP `questionCount` | Count `review transition` turns as questions too | Miscounts budget, forces premature review | integration budget scenario |
| M13 | API turn fallback | On provider failure, return `res.status(500)` instead of the 200 fallback | Provider failure crashes instead of preserving answers | integration turn scenarios (would surface as 500) |
| M14 | API auth | Skip the `authenticatedStudent` 403 when token missing | Unauthenticated access to intake | **MEASURED KILLED (2026-09-27)** by `M14: an unauthenticated request (no token) is refused before any auth, student-context, or model call` (adaptive `endpoint.test.mjs`, mock harness). NOTE: the integration `access control` scenario uses a VALID token with a bad session id and exercises the context path, NOT the no-token 403 branch — it did not protect M14. |

## Measured mutation score (manual, deterministic + mock endpoint)

Measured 2026-09-27 on branch `integration-tests-m4-m10-m14`. Each mutant below
was injected in isolation, the exact code under test was rebuilt
(`npm run test:build`, which regenerates `.test-build/` and `.test-api/` from
`src/` and `api/`), the mutant's absence/presence was confirmed in the compiled
artifact, the relevant suite was run, then the mutant was reverted and the suite
re-run green.

| ID | Outcome | Evidence the mutant was in the tested build |
|---|---|---|
| M4 | **KILLED** | `grep -c unexecuted_test_has_observation .test-build/intakeHarness.js` = 0 with mutant; both M4 tests failed (decision `accepted` instead of `rejected`); restored → 49 pass |
| M10 | **KILLED** | `unsafeMessagePatterns` no longer referenced inside `safeMessage` in `.test-build/intakeHarness.js`; 3 tests failed (2 new M10 + pre-existing `none message policy`); restored → 49 pass |
| M14 | **KILLED** | `grep -c authentication_failed .test-api/api/session-intake-ai.js` = 0 with mutant; M14 test failed (`body.code` became a null-deref `TypeError` message, not `authentication_failed`); restored → 8 endpoint tests pass |

Previously-recorded predictions that are now MEASURED: M4 was a **measured
survivor** on 2026-09-27 before this slice; M10 and M14 were **predicted**
survivors (no dedicated killer test). All three are now **measured KILLED** by
tests added in this slice. Remaining catalog rows (M1–M3, M5–M9, M11–M13) are
still **predictions** — their named killers have not been individually
mutation-verified in this slice.

## Known coverage gaps this catalog reveals

- ~~**M10 (assistant-message safety) has no dedicated killer test.**~~ **CLOSED
  2026-09-27** — `policy.test.mjs` now asserts `decideTurn` discards a message
  that claims the work was marked/verified and one that accuses the student of
  cheating, replacing it with the deterministic fallback, while still extracting
  independently valid evidence.
- ~~**M14 (unauthenticated access)** — the integration `access control` scenario
  uses a valid token with a bad session id; it does not assert the *no-token* 403
  path.~~ **CLOSED 2026-09-27** — `endpoint.test.mjs` now drives the real handler
  with no Authorization header and asserts a 403 `authentication_failed` before
  any auth lookup, Supabase read, or provider call.

Mutation testing (arXiv 2103.07189) surfaced these holes; the catalog turns "we
think we're covered" into a concrete, countable to-do list. The remaining
predicted rows are the next candidates to convert from prediction to measurement.

## Notes

- This manual catalog is a bootstrap. Once StrykerJS is configured
  (`buildCommand` = the `tsc` test build, `mutate` = `src/intakeHarness.ts`,
  `src/intakePolicy.ts`), it will generate hundreds of mutants automatically and
  compute the score without hand-editing. Keep this file as the curated,
  high-value subset with named expected killers.
- Never leave a mutant applied. If a mutant cannot be killed by any existing
  test, that is a finding, not a failure — log it as a survivor and add a test.
