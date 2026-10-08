# S8-B3 Live Baseline Report (v2, executed) — one T1 S1–S4 run on gpt-5-mini

Version: v2.0 · 3 October 2026 · Prepared by Claude for Joseph / ChatGPT review
Scope: ONE approved live T1 S1–S4 longitudinal baseline, `gpt-5-mini`, conservative
budget guard **US$0.65** (Joseph-approved). No production changes, no migrations,
no push/merge/deploy. Single run; not restarted; guard not increased.

> SYNTHETIC WARNING: T1 is synthetic. This is one non-deterministic live run, not
> classroom evidence. Reported separately from offline stub results.

---

## 1. Outcome at a glance

- Run **executed once** on `gpt-5-mini`. All four Sessions ran. Guard **not reached**.
- **Cost (known vs reserved, kept separate):**
  - **Known usage cost (actual): US$0.184835** — 31 endpoint calls, **all 31 with
    usage, 0 missing** (input 51,652 tok, output 85,961 tok).
  - **Estimated unknown retry reserve: US$0.41075** — a conservative reserve for a
    possible unreported retry attempt on each call. **This is a reserved estimate,
    NOT actual spending.**
  - Conservative accounting total (known + reserve) = **US$0.595585**, under the
    **$0.65** guard (`capReached=false`).
- **Per-Session scores** (v1.1 attribution; R before/after correction separate):

| Session | C% | R_intakeOnly% | R_afterCorrection% | corrections | persisted | provider |
|---|---:|---:|---:|---:|---|---|
| S1 | 20 | 100 | 100 | 4 | no (record invalid) | ok |
| S2 | 20 | 100 | 100 | 4 | no (record invalid) | ok |
| S3 | 40 | 100 | 100 | 4 | no (record invalid) | ok |
| S4 | 40 | 100 | 100 | 5 | **yes** | ok |

- **Run label: `independent_session_diagnostics`, NOT longitudinal** — S1–S3 did
  not persist, so no candidate history was carried across Sessions.
- Full JSON: `tests/ai-session-intake/replay/out/dynamic-t1-live.json`. The prior
  run was preserved first at `out/dynamic-t1-live.PRE-065-RUN.json`.

## 2. Cost accounting (known vs reserved, separate)

- Model `gpt-5-mini`; pricing $0.25/1M input, $2.00/1M output.
- **Known (actual reported) usage:** $0.184835 over 31 usage-bearing calls. Every
  call returned usage this run (`callsMissingUsage=0`).
- **Reserved unknown (estimate, not spend):** $0.41075. Per the corrected
  accounting, each successful call reserves one possible unreported retry attempt
  (`MAX_COST_PER_ATTEMPT` ≈ $0.01325) because the endpoint's returned `usage`
  reflects only the final attempt. 31 × $0.01325 ≈ $0.41075. No call actually hit a
  missing-usage path, so this is purely conservative headroom.
- Guard: a new call proceeds only if `knownUsd + unknownUsd + MAX_COST_PER_CALL ≤
  cap`. The guard stopped nothing this run (31 calls completed; total $0.5956 <
  $0.65). The guard is **conservative, not a provable hard cap** (the 21,000-token
  input bound is an estimate; see offline report §10.3).

## 3. Persistence and carryover (verified, honest)

- The driver attempted to persist each confirmed Session into the **isolated
  fixture student** (`t1bench01`) via `save_my_session_intake_chat`, called as the
  student (JWT).
- **S1–S3 failed to persist**, **S4 succeeded.** Root cause (diagnosed locally, no
  extra calls): `validate_session_intake_student_record_v11` rejected S1–S3 with
  "one or more claims are invalid" + "evidence references an unknown claim". The
  specific trigger is an **empty `claim.scope`** (the validator requires scope 2–500
  chars): S1/S2/S3 had `scope=""`; S4's model extraction populated `scope` (42
  chars) so its record validated and persisted.
- **This is a benchmark driver/flow gap, not a production or save-RPC defect:** the
  review/correction step fills `dueSession`, `nextAction`, `expectedEvidence`,
  `verificationMethod`, `responsibility` from the student's authorized facts, but
  **not `scope`**. The real UI's review step exposes a scope field the student can
  fill; the driver's `confirmField` set omits it. Per the task, this is
  **documented, not silently repaired** (fixing it would require a driver change
  and a re-run, which this single-run task does not permit; also I must not fill
  `scope` from gold or invent it).
- **Carryover:** `carryoverEvidence` shows `priorPersistedCount: 0` before S2, S3,
  and S4 — because S1–S3 never persisted, no real prior history existed to carry.
  S4 persisted but is the last Session, so cross-Session carryover was **not
  exercised** this run. Real carryover remains verified only in the offline
  controlled flow (offline report §3); it was not demonstrated live here because of
  the scope-driven persistence failures. No gold/expected history was substituted.
- Post-run DB check: **1 persisted row (S4), student `t1bench01` only** — no
  unrelated or seeded student history was written. The isolated S4 test row was
  then cleaned; the fixture roster was preserved.

## 4. Collection (C) and the dominant live behavior

C fell to 20–40% (vs 80–100% in the pre-repair run) because the **repaired
answer-bank** no longer auto-releases undisclosed facts on vague/summary questions,
and the real model's questioning did not elicit the remaining facts. The S1 trace
shows why: the model asked for the repository path **6+ times**, and the student
correctly returned the **honest "not recorded" answer each time**
(`repo_path_honest_no_leak` ×7) **without leaking other facts or inventing a path**
— the repaired behavior working as designed. The model exhausted its question
budget on repeated repo-path requests and never reached C2/C4/C5. This is faithful
signal, not a scoring error.

R_intakeOnly and R_afterCorrection are both 100% for every Session: the facts that
*were* elicited were faithfully retained by the Intake, and the review corrections
(4–5 per Session, each explicit with `authorizedSource` + before/after) only
supplied missing required fields from the student's own authorized facts — they did
not repair any dropped elicited fact. Session success is false everywhere because C
has gaps (not all essential facts elicited) and S1–S3 did not persist.

## 5. Preserved evidence

- Original prior run preserved at `out/dynamic-t1-live.PRE-065-RUN.json`.
- New run JSON `out/dynamic-t1-live.json` retains: full per-turn conversation,
  real model questions, student disclosures, accepted/rejected fields, routing
  ambiguities (incl. the honest repo-path answers), per-fact C and R-before/R-after
  with reasons, explicit `reviewStageCorrections` (field/before/after/authorizedSource),
  `turnLoopCandidate` (pre-edit record), persistence outcome + errors,
  `carryoverEvidence`, and cost (known vs reserved separate). Failures and the S4
  correction chain are retained; nothing was trimmed to improve scores.

## 6. Findings (candidates for the later Harness phase — not fixed in this run)

1. **Empty `claim.scope` blocks persistence.** The review step should expose/collect
   `scope` from the student (as the real UI does) so a schema-complete record can
   persist; the benchmark `confirmField` set should include a student-authorized
   scope. (Benchmark driver change for a later phase; not done here to respect the
   single-run / no-gold-fill constraints.)
2. **Repeated repo-path requests** by the model empirically reproduced (S1, 6+
   times) — a product prompt/policy concern already logged; the student simulator
   handled it honestly.
3. **Low C under the repaired bank** reflects the real model's narrow questioning,
   not a scorer defect — useful teaching-realism signal for prompt iteration.

## 7. Compliance and stop

- Known usage cost and estimated unknown retry reserve reported **separately**;
  reserved amounts explicitly **not** described as actual spend.
- Original results preserved; real persisted-history carryover checked (not
  exercised live due to S1–S3 persistence failures — reported honestly, no
  substitution).
- Failures, student corrections, and scoring evidence retained.
- Stopped at the single run; guard **not** increased; **not** restarted.
- No production behavior modified; API server stopped and temp build cleaned after
  the run; isolated test row cleaned, fixture roster preserved.

Deliverables: this report and `out/dynamic-t1-live.json` (full trace), with the
preserved prior run at `out/dynamic-t1-live.PRE-065-RUN.json`, for Joseph review.
Finished after this single run.
