# Sprint 10 — Handoff

## Latest checkpoint — 15 October 2026

PR #74 is merged as 349bc5f and production deployment was verified. PR #75 is
merged as 2806904; student progress-entry wording/layout is deployed. Their
implementation-time candidate statements below are historical. Joseph confirmed
student UI is okay; this is not live Intake quality acceptance.

Joseph configured model pricing and S5 reached a real gpt-5-mini response. The
known alias/snapshot exact-name mismatch retained provision and paused the Block;
see S10-AI02_REPORT.md. AI readiness remains incomplete.

Current PR #76 policy is S10-AI03: configured provider + primary request model
and frozen rates control usage estimates. Returned names are optional opaque
provenance; no format parsing, whitelist or model-name access gate. Unknown usage
retains provision; over-ceiling usage still pauses calls. See S10-AI03_REPORT.md.
140/140 API tests, isolated SQL and paused-review browser checks PASS. Use the
self-contained AI03 migration whether or not the initial AI02 candidate was applied;
never apply AI02 after AI03. The exact S5 operator SELECT/correction stays separate.
No production writes, paid calls, merge or deployment in this update.


## Current checkpoint — 14 October 2026

Latest main fetched and rechecked: **6b2009c4c2941cc9c93545b2d3ec92b951972e76**.
Sprint 9 first production release delivered (PR #68 / 6549171); release report
merged in PR #69 / 6df9282 at root FIRST_PRODUCTION_RELEASE_REPORT.md.
Old pre-release statements are historical.

S10-01 (PR #71) and compact S10-01b (PR #73) are released.
Joseph applied 20261013_sprint10_s01_work_track.sql,
20261013_sprint10_s01_rpc_privileges.sql and
20261013_sprint10_s01b_compact_work_track.sql.
Joseph confirmed manual UI and production save → reload → record retained →
teacher read on 14 October. Do not repeat this as pending or infer exact Session
coverage. Anonymous denial evidence remains in the earlier release checkpoint.
Draft documentation PR #72 contains earlier release history; this checkpoint
supersedes its pending-smoke status.

## Current candidate — S10-AI01

Joseph authorized the next implementation increment on 14 October.
Branch: feature/sprint10-session-ai-controls. Review/deploy independently.
See [S10-AI01_REPORT.md](S10-AI01_REPORT.md) for implementation, tests and runbook.
Draft PR #74 now also includes Joseph-approved teacher layout follow-up S10-UI01:
Block defaults, initial current-Session focus, S1–S10 navigation, collapsed summary
comparison/bulk expansion and grouped Attendance / Progress collection / Student
records. See [S10-UI01_REPORT.md](S10-UI01_REPORT.md). Focused browser and build PASS;
no extra SQL or server changes. PR remains unmerged and production unchanged.

- Block method remains default; nullable Session override selects a method or
  restores inheritance. Monday observation is manual, not a scheduler rule.
- Trusted effective method governs both student variants, read/write RPCs and API.
  Method selection never opens submissions; Check-in remains separate.
- Work Track and Intake keep different contracts. Existing source history stays
  readable; alternate-family records prevent a second reporting obligation.
- Durable private ledger reserves before every real provider attempt/retry.
  Block budget and student/Session attempt limit default to zero. Pricing missing,
  budget exhausted or reconciliation required refuses paid access.
- Quota denial preserves answers and allows manual confirmed non-AI completion.
  No grading, authorship accusations or contribution verdicts.
- New migration 20261014_sprint10_ai01_session_controls.sql is not applied.
  Applied SQL is untouched; schema.sql is synchronized.
- Build PASS, 138/138 API suite PASS, actual isolated PostgreSQL contracts PASS,
  focused Chromium teacher/mixed-Session/denial-save/history smoke PASS.
  These are synthetic Auth/transports; no hosted or live-model acceptance claimed.

No production data/configuration writes, provider calls, merge or deploy authorized
by this increment. Preview and Production share gwihaizxivclamzehupk.
Apply the new migration only after release approval and deploy the matching API;
the old deployed API does not enforce the new ledger during transition.
Server-only INTAKE_USAGE_PRICING_JSON must match the pinned provider model/rates.
No real rates or positive production budgets are configured by this change.
A live trial separately requires Joseph's model, student/Session, call and spend
approval and classroom institutional readiness. Live quality/safety remains open.

## Remaining delivery

Test sequence: existing 2026 · 2B2 → synthetic 2B3 → real November 2B4.
2B3 needs its own additive CHECK migration; this increment does not add/create it.
Joseph supplies 2B4 timetable/timezone/roster/team/project/continuing-student details
or creates it himself. Never fabricate inputs, delete history or reset continuing
accounts unnecessarily.

S10-02: setup preview/idempotency, activation/recovery and narrow 2B2→2B3 rehearsal.
S10-03: chosen-method S1→S2 continuity, prior evidence distinct from current claims,
and only remaining hosted Form/late paths. Cross-schema carryover is not unified.
S10-AI next: separately bounded live evaluation/safety using five primary levels;
reuse existing mocked evidence and gold anchors. AI does not block non-AI teaching.
Acceptance ends 29 October; 30 October checks/contingency; teaching 2 November.

## Working rules and next start

Fetch actual latest main and PR states before further work. Read AI_CONTEXT.md and
CONTRIBUTING.md; no repository AGENTS.md was found during inspection.
GitHub connector, focused branches and Draft PRs remain the normal workflow.
Joseph decides teaching/product behavior; ChatGPT develops/reviews; Claude is backup.
English repository documents, Chinese discussion. Preserve current production modes.
Use focused changed-path checks; no broad matrix, taxonomy or unrelated refactor.

