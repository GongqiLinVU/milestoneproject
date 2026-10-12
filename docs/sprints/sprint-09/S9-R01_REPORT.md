# Sprint 9 — R01 Implementation Report

Server-authoritative per-Block Intake capability (disabled / deterministic / ai).

Author: Claude (local implementation). Plan/review: Joseph and ChatGPT.
Date: 9 October 2026. Language: English.

## 1. Branch, HEAD and working tree

- Working branch: `integration-tests-m4-m10-m14`.
- **Committed HEAD**: `656f55f8f15ffbaadc95c37596f44d1af21a8e21` — tree identical
  to reviewed main `96d2aee` (PR #67 merge; `git diff 96d2aee..HEAD` empty).
- **Working tree** now carries uncommitted **R03 + R02 + R01** changes. Nothing
  is committed this sprint. R03 and R02 work was preserved throughout (verified in
  `git status`/`git diff`: the R03 `testingBaseline` edits and the R02 migration,
  panel, audit and tests remain intact alongside the R01 changes).

## 2. Changed files

Modified (tracked):

- `api/session-intake-ai.ts` — AI endpoint gates on `block.intake_mode === "ai"`
  instead of `block_code === "2B2"`.
- `src/main.tsx` — student capability resolved from server context; routing,
  modal selection, teacher controls and the in-progress mode-change handler
  aligned to `intake_mode`.
- `src/StudentAccess.tsx` — `Context.intakeMode` added so the server capability
  flows to the portal.
- `src/intakePolicy.ts` — (unchanged by R01; carries the earlier R03 edit.)
- `tests/ai-session-intake/adaptive/endpoint.test.mjs` — mock block now reports
  `intake_mode`; the refusal case is split into disabled + deterministic.

New (untracked):

- `supabase/migrations/20261009_sprint9_r01_block_intake_mode.sql` — additive
  migration (capability column + re-created context and Intake RPCs).
- `supabase/scripts/sprint9_r01_block_intake_mode_audit.sql` — read-only audit.
- `tests/ai-session-intake/adaptive/r01-block-intake-mode.test.mjs` — 10 focused
  regressions (RUNTIME / MODEL / STATIC).
- `supabase/scripts/sprint9_r02_teacher_intake_read_audit.sql` — updated with a
  roster-vs-off-roster count check.
- `docs/sprints/sprint-09/S9-R01_REPORT.md` — this report.

No gold anchors, adjudications or C/R/S formulas were touched. No migration was
executed; no paid provider call was made.

## 3. Mode behaviour

The capability is a **Block-level** property (`teaching_blocks.intake_mode`),
separate from each Session's `intake_access` (which still controls when a Session
accepts an Intake). The capability is resolved server-side and surfaced to the
student client via `get_my_student_context().intakeMode`; it is never supplied or
trusted from the client.

| Mode | Student client | AI endpoint | Save paths (RPC) | History read |
|---|---|---|---|---|
| `disabled` | Existing non-Intake classroom workflow; no Intake entry shown (`intakePilot=false`) | Refuses (`session_not_eligible_for_ai_intake`), zero model calls | None accept a new Intake | `get_my_session_intake` still returns confirmed history |
| `deterministic` | Provider-independent form Intake (`FormSessionIntakePrototype aiEnabled={false}`); zero model calls | Refuses, zero model calls | `save_my_session_intake_fallback` and `save_my_session_intake_chat` accept; `save_my_session_intake_ai` refuses | Readable |
| `ai` | Conversational Intake (`SessionIntakeModal`) with deterministic fallback | Authorized | All three save paths accept | Readable |

Default on every existing Block after the migration is `disabled`; no Block is
auto-enabled. 2B2 is **not** promoted automatically — a teacher sets the mode
explicitly through the existing authorized `teaching_blocks` management policy.

### In-progress mode change

If a teacher changes the Block away from `ai` while a student has an AI
conversation open, the next AI call is refused by the server. The chat modal does
**not** discard work: it preserves the conversation and the extracted answers,
sets `aiMeta.used=false`, routes to the review step, and shows an actionable
message ("AI Intake is no longer available for this Session … Your answers are
preserved — review and confirm your record below; it will be saved without any AI
call."). In `deterministic` mode that review confirms through
`save_my_session_intake_chat` (allowed for deterministic). In `disabled` mode the
save is refused by the RPC and the record remains available locally rather than
being silently lost. Broader draft/recovery hardening stays scoped to R05/R06.

## 4. Migration order and compatibility

- Apply `20261009_sprint9_r01_block_intake_mode.sql` **after** `20260903`
  (foundation), `20260912` (ai save) and `20260916` (chat save). It re-creates
  the current definitions of those functions, so it must run last.
- It also re-creates `get_my_student_context()` to add `intakeMode`. Apply after
  the latest student-context definition (`20260731_sprint5_phase4a` /
  `schema.sql`).
- `get_my_session_intake` is intentionally **not** re-created; confirmed history
  stays readable in any mode.
- **Compatibility / default behaviour**: the column defaults to `disabled`, so
  before any teacher action every Block (including the mock `2B2`) behaves as the
  existing non-Intake workflow. The frontend treats an absent `intakeMode`
  (pre-migration server) as `disabled`, so deploying the frontend before the
  migration does not expose Intake. `block_code` is **not** widened — no new
  teaching code is assumed; the November Block code remains Joseph's input and is
  only needed to configure/activate a real Block (R08), not to run this
  capability.

## 5. Validation — actual commands and results

```
npm run build  -> PASS; dist/assets/index-*.js 712.33 kB (large-chunk warning only)
npm test       -> tests 89 | pass 89 | fail 0
```

Test composition: 65 base + 4 R03 + 9 R02 + 1 (endpoint refusal split into
disabled + deterministic) + 10 R01.

R01 regressions (`r01-block-intake-mode.test.mjs`), labelled by evidence class:

- **RUNTIME** (real compiled handler, mocked provider fetch):
  - disabled mode → 403, **zero** provider calls;
  - deterministic mode → 403, **zero** provider calls;
  - ai mode → 200, exactly **one** provider call.
- **MODEL** (faithful models of the SQL/ client contracts):
  - save-path authorization by mode (disabled none; deterministic
    fallback+chat; ai all);
  - client routing selects the modal from the server capability (ai→chat,
    deterministic→form, disabled/absent→no Intake);
  - a forged client-supplied mode does not grant access (only the server value
    feeds routing and save authorization);
  - confirmed history is readable in every mode including disabled;
  - mode change to non-ai mid-conversation preserves work and routes to review.
- **STATIC** (migration text encodes the design): default `disabled`, the three
  constrained values, the `deterministic|ai` and `ai`-only gates, no auto-enable,
  `block_code` CHECK not widened, and `intakeMode` exposed in the context.

The existing `endpoint.test.mjs` suite still passes with the mock block reporting
`intake_mode`, confirming the real handler enforces the capability.

## 6. Unverified items

- **Deployed SQL privileges / RLS**: the R01 and R02 audit scripts have **not**
  been executed; the capability column, the re-gated function bodies, the
  teacher-only UPDATE authorization and grants are asserted by design, by the
  migration text (STATIC) and by the modelled tests — not by a database result.
- **Rendered UI**: no browser/Supabase/authenticated session offline; the mode
  routing, teacher controls and the mode-change message were type-checked and
  built but not rendered. The MODEL tests are not UI proof.
- **Authenticated end-to-end**: no login→eligible-Session→save→reload rehearsal;
  these remain R04 acceptance work. Sprint 8 Phase D stays open.
- The November teaching Block code remains unresolved; R01 does not depend on it,
  but configuring/activating the real Block (R08) does.

## 7. One proposed next task

Run **R04** read-only database acceptance for R01+R02+R03: execute
`sprint9_r01_block_intake_mode_audit.sql`,
`sprint9_r02_teacher_intake_read_audit.sql` and the existing Phase 2A/2C audits on
an approved environment, and perform an authenticated rehearsal of one Block set
to each mode (disabled/deterministic/ai) — confirming disabled refuses saves and
AI with zero model calls, deterministic saves without a provider call, ai saves
through all paths, teacher read shows submitted/missing correctly, and confirmed
history remains readable after a Block is disabled. Retain the persisted results.
