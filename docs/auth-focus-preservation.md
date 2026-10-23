# Preserve drafts when returning to the workspace

Supabase can emit `SIGNED_IN` for the already signed-in account when a tab becomes visible. Previously the teacher auth subscriber set the top-level loading flag on every event. That removed the dashboard subtree, destroying the Add project dialog and its unsaved values.

`useStaffSession` shows blocking loading only on initial restoration or an account change. Same-account events still recheck server permissions in the background. Successful checks update changed permissions; a revoked teacher or a required password change still leaves the workspace. Transient background failures preserve mounted forms, while RLS/API authorization remains authoritative. Generation checks reject outdated responses after sign-out or account changes, including a late initial getSession response. RPC work remains outside the Auth callback lock.

Student project context is loaded by Auth user ID rather than Session object identity. Token refresh and repeated sign-in events do not reload it. Context is gated to its owner; account changes clear it and invalidate old requests. Live Session availability continues to refresh on visible-tab return and its existing timer, without clearing drafts.

## Validation

- `npm test` (229 tests) and `npm run build`.
- `S10_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs S10_CHROMIUM_EXECUTABLE=/absolute/path/to/chromium node tests/auth/focus-browser.mjs`.

The browser test uses real React, the actual ProjectManager/Add project dialog, StudentAccess and the staff hook with synthetic Auth/RPC transport. It checks exact input DOM preservation, unsaved values, same-account SIGNED_IN and TOKEN_REFRESHED, background failure, account changes, sign-out, stale responses and permission revocation. It performs no production calls or writes. Manual acceptance: open Add project or an unfinished student response, type without saving, switch windows/screens and return; the form and input should remain. Then sign out to confirm the workspace closes.
