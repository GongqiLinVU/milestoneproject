# S10-AI01 — Session method overrides and durable AI usage controls

14 October 2026. Implemented review candidate; not merged, applied or deployed.
Latest main fetched before implementation and rechecked before publication:
6b2009c4c2941cc9c93545b2d3ec92b951972e76 (PR #73).
Joseph authorized this next increment. No production data/configuration writes,
provider calls, merge or deployment were performed.

## Baseline acceptance

Sprint 9 first production release was delivered (PRs #68/#69); the root
FIRST_PRODUCTION_RELEASE_REPORT.md supersedes pre-release historical statuses.
S10-01 and compact S10-01b are released. Joseph confirmed the compact migration,
manual UI usability and production save → reload → retained record → teacher read
on 14 October. Do not describe that chain as still pending. The confirmation did
not name Session numbers or establish every late/Form path, cross-Block continuity,
account recovery or live AI quality acceptance.

## Usable behavior

- Block method stays the default. A nullable Session override selects Existing
  classroom workflow, Guided Form or AI Conversation; null restores inheritance.
  The teacher sees the effective method and its source. A form-default Block can
  use AI for one manually chosen Monday Session and inherit the form for the next.
  Monday is not a recurring scheduling rule.
- Selecting a method does not open submissions or make a provider request.
  Work Track / Intake windows and Check-in attendance stay separate. Student
  routing, read/open metadata, all save contracts and AI authorization use the
  trusted effective method, across both existing student dashboard variants.
- Work Track remains an updateable progress record; Guided Form and AI share the
  separately confirmed Intake family. Existing alternate-family records become
  history/completion rather than a second reporting duty. Same-student/Session
  advisory locks protect both save families against concurrent duplicate reports.
  Switching methods never converts, deletes or invents history. S10 is unchanged.
- Quota/configuration denial preserves the conversation and offers Finish without
  AI. The browser pauses further AI attempts for that conversation until reload;
  server limits survive reload. Manual review/attestation still completes a real
  Intake without a model. The fallback review replaces the final assistant turn,
  preserving the existing alternating source-conversation contract.

## Paid-call boundary and cost

The new private ledger reserves spending **before every provider attempt**, including
the existing retry. A Block row lock serializes budget reservations; a unique
user/request/attempt key refuses replay. Activated identity, current active roster
Block, S1–S9, effective AI method, open Intake and no existing progress report are
rechecked inside the reservation RPC. Zero Block budget or zero student/Session
attempt limit refuses calls. Limits are cumulative, not reset by browser reload,
Session reopening or method changes. Teacher controls save limits with readback.

Server-only pricing must match the requested model and include a pricing version.
Missing/invalid pricing fails closed. Each reservation covers input UTF-8 bytes
of instructions/input/schema plus an 8192-token allowance, and the existing output
ceiling, priced at the configured full input/output rates. Input bounds are
conservative provisions, not measured tokens. Actual reported integer token counts
within those ceilings and an exact reported-model match produce a token-based USD
estimate; unused provision is released. Cached-token discounts are not estimated.
This is configured token cost, not a provider invoice or accounting for other fees.

Missing usage, timeouts or incomplete responses retain the full provision.
Unexpected models or usage exceeding provision also flag reconciliation and pause
new Block calls. A failed settlement leaves the debit in place and stops retries.
Teachers see attempts, token-based estimate, budget provision and unresolved count.
Only service_role can reserve/settle/read individual ledger rows; the teacher RPC
returns Block aggregates. No prompts, transcripts, API keys or student answers are
stored in this ledger. Manual reconciliation requires separately reviewed provider
evidence and authorized operations; no budget-reset/reconciliation UI is included.

The existing positively identified local transport mock bypasses reservations only
because it makes zero provider calls. Production/Preview cannot use that bypass.

## Focused evidence

- Production build PASS; existing chunk-size warning remains.
- Existing Intake/API suite **138/138 PASS** (134 reused checks plus four focused
  override/quota/pricing checks). Real handler runs against network/RPC stubs;
  quota rejection stops retries and subsequent requests before provider access.
- Actual PostgreSQL migration/RPC execution in isolated PGlite: **PASS**. Mixed
  methods, same-family persistence, alternate-family duplicate refusal, history
  after restore, closed/missing schedule refusal, zero limits, attempt/replay caps,
  global budget, unknown-cost retention, known-cost settlement, model mismatch
  pause, cross-Block access and service-only/anonymous/teacher permissions checked.
  This is a sequential synthetic contract exercise, not multi-connection stress
  or hosted PostgREST/Auth acceptance. Row/advisory locking was reviewed separately.
- Chromium with actual components and SQL RPCs behind a synthetic transport bridge:
  **PASS**. Teacher override + persisted budget readback; one AI Session and next
  inherited classroom Session; quota refusal → preserved answers → manual review
  → actual SQL confirmation; restore default → confirmed history, no second entry.
  Browser AI response is a quota-denial stub; no outbound model request. Teacher
  controls inspected visually. This is not a live login or production smoke.
- Existing prompt prohibits grading, authorship/contribution verdicts and invented
  evidence; unrelated/unsafe/private-data requests now explicitly require brief
  refusal/redirection. Prompt presence and prior mocked checks do not establish
  live refusal reliability, pedagogy or institutional readiness.

Opt-in SQL instructions: tests/session-ai/README.md. No dependency added to the
application or expanded acceptance taxonomy/dataset. Five primary dataset levels
remain unchanged.

## Review and deployment dependency

**New migration:** supabase/migrations/20261014_sprint10_ai01_session_controls.sql.
Applied migrations are unchanged; schema.sql includes the new definitions.
Prerequisites are the already-applied Sprint 8/9 Intake contracts and all three
S10-01/01b Work Track scripts. The migration adds Session override, zero-default
Block limits, private ledger and affected RPC replacements with explicit grants.
It does not enable AI, change existing methods/windows or rewrite student records.

After separate release approval, apply this new migration before the matching API
and frontend. Preview and Production share gwihaizxivclamzehupk. During transition,
the old deployed API does not enforce this ledger; applying SQL alone is not a
paid-call safeguard. Do not start an observation until the matching API is deployed
and its fail-closed boundary checked. Coordinate any temporary mode change with
Joseph; never assume current production modes are off.

Server configuration required before a separately approved live run:

```text
OPENAI_INTAKE_MODEL=<exact pinned provider model identifier>
INTAKE_USAGE_PRICING_JSON=<JSON pricing object>
```

The pricing JSON maps `openai` and/or `deepseek` to
`{model, version, inputUsdPerMillion, outputUsdPerMillion}`. Verify current official
rates and exact returned model before setting positive limits; no production rates
are invented here. Model aliases that return another identifier pause calls and
require reviewed configuration. DeepSeek uses DEEPSEEK_MODEL. Credentials
remain server-only. Do not put pricing or credentials in VITE variables.

Before observation, Joseph approves model, test student/Session scope, maximum
provider attempts and hard Block budget; institutional readiness remains required
for classroom AI. Focused hosted checks should cover one overridden early Session
and one inherited later Session, history after restore, and zero-limit denial with
non-AI completion. Live quality/safety remains a separate bounded increment using
the existing five-level dataset; do not equate successful switching with acceptance.

Recovery: preserve ledger and historical records. Reverting to the old API removes
durable paid-call enforcement; any AI-disable/configuration operation must be
explicitly coordinated before such a rollback. Do not drop/reset usage or revert
to RPCs that re-enable duplicate reporting without a reviewed recovery plan.

## Remaining scope

2B2 testing continues. Synthetic 2B3 CHECK/setup and continuing-account rehearsal,
real November 2B4 timetable/roster and activation/recovery remain S10-02. Joseph
supplies real details or creates 2B4 himself. Cross-schema S1→S2 carryover is not
unified by this increment. Non-AI teaching does not wait for live AI acceptance.

## Teacher layout follow-up — S10-UI01

Joseph approved a focused Session workspace on 14 October. PR #74 now includes
Block-global defaults, current-Session focus/navigation, compact all-Session
comparison with bulk expansion and three functional control groups. Native
submission-window and method controls reuse the existing handlers/contracts.
No extra SQL. Build and focused Chromium smoke PASS. Details and limitations:
[S10-UI01_REPORT.md](S10-UI01_REPORT.md). Candidate remains unmerged/unapplied.
