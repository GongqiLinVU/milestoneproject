# S11-10 — Classroom Intake review

## Scope

Teachers open the existing Session Intake entry to review one student's confirmed statement alongside live demonstration and discussion. The workspace separates student claims from teacher observations, recommended actions, evidence to demonstrate and agreed next steps. Review areas: Implementation, Code review, Testing, Documentation, Presentation and Other. This is teacher-authored feedback, not automated code review or assessment.

Student pace feedback is deferred until next week's implementation review supplies more evidence. Intake opening questions, AI harness, collection policy and scoring remain unchanged.

## Workflow

- Search by student/name/team; filter pending, drafts, reviewed, follow-up or missing Intake. Students without confirmed Intake remain visible but cannot open a review.
- Select a student; latest confirmed summary is loaded with its revision. Earlier five sessions show student statements and published feedback. Source conversation, correction history and Reopen summary remain available.
- Add specific review observations and next steps; changes autosave after one second. Private teacher notes are collapsed and never included in the student response.
- Explicit Publish feedback makes a safe snapshot available only to that student. Further draft edits preserve the last published snapshot until publication again.
- Student Sessions displays Teacher feedback, with the latest open and older reviews expandable; refresh or returning to the browser tab reloads feedback.
- Unsaved changes prompt before closing/switching; failed saves retain in-memory content and pause autosave. Optimistic review versions reject stale tabs. The student summary revision is checked on every save; publication is blocked while a correction is open.

## Migration / release

Run `supabase/migrations/20261105_sprint11_intake_teacher_reviews.sql` before merging the frontend. Requires prior Intake summary correction migration. Additive migration, rerunnable, no changes to student claims, Auth roles or existing feedback/work-track data. No production DB operations performed by the implementation.

New private table `intake_teacher_reviews`; direct client access is revoked, RLS enabled. RPC reads/writes enforce assigned-class staff authorization. Student RPC returns only published allow-listed fields for the student's own activated account and enrolment. Drafts and private notes remain inaccessible. No AI/provider calls.

## Validation

- `npm run build`
- `npm test` (248 existing Intake/API checks)
- `node --test tests/intake-reviews/database.test.mjs` (access, privacy, publication, stale versions, corrections, history and revocation)
- Chromium browser regression passed: desktop (1440 × 1080), narrow (390 × 844), in-flight autosave edits, explicit publication, failed-save retry, unsaved student switching, and published-only student rendering. Screenshots visually inspected; fixed site-header CSS interference. Synthetic data only, no production sign-in.
- Reproduce browser test: `npx esbuild tests/intake-reviews/preview.tsx --bundle --format=esm --outfile=.test-build/review-preview.js`, then `node --test tests/intake-reviews/browser.test.cjs`. Playwright must be installed externally/available; set `STUDIO_PLAYWRIGHT_MODULE` to its module path. Optional `STUDIO_CHROMIUM_MODULE` points to an externally installed @sparticuz/chromium ESM module. No runtime/package dependencies added to the project.

## Manual acceptance

Run migration; open a session's Intake records; choose a student. Add Code review observation and next step; check draft-save state. Publish; use that student's account to confirm feedback visibility. Edit a draft without publishing: the student's published version must stay unchanged. Confirm private notes remain hidden and another student cannot see it. Reopen summary and confirm publication is blocked pending reconfirmation. No production acceptance is claimed until this is exercised.
