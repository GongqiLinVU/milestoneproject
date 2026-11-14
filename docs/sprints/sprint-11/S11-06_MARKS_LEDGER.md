# S11-06 — Configurable block marks and feedback ledger

Approved 14 November 2026. Implementation branch: `feat/block-marks-ledger`.

## Teaching workflow

Open **Marks & Feedback**, select the teaching class, inspect the default NIT3004 structure and save it once. The ledger belongs to that class/block and does not depend on a currently selected Session.

| Assessment | Maximum | Detail |
| --- | ---: | --- |
| Progress report | 10 | Manual individual mark |
| Final report | 70 | Code 25; Technical document 30; User manual 5; Peer Review 5; Poster 5 |
| Presentation | 20 | Manual individual mark |
| Total | 100 | Derived only after every leaf mark is entered |

Overview provides the three assessment totals. Select **Final report** for the five editable component scores. Search by name/ID or filter by team, incomplete marks and feedback status. The student column and column headings stay visible while scrolling; normal Tab navigation moves between inputs. Blank means unmarked, while 0 is an actual mark. Incomplete groups and the final total display Pending, with an entered-item count.

Scores and comments save after a short pause or when a score loses focus. Each student has a visible save/error state. Changing tabs, switching classes, signing out and closing the page are guarded against losing unsaved marks. Failed saves stop automatic retries and preserve edits. If another window has saved first, copy any local edits needed for reconciliation, use **Reload saved records**, inspect the stored values and reapply the intended changes. There is no automatic overwrite of the other window's record.

Click the student's name or feedback status to open a focused feedback panel. Add private marking notes describing what was actually checked in the report, code demonstration, testing, documentation or other deliverables. Explicitly identify items not checked. Write final teacher feedback manually, or generate an AI draft. AI drafting loads saved notes, this student's block session records and current published teacher reviews from the server. Student claims stay distinct from teacher observations. Stale teacher reviews following a corrected intake are omitted. Draft output has short points under Strengths, Areas for improvement and Recommended next steps. It never assigns scores. Adopt the draft explicitly, edit it and check confirmation when satisfied. Scores, comments and confirmation remain teacher-only; this increment does not publish assessment marks to students.

Teacher notes are the bridge to submitted documents and code review observations. Reports attached in ChatGPT are not automatically available to the application. The application does not infer individual contribution from the team's application quality. AI drafting remains optional; a provider outage does not prevent marking or manual feedback.

Excel and CSV export all students by default; optionally select the current filtered subset. Export contains course/year/block/class, student identity/team, configured leaf marks, group subtotals, total, completion status, final feedback and its confirmation status. Unmarked scores and incomplete totals remain blank. Private notes, separate AI drafts, audit records and raw session data are excluded. CSV uses UTF-8 BOM and formula-safe text quoting. XLSX uses typed numeric cells and inline text, freezes the header and student identity columns and includes filters.

## Configuration and persistence

This is a hybrid model, rather than an untyped key/value store:

| Table | Purpose |
| --- | --- |
| `assessment_templates` | Versioned JSON starting templates; seeded NIT3004 default |
| `class_assessment_plans` | Independent class snapshot, revision and editor |
| `assessment_records` | Student/class identity, revision and comments keyed by stable item ID |
| `assessment_marks` | One numeric or null score per student record/item ID |
| `assessment_audit` | Append-only caller-visible history of successful configuration/record saves |

The JSON tree defines stable IDs, labels, order, leaf maxima and optional comments. Groups derive maxima from children. The first release uses a template selector and JSON configuration editor. New or future classes can add/remove/reorder assessments and use another total without schema changes. Scores are points out of the configured maximum, with no implicit weighting or normalization.

Configuration can change only before any student record has been saved, including a notes-only record. Later template edits never rewrite existing class snapshots. A later year/block receives a new snapshot. Changing the structure of a class already being marked requires a separately designed explicit migration/reconciliation workflow, not deletion or silent rescaling.

All five tables have RLS enabled and direct access revoked for public, anonymous and authenticated callers. Authorized teacher RPCs reuse `require_teaching_class`. Marks accept only configured leaf IDs and numeric/null values within the configured maximum, with at most two decimal places. Student and class identity are validated together. Record revisions reject stale saves. Configuration and first-record creation use the same class row lock so their ordering cannot silently mix structures. The audit stores before/after values and cannot be rewritten through the caller APIs.

## Validation

- `npm run test:assessment`: 20 passing tests covering database, configuration, export, mocked API and actual React component save-state tests. Database migration is applied twice to check rerun behavior.
- Database coverage: teacher/class isolation; student/anonymous denial; malformed configurations; blank/zero; mark bounds/precision; unknown/group IDs; stale saves; lock after marking; independent future structures; preserved audit before-values; authorized feedback context; private/stale review exclusion.
- Component coverage: edits made during an in-flight save are preserved and saved with the returned revision; invalid marks do not save; failed saves stop automatic retries and preserve edits; export is blocked while dirty and enabled after successful save.
- Export coverage: dynamic columns; totals; filtered input rows; excluded private fields; CSV unicode/newlines/quotes/formula safety; XLSX ZIP/XML structure and typed blank/zero cells.
- Independently opened a synthetic XLSX using openpyxl: leading-zero IDs, literal formula-looking text, numeric zero, blanks, multiline comments, frozen panes and filters verified.
- AI tests mock both database and provider requests. No paid provider calls or production writes were made.
- `npm run test:review-suggestions`: all 19 existing review regression tests pass.
- `npm run build` checks the production application; the focused assessment command separately compiles the new API handler.
- Browser screenshot/layout QA is still outstanding: the available local Chromium environment could not start. Component and build checks do not establish visual correctness on real desktop/mobile browsers. Complete the smoke checklist below before marking live students.

## Migration and release

Migration: [`20261114_block_assessment_ledger.sql`](../../../supabase/migrations/20261114_block_assessment_ledger.sql). The installation snapshot `supabase/schema.sql` contains the same SQL. This increment starts from main after PR #118 and does not require unmerged review-focus PR #119.

1. Review the draft PR and apply the additive migration in a staging database already on the current main schema. Dependencies are existing class authorization, roster, session intake, correction revision and teacher review tables/functions. Do not run the entire installation snapshot against an existing production database.
2. Verify that the five new tables and five teacher RPCs exist. With an assigned teacher account, load a class that has no assessment snapshot; no marks should have been created just by opening the page. Student and unassigned-teacher accounts must be denied.
3. Complete the smoke checklist using a test class/student. Do not test first-save locking with real students until the class structure has been checked.
4. After migration verification and the normal merge approval, merge and deploy the application/API. Existing `OPENAI_API_KEY`, Supabase server URL/publishable key and teacher token authorization are reused. Optional `ASSESSMENT_FEEDBACK_MODEL` defaults to the existing project's `gpt-5-mini` family. Without the provider key, manual marking works and AI gives an explicit configuration message.
5. Run the same smoke checklist on the deployed test class before use in live marking. Leave real marks and comments untouched until the teacher begins assessment.

### Smoke checklist

- Desktop and narrow/mobile widths: open the new tab, select class, save default structure, verify overview and all three assessment views, scrolling/sticky headings, input focus and feedback dialog scrolling/close behavior.
- Enter 0, then a valid decimal, then an invalid/out-of-range mark; verify save state and reload round-trip. Incomplete subtotal/total must remain Pending. Complete all marks and verify total.
- Edit the same student in two windows: the second stale save must be rejected without overwriting the stored record. Use the reload/reconciliation path and verify the audit list is understandable.
- Change a score while its previous save is pending; verify the later value persists. Attempt navigation/class switch with unsaved edits and verify the guard.
- Enter notes, manually write feedback and confirm; reload. Explicitly generate an AI draft in the deployed test class only if a provider call is intended; it must stay separate until adopted and never modify grades.
- Export all and filtered students to both formats; open Excel and check comments, blanks, zero and totals. Private notes/AI drafts must be absent.
- Create a separate test class with a different configuration and check dynamic views/exports. Existing marked class structure must stay locked.

### Recovery

If migration fails, the transaction rolls back. Fix the reported dependency/SQL issue and rerun the same migration. If application smoke fails, revert the application deployment while leaving the additive tables and recorded marks intact. Do not delete marks, class plans or audit records as a rollback strategy. Export any recorded results before any separately reviewed data repair.
