# Adaptive Intake candidate — ai-intake-suite.v1.1.0

Candidate policy: `adaptive-intake.v1.1.0`; chat prompt: `session-intake-ai.v1.3.0`;
chat record: `session-intake.v1.1.0`. The historical v1.0 suite is retained.

The candidate replaces the old three-follow-up/six-question limit for the chat
path only: three core directions plus zero to five follow-ups, at most eight
questions, with early review allowed. API retries do not add questions. Preserve
all question/answer pairs and the final review message (maximum 17 messages).
Unknown testing is explicitly stored. All other Gate A/B/C requirements remain.

Run deterministic and mocked-endpoint regressions (no real provider or DB):

```sh
npx tsc --outDir .test-build --target ES2022 --module nodenext --moduleResolution nodenext --skipLibCheck src/intakePolicy.ts src/aiSessionIntake.ts
npx tsc --outDir .test-api --target ES2022 --module nodenext --moduleResolution nodenext --skipLibCheck api/session-intake-ai.ts
node --test tests/ai-session-intake/adaptive/*.test.mjs
npm run build
```

## Manual candidate cases

Use only an unconfirmed Session for a 2B2 mock student. Do not delete historical
Intakes to repeat a test. Retain model/prompt/policy versions and all failed runs.

| Case | Input/interaction | Must observe |
|---|---|---|
| Short but specific | “I fixed the loading spinner; commit abc, test returned the expected spinner.” | Target the missing verification detail, not verbosity |
| Sparse/no progress | “Nothing yet”; then explain uncertainty | Small feasible action or Teacher help, no fictional evidence |
| Complex | Give two completed changes, one untested state and an API dependency | Separate facts, unknown testing and blocker; avoid repeat questions |
| Demonstration | “I can show the loading screen live.” | Live demonstration, not repository change or executed test |
| Early review | Supply all three directions with evidence and an accepted next action in the first reply | May finish immediately; do not use all five follow-ups |
| Full budget | Continue answering partially until budget is exhausted | No ninth question; first and final student messages survive saving |
| Provider failure | Simulate offline/provider error after an answer | Original answer retained; explicit editable fallback, no silent extraction |
| Correction | Change an extracted claim at review | Attestation resets; original extraction and final correction saved separately |
| Teacher help | Ask Teacher to choose between two small tasks | Support request, no implied Teacher decision or dispatched notification |
| Locked history | Reopen a confirmed Intake | Read-only; endpoint refuses new turns |
| Accepted future test | State a completed loading change, a verifiable reference, and “Before next Session I will simulate API 500”; if prompted, say “I will do that next Session” | Move to review when evidence and verification are clear; never ask for a future test result now. Keep any executed loading observation even if an API 500 test is planned. Repeated unchanged extraction shows zero new fields. |

For each completed case verify the new RPC's saved schema version, full ordered
source conversation, metadata/extracted_record, student_confirmation/corrections,
and final student_record. Verify duplicate submission and cross-Block rejection
with authenticated mock accounts. Run `sprint8_adaptive_intake_security_audit.sql`.
Repeat each real model case at least three times before declaring candidate quality.

Current evidence: 18 policy/record tests and 4 mocked-endpoint tests pass locally.
Database audit, authenticated UI submission, real-model quality and longitudinal
teaching outcomes are not established by these tests.
