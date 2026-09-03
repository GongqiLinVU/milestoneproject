# Sprint 8 Handoff — AI Session Intake

## Current state

Phase 1 Evidence Contract and Evaluation Standard were merged through PR #62
(commit `2db40024d97c1efe67d67f1550da1ded92a61142`).

Phase 2A Mock Pilot Foundation is in Draft review. The corrected migration has
been applied and its read-only database security audit returned 10/10 PASS. No
test Block, mock account or production Intake record has been created.

## Phase 2A scope

- permit 2026 · 2B2 as an explicit Teacher-created Block;
- keep existing Blocks and Sessions unchanged;
- default Session Intake access to closed;
- create Block-scoped, student-owned confirmed Intake storage;
- implement deterministic schema validation and fallback save;
- provide hardened authenticated RPCs;
- add synthetic fixtures and a read-only security audit;
- do not connect an AI provider or build the full Intake UI.

Detailed implementation and execution order:
`docs/sprints/sprint-08/PHASE2A_IMPLEMENTATION.md`.

## Next verification

Verified before merge:

1. physical schema and RPC authority boundary reviewed;
2. 2B2 allowed but not auto-created;
3. existing Sessions remain Intake-closed;
4. database security audit 10/10 PASS;
5. strict TypeScript/Vercel Preview build passed.

After explicit merge approval:

1. apply `20260903_sprint8_phase2a_intake_foundation.sql` once;
2. run `sprint8_phase2a_security_audit.sql`;
3. confirm the audit output;
4. create 2026 · 2B2 as planned in Teacher Dashboard;
5. add one Team and three mock students;
6. keep Intake closed until the deterministic pilot UI is delivered.

## Guardrails

- no raw student CSV in Git;
- no Auth user IDs in anonymised exports or provider prompts;
- no autonomous grading, contribution decision or accusation;
- no unbounded chat;
- no AI-only path that blocks submission;
- no change to 2B1 data;
- one focused Phase branch and Draft PR;
- merge only after explicit approval.
