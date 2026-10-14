# S10-AI02 — Model identity and interrupted Intake recovery

15 October 2026. Implemented review candidate from main
28069044f451901f96b90187ca60aa2affc39c6e (PR #75). No production writes, model
requests, merge or deployment performed by this repair.

## Observed incident

Joseph's S5 debug showed a valid provider response for configured gpt-5-mini,
reported gpt-5-mini-2025-08-07, with 1737 input and 2245 output tokens. AI01's
exact-string comparison misclassified this documented alias/snapshot pair as
unexpected. The full USD 0.01231775 provision was retained and the Block paused;
the next request returned usage_limit. The configured-rate estimate is
USD 0.00492425; USD 0.00739350 can be released after reviewing the ledger match.
These are token-based estimates, not a provider invoice.

The generic client catch appended another question despite a persistent usage
failure. The latest student reply remained in the transcript but was not extracted.

## Repair

- Settlement accepts exact model identity plus one explicit OpenAI-only mapping:
  gpt-5-mini → gpt-5-mini-2025-08-07. No prefix/date wildcard, different provider,
  reverse alias match or unknown future snapshot. Reference inspected during this
  incident: https://developers.openai.com/api/docs/models/gpt-5-mini (Snapshots).
  This does not force a model change or alter prices. Future mappings need review;
  model lifecycle/upgrade evaluation remains separate.
- Add reported_model for future settlements and reconciled_at/reconciliation_note
  for manual corrections. Preserve configured model, original provision, tokens,
  attempts and history. Unknown usage retains provision; wrong models and usage
  above provision still pause new Block calls. Repeated finish results expose the
  existing reconciliation flag consistently.
- API stops on an identity/usage reconciliation alert immediately, with no retry
  or untrusted model reply. Missing pricing and quota denial remain fail-closed.
- Client usage-control errors preserve the full conversation, append a proper
  review transition and go directly to manual confirmation. No repeated question,
  extra provider attempt or invented extraction. The latest reply is explicitly
  described as not automatically captured; the student reviews/edits fields.
  Prior successful extraction stays available. Manual confirmation uses the same
  validation and existing provider-independent save contract.
- Prompt v1.3.1 adds one narrow instruction: ask how existing work can be shown;
  do not assign immediate repository pushes/new work during the check-in. The
  save RPC accepts v1.3.1 alongside existing versions, with all existing identity,
  window, method, single-reporting and anonymous-denial gates preserved. No live
  pedagogical/refusal acceptance is claimed from this wording change.

## Database and incident correction

New migration: supabase/migrations/20261015_sprint10_ai02_model_identity.sql.
Applied migrations are untouched; schema.sql synchronized. Migration adds three
private-ledger columns and replaces the settlement/save definitions. It introduces
an identity helper and service_role-only reconcile_session_intake_ai_alias RPC.
Anonymous/authenticated users, including teachers, cannot execute reconciliation.
A database operator may run it through SQL Editor after reviewing provider evidence.
It accepts only the documented alias pair and stored token counts that exactly
match the supplied evidence and fit the original provision. Genuine mismatches,
missing usage, over-ceiling counts and non-alert rows cannot be forgiven. Repeating
an already completed correction is idempotent. No budget or attempt reset.

Separate operator script (NOT a migration):
supabase/operations/20261015_s5_alias_reconciliation.sql.
The first SELECT is read-only. Review its candidate against the uploaded debug;
the subsequent transaction is a real ledger correction. It requires exactly one
2026/2B2/S5 reservation in the observed UTC interval with exact model, pricing
version, tokens, rates and original provision. Zero/multiple matches stop. It
records the debug filename/event/provider request ID as evidence, without student
answers. Never broaden predicates or clear all alerts to make it run. Other
unresolved attempts/alerts remain untouched; the Block may still be paused if
another independent alert exists. Actual production ledger match is not yet read.

## Focused evidence

- Production build PASS (existing chunk warning).
- Intake/API suite 139/139 PASS: one new real-handler check verifies settlement
  alerts stop before retry/response use. All network/provider access is stubbed.
- Actual isolated PostgreSQL contracts PASS: recreate the old false alert before
  applying AI02, apply/reapply migration, approved alias/exact identity, reject
  unknown snapshots/cross-provider/reverse aliases, explicit reviewed correction,
  preserved provision/attempts, idempotent operator script execution, true alerts,
  missing and over-ceiling usage, replay flag and anonymous/teacher permissions.
  Existing AI01 method/budget contract exercise also passes. Sequential synthetic
  Auth/SQL evidence, not hosted multi-connection stress or production acceptance.
- Chromium with actual React components, synthetic API denials and actual isolated
  SQL PASS: missing pricing / usage limit / reconciliation each immediately shows
  review, retains exact reply and makes one request; no composer/repeated question
  or automatic extraction. Manual correction → SQL confirmation → reload read-only
  succeeds, with the original answer and final review transition stored. Zero
  outbound provider calls. This does not establish hosted authentication acceptance.

Reproduce from repository root:

```sh
npm run build
npm test
# Optional dependencies outside the application:
npm install --prefix /tmp/intake-validation @electric-sql/pglite playwright --no-audit --no-fund
S10_PGLITE_MODULE=/tmp/intake-validation/node_modules/@electric-sql/pglite/dist/index.js \
  node --test tests/session-ai/database.test.mjs tests/session-ai/model-identity.test.mjs
S10_PGLITE_MODULE=/tmp/intake-validation/node_modules/@electric-sql/pglite/dist/index.js \
S10_PLAYWRIGHT_MODULE=/tmp/intake-validation/node_modules/playwright/index.mjs \
S10_CHROMIUM_EXECUTABLE=/path/to/chromium \
  node tests/session-ai/usage-paused.browser.mjs
```

## Release/recovery

1. Review the focused PR and migration. AI01/PR #74 migration is a prerequisite.
2. Joseph applies the new AI02 migration once to shared gwihaizxivclamzehupk;
   this does not automatically edit any historical ledger row or enable AI.
3. Review the separate S5 operator SELECT. Only if its one row matches the debug,
   run its correction transaction; inspect teacher aggregates afterwards. No new
   live request is needed to perform that correction.
4. Merge/deploy the matching API/frontend after release approval; smoke one
   preserved-answer/manual-confirmation path before resuming the already scoped
   test. Keep Joseph's existing modes/prices/budgets; no paid calls by this task.

Prefer a forward correction. Keep ledger columns/audit rows on rollback. Reverting
settlement reintroduces alias false alerts; reverting the save RPC's accepted prompt
versions while v1.3.1 clients remain deployed breaks confirmation. Coordinate any
rollback instead of deleting usage or globally clearing reconciliation flags.
