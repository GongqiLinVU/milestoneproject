# Sprint 8 Handoff — AI Session Intake

## Current state

Phase 1 Evidence Contract and Evaluation Standard were merged through PR #62
(commit `2db40024d97c1efe67d67f1550da1ded92a61142`).

Phase 2A Mock Pilot Foundation was squash-merged through PR #63 (commit
`133cee3483f1b4ec6a060ac2d77452ee6360f5a3`). The migration was applied and its
read-only database security audit returned 10/10 PASS. No test Block, mock
account or production Intake record was created by the implementation.

Phase 2B Deterministic Student Pilot UI is in Draft review. It adds the bounded
fallback interaction and Teacher Intake controls for the isolated 2B2 pilot;
it does not connect an AI provider or change the database.

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

## Phase 2B Draft scope

- 2B2 students can open S1–S9 Session Intake from the Project Journey;
- all other Blocks retain their existing Work Track behaviour;
- three core questions collect responsibility/progress, evidence/verification
  and next action/blocker;
- deterministic rules add zero to three clarifying questions;
- the student reviews the structured record and accepts the explicit
  claim-versus-verification attestation before confirming;
- submission uses only `save_my_session_intake_fallback`;
- confirmed records are read-only and remain labelled as unverified claims;
- Teachers see Intake Open / Close / Follow session controls only for 2B2.
- Teachers can archive the completed 2B1 Block, activate 2B2 after no other
  Block is active, or restore an archived Block to Planned. Every transition
  requires confirmation and preserves historical data.

## Next verification

Verified before merge:

1. physical schema and RPC authority boundary reviewed;
2. 2B2 allowed but not auto-created;
3. existing Sessions remain Intake-closed;
4. database security audit 10/10 PASS;
5. strict TypeScript/Vercel Preview build passed.

Phase 2A completed:

1. migration applied once to the shared Supabase project;
2. security audit returned 10/10 PASS;
3. Vercel Preview and TypeScript build passed;
4. PR #63 was explicitly approved and merged.

For Phase 2B Preview review:

1. create 2026 · 2B2 in Teacher Dashboard if it does not yet exist;
2. prepare its standard Sessions, one mock Team and three mock students;
3. keep all Intake controls closed initially;
4. open one 2B2 Intake and verify the normal no-follow-up path;
5. verify broad, missing-evidence and previous-blocker clarification paths;
6. confirm a record, then verify it is read-only and cannot be submitted again;
7. switch to 2B1 and confirm its Student and Teacher Work Track UI is unchanged;
8. close Intake and confirm direct fallback submission is rejected by the RPC.

## Guardrails

- no raw student CSV in Git;
- no Auth user IDs in anonymised exports or provider prompts;
- no autonomous grading, contribution decision or accusation;
- no unbounded chat;
- no AI-only path that blocks submission;
- no change to 2B1 data;
- one focused Phase branch and Draft PR;
- merge only after explicit approval.
