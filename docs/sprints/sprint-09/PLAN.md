# Sprint 9 — Plan

NIT3004 classroom-delivery readiness for the whole Engineering Studio Platform.

- Teaching starts: **2 November 2026**.
- Acceptance testing complete by **29 October 2026**.
- **30 October** reserved for release/configuration verification and contingency
  (not for new testing).
- Source baseline: reviewed main `96d2aee` (PR #67). Working branch
  `integration-tests-m4-m10-m14` at **committed HEAD `656f55f`**, whose **tree is
  identical** to the reviewed baseline (verified `git diff 96d2aee..HEAD` empty;
  `96d2aee` is the PR #67 merge commit whose second parent is `656f55f`). The
  **working tree additionally carries uncommitted R03 and R02 changes** (see
  S9-R03_REPORT.md and S9-R02_REPORT.md); these are not yet committed. "Tree
  identical to baseline" describes the committed HEAD, not the current working
  tree.
- Responsibilities: Joseph and ChatGPT plan/review; Claude implements locally,
  tests and reports. All repository documents and reports are in English.

Sprint 8 is **not closed**. Its Phase D (Phase 2C database audit and
authenticated application acceptance) and live validation remain open and are
tracked as R04 below. Do not treat PR #65/#66/#67 being merged as acceptance.

## Scope — whole platform, not only AI Intake

The platform is a four-week engineering delivery studio (Commit -> Prove ->
Validate -> Deliver) with:

- Student portal: roster-prepared activation/login/recovery, Block/Team/Project
  context, Session Check-in and history, Week 1–4 activities, Team Health, weekly
  engagement, Week 2 pre-check and poster peer review, published Week 4
  presentation order, and the Sprint 8 pilot Session Intake (deterministic +
  conversational AI).
- Teacher dashboard: Supabase auth with `role = teacher`, RLS-protected records,
  activity detail/edit/delete, private Review & Follow-up, optional AI teaching
  suggestions, block-aware Week 1–4 activation, Week 2 reset, presentation-order
  management, CSV export.

Launch readiness depends on the non-AI classroom flow being fully usable
independently of any AI provider or institutional AI approval.

## Delivery strategy — incremental usable releases

The platform is delivered as **usable increments**, not as one all-or-nothing
launch. A **non-AI first production release does not require every R01–R09 item**
to be complete; AI is a later staged improvement gated on institutional approval
and a budgeted live model-quality run.

1. **Local release candidate** — a complete, persistent, isolated local classroom
   on synthetic data; **legacy workflow by default**, **deterministic Intake
   teacher-selectable**, **AI off**. See `LOCAL_RELEASE_CANDIDATE.md`. *(Delivered
   this round; smoke chain and deterministic-routing switch verified on the
   fixture.)*
2. **Joseph hands-on review** — Joseph runs the candidate and reports what is
   usable and what blocks classroom use.
3. **Fix blockers only** — defects that block real use or violate the essential
   data-access, submission-integrity or paid-call boundaries. No broad test or
   scenario expansion or refactoring for the first release.
4. **First production release (non-AI)** — apply the reviewed additive migrations
   to the hosted DB with audits and do a hosted login → context → legacy save →
   reload → teacher-read smoke test. AI stays off. *(DELIVERED 13 Oct 2026 — PR
   #68, merge `6549171`, deploy `milestoneproject-eldvi5b1i` on
   milestoneproject-two.vercel.app; both migrations applied and verified;
   production smoke test PASS with the authorized test account. See
   `FIRST_PRODUCTION_RELEASE_REPORT.md`.* **Still open for this track:** resolve
   and configure the **real November Block (R08)**, and verify **account
   activation/recovery** and **S1→S2 carryover** as rendered production flows —
   these are later increments, not first-release blockers.)*
5. **Staged improvements** — AI Intake (institutional approval + budgeted live
   run), R07 usage controls, R09 dataset/safety suite, and the remaining P1/P2
   items, delivered incrementally after the first release.

Local serving is **not** proof of hosted production acceptance. The first
production release is now live (step 4); Preview acceptance was superseded by the
direct production release Joseph authorized. Keep AI off and the November Block
unconfigured until their separate approvals/inputs exist.

## November Block identity — UNRESOLVED (Joseph input required)

Authoritative local records contain only these block codes:

- `2B1` — archived 2026 teaching block (seeded active by the base migration;
  this is the Sprint 7 observation block).
- `2B2` — Sprint 8 **mock pilot** block (seed `seed-local-testdata.mjs`, active
  2026-07-27 to 2026-09-25).
- `1B4` — archived (2026-02-02 to 2026-05-01).

The `teaching_blocks.block_code` CHECK (schema.sql:1807) allows
`('1B1','1B4','2B1','2B2','2B4')`. **No November 2026 teaching block, timetable
or start date exists anywhere in local records.** The November Block code is
therefore **unresolved** and is Joseph's one required setup input. It must not be
guessed, created or activated during planning. If the November code is new (e.g.
not in the current CHECK list), R01's additive migration must widen the CHECK.

Work that does not depend on the Block identity (R03 display/correction, R02
teacher read mechanics, R05 draft safety, R06 fallback usability, test repairs)
proceeds now. R01 alignment and R08 timetable configuration consume the code once
supplied.

## Prioritized backlog — R01 to R09

Status key: implemented this round / planned / inspected (ready to implement).

### P0 — Launch dependencies

**R01 — Server-authoritative, opt-in per-Block Intake capability.**
*(Implemented this round; offline-verified; deployed SQL and rendered UI
unverified.)*
Previously the Intake was gated to `2B2` at four points: student routing by a
display-label regex (`src/main.tsx:834`), teacher controls
(`src/main.tsx:2364,2398`), the AI endpoint (`api/session-intake-ai.ts:42`), and
the save RPC (`save_my_session_intake_chat`, migration `20260916`). Introduce one
server-authoritative capability resolved from trusted context (proposed:
`teaching_blocks.intake_mode in ('disabled','deterministic','ai')`), aligned
across all four points; derive the UI capability from a server read, not the
`blockLabel` regex. Additive migration only (new column + default `disabled`;
widen `block_code` CHECK only if the November code is new).
**The generic R01 capability (schema column, server resolution, aligned UI/API/
RPC reads, and the disabled/deterministic/ai modes) can be implemented and
offline-tested now without the November Block code.** Only the *actual Block
configuration and activation* — choosing which real Block is set to which mode —
depends on the November code (that step is R08 territory and must not activate a
live Block during planning).
Acceptance: the real teaching Block works per its configured mode; mock/archived
Blocks stay isolated; a forged client capability cannot authorize AI or save
access; `disabled` never calls the provider; `deterministic` works with no paid
calls.
Delivered this round: `20261009_sprint9_r01_block_intake_mode.sql` adds
`teaching_blocks.intake_mode` (default `disabled`), re-creates
`get_my_student_context` (+`intakeMode`) and the three save RPCs gated on mode
(`save_my_session_intake_chat`/`_fallback` → `deterministic|ai`;
`save_my_session_intake_ai` → `ai`); the AI endpoint gates on `ai`; the student
portal routes from the server capability (chat for `ai`, deterministic form for
`deterministic`, no Intake for `disabled`); teacher controls gate on
`intake_mode`; an in-progress change away from `ai` preserves work and routes to
the provider-independent review. `get_my_session_intake` is left ungated so
confirmed history stays readable in any mode. Audit prepared
(`sprint9_r01_block_intake_mode_audit.sql`), not executed. See S9-R01_REPORT.md.
Still to verify under R04: deployed privileges/RLS and rendered UI.
R04 UI rehearsal update: deployed privileges/RLS and the deterministic rendered
path are verified. The R01 gap surfaced during the rehearsal — the teacher
dashboard had **no UI control to set `intake_mode`** (only per-session
`intake_access`) — has since been **resolved**: a Block-level mode selector was
added to `StudioSessionControl` (writes `teaching_blocks.intake_mode` through the
existing teacher-only RLS; additive, no migration) and rendered-verified
(confirms the persisted server value before success). The first-release "teacher
explicitly chooses Form or AI" criterion is met in the isolated environment;
Preview/production rendering remains unverified.

**R02 — Minimum secure teacher Intake read workflow.** *(Implemented this round;
offline-verified; deployed SQL privileges and rendered UI unverified.)*
The RLS policy `"teachers read session intakes"` already allows `is_teacher()`
SELECT on `student_session_intakes` (schema.sql:1866), but no teacher RPC or UI
read it. Delivered this round: an additive `security definer`,
`is_teacher()`-guarded RPC `get_teacher_session_intakes(p_session_id)`
(migration `20261008_sprint9_r02_teacher_intake_read.sql`) that uses the
Session's Block roster as the list base (left join to surface missing
submissions) and preserves off-roster confirmed intakes; and a teacher Intake
panel in `StudioSessionControl` showing submitted/missing counts, the confirmed
summary, executed testing, the untested limitation (`baseline_or_expected`),
source conversation and correction history, with teacher verification shown
separately and unset. A read-only audit script
(`supabase/scripts/sprint9_r02_teacher_intake_read_audit.sql`) is prepared but
not executed. See S9-R02_REPORT.md.
Acceptance: a student submission is visible to the teacher in the correct Block;
source is inspectable; student corrections and reported facts stay distinct from
teacher judgement; non-teachers cannot read the list. (Deployed privilege/RLS
enforcement and rendered UI remain to be verified under R04.)

**R03 — Visible, correctable testing limitations.** *(Implemented this round;
offline-verified; rendered UI unverified.)*
`baseline_or_expected` / `testingBaseline` now displays in the student review
(deterministic + chat), the current-session evidence drawer and the confirmed
history, and is correctable in the chat review card through the existing
`correct()` contract (attestation reset, correction history preserved). See
S9-R03_REPORT.md.
Acceptance: the same S9 record visibly shows the limitation before confirmation
and after reload; correction resets attestation and preserves
extraction/correction history. (Reload/DOM behaviour pending R04 rehearsal.)

**R04 — Authenticated and database acceptance (Sprint 8 Phase D carried
forward).** *(Pre-check + isolated deployed-authorization execution done this
round; rendered-UI and live-extraction acceptance still open.)*
Run read-only audit scripts and a controlled authenticated rehearsal: login,
eligible Session, confirm/save/reload, duplicate rejection, other-student and
cross-Block rejection, teacher read, and next-Session history — including the
non-AI classroom flows.
Pre-check delivered (`S9-R04_PRECHECK_REPORT.md`): the combined R01/R02/R03 diff
and SQL authorization were inspected; four defects were fixed with the smallest
coherent changes (D1 misleading mode-change message; D2 student-facing migration
instruction leak; D3 off-roster inflating roster completion; D4 `ai→deterministic`
save blocked by conversation shape); mode-change behaviour was verified separately
for `ai→deterministic` and `ai→disabled` and for history readability; a concrete
acceptance matrix and the migration/rollback sequence were prepared.
Execution delivered (`S9-R04_EXECUTION_REPORT.md`): on an isolated, not-linked,
synthetic-only local Supabase stack, the R02+R01 migrations were applied cleanly
and the four read-only audits run (R01 6 PASS + 1 REVIEW table-grant-vs-RLS note;
R02 16/16; phase2a 1 FAIL explained as seed state; adaptive fixed to 9/9 after a
one-line stale-check update). Acceptance rows for teacher mode selection,
server-authoritative routing source, Form deterministic save + reload + the R03
limitation round-trip, duplicate rejection, `ai`-save rejection in deterministic
mode, non-teacher capability-UPDATE denial (RLS), cross-student and cross-session
isolation, teacher roster vs off-roster counts (D3 confirmed deployed),
disabled-mode history-readable + save-refused, and non-teacher teacher-RPC denial
all **passed as deployed RPC/SQL results**.
Rendered-UI rehearsal delivered (`S9-R04_UI_REHEARSAL_REPORT.md`): on the same
isolated stack, driven through a real headless browser (Chrome + CDP, no new
dependency), the **deterministic** student→teacher path was rendered-verified:
student routed to the Form (Work Track hidden); Form fill → review showing the
R03 limitation → attest → submit ("Session Intake confirmed"); reload shows
read-only confirmed history (0 editable fields); teacher Intake panel shows
"1 / 12 roster submitted · 11 missing", executed-testing vs untested-limitation
separation, teacher-verification "Not recorded in Intake", and the source
conversation; UI duplicate prevention (read-only confirmed view); mode change
during a draft preserves entered work; disabled-mode submit is refused with no
success shown and work preserved. The **phase2a audit FAIL was resolved** as a
seed-fixture state (sessions reset to the `closed` migration default; all four
audits now 0 FAIL, R01 keeps one informational REVIEW).
The teacher **Block-level Intake mode selector** has since been **added and
rendered-verified** on the isolated stack (teacher sets Form/AI/disabled; the UI
confirms the persisted server value before showing success), and confirmed
Intake history is now reachable read-only for both student and teacher after a
Block returns to `disabled`. A subsequent **local full-stack rehearsal**
(`S9-FULLSTACK_REHEARSAL_REPORT.md`) resolved local app+API serving (plain Vite +
a separate `vercel dev` for `/api` via the existing proxy; the production
`vercel.json` SPA rewrite was the cause — production routing unchanged) and then
rendered-verified, with no session injection: **normal student login** (real form
→ `/api/student-login`), **AI Intake under a mocked provider transport**
(conversation → review → correction → attestation → save → reload → teacher read;
provider-failure → deterministic completion; ai→disabled block), and the
**complete legacy Work Track S6–S9** plus the teacher-selector failure state.
**Still open**: Preview/production acceptance; **live AI extraction / model
quality** (only the mocked transport was exercised); account activation/recovery;
and S1→S2 carryover as a rendered/deployed flow. **Sprint 8 Phase D is NOT
closed.**
Acceptance: persisted authorization results, not screenshots or HTTP 200 alone.
Any paid live Intake run needs a separately approved model/call scope and budget.

### P1 — Required before classroom rollout

**R05 — Conversation draft safety.** *(Unsaved-exit protection implemented this
round; offline-verified; rendered DOM wiring unverified.)*
`SessionIntakeModal` and `FormSessionIntakePrototype` held answers/turns in React
state with no unsaved-exit guard. Delivered this round (`S9-R05_REPORT.md`): a new
`src/intakeExitGuard.ts` with pure dirty predicates and a process-wide unsaved
registry that owns one `beforeunload` listener; both Intake lifecycles route every
close control through a confirm-on-exit guard, and the Sign-out control is guarded
too. Cancelling an exit preserves entered answers and review corrections; a save
failure keeps content dirty/retryable; dirty clears only on authoritative save
success or explicit discard; confirmed submissions stay read-only; the per-Session
registry id keeps one modal's dirtiness from surfacing under another
user/Block/Session. **Deliberate non-goals:** no persistent transcript storage and
no draft-sync system were introduced (transcripts may contain personal
information, so storage is a separate, deliberately-scoped decision), and the
browser unload prompt is **not** claimed as crash recovery. If recovery storage is
later judged necessary, the gap, a minimal design and its privacy/lifecycle
implications must be reported first.
Acceptance: accidental exit does not silently discard work; drafts never surface
for another student; save failure preserves retryable content. Rendered DOM wiring
(buttons through the guard, the shared `beforeunload` prompt in a real browser)
remains a browser-rehearsal item.

**R06 — Directly usable provider-independent completion.** *(Provider-failure
persistence chain evidenced on the isolated local stack this round; migration-
instruction leak already removed under R04 D2; AI-off operator control is R01.)*
Ensure a clear non-AI completion path reusing the existing contract/persistence,
preserving entered content, with a student-readable failure message; remove
migration instructions from the student save-error UI (done, R04 D2); add the
operator AI-off control as part of R01 (done, teacher mode selector).
Evidence clarified this round (`S9-R05_REPORT.md`): prior fallback evidence stopped
at the provider-failure *review screen* and did not prove completion. The one
missing chain — provider failure → **actual deterministic save** → **reload** →
**teacher read** — was exercised directly on the isolated local stack with a real
student JWT: the fallback saved with `source_mode=deterministic_fallback`, reloaded
as a confirmed read-only record (duplicate save refused), the R03 testing
limitation survived the round-trip, and the teacher read showed the row with the
deterministic source. HTTP 200 and a usable review screen are no longer treated as
completion.
Acceptance: with the provider unavailable, a student can produce, correct, save
and reload a valid record without repeated model calls or retyping.

**R07 — Server-side usage control.** Add bounded server-side request/attempt
controls and measurable classroom usage, distinct from evaluator cost; use
explicit incomplete/fallback outcomes rather than false sufficiency.
Acceptance: repeated requests cannot evade the policy; failures/retries are
accounted for; disabled AI remains usable through deterministic completion.

**R08 — Session configuration and activation transition.** `prepareTen()` uses
fixed offsets and falls back to today when `starts_on` is missing. Configure the
actual start/end dates and timetable (needs the November Block), validate
timezone and open windows, preview before writing, make preparation idempotent by
Session number, and check continuing-student enrolment transitions without
deleting history.
**November dependency is scoped to R08, not R01.** The generic R01 capability
(schema column, server resolution, aligned UI/API/RPC gates, and the
disabled/deterministic/ai modes) is implemented and offline-verified and does
**not** need the November code. What the November code blocks is this R08 step —
the *actual Block configuration/activation and timetable* — plus widening the
`block_code` CHECK if the code is new. Do not conflate "R01 complete" with "the
real November Block is configured".
Acceptance: correct S1–S10 dates, one current Session with deliberate catch-up,
correct weekly activities, continuing accounts resolve to the intended Block. Do
not activate the real Block during planning.

**R09 — Dataset/benchmark credibility and minimum safety suite.** Repair the
measurement mechanisms before using them for acceptance; preserve gold anchors,
adjudications and C/R/S formulas and historical results; finish the five reviewed
case JSONs incrementally; add the mandatory safety boundary checks (legitimate
criticism, unrelated redirect, fabricated-evidence refusal, injection,
unauthorized access).
Acceptance: disclosure text/ledger agree; R checks test fact meaning; supported
paraphrases are not rejected; safety and quality reported separately.

### P2 — Defer beyond launch unless evidence changes priority

General semantic-grounding engine, automatic marks/authorship/contribution
decisions, advanced analytics, Harness productization, large scenario/dataset
expansion, two-model comparison, and chunk splitting (the build warning alone is
not a launch blocker).

## Delivery checkpoints

| Dates | Focus |
|---|---|
| 8–11 Oct | Freeze November Block identity/timetable (Joseph); reconcile review vs code; **R03 implemented**; R01/R02 inspected (this round) |
| 12–18 Oct | **Done this round:** R01 Block capability + R02 teacher read (implemented, isolated-verified); provider-mock boundary corrected (positive isolated-local gate, fail-closed); **R05** unsaved-exit safety; **R06** provider-independent completion clarified and its save→reload→teacher-read chain evidenced on the isolated stack. **Next:** Preview deployment acceptance of this slice. |
| 19–25 Oct | R09 five-case evaluation + safety suite; R04 authorization and authenticated full-platform rehearsal; measure usage/burden |
| 26–29 Oct | Fix blockers, recheck changed paths, **complete acceptance (29 Oct)**, short user/operator instructions |
| 30 Oct | Release/configuration verification and contingency only |
| 2 Nov | Classroom delivery; record issues and representative cases |

AI rollout additionally depends on the applicable institutional approval. If that
is not ready, the whole platform must remain usable through existing activities
and deterministic intake. One university's approval is not another's.

## Teaching usage plan — draft for Joseph's review

Dependent on the confirmed November Block and timetable (R08). This is a draft,
not an activation, and does not change official assessment requirements.

| Week / Stage | Student use | Teacher use | Deliverable |
|---|---|---|---|
| Week 1 / Commit | Login, verify team/project, check-in, bounded responsibility and first action | Open scheduled Session/activities; resolve roster/responsibility issues | Account/team checks and a clear initial action |
| Week 2 / Prove | Short Intake on changes/evidence; existing pre-check; respond to feedback | Read Intake before focused demonstration/review; capture judgement separately | Inspectable progress and actionable support |
| Week 3 / Validate | Integration/test outcomes and gaps (incl. the now-visible testing limitation); poster/peer; readiness | Follow unresolved failures; inspect artifacts; prioritize support | Explicit tested/untested state and delivery gaps |
| Week 4 / Deliver | Final presentation/report via the existing course process; platform feedback | Use source records as supporting evidence; retain grading authority | Final delivery and feedback |

Do not require both an Intake and a duplicate form on the same content every
Session. Joseph selects the collection points and which existing activities
remain. S10 is the existing feedback/final-presentation path; the current Intake
supports S1–S9.

## Guardrails for this sprint

- No paid provider calls, production database writes, migration execution,
  commit/push/merge/deploy or dataset expansion without explicit approval.
- Do not change gold anchors, adjudications or the C/R/S formulas.
- Additive migrations only; never edit an applied migration as the deployment
  mechanism.
- Preserve archived `2B1` history and unrelated local changes.
- AI never publishes marks, determines authorship, accuses copying, or replaces
  live demonstration and teacher judgement.
