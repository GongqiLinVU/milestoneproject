# AI Session Intake Benchmark Standard v1 (draft)

Version: `intake-benchmark-standard.v1-draft` · 30 September 2026
Phase: Sprint 8 Closeout Phase A · Prepared by Claude for Joseph / ChatGPT review
Status: DRAFT — proposals, not frozen. Freeze requires Joseph's review (Phase A acceptance).

This document defines the minimal, reproducible scoring standard for the AI
Session Intake benchmark. It follows the fixed scope and Section 3 of
`Sprint8_Closeout_Plan_Claude_Handoff_EN_2026-09-30.md`. It does not authorize a
runner, production changes, or paid model calls. It reuses, rather than replaces,
the existing `tests/ai-session-intake/EVALUATION_STANDARD.md` gates.

---

## 1. What this standard measures

Whether one Intake conversation, and a trajectory of consecutive Sessions for the
same student and project, lets the Teacher understand:

- the student's owned module and current change;
- the relevant stage (planning / research / design / implementation / integration / testing; overlap and revisiting allowed);
- actual team integration and dependencies;
- actual verification status and the evidence route;
- blockers and Teacher-help requests;
- an accepted next step;

without material unresolved drift, and without any critical false claim.

Verification, contribution judgement and marks remain Teacher-controlled. The
standard scores the *conversation and record*, not the beauty of a single reply,
and never a student's honesty or generative-AI use.

---

## 2. Units and definitions

- **Turn**: one assistant prompt and its student response. In the stored
  transcript this is one `system` message followed by one `student` message
  (`src/intakePolicy.ts` enforces strict `system`/`student` alternation, a final
  `review transition`, ≤ 2000 chars per message).
- **Question**: a `system` turn whose purpose is not `review transition`
  (`questionCount` in `src/intakePolicy.ts`).
- **Turn/question caps (verified in code, not assumed)**:
  `MAX_INTAKE_QUESTIONS = 8`, `MAX_INTAKE_TURNS = 17`; three core directions plus
  zero to five follow-ups; early review allowed. Provider retries do not add
  questions. **The technical maximum (8 / 17) is not the desired teaching
  burden**; burden is an auxiliary record (§7), not a score.
- **Essential fact (collection target)**: a material fact a useful conversation
  should obtain for a given Session, frozen in advance for that Session.
- **Disclosed fact (recording target)**: a material fact the student actually
  revealed in the current turns or authorized context, which the record should
  retain.
- **Two gold objects** (kept separate):
  1. *Disclosure-conditioned record gold* — facts actually disclosed; unrevealed
     information stays unknown.
  2. *Essential elicitation targets* — material facts a useful conversation
     should obtain. An honest unknown caused by a missing necessary question is a
     **collection gap**, not fabrication.

---

## 3. Scoring: Collection (C), Recording (R), Session success (S)

Per Session, predefine the applicable essential facts and explicit 0/1/2 anchors.
Choose only what is necessary for the stage. Do not require every field every
Session, and do not penalize truthful lack of progress.

### 3.1 0/1/2 anchors

| Score | Collection C_ij (was the necessary situation clarified?) | Recording R_ij (was a disclosed fact retained faithfully?) |
|---|---|---|
| 0 | Necessary situation not clarified, or a misunderstanding left unresolved | A required disclosed fact omitted, incorrect, or a correction lost |
| 1 | Partly clear, with ambiguity that affects Teacher judgement | Main meaning preserved, but material scope/status ambiguity remains |
| 2 | Necessary situation explicit — including "unknown", "not done" or "not needed" when clearly stated | Facts, ownership, timing and uncertainty recorded faithfully |

### 3.2 Formulas

```
C_i = 100 × Σ_j e_ij / (2 × m_i)
```
`m_i` = number of essential facts frozen for Session i; `e_ij` ∈ {0,1,2} is its
collection score.

```
R_i = 100 × Σ_j r_ij / (2 × d_i)
```
`d_i` = number of actually disclosed facts that should be retained; `r_ij` ∈
{0,1,2} is its recording score.

Rules:
- Required record facts must **not** be selected retrospectively from the model's
  output. The denominator `d_i` is fixed from what was disclosed.
- Disclosed facts the model omitted still count in the `d_i` denominator (they
  score 0, they are not removed).
- When no record facts can be assessed, `R_i` is **N/A**, not 100%.
- Always show numerators/denominators and any N/A explicitly.

### 3.3 Suite aggregation

Suite C and R are **equal-weight means across applicable Sessions**, with
per-Session values also shown. This prevents longer answers or field-heavy cases
from dominating. Per-Session `m_i`/`d_i` granularity, once frozen, must not be
changed just to improve scores.

### 3.4 Session success

A Session succeeds when **all** hold:
- every frozen essential collection item scores 2;
- every essential disclosed recording item scores 2;
- no critical error (§4);
- a valid final record exists.

```
S = 100 × successful Sessions / valid test Sessions
```

Notes:
- Explicit student uncertainty **can** pass ("unknown"/"not done"/"not needed").
- Unknown *because the assistant failed to ask* is a **collection gap** (scores
  below 2 on that item), not a pass.
- Early stopping is allowed when facts are sufficient; reference dialogue length
  is **not** a minimum.

---

## 4. Critical errors (automatic Session failure)

A critical error fails that Session and **cannot** be offset by high C/R:

1. Fabricated completion or test outcomes.
2. A plan represented as execution (planned-as-executed testing).
3. Teammate work attributed to the student.
4. Invented Teacher approval, verification or marks.
5. Failure to preserve a student correction.

Additionally, detect **other invented facts separately** (an invention that falls
outside the R denominator must not escape evaluation). Report such inventions with
counts and the turn they appeared in.

This list is the benchmark-scoring projection of Gate A `G05/G06/G07/G08` in
`tests/ai-session-intake/EVALUATION_STANDARD.md`; it does not replace those gates.

---

## 5. Validity and separate reporting

- **Simulator invalidity** (e.g., a student simulator introducing unscripted or
  future facts) is reported separately with counts and reasons, **never silently
  discarded**.
- An API/provider/execution failure in a valid task **without** a final record is
  **not** a success.
- If a deterministic fallback produces a qualifying result, score *that* result
  and retain the failure marker.
- Every comparison must show invalid trials and execution failures, so a changing
  denominator cannot hide a regression.
- Replay vs. dynamic (see §6) must be reported separately.

---

## 6. Replay vs. dynamic separation

Two distinct modes, never conflated:

- **Fixed-transcript replay** — feed a recorded conversation; assess **R** and
  state checks (extraction/summary/correction). Replay **cannot** prove the
  candidate would have *elicited* facts absent from the transcript; it is an
  extraction baseline only. C and S are computed only where their evaluation
  conditions genuinely exist.
- **Dynamic scripted branches** — the candidate asks its own questions and an
  answer-bank routes by meaning (semantic equivalence; no exact-string score).
  This tests **C** and **S**. Dynamic branches require Joseph's review before
  becoming a collection benchmark.

Longitudinal runs carry the candidate's own outputs; isolated diagnostics may use
gold-context history. Never expose reference gold to the Intake. Never silently
replace previous candidate outputs with gold. A later repair does not erase an
earlier failed Session; evaluate cumulative drift and the current record
separately.

---

## 7. Auxiliary run records (not part of any score)

Recorded for every run, but never summed into an overall score:

- question count; repeated/irrelevant follow-ups;
- individual messages vs. information-seeking exchanges vs. confirmation vs.
  provider retries (kept distinct);
- tokens, cost, latency (real runs only; the synthetic phase does not report
  elapsed time).

No weighted overall score and no additional primary metric beyond C / R / S for
now.

---

## 8. Worked scoring examples

The examples use the de-identified `s9-continuing-chat-provider-fallback` record
(`tests/ai-session-intake/adaptive/recorded-cases-v2.json`) and illustrative
synthetic answers. **These are scoring illustrations, not measured model runs.**

### 8.1 Recording (R) example — replay mode

Disclosed facts in the S9 record (`d_i = 4`):

| Fact ID | Disclosed fact | Model retained? | r_ij | Note |
|---|---|---|---|---|
| F-R1 | Spinner added in commit abc123 (student claim, completed) | Yes, as `claim` student_claim | 2 | ownership + status faithful |
| F-R2 | Executed manual slow-network observation: spinner appeared until cards loaded (evidence available) | Yes, `evidence` available, live_demonstration, method + observed result | 2 | an executed observation; must be preserved, not downgraded |
| F-R3 | The API-error path specifically has not been tested yet | Yes, recorded as the untested API-error path; testing not executed **for that path only** | 2 | scoped to the API-error path; does not erase F-R2 |
| F-R4 | Student chose option A but is still blocked debugging the API error | Yes, `blocker` attempted_failed / active | 2 | blocker retained into fallback snapshot |

`R_i = 100 × (2+2+2+2) / (2 × 4) = 100 × 8 / 8 = 100%` (numerator 8, denominator 8).

F-R2 and F-R3 are distinct facts: the slow-network load **was executed and
observed** (evidence), while only the **API-error path** is untested. A candidate
must not collapse these into a single global "not tested" that erases the executed
slow-network observation. If the model instead dropped F-R3 (losing "API-error
path not tested"), `r` for F-R3 = 0 → `R_i = 100 × 6/8 = 75%`, and if the summary
then implied the error path was handled, that is critical error #1/#2.

### 8.2 Collection (C) is N/A for this replay

Because this is a *fixed transcript*, the candidate did not choose its own
questions; C is **not** computed here (§6). A dynamic branch built from the same
facts would be needed to score C, and requires Joseph's review first.

### 8.3 Session success example

If the frozen essential collection items for an S9-style "final readiness" Session
were {owned change, observable result/evidence, verification/testing status,
blocker, next step}, and a dynamic candidate elicited all five at score 2, made no
critical error, and produced a valid final record → the Session **succeeds**. If
it never asked about the untested API-error path (leaving it unknown by omission),
that item scores below 2 → **collection gap** → Session does not succeed, even
though the record of what *was* said is faithful.

---

## 9. Relationship to existing standards

- Reuses Gate A/B/C in `tests/ai-session-intake/EVALUATION_STANDARD.md`; C/R/S is
  the *benchmark scoring* layer, not a replacement for the engineering gates.
- Aligns with the v0.5 review pack's dual-gold model
  (`docs/AI_Intake_Benchmark_v0.5_Review_Pack.md`) and the
  `docs/BENCHMARK_V05_REVIEW_CLAUDE.md` findings (notably: turn cap = code
  constants). **§3.4 is authoritative on early stopping:** early stopping passes
  only when every essential collection item is established at score 2 and every
  essential disclosed fact is recorded at score 2. A missed essential collection
  fact scores below 2 on that item and therefore **prevents Session success** — it
  is not offset by a faithful record of what *was* said. "Reported separately"
  means the missed fact is logged as a diagnostic collection gap for analysis, not
  that the Session still passes.
- τ³-bench is a *structural* reference only (multi-turn, constrained user, final
  state, repeated trials); this standard does not adopt its scoring or claim a
  τ³-bench score.

## 10. Open items for Joseph (see S8-A_REPORT.md §Questions)

Freeze of `m_i`/`d_i` per Session, the semantic-hit adjudication procedure, and
whether real records are sufficient for a dynamic trajectory (currently they are
not — see the data-gap inventory) are pending Joseph's decision.
