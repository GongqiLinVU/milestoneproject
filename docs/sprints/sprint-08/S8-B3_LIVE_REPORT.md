# S8-B3 Live Report — single live T1 baseline (executed)

Version: v2.0 · 30 September 2026 · Prepared by Claude for Joseph / ChatGPT review
Scope: Option 1 executed — created an isolated LOCAL T1 "Booking portal" fixture,
then ran the single authorized live baseline (`gpt-5-mini`, hard cap US$0.20).
No production changes, no push/merge/deploy/migration.

> SYNTHETIC WARNING: T1 is synthetic. This is a single non-deterministic live run,
> not classroom evidence. Live results are reported separately from offline stub
> results and **not** mixed.

---

## 1. Outcome at a glance

- Live run **executed once**. Model: `gpt-5-mini`.
- Cost: **US$0.1523 of the US$0.20 cap** (28 provider calls, 42,705 input +
  70,825 output tokens). Cap **not** reached; not increased.
- All four Sessions ran. **Per-Session** C = 100/80/100/100 %, R = 80/75/100/80 %.
  Two Sessions returned `provider_incomplete` (a known gpt-5-mini reasoning-token
  behaviour). **S = 0/4** because persistence failed and several R items are below
  2 — reported below, **not** hidden.
- **Run label: `independent_session_diagnostics`, NOT a longitudinal baseline** —
  persistence failed, so candidate output was not carried across Sessions. This is
  the required labelling, not a silent substitution of gold history.
- Full JSON: `tests/ai-session-intake/replay/out/dynamic-t1-live.json`.

## 2. Isolated LOCAL fixture (item 1)

`scripts/seed-t1-benchmark-fixture.mjs` (idempotent, local-only; refuses any
non-local URL). It **adds**, without repurposing or overwriting existing data:
- an isolated mock student `t1bench01` (`t1bench01@student.vu.edu.au`) on a **new
  team_number 4** (distinct from the seed's teams 1–3);
- `student_roster.project_name = "Booking portal"` (the authoritative field the
  endpoint reads);
- an activated `student_accounts` link and a `teams` row for team 4;
- it reuses the block's existing Intake-open Sessions S1–S4 (no duplicate
  sessions), resolving their UUIDs.

No migration, no schema change, no production edit.

## 3. Verified resolved context (item 2)

Verified the context the endpoint **actually** resolves (zero-cost probe: a
mode:"turn" request with a deliberately invalid conversation returns 400 at
`conversation_validation` **after** context resolution and **before** any provider
call):
- All four Sessions resolved cleanly (400 `conversation_validation`, **no** 403
  context/eligibility error) → the student is enrolled, activated, 2B2-eligible,
  Sessions Intake-open and unconfirmed.
- DB-resolved scope: `team_number 4, project_name "Booking portal"`, **0** existing
  intake rows → matches T1 and is isolated with **no unrelated student history**.
- **Missing vs. contradictory context:** the earlier report worried
  `project_name` might be unpopulated (missing). It is now **populated and
  matches** T1 (not contradictory). 
- **Represented limitation (reported, not worked around):** the endpoint's
  `sessionContext.scope` carries `academicYear/blockId/teamNumber/projectName` plus
  the Session `curriculum_focus`. It does **not** have fields for the T1 card's
  fine-grained module split (booking UI / API-storage / availability rules) or the
  R1–R4 requirements. So the model receives the project *name* and Session focus,
  not the module decomposition. Per instruction, this is reported as a context
  limitation rather than injected via a benchmark-only production prompt.

## 4. Token, server, and credentials (item 3)

- Started the local API server via `npm run dev:api` (functions on :3010).
- Obtained the mock student bearer **through the fixture's own generated
  credentials** (`live-auth.mjs` signs in `t1bench01` with the anon key). No secret
  was printed, and no credential was requested from Joseph. Session UUIDs were
  resolved from the DB, not supplied by hand.

## 5. Persistence and carryover (item 4) — specific failure reported

The live driver attempted to persist each confirmed Session into the **isolated
student's** history via the real RPC `save_my_session_intake_chat`, called **as
the student** (JWT), then verified the next Session's context.

**Result: persistence failed on all four Sessions**, so nothing was written and
carryover did not occur (`carryoverEvidence` shows `priorPersistedCount: 0` before
S2/S3/S4). The driver therefore labelled the run **independent-Session
diagnostics**, not longitudinal — as required.

**Specific root cause (diagnosed locally, no extra paid calls):** the RPC rejected
`p_student_record` via `validate_session_intake_student_record_v11` with, per
Session:
- S1/S4: "available evidence needs a reference and verification method" +
  "next action, due Session and expected evidence are required";
- S2/S3: "current responsibility must be 2–500 chars", "one or more claims are
  invalid", "evidence references an unknown claim", "next action … required".

This is a **driver/flow gap, not a save-RPC defect**: the turn-only live driver
accumulates the model's per-turn extractions, which were **not schema-complete for
the save path** — no `due_session`, `available_now` evidence without a
verification method, and short responsibility/claim on the two `provider_incomplete`
Sessions. The production UI completes these fields through the confirmation/extract
step that this turn-only driver does not perform. The dry-run save (with complete
answers) **succeeded**, confirming the RPC + carryover path works when the record
is schema-complete; the gap is in what the live turn loop captured.

I did **not** substitute gold history or relabel the run longitudinal.

## 6. Live results (reported separately from offline)

Per-Session (v1.1 attribution: C = elicited in conversation; R over disclosed
facts; a disclosed fact dropped from extraction is an R failure):

| Session | C% | R% | provider | Session success | Note |
|---|---:|---:|---|---|---|
| S1 | 100 | 80 | ok | false | next-step disclosed but not extracted (R) + persistence failed |
| S2 | 80 | 75 | ok | false | one collection gap; partial extraction |
| S3 | 100 | 100 | provider_incomplete | false | fell back; persistence failed |
| S4 | 100 | 80 | provider_incomplete | false | correction elicited; extraction incomplete |

**Aggregate qualification (as instructed):** material scoring items are
**unresolved** — persistence failed on all Sessions and two Sessions hit
`provider_incomplete`. Therefore **no unqualified aggregate is asserted**. For
completeness the JSON records `C_mean=95`, `R_values=[80,75,100,80]`, `S=0/4`, but
these are **qualified** by the persistence failure, the provider incompletes, and
the pending routing adjudications (§7); they must not be read as a clean baseline.

## 7. Retained questions, disclosures, and routing ambiguities (item)

The full trace (every model question, the disclosed student answer, accepted/
rejected fields, per-fact scores and reasons) is in the JSON. A clear routing
match is **not** proof of semantic correctness, so the raw Q&A is retained for
human review. Example (S1) — the real model questions were genuinely
context-aware ("you own the booking UI … booking-flow-v1.pdf … the API response
format …"), confirming the real prompt + T1 context. Routing ambiguities are
flagged `pendingAdjudication` (combined-tie, vague-followup, unmatched) and are
**not** silently scored: S1 logged 1 combined-tie, 1 vague-followup and 4
unmatched (the model's A/B clarification questions did not map cleanly to a
remaining T1 fact — a genuine semantic-routing item for review).

## 8. Cost/cap accounting (enforced across calls + retries + extraction)

- Cap: **US$0.20 (hard)**, not increased. Spend: **US$0.152326**. Calls: 28
  (turn calls incl. the endpoint's internal one-retry; no separate extraction call
  was needed because saves failed at validation before any extract call).
- The cap check runs before every turn and before each persist attempt; a reached
  cap stops the run and reports partial without excluding Sessions to inflate S.
  The cap was not reached this run.

## 9. Deliverables

- `scripts/seed-t1-benchmark-fixture.mjs` — isolated local T1 fixture (idempotent).
- `tests/ai-session-intake/replay/live-auth.mjs` — local sign-in + zero-cost
  context probe (no secrets printed).
- `tests/ai-session-intake/replay/run-live-t1.mjs` — live runner (real endpoint,
  cap enforcement, persistence + carryover verification, C/R/S).
- `tests/ai-session-intake/replay/out/dynamic-t1-live.json` — full live trace,
  resolved context, carryover evidence, per-fact scores, ambiguities, calls, cost,
  persistence diagnosis.
- Offline stub result (`out/dynamic-t1-offline.json`) is unchanged and kept
  separate.

## 10. Findings and next minimal step (no action taken beyond this run)

1. **Persistence needs the confirmation/extract step.** For a longitudinal live
   baseline, the driver must run the endpoint's extract/confirm flow (or fill the
   required record fields) so `student_record` is schema-complete before saving.
   This is a driver change, not a production change.
2. **gpt-5-mini `provider_incomplete` recurred** on 2 of 4 Sessions. The endpoint
   correctly fell back; but for a clean live baseline the output-token cap / model
   choice should be reviewed (already noted in the endpoint code comments).
3. **Semantic routing** produced several `unmatched` logs where the model asked
   A/B clarifications; these are retained for adjudication (routing match ≠
   semantic correctness).

Per the task ("Finish after the run and report"), I stop here. No production
Harness change, push, merge, deployment or migration was made; the isolated
fixture wrote no data into any real or seeded student's history (verified: 0 intake
rows across all students after the run).
