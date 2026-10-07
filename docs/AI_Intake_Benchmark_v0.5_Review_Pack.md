# AI Intake Benchmark v0.5 — Standard and Three Complete Trajectories
30 September 2026 · Review draft · Synthetic scenarios, not actual model runs

Prepared for Joseph and Claude. Joseph accepted the two-layer direction; these scripts, gold labels and scoring require review before freezing. This is a standalone English review pack with a copyable Claude prompt. The reference questions/summaries below are authored examples, not measured AI outputs.

## 1. Objective and two-layer standard

The Intake replaces the progress form through a short conversation. Its record should let Teacher understand personal module progress, team delivery, material blockers/help, evidence routes and next milestones across Sessions, and support final submission evaluation. Teacher owns verification and marks. Detailed implementation belongs in code, demo or report unless it explains a milestone or blocker.

| Layer | Standard |
|---|---|
| Universal | Scope; personal ownership versus teammate work; stage/change; blocker and decision; actual team integration; evidence versus verification; continuity and next action. |
| Project-specific | Authorized goal, core requirements, modules/owners, dependencies, critical cross-module workflow, stage deliverables and checks, approved scope changes. |

The shared delivery baseline is core functionality, end-to-end integration/usability, and verification/quality. These are operational review criteria, not a replacement for the formal course rubric.

| Stage | Standard for meaningful progress |
|---|---|
| Planning | Scope, owners, dependencies and a feasible next deliverable are defined. |
| Research | A bounded uncertainty is investigated; conclusion or open decision informs the approach. |
| Design | A reviewable module/flow/interface solution guides implementation. |
| Implementation | Owned module provides specified capability; unfinished scope is explicit. |
| Integration | Modules actually connected along the critical flow; not attempted, partial, failed and working remain distinct. |
| Testing | Validation actually executed against requirements; results and limitations recorded. Planned testing is not executed testing. |

Stages can overlap/recur; not a forced waterfall. Individual implementation success does not imply team integration success. Evidence is proportionate: a no-progress Session does not need an artifact; a design note, demo or report may suffice as a verification route. A named file here is only a student-supplied reference, not a real uploaded artifact. No Intake-derived completion percentage is required.

## 2. Conversation and ground truth

Three focal students in different 2–4-person teams, each across four Sessions: 12 Sessions. Each reference has four information-seeking exchanges plus summary/confirmation, giving five student responses. A turn means one assistant prompt and its student response. Actual candidates may finish earlier when enough facts are obtained. A fixed minimum of three questions would penalize informative students and is not required. Confirm the production turn cap before building a runner.

Two distinct gold objects:
1. Disclosure-conditioned record: facts actually disclosed in current turns or authorized context. Unrevealed information stays unknown.
2. Essential elicitation targets: material facts a useful conversation should obtain. An honest unknown caused by missing a necessary question still fails elicitation; it is not fabrication.

Reference gold assumes all reference answers were disclosed. An adaptive path must use its own disclosures, not undisclosed reference answers. Semantic equivalence is accepted; exact question wording, question order and summary text are not targets. No exact-string/text-similarity score.

### Answer-bank protocol

Each U1–U4 below is a bank entry; the preceding Q describes its purpose. U1 starts the conversation. Later candidate questions route by meaning, not turn number. A combined focused question can reveal multiple relevant entries. Reveal only matching facts; never future Session facts or gold. A vague first follow-up may reveal the next progress fact; repeated vague questions get “Which part do you mean?” Repeated answered questions receive paraphrase, not new facts. Unlisted details get “I have not recorded that; it would need checking in the report/demo.” Unsupported leading claims are corrected. Assistant suggestions become commitments only after student acceptance.

U5 confirms a faithful summary; otherwise corrects unsupported progress/ownership/testing/verification from the bank. Confirmation does not supply every missed fact or make a premature summary pass. If semantic routing is ambiguous, log the fixture ambiguity for review. Start with human/deterministic reviewed routing; an LLM student simulator requires separate validation.

Variants below replace U1, with the same underlying bank facts available on relevant questions. They are independent trials, not all combinations. Treat concise, optimistic, detail-heavy, delayed and self-correcting utterances as response styles, not judgments of intent. 12 reference Sessions plus 24 entry variants form the initial review scope.

### History and visibility

Intake sees project card, same-student prior confirmed candidate records, explicit Teacher actions available by that Session, and current dialogue. It never sees future script/gold or other students' raw conversations. Student simulator sees only current bank/style/question/disclosed facts. Evaluator sees all current facts and gold.
For isolated diagnostics use reference history below. For longitudinal evaluation carry candidate's own outputs, not silently repaired gold. Evaluate cumulative drift and current record separately. A later repair is valuable but does not erase an earlier failed Session.

## 3. Simple metrics

| Metric | Rule |
|---|---|
| Session success | Essential targets elicited, disclosed material facts faithfully recorded, useful evidence/blocker/next-step where relevant, no critical false claim. Report each of 12 Sessions pass/fail/invalid. |
| Trajectory success | At S4 Teacher can reconstruct personal progress, relevant requirements, team integration, unresolved decisions/gaps and evidence routes without material unresolved drift. Report each of 3 profiles and earlier failures. |
| Conversation burden | Information-seeking exchanges, unnecessary/repeated questions and Teacher judgment of relevance; actual elapsed time only after real runs. |

Diagnostic errors: missed fact, meaning changed, ownership error, integration/test inflation, evidence/verification inflation, continuity loss, unnecessary question. No weighted aggregate.
Critical false claims fail: fabricated completed work, planned-as-executed testing, teammate attribution, invented Teacher decision/verification/marks, lost correction. Honest no progress can pass.
Provisional acceptance for review: all reference Sessions/trajectories pass; variants have zero critical false facts, with missed elicitation reported separately. Teacher should confirm thresholds. This small synthetic pilot cannot establish classroom effectiveness or population accuracy.

## 4. Complete reference trajectories

### T1 Project card — Booking portal
Team 3: A/focal student owns booking UI; B API/storage; C availability rules. Goal: reserve an available consultation slot.
R1: select an available slot and submit booking details. R2: persist booking and display saved confirmation. R3: live availability→selection→submission→storage→confirmation. R4: execute normal and changed-slot journeys; retain results.
Planning: owners/handoff; research: availability constraints; design: flow/interface; implementation: modules; integration: R3; testing: R4. No Teacher action/verification in this trajectory.

### T1-S1 — Planning/research/design

**Available history:** Card only; no previous Intake.

| Exchange | Reference assistant question / purpose | Student fact-bank answer |
|---|---|---|
| Q1/U1 | What do you own and what has changed? | Booking UI. We agreed the module owners. I am drawing the flow; no UI is built. |
| Q2/U2 | What did you establish and what remains open? | I checked availability constraints. Flow goes from choosing a slot to saved confirmation. API response format is undecided. |
| Q3/U3 | How could Teacher review that stage and dependency? | booking-flow-v1.pdf has the design and handoff question. I will discuss format with B; no Teacher decision needed yet. |
| Q4/U4 | What is your next milestone? | Agree the format with B, update the diagram, then build main screens. |

**Reference final summary:** UI ownership; planning agreed; research informed draft design; no implementation/integration. Design file is a route, API format open. Next: agreement/design update/screens. Teacher verification pending.

**U5:** “Yes, that accurately records what I said; Teacher still needs to check the work.” If a candidate summary is wrong, U5 instead corrects it from the bank. This is conditional confirmation.

**Final record gold (reference path):** R1/R2 design only; R3/R4 not executed. Team interface dependency, not Teacher help. Evidence student-claimed available. Next accepted U4.

**Essential elicitation targets:** Ownership, design versus implementation, interface dependency, evidence route, accepted next step.

**Forbidden assertions:** Built UI, agreed format, Teacher-approved design, or executed workflow.

**Entry variants** (replace U1; later facts require relevant questions):

- Concise: “Booking UI design; API format still open.”
- Optimistic: “We basically sorted booking; just need to put it together.”

### T1-S2 — Mock implementation, integration unattempted

**Available history:** S1: draft/format open; next agree format/update design/build screens.

| Exchange | Reference assistant question / purpose | Student fact-bank answer |
|---|---|---|
| Q1/U1 | How did your previous milestone go? | We agreed format, updated booking-flow-v2.pdf, and I built selection/confirmation screens with sample data. |
| Q2/U2 | Has the live whole flow run? | No. B says API is ready, but I have not connected it. Availability is separate. Nothing saved through my UI. |
| Q3/U3 | What can Teacher check and what is holding the next step? | Mock screen demo from my branch. We need a joint slot to connect modules. No Teacher help needed yet. |
| Q4/U4 | Next milestone? | Try live select-submit-store-confirm next Session. I will connect UI and keep a run record. |

**Reference final summary:** Design/interface commitment addressed by claim; mock UI implemented. API readiness is teammate report. Live modules not connected, no UI-triggered save. Mock demo/design routes; joint integration next.

**U5:** “Yes, that accurately records what I said; Teacher still needs to check the work.” If a candidate summary is wrong, U5 instead corrects it from the bank. This is conditional confirmation.

**Final record gold (reference path):** Implementation partial; integration/testing unexecuted. R1 mock only; R2/R3 live not established; R4 not run. Prior commitment claimed fulfilled; joint scheduling dependency.

**Essential elicitation targets:** Mock/live distinction, ownership, not-attempted integration, current demo and next step.

**Forbidden assertions:** Project complete, B’s API as A’s work, successful live save or tested integration.

**Entry variants** (replace U1; later facts require relevant questions):

- Detail-heavy: “Changed spinner CSS, padding and icons all week.”
- Optimistic: “All our parts work now, so booking is finished.”

### T1-S3 — Mixed integration outcomes

**Available history:** S2: mock UI; no live run; joint flow/run record promised.

| Exchange | Reference assistant question / purpose | Student fact-bank answer |
|---|---|---|
| Q1/U1 | How did joint integration go? | Connected live modules. Normal booking saved and confirmation appeared. booking-integration-s3.md records it. |
| Q2/U2 | Did changed-slot booking also work? | No. After selecting another slot, confirmation showed the old one. We have not isolated UI versus API cause. |
| Q3/U3 | What can Teacher check and is help needed? | Integrated demo and log. We will investigate together; no Teacher decision right now. |
| Q4/U4 | What will you do next? | Check UI handling with B and rerun both journeys after fixing. Whole flow is not complete. |

**Reference final summary:** Live integration attempted; normal success, changed-slot failure, both student claims. Root cause unresolved. Log/demo route. Joint investigation and two retests next; Teacher verification pending.

**U5:** “Yes, that accurately records what I said; Teacher still needs to check the work.” If a candidate summary is wrong, U5 instead corrects it from the bank. This is conditional confirmation.

**Final record gold (reference path):** Integration/testing mixed. R2 normal path claimed; R3 partial; R4 failed changed-slot. Prior attempt done but acceptance not achieved. No owner blamed.

**Essential elicitation targets:** Attempted integration, both outcomes, unresolved cause, evidence, retest.

**Forbidden assertions:** All tests passed, unsupported blame, or Teacher verification.

**Entry variants** (replace U1; later facts require relevant questions):

- Concise: “Normal booking works; changing slot fails.”
- Optimistic: “Integration works; only one thing left.”

### T1-S4 — Correction and missing retest

**Available history:** S3: changed-slot failed; promised fix/two retests; no Teacher action.

| Exchange | Reference assistant question / purpose | Student fact-bank answer |
|---|---|---|
| Q1/U1 | What changed? | I changed UI handling and B adjusted response. Booking is complete now. |
| Q2/U2 | What did you actually rerun? | Normal booking saved correctly. Sorry, NOT complete: we have NOT rerun changing slot after the fix. |
| Q3/U3 | What can Teacher inspect and what remains? | booking-retest-s4.md has normal run and change references. Changed-slot retest is open. |
| Q4/U4 | Next action? | Rerun changed-slot before final demo and add result. No Teacher decision needed. |

**Reference final summary:** UI/API changes attributed correctly; normal retest passed by claim. Student correction supersedes “complete”: changed-slot un-retested. Final whole-flow readiness unconfirmed. File route; missing retest next.

**U5:** “Yes, that accurately records what I said; Teacher still needs to check the work.” If a candidate summary is wrong, U5 instead corrects it from the bank. This is conditional confirmation.

**Final record gold (reference path):** Revision/testing. R2 normal claim; R3 unconfirmed across required paths; R4 only normal retest. Previous commitment partial; preserve earlier failure and latest correction.

**Essential elicitation targets:** Correction, executed versus unexecuted retest, partial commitment, remaining gap.

**Forbidden assertions:** Complete after correction, fabricated changed-slot pass, no remaining work.

**Entry variants** (replace U1; later facts require relevant questions):

- Concise: “Normal retested; changed-slot not rerun.”
- Broad claim: “Everything is done; we fixed it after last time.”
### T2 Project card — Campus wayfinding
Team 3: A route logic; B map UI; C campus data. Goal: routes between agreed campus destinations.
R1: route lookup, initially exploring online routing; fallback requires Teacher approval. R2: map displays supplied route. R3: destination selection→lookup→map display. R4: test valid routes and no-route response, showing unavailable honestly.
Planning: owners/destinations; research: online feasibility; design: data/interface; implementation: lookup; integration: R3; testing: R4. Original scope includes North Annex. TA-01 before S3 approves static paths for Library/Lab/Reception and removes North Annex; before that, change is only proposed.

### T2-S1 — Research and pending scope decision

**Available history:** Original card; no history.

| Exchange | Reference assistant question / purpose | Student fact-bank answer |
|---|---|---|
| Q1/U1 | What do you own/current stage? | Route logic. Destinations and owners agreed. Checking online routing, not building. |
| Q2/U2 | What did research show? | Service does not reliably cover campus paths. Static routes proposed, not Teacher-approved. |
| Q3/U3 | What could Teacher review and decide? | route-options.md compares options. Need approval for static paths and whether North Annex stays. |
| Q4/U4 | Next milestone? | Bring note for decision before building fallback; outline interface meanwhile. |

**Reference final summary:** Planning/research; feasibility limitation. Static/removal proposals remain unapproved. Options note route; Teacher help on two scope questions; no implementation.

**U5:** “Yes, that accurately records what I said; Teacher still needs to check the work.” If a candidate summary is wrong, U5 instead corrects it from the bank. This is conditional confirmation.

**Final record gold (reference path):** R1 approach unresolved; original destinations active. R2–R4 not run. Decision owner Teacher. Next explicit U4.

**Essential elicitation targets:** Research finding, proposal/approval distinction, Teacher decision and next step.

**Forbidden assertions:** Approved fallback/removal, AI choosing scope, routes built.

**Entry variants** (replace U1; later facts require relevant questions):

- Concise: “Online coverage poor; want static paths.”
- Optimistic: “We switched to static routes; should be fine.”

### T2-S2 — Delay without new progress

**Available history:** S1 decision pending; promised note/interface. No new Teacher action.

| Exchange | Reference assistant question / purpose | Student fact-bank answer |
|---|---|---|
| Q1/U1 | Did the decision/interface happen? | No. Did not bring note or finish interface. Another assessment took my time. |
| Q2/U2 | Any implementation or approval? | No implementation; static still proposal. Team waits for direction; no approval. |
| Q3/U3 | Smallest useful step and help needed? | Existing route-options.md is available. Need same Teacher scope decisions; can present existing note. |
| Q4/U4 | Commitment before next Session? | Show Teacher note next class, record decision, then agree minimum interface with B/C. |

**Reference final summary:** No new progress; prior commitment missed. Existing note, pending scope decision and team waiting retained. Recovery action accepted. Reason recorded without intent/contribution judgment.

**U5:** “Yes, that accurately records what I said; Teacher still needs to check the work.” If a candidate summary is wrong, U5 instead corrects it from the bank. This is conditional confirmation.

**Final record gold (reference path):** Research/decision stalled, interface unfinished. R1 unresolved, R2–R4 unattempted. Evidence existing, not newly produced. Teacher request carried.

**Essential elicitation targets:** No progress, missed commitment, approval pending, feasible recovery/help.

**Forbidden assertions:** Invented research/approval, laziness accusation, executed integration failure where no attempt occurred.

**Entry variants** (replace U1; later facts require relevant questions):

- Brief: “Nothing much happened; busy.”
- Evasive: “Coming along; have something soon.”

### T2-S3 — Approved change and isolated implementation

**Available history:** TA-01 before S3: static for Library/Lab/Reception approved; North Annex removed; demonstrate whole flow/no-route. No artifact verification. S2 missed commitments remain history.

| Exchange | Reference assistant question / purpose | Student fact-bank answer |
|---|---|---|
| Q1/U1 | Against approved scope, what changed? | Updated route-design-v2.pdf for three locations, built lookup, agreed format with B/C. |
| Q2/U2 | Has the whole workflow run? | Lookup returns routes independently. Map has not called it; no destination-to-map run. |
| Q3/U3 | Evidence and remaining dependency? | Design/module demo. Joint slot with B to connect. No new scope decision needed. |
| Q4/U4 | Next milestone? | Connect map, try valid and no-route destinations, record both outcomes. |

**Reference final summary:** TA-01 authorizes scope without verifying work. Revised design/format and lookup claimed. Team flow unattempted. Design/demo route; integration/two checks next.

**U5:** “Yes, that accurately records what I said; Teacher still needs to check the work.” If a candidate summary is wrong, U5 instead corrects it from the bank. This is conditional confirmation.

**Final record gold (reference path):** Design revised, implementation claimed; R1 independent reduced-scope claim; R2/R3 unestablished; R4 planned. Teacher request resolved, interface now claimed agreed.

**Essential elicitation targets:** Approval source, independent versus integrated, evidence, connection/checks.

**Forbidden assertions:** Requiring removed North Annex, inferring whole-flow pass, approval as result verification.

**Entry variants** (replace U1; later facts require relevant questions):

- Concise: “Static lookup built; map next.”
- Optimistic: “Finished routing after approval.”

### T2-S4 — Valid integrated path; no-route failure

**Available history:** S3 integration/two checks promised; TA-01 active.

| Exchange | Reference assistant question / purpose | Student fact-bank answer |
|---|---|---|
| Q1/U1 | How did integration/checks go? | Map shows three valid routes. Ran them together; route-integration-s4.md. |
| Q2/U2 | No-route outcome? | Showed old route instead of unavailable. Failed. Test destination separate from removed North Annex. |
| Q3/U3 | Teacher check and who handles remaining gap? | Demo/log. B and I will investigate unavailable handling; root cause not established. |
| Q4/U4 | Next milestone? | Fix and repeat no-route check before final demo. No new scope decision. |

**Reference final summary:** Valid integrated routes working by claim; no-route failed stale display. Approved scope preserved; root cause unassigned. Log/demo route, joint fix/retest next.

**U5:** “Yes, that accurately records what I said; Teacher still needs to check the work.” If a candidate summary is wrong, U5 instead corrects it from the bank. This is conditional confirmation.

**Final record gold (reference path):** R1/R2/R3 valid paths claimed; R4 failing no-route. Attempt commitment fulfilled; acceptance incomplete. Old scope decision closed; no verified result.

**Essential elicitation targets:** Positive/negative outcomes, scope distinction, unresolved cause, evidence/retest.

**Forbidden assertions:** All requirements passed, unsupported blame, reinstated North Annex, Teacher sign-off.

**Entry variants** (replace U1; later facts require relevant questions):

- Concise: “Valid routes work; no-route failed.”
- Optimistic: “Reduced project done; only edge case.”
### T3 Project card — Sensor display
Team 2: A sensing hardware; B controller/display. Goal: repeatable portable room-temperature display.
R1: readings across agreed 15–35°C range. R2: live readings transferred in agreed format. R3: capture→transfer→interpret→display. R4: reference comparison at agreed points, absolute difference ≤1°C under recorded conditions.
Planning: owners/bench schedule; research: sensor suitability; design: wiring/sampling/format; implementation: assembly; integration: R3; testing: R4. Threshold is specific to this synthetic project. TA-02 before S4 clarifies interface, not result verification.

### T3-S1 — Research/design before assembly

**Available history:** Card only.

| Exchange | Reference assistant question / purpose | Student fact-bank answer |
|---|---|---|
| Q1/U1 | Owned module/current stage? | Sensing hardware; B controller/display. Bench time planned, compared sensor options, drawing wiring. |
| Q2/U2 | Decision and open dependency? | Selected sensor specified for range. Sampling/data format undecided with B. No assembly. |
| Q3/U3 | Teacher review route/help? | sensor-design-v1.pdf has rationale/wiring draft. Format is team discussion; no Teacher decision now. |
| Q4/U4 | Next milestone? | Agree format, assemble bench module producing readings; bring design and photo/demo. |

**Reference final summary:** Planning/research/draft design; specified suitability is not measured performance. Hardware unassembled, format open. File route; agreement/assembly next.

**U5:** “Yes, that accurately records what I said; Teacher still needs to check the work.” If a candidate summary is wrong, U5 instead corrects it from the bank. This is conditional confirmation.

**Final record gold (reference path):** R1 approach proposed; R2/R3/R4 unexecuted. B ownership retained. No Teacher help. Next accepted.

**Essential elicitation targets:** Research versus measurement, unbuilt status, dependency/evidence/next.

**Forbidden assertions:** Measured accuracy, assembled hardware, live display, approved design.

**Entry variants** (replace U1; later facts require relevant questions):

- Concise: “Sensor selected, draft done; not assembled.”
- Detail-heavy: “Hours reading pin diagrams and resistor values.”

### T3-S2 — Detail-heavy opening to module status

**Available history:** S1 agreement/assembly promised; no built hardware.

| Exchange | Reference assistant question / purpose | Student fact-bank answer |
|---|---|---|
| Q1/U1 | What changed? | Moved wires, replaced a connection, changed sampling timing several times. Took ages. |
| Q2/U2 | Overall, assembled/producing readings and format agreed? | Yes, agreed format and assembled it. Bench readings vary too much. Not connected to display. |
| Q3/U3 | Teacher check/main blocker? | wiring-s2.jpg and unstable bench demo. Need stabilize module; work myself first. |
| Q4/U4 | Next milestone? | Stable bench readings, then send to B. No reference instrument comparison yet. |

**Reference final summary:** Agreement/assembly claimed, unstable bench readings, no display connection or reference comparison. Photo/demo route; stabilize then transfer. Technical details summarized at module level.

**U5:** “Yes, that accurately records what I said; Teacher still needs to check the work.” If a candidate summary is wrong, U5 instead corrects it from the bank. This is conditional confirmation.

**Final record gold (reference path):** Implementation partial/blocked. R1 readings exist, full range/accuracy unestablished; R2/R3 unattempted, R4 not run. Prior agreement/build done as claim, capability unstable.

**Essential elicitation targets:** Module outcome after detail, instability, no display/reference test, route/next.

**Forbidden assertions:** Wire-by-wire demand, module complete, photo as accuracy proof, fabricated reference results.

**Entry variants** (replace U1; later facts require relevant questions):

- Concise: “Built but unstable; no display.”
- Technical: “Contact, timing loop and layout changed; tried values.”

### T3-S3 — Personal stability but failed team integration

**Available history:** S2 stabilize/send promised; reference test not run.

| Exchange | Reference assistant question / purpose | Student fact-bank answer |
|---|---|---|
| Q1/U1 | How did milestone go? | Stable bench readings now. Sent to B; display does not show correctly. |
| Q2/U2 | Whole workflow/validation status? | Transfer attempted; B cannot interpret as expected. Cause unresolved. Still no reference comparison. |
| Q3/U3 | Evidence/help? | sensor-bench-s3.md has bench observations/failed display attempt. Want Teacher review because we disagree on format. |
| Q4/U4 | Next after review? | Agree interface, rerun sensor-to-display, then compare with reference at agreed points. |

**Reference final summary:** Bench improved by claim; integration attempted/failed; reference comparison unexecuted. Unresolved cause; Teacher interface help requested. Log route, rerun/comparison next.

**U5:** “Yes, that accurately records what I said; Teacher still needs to check the work.” If a candidate summary is wrong, U5 instead corrects it from the bank. This is conditional confirmation.

**Final record gold (reference path):** R1 bench claim only; R2/R3 failed; R4 planned. Previous milestone partly achieved; Teacher action open, no blamed owner.

**Essential elicitation targets:** Individual/team distinction, failed attempt, planned validation, help/partial commitment.

**Forbidden assertions:** Project complete, measured accuracy, blame B/A, invented decision.

**Entry variants** (replace U1; later facts require relevant questions):

- Optimistic: “My module finished; display side problem.”
- Concise: “Stable bench; failed display; need interface help.”

### T3-S4 — Integrated but quality target unmet

**Available history:** TA-02 before S4: Celsius decimal values with timestamps; both rerun path and retain comparison. Decision only, not verification.

| Exchange | Reference assistant question / purpose | Student fact-bank answer |
|---|---|---|
| Q1/U1 | After interface clarification, what happened? | Followed format; live display works. Ran reference comparison; sensor-validation-s4.pdf records both. |
| Q2/U2 | Did comparison meet target? | Not fully. Three points differed 0.6, 1.4, 0.8°C. Middle exceeds 1°C; calibration remains. |
| Q3/U3 | Teacher check/open gap? | Live demo and report conditions/results. Interface resolved; calibration/repeat comparison open. |
| Q4/U4 | Next milestone? | I calibrate, then repeat points with B recording display results before final demo. |

**Reference final summary:** TA-02 addressed; live integration and reference comparison executed by claim. One point exceeds card target; quality acceptance unmet. Report/demo route; calibrate/retest. No Teacher verification.

**U5:** “Yes, that accurately records what I said; Teacher still needs to check the work.” If a candidate summary is wrong, U5 instead corrects it from the bank. This is conditional confirmation.

**Final record gold (reference path):** R2/R3 claimed working; R4 failed one point; R1 entire range not proven by three points. Action/attempt commitment addressed; calibration open. Numbers optional in concise summary if failure retained.

**Essential elicitation targets:** Action resolved, integration success versus quality failure, evidence/retest, no full-range extrapolation.

**Forbidden assertions:** All tests passed, ≤1°C everywhere, full range validated, approval as verification.

**Entry variants** (replace U1; later facts require relevant questions):

- Optimistic: “Displays now and report ready, so finished.”
- Concise: “Integration works; one point over target; calibration next.”

## 5. Trajectory-level gold

| Profile | Expected Teacher understanding at S4 |
|---|---|
| T1 | UI design→mock→live integration; normal path working by claim. Earlier changed-slot failure remains un-retested after revision. Ownership/correction and final gap preserved. |
| T2 | Research→delay→authorized reduced scope→independent lookup→integrated valid routes. Approval resolved; no-route behavior fails; Teacher review route clear. |
| T3 | Research/design→unstable assembly→stable bench but failed display→interface decision→working integration with failed accuracy point. Calibration remains. |

All results remain student claims. Profiles intentionally emphasize truthful readiness/integration, not representative sampling. Missing coverage includes persistent refusal, module ownership changes, sustained contradictions, privacy/injection, report grading and a wholly successful final trajectory. Add later; do not claim coverage now.

## 6. Review and execution sequence

Joseph reviews teaching realism and required facts. Claude independently audits consistency, branches and metrics, producing a critique report. Joseph adjudicates; version accepted changes before freezing v1.
First fixed-transcript replay tests extraction/summary/correction. Separately adaptive scripted mode tests actual questions and bank routing. Report these separately. Longitudinal runs carry candidate outputs; isolated diagnostics may use gold-context history. Do not expose reference gold to Intake.
Only after review, repeat each trajectory at least three times for nondeterministic candidates; retain all outputs, failures, cost and question counts. Invalid simulator inventions are distinct from valid Intake failures. Missing final records never count as successes. Later compare with form baseline and classroom pilot for time and utility.
This review does not authorize production/schema changes, paid calls or runner implementation. Current production compatibility needs a read-only check, not assumptions.

## Appendix A — Claude prompt (copy below)

You are independently reviewing the attached AI_Intake_Benchmark_v0.5_Review_Pack.md for an Engineering Studio AI Intake.

Goal: establish a Teacher-reviewable benchmark before implementing a runner or changing production. Joseph accepted the two-layer direction (common criteria plus project-specific requirements), including planning/research/integration stages. Critique the operationalization; gold labels are proposals, not unquestionable truth.

Read the entire document. Do not write code, install tooling, run paid model calls, change production or edit this benchmark. Read-only repo inspection is permitted if the repository is available; otherwise mark compatibility unassessed. Do not manufacture run results. External research is optional; cite any external factual claims.

Review:
1. Product alignment/simplicity: stage/module progress, blockers, verification and team integration rather than low-level debugging.
2. Teaching realism: wording, stages, delay, optimistic/detail-heavy responses, corrections, burden and proportionate evidence. Are scripts too cooperative?
3. All 12 Session golds: facts actually disclosed, elicitation targets, forbidden assertions, history and Teacher actions. Identify unsupported/ambiguous expectations with exact Session IDs.
4. Valid conversations: alternate order/wording, combined questions, early stopping, irrelevant/repeated/leading questions and correction. Can a good conversation unfairly fail?
5. Bank routing and variants: work through one alternate candidate path per profile, each with 3–6 exchanges. State chosen Session/variant, actual disclosures, permissible final gold and any unrevealed facts. Do not fill gaps with hidden facts. These are reasoning examples, not actual model runs.
6. Longitudinal fairness: candidate carryover versus gold-context diagnostics, drift/repair and no future leakage.
7. Metrics: keep at most three main outcomes. Propose the minimum changes for repeatable scoring and treatment of unknown, missed elicitation, correction and invalid simulator runs.
8. Largest missing behavior; current repo context/output/turn-limit compatibility if available. Cite files for observed constraints. Separate repo facts from design opinion; do not implement.

Generate BENCHMARK_V05_REVIEW_CLAUDE.md, primarily Chinese with English IDs:
- Verdict: ready for Teacher adjudication / minor revision / major revision, and top three reasons; not deployment approval.
- At most five concrete strengths.
- Findings table: finding ID, severity (blocking benchmark validity / major / minor), affected section/Session, short evidence, evaluation consequence, smallest correction, Teacher decision if needed.
- Twelve-row Session audit: gold consistency, target clarity, branch usability, issue or none. Audit all Sessions.
- Three alternate paths requested above, disclosures and resulting gold.
- Assessment of no more than three primary metrics.
- Read-only compatibility findings with file references, or unassessed.
- At most five focused questions for Joseph; distinguish teaching decisions from editorial fixes.
- Minimal revision list and next step; do not rewrite all scenarios or generate extra documents.

Save the report and state its path. Summarize major disagreements. We will discuss and accept/reject findings before freezing the benchmark. Never claim synthetic walkthroughs demonstrate actual classroom effectiveness.

## Appendix B — Shared decision log

| Finding | Joseph decision | Change / rejection reason | Version | Open question |
|---|---|---|---|---|
| Populate after Claude review | | | | |

Current evidence is document design only: no actual benchmark runs, scores, classroom timing or simulator validation.
