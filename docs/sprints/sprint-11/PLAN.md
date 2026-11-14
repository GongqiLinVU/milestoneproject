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
