# Optional session teacher checks

Approved 18 November 2026. Session AI checks remain separate from formal teacher Review nodes and assessment marks.

## Teacher and student behavior

The session roster shows the persisted AI result: Awaiting AI review, AI reviewing, AI reviewed, AI review unavailable or AI review off. Missing intake and Awaiting correction retain their own states. A loading or failed roster read never implies AI has reviewed the submission.

Teachers may open the source and AI check and do nothing. Only **Mark as checked** writes a check. Optional student-visible feedback contains a fixed level (Good progress, Satisfactory, Needs attention) and a comment of up to 2,000 characters. Blank fields are valid. The check means the teacher has read this update, not that they verified implementation or awarded a mark. Checks do not complete formal Review nodes.

The check panel sits below the AI panel in the existing scrollable session pane. It uses one column, an explicit optional label and one primary action. The roster refreshes after an AI state change or a saved check. Filters include Checked, AI reviewed, Updated since check and Needs attention. Students see their own check, level/comment and teacher/date in the saved session summary. No check creates no extra student task.

## Storage and guards

- `session_teacher_checks` holds the latest check per intake. `session_teacher_check_events` holds append-only check history; the UI returns the last 20 entries.
- Saves lock the intake before the check, validate the confirmed summary revision and correction state, and compare the expected check version. Concurrent/stale saves fail without erasing input. Discard local changes and reload before retrying a conflict.
- A reconfirmed student summary does not inherit a check from an older revision. It shows Updated since check and retains the old feedback as history. New check fields start empty.
- These private tables have no direct authenticated/anonymous grants. Security-definer RPCs enforce teaching-class access; students can read only their own receipt. Neither author UUIDs nor private observations are exposed.
- Existing legacy reviews, formal node drafts, marks and AI generation leases are unchanged. Opening the panel does not consume a new AI call for an already current saved AI review.

## Rollout

1. Run `supabase/migrations/20261118_session_teacher_checks.sql` in the production SQL editor. It is additive and safe to rerun; `supabase/schema.sql` contains the same migration for fresh installations.
2. Confirm it ran successfully, then merge the feature PR through the usual explicit merge step.
3. Check a saved AI review reads AI reviewed, mark one student with both fields blank, and verify Checked appears immediately.
4. Save a level/comment for a test student and verify only that student sees it. Confirm no formal Review node or mark changes.
5. Reconfirm a corrected student summary and verify the old check becomes historical. Check desktop/mobile scrolling, roster selection, filters and unsaved-change protection.

Keep the additive migration if rolling back the UI; old releases ignore its tables. No automatic migration of legacy feedback is performed.

## Validation

- `npm run test:session-checks`: database authorization, read-only opens, blank checks, revision/correction guards, version conflicts, history, real AI job states, editor behavior, student receipt and live roster/filter updates.
- `npm run test:core-review` and `npm run test:review-nodes`: existing formal review behavior.
- `npm run test:intake`, fresh-schema test and production build.
- No paid model calls or production writes are used for these tests. Browser visual verification remains outstanding: Chromium startup in this environment previously failed with EPERM. Production SQL and merge await the teacher's normal confirmation.
