# S11-10 — Classroom Intake review

## Scope

Teachers open the existing Session Intake entry to review one student's confirmed statement alongside live demonstration and discussion. The workspace separates student claims from teacher observations, recommended actions, evidence to demonstrate and agreed next steps. Review areas: Implementation, Code review, Testing, Documentation, Presentation and Other. This is teacher-authored feedback, not automated code review or assessment.

Student pace feedback is deferred until next week's implementation review supplies more evidence. Intake opening questions, AI harness, collection policy and scoring remain unchanged.

## Workflow

- Search by student/name/team; filter pending, drafts, reviewed, follow-up or missing Intake. Students without confirmed Intake remain visible but cannot open a review.
- Select a student; latest confirmed summary is loaded with its revision. Earlier five sessions show student statements and published feedback. Source conversation, correction history and Reopen summary remain available.
- Select an area, teacher-observed completion (Not checked / 0 / 25 / 50 / 75 / 90 / 100%) and a main feedback choice. Percentages describe the demonstrated work in that area, not formal assessment grades. Select next steps, expected evidence and follow-up time from presets. Public notes are optional and collapsed; Other agreed action requires a note. Changes autosave after one second. Existing written feedback remains available and preserved. Private teacher notes are collapsed and never included in the student response.
- Explicit Publish feedback makes a safe snapshot available only to that student. Further draft edits preserve the last published snapshot until publication again.
- Student Sessions displays Teacher feedback, with the latest open and older reviews expandable; refresh or returning to the browser tab reloads feedback.
- Unsaved changes prompt before closing/switching; failed saves retain in-memory content and pause autosave. Optimistic review versions reject stale tabs. The student summary revision is checked on every save; publication is blocked while a correction is open.

## Migration / release

Run `supabase/migrations/20261105_sprint11_intake_teacher_reviews.sql` before merging the frontend, then run the follow-up `supabase/migrations/20261105_sprint11_quick_review_choices.sql`. The first migration has already been run by the user; only the follow-up is now required. Requires prior Intake summary correction migration. Additive migration, rerunnable, no changes to student claims, Auth roles or existing feedback/work-track data. No production DB operations performed by the implementation.

New private table `intake_teacher_reviews`; direct client access is revoked, RLS enabled. RPC reads/writes enforce assigned-class staff authorization. Student RPC returns only published allow-listed fields for the student's own activated account and enrolment. Drafts and private notes remain inaccessible. No AI/provider calls.

## Validation

- `npm run build`
- `npm test` (248 existing Intake/API checks)
- `node --test tests/intake-reviews/database.test.mjs` (access, privacy, publication, stale versions, corrections, history and revocation)
- Chromium browser regression passed: desktop (1440 × 1080), narrow (390 × 844), in-flight autosave edits, explicit publication, failed-save retry, unsaved student switching, and published-only student rendering. Screenshots visually inspected; fixed site-header CSS interference. Synthetic data only, no production sign-in.
- Reproduce browser test: `npx esbuild tests/intake-reviews/preview.tsx --bundle --format=esm --outfile=.test-build/review-preview.js`, then `node --test tests/intake-reviews/browser.test.cjs`. Playwright must be installed externally/available; set `STUDIO_PLAYWRIGHT_MODULE` to its module path. Optional `STUDIO_CHROMIUM_MODULE` points to an externally installed @sparticuz/chromium ESM module. No runtime/package dependencies added to the project.

## Manual acceptance

Run migration; open a session's Intake records; choose a student. Add Code review observation and next step; check draft-save state. Publish; use that student's account to confirm feedback visibility. Edit a draft without publishing: the student's published version must stay unchanged. Confirm private notes remain hidden and another student cannot see it. Reopen summary and confirm publication is blocked pending reconfirmation. No production acceptance is claimed until this is exercised.

## Review feedback update

User tested the initial implementation and requested option-led review instead of substantial typing. Both review items and next steps now use presets, with optional public notes. Quick-review metadata is validated and allow-listed in a follow-up save RPC migration; no existing drafts/publications are rewritten. Database regression covers option-only publication, null/unverified completion, invalid percentage/choice values and notes visibility; browser regression verifies publication with no typed notes before exercising autosave failure/retry. Intake questions and harness remain unchanged.

## Area navigation refinement

Select an area from a single dropdown to open its review. Existing areas reopen instead of creating duplicates. When more than one area exists, labelled tabs show one review at a time; arrow/Home/End keyboard navigation supported. Each review can be deleted, with confirmation for nonempty content. Existing duplicate categories are retained with numbered tab labels. No data/schema changes; previous migrations still apply.

## Project-specific interview criteria

The user clarified this is an interview record that supports interaction and clear student expectations, not formal marking. Built-in interview guides cover General, Web, Mobile and Data analytics projects, with AI as an optional additional component. Areas are Design & architecture, Implementation & code, Testing & evaluation, Security & privacy, Documentation & delivery, Presentation & demonstration and Other. Legacy category names remain readable, with canonical display labels; duplicate legacy areas are not deleted.

Each criterion records Not reviewed / Not demonstrated / Partially demonstrated / Demonstrated / Not applicable. An optional evidence/measurement field records actual observations and conditions (e.g. 16/20 representative questions answered correctly), never a calculated mark. Completion percentage is separate and collapsed; overall feedback and notes remain available. A criterion decision can be published without a percentage or a generic feedback choice. Unreviewed checks are not failures. No weights, total grades, official unit-rubric claims, automated assessment or provider calls.

Profile changes preserve substantive existing criterion decisions and measurements. New relevant checks appear as Not reviewed; recorded checks from earlier profiles remain labelled as previously recorded. Legacy written feedback stays unchanged unless the teacher edits it. Published snapshots retain criterion labels and guide version (`interview-review.v1`), so later frontend label changes do not rewrite published observations.

Run additive `supabase/migrations/20261105_sprint11_review_standards.sql` after the existing initial and quick-review migrations. It extends the save RPC's validation and student-publication allow-list; no existing draft/publication data is rewritten. Profile secrets/unknown keys and private teacher notes are excluded from published snapshots. Existing authorization, optimistic versions, summary correction guards and draft/publication separation remain in place.

## Interview guide v2: UI/UX and AI core

UI/UX design is now a separate area for navigation, user feedback and usability on required screens. Web responsive-screen checks move there for fresh guides. AI-enabled projects expose a dedicated AI integration & understanding area: purpose/model limits, actual API request, tokens/context/history/truncation, prompt/context/output/stop/tool controls, bounded exception recovery, representative evaluation, key/data/untrusted-input protection, and cost/latency. Short interview prompts guide live discussion; Not applicable is supported where controls are irrelevant. No agent framework or paid provider call is required. Existing saved labels and observations are preserved.

Run latest additive `20261105_sprint11_review_standards_v2.sql` after the initial review table migration. It supersedes prior review save RPC definitions and accepts both v1 and v2 guide versions, without rewriting records. New environments run the full ordered migration chain. Validation includes v2 category publication, continued v1 support, and Chromium UI/UX + dedicated AI interview checks.
