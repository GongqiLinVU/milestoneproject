# Sprint 8 Phase 2A — Mock Pilot Foundation

**Status:** Implemented on Draft branch; migration not applied  
**Evidence schema:** `session-intake.v1.0.0`  
**Test suite:** `ai-intake-suite.v1.0.0`

## Scope delivered

- add `2B2` to the permitted teaching-block codes and Teacher block selector;
- do not create, activate, archive or modify any Block automatically;
- add per-Session `intake_access`, defaulting every Session to `closed`;
- create an immutable, Block-scoped confirmed Intake store;
- keep source conversation, student record, AI metadata and student confirmation separate;
- provide authenticated read RPC with same-student/same-Block previous context;
- provide provider-independent deterministic fallback save RPC;
- add matching TypeScript types, validation and deterministic summary builder;
- add synthetic deterministic fixtures;
- add a read-only database security audit.

No AI provider, prompt, full Intake UI, Teacher queue or grading behaviour is included.

## Files

- `supabase/migrations/20260903_sprint8_phase2a_intake_foundation.sql`
- `supabase/scripts/sprint8_phase2a_security_audit.sql`
- `src/aiSessionIntake.ts`
- `tests/ai-session-intake/cases/v1/DETERMINISTIC_FIXTURES.json`

## Data boundary

`student_session_intakes` stores only a student-confirmed Intake:

- identity is derived from `auth.uid()`, `student_accounts`, roster and Session;
- one record is permitted per Student per Session;
- students cannot directly insert, update or delete table rows;
- students may read only their own rows;
- teachers may read rows through the existing teacher role;
- no Teacher verification, Teacher Action or marks field exists in the table;
- previous context is limited to the same Block and authenticated student;
- original activity and 2B1 records are not migrated or rewritten.

## Deterministic fallback

`save_my_session_intake_fallback`:

1. derives student and Block identity;
2. requires an Intake-enabled Session in that roster Block;
3. validates 3–12 source turns;
4. validates the structured Evidence Contract;
5. rejects unsupported top-level fields such as Teacher status or marks;
6. requires explicit student confirmation;
7. saves source mode as `deterministic_fallback`;
8. stores no prompt or fabricated AI output;
9. returns a stable confirmation identifier and payload hash.

## Application sequence after PR approval

1. Apply the reviewed migration once to the shared Supabase project.
2. Run `supabase/scripts/sprint8_phase2a_security_audit.sql`.
3. Confirm all rows PASS; the final “No 2B2 block auto-created” row should be PASS
   before the Teacher creates it.
4. Deploy/confirm the frontend build.
5. In Teacher Dashboard, create 2026 · 2B2 as **planned**.
6. Add one Team and three mock students.
7. Prepare their accounts.
8. Prepare S1–S4 Sessions.
9. Do not enable Intake until the deterministic pilot UI/control exists.

Creating 2B2 as planned does not change the active 2B1 Block. Switching the
platform's active Block is not part of this Phase.

## Review and verification

### Static review

- migration is idempotent;
- `schema.sql` contains the same definition;
- existing Sessions default to `intake_access = closed`;
- no block is inserted by migration;
- direct browser writes are revoked;
- RPCs are `SECURITY DEFINER` with empty `search_path`;
- validator rejects Teacher-owned fields.

### Database audit

The audit checks:

- 2B2 constraint support;
- RLS;
- anon access;
- authenticated direct-mutation denial;
- own-row/Teacher read path;
- hardened RPC configuration;
- authenticated-only RPC execution;
- existing Session closed defaults;
- absence of automatic 2B2 creation.

### Build

Run `npm run build`. The new TypeScript module is under `src/` and therefore
included by the strict TypeScript build even before UI integration.

## Remaining Phase 2 work

- deterministic Student Intake UI and Teacher Intake access control;
- execute the four deterministic fixtures through an automated runner;
- AI provider endpoint and schema-constrained extraction;
- prompt versioning and bounded follow-up selection;
- real Gate A/B regression runs;
- Teacher Verification Queue in Phase 3.

## First database audit finding

The first applied-migration audit returned 9 PASS and one FAIL:
`Anon cannot execute Intake RPCs`. Although execution was revoked from
`PUBLIC`, the deployed role state retained anonymous execution. The migration
now also revokes both RPC signatures explicitly from `anon`. Re-run the complete
idempotent migration, then rerun the audit before merge.

## Database verification result

The corrected migration was reapplied on 3 September 2026 and the read-only
security audit returned **10/10 PASS**:

- 2B2 is permitted without automatic creation;
- anonymous roles have no table or RPC access;
- authenticated students cannot directly mutate Intake rows;
- authenticated reads remain protected by own-row/Teacher RLS;
- both RPCs are `SECURITY DEFINER` with an empty `search_path`;
- all existing Sessions remain Intake-closed;
- no 2B2 Block was auto-created.

This closes the first audit finding. The uploaded raw CSV remains outside Git.
