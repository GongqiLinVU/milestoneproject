# Sprint 9 — R05 slice report (mock-boundary correction · R05 unsaved-exit safety · R06 clarification)

Local slice: correct the provider-mock boundary, implement R05 Intake
unsaved-exit safety, and close one R06 evidence gap. Reconcile `PLAN.md` and
`HANDOFF.md`.

Author: Claude (local execution). Plan/review: Joseph and ChatGPT.
Date: 12 October 2026. Language: English.

Scope guardrails honoured: no paid provider calls, no shared/production database
changes, no migration execution against anything but the isolated local stack,
no commit/push/merge/deploy. Isolated local synthetic testing was authorised for
this slice and used only on `127.0.0.1`. Nothing was committed to git; HEAD
remains `656f55f`. All pre-existing uncommitted Sprint 9 and unrelated changes
were preserved.

---

## 1. Changed files

| File | Change |
|---|---|
| `api/session-intake-ai.ts` | Replaced the negative `VERCEL_ENV !== "production"` mock gate with an exported `resolveMockGate(env)` that positively restricts the provider-transport mock to an isolated local test runtime, and fails **closed** at the top of the handler. |
| `src/intakeExitGuard.ts` *(new)* | Framework-agnostic R05 guard: pure dirty predicates + a process-wide unsaved registry owning one `beforeunload` listener + a confirm-on-exit gate. No persistent storage. |
| `src/main.tsx` | Added `useIntakeUnsavedGuard`; both Intake lifecycles compute dirtiness and route every close control through a guarded close. |
| `src/StudentAccess.tsx` | The authenticated Sign-out control is routed through the shared exit gate. |
| `package.json` | Added `src/intakeExitGuard.ts` to the `test:build` compile list so Node tests can import the compiled module. |
| `tests/ai-session-intake/adaptive/r05-provider-mock-gate.test.mjs` *(new)* | 18 focused boundary tests for the mock gate (unit + handler-level fail-closed). |
| `tests/ai-session-intake/adaptive/r05-unsaved-exit-guard.test.mjs` *(new)* | 20 focused tests for the exit-guard logic (dirtiness, save-failure retainability, cross-context isolation, no-crash-recovery wording). |

A temporary synthetic script (`scripts/r06-synthetic-check.mjs`) was used to
exercise the R06 chain against the live local stack and was **deleted** after the
run; its result is recorded in §4.

---

## 2. Provider-mock boundary — the exact gate

### Problem

The previous gate was:

```ts
const mockProviderEnabled = process.env.INTAKE_MOCK_PROVIDER === "1" && process.env.VERCEL_ENV !== "production";
const mockProviderFail    = process.env.INTAKE_MOCK_PROVIDER === "fail" && process.env.VERCEL_ENV !== "production";
```

`VERCEL_ENV !== "production"` is a **negative** condition. It also permits:
- **Preview** (`VERCEL_ENV === "preview"`), and
- **unset / unknown** environments (any runtime where Vercel has not set the var).

It also did not validate the **actual Supabase target**, so the mock could in
principle be toggled against a non-local database.

### Correction — a positive, trusted-config gate (`resolveMockGate`)

The mock is now resolved by an exported pure function read **only** from trusted
server configuration (never from request body or headers). All conditions must
hold:

1. `INTAKE_MOCK_PROVIDER` is exactly `"1"` (success) or `"fail"` (transport
   failure). Any other value → `{ mode: "off" }` (real provider path).
2. `INTAKE_MOCK_ALLOW === "local-isolated"` — an explicit opt-in marker set only
   by the local rehearsal/test runtime; never set in Preview or production.
3. `VERCEL_ENV` is **unset / empty** or exactly `"development"`. Production,
   Preview, and any **unknown** value are refused (positive allowlist, not a
   negation).
4. The resolved Supabase target (`SUPABASE_URL || VITE_SUPABASE_URL`) is an
   **`http` loopback**: `http://127.0.0.1[:port]` or `http://localhost[:port]`
   only. `https`, non-loopback hosts, and look-alike hosts such as
   `http://localhost.evil.com` / `http://127.0.0.1.evil.com` are rejected. This
   mirrors the trusted-target check already enforced by
   `scripts/dev-with-api.sh` and `scripts/run-integration-tests.sh`.

Return contract:

- `{ mode: "off" }` — flag absent → use the real provider.
- `{ mode: "success" | "fail" }` — the mock is authorised.
- `{ mode: "invalid", reason }` — the flag is present but the runtime is **not**
  a trusted isolated-local one.

### Fail-closed

`resolveMockGate()` is called at the **top of the handler**, before auth, any
Supabase read, or any provider request. An `invalid` result returns
`503 { stage: "provider_mock_gate", code: <reason> }` immediately. A
misconfigured mock therefore **cannot silently fall through to a real paid
provider**. Client-supplied environment claims are never consulted.

### Focused test results (`r05-provider-mock-gate.test.mjs`, 18/18 PASS)

Unit boundary over `resolveMockGate`:
- success/fail authorised only in the isolated local runtime (unset or
  `development` `VERCEL_ENV`);
- **production** refused (`mock_forbidden_in_production`);
- **Preview** refused (`mock_forbidden_in_preview`);
- **unknown** `VERCEL_ENV` refused (`mock_requires_development_or_unset_vercel_env`);
- missing opt-in refused (`mock_requires_local_isolated_opt_in`);
- **non-local Supabase target** refused (`mock_requires_local_supabase_target`),
  including unset target, `https` loopback, and `*.evil.com` look-alikes;
- `localhost` and `VITE_SUPABASE_URL` fallback accepted.

Handler-level fail-closed proof:
- an invalid config (Preview; and separately a non-local Supabase target) returns
  503 with the correct code and **zero outbound fetches** (no auth, no Supabase
  read, no provider call);
- a valid local **success** mock completes the turn with **zero**
  `api.openai.com` calls;
- a valid local **fail** mock exercises the deterministic fallback
  (`route=provider_fallback_continue`, `providerFailure=provider_http_503`,
  `extractionPending=true`) with **zero** provider calls.

---

## 3. R05 — unsaved-exit safety

### What was there

`SessionIntakeModal` (conversational AI) and `FormSessionIntakePrototype`
(deterministic form) held all answers/turns/corrections in React state. Every
close control (`← Sessions`, `← Back to Sessions`, step-1 `Close`,
`Back to Sessions`) called `onClose` directly; there was no unsaved-exit guard
and no `beforeunload`. Accidental exit silently discarded entered work.

### What was implemented

A new framework-agnostic module `src/intakeExitGuard.ts`:

- **Pure dirty predicates.** `deterministicFormDirty(...)` and
  `chatIntakeDirty(...)` express exactly "unsaved content exists". A
  confirmed/read-only or closed Session is **never** dirty.
  - Form dirty when, for an open and not-yet-confirmed Intake, any answer differs
    from the fresh baseline, the wizard advanced past step 1, a follow-up answer
    exists, or the attestation is ticked.
  - Chat dirty when, for an open and not-yet-confirmed Intake, a student turn was
    sent, an un-sent composer draft exists, evidence fields were captured, a
    review correction was made, or the attestation is ticked.
- **Process-wide unsaved registry + one shared `beforeunload`.**
  `registerUnsavedBlocker(id, isDirty)` records a per-Session blocker; a single
  `beforeunload` listener triggers the browser's native "leave site?" prompt only
  while something is dirty. `confirmExitIfBlocked()` is the shared in-app gate.

Wiring in `src/main.tsx` via `useIntakeUnsavedGuard(id, isDirty)`:

- Both lifecycles register a blocker keyed by `…-${session.sessionId}` and route
  **every** close control through `guardedClose(onClose)`.
- `src/StudentAccess.tsx` routes the authenticated **Sign out** through
  `confirmExitIfBlocked()`.

### How each required property is met

- **Cancel preserves answers and review corrections.** `confirmExitIfBlocked`
  returning false simply does not call `onClose`; all React state (answers,
  turns, corrections) is untouched.
- **Save failure preserves retryable content.** On a save error neither modal
  re-reads context, so `saved` stays false and the content stays dirty →
  retryable and still guarded. Verified by a dedicated predicate test.
- **Dirty clears only on authoritative save success or explicit discard.** A
  successful `submit()` re-reads `get_my_session_intake`; the returned
  `confirmedRecord` flips `saved` true → dirty false. Discard is the student
  explicitly confirming the prompt.
- **Confirmed submissions remain read-only.** A confirmed Session is never dirty,
  so no discard prompt appears; the modal already renders read-only history.
- **No cross-user/Block/Session leakage.** The registry id is per-Session; a
  confirmed/clean Session A never makes a different Session B appear dirty.
- **Server-authoritative mode-change behaviour preserved.** The existing
  `ai → deterministic/disabled` mid-conversation handling is untouched; the guard
  only adds exit protection on top of it.

### Deliberate non-goals (reported, not implemented)

- **No persistent transcript storage and no draft-sync system.** Transcripts may
  contain personal information, so recovery storage is a separate, deliberately
  scoped decision. If it is later judged necessary, the specific gap, a minimal
  design, and its privacy/lifecycle implications (where stored, isolation by
  user/Block/Session, retention, clearing on confirm/logout) must be reported
  first.
- **The `beforeunload` prompt is not crash recovery.** `INTAKE_EXIT_CONFIRM_MESSAGE`
  explicitly states the answers are *not saved anywhere* until confirmed; a test
  asserts the message does not promise recovery/restore. If the tab is killed or
  the student confirms "leave", the in-memory answers are gone — this is
  "don't leave by accident", not "we kept your work".

### Focused test results (`r05-unsaved-exit-guard.test.mjs`, 20/20 PASS)

Dirtiness for both lifecycles (clean vs each dirtying signal; confirmed/closed →
not dirty); save-failure keeps content dirty/retryable; the confirm message does
not promise crash recovery; the registry/confirm gate (no prompt when clean;
cancel blocks the exit; confirm allows it); cross-context isolation (a clean
sibling Session does not force a prompt; unmount unregisters; a throwing getter
does not strand the user).

### Explicitly unverified

Rendered DOM wiring — the modal buttons actually routing through `guardedClose`
and the shared `beforeunload` prompt firing in a real browser — is a
browser-rehearsal item and is **not** claimed by these unit tests.

---

## 4. R06 — the one evidence gap, closed

### The gap

Prior evidence for the provider-independent completion path
(`S9-FULLSTACK_REHEARSAL_REPORT.md` §3, screenshots `96–97`) stopped at the
provider-failure **review screen**: it showed a `Fallback` badge and a usable
fallback review (HTTP 200), but did **not** prove that the student then produced
a **persisted** record that **reloads** as confirmed and is **teacher-readable**.
The integration tests (`tests/integration/`) also did not cover this chain.
Per the brief, HTTP 200 and a usable review screen do not prove completion.

### What was exercised (isolated local synthetic, authorised)

A temporary script drove the running local Supabase stack
(`http://127.0.0.1:54321`, not linked, synthetic fixture `s1001` / block `2B2`),
with a real student JWT (login via the publishable key), simulating the exact
state the UI reaches **after a provider failure in AI mode**
(`ai_assistance.used = false`, `extraction_status = "fallback"`), saving through
the chat save path.

Result — **11/11 checks passed**:

1. student login via real JWT;
2. provider-failure-shaped **save accepted** (not merely HTTP 200);
3. persisted **`source_mode = deterministic_fallback`** (provider-independent);
4. **reload** returns a confirmed record;
5. **read-only** proven: a duplicate save is **refused**
   ("already been confirmed");
6. the reloaded **claim** matches what was saved;
7. the R03 **testing limitation** (`baseline_or_expected`) survived the
   round-trip;
8. teacher login;
9. teacher read via `get_teacher_session_intakes` succeeds;
10. the teacher **sees the s1001 submission**;
11. the teacher sees the source as a **provider-independent (deterministic_fallback)**
    submission.

Teacher-read payload keys observed: `blockId, intakes, sessionId, rosterSize,
missingCount, sessionNumber, offRosterCount, submittedCount, rosterSubmittedCount`.

### Cleanup

The synthetic intake row was deleted; block `2B2` was restored to `disabled`;
session S3 was restored to `closed`/`closed`. Post-run verification:
`intake_mode = disabled`, S3 `closed`/`closed`, zero `s1001` intake rows. The
script was then deleted.

---

## 5. Build / test (single run after all changes)

- `npm run build` — **PASS** (the pre-existing >500 kB chunk-size warning is not
  a launch blocker, per PLAN P2).
- `npm test` — **134/134 PASS** (was 96/96; +18 mock-gate, +20 R05 guard).

---

## 6. PLAN / HANDOFF reconciliation

- Replaced the stale **"Preview next"** task with the agreed remaining sequence:
  this local slice first (done, awaiting review) → Preview deployment acceptance
  → separate explicit decisions (bounded paid live run, activation/recovery and
  S1→S2 carryover, November Block for R08).
- Marked the per-round detail as **history**; the authoritative state is the
  "Current position" section.
- Separated verification into three **tiers**: offline (build + unit/contract),
  isolated local stack (SQL/RPC authorization + rendered + the R06 persisted
  chain), and Preview/production acceptance + live model quality (NOT done).
- **Sprint 8 Phase D remains open.**
- Made explicit that the **November Block identity blocks R08** (actual Block
  configuration/activation and timetable, plus a possible `block_code` CHECK
  widening), **not** the generic R01 capability, which is implemented and
  offline-verified.
- Updated the R05 and R06 backlog entries and the 12–18 Oct checkpoint to the
  delivered state.

---

## 7. Unresolved limits

- **Preview/production** deployment and acceptance of any Sprint 9 change — not
  done (nothing deployed).
- **Live AI extraction / model quality** — only the mocked transport was ever
  exercised; a bounded paid run (hard cap $0.20) is a separate decision.
- **R05 rendered DOM wiring** — unit-verified only; the browser behaviour (buttons
  through the guard, the `beforeunload` prompt) is a browser-rehearsal item.
- **No draft recovery** — by design. A crash or confirmed "leave" still loses
  in-memory answers; recovery storage, if wanted, needs its own privacy/lifecycle
  design.
- Account **activation / recovery** and **S1→S2 carryover** rendered flows — not
  exercised this round.
- The **November teaching Block identity** — unresolved; not guessed or activated.

---

## 8. Next recommendation

Proceed to **Preview deployment acceptance** of this slice: apply the reviewed
migrations (`20261008`, `20261009`) to a Preview Supabase project, run the four
read-only audits there, and re-run the rendered rehearsal (login, deterministic
Form, AI with the mocked transport, Work Track) against Preview — including a
rendered R05 unsaved-exit rehearsal in a real browser (modal close, Session/context
change, in-app navigation, and the `beforeunload` prompt). Keep the bounded paid
live `ai` run, the activation/recovery and S1→S2 carryover flows, and the November
Block (R08) as separate explicit decisions. Keep Sprint 8 Phase D open until
Preview/production + live evidence exist.

**Stopping here for review.**
