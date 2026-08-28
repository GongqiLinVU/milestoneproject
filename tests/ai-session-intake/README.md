# AI Session Intake Test Workspace

This directory is the durable regression and evaluation home for Sprint 8 AI
Session Intake. It is intentionally separate from application code so the same
cases can evaluate different prompts, models and conversation policies.

## Purpose

AI quality is not accepted because an answer sounds fluent. A release candidate
must pass deterministic safety and contract gates, meet a labelled quality
rubric and demonstrate teaching usefulness in the isolated mock pilot.

## Test block

- Block: `NIT3004-2B2`
- Purpose: synthetic Sprint 8 development and evaluation only
- Initial cohort: three mock students in one mock Team
- Isolation: never read from, write to or reuse context from completed 2B1 data
- Journey: reuse the same accounts across multiple mock Sessions so longitudinal
  responsibility, blockers, repeated claims and Teacher Actions can be tested

The three mock students are reusable roles, not fixed personalities:

- **A — specific evidence:** clear responsibility, artifact and executed result
- **B — broad confidence:** “complete”, “100%” or headline test counts without scope
- **C — difficulty and shared work:** failure, blocker, overlap and Teacher recheck

## Structure

- `EVALUATION_STANDARD.md` — authoritative gates, rubric, thresholds and test process
- `CASE_FORMAT.md` — required format for every reusable labelled case
- `cases/v1/` — versioned human-readable case specifications
- future `runs/` — ignored or sanitised evaluation outputs; no identifiable student data

## Regression rule

Every material change to a system prompt, question policy, model, schema or
fallback must rerun the current mandatory case set. Compare results against the
previous accepted baseline; do not replace difficult cases merely to improve a
score.

A test run records:

- test-suite version;
- schema version;
- prompt version and hash;
- model/provider identifier and relevant settings;
- timestamp;
- per-case deterministic results;
- two independent AI-quality scores where practicable;
- disagreements and adjudication;
- latency, turn count and completion outcome.

No raw real-student data, direct identifiers, Auth IDs or private Teacher notes
belong in this directory.
