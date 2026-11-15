# S11-08 — Independent teacher review nodes

Approved 15 November 2026. Implementation prepared for release; migration confirmation and merge are pending.

## Separation and default schedule

Session progress checks are AI interpretations of self-reports. Teacher reviews are independently owned decisions, attached to a review node rather than a session intake.

| Node | Evidence window | Suggested meeting |
| --- | --- | --- |
| R1 Starting point | S1 plus explicitly linked previous-class evidence, if available | S1 |
| R2 Midpoint review | S1–S3 plus the last published node conclusion | S4 |
| R3 Progress review | S4–S6 plus the last published node conclusion | S7 |
| R4 Final review | S7–S9 plus the last published node conclusion | S10 or the final meeting |

S10 need not exist as a studio session. Suggested meeting numbers do not restrict when a node can be opened/completed. A student without any intake can still receive a teacher review. Missing records are shown as unknown. Completion time is recorded automatically; an optional actual meeting date supports recording an earlier in-person discussion. It is not backdated silently.

External progress reports, uploaded code and other deliverables are not automatically available to the platform. Teachers check them separately and record what they observed. Prior-class access uses an explicitly chosen accessible class and the same enrolled student's account/ID; no inferred identity matching or automatic history merge.

## Teacher interface

The new Review tab has three views:

- **To review:** node cards show evidence windows, suggested meetings and completion counts. Filter the roster by student name/ID, team and status. Open a student to use the existing concise Top 3 / observation / core feedback editor.
- **Review records:** search student identities and review text, and filter teacher nodes, session AI checks and legacy teacher reviews. AI checks remain visibly distinct from teacher decisions. Legacy drafts/publications remain in their original storage; legacy session feedback is read-only in the session workspace and searchable in Review records.
- **Settings:** visual node cards allow adding/removing/changing nodes before use, and configure automatic session checks and a previous class. No raw JSON editor is required. Each class has its own versioned settings. Once a node is first opened, its definition is locked; add a new node for a different cycle. The previous-class link locks once a node using it has started. Failed settings saves retain edits, and unsaved changes guard navigation/sign-out.

The independent review dialog retains the scroll containment fix: bounded viewport, scrollable content, fixed heading/actions, background scroll lock and cleanup. Browser visual confirmation remains outstanding.

## Source snapshots and publication

`teacher_node_reviews` uses its own ID and a unique class/student/node key. It has no required intake ID. Source snapshots contain only the configured evidence window, the student's eligible previous-class records, historical legacy publications in the window and the previous published teacher-node conclusion. Records after the cutoff and other students' work are excluded. Context arrays have deterministic ordering.

Opening a node creates its initial source snapshot. Later input changes display a stale-source hint; they do not rewrite that snapshot. A teacher first saves the draft, then explicitly refreshes working sources. Refresh increments the source and editor versions. Existing completed publication snapshots remain unchanged. Source refresh does not automatically replace teacher-authored points; the guide has its own explicit refresh action.

Completion validates editor/source versions, core-point bounds, observation alignment, current source consistency and unresolved summary corrections. Source intakes are locked during the final consistency check to serialize against corrections. Publication stores allowlisted core points, node metadata, teacher/date metadata and optional actual meeting date. Raw observations, private notes, generation drafts and full source payloads are excluded from the student response. An append-only application publication table preserves each completion and its exact evidence snapshot.

Student-ID correction continues to work: the new composite roster foreign key is deferrable and participates in the existing atomic administrator correction workflow. Class/student records are accessed through authorized RPCs; direct authenticated/anonymous table access is revoked and RLS is enabled.

Students see a separate Teacher reviews section with published node feedback, class/window metadata and completion/meeting dates. Session feedback receipts remain legacy functionality; no node receipt requirement is added. Marks & Feedback assistance receives published independent node conclusions alongside existing evidence, without raw node observations or private notes. Manual marking remains unchanged.

## Automatic session checks

Both the form and conversational Intake show an AI progress check alongside the confirmed summary, including immediately after submission while that view remains open. Teachers can also trigger the same first check by viewing a confirmed session record. Generation is lazy: if the user closes immediately, the next confirmed-summary view starts it. There is no cron/background worker and migration does not issue bulk model calls.

Each confirmed summary revision has a cached AI result containing a short summary, up to three points to clarify and up to three optional questions. The input includes the current self-report, the previous update and an eligible published teacher baseline. These remain separate authorities; AI cannot confirm new implementation or award grades. Baseline changes alone do not regenerate an existing session check. A newly confirmed summary revision can generate a new check. Open corrections pause checking. Disabled classes make no automatic calls.

A shared private AI cache coordinates node preparation, observation formatting and session checking with 90-second leases, caller ownership, source/request fingerprints, prior results and explicit recovery after failure/interruption. Reopening normal cached results does not call the model. Students cannot force regeneration of a ready check for the same revision. Requests use the existing `/api/review-suggestion` route and server helpers outside the API directory, so no Vercel function slot is added. Existing model configuration is reused. Provider responses are stored before returning ready; a crash after provider success but before persistence may require a duplicate paid request on an explicit retry, so billing is not claimed to be exactly once.

## Validation

- `npm run test:review-nodes`: 31 focused DB/API/actual React component tests pass. Includes repeatable migration, settings conflicts, started-node locks, cutoff/missing-record handling, review without intake, previous-class isolation, baseline authority, cache/lease failure recovery, private formatter inputs, student publication privacy, frozen histories, correction/stale-editor guards, session cache/revision handling, ID correction, assessment context integration, node work queue and searchable AI/teacher records.
- Existing suites pass: core review 30, review suggestions 19, assessment 28, Intake/API 248.
- Production build and `git diff --check` pass. Existing bundle-size warning remains.
- Tests mock provider calls. No paid model call or production database mutation was performed.
- React tests do not establish browser layout/scroll quality. Local Chromium previously failed to start with `socket() failed: Operation not permitted`; signed-in preview visual/wheel verification and real-provider behavior remain manual release checks.

## Rollout and recovery

1. Review the PR and back up the database through the usual process.
2. Run `supabase/migrations/20261115_independent_review_nodes.sql` in Supabase SQL Editor after the already-released core review and marks migrations. The installation snapshot is mirrored in `supabase/schema.sql`.
3. Confirm migration success before merge/deployment. It adds private settings, independent reviews, publication history, AI cache and authorized RPCs; it does not move legacy reviews or rewrite intake records.
4. Preview checks: open Review, verify default R1–R4, adjust an unused node, select R2 for a student with/without intake, check cutoff and missing-source hints, enter observations/date, complete, and verify the student's separate feedback. Confirm private text is absent. Test a stale source, explicit refresh, conflict recovery, another student's access and the dialog's desktop/mobile scrolling.
5. Submit/view a confirmed form and conversational intake with a test account, verify one stored AI check and reuse on reopening, pause during correction, then verify a new confirmed revision. No automatic grades or teacher completion should result.
6. Follow the existing explicit merge instruction after migration confirmation and preview review.

For UI rollback, retain all additive tables and source/publication snapshots. The older application cannot display independent teacher nodes, so they must be reviewed through the new UI after restoration. Do not drop or copy them into session review rows as a rollback step. Existing session data remains intact. Keep model failures recoverable through manual teacher core points; session AI checking is not required to save student progress or complete a teacher node.
