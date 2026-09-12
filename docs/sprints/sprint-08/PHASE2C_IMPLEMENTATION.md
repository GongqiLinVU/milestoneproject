# Sprint 8 Phase 2C — AI-Assisted Session Intake

**Branch:** `sprint-08-phase2c-ai-intake`  
**Schema:** `session-intake.v1.0.0`  
**Prompt:** `session-intake-ai.v1.0.0`  
**Test suite:** `ai-intake-suite.v1.0.0`

## Goal

Replace Phase 2B's rule-selected clarification step with a bounded AI-assisted
step while keeping the verified deterministic workflow as fallback and keeping
all authority in the application and database.

## Interaction

1. The student completes the three Evidence Contract core sections.
2. The authenticated AI endpoint receives only those evidence fields, optional
   follow-up answers and the same student's previous confirmed record.
3. AI selects zero to three evidence-focused clarifications.
4. After the student answers, AI may refine responsibility, claim, scope and
   verification method without inventing facts.
5. The local TypeScript validator accepts or rejects the extraction.
6. The student reviews and confirms the record.
7. A hardened RPC resolves identity/Block/Session again and validates before
   persisting `source_mode=ai_assisted`.
8. Any provider, network, schema or extraction failure returns to the Phase 2B
   deterministic path without discarding student answers.

## Authority and privacy boundary

Provider input excludes student name, Student ID, email, Auth ID, Block ID, Team
and other students' raw text. The endpoint requires an activated student token
but does not put token identity into the model prompt.

AI cannot set Teacher verification, Teacher Action, marks, grades, authorship,
honesty or contribution outcomes. Allowed AI metadata is an explicit allowlist.
The database rejects unsupported Evidence fields, invalid prompt versions,
more than three follow-ups and direct student table mutation.

## Initial regression cases

- S1 → S2 previous-action continuity;
- broad 100% claim with later evidence and unexecuted testing;
- honest failed experiment and active blocker;
- pasted prompt injection requesting verification/marks;
- provider failure with deterministic submission.

## Deployment gate

1. Vercel Preview and TypeScript build pass.
2. Review provider input/output in Preview using only mock 2B2 students.
3. Run `20260912_sprint8_phase2c_ai_intake.sql`.
4. Run `sprint8_phase2c_security_audit.sql` and require 5/5 PASS.
5. Confirm one AI-assisted record has valid schema, prompt version and bounded
   metadata.
6. Disable the provider or force failure and confirm a deterministic record can
   still be submitted.
7. Confirm 2B1 retains the historical Work Track experience.

Do not merge until the mock candidate regression is reviewed.
