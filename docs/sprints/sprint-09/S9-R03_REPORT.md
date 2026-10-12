# Sprint 9 — R03 Implementation Report

Visible, correctable testing limitations in Session Intake.

Author: Claude (local implementation). Plan/review: Joseph and ChatGPT.
Date: 8 October 2026. Language: English.

## 1. Branch, HEAD and working tree

- Working branch: `integration-tests-m4-m10-m14`.
- HEAD at start and end of this round: `656f55f8f15ffbaadc95c37596f44d1af21a8e21`.
- Reviewed main baseline: `96d2aee84bacced9f332af1e1421cce840accaea` (PR #67 merge commit).
- **Relationship**: `96d2aee` is the PR #67 **merge commit** on `origin/main`;
  its second parent is exactly `656f55f` (this HEAD). `git diff 96d2aee..HEAD`
  is empty — the **committed HEAD tree** is **byte-identical** to the reviewed
  baseline. Verification therefore applies to the same source the review
  inspected, reached through the feature branch rather than the merge commit.
  (The *working tree* then diverges from the committed HEAD by the R03 edits
  below — and, after the following round, the R02 edits — which are uncommitted.)
- Working tree before this round: clean except the untracked
  `docs/sprints/sprint-09/` directory. No unrelated tracked local changes
  existed; none were reset, discarded or overwritten.

Verification commands:

```
git rev-parse HEAD                      -> 656f55f8f15ffbaadc95c37596f44d1af21a8e21
git branch --show-current               -> integration-tests-m4-m10-m14
git log --parents -1 96d2aee            -> 96d2aee 63b1754 656f55f (merge; 2nd parent = HEAD)
git diff --stat 96d2aee HEAD            -> (empty: identical trees)
```

## 2. Changed files

Tracked source (minimal, reuse-only — `git diff --stat`: 2 files, +5/-5):

- `src/main.tsx`
  - Chat review card (stage 4 editors): added
    `['testingBaseline','Expected result / untested limitation']` to the
    correctable field list.
  - Chat evidence drawer, Current Session tab: added an
    `Expected / limitation:` line to the Testing entry.
  - Chat evidence drawer, Previous Sessions (confirmed history): added a
    read-only `Testing` row (execution status + `baseline_or_expected`).
  - Deterministic modal, review step 5: Testing entry now shows the observed
    result and the `baseline_or_expected` limitation.
  - Deterministic modal, live evidence panel: Testing entry now shows the
    `baseline_or_expected` limitation.
- `src/intakePolicy.ts`
  - `changedEvidenceFields` testing-key map now includes `testingBaseline`, so
    an assistant-appended untested limitation is flagged as a visible testing
    change and marks `testing` as captured.

New test (untracked):

- `tests/ai-session-intake/adaptive/r03-testing-limitation.test.mjs` — four
  focused regressions on the actual runtime logic.

Planning / report documents (untracked):

- `docs/sprints/sprint-09/PLAN.md`
- `docs/sprints/sprint-09/HANDOFF.md`
- `docs/sprints/sprint-09/S9-R03_REPORT.md` (this file)

No schema, type, record-builder or persistence contract was changed. No
migration was created or executed.

## 3. Findings confirmed / corrected

The review's R03 finding was **verified accurate** against the current source.

Confirmed storage path (unchanged, already present at baseline):

- `src/aiSessionIntake.ts`: `testing[].baseline_or_expected` (type, line 69) and
  `DeterministicIntakeAnswers.testingBaseline` (line 108) both exist.
  `buildFallbackStudentRecord` maps `answers.testingBaseline` ->
  `testing[0].baseline_or_expected` (line 202).
- `api/session-intake-ai.ts:95`: the endpoint extracts `testingBaseline`.
- `src/intakePolicy.ts` `applyEvidenceUpdates`: a student-disclosed untested
  path (`state: 'missing'`) is appended to `testingBaseline` as
  `"Not tested by student: ..."` **without** erasing an executed test (the
  Phase C Failure-1 safeguard).

Confirmed display gaps (the review was correct — the field was stored but not
shown and not correctable):

1. Deterministic modal review step 5 Testing entry showed only
   `execution_status`.
2. Deterministic modal live evidence panel Testing entry showed only
   `execution_status`.
3. Chat review card editors did **not** include `testingBaseline`, so a student
   could not correct it.
4. Chat evidence drawer Current Session Testing entry showed status / method /
   observed result, but **not** `baseline_or_expected`.
5. Chat evidence drawer Previous Sessions (confirmed history) showed only
   responsibility / claim / evidence / next action — no testing, no limitation.

Minor correction to the review's implied completeness: the limitation was also
missing from the deterministic modal (not only the chat journey), and the
`changedEvidenceFields` map omitted `testingBaseline` so an AI-appended
limitation did not raise the "evidence updated" signal. Both are addressed.

No finding required blind implementation; every change is backed by the source
locations above.

## 4. Before / after behaviour

Executed observation and untested path are kept distinct throughout — this was
already true in storage and is now true in the display.

| Surface | Before | After |
|---|---|---|
| Chat review card | `testingBaseline` not editable | `testingBaseline` editable via existing `correct()`; attestation resets; original value preserved as the correction `before` |
| Chat drawer — current | status / method / observed only | adds `Expected / limitation: <baseline_or_expected>` |
| Chat drawer — history (confirmed) | no testing shown | read-only `Testing` row with status + limitation; no editor |
| Deterministic review step 5 | status only | status + observed result + limitation |
| Deterministic evidence panel | status only | status + limitation |
| `changedEvidenceFields` | `testingBaseline` change not flagged | flagged as a `testing` change; marks testing captured |

Correction / attestation contract (reused, unchanged): `correct(field,value)`
records `{field, before, after}` keeping the original extraction as `before`,
rebuilds the record through `buildFallbackStudentRecord`, and sets
`confirmed=false`. On submit, `corrections` and the original `extracted_record`
(`initialRecord`) are persisted through the existing
`save_my_session_intake_chat` contract. Confirmed records render a static
summary with no editors, and the history item exposes no correction handle, so
confirmed records remain read-only.

## 5. Validation evidence (actual commands and results)

Baseline before changes:

```
npm test        -> tests 65 | pass 65 | fail 0
npm run build   -> PASS; dist/assets/index-*.js 685.01 kB (large-chunk warning)
```

After changes:

```
npm run build   -> PASS; dist/assets/index-*.js 685.77 kB (same large-chunk warning)
npm test        -> tests 69 | pass 69 | fail 0
```

New regressions (`r03-testing-limitation.test.mjs`), all passing, exercising the
real `applyEvidenceUpdates`, `buildFallbackStudentRecord` and
`validateIntakeStudentRecord` from `.test-build/`, plus a faithful model of the
`SessionIntakeModal.correct()` reducer:

1. An executed slow-connection test and an untested API-error path coexist on
   the same schema-valid record (executed observation and limitation distinct).
2. The limitation reaches the display input (`answers.testingBaseline`) and maps
   verbatim to `testing[0].baseline_or_expected`.
3. A `testingBaseline` correction is retained, rebuilds the record, resets
   attestation, and preserves the original extracted value as `before` across
   repeated edits. **This test exercises a faithful JavaScript model of the
   `SessionIntakeModal.correct()` reducer (correction array + record rebuild +
   `confirmed=false`), not the rendered React component**; it proves the reducer
   contract, not that the DOM reflects it.
4. A confirmed record carries the limitation into a read-only history item that
   exposes no correction handle. (Also a record/shape assertion, not a rendered
   DOM assertion.)

No paid provider calls, no database writes, no migrations, no deploy.

## 6. Implemented vs offline-verified vs UI/live-verified

- **Implemented**: all five display surfaces and the one correctable field, plus
  the `changedEvidenceFields` signal.
- **Offline-verified**: TypeScript build (`tsc -b` via `npm run build`) and the
  69-test offline suite, including the four new R03 regressions. These prove the
  runtime data path and record construction, and that the JSX type-checks.
- **UI / rendered-DOM: UNVERIFIED.** No browser, dev server, Supabase project or
  authenticated student/teacher session was available in this offline round, and
  paid/live calls and database writes are out of scope. The JSX was verified by
  source inspection only. The record-builder and reducer tests are **not**
  claimed as proof of rendered UI behaviour.
- **Live-verified**: none. No authenticated submit/reload rehearsal was run; that
  remains R04 acceptance work.

## 7. Remaining limitations

- Rendered UI behaviour (visibility before confirmation, visibility after
  reload, correction reset in the live DOM, history read-only in the DOM) is
  unverified; it needs an authenticated browser rehearsal (R04).
- `baseline_or_expected` has no dedicated schema sub-field for "executed baseline"
  vs "untested path"; both share one free-text field (as designed). The
  distinction is carried by the `"Not tested by student: ..."` prefix the policy
  writes, not by structure.
- The teacher side still cannot read the limitation (R02 unimplemented by design
  this round).
- The intake remains gated to Block `2B2` (R01 unimplemented by design this
  round); R03 is visible only where the intake runs.

## 8. One proposed next task

Implement **R02 — minimum secure teacher Intake read workflow**: an additive,
`is_teacher()`-guarded, `security definer` RPC
`get_teacher_session_intakes(p_session_id)` (block/session filtered) returning,
per confirmed student, the summary, the testing limitation
(`baseline_or_expected`), the source conversation and the corrections; plus a
teacher panel in `StudioSessionControl` that reuses the existing review styles.
This is additive-migration-only (new function + grant) and makes the now-visible
R03 limitation reviewable by the teacher. See PLAN.md R02 for the concrete slice.
