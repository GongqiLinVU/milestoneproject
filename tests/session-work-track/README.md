# Sprint 10 Work Track contract check

This opt-in test executes the actual old and new RPC migrations in an isolated
PGlite PostgreSQL engine. It uses synthetic minimal dependency tables and the
actual Work Track RLS policies, read/save/teacher-read/verification functions.
It does not connect to Supabase or exercise deployed Auth/table policies outside
Work Track. Existing release authorization evidence remains applicable there.

Install the optional test runtime outside the repository, then run:

```sh
npm install --prefix /tmp/s10-validation @electric-sql/pglite --no-audit --no-fund
S10_PGLITE_MODULE=/tmp/s10-validation/node_modules/@electric-sql/pglite/dist/index.js \
  node --test tests/session-work-track/s10-contract.test.mjs
```

The sequential check covers early and late persistence, server-calculated late
completion, early field validation/metric stripping, prior next-action lookup,
teacher read and verification reset, closed/method/S10 write refusal, own-record
isolation within and across Blocks, and anon/non-teacher RPC refusal. Identity is
supplied through synthetic JWT settings; no live login or production acceptance
is claimed. This focused test is opt-in and does not change npm test's Intake suite.

## Compact S1–S5 update

The fixture now applies the new S10-01b migration after the two S10-01 scripts.
Run the SQL contract command above plus these dependency-free helper checks:

```sh
./node_modules/.bin/tsc --outDir .test-work-track --target ES2022 \
  --module nodenext --moduleResolution nodenext --skipLibCheck src/workTrackForm.ts
node --test tests/session-work-track/compact-form.test.mjs
```

The compact checks cover metadata round-trip, legacy payload compatibility,
invalid/duplicate work choices, missing help detail, explicit responsibility
carry-forward without copying current progress, and old-backend capability.
