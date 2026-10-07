# S8-A Report — Sprint 8 Closeout Phase A

Version: v1.0 · 30 September 2026 · Prepared by Claude for Joseph / ChatGPT review
Scope: Phase A only (standard + current-state inspection + one de-identified
trajectory draft + this report). No runner, no production changes, no paid model
calls, no push/merge/deploy/migration.

---

## 1. Conclusion and scope

Phase A is complete and ready for review. I produced the draft benchmark standard
(C/R/S), inspected the actual working tree, inventoried available records, drafted
a de-identified case set, and updated the local Sprint 8 handoff — without
implementing a runner, changing production, or making paid calls.

**Key finding:** there is **no real consecutive same-student Intake conversation
trajectory** available locally. Only one real de-identified single-Session
conversation exists (S9 provider-fallback). Therefore Phase B can measure
**Recording (R)** on that real record now, but **Collection (C)** and **Session
success (S)** can currently be exercised only on **reviewed synthetic** branches
(the v0.5 T1/T2/T3 assets), which must never be presented as classroom evidence.

## 2. Actual branch and versions

- Branch: `integration-tests-m4-m10-m14` (not `main`).
- Uncommitted changes present (M) and untracked files (??), including the v0.5
  review pack, my review, the closeout plan, and the integration harness. All
  preserved; Phase A only added new documents.
- Code version constants (verified, `src/intakePolicy.ts`):
  `INTAKE_POLICY_VERSION='adaptive-intake.v1.1.0'`,
  `INTAKE_PROMPT_VERSION='session-intake-ai.v1.3.0'`,
  `MAX_INTAKE_QUESTIONS=8`, `MAX_INTAKE_TURNS=17`.
- Recent history confirms Phases 1/2A/2B merged (PRs #62–#64); Phase 2C harness/
  trace work (PRs #65–#66) present as later commits.

## 3. Delivered files

| File | Purpose |
|---|---|
| `docs/sprints/sprint-08/BENCHMARK_STANDARD_v1.md` | Draft C/R/S standard: formulas, 0/1/2 anchors, critical errors, denominators, turn definitions, replay-vs-dynamic separation, worked examples |
| `docs/sprints/sprint-08/BENCHMARK_CASES_v1_DRAFT.md` | De-identified case draft: real R-S9 replay case with per-fact scoring tables, dynamic-branch assets (pending approval), and the missing-input inventory |
| `docs/sprints/sprint-08/HANDOFF.md` (appended) | New "Sprint 8 closeout direction" section; preserves prior content and unresolved acceptance items |
| `docs/sprints/sprint-08/S8-A_REPORT.md` | This report |

## 4. Commands actually executed and results

- `git branch --show-current` → `integration-tests-m4-m10-m14`.
- `git status --short` → confirmed uncommitted M/untracked ?? files (preserved).
- `git log --oneline -12` → confirmed Phase 1–2C merge history.
- Read-only file reads: `src/intakePolicy.ts`, `EVALUATION_STANDARD.md`,
  `adaptive/README.md`, `recorded-cases-v2.json`, intake-harness `REPORT_01/02.md`,
  2B1 baseline observation, PLAN/HANDOFF.

No build was run (Phase A is documentation-only; per Handoff §6 documentation-only
work does not require a build). No tests, no runner, no model calls.

## 5. Data and scoring sources

- Real de-identified conversation: `recorded-cases-v2.json`
  (`s9-continuing-chat-provider-fallback`), reconstructed from
  `session-intake-debug-S9 (4).json`.
- Aggregated (non-conversational) real data: `2026-08-13-intake-baseline.md`
  (154 pre-Intake form records, 14 active students).
- Synthetic design assets: `AI_Intake_Benchmark_v0.5_Review_Pack.md` (T1/T2/T3)
  and its review `BENCHMARK_V05_REVIEW_CLAUDE.md`.
- Engineering gates reused, not replaced: `EVALUATION_STANDARD.md` (Gate A/B/C).

## 6. Standard disagreements / decisions carried from the v0.5 review

Two items from `BENCHMARK_V05_REVIEW_CLAUDE.md` are folded into the v1 standard
and still need Joseph's confirmation:

- Turn cap uses code constants (8/17), not the reference script's 5 responses.
- **Corrected (B1):** `BENCHMARK_STANDARD_v1.md` §3.4 is authoritative. Early
  stopping passes **only** when every essential collection item is established at
  score 2 and every essential disclosed fact is recorded at score 2. A missed
  essential collection fact scores below 2 and **prevents** Session success; it is
  logged separately as a diagnostic collection gap (for analysis), which does not
  make the Session pass.

## 7. Failures / risks

- **Data gap (primary risk):** no real multi-Session trajectory. Any C/S result in
  Phase B on synthetic branches must be labelled synthetic; it cannot establish
  classroom effectiveness. R on the single real S9 record is a narrow extraction
  baseline only.
- **Semantic-hit reproducibility:** dynamic C/S scoring needs an agreed hit/miss
  adjudication procedure before it is trustworthy (deferred to Joseph).
- **Privacy boundary:** producing a real trajectory requires confirming the source
  is mock-pilot (2B2) or consented, not graded classroom data.

## 8. Compatibility (read-only)

- The standard's turn/question definitions match `src/intakePolicy.ts`
  (`questionCount`, `conversationErrors`).
- "A planned future test cannot erase an executed test" is already implemented
  (`applyEvidenceUpdates`), supporting critical-error rule #2 and the R-S9-F3
  scoring anchor.
- The replay-vs-dynamic split matches the existing harness design (deterministic
  `decideTurn` replay vs. integration driver) in `REPORT_01.md`/`REPORT_02.md`.

## 9. Questions for Joseph (at most five)

1. **[Teaching decision]** Confirm the resolved v1 rule (STANDARD §3.4,
   authoritative): a Session passes only when every essential collection item and
   every essential disclosed fact score 2; a missed essential fact prevents
   Session success and is logged separately as a diagnostic collection gap. (This
   supersedes the earlier draft wording that treated a faithful early stop as a
   pass despite a missed fact.)
2. **[Teaching decision]** Given no real multi-Session trajectory exists, is it
   acceptable to run Phase B as **R on the real S9 record + C/S on reviewed
   synthetic T1/T2/T3 branches**, clearly labelled synthetic — or do you want to
   first supply/authorize a real de-identified 2B2 trajectory?
3. **[Data/privacy]** If a real trajectory is wanted, can you confirm a
   de-identified consecutive same-student 2B2 export (full source conversation +
   confirmed record) is available and permitted for benchmark use?
4. **[Scoring procedure]** Approve a two-reviewer semantic-hit adjudication
   procedure for dynamic C scoring, with disagreements recorded and adjudicated?
5. **[Freeze]** Do you approve freezing the `m_i`/`d_i` essential-fact granularity
   per Session before Phase B, so scores cannot later be tuned by changing
   granularity?

## 10. Next-step recommendations (at most three)

1. Joseph reviews `BENCHMARK_STANDARD_v1.md` and answers Q1–Q5; then freeze v1.
2. Resolve the trajectory-source decision (Q2/Q3) so Phase B has a defined dataset
   (real R-only, or real + synthetic C/S).
3. Only after review, authorize Phase B: a minimal runner pinned to the existing
   Intake versions, replaying R-S9 first and reporting R + state checks, with
   inspectable JSON output.

Phase A stops here and waits for review before Phase B, per the handoff.
