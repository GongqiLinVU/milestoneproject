# Sprint 8 Benchmark — De-identified Case Draft (Phase A)

Version: `intake-benchmark-cases.v1-draft` · 30 September 2026
Phase: Sprint 8 Closeout Phase A · Prepared by Claude for Joseph / ChatGPT review
Status: DRAFT. Contains one **real** de-identified replay case and a documented
data gap for a dynamic trajectory. No runner, no production changes, no paid calls.

Scoring anchors and formulas: see `BENCHMARK_STANDARD_v1.md`.

---

## 1. Trajectory selection outcome (Handoff §4)

**Requested:** the longest consecutive same-student / same-project trajectory,
preferably 3–4 Sessions.

**Found:** no real, turn-by-turn, consecutive same-student Intake *conversation*
trajectory exists locally. Evidence:

| Candidate source | What it actually is | Usable as a real trajectory? |
|---|---|---|
| `docs/analysis/2026-2B1/observations/2026-08-13-intake-baseline.md` | Aggregated pre-Intake **form** analytics (154 records, 14 active students), Finding-level, not turn-by-turn conversations | No — no conversational transcripts |
| `tests/ai-session-intake/adaptive/recorded-cases-v2.json` → `s9-continuing-chat-provider-fallback` | **One real** de-identified single-Session (S9) chat, reconstructed from `session-intake-debug-S9 (4).json` | Partial — one Session only, not a 3–4 Session trajectory |
| `recorded-cases-v2.json` → other 3 cases | Explicitly **synthetic** scenarios (quick close, teacher-help, budget exhaustion) | No — synthetic, single-Session |
| `docs/AI_Intake_Benchmark_v0.5_Review_Pack.md` T1/T2/T3 | Explicitly **synthetic** four-Session trajectories | No — synthetic (design assets, not real history) |

**Decision (proposed):** use the single real S9 record as the **replay (R)**
anchor case now, and treat the synthetic v0.5 T1/T2/T3 trajectories as reviewed
**dynamic-branch** assets pending Joseph's approval. Do **not** fabricate a real
multi-Session trajectory. The missing-input inventory (§4) records exactly what a
real trajectory would require.

---

## 2. Real replay case R-S9 (de-identified)

Source: `tests/ai-session-intake/adaptive/recorded-cases-v2.json`,
id `s9-continuing-chat-provider-fallback`. Provenance recorded there: a 3-turn
continuing S9 conversation whose 3rd-turn provider call failed
(`provider_incomplete`) and fell back to the deterministic question; the earlier
captured evidence survives into the fallback snapshot.

Mode: **fixed-transcript replay** → scores **R** and state checks only. C and S
are **N/A** here (the candidate did not choose its own questions; §6 of the
standard).

### 2.1 Disclosed facts (recording denominator d = 4)

| Fact ID | Source turn | Disclosed fact | Expected recorded state | Essential to retain? |
|---|---|---|---|---|
| R-S9-F1 | student turn 1 | Spinner added, commit abc123 | `claim` = student_claim, progressKind completed | Yes |
| R-S9-F2 | student turn 1 | Executed manual slow-network load: spinner appeared until cards loaded | `evidence` available, type live_demonstration, method "manual browser test with a slow connection", observed "spinner appeared until cards loaded" | Yes |
| R-S9-F3 | student turn 1 | The **API-error path** specifically has not been tested yet | testing not executed **for the API-error path only**; must stay distinct from the executed F-R2 observation | Yes (critical: F-R2 must not be erased; the error path must not be shown as tested) |
| R-S9-F4 | student turn 3 | Chose option A, still debugging the API error (blocked) | `blocker`, fixture uses state `student_claim` with progressKind `attempted_failed` | Yes |

Fixture-verified labels (`recorded-cases-v2.json`,
`s9-continuing-chat-provider-fallback`): F-R2 is
`{field:"evidence", state:"available", evidenceType:"live_demonstration",
method:"manual browser test with a slow connection",
observedResult:"spinner appeared until cards loaded"}`; F-R4 is
`{field:"blocker", state:"student_claim", progressKind:"attempted_failed"}`. There
is **no** global "not executed" evidence update in the fixture — the untested
API-error path is expressed as the assessment `gap`, not as a testing update that
overwrites the executed observation.

Undisclosed / out of scope (must stay unknown, never fabricated): the API-error
UI screenshot result; any pass/fail of the error path; teammate work.

### 2.2 Per-fact recording scoring table (0/1/2)

| Fact ID | 0 anchor | 1 anchor | 2 anchor | Expected on faithful candidate |
|---|---|---|---|---|
| R-S9-F1 | claim dropped, or ownership/commit wrong | commit reference ambiguous or omitted | ownership + commit abc123 + completed status faithful | 2 |
| R-S9-F2 | evidence fabricated or prose treated as proof | evidence noted but method/observation missing | availability + method + observed result linked (the executed slow-network observation preserved) | 2 |
| R-S9-F3 | executed F-R2 observation erased, or the API-error path shown as tested (critical) | the API-error path's untested state left ambiguous | the API-error path explicitly untested, kept distinct from F-R2 and preserved into the fallback snapshot | 2 |
| R-S9-F4 | blocker lost or reassigned to a teammate | blocker vague | blocker retained (still debugging, chose A) | 2 |

`R_S9 = 100 × Σ r / (2 × 4)`. On a faithful candidate = `100 × 8/8 = 100%`.

Note: no anchor requires a "since last Session" phrasing. Although the fixture's
turn-1 text happens to open with "Since the last session", that temporal phrasing
is **not** an essential recorded fact; scoring depends on ownership, evidence,
the scoped untested path and the blocker, not on how the student framed the time
window.

State check: the provider-failure fallback (turn 3) must still yield a valid
**pending** snapshot that preserves R-S9-F1..F4 (matches
`expected.finalRoute = provider_fallback_continue`,
`finalExtractionPending = true`). A pending snapshot is an intermediate state, not
a final confirmed record (see §6 of the standard and §4 of S8-B1_REPORT.md).

Source limitation (explicit): this case is a **de-identified reproduction**
reconstructed from `session-intake-debug-S9 (4).json`. Per its provenance and the
adaptive README, the S3-style source-error candidate family was reconstructed
because an actual provider response was absent from the exported Debug trace. The
turn-3 provider response here is therefore a recorded *failure* (`provider_incomplete`),
not a redacted successful extraction; R for turn 3 is assessed on the fallback
snapshot only.

### 2.3 Critical-error watch for R-S9

- #1 fabricated completion — must NOT record the API-error path as handled/tested.
- #2 plan-as-execution — the planned demo "next session" must NOT be recorded as executed; the executed slow-network observation (F-R2) must NOT be relabelled as covering the untested API-error path.
- #5 lost correction — none present in this record; if a later turn corrects F1, it must be preserved.

---

## 3. Dynamic-branch assets (pending Joseph review — NOT yet a benchmark)

The v0.5 synthetic trajectories (T1 Booking portal, T2 Campus wayfinding,
T3 Sensor display; four Sessions each) are available as **reviewed dynamic-branch
candidates** for scoring **C** and **S**, once Joseph approves them as collection
benchmarks (Handoff §4.6). Their per-Session essential-fact sets and forbidden
assertions are already drafted in `docs/AI_Intake_Benchmark_v0.5_Review_Pack.md`
and audited in `docs/BENCHMARK_V05_REVIEW_CLAUDE.md`. They are **synthetic** and
must never be presented as real classroom history.

Illustrative essential-fact freeze for one dynamic Session (T1-S3, mixed
integration) — **draft `m_i` = 5**:

| Fact ID | Essential collection target | 2 anchor | Expected state |
|---|---|---|---|
| T1S3-C1 | Was live integration attempted? | explicitly attempted, not mock | disclosed |
| T1S3-C2 | Normal path outcome | normal booking saved + confirmation (claim) | disclosed |
| T1S3-C3 | Changed-slot outcome | changed-slot failed (stale confirmation) | disclosed |
| T1S3-C4 | Root cause status | cause unresolved (UI vs API) | disclosed as unknown |
| T1S3-C5 | Evidence route + next step | log/demo route; joint retest next | disclosed |

`C_T1S3 = 100 × Σ e / (2 × 5)`. A candidate that never surfaces the changed-slot
failure (C3) scores 0 on C3 → collection gap → Session cannot succeed, even if the
record of what was said is faithful.

---

## 4. Missing-input inventory (what a real trajectory needs)

To build a **real** 3–4 Session collection benchmark (not replay-only), the
following are required and currently absent locally:

1. Consecutive same-student, same-project Intake **conversations** across 3–4
   Sessions, exported with full ordered source conversation, extracted record,
   confirmation/corrections and final student record (the save-path RPC output).
2. Teacher-action context available at each Session (for continuity/authority
   checks), de-identified.
3. Confirmation that these are from the **mock pilot (2B2)** or otherwise
   consented, not real graded classroom data (privacy boundary, Handoff §2).
4. For dynamic C/S: Joseph's review/approval of the answer-bank and semantic-hit
   adjudication procedure (`BENCHMARK_STANDARD_v1.md` §6, §10).

Until (1)–(3) exist, the benchmark can measure **R** on the single real S9 record
and **C/S** only on reviewed synthetic branches. This limitation must be stated in
every result; synthetic success is not classroom effectiveness.

---

## 5. Replay vs. dynamic — explicit separation in this draft

| Case | Mode | Scores | Real or synthetic |
|---|---|---|---|
| R-S9 | fixed replay | R (+ state checks); C/S N/A | Real (de-identified) |
| T1/T2/T3 Sessions | dynamic branch (pending approval) | C, S (+ R where disclosed) | Synthetic |

No dynamic case is treated as a real trajectory; no replay case is used to claim
collection success.
