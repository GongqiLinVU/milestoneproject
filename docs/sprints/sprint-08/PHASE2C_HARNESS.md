# Phase 2C — bounded Intake Harness v1

Status: Draft PR #65 application slice. Teacher verification and database rollout remain separate gates.

## Context and trace

One authenticated model request proposes a conversation, evidence candidates and route. The server resolves open 2B2 enrollment and the authenticated student's preceding confirmed records. Session focus and previous records carry source/scope. Knowledge fields (`retrievedKnowledge`, `knowledgeVersion`, `knowledgePurpose`, `knowledgeScope`, `teacherApproved`) are present but retrieval is empty until a Teacher-approved, scoped source exists. No other student's raw conversation enters the request.

`IntakeCase` describes replay; `CandidateManifest` identifies model/prompt/policy/parser/schema/knowledge versions, cost, latency and stop reason; `TrialTrace` captures candidate and field decisions; `GradeResult` records rule results. Types are in `src/intakeHarness.ts`. Missing cost is `null`. The UI debug event retains accepted and rejected/repaired candidates; original student turns remain in the full ordered conversation.

## Acceptance levels

| Level | Dialogue | Evidence | Route |
|---|---|---|---|
| L0 | Safe | All grounded | Harness decides |
| L1 | Safe | Partial accept and decisions | Harness decides |
| L2 | Safe | Extraction pending | Continue or bounded review |
| L3 | Missing/unsafe or provider failure | Extraction pending | One retry, then a targeted deterministic question |

Candidates need permitted field/state, typed value and a uniquely grounded student source. A wrong pointer relocates only to one matching student turn; ambiguous or unsupported candidates are rejected. Teacher fields are excluded. Executed testing requires method and observation. Planned testing cannot overwrite an executed observation. Only accepted updates reach the UI; raw candidates and decisions remain in debug metadata. Final confirmation still requires the strict Evidence Schema and database RPC checks. Field correction resets attestation.

The harness routes to review when current claim, evidence reference, verification route and explicitly accepted next action are present, on Teacher-help request or at the eight-question ceiling. It overrides a question about a future result when the next action is accepted. A retry consumes no question. After failure it asks one deterministic question for the current gap and preserves the answer. The ceiling routes to review. Teacher verification and actions remain separate.

## Evaluation and boundaries

`tests/ai-session-intake/adaptive/recorded-cases.json` holds de-identified semantic reproductions. The S3 (11) export contains the answer and `evidence_source` failure but no provider candidate payload: its payload is reconstructed for replay. The future API 500 case likewise reproduces the observed semantic failure. Keep raw exports out of Git.

Gate A covers authority/Block isolation, source grounding, transcript preservation, Teacher fields, correction, executed/planned separation, cap and partial failure. State graders compare claim/evidence/testing/blocker/action/route semantics; quality graders assess continuity, relevance, repeated or future-result questions, early stopping, small steps and tone. Recorded-response replay and endpoint mocks run locally. Run live-model and simulated student cases at least three times each, then seek Teacher evaluation of usefulness and workload. Mock success does not establish live-model reliability.

The pending adaptive migration must accept the current prompt/policy versions and `turn_decisions` while validating accepted `turn_results` pointers. Do not execute migration in this slice. After human-reviewed rollout, run the read-only security audit and authenticated Preview on a new unconfirmed 2B2 Session. Check persisted transcript, extraction decisions, correction history, final confirmation, duplicate handling and 2B1 isolation. Keep PR Draft until explicit merge approval.
