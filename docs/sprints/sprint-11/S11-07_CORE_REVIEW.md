# S11-07 — Core classroom review

Approved 15 November 2026. Implementation prepared for review; production migration and release remain pending.

## Teacher experience

1. Open a student. Read the saved **Top 3 questions**, ordered by review value. Reported changes and source records are available in collapsed sections.
2. Record one natural **Your observation** after the discussion/code review. Observations autosave. After a pause or on leaving the field, AI organises the saved observation into editable core points.
3. Check **Confirmed progress** and **Main issues**, then select **Confirm and complete review** once. Optional next steps are collapsed, may remain empty, and are generated only when the teacher explicitly requested an action.

No Quick/Detailed selector, criteria checklist, required follow-up task, or second confirmation dialog. Teachers can type the core points themselves and complete without waiting for AI. Raw observations and private teacher notes are not published. The student sees only the core feedback and publication metadata; empty next steps are omitted. This is classroom review, not automatic grading.

## Generation and evidence boundaries

- Preparation is keyed by student/session intake and stored independently of teacher drafts. First opening an unreviewed student prepares once; reopening reads the stored result. A legacy saved suggestion is reused rather than regenerated. New preparation outputs contain exactly three short questions; legacy output is shown with at most three.
- Preparation uses the existing bounded session context: changes since the last valid published review through the selected session, plus unresolved baseline matters. Self-reports remain unverified. A source-change hint does not trigger regeneration. **Refresh guide** explicitly replaces only preparation and retains the previous saved result.
- Feedback organisation uses the **saved teacher observation**, selected student name and summary revision. Student claims, preparation drafts, and private notes are not sent to this formatter. Critical attribution ambiguity returns one clarification instead of fabricated conclusions. Model instructions preserve uncertainty and do not infer full understanding from shown code.
- Generated feedback is cached by source fingerprint. Changes to the observation can organise a new version. Failed or interrupted work requires explicit retry for the same input. The original observation and manually edited core points remain available.
- These are prompt and validation boundaries, not proof that a model judgment is correct. The teacher owns the final decision. There are no model-derived marks.

## Storage and concurrency

Migration: `supabase/migrations/20261115_core_review_workflow.sql`; mirrored at the end of `supabase/schema.sql`.

`intake_review_generation` holds preparation/feedback results, the previous result, source/request fingerprints and a 90-second generation lease. Direct anonymous/authenticated table access is revoked. Caller-authorized RPCs enforce existing teaching-class access. A live lease prevents concurrent windows from issuing duplicate normal provider calls. Results must be stored successfully before the API returns them as ready. A stale lease cannot replace a newer one.

This is durable reuse with bounded recovery, not a claim of exactly-once provider billing: if a process dies after the provider answers but before the result is stored, an explicit later retry can repeat that paid request. No automatic retry handles this case. Provider requests have a 45-second timeout; pending UI state polls the workspace for up to 100 seconds without calling the model again.

The existing `/api/review-suggestion` endpoint routes new `prepare`/`feedback` actions to a server helper outside the function directory. The old actionless, explicitly triggered API remains compatible with old clients; it does not gain the new cache semantics. No additional Vercel function is introduced. Existing OpenAI configuration is reused; `REVIEW_FEEDBACK_MODEL` optionally overrides the formatter model.

Core drafts use `workflow: core.v1`. The core save RPC delegates existing version, summary-revision, student-correction and publication guards to the existing review save function. It supplies compatible storage fields automatically. Publication allowlists core points and excludes raw observation/source text/private notes. Existing published reviews keep their legacy renderer. Full earlier drafts are archived in `core_legacy_draft` on first conversion and remain readable; merely opening does not convert them.

Teacher saves are serialised. Edits made during a save remain dirty and the next save uses the returned version. A conflict stops automatic saves and retains local input. A late model result cannot replace changed observations or teacher-authored core decisions. Explicit rebuilding is labelled as replacing draft core points. Refreshing preparation never changes these drafts.

## Validation

- `npm run test:core-review`: 28 database/API/actual React component tests. Includes repeatable migration, class isolation, cache reuse after source changes, competing/expired leases, stored-result-before-response, exact Top 3 validation, teacher-only formatter input, student privacy, optional next steps, legacy preservation, correction/version guards, idle organisation, manual completion while AI is pending, failed-cache reopening, and save/AI races.
- `npm run test:review-suggestions`: 19 existing tests pass.
- `npm run test:assessment`: 28 existing tests pass.
- `npm run test:intake`: 248 existing tests pass.
- `npm run build` and `git diff --check` pass.

Provider calls are mocked in tests. No paid model requests or production data writes were made. React component tests do not establish visual layout quality. Browser visual QA and real-provider behaviour still need checking on the deployed preview with a teaching account.

## Rollout and recovery

1. Review the PR and back up the database using the usual process.
2. Run the additive migration in Supabase SQL Editor. It is idempotent and adds a private cache table, one legacy-archive column and teacher RPCs. It does not rewrite student intake records or existing published feedback.
3. Confirm SQL succeeded before merging/deploying the UI. Without the migration, the new workspace cannot load; it displays a migration/error message and does not overwrite records.
4. On preview, check desktop and narrow layouts, first preparation/reopen/explicit refresh, one natural observation, manual point editing, completion, and the student receipt. Verify raw observation/private note are absent from the student view. Check another teacher/student cannot access the cache. Check a pending student correction prevents completion.
5. Follow the established explicit merge instruction after migration confirmation and preview review.

If release must stop, retain the additive database objects and drafts. New core publications retain compatible legacy item/action fields, allowing the older renderer to show their substantive points. Older clients may edit these compatible records using their legacy workflow; do not use rollback to conduct parallel editing. Do not drop cache/archive data as a UI rollback step. Restore the new UI after resolving the issue.
