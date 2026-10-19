# Focused student review and recoverable debug

## Student experience

AI review uses up to five focused steps: progress, evidence/testing if discussed, support if discussed, next step, confirmation. Undiscussed optional groups are omitted; the next step may be skipped. At confirmation a student may add an omitted evidence/support group without exceeding five steps. Steps remain stable while text is edited.

Each step shows readable summary text. Edit reveals full-width fields for that group only. The conversation collapses on entering review. Confirmation is still explicit; this is not auto-submission. Confirmed history uses the same concise summary, with evidence/testing/support available on demand. Confirmed records opened through the older Form history route use this same read-only view, removing the duplicated side-by-side summaries and the technical fallback label.

Only role/progress and record structure remain required for focused review. Evidence availability no longer mandates a separate reference/verification method. Missing testing detail, blocker detail, expected next evidence or next action may remain blank/null. The source conversation and original extraction are preserved. No placeholder text is inserted. Added evidence text is retained even if availability is unknown.

## Database contract and release order

Apply `supabase/migrations/20261019_sprint10_focused_review.sql` after AI03 **before deploying the UI**. It is idempotent and changes no historical rows, budget/mode settings or submission windows.

New clients identify `review_version=focused-review.v1`. Only this route uses `validate_session_intake_student_record_v12`, preserving structural/type/length/source checks while treating unmentioned optional details as incomplete observations. New records are labeled `session-intake.v1.2.0`; existing v1.0/v1.1 records remain valid. Legacy chat clients still use v1.1 validation and legacy Form validators are unchanged. Authentication, single-reporting, confirmation, source-pointer checks, window/mode checks and function grants are retained.

The migration extends the existing authenticated student getter with that student's own source conversation and assistance metadata. It adds no public/anonymous access. The teacher read flow remains unchanged.

## Debug during trial

Debug controls default to visible. Set `VITE_INTAKE_DEBUG_ENABLED=false` and redeploy to hide the buttons for classroom use later. Visibility is a UI option, not an authorization boundary.

New submissions persist bounded debug events in existing assistance metadata. Repeated conversation copies are omitted and reconstructed from the stored source conversation. Up to 32 events and approximately 160K characters of compact trace are retained; large traces omit raw detail and flag this, and record captured/saved event counts. This bounds optional diagnostics so large traces do not require unlimited metadata. The server enforces additional metadata bounds.

Debug remains available after save and when reopening history, including corrections and the saved stop reason. Existing submissions without persisted debug can export their saved snapshot and stored metadata; unavailable original runtime detail is explicitly identified and cannot be recreated.

## Validation

- Existing adaptive/API suite: 146/146 passed.
- Focused SQL/helper suite: 3/3 passed, including optional blanks, v1.2 save/readback/debug restoration, legacy validation and v1.1 saves, type/source/window/duplicate/anonymous/cross-student rejection, bounded diagnostics and migration reapplication.
- Production TypeScript/Vite build passed (existing large-bundle warning).
- Real React + isolated PostgreSQL browser rehearsal passed: summary-first four-step review with no default inputs; skip undiscussed next step; save an available demo with no verification method and no fake placeholders; reload read-only history and recover full captured debug. Existing retry, mobile/desktop debug, scroll isolation and restore-on-close checks passed. Synthetic Auth/provider responses only, no paid calls.
- Desktop/mobile review screenshots inspected.

Reproduce after `npm test`:

```sh
npx tsc src/intakeReview.ts --outDir .test-focused --target ES2022 --module nodenext --moduleResolution nodenext --skipLibCheck
S10_PGLITE_MODULE=/tmp/intake-close-validation/node_modules/@electric-sql/pglite/dist/index.js node --test tests/session-ai/focused-review.test.mjs
S10_PGLITE_MODULE=/tmp/intake-close-validation/node_modules/@electric-sql/pglite/dist/index.js S10_PLAYWRIGHT_MODULE=/tmp/intake-close-validation/node_modules/playwright/index.mjs S10_CHROMIUM_EXECUTABLE=/tmp/intake-close-chrome/chromium node tests/session-ai/usage-paused.browser.mjs
```

The production migration is operator-applied; implementation tests do not imply it has been applied or the UI released.
