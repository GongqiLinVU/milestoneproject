# S10-AI01 focused contract check

The fixture applies actual Intake validators and the new Session/usage migration
on top of the isolated Work Track fixture. Synthetic Auth settings, roster tables
and existing teacher management policy equivalents replace hosted dependencies.
No Supabase URL, provider key or production data is used.

```sh
npm run test:build
npm install --prefix /tmp/s10-validation @electric-sql/pglite --no-audit --no-fund
S10_PGLITE_MODULE=/tmp/s10-validation/node_modules/@electric-sql/pglite/dist/index.js \
  node --test tests/session-ai/database.test.mjs
```

One sequential exercise covers mixed method resolution, read/history and save
contracts, duplicate reporting, window/identity gates, durable reservation/replay/
attempt/spend boundaries, unknown cost, settlement and grants. It is not a live
multi-connection contention test. The row/advisory locks are reviewed in SQL.
`npm test` separately covers the real endpoint with stubbed providers/RPCs.
See docs/sprints/sprint-10/S10-AI01_REPORT.md for browser scope and release needs.

## AI03 primary-model / paused-review repair

Use the same PGlite setup with `tests/session-ai/model-identity.test.mjs`. It
recreates AI01's false alert before applying AI03 directly and checks upgrade from
the earlier AI02 candidate; old applied SQL is untouched.
The opt-in `usage-paused.browser.mjs` runs real components and isolated SQL behind
synthetic Auth/API transport. Optional Playwright/Chromium setup and focused scope:
`docs/sprints/sprint-10/S10-AI03_REPORT.md`. No production/provider access required.
