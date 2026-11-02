# S11-08 — Teacher-reopened student summary corrections

Status: implemented and locally verified; production migration/browser acceptance pending.

## Workflow

Teacher Session check-in → Intake → expand one submitted student's record → Reopen summary → confirm the named student. Only that Intake becomes editable; the Session window, collection mode, other students and AI settings stay unchanged. Teacher status is Awaiting correction, then Reconfirmed after the student confirms again. Reopening an already-open correction is idempotent.

Student refreshes/reopens the portal. Open-session cards show Correction requested; reopened closed Sessions appear in the expanded Summaries to correct section. Open Correct summary, edit role/progress/scope, evidence/testing, support or next step, tick confirmation and save. History links also reach the same correction view. There are no model calls. Every edit resets attestation; unsaved edits and in-flight saves use the existing navigation/sign-out/refresh exit guard. No drafts are persisted.

The current confirmed record remains visible while correction is pending. Students cannot edit without teacher reopening. The correction RPC requires the owning activated student account, current roster membership in the Intake's class, an open correction and the exact expected revision. It intentionally bypasses the ordinary Session window for summary correction only. Stale tabs, repeat saves and another student's identity are rejected. Teachers cannot submit the student correction. Off-roster/disabled accounts must have their access resolved before correction.

## History and permissions

`intake_summary_corrections` stores the previous full summary, previous confirmation/hash/time, reopening staff identity/time, and corrected summary/confirmation/time for every cycle. The base Intake ID and creation time, source conversation and AI/debug payload stay unchanged; latest confirmed time/hash/schema/revision update on reconfirm. Existing raw-table read grants are unchanged. No client may read/write the audit table or call its internal helper; authorized student/teacher readers receive scoped history through their existing RPCs. Staff UUIDs remain in the private audit table; read payloads show the staff display name.

The read RPC wrappers preserve their original authorization and return shape and append correction state/history. Administrator diagnostics exports include summaryCorrection lineage. Existing AI debug remains the original extraction trace; it is not rewritten to imply the model generated a student's later edits.

## Release

1. Joseph runs ONLY `supabase/migrations/20261102_sprint11_intake_summary_corrections.sql`; do not rerun schema.sql. The transaction is repeatable, additive and compatible with the current frontend. It renames existing read RPC implementations to private delegates and restores the original public names as scoped wrappers. No existing rows are rewritten on migration.
2. After SQL success and approval, merge/deploy.
3. Teacher opens the specific SkillArk student's Intake, clicks Reopen summary. Student refreshes, corrects responsibility/next action, reconfirms. Teacher refreshes/reopens Intake panel and checks Reconfirmed plus Summary revisions.
4. Browser acceptance must cover closed Sessions, correct student targeting, unsaved-exit protection, teacher/student cross-access denial and exported original/corrected records. No production writes, paid calls or account changes were performed during implementation.

Validation: production TypeScript/Vite build passed; 248/248 existing Intake/API checks passed; 15/15 correction/export/fresh-schema checks passed. Six correction DB cases cover assigned-teacher-only reopen, idempotence, scoped student/teacher reads, denied audit/delegate access, closed-session correction, validation/attestation, stale versions, multi-cycle history, unchanged source/debug/Session and disabled/off-roster denial. Existing diagnostics checks and fresh-schema test also pass.

Recovery: revert the frontend first if needed. Leave the additive audit/history and read wrappers in place; existing students can still view saved records. Do not drop audit records or roll summaries back automatically. A currently reopened correction can wait for the fixed UI; it does not unlock the normal AI/save RPC or change the Session schedule.
