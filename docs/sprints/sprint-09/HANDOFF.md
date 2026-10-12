# Sprint 9 — Handoff

Current state and next implementation slice for NIT3004 classroom delivery.
Language: English. Plan/review: Joseph and ChatGPT. Implementation: Claude.

## Current position

Branch `integration-tests-m4-m10-m14`, **committed HEAD `656f55f`** — its tree is
byte-identical to reviewed main `96d2aee` (PR #67 merge; `git diff` empty). The
**working tree carries all uncommitted Sprint 9 work** (R01–R04, the teacher mode
selector, the read-only history fixes, the **positively-restricted provider-mock
gate**, the **R05 unsaved-exit guard**, and the local serving setup); nothing is
committed this sprint. The earlier dev-only `window.__supabase` hook has been
**removed**.

### Delivered (uncommitted, in the working tree)

- **R01** (`S9-R01_REPORT.md`): `teaching_blocks.intake_mode`
  (`disabled`/`deterministic`/`ai`, default `disabled`, teacher-only via RLS);
  re-gated `get_my_student_context` (+`intakeMode`), `save_my_session_intake_chat`
  / `_ai` / `_fallback`; AI endpoint gated to `ai`; server-authoritative student
  routing and teacher controls; in-progress mode-change handling.
  Migration `20261009_sprint9_r01_block_intake_mode.sql` + audit.
- **R02** (`S9-R02_REPORT.md`): additive `get_teacher_session_intakes` RPC
  (`20261008_…`) with roster-base list, off-roster preservation and separated
  roster-vs-off-roster counts; teacher Intake read panel; audit.
- **R03** (`S9-R03_REPORT.md`): the testing limitation (`baseline_or_expected`)
  is shown in the student review/evidence, the confirmed history, and the teacher
  panel, and is correctable with attestation reset.
- **R04** (`S9-R04_PRECHECK_REPORT.md`, `S9-R04_EXECUTION_REPORT.md`,
  `S9-R04_UI_REHEARSAL_REPORT.md`, `S9-MODE_SELECTOR_REPORT.md`): defect fixes
  D1–D4; isolated deployed-authorization execution; rendered-UI rehearsal; the
  **teacher Block-level Intake mode selector** (confirms the persisted server
  value before showing success); and read-only confirmed-history reachability for
  both student and teacher when the Block returns to `disabled`.
- **Local full-stack rehearsal** (`S9-FULLSTACK_REHEARSAL_REPORT.md`): resolved
  local app+API serving (plain Vite + a separate `vercel dev` for `/api` via the
  `vite.config.ts` proxy — the production `vercel.json` SPA rewrite was the cause;
  **no production routing changed**); verified **normal rendered student login**
  (no injection), **AI Intake under a mocked provider transport**
  (`INTAKE_MOCK_PROVIDER`, gated off in production), and the **complete legacy
  Work Track** acceptance plus the teacher-selector failure state. The dev-only
  `window.__supabase` hook was **removed** (real login makes it unnecessary); the
  only app-code addition from that round was the provider-transport mock seam in
  `api/session-intake-ai.ts`.
- **Mock-boundary correction + R05 + R06 clarification**
  (`S9-R05_REPORT.md`, this round):
  - **Provider-mock boundary corrected.** The earlier
    `VERCEL_ENV !== "production"` gate was a *negative* condition that also
    permitted Preview and unset/unknown environments. It is replaced by an
    exported `resolveMockGate(env)` that *positively* restricts the mock to an
    explicit isolated-local test runtime, read only from trusted server config:
    flag `INTAKE_MOCK_PROVIDER ∈ {1,fail}` **and** opt-in
    `INTAKE_MOCK_ALLOW === "local-isolated"` **and** `VERCEL_ENV` unset/empty or
    `"development"` (production, preview and unknown values refused) **and** the
    resolved Supabase target is an `http` loopback (`127.0.0.1`/`localhost`
    only). A present-but-misconfigured flag fails **closed** at the top of the
    handler (503, `stage: provider_mock_gate`) before any auth, Supabase read or
    provider call — it can never silently fall through to a real paid provider.
  - **R05 unsaved-exit safety.** New `src/intakeExitGuard.ts` (pure dirty
    predicates + a process-wide unsaved registry owning a single `beforeunload`).
    Both Intake lifecycles (`FormSessionIntakePrototype`, `SessionIntakeModal`)
    route every close control through a confirm-on-exit guard; the Sign-out
    control is also guarded. Cancelling preserves entered answers and review
    corrections; a save failure keeps content dirty/retryable; dirty clears only
    on authoritative save success or explicit discard; confirmed submissions stay
    read-only. **No persistent transcript storage** was introduced, and the
    `beforeunload` prompt is explicitly **not** crash recovery.
  - **R06 gap closed.** The prior fallback evidence stopped at the provider-
    failure *review screen* (screenshots 96–97); it did not prove save→reload→
    teacher-read. That one missing chain was exercised on the isolated local
    stack with a synthetic student (real JWT), confirming a provider-failure
    fallback **saves** (`source_mode=deterministic_fallback`), **reloads** as a
    confirmed read-only record (duplicate save refused), and is **teacher-read**.

### Verified — by tier

Verification is reported in three distinct tiers. **Isolated-local** evidence does
not imply **Preview/production acceptance**, and neither implies **live model
quality** (the AI path has only ever run under a mocked transport).

**Tier 1 — Offline (build + unit/contract tests):**

- `npm run build` PASS; `npm test` **134/134** PASS (was 96/96; +18 from
  `r05-provider-mock-gate.test.mjs` and +20 from `r05-unsaved-exit-guard.test.mjs`).
- The mock gate's fail-closed behaviour is asserted at the handler level
  (invalid config → 503 before any outbound fetch; valid local success/fail →
  zero `api.openai.com` calls).

**Tier 2 — Isolated local stack (`127.0.0.1`, not linked, synthetic only):**

- **SQL audits**: `sprint9_r01` 6 PASS + 1 informational REVIEW (table-grant vs
  RLS, non-teacher `UPDATE`→0-rows confirmed), `sprint9_r02` 16/16,
  `sprint8_phase2a` PASS, `sprint8_adaptive` 9/9.
- **Deployed authorization (RPC/SQL)**: mode gating on every save path;
  teacher-only capability change (non-teacher UPDATE → 0 rows); cross-student and
  cross-session isolation; roster vs off-roster counts; disabled-mode
  history-readable + save-refused.
- **Rendered UI (deterministic path)**: teacher mode selection (persisted-value-
  confirmed success); student routed to the Form; fill → review-with-R03-limitation
  → attest → "confirmed"; reload read-only history; teacher Intake panel counts +
  limitation + source; UI duplicate prevention; mode-change-during-draft preserves
  work; disabled submit refused; read-only confirmed-history reachable (student +
  teacher) after returning to `disabled`; legacy Work Track S6–S9 reachable.
- **Full-stack rendered (local app+API)**: normal student login (no injection);
  **AI Intake under a mocked provider** (teacher mode → conversation → review →
  correction → attestation → save `source_mode=ai_assisted` → reload → teacher
  read); **provider failure → deterministic completion** (review screen reached);
  **ai→disabled** provider block (403); the complete legacy Work Track S6–S9; and
  the teacher-selector failure state.
- **R06 persisted provider-failure chain (new, this round)**: beyond the review
  screen above, the provider-failure fallback was proven to **save** (through the
  chat save path, `source_mode=deterministic_fallback`), **reload** as a confirmed
  read-only record (duplicate save refused), and be **teacher-read**
  (`get_teacher_session_intakes` shows the s1001 row and the deterministic source).
  Exercised with a real student JWT on the local stack; state restored afterwards.
- **Fallback identity**: the classroom-tested Session Work Track (S6–S9 only;
  **not** S1–S5) remains the student/teacher experience when
  `intake_mode='disabled'`. The deterministic Form is a distinct new workflow and
  is **not** the classroom-tested fallback.

**Tier 3 — Preview/production acceptance and live model quality:** NOT done (see
Open below).

### Open / unverified (NOT closed)

- **Production/Preview** deployment of any Sprint 9 change (nothing deployed).
- **Live AI extraction / model quality**: the AI path is verified only under a
  **mocked provider transport**; no live model call was made. A bounded paid run
  (hard cap $0.20) remains a separate decision.
- **R05 rendered DOM wiring**: the dirty predicates and the exit-registry/confirm
  gate are unit-verified; the modal buttons routing through the guard and the
  shared `beforeunload` prompt firing in a real browser are a browser-rehearsal
  item, not claimed by the unit tests.
- Account **activation / recovery** flows (not exercised).
- **S1→S2 carryover** as a rendered/deployed flow (not exercised this round).
- The November teaching Block identity (must not be guessed or activated).

**Resolved this round** (previously open): the provider-mock boundary is now
positively restricted and fail-closed; R05 unsaved-exit protection exists for both
lifecycles; and the R06 provider-failure save→reload→teacher-read chain is
evidenced on the isolated stack. Earlier resolved: local app+API serving (Vite
proxy + separate `vercel dev`), normal rendered student login, and the AI-mode
rendered path with a mocked provider.

**Distinction**: *preserved legacy code* and now a *full rendered legacy Work
Track submission* (fill → submit → reload → teacher read) are both verified this
round.

## Sprint 8 status — still open

Sprint 8 is **not closed**. Carried forward as Sprint 9 **R04**. Reconciled
status:

- Phase 2C **database audit** (`sprint8_adaptive_intake_security_audit.sql`) and
  the Phase 2A audit — **executed on the isolated local stack** (`127.0.0.1`, not
  linked, synthetic only): now 9/9 and PASS respectively. **Not** run against any
  Preview/production database.
- **Application acceptance** — on the isolated stack the full local-stack
  student→teacher path is verified (RPC/SQL authorization + rendered UI): **normal
  student login** (no injection), the **deterministic Form** and the **AI Intake
  under a mocked provider** (save/reload, duplicate rejection,
  cross-student/cross-Block/cross-session isolation, teacher read, roster vs
  off-roster counts, disabled-mode history/save, provider-failure → deterministic
  completion, ai→disabled block), and the **legacy Work Track S6–S9**. **Still
  open**: Preview/production acceptance; **live AI extraction / model quality**
  (only the mocked transport was exercised); account **activation/recovery**; and
  **S1→S2 carryover** as a rendered/deployed flow.
- The single bounded paid live Intake re-run remains gated on Joseph's model +
  spend approval; **no paid call has been made**.

PR #65/#66/#67 are merged, but merge does not imply these acceptance checks
passed. Gold anchors, adjudications and C/R/S formulas are unchanged and must
stay unchanged.

## November Block code — unresolved (one Joseph input)

Local records contain only `2B1` (archived), `2B2` (mock pilot) and `1B4`
(archived). No November 2026 block/timetable exists. The November Block code was
not guessed or created. Supplying it unblocks R01 alignment and R08 timetable
configuration. If it is a new code, R01's additive migration must widen the
`teaching_blocks.block_code` CHECK (currently `1B1,1B4,2B1,2B2,2B4`).

## R03 — what shipped (offline) and what is unverified

Implemented (reuse-only; `src/main.tsx`, `src/intakePolicy.ts`):

- `baseline_or_expected` / `testingBaseline` now displays in the deterministic
  review step 5, the deterministic live evidence panel, the chat current-session
  evidence drawer, and the chat confirmed-history view (read-only).
- The chat review card makes `testingBaseline` correctable through the existing
  `correct()` contract — records `{field, before, after}`, rebuilds the record,
  resets attestation; `corrections` and the original `extracted_record` persist
  through `save_my_session_intake_chat`.
- `changedEvidenceFields` now flags a `testingBaseline` change.

Unverified: rendered DOM behaviour (no browser/dev server/Supabase/auth offline).
The record-builder and reducer regressions are not claimed as UI proof. An
authenticated browser rehearsal (R04) must confirm before-confirmation
visibility, after-reload visibility, live attestation reset and history
read-only.

## History — Sprint 9 implementation rounds (completed, see reports)

The per-round detail below is **history**. The authoritative current state is the
"Current position" section above. In order: R03 (visible/correctable testing
limitation), R02 (teacher Intake read RPC + panel), R01 (server-authoritative
`intake_mode` capability + aligned gates), R04 (defect fixes D1–D4, isolated
deployed-authorization execution, rendered-UI rehearsal, teacher mode selector,
read-only history reachability), then the **mock-boundary + R05 + R06** slice
(positively-restricted provider-mock gate, unsaved-exit safety for both Intake
lifecycles, and the evidenced R06 provider-failure save→reload→teacher-read
chain). Reports: `S9-R01_REPORT.md`,
`S9-R02_REPORT.md`, `S9-R03_REPORT.md`, `S9-R04_PRECHECK_REPORT.md`,
`S9-R04_EXECUTION_REPORT.md`, `S9-R04_UI_REHEARSAL_REPORT.md`,
`S9-MODE_SELECTOR_REPORT.md`, `S9-R05_REPORT.md`.

## Delivery strategy — incremental usable releases (current)

Joseph's current direction supersedes the earlier "finish the slice then Preview"
plan: ship **usable increments**, with a **non-AI first production release**. A
first release does **not** require every R01–R09 item to be complete.

Sequence:

1. **Local release candidate (done this round, awaiting hands-on review).** A
   complete, persistent, isolated local classroom on synthetic data, defaulting to
   the **legacy workflow**, with **deterministic Intake teacher-selectable** and
   **AI off**. Startup/login/walkthrough in `LOCAL_RELEASE_CANDIDATE.md`. The
   smoke chain (login → context → S7 Work Track submission → reload → teacher
   read) and the deterministic-routing switch passed on the fixture.
2. **Joseph hands-on review.** Joseph runs the local candidate and reports what is
   actually usable and what blocks classroom use.
3. **Fix blockers only.** Fix defects that block real use or violate the essential
   data-access, submission-integrity or paid-call boundaries. No broad test
   expansion, scenario expansion or refactoring for the first release.
4. **First production release (non-AI).** Resolve the November Block identity
   (R08), apply the reviewed migrations to the hosted DB with audits, do Preview
   deployment acceptance (login → context → submission → reload → teacher read on
   hosted routing), configure the real Block, and verify activation/recovery and
   S1→S2 carryover. Keep AI off.
5. **Staged improvements.** AI Intake (gated on institutional approval + a
   separately budgeted live model-quality run), R07 usage controls, R09
   dataset/safety suite, and the remaining P1/P2 items — delivered incrementally
   after the first release, not as first-release blockers.

**Keep Sprint 8 Phase D open** until Preview/production + live evidence exist. Do
not guess or activate the November Block. Local serving is not hosted production
acceptance.

### Local release candidate — what was added this round

- Extended `scripts/seed-local-testdata.mjs` into the RC fixture: active rehearsal
  Block `2026 · 2B2` (schema-supported code, clearly **not** the November Block),
  `intake_mode='disabled'` (legacy default), S7 open (Check-in + Work Track),
  S6–S9 Work Track open, S1–S9 Intake-open, Weeks 1–4 open, 10 students / 3 teams
  / 5 projects, teacher account. Added an idempotent prune of non-canonical
  roster/teams (removed stray benchmark students/teams). Archived `1B4`/`2B1`
  untouched.
- Added `scripts/preview-with-api.sh` + `npm run preview:api`, and a `preview`
  proxy in `vite.config.ts`, so the **production build** can be served locally
  with `/api` routing. Verified: built `index.html` + hashed assets, `/student`
  and `/admin` SPA routes 200, a built JS asset 200, `/api/student-login` proxied,
  and a real synthetic login 200. Difference from dev: `vite preview` binds IPv6
  `localhost` — use `http://localhost:4173`.

## Constraints carried into the next round

- Additive migrations only; never edit an applied migration as the deployment
  mechanism. Review and audit any migration before use.
- No paid calls, production writes, migration execution, commit/push/merge/deploy
  or dataset expansion without explicit approval.
- Preserve unrelated local changes and archived `2B1` history.
- Keep the non-AI classroom flow fully usable independent of any AI provider or
  institutional approval.

## Pointers

- Plan and acceptance criteria: `docs/sprints/sprint-09/PLAN.md`.
- R03 detail and validation evidence: `docs/sprints/sprint-09/S9-R03_REPORT.md`.
- Review source: `docs/sprints/sprint-09/NIT3004_Block_Readiness_Review_2026-10-08.md`.
- Sprint 8 open items: `docs/sprints/sprint-08/HANDOFF.md` (Phase D).
