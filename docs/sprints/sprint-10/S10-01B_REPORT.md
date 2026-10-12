# S10-01b — Compact early Work Track

13 October 2026. **Implemented review candidate; not applied or deployed.**
Latest main inspected: ff66c6f0876cb3b8a9fb4116e901f3e7e97793e9 (PR #71).
Joseph approved option-led early tracking on 13 October. The separate release/
next-direction documentation is in Draft PR #72.

## Student behavior

S1–S5 now use work-area checkboxes, progress-state selection, a short specific
responsibility, one concrete progress update and a next action. Help is selected;
a question/detail appears only when help is requested. Evidence is optional and
collapsed by default. Desktop pairs related fields; mobile uses one column.
The compact form keeps save actions visible while scrolling.

No progress is valid, without requiring an excuse. Choices and text describe
student claims; no grade, authorship inference or contribution verdict is produced.
S6–S9 retain existing requirement assessment and questions; S10 remains feedback.

When a previous record exists, its planned next action is labelled as history.
The student explicitly reports completed / partly completed / not completed /
plan changed. Previous responsibility is displayed, and only an explicit
"My responsibility is unchanged" choice copies it. Current progress, evidence
and next action are never copied from previous claims. Editing responsibility
clears that carry-forward confirmation.

Earlier free-text records remain readable and updateable. Missing choices are
not invented; historical read-only views explain that those choices were not
recorded. New updates require the compact choices, while the old deployed form's
five-string payload remains accepted for compatibility.

## Persistence and compatibility

Existing five early text fields remain unchanged. Optional compact.v1 metadata
adds workAreas, progressState, helpKind, previousActionStatus and
responsibilityCarriedForward to the same JSON record. The save RPC validates
bounded known choices, no duplicate work areas and requested help detail. It
strips unrelated/late metrics and clears stale support when "No help needed".
Teacher read uses the existing RPC and displays these fields with the progress.
Work Track and Intake remain separate contracts; this is not Guided Form or AI.

**New migration:** 20261013_sprint10_s01b_compact_work_track.sql.
Replaces only Work Track get/save definitions, adding a getter capability flag
and optional early-save metadata. No table/index/column/data rewrite or new RLS
policy. Existing mode/range/window/identity gates, late server calculation and
teacher-verification reset are preserved. PUBLIC and anon are explicitly revoked,
authenticated grants preserved; schema.sql synchronized. Applied S10-01 scripts
are unchanged.

The getter advertises earlyFormVersion=compact.v1. If the shared backend has not
been upgraded (including a Preview build), compact saving is disabled with a
student-readable notice; old RPCs cannot silently discard the new choice fields
while the UI reports success.

## Focused validation

- Production build PASS (existing >500 kB chunk warning unchanged).
- Compact helper checks: **3/3 PASS** — no-progress/required help/prior action,
  explicit role carry without copying progress, and payload stripping/clearing.
- Actual PostgreSQL RPC execution in isolated PGlite: **PASS**. Reused S10-01
  gates/late calculation/legacy persistence and extended only compact metadata
  round-trip/teacher read, invalid or duplicate choices, null version, missing
  requested help and hidden stale-help removal. Existing explicit anon grants
  are seeded and all affected RPC anonymous denial checks still pass.
- Isolated Chromium smoke with actual components/RPC bodies and a local transport
  bridge: **PASS**. S1 choices/no-progress/help validation → save → reload; S1→S2
  explicit responsibility/prior-action confirmation and fresh current progress;
  teacher reads choices; 390px mobile no horizontal overflow; old-backend
  capability disables misleading saves. Desktop/mobile screenshots inspected.
- Browser bridge replaces entry point, table/RPC transport and synthetic identity;
  this is not a real-login, hosted PostgREST or production submission test.
  Outbound requests were blocked (existing Google Fonts attempts only); no AI call.
- Existing 134/134 Intake release evidence reused: no Intake/provider logic changed.
  No broad matrix, taxonomy, dataset expansion or extra dependency added.

Commands and optional isolated engine setup: tests/session-work-track/README.md.

## Review and release

1. Review the compact UI/wording and migration. No production change is performed
   by this task; this candidate lives on a feature branch/Draft PR.
2. After approval, apply the **new** migration once to gwihaizxivclamzehupk before
   deploying the matching frontend. Preview and Production share the backend.
   Old frontend remains compatible because metadata is optional. Do not rerun or
   edit already-applied migrations.
3. Short authorized hosted early Session save/reload/teacher-read check. Confirm
   options persist and previous claims are visibly separate from current progress.
   Actual 1–2 minute completion time remains a hands-on usability target, not a
   measured result.

Recovery: prefer reverting the frontend while leaving the additive compatible
RPC definitions and metadata intact. If an RPC rollback is necessary, review
restoring previous get/save definitions and retain explicit anon denial; existing
compact metadata/records must not be deleted or rewritten. The old save contract
whitelists five strings and drops optional metadata on a subsequent old-form
update, so do not use it as a data-preserving schema rollback without review.

## Next scope

Per-Session AI override + durable usage controls remain the next optional increment;
no AI enabled or paid calls authorized here. 2B3 rehearsal and real 2B4 setup remain
separate. This change does not claim hosted S10-01 acceptance complete.
