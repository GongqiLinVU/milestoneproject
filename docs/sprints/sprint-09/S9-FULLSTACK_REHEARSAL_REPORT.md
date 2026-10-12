# Sprint 9 — Local Full-Stack Rehearsal Report

Normal student login, AI Intake with a mocked provider, and the complete legacy
fallback (Work Track) acceptance, on the isolated local environment.

Author: Claude (local execution). Plan/review: Joseph and ChatGPT.
Date: 12 October 2026. Language: English.

Driven through a real headless browser (Chrome DevTools Protocol, no new
dependency) against the **isolated local Supabase stack** (`127.0.0.1`, not
linked, synthetic data only). No production/shared changes, no paid provider
calls, no commit/push/merge/deploy. **Nothing was committed to git.** AI evidence
is application-integration under a **mocked provider transport**, not
model-quality or live-extraction proof.

## 1. Local serving — cause and solution

**Cause.** `vercel.json` contains the production SPA rewrite
`{"source":"/(.*)","destination":"/index.html"}`. Under `vercel dev` this rewrite
is applied to **every** local request, including Vite's own module/asset requests
(`/src/main.tsx`, `/@vite/client`, …). Those requests received `index.html`, so
Vite's import analysis failed ("invalid JS … .html file format", HTTP 500) and
the React app never mounted (`#root` empty). This is why earlier rounds could
only reach the API via `curl` but not render the SPA under `vercel dev`.

**Solution (already scaffolded in the repo; no production routing changed).** Run
two local processes, as documented in `scripts/dev-with-api.sh` and
`vite.config.ts`:

1. **plain Vite** serves the frontend on `:5173` (correct module serving);
2. a **separate `vercel dev` instance** serves `api/*.ts` **only** on `:3010`;
3. Vite proxies `/api/*` → `:3010` via `server.proxy` keyed on
   `VITE_DEV_API_PROXY_TARGET`.

Reproducible startup (no credentials in the commands; values come from the
gitignored `.env.local`):

```bash
# Terminal: export local env, then start both processes.
set -a; . ./.env.local; set +a            # local Supabase URL/keys for the API runtime
vercel dev --yes --listen 3010 &          # API functions only, on :3010
VITE_DEV_API_PROXY_TARGET=http://127.0.0.1:3010 \
  node_modules/.bin/vite --port 5173      # frontend on :5173, proxies /api -> :3010
# (or simply: ./scripts/dev-with-api.sh)
```

Verified: `GET /src/main.tsx` returns transformed JS (not `index.html`), and
`POST /api/student-login` through the Vite proxy returns **200**. The browser
renders the app **and** calls the actual application API handlers.

## 2. Normal rendered student login (no injection)

Done through the supported login UI → `/api/student-login` → `supabase.auth.setSession`,
with **no session injection** and the dev-only `window.__supabase` hook **removed**
from `src/main.tsx` for this rehearsal (real login makes it unnecessary).

| Step | Outcome | Evidence |
|---|---|---|
| Hook absent | `typeof window.__supabase === 'undefined'` | — |
| Login (s1001 / Student123!) | Authenticated portal renders ("Team 1", Sign out, no error alert) | `80`,`81` |
| Session token | present in `localStorage` (`…auth-token`) | — |
| Reload | portal persists (session restored) | `82` |
| Logout | returns to the login form; token cleared | `83` |

**Explicitly unverified**: account **activation** and **recovery** flows were not
exercised in this rehearsal.

## 3. AI Intake with a mocked provider transport

A small seam was added to `api/session-intake-ai.ts` that mocks **only the
provider network transport** — the real auth, eligibility, parsing,
`decideTurn`, and persistence all run. **Hard safety**: the mock activates only
when `INTAKE_MOCK_PROVIDER` is `"1"` (success) or `"fail"` (transport failure)
**and** `process.env.VERCEL_ENV !== "production"`. It therefore cannot reach a
paid provider and cannot be enabled in production. For the rehearsal the local
API process also used a dummy `OPENAI_API_KEY`, so no real key was in play.

Outcomes (rendered + endpoint; isolated; synthetic):

- **Full flow** `[90–95]`: teacher selects **AI Intake** (mode selector) → student
  routed to the chat → conversation (mocked responses flowed with the **LLM**
  badge) → review (reached by the backend's authoritative decision) →
  **correction** of the Progress claim (resets attestation; re-ticked) → required
  fields completed via the review-card editors → attested → **saved**
  ("Session Intake confirmed. This Session is now read-only."). DB:
  `student_session_intakes = 1`, `source_mode = ai_assisted`. Reload shows
  read-only history. **Teacher read**: panel "1 / 12 roster submitted · 11
  missing", source mode AI, the corrected claim, the untested limitation, and the
  correction history.
- **Provider failure → deterministic completion** `[96–97]`: with the fail-mock,
  the endpoint returns `route=provider_fallback_continue`,
  `providerFailure=provider_http_503`, `extractionPending=true` and a usable
  result (HTTP 200, not an error). Rendered: a **Fallback** badge, the "answer
  preserved" message, and a usable fallback review — a provider-independent
  completion.
- **ai → disabled mid-conversation**: the endpoint returns **403
  `session_not_eligible_for_ai_intake`** once the Block is `disabled` — the
  provider is blocked and submission via the AI path is refused.
- **ai → deterministic (preserve + authorized save)** and **confirmed history
  readable**: the mode-change handler preserves entered work and routes to the
  provider-independent review, and `save_my_session_intake_chat` is authorized for
  `deterministic`; `get_my_session_intake` is ungated by mode. These were verified
  at the deployed RPC level in `S9-R04_EXECUTION_REPORT.md` and the handler is
  unchanged this round.

This is **application-integration** evidence (the real pipeline runs on a scripted
transport). It is **not** model-quality or live-extraction evidence.

## 4. Legacy fallback — complete Work Track acceptance

In the existing classroom workflow (`intake_mode='disabled'`), the S9 **Session
Work Track** was completed end to end `[A0–A4]`:

- Student filled the three core requirement scores (75%) and the S9 readiness
  sub-sections (Product / Final Report / Presentation / Demo = Ready), set
  `criticalBlocker = No` and `overallReadiness`. The **branching behaviour was
  preserved**: with `criticalBlocker = No` the form correctly did **not** require
  a blocker note.
- Save → "Work Track saved."; DB `student_session_work_tracks = 1` for s1001.
- Reload → the student sees View/Update track.
- Teacher read via the Work Track evidence panel → "1 / 12 tracked · 0 need
  attention", s1001 row present.

The Work Track covers **S6–S9 only** (never S1–S5).

**Teacher selector failure state** `[A5]` — a controlled local failure: the
`authenticated` `UPDATE` grant on `teaching_blocks` was revoked, then the teacher
tried to change the mode to AI. Result: an **error** ("The Intake mode could not
be changed. Your teacher role may be required."), **no success message**, the
displayed mode **stayed `disabled`** (not AI), and the DB value was **unchanged**.
This confirms the selector's update→re-read→success-only-on-confirm design: no
false success and no incorrect persisted mode. The grant was restored afterwards.

## 5. Changed files and checks

- `api/session-intake-ai.ts` (+56): `mockTurnResult()` helper + a provider-transport
  mock seam gated by `INTAKE_MOCK_PROVIDER` and `VERCEL_ENV !== "production"`
  (success and fail modes). No change to auth/eligibility/persistence logic.
- `src/main.tsx` (net; this round): **removed** the dev-only `window.__supabase`
  hook (0 references remain). (The teacher mode selector and read-only history
  additions from the previous round remain.)
- `docs/sprints/sprint-09/evidence/ui-rehearsal/` + `INDEX.md`: 18 new screenshots
  (80–97, A0–A5), 44 total; the index wording was corrected ("nothing has been
  committed to git") and now describes the actual inspection method (programmatic
  DOM assertions + a `strings | grep` secret scan; none found).

Checks: `npm run build` **PASS**; `npm test` **96/96 PASS**. Isolated DB cleaned
after evidence capture (`student_session_intakes = 0`, no S10xx tracks, all blocks
`disabled`, all sessions `closed`). Dev processes and headless Chrome stopped.

## 6. Verified vs blocked

**Verified this round (rendered, isolated, synthetic):**
- Local app+API serving via the Vite-proxy + separate-API setup.
- Normal student login (no injection): login, portal, reload, logout.
- AI Intake under a mocked provider: teacher mode → conversation → review →
  correction → attestation → save → reload → teacher read; provider-failure →
  deterministic completion; ai→disabled provider block.
- Legacy Work Track S6–S9: fill → submit → reload → teacher read, branching
  preserved.
- Teacher selector failure state: no false success, no wrong persisted mode.

**Still blocked / not covered:**
- **Live AI extraction / model quality** (deliberately mocked; a bounded paid run
  remains a separate decision, hard cap $0.20).
- **Preview/production** deployment and acceptance of any Sprint 9 change.
- Account **activation / recovery** flows (not exercised).
- **S1→S2 carryover** as a rendered flow (not exercised this round).

## 7. Remaining first-release tasks

1. Decide on a **bounded paid live `ai`** run to validate live extraction quality
   (separate approval; hard cap $0.20), or defer with the mocked-transport
   integration evidence as the first-release bar.
2. **Preview/production** deployment + acceptance of the Sprint 9 changes
   (migrations `20261008`, `20261009`; the mode selector; R03 displays).
3. Exercise **activation/recovery** and **S1→S2 carryover** rendered flows.
4. Resolve the November teaching Block identity (do not guess or activate).
5. Keep **Sprint 8 Phase D** open until the live/preview items above are evidenced.

## 8. One proposed next task

Prepare the **Preview deployment acceptance**: apply the reviewed migrations to a
Preview Supabase project, run the four read-only audits there, and re-run this
rendered rehearsal (login, deterministic Form, AI with the mocked transport,
Work Track) against Preview — keeping the live paid `ai` run and the November
Block as separate explicit decisions, and keeping Sprint 8 Phase D open.
