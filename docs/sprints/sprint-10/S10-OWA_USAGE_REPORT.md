# Usage observation without conversation interruption

## Trigger and behavior

The S5-4 production debug export records `429:usage_control:usage_limit` on the first student reply, before a provider response. PRs 77 and 78 added observation exports and round guidance but did not remove financial admission checks. The original generic error cannot identify which financial condition caused the refusal.

Financial reference budgets, cumulative attempt counts and reconciliation alerts are now advisory for the deployed API. Existing statistics, rates, history and teacher configuration remain. Teacher labels explain that the saved thresholds are references, including when zero. Actual conversation length still uses the existing shared eight-question maximum; this patch does not redesign the older content-based routing harness.

The existing reservation RPC remains the first accounting path. After any of its four known financial refusals (zero/unconfigured trial budget, reconciliation pending, attempt limit, Block budget), the server writes an accounting row through the existing service-role-only ledger grant. Student and Block identities come exclusively from authenticated database context. Configured model/rates/version and conservative provisions are unchanged. Nonfinancial eligibility and duplicate-request refusals still stop provider calls. Active Block, student enrollment, Session mode/window and confirmed-progress checks remain in the endpoint.

Settlement or accounting failures produce usageWarnings rather than replacing a valid provider reply. Missing pricing also permits conversation; cost is explicitly unknown, never zero. If a ledger insert is unavailable, the debug response records unpersisted token usage and an estimate when rates are available. Teacher totals may be incomplete during accounting outages; no guaranteed persistent recovery is claimed. An accounting warning does not imply provider failure.

No new SQL migration is required: the existing service_role ledger INSERT permission and finish RPC are reused. Database RPC definitions retain their historical hard limits for older callers; the updated API implements advisory behavior. Do not infer that all other potential clients have changed.

Actual provider/network/parse failures return a retryable error. The React UI restores the exact answer to the composer, retains prior successful turns, and does not fabricate a fallback question or force a review form. It does not consume another round. Existing mode-change handling is preserved.

Debug exports include usageWarnings/usageAttempts for successful and failed requests. The O-only sidecar records usage warnings for developer analysis, without displaying them as student tasks or executing actions.

## Validation

- Production TypeScript/Vite build passed; existing large-bundle warning remains.
- 142 existing/updated adaptive/API tests passed, plus two new accounting tests (144 total). Coverage includes all four financial refusals, missing pricing, settlement alerts/outages, failed ledger INSERT, duplicate requests and eligibility refusals.
- Two O-sidecar regression tests passed.
- Isolated PostgreSQL service-role exercise passed: zero budget/attempt references still create a ledger row, settle actual token usage at frozen rates, preserve model provenance, and deny authenticated ledger access.
- Real React browser + isolated PostgreSQL rehearsal passed: three simulated usage errors preserve the composer and exact text, leave the round at one, and do not open review; a subsequent successful retry can be corrected, confirmed through the real save RPC and reloaded read-only. Synthetic Auth/provider transport only.
- No paid provider calls, production database/configuration changes or historical usage resets.

## Reproduction

```sh
npm test
npm run build
S10_PGLITE_MODULE=/tmp/intake-advisory-validation/node_modules/@electric-sql/pglite/dist/index.js node --test tests/session-ai/usage-observation.test.mjs
S10_PGLITE_MODULE=/tmp/intake-advisory-validation/node_modules/@electric-sql/pglite/dist/index.js S10_PLAYWRIGHT_MODULE=/tmp/intake-advisory-validation/node_modules/playwright/index.mjs S10_CHROMIUM_EXECUTABLE=/tmp/intake-advisory-chrome/chromium node tests/session-ai/usage-paused.browser.mjs
```
