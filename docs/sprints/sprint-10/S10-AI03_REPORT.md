# S10-AI03 — Configured primary model, opaque provider labels

15 October 2026. Final PR #76 policy, approved by Joseph after reviewing the
limitations of the initial AI02 exact-alias repair. Supersedes AI02's whitelist.
No production SQL/configuration, paid calls, merge or deployment in this update.

## Identity and accounting rule

The subject model is **the provider + model configured on the server and sent in
the provider request**. It is not inferred from a response. Usage reservation
freezes this identity, pricing version, input/output rates and ceilings before
provider access. Settlement uses those frozen rates and validated token counts.

The returned model field is optional opaque provenance only. Dates, aliases,
suffixes, unrelated labels, missing values and non-string fields do not affect
price lookup, settlement or access. There is no regex, prefix normalization,
model-family inference, special snapshot registry or accepted-model whitelist.
String labels are bounded to 200 Unicode code points for audit; non-string values
are represented as null. This works for arbitrary model names on any already
integrated provider. A new provider still needs a transport/usage adapter; it does
not need a returned-model-name parser.

Examples (valid in-ceiling token counts in each case):

| Configured request identity | Returned model label | Result |
|---|---|---|
| openai / gpt-5-mini | gpt-5-mini-2025-08-07 | Configured-rate estimate |
| openai / gpt-5-mini | a future version or unrelated label | Same configured-rate basis |
| openai / any supported requested model | absent / non-string | Same configured-rate basis |
| deepseek / deepseek-chat | any deployment/release label | Configured DeepSeek rate basis |

API/manifest `model` now identifies the configured primary model; `reportedModel`
retains provider provenance separately. Manifest `costBasis=configured_model_rates`
makes the estimate's meaning explicit. The client debug export records both.
We do not certify that a different returned name is the same executed model or has
the same provider price. These figures are configured-rate token estimates, not a
provider invoice. Pricing updates/bill reconciliation are independent of the
student conversation and cannot be solved by parsing arbitrary label strings.

## Preserved boundaries

- Current pricing JSON is still required and must match the trusted configured
  request model. Return labels do not participate in this lookup.
- Existing identity/roster/Session/method/window and single-reporting gates remain.
  Attempts, retry counts, global budget and provision-before-call remain intact.
- Missing/invalid token usage retains the full provision. Input/output over the
  reserved ceiling still creates an alert and pauses calls. Unknown labels alone
  never create an alert. Replay settlement keeps any actual existing alert.
- The API's immediate stop on settlement alerts now concerns usage bounds, rather
  than model names. AI02's direct manual review on usage-control errors and
  preserved-answer confirmation behavior remain unchanged.

## SQL and recovery

**Use the new self-contained migration:**
`supabase/migrations/20261015_sprint10_ai03_primary_model.sql`.
It applies directly after deployed AI01, whether or not the initial AI02 candidate
was applied manually. It adds audit columns if needed, replaces settlement and
accepts prompt v1.3.1 in the existing save contract. It introduces service-only
`reconcile_session_intake_ai_usage` and removes the unreleased alias-specific
helpers if present. No existing ledger row, price, budget or attempt count is
changed by this migration. Applied AI01 SQL and the previously shared AI02 file
are untouched. Do not apply AI02 after AI03: the final definitions must be AI03.
Normal migration runners may apply them in order; manual release needs only AI03.

The S5 operator script remains separately reviewed:
`supabase/operations/20261015_s5_alias_reconciliation.sql`.
Its read-only SELECT and exact incident predicates are unchanged. Its transaction
now invokes the primary-model usage reconciler, recording evidence and the
reported label without imposing any model-name equivalence rule. Stored token
counts must exactly match reviewed evidence and fit the original ceilings. This
cannot forgive unknown/missing or over-ceiling usage. Admin/service-only access,
Block/row locks, idempotency and audit history remain. No bulk alert clearing.

Historical name-only alerts are NOT automatically cleared by migration. For this
S5 incident the expected configured-rate estimate remains USD 0.00492425 versus
USD 0.01231775 provision; attempts/original provision stay recorded. Other alerts
or unconfirmed usage are not rewritten. Teacher aggregates reveal any remaining
pause or retained spending after the targeted correction.

## Focused evidence

- Production build PASS; existing chunk-size warning remains.
- Intake/API suite **140/140 PASS**. Real-handler checks exercise configured primary
  identity, unrelated/missing/non-string/Unicode returned labels, opaque-label
  forwarding, estimate basis and usage-alert no-retry behavior. Network stubbed.
- Actual isolated PostgreSQL contracts PASS: recreate AI01's old name-only alert
  and missing-label unresolved row; apply/reapply AI03 directly; audited/idempotent
  correction and S5 operator script; exact/unknown/future/unrelated/empty/missing/
  Unicode labels; another configured model and DeepSeek; unknown-usage provision;
  over-ceiling pause; attempt/history retention; anonymous/teacher denial. Also
  apply the earlier AI02 candidate then upgrade to AI03 to verify compatibility.
  Existing AI01 method/budget contract exercise passes. Sequential synthetic SQL,
  not hosted Auth or multi-connection stress.
- Chromium actual React + isolated AI03 SQL / synthetic Auth/API denials PASS:
  pricing/limit/reconciliation failure → immediate manual review, preserved exact
  answer and no duplicate question/call; manual edits → SQL save → reload history.
  No outbound provider call or live quality evaluation.

Reproduction follows tests/session-ai/README.md. Optional PGlite/Playwright live
outside app dependencies; five-level teaching dataset unchanged. The initial
AI02 report is historical and must not be read as the final name-gating policy.

## Release sequence

1. Review PR #76; apply AI03 once to shared gwihaizxivclamzehupk. If AI02 was already
   applied, no rollback is needed; AI03 supersedes it. Existing pricing JSON stays.
2. Review the S5 operator SELECT against the debug; execute the narrowly scoped
   correction only when exactly one candidate matches. Otherwise stop and inspect.
3. Merge/deploy the matching API/frontend after approval. A narrow hosted test can
   then verify next-turn continuation and teacher estimate/attempt readback within
   Joseph's configured limits. Live AI quality/safety remains separate.

Keep audit columns/records on rollback. Restoring old settlement reintroduces
false name alerts; restoring an old save RPC while v1.3.1 clients are active breaks
confirmation. Prefer a reviewed forward correction, never reset/delete usage.
