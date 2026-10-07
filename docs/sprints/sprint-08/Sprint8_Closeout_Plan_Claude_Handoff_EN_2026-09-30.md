# Sprint 8 Closeout Plan and Claude Execution Handoff
Version: v1.0 · 30 September 2026 · Planned by Joseph / ChatGPT; executed locally by Claude

## 1. Responsibilities and objective

Joseph decides teaching objectives, case ground truth and stage acceptance. ChatGPT provides planning, analysis and report reviews. Claude handles local repository inspection, documentation updates, datasets, runners, code, validation and execution reports. ChatGPT does not modify the project repository or GitHub.

Working cycle: one defined task → Claude completes it and reports → Joseph and ChatGPT review → the next task is assigned. Within an authorized task, Claude should proceed autonomously without repeatedly requesting confirmation for ordinary reads, reversible edits or routine tests. Deliver concrete results, not just a proposed plan.

Sprint 8 closeout objective: establish a small, reproducible Intake benchmark, measure a baseline, complete one measured improvement, perform necessary application acceptance checks, and close Sprint 8. Research, general-purpose productization and large datasets are later work, not closeout requirements.

Product objective: replace the form with a brief conversation that records progress on a student's owned module, blockers, evidence/verification routes and next steps. Preserve continuity across Sessions to support Teacher evaluation of final submissions. Verification, contribution judgments and marks remain Teacher-controlled.

All documents and prompts prepared for Claude must be in English, including execution reports intended for joint review.

## 2. Fixed scope

- Two layers: common evaluation criteria and a project-specific requirement card.
- Independent stages: planning, research, design, implementation, integration and testing; overlap and revisiting earlier stages are allowed.
- Focus on stage/module outcomes and the team's critical workflow, rather than diagnosing individual spinners, CSS changes or API errors.
- Use τ³-bench as a structural reference for multi-turn tasks, constrained users, final states and repeated trials. Prefer a lightweight custom dataset/runner connected to the existing Intake; installing the complete τ³-bench environment is not required. This does not imply adopting its official scoring or obtaining a score on its benchmark.
- Freeze the custom C/R/S metrics and 0/1/2 scoring, then refine through evidence. No weighted overall score or additional primary metrics for now.
- Retain existing engineering safety and regression checks. M/MR are not the product success score.
- Reuse existing debug/trace exports. Inspect available functionality before duplicating Visual Debug work.
- Keep raw student conversations, identities and sensitive project information out of public Git. Distinguish teaching-product tests from formal research use; this plan does not authorize expanding classroom-data use.

## 3. Minimal scoring standard v1

Predefine applicable essential facts and explicit 0/1/2 anchors for each Session. Typical facts include:
owned module and current change; relevant stage; team integration/dependencies; actual verification status and evidence route; blocker/Teacher help; accepted next step.
Choose what is necessary for the stage. Do not require every field to be asked every Session, or penalize truthful lack of progress.

| Score | Collection C | Recording R |
|---|---|---|
| 0 | Necessary situation was not clarified, or a misunderstanding remained unresolved | A required disclosed fact was omitted, incorrect, or a correction was lost |
| 1 | Partly clear, with ambiguity that affects Teacher judgment | Main meaning preserved, but material scope/status ambiguity remains |
| 2 | Necessary situation is explicit, including “unknown,” “not done,” or “not needed” when stated clearly | Facts, ownership, timing and uncertainty recorded faithfully |

C_i = 100 × Σ e_ij / (2 × m_i)

m_i is the number of essential facts frozen for Session i; e_ij is its collection score.

R_i = 100 × Σ r_ij / (2 × d_i)

d_i is the number of actually disclosed facts that should be retained; r_ij is its recording score. Required record facts must not be selected retrospectively from the model's output. Disclosed facts omitted by the model still count in the denominator.

When no record facts can be assessed, R is N/A, not 100%. Always show score numerators/denominators and N/A values.

Suite C and R are equal-weight means across applicable Sessions, with per-Session results also shown. This avoids longer answers or cases with more fields dominating the result. Explain this aggregation convention in the first annotation report. Once frozen, do not change fact granularity just to improve scores.

Session success requires all frozen essential collection items to score 2, all essential disclosed recording items to score 2, no critical error, and a valid final record.

S = 100 × successful Sessions / valid test Sessions.

Explicit student uncertainty can pass. Unknown because the assistant failed to ask is a collection gap. Early stopping is allowed when the facts are sufficient; reference dialogue length is not a minimum.

Critical errors: fabricated completion/test outcomes; a plan represented as execution; teammate work assigned to the student; invented Teacher approval/verification/marks; failure to preserve a student correction. Detect additional invented facts separately so they cannot escape evaluation by falling outside the R denominator. A critical error fails that Session and cannot be offset by high C/R scores.

Question count, repeated/irrelevant follow-ups, tokens, cost and latency are auxiliary run records, not components of an overall score. Distinguish information-seeking exchanges, individual messages, confirmation and provider retries. Verify the cap in the current local code. A previous observation was 8 questions / 17 messages; do not automatically treat that technical maximum as the desired teaching burden.

Simulator invalidity, such as introducing unscripted/future facts, must be reported separately with counts and reasons, never silently discarded. An API/provider/execution failure in a valid task without a final record is not a success. If fallback produces a qualifying result, assess that result and retain the failure marker. Show invalid trials and execution failures in every comparison so changing denominators cannot hide regressions.

## 4. Staged execution

### A — Standard and preparation of one trajectory
This is the only scope authorized for the next round.

Deliver:
1. Inspect the actual local branch and current tests, Intake, debug capabilities and planning status. Distinguish verified facts, historical reports and unverified items. Do not treat ChatGPT's old checkout as current truth.
2. Update the local Sprint 8 plan/handoff to reflect this closeout direction, preserving unresolved application acceptance requirements. Do not rewrite unrelated history.
3. Produce a lightweight BENCHMARK_STANDARD_v1.md draft: C/R/S formulas, score anchors, critical errors, denominators, turn definitions and scoring examples.
4. Inventory Joseph's available Session records. Select the longest consecutive trajectory for the same student/project, preferably 3–4 Sessions. If records are insufficient, list what is missing; do not fabricate real history.
5. Prepare a de-identified case draft and per-Session scoring tables. Each item includes fact ID, source, essential status, 0/1/2 anchors and expected state. Distinguish disclosed facts from undisclosed/unknown facts.
6. Separate real transcript replay from dynamic student branches constructed from those facts. Replay cannot prove whether the candidate elicited facts absent from the transcript; it is an extraction baseline. Dynamic adaptations require Joseph's review before becoming a collection benchmark.
7. Produce S8-A_REPORT.md covering standard disagreements, selected trajectory, data gaps, compatibility and the smallest next implementation step.

Acceptance: Joseph can understand the standard and inspect each gold item's source; no fabricated data. No runner, production changes or paid calls in this phase. Complete A, report, then wait for the next task.

### B — Minimal runner and baseline
Authorized after review of A.

- Connect to the existing complete Intake workflow; pin model, prompt, policy, Harness, dataset and grader versions.
- First replay real fixed transcripts to assess R and state checks. Calculate C/S only where their evaluation conditions exist; feeding a historical script is not proof of dynamic collection success.
- Then connect reviewed dynamic answer branches to test C and S.
- Export final results, conversation, field updates/rejections, historical carryover and scoring evidence as JSON, plus a concise report.
- Begin with one trajectory. State the budget and model-call scope; reuse local configuration where appropriate, never print secrets.
- For formal stochastic comparisons, run each trajectory at least three times. A single development run is permitted but must not be presented as reliability evidence.
- Never silently replace previous candidate outputs with gold. Report isolated Session diagnostics separately from true chained runs.
- Calibrate automated/model scoring against a small human-scored sample. Joseph adjudicates disputes.

Acceptance: one command can reproduce the run; outputs are reviewable; undisclosed gold does not leak. S8-B_REPORT.md includes baseline, cost and failures. The first baseline need not pass every case.

### C — One focused improvement and regression check
Authorized after review of B.

- Select the most important baseline failure category and improve the Harness for it. Do not optimize multiple uncertain directions simultaneously.
- Compare before/after with the same dataset, model, scoring and budget. Show C/R/S, critical errors and per-case improvements/regressions. If data or graders change, establish a separate new baseline.
- Run existing tests, type checks, build and controlled application acceptance appropriate to the change.
- Produce S8-C_REPORT.md: changes, rationale, measurements, regressions and unresolved issues. Do not loop indefinitely to force every case to pass.
- Keep the three synthetic four-Session trajectories as expansion/regression assets. Expanding to ten students is not required for this closeout.

### D — Application acceptance and Sprint 8 closeout
After review of C.

Check actual student confirmation/submission, historical carryover and Teacher viewing. Retain necessary audits for changed database permissions/migrations. Verify already-passed items from current evidence; avoid unnecessary repeat testing.

Put remaining nonblocking benchmark challenges in the backlog rather than indefinitely extending the sprint.

Produce S8_CLOSEOUT_REPORT.md with a recommendation to close or a specific list of outstanding acceptance items. Joseph decides closeout and release. Commits, pushes, merges, migrations and deployments follow separately authorized scope; this handoff does not authorize those actions.

Plan the next sprint around a real teaching pilot and feedback iteration. General Harness productization, open source, papers and large datasets belong to later planning.

## 5. Sprint 8 exit conditions

- Reviewed/frozen first standard and one executable trajectory, with traceable data/gold sources.
- Reproducible baseline, one measured improvement comparison and inspectable failure JSON.
- Explicit C/R/S, critical errors and burden records; unresolved items in backlog. Perfect synthetic results do not establish classroom effectiveness.
- Required engineering regressions pass; no unresolved release-blocking permission, data-boundary or fabricated-result issue.
- Controlled application acceptance evidence exists, or remaining items are explicitly stated. Mock-only success must not be presented as full application acceptance.
- Accurate local plan/handoff, Joseph-reviewed closeout report and a clear next-sprint direction.

## 6. Execution report format

Conclusion and scope; actual branch/versions; delivered files; commands actually executed and their results; data/scoring sources; failures/risks; next-step recommendations, at most three.

Implementation rounds also include before/after C/R/S and per-case differences. Documentation-only work does not require a build. Never invent test results. State missing inputs/dependencies and continue work that does not depend on them.

## 7. Claude startup prompt — Execute A only

Read Sprint8_Closeout_Plan_Claude_Handoff_EN_2026-09-30.md and the existing v0.5 benchmark/Claude review if available locally.

The division of work is fixed: Joseph and ChatGPT handle planning and review; you handle local implementation, repository planning updates and execution reports. All documents, prompts and reports for this workflow must be in English.

Execute Phase A only: the standard document, current-state inspection, a de-identified draft of one real trajectory, and S8-A_REPORT.md. Do not start B/C, change production, install the complete τ³-bench environment, make paid model calls, push, merge, deploy or execute migrations.

Read applicable local AGENTS/repository rules first. Inspect the actual working tree and protect existing uncommitted changes. Verify status from current code/evidence; old PR numbers and ChatGPT documents are not proof of the current state. Proceed autonomously with authorized ordinary reads and document edits.

Make C/R/S and 0/1/2 a small, explicit first standard, retaining critical-error failure rules and denominator conventions. If real records exist, choose one consecutive same-student/same-project trajectory. Otherwise complete the standard and missing-input inventory; do not fabricate real Sessions or guess missing gold. Distinguish fixed replay from dynamic adaptation.

Update local Sprint 8 plan/handoff so the next steps match this file, without marking A/B/C complete prematurely. Produce S8-A_REPORT.md and file paths, with at most five concrete questions requiring Joseph's decision. Finish with delivered items, blockers and next steps for Joseph/ChatGPT review before B.
