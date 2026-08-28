# Sprint 8 Handoff — AI Session Intake

## Current state

Sprint 8 is planned from the completed 2026 2B1 observation. No Sprint 8
application code, database migration or model integration exists yet.

## Confirmed direction

- Pilot AI Session Intake as the primary progress-evidence interaction.
- Produce a structured Session Report from a short adaptive conversation.
- Keep Attendance separate.
- Connect each Intake to previous responsibility and Teacher action.
- Treat student responses and Final Report text as claims until evidence or
  Teacher verification supports them.
- Use AI to clarify, extract, compare, summarise and propose targeted questions.
- Keep verification and marks Teacher-controlled.

## First implementation session

Begin with **Phase 1 — Evidence Contract & Conversation Design**.

Do not start with UI or provider calls. First define:

1. versioned JSON schema
2. conversation state machine and turn limits
3. source/AI/Teacher data boundaries
4. deterministic fallback
5. five-project labelled evaluation cases
6. acceptance and adversarial tests

## Required repository reading

- `AI_CONTEXT.md`
- `docs/analysis/README.md`
- `docs/analysis/2026-2B1/README.md`
- `docs/analysis/2026-2B1/observations/2026-08-13-intake-baseline.md`
- `docs/analysis/2026-2B1/observations/2026-08-28-final-observation.md`
- `docs/analysis/2026-2B1/decisions/sprint-08-evidence-decisions.md`
- `docs/sprints/sprint-08/PLAN.md`

## Guardrails

- no raw student CSV in Git
- no auth user IDs in anonymised exports
- no autonomous grading or contribution decision
- no accusation based on missing evidence or inconsistent prose
- no unbounded chat
- no AI-only path that blocks submission during provider failure
- one focused Phase branch and Draft PR; merge only after explicit approval
