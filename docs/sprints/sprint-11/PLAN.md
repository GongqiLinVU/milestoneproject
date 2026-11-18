# Sprint 11 — Classroom onboarding and evidence led refinement

**Opened by Joseph on 26 October 2026. Status: active.**

Sprint 10 remains closed. Begin from main `edaa4ec` (PR #98); preserve its operating contracts and the [classroom observation plan](../../feedback/PLAN.md). This sprint starts with an explicit pre-classroom rehearsal finding, not a claim of broad student feedback.

## Goal and first approved increment

Make the first NIT3004 check-in a clear reconnection with the existing project. NIT3003 establishes project scope and design; NIT3004 builds on that work through implementation, testing and delivery. The old first question jumped to a commitment “before S2” without establishing the starting position. Joseph approved a short question plus optional scaffolding, with NIT3003 design deferred.

S11-01 collects project baseline and personal responsibility in one opening question. Show a brief hint accepting not-started work and undecided roles, optional sentence starters and a collapsed illustrative example. Use “before the next class” in guidance rather than S2. The next-step starter is optional; do not add a fixed second question or require extra rounds. Update first-Session guide and shortcut wording. Keep hints/examples outside the model and saved source transcript.

## Approved extension after S1 review

Joseph requested review and revision of all S1–S9 openings and supplied the current S2 screen. S11-02 gives S2–S9 short entry questions aligned with their curriculum stage, the same optional scaffolding, and a collapsed last-check-in panel instead of quoting long prior roles/actions in the displayed question. Full historical role/action context stays in the source opening and remains available to the model. It is labelled historical, not a current student claim; examples and sentence starters are never source content.

The earlier exports cover S1 and S3–S9, eight Sessions, not nine. S2 was skipped in that rehearsal; its current no-history opening is evidenced by Joseph's screenshot and code. No original S2 export is invented. See [S11-02_REPORT.md](S11-02_REPORT.md) for the nine-question map and evidence limits.

## Acceptance

- First opening asks where the project stands and the student's part; no S2 jargon or assumed completed implementation.
- Guidance and example are optional, readable at mobile and desktop widths, and never become student evidence merely by display.
- Not-started/help shortcuts populate the draft only and do not send automatically.
- A sufficient answer may go directly to review; existing two-clarification cap and per-target allowances stay unchanged.
- Each S1–S9 opening reflects its stage without assuming completed work, required testing or an existing plan. Prior role/actions remain available as complete historical context; missing context creates no empty quotations. Saved history is not rewritten.
- Focused offline and real-component browser checks plus production build. Synthetic API only; no paid evaluation or production writes.

## Boundaries and follow-up

No schema/RPC migration, grading, knowledge base, new semantic harness or provider instruction change in S11-01. Current teaching scope is NIT3004; no new NIT3003 routing or pedagogy is implemented. Review subsequent rehearsal observations as a batch rather than precommitting new features. Keep readiness checkpoints on 29/30 October and teaching from 2 November. Basic readiness does not establish educational benefit or cohort-scale reliability.

## Evidence and release

See [S11-01_REPORT.md](S11-01_REPORT.md) for the initial S1 increment and [S11-02_REPORT.md](S11-02_REPORT.md) for the approved S1–S9 extension. Keep one focused Draft PR; merge only after Joseph's approval. Continue real-use collection in [the feedback register](../../feedback/FEEDBACK_LOG.md).


## S11-03 — Public classroom onboarding (approved 1 November 2026)

Joseph approved refreshing the public landing page before teaching starts on 2 November. Lead with project progress, explain attendance versus progress, describe Form/AI review accurately, and give first-login guidance verified against StudentAccess. Retain the visual identity, four-week course overview and deliverables; make studio guidance independent of weekday and use supportive wording. Formal submission instructions remain teacher/course authoritative. Assessment Assistant remains a separate project.

Acceptance: working student/teacher links, keyboard-accessible section links and expandable guides, readable desktop/mobile layouts, no public database-health request, production build. No auth, API, database, provider or Intake behaviour changes. See [S11-03_REPORT.md](S11-03_REPORT.md).


## S11-04 — Shared Project Library (approved 1 November)

Joseph created 2B4 and approved removing Block ownership from project definitions. Implement Active/Archived lifecycle, shared teacher read with creator/admin maintenance, class-scoped assignments and optional explicit NIT3003 predecessor links for NIT3004. Preserve all IDs and historical evidence. Include an idempotent migration, matching installation snapshot, local RLS/integrity tests and a production rollout/recovery runbook. No production database action, automatic history merge or assessment expansion. See [S11-04_PROJECT_LIBRARY.md](S11-04_PROJECT_LIBRARY.md).


## S11-05 — Returning-student enrolment (approved 1 November)

Joseph approved Student ID lookup in Add student: exact match, explicit profile confirmation, existing-account reuse, unassigned team/project, no duplicate current enrolment, and a visible block for another Active class. No match continues manual creation; accountless histories can be prepared later. Add checked teacher-only RPCs, isolated tests and additive migration; preserve all prior history and credentials. See [S11-05_STUDENT_ENROLMENT.md](S11-05_STUDENT_ENROLMENT.md).


## S11-06 — Configurable block marks and feedback ledger (approved 14 November 2026)

Add an independent teacher Marks & Feedback workspace scoped to the selected teaching class/block, not a session. Manual grades only. Default NIT3004 structure: Progress report 10; Final report children Code 25, Technical document 30, User manual 5, Peer Review 5, Poster 5; Presentation 20. Group and total maxima are derived, never separately editable.

Use versioned JSON assessment templates and per-class snapshots; relational student/item marks and teacher comments; immutable append audit records. Stable item IDs survive label/order changes. First release includes the default template and a pre-marking configuration editor, with structure locked once a student record exists. No retroactive template propagation or automatic mark scaling.

Delivery stages:
1. Class roster ledger, configurable view columns, keyboard-friendly manual inputs, blank versus zero, server-side bounds, missing subtotals, safe per-record versioned saves, teacher-only comments and audit history.
2. XLSX and UTF-8-BOM CSV for all/filtered students using the same configuration; safe text cells and quoting; no internal notes, AI drafts or intake transcripts.
3. Explicit teacher-triggered final-feedback assistance from block-wide student claims, published teacher reviews and teacher marking notes. Keep generated draft separate from final comments and marks; no automatic grading/publication; adopted text remains editable. Reports uploaded in ChatGPT are not automatically available in the app.

Acceptance: class/student isolation; invalid/unknown/group marks rejected; blank and zero round-trip; stale tab conflict; immutable audit; template snapshot lock and alternate structures; computed totals and filter export parity; XLSX openability/CSV formula safety; AI authority separation; no leakage of private notes or drafts. Production build and focused offline database/export/component tests. Browser visual QA must be reported honestly if environment remains blocked. Add additive migration and rollout steps; do not touch production DB, call paid models, merge or deploy without the existing release process.

Status: released in PR #120 after teacher-confirmed migration; merge commit 422b4cbf and Vercel production deployment succeeded. The initial 20 focused tests and production build pass; an independently opened XLSX preserves IDs, blanks, zero and multiline comments. No production writes or paid model calls. See [S11-06_MARKS_LEDGER.md](S11-06_MARKS_LEDGER.md) for architecture, operation, evidence limits and migration/recovery checklist. S11-06 is independent of unmerged review-focus PR #119.

S11-06 release follow-up completed: excluded three API utility modules from function discovery (13 source entries → 10 function entries); 20 assessment, 19 review and 248 Intake/API tests passed, followed by successful preview and production deployment. No additional schema change.

## S11-06 follow-up — Visual assessment structure editor (approved 14 November 2026)

Replace the JSON-first class setup after classroom feedback. Default to the NIT3004 assessment cards: Progress report, Final report with five components, and Presentation. Teachers can edit titles/maxima, add or remove assessments/components, restore removed NIT3004 components, reorder them, undo structural edits, discard local changes and restore the default. Display derived group/overall totals and feedback settings. Keep stable IDs internal and preserve the existing class snapshot and post-marking lock.

JSON becomes a collapsed Advanced section. Raw edits require explicit validation/application before affecting the visual editor; pending/invalid JSON blocks save without overwriting the teacher's visual work. Configuration edits participate in unsaved-change protection and pause marks/export until saved or discarded. Keep the current schema and teacher RPCs; no migration or automatic changes to any saved class configuration.

Acceptance: actual component checks for first setup, add/remove/restore/undo/reorder, stable IDs, alternate imported structures, maximum validation, explicit JSON apply/discard, locked classes, failed saves and unsaved guards; production build and existing marks tests. Browser visual verification remains separate from React component checks. Ship as a focused PR after successful Vercel preview; production merge follows the existing explicit release instruction.

Visual editor status: implemented; 28 assessment tests and production build pass. See [S11-06_ASSESSMENT_COMPONENTS.md](S11-06_ASSESSMENT_COMPONENTS.md) for the interaction model and release checks. No SQL migration is needed.

## Core review workflow — approved 15 November 2026

Reduce the classroom review to opening a student, reading the stored Top 3 conversation prompts, writing one natural teacher observation, and confirming concise core feedback. Remove teacher-selected Quick/Detailed modes from this workspace; set the compatible storage mode automatically. Next steps remain optional and must not be invented merely to complete a review.

Preparation is generated once per student/session intake and stored separately from teacher edits. Reopening reads the saved result. New source data only produces a stale-source hint; explicit refresh replaces preparation only. Coordinate concurrent openings server-side, preserve previous saved suggestions, avoid automatic retries after interrupted/failed generation, and do not silently overwrite teacher observations or published reviews.

Use saved teacher observations (not student claims or legacy AI drafts) to prepare editable Confirmed progress and Main issues, with Optional next steps only when the teacher explicitly requests them. Ask for clarification only when attribution/meaning prevents a reliable result. Keep unexamined matters unknown. Teacher edits win over late AI responses; one final Confirm and complete action publishes only core points, without per-item checkboxes or a second confirmation dialog. Existing reviews remain readable and legacy draft content is preserved on conversion. Private notes and raw teacher observations remain private.

Deliver an additive migration with authorized cache/lease and core save RPCs, matching installation snapshot, durable preparation without duplicate normal calls, autosave/conflict/correction guards, compact student feedback, focused DB/API/component tests and rollout instructions. No automatic grades, live production writes, paid model calls, report ingestion or bulk/team observations. Base on released main; keep separate from unmerged PR #119. Require migration confirmation before the normal merge step. Browser layout verification must be reported separately from component tests.

Core review status: implemented with 28 focused tests, 19 existing review tests, 28 assessment tests and 248 Intake tests passing; production build passes. Migration and preview/manual visual checks remain pending before release. See [S11-07_CORE_REVIEW.md](S11-07_CORE_REVIEW.md) for the workflow, durable-cache recovery boundaries, privacy, compatibility and rollout.

Core review release follow-up (15 November): PR #122 merged after confirmed SQL success, with successful production deployment. Classroom feedback exposed an inherited `overflow:hidden` rule clipping the new body. Add a bounded flex dialog/workspace, an independently scrollable core body and roster with scroll-chain containment, and restore-on-unmount HTML/body scroll locking. Keep the student heading and completion footer outside the scrolling body. No SQL or review-data changes. All 30 core tests pass including two new scroll-lock lifecycle checks; production build passes. A real-browser regression fixture covers desktop, short desktop and mobile wheel/edge/close behaviour, but Chromium launch is blocked here by `socket() failed: Operation not permitted`; those visual/wheel assertions remain unverified until run in a browser-capable environment.

## S11-08 — Independent teacher review nodes (approved 15 November)

Decouple teacher decisions from session intake records. Introduce class-configured R1/R2/R3/R4 nodes, default evidence windows S1, S1–S3, S4–S6 and S7–S9 with suggested meetings S1/S4/S7/S10. R1 may reference an explicitly selected accessible previous class; never infer previous enrolment or copy another student's data. A node can be completed on any actual date, including without a submitted intake. Keep legacy session publications readable without moving them.

Add a Review tab with node work queues, student/team/status filters, searchable published/draft records and a visual settings editor. Store each student's teacher review independently, with optimistic versioning, frozen evidence snapshots and immutable publication history. Explicit source refresh updates only working evidence; completed publication snapshots remain unchanged. Reuse the concise teacher observation/core feedback editor and durable Top 3 generation. Missing records remain unknown; external progress reports are not ingested automatically. Settings are class-local; started nodes keep stable definitions.

Keep session progress checks separate and AI-labelled: automatically generate/store a check when a confirmed intake is viewed after submission, reuse it on reopening, coordinate concurrent views, and leave failures for explicit retry. No teacher-confirmed decisions or marks are inferred. Both deterministic and AI Intake use the same confirmed-record path. Existing history is generated lazily, without bulk/provider calls during migration. Add student views of independently published teacher reviews. Release as an additive migration and focused PR with DB/API/component tests, production build and explicit migration confirmation before merge; report browser-test limits honestly.

S11-08 status: independent teacher nodes, Review tab/settings/search, frozen source/publication history, student node feedback and separately cached session AI checks are implemented. Session checks generate lazily when a confirmed summary is viewed (including the post-submit summary), without a background worker or bulk historical calls. Published node conclusions also feed assessment-comment assistance. All 31 new tests and 325 existing tests pass; production build passes. See [S11-08_REVIEW_NODES.md](S11-08_REVIEW_NODES.md) for evidence boundaries, migration, operation and recovery. Preview visual/provider checks and production migration/merge remain pending.

S11-08 release follow-up (15 November): PR #124 merged after confirmed migration and deployed successfully. A production screenshot exposed the single-node editor inheriting the session roster's 220px grid column due to equal-specificity CSS/load order. Replace the shared workspace class with a dedicated one-pane flex container and explicitly align the header, reading body and actions to a 1120px maximum. Existing internal scrolling/background lock is retained. The queue component regression now rejects the old shared grid class. All 31 focused tests and production build pass; no SQL or data changes. Added a browser fixture for 1440px/900px/390px widths with actual styles, wheel and footer assertions; local Chromium launch remains blocked by socket EPERM, so these browser assertions are not claimed as passed.

## S11-09 — Student presentation schedule (approved 18 November)

Replace the Week 4 placeholder/order card with a full-width presentation schedule. Show published order, project and member names; highlight the signed-in student's team. Start at 08:30; groups of 1–3 have 15 minutes including demo, groups of 4 have 20 minutes including demo, with an additional 5 minutes for Q&A. Show approximate starts, never a promised finish or total session duration. All students must arrive at 08:30 and should remain to support the other presentations. Missing/unsupported group sizes do not produce invented subsequent start times.

Latest steering: hide the Week 4 activity form/entry point for now, preserving stored submissions and backend functionality; no two-tab schedule/activity interface. Default the weekly view to the highest active week (3+4 → 4), while allowing manual browsing. Refresh published state safely when visible and preserve manual selection until the highest active week changes. Scope names to the student's active class, expose no IDs/emails and keep unpublished drafts private. Future publications freeze member names; enrich old published orders without changing their order, project titles, publication dates or draft state. Add focused timing/component/database tests, migration/runbook and production build; production migration and merge follow the existing explicit confirmation process.

S11-09 latest steering: Weekly Activities defaults expanded. Week 4 has no activity tab/CTA; the existing form and submissions remain intact. Implemented highest-active-week selection, manual browsing, published member names, own-team highlighting and approximate starts from 08:30 without total/end-time promises. All 15 focused, 12 class-isolation, 248 Intake and one fresh-schema test pass; build passes. See [S11-09_PRESENTATION_SCHEDULE.md](S11-09_PRESENTATION_SCHEDULE.md) for scope, migration and release checks. Browser layout checks remain blocked by Chromium startup EPERM; production migration and merge are pending.

## S11-10 — Optional teacher checks for session AI reviews (approved 18 November)

Replace the obsolete session Pending review state with the actual AI outcome. Distinguish missing intake, awaiting AI, AI reviewing, AI reviewed, AI unavailable/off and awaiting student correction. Add an optional explicit Mark as checked action, with optional Good progress / Satisfactory / Needs attention feedback and optional student-visible comment. Merely opening a record must never mark it checked. Do not require checking each session or equate checking with code verification, a formal review-node completion or a grade.

Store checks separately from legacy teacher reviews and independent review nodes. Bind each check to the confirmed summary revision; preserve versioned history and expose Updated since check after reconfirmation. Serialize saves against student corrections and other teachers; retain input on failed/stale saves. Show the student's own saved feedback with its date/teacher/revision, and keep old feedback visibly historical. Refresh roster state when AI generation completes or a teacher saves a check. Add class/student authorization, private tables, focused database/component/status tests, matching schema snapshot and rollout documentation. Production migration confirmation precedes the usual explicit merge step.

S11-10 implemented: optional blank-or-feedback checks, student receipts, current-revision roster statuses and historical checks. Validation: 13 focused checks, 30 core-review, 31 review-node, 248 Intake and one fresh-schema test pass; production build passes. See [S11-10_OPTIONAL_SESSION_CHECK.md](S11-10_OPTIONAL_SESSION_CHECK.md). Browser layout verification remains outstanding. Additive production SQL must run before merge; no production writes or merge performed.

## S11-11 — Student summary and teacher feedback (approved 18 November)

Hide session AI analysis, attention points and questions from the student-facing saved summary. Keep the student's confirmed progress and optional teacher Checked receipt/level/comment; no check means no Pending review task. Keep published formal node feedback separate and unchanged. Maintain the existing automatic AI preparation, cached by confirmed revision, through a nonvisual component using the same lifecycle as the teacher AI panel. Teacher analysis and explicit retry remain available. This is a presentation change, not a new RPC authorization boundary; the existing own-intake API permissions remain unchanged. No database migration or data deletion is required. Add component checks for student rendering, background generation/cache/errors and retained teacher analysis.

S11-11 implemented: shared AI preparation lifecycle with a nonvisual student component; saved student summary and teacher receipt composed in one view. Teacher AI panel retained and labelled as teacher reference. Validation: 18 focused session-check tests (including five new student-view/preparation tests), 31 review-node, 30 core-review and 248 Intake tests, plus production build. No database changes; no paid model calls or production writes. Actual browser layout verification remains outstanding.

## S11-12 — Clear student feedback labels (approved 18 November)

Remove the confusing student-summary footer. Show teacher name and check time without summary-version jargon in session check receipts. The administrator's bootstrap profile currently uses Platform administrator as its display name; add a small own-name editor under Classes and teachers so the actual teacher name can be configured without hardcoding a person's identity. Resolve receipt authors through their current teacher profiles, with saved names as fallback; keep original author IDs, name snapshots, timestamps and revision history intact. A small migration adds own-name RPCs and updates the receipt accessor; students cannot edit teacher names. Validate scope, historical attribution and student rendering, then publish a reviewable PR before the usual migration/merge step.

S11-12 implemented: removed the summary footer and receipt revision jargon; teacher profile name setting is available under Classes and teachers. Existing receipts resolve each actual author profile without rewriting audit history. Validation: 21 focused session-check/name/receipt tests, one fresh-schema test and production build pass. Browser layout verification remains outstanding. Run the new display migration before the usual explicit merge step, then set the account's teacher display name once.
