# AI Intake Benchmark v0.5 — Independent Review

Reviewed: `docs/AI_Intake_Benchmark_v0.5_Review_Pack.md`
Nature: Read-only independent review. No runner implementation, no production changes, no paid model calls, no edits to the benchmark document itself.
All alternate conversations below are reasoning examples, not actual model runs. Synthetic walkthroughs cannot demonstrate real classroom effectiveness.

---

## Verdict

**MINOR REVISION — ready for Teacher adjudication after minor edits.**
This is a review-readiness judgement, not deployment approval.

Top three reasons:
1. The two-layer standard, stage definitions, dual gold objects (disclosure-conditioned record vs. essential elicitation targets) and the "approval is not verification" separation are sound, and are semantically consistent with the production evidence model (`DeterministicIntakeAnswers`, Gate A/B/C). They are reusable.
2. A few operationalization gaps would block *repeatable scoring*: the turn cap / minimum question count is not aligned with the code, semantic-equivalence judging has no adjudication procedure, the variants' essential-target coverage rule is undefined, and the stated variant count ("24") does not match the number actually listed. These are locally fixable editorial issues that do not undermine the design.
3. Some Session golds risk failing a *good* conversation (early stopping, combined questions, the promise-but-not-retested boundary). The scoring rules must state clearly where "an honest unknown caused by a missing question is missed elicitation, not fabrication" lands in the score.

---

## Strengths (at most five)

1. **Clear dual gold objects**: disclosure-conditioned record vs. essential elicitation targets are separated, and "an unknown caused by a missing question is missed elicitation, not fabrication" — consistent with the code's explicit storage of `unknown` testing (`src/intakePolicy.ts`, `applyEvidenceUpdates`).
2. **"Approval ≠ verification" runs through TA-01/TA-02**: scope changes (removing North Annex, interface clarification) are explicitly decision-only and do not constitute result verification — consistent with Gate A `G05`.
3. **Per-Session forbidden-assertion lists** map directly onto Gate A `G07/G08` (Claim/Evidence/Verification separation; failed / no-progress / not-required-evidence remain distinct) and the critical-false-claim failure conditions.
4. **Longitudinal fairness**: requires carrying the candidate's own outputs rather than silently repaired gold, and evaluates cumulative drift separately from the current record, preventing later repair from erasing an earlier failure.
5. **Proportionate evidence**: a no-progress Session needs no artifact; a design note, demo or report is a valid verification route; no Intake-derived completion percentage is forced — consistent with the product's "Teacher verification first" positioning.

---

## Findings

| ID | Severity | Section / Session | Evidence (short) | Evaluation consequence | Smallest correction | Teacher decision? |
|---|---|---|---|---|---|---|
| F-01 | blocking benchmark validity | §2 turn cap; §3 | Doc says "confirm the production turn cap" in three places, but the code already fixes it: `MAX_INTAKE_QUESTIONS=8`, `MAX_INTAKE_TURNS=17`, 3 core directions + 0–5 follow-ups (`src/intakePolicy.ts`, `tests/.../adaptive/README.md`) | If reference scripts are scored against "4 info-seeking questions + summary = 5 responses", this conflicts with the production 8-question cap and misjudges burden / early stopping | Replace the "confirm cap" placeholders with the code constants; label the reference 5 responses as an example lower bound, not the cap | No (editorial; align to existing code) |
| F-02 | major | §2 semantic routing | "Semantic equivalence accepted", "no exact-string score", but no judging procedure — only "log fixture ambiguity" | Different reviewers judge "essential target hit" inconsistently → scoring not repeatable | Add a minimal adjudication procedure: two reviewers independently judge hit/miss; disagreement > 0 is recorded and adjudicated (reuse EVALUATION_STANDARD §5.5–5.6) | Yes (scoring procedure) |
| F-03 | major | §2 variant scope "24 entry variants" | Each Session lists only 2 variants × 12 = 24, but variants only replace U1; the gold coverage rule for U2–U4 is undefined | Unclear whether variant paths require the same essential targets as the reference path → missed-elicitation counting rule undefined | State: "variants change only the opening style; U2–U4 gold matches the reference path; later facts are disclosed only when a relevant question is asked" | Yes (coverage rule) |
| F-04 | major | T1-S4 / T2-S4 / T3-S4 | Promise-vs-retest boundary: S4 shows "fixed but not retested" / "integrated but quality unmet" — a good conversation that stops early may miss the "remaining gap" | An early-stopping, faithful candidate may be failed even with no false claim | Clarify Session-success rule: as long as "not retested / not met" is faithfully preserved and there is no critical false claim, it is a pass; a missed remaining-gap is reported separately as an elicitation gap | Yes (pass boundary) |
| F-05 | minor | §2 early stopping vs. answer-bank | The boundary between "a vague first follow-up reveals the next progress fact" and "repeated vague → Which part?" is not quantified | Simulator routing ambiguity → hard to distinguish invalid simulator inventions from valid Intake failures | Operationalize "vague": no field pointer = vague; the first one yields one next-progress fact, thereafter uniformly "Which part do you mean?" | No (fixture rule) |
| F-06 | minor | §3 metrics | "Conversation burden" says "actual elapsed time only after real runs", yet the synthetic phase still lists it in the table | Synthetic phase misreports a time metric | Note in the table: the synthetic phase reports only info-question count / repeated-question count; elapsed time is deferred to real runs | No |
| F-07 | minor | §4 T2 North Annex | TA-01 removes North Annex; S4's test destination is "separate from North Annex" — ensure gold is not failed merely for mentioning the removed item | Reviewers might mis-record "mentioning a removed scope item" as a scope violation | Next to T2-S4 forbidden: "mentioning a removed item to explain the test choice is not a scope violation; only reinstating it is" | No |
| F-08 | minor | §2 U5 confirmation | U5 is conditional confirmation, but the ordering of "a premature summary does not pass" vs. "confirmation does not supply missed facts" in scoring is undefined | Failure attribution in the summary stage (missed question vs. premature summary) may be double-counted | Rule: missed question → elicitation gap; premature summary / uncorrected → summary fidelity (Q5) failure; the same defect is not double-counted | Yes (score attribution) |

---

## Twelve-Session Audit

| Session | Gold consistency | Target clarity | Branch usability | Issue / none |
|---|---|---|---|---|
| T1-S1 | Consistent: design not implementation; interface dependency not Teacher help | Clear (ownership / design-vs-impl / dependency / route / next) | Concise/Optimistic usable | none |
| T1-S2 | Consistent: mock not live; B's API not A's work | Clear | Detail-heavy/Optimistic usable | none |
| T1-S3 | Consistent: normal pass / changed-slot fail coexist, cause unresolved | Clear | usable | none |
| T1-S4 | Consistent: correction supersedes "complete"; changed-slot not retested | Clear | usable | F-04 (early-stop gap risk) |
| T2-S1 | Consistent: proposal ≠ approval; Teacher decides two scope items | Clear | usable | none |
| T2-S2 | Consistent: no new progress, missed commitment, reason without intent judgement | Clear | Brief/Evasive usable | F-05 (vague boundary) |
| T2-S3 | Consistent: TA-01 authorizes scope but does not verify work; independent lookup not integration | Clear | usable | F-07 (removed-item wording) |
| T2-S4 | Consistent: valid integration by claim / no-route failure | Clear | usable | F-04 |
| T3-S1 | Consistent: spec suitability ≠ measured performance; not assembled | Clear | Concise/Detail-heavy usable | none |
| T3-S2 | Consistent: after detail-heavy opening must return to module-level result; unstable | Clear (technical detail not required wire-by-wire) | usable | none |
| T3-S3 | Consistent: personal stability ≠ team integration success; cause unresolved, no blame | Clear | Optimistic/Concise usable | none |
| T3-S4 | Consistent: integration succeeds but one point exceeds threshold (1.4°C); three points do not extrapolate to full range | Clear (numbers optional, failure must be retained) | usable | F-04 |

Audit conclusion: 12/12 Session golds are internally self-consistent; no intrinsic contradictions. All risk concentrates on "is a good conversation that stops early / combines questions scored fairly" (F-04/F-05/F-08) — a scoring-procedure matter, not a gold error.

---

## Three Alternate Paths (reasoning examples, not actual runs)

### Path 1 — T1-S3 · Concise variant
- Chosen: T1-S3, U1 = Concise "Normal booking works; changing slot fails."
- Actual disclosures (only via relevant questions):
  - Combined question "both path outcomes + evidence?" → reveals normal saved OK, changed-slot showed old confirmation, `booking-integration-s3.md` (U1+U2+part of U3 combined hit).
  - "Is the cause clear / need help?" → cause not isolated, joint investigation, no Teacher decision now (U3).
  - "Next step?" → check UI with B, retest both paths after fix, whole flow not complete (U4).
- Permissible final gold: Integration/testing mixed; R2 normal claim, R3 partial, R4 changed-slot failed; no blame; Teacher verification pending.
- Unrevealed facts: none (the combined question covered the whole bank). Three exchanges suffice for a pass; early stopping is legitimate.

### Path 2 — T2-S2 · Evasive variant
- Chosen: T2-S2, U1 = Evasive "Coming along; have something soon."
- Actual disclosures:
  - First vague answer → per F-05 rule, one next-progress probe "did the decision/interface happen?" → reveals note not brought, interface unfinished, another assessment took time (U1).
  - "Any implementation or approval?" → no implementation, static still a proposal, team waiting, no approval (U2).
  - "Smallest useful step / help needed?" → existing `route-options.md` available, needs the same Teacher scope decisions (U3).
  - "Commitment before next Session?" → show the note, record the decision, agree a minimum interface with B/C (U4).
- Permissible final gold: no new progress, missed commitment, approval pending, recovery action accepted; evidence existing rather than newly produced.
- Unrevealed facts: none unlisted; the Evasive opening adds one clarification question (burden +1) but does not change the gold — this tests whether "repeated vague → Which part?" triggers.

### Path 3 — T3-S4 · Optimistic variant
- Chosen: T3-S4, U1 = Optimistic "Displays now and report ready, so finished."
- Actual disclosures:
  - "Finished" is an unsupported leading claim → corrected per protocol; probe "did the reference comparison meet target?" → three points 0.6/1.4/0.8°C, middle exceeds 1°C, calibration remains (U2).
  - "What can Teacher check / open gap?" → live demo + `sensor-validation-s4.pdf`; interface resolved, calibration and retest open (U3).
  - "Next step?" → calibrate, then retest with B recording results (U4).
- Permissible final gold: R2/R3 integration by claim, R4 one point failed, R1 three points do not prove full range; action commitment addressed, calibration open; no Teacher verification.
- Unrevealed facts: "finished" must not be recorded into the gold because of the Optimistic opening (Forbidden: all tests passed / ≤1°C everywhere). This path tests whether an optimistic opening is downgraded to a claim and triggers a correction.

All three paths avoid filling gaps with hidden facts; after F-02/F-04 fixes, early stopping / combined questions can be scored as a fair pass.

---

## Metrics (≤3)

Keeping three main outcomes is sufficient; no weighted aggregate is needed:

1. **Session success (keep)**: recommend writing the F-04 boundary explicitly into the rule — "faithfully preserving the remaining gap + no critical false claim = pass; a missed remaining-gap is recorded separately as an elicitation gap, not an automatic fail." Otherwise a faithful, early-stopping conversation is killed unfairly.
2. **Trajectory success (keep)**: at S4, personal progress / relevant requirements / integration / unresolved decisions / evidence routes can be reconstructed with no material drift. Recommend stating explicitly that "an early failed Session is still reported separately even if repaired later" (the doc says this; just land it in the score table).
3. **Conversation burden (keep but narrow)**: the synthetic phase reports only "info-question count + repeated/unnecessary-question count + Teacher relevance judgement"; remove or clearly defer "actual elapsed time" (F-06). The cap is the code's `MAX_INTAKE_QUESTIONS=8`, not the reference script's 5 responses (F-01).

The diagnostic-error list (missed fact / meaning changed / ownership error / integration-test inflation / evidence inflation / continuity loss / unnecessary question) is retained as labels with no weighting — consistent with the existing EVALUATION_STANDARD. I agree with not introducing an aggregate score.

---

## Read-only Compatibility Findings (with file references)

Confirmed in the repository (read-only):

- **The turn / question cap is already fixed in production code**: `src/intakePolicy.ts` — `MAX_INTAKE_QUESTIONS = 8`, `MAX_INTAKE_TURNS = 17`, `INTAKE_POLICY_VERSION='adaptive-intake.v1.1.0'`, `INTAKE_PROMPT_VERSION='session-intake-ai.v1.3.0'`. The benchmark's three "confirm the production turn cap" placeholders should reference these constants directly (F-01).
- **"A future test cannot erase an executed test" is already implemented**: in `src/intakePolicy.ts` `applyEvidenceUpdates`, `if (next.testingStatus === 'executed' && u.state !== 'executed') continue;` — directly supports the T1-S4/T2-S4/T3-S4 gold that "a promised retest does not overwrite an existing result." Good compatibility.
- **Conversation structure constraints**: `conversationErrors` enforces system/student alternation, a final `review transition`, ≤2000 chars per turn, and `questionCount` excludes the review transition — compatible with the benchmark's definition of "one assistant prompt + one student response = one turn."
- **The existing evaluation standard is reusable**: `tests/ai-session-intake/EVALUATION_STANDARD.md` — its Gate A(G01–G14) / Gate B(Q1–Q6) / Gate C overlaps heavily with this benchmark's forbidden assertions, diagnostic errors and longitudinal fairness; the benchmark should reference it explicitly rather than rewrite it, to avoid a drifting duplicate standard.
- **Existing multi-turn Harness coverage**: `tests/ai-session-intake/adaptive/README.md` records Harness v1 (29 local passes) and v2 chained multi-turn scenarios (provider fallback, early stopping, Teacher escalation, 8-question exhaustion). The benchmark's "fixed-transcript replay first, then adaptive scripted routing" is compatible.

Unassessed / not verified (consistent with the document): real-model quality, database audit, authenticated UI submission, longitudinal classroom outcomes — this review does not touch these.

---

## Questions for Joseph (≤5)

1. **[Teaching decision]** Adopt F-04: faithfully preserving the remaining gap with no critical false claim = pass, and a missed gap is only recorded separately as an elicitation gap? (Affects all S4 judgements.)
2. **[Teaching decision]** Do variants change only the U1 style with U2–U4 gold matching the reference path (F-03)? Or should variants have independent gold?
3. **[Scoring procedure]** Adopt two-reviewer independent semantic hit judging + disagreement adjudication as the repeatable procedure for "semantic equivalence" (F-02)?
4. **[Teaching decision]** Set the burden cap to the production `MAX_INTAKE_QUESTIONS=8`, downgrading the reference script's 5 responses to an example lower bound (F-01)?
5. **[Editorial]** Agree that the benchmark should reference the existing `EVALUATION_STANDARD.md` Gate A/B/C rather than maintain a parallel standard, to avoid a drifting duplicate?

---

## Minimal Revision List & Next Step

Minimal revisions (no scenario rewrite, no new documents):
1. F-01: replace the three "confirm the production turn cap" placeholders with the code constants (8 questions / 17 turns / 3 + 0–5).
2. F-02: add a short "semantic hit" two-reviewer adjudication procedure (can reference EVALUATION_STANDARD §5).
3. F-03: add one line on variant coverage (opening only changes; later facts disclosed only when a relevant question is asked).
4. F-04 + F-08: add two sentences to §3 Session success on the pass boundary and failure attribution (missed question vs. premature summary, no double-counting).
5. F-05/F-06/F-07: three marginal notes (vague operationalization, no elapsed time in the synthetic phase, removed-item wording).

Next step: Joseph adjudicates the 5 questions above → accept/reject findings → apply minimal edits → freeze v1. **This review does not authorize** runner implementation, schema/production changes, or paid calls.

Major disagreements (need discussion): F-01 (script's 5 responses vs. the code's 8-question cap) and F-04 (the pass boundary for an early-stopping, faithful conversation) — without adjudicating these two, "repeatable scoring" cannot be achieved. The rest are editorial.

Restated: the alternate walkthroughs above are synthetic reasoning examples and cannot demonstrate real classroom effectiveness or population accuracy.
