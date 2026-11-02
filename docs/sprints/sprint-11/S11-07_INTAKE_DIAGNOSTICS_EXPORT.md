# S11-07 — Administrator Intake diagnostics download

Status: implemented and locally verified; production SQL/browser acceptance pending.

## User flow

Superadmin → Session check-in → select a class → Intake diagnostics → choose one Session or All Sessions → Download Intake diagnostics. The JSON contains confirmed submissions only, including source conversation, final record, confirmation/corrections, prompt/schema/test-suite versions and persisted AI assistance/debug. Students and ordinary teachers have no button and cannot call the export RPC. No data is deleted and no download-success/last-download state is persisted; a browser download request is not proof that a file was saved.

Exports include current roster name/team metadata (explicitly labelled as current, nullable for off-roster history), not an invented historical team snapshot. Auth user IDs, emails, credentials and payload hashes are omitted. The diagnostic content can contain student-provided information; keep exported files within the existing teaching/analysis workflow.

Debug status is one of no_saved_debug, saved_partial, saved_within_capture_limit, saved_extent_unknown. Compacted requests and the stored-event cap still apply. A stored trace is never described as a complete raw provider trace; old records without capture counts have unknown extent. Unsaved conversations are not exported or reconstructed.

## Backend

Read-only security-definer RPC `export_intake_diagnostics(uuid,uuid,uuid,timestamptz)` checks is_superadmin before scope lookup. Anonymous EXECUTE is revoked. It validates the class, optional Session/class match and cutoff. Pages contain at most 25 rows ordered by Intake UUID, using a cursor and server-generated cutoff reused on subsequent requests; created/confirmed timestamps after the cutoff are excluded. Pagination avoids PostgREST's default row limit. This is a bounded multi-request export, not a cross-request database transaction; a transaction committed late with older timestamps may not appear consistently. Retry if concurrent activity matters. Client rejects failed/inconsistent pages instead of downloading partial results.

The existing table grants, RLS, submission functions and data are unchanged. The schema snapshot appends the same incremental migration.

## Release and acceptance

1. Joseph runs only `supabase/migrations/20261102_sprint11_intake_diagnostics_export.sql`; never rerun schema.sql against production.
2. After SQL success and merge approval, deploy frontend.
3. As superadmin, choose the intended class/Session and inspect JSON record count, conversations, confirmations and debug status. Test All Sessions, an empty selection and a second class.
4. Confirm ordinary assigned teachers and students cannot see the button or call the RPC. Test browser download and errors. Hosted/browser acceptance remains pending.

Local checks passed: production TypeScript/Vite build; 8 export checks (4 PGlite backend + 4 collection/debug helper), plus fresh-schema check (9 total). Backend checks cover administrator-only access versus assigned teacher/student/anonymous, invalid scope, 27-record pagination, future/draft exclusion, empty class and unchanged data. Helper checks cover debug availability, pagination cutoff reuse, whole-download failures/duplicates/cutoff mismatch and empty exports. Run `npm run test:intake-diagnostics`; fresh schema uses `node --test tests/project-library/schema.test.mjs`.

Recovery: revert frontend if needed. The unused additive read-only RPC is harmless; to remove it, drop only `public.export_intake_diagnostics(uuid,uuid,uuid,timestamptz)`. No data rollback is needed.
