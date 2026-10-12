# Sprint 9 — Rendered-UI Rehearsal Evidence Index
Screenshots captured during the Sprint 9 rendered-UI rehearsals (R04 UI rehearsal,
the teacher mode selector + fallback/history rehearsal, and the local full-stack
rehearsal), driven through headless Chrome (DevTools Protocol) against the
**isolated local Supabase stack** (`127.0.0.1`, not linked, synthetic data only).
No production data. **Nothing in this sprint has been committed to git** — these
files are saved in the working tree only, pending review.

Screenshot inspection method: each image is a full-page PNG captured via CDP
`Page.captureScreenshot`. They were inspected two ways — (1) **programmatic DOM
assertions** at capture time (the rehearsal scripts read `document.body.innerText`
/ element state and logged the pass/fail values quoted in the reports), and
(2) a **credential/secret scan** of each PNG's byte stream with `strings … | grep`
for JWT (`eyJ…`), `sb_secret_` / `sb_publishable_`, `service_role` and the
synthetic test passwords; **none were found** in any image. The screenshots are
visual corroboration of the DOM-level assertions, not the sole evidence. Student
display names (e.g. "Ava Chen") are synthetic seed fixtures, not real people.

Scope note: these are **browser-rendered** evidence. Deployed SQL/RPC
authorization evidence is recorded separately in `S9-R04_EXECUTION_REPORT.md`.
The AI Intake screenshots use a **mocked provider transport** (no live model);
they are application-integration evidence, **not** model-quality or live-extraction
proof.

| File | Scenario | Outcome shown |
|---|---|---|
| `10-portal.png` | Student portal, deterministic mode | Routed to "Start guided Intake"; Work Track entry absent |
| `20-form-step1.png` | Deterministic Form step 1 | Responsibility/progress/scope fields |
| `21-step1-filled.png` | Form step 1 filled | Entered values |
| `22-step2-filled.png` | Form step 2 | Evidence + executed testing + "Expected result or baseline" (untested limitation) |
| `23-step3-filled.png` | Form step 3 | Next action + blockers |
| `24-after-step3.png` | Transition | Advanced past step 3 |
| `25-step5-review.png` | Review (step 5) | Shows "Expected / limitation: Not tested by student: the API error branch" (R03) |
| `26-after-submit.png` | Submit | "Session Intake confirmed." |
| `30-reload-portal.png` | Reload | Session shows confirmed state |
| `31-confirmed-readonly.png` | Confirmed record | "Confirmed history · read-only"; 0 editable fields |
| `40-teacher-dashboard.png` | Teacher dashboard | Studio Sessions · 2026 2B2 |
| `41-teacher-intake-panel.png` | Teacher Intake panel | "1 / 12 roster submitted · 11 missing" |
| `42-teacher-intake-detail.png` | Teacher detail (collapsed) | Submitted row for s1001 |
| `43-teacher-detail-open.png` | Teacher detail (open) | Executed testing vs untested limitation; "Teacher verification: Not recorded in Intake"; source conversation |
| `50-draft-before-disable.png` | Draft open before mode change | Entered draft work present |
| `51-disabled-submit-result.png` | Mid-draft state | Draft preserved after teacher disabled the Block |
| `52-disabled-submit-rejected.png` | Submit under disabled | "Session Intake can only be submitted while it is open"; no success; work preserved |
| `60-mode-selector-before.png` | Teacher mode selector (new) | Selector with the three labelled options + Block-wide explainer |
| `61-mode-selector-success.png` | Mode set to deterministic | "This Block now uses: Intake Form…" success after persisted-value confirmation |
| `62-student-submit-under-ui-mode.png` | Student submit under UI-selected mode | Confirmed through the Form |
| `63-student-disabled-view.png` | Student view after return to disabled (before fix was observed) | Work Track journey; no Intake history entry (the gap this round fixed) |
| `64-disabled-history-list.png` | Student disabled mode (after fix) | "Confirmed Session Intake history" read-only list present |
| `65-disabled-history-readonly.png` | Student opens history entry | "Confirmed history · read-only"; 0 editable fields; no submission reopened |
| `66-teacher-disabled-history.png` | Teacher disabled mode (after fix) | "Intake history" button opens read-only panel; "1 / 12 roster submitted" |
| `70-student-worktrack-view.png` | Student legacy Work Track (disabled, S9) | "Complete Track →" entry present |
| `71-student-worktrack-modal.png` | Work Track modal | "Session Task + Work Track" opens (S6–S9 only) |
| `80-login-form.png` | Full-stack: student login form (no injection, no `window.__supabase`) | Login form rendered; hook confirmed absent |
| `81-portal-after-login.png` | Normal login via `/api/student-login` → `setSession` | Authenticated portal; "Team 1"; Sign out present; no error |
| `82-portal-after-reload.png` | Reload | Session persists; portal still rendered |
| `83-after-logout.png` | Logout | Back to login form; session token cleared |
| `90-ai-chat-open.png` | AI mode (mocked provider): chat opened | Chat thread rendered |
| `91-ai-review-card.png` | AI conversation → review | Review card reached (backend decision); LLM badge present |
| `92-ai-corrected.png` | Student correction in review card | Progress claim corrected (attestation reset) |
| `93-ai-submitted.png` | Attest + save | "Session Intake confirmed. This Session is now read-only." |
| `94-ai-student-reload.png` | Reload | Confirmed read-only history |
| `95-ai-teacher-read.png` | Teacher reads the AI-assisted intake | source mode ai; corrected claim; untested limitation; correction history |
| `96-provider-failure-fallback.png` | Mocked provider FAILURE | "Fallback" badge; answer preserved |
| `97-provider-failure-review.png` | Provider failure → deterministic completion | Usable fallback review reached |
| `A0-worktrack-s9-open.png` | Legacy Work Track S9 opened (disabled mode) | Session Task + Work Track form |
| `A1-worktrack-s9-filled.png` | Work Track filled | 3 core requirement scores + readiness sub-sections |
| `A2-worktrack-s9-saved.png` | Submit | "Work Track saved." (branching: criticalBlocker=No needs no note) |
| `A3-worktrack-reload.png` | Reload | Student sees View/Update track |
| `A4-worktrack-teacher-read.png` | Teacher Work Track evidence panel | "1 / 12 tracked · 0 need attention"; s1001 row |
| `A5-selector-failure.png` | Teacher mode selector controlled failure (UPDATE grant revoked) | Error shown; **no** success; displayed mode stays `disabled`; DB unchanged |

## Unavailable / not covered

- **AI-mode conversational path**: not rendered-driven (deterministic focus);
  AI-mode selection in the teacher UI does **not** prove AI conversation
  functionality.
- **Full legacy Work Track submission**: only entry + modal render were captured
  (reachability); the branching Work Track form submit was not completed here.
  The Work Track covers **S6–S9 only**, never S1–S5.
- **Normal student login via the rendered UI**: blocked by local tooling (see the
  mode-selector report); the supported `/api/student-login` endpoint was verified
  to return tokens, but the SPA does not mount under `vercel dev`. Injected-session
  rendering is NOT counted as login/activation acceptance.
- **Mode-change-during-draft** full capture is in the earlier R04 UI rehearsal
  (screenshots 50–52); the chat-modal AI mid-draft handler is covered by offline
  tests, not rendered here.
