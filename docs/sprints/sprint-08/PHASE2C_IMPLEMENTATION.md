# Sprint 8 Phase 2C — Guided AI Session Intake

**Branch:** `sprint-08-phase2c-ai-intake`  
**Schema baseline:** `session-intake.v1.0.0`  
**Prompt prototype:** `session-intake-ai.v1.0.0`  
**Test suite baseline:** `ai-intake-suite.v1.0.0`

## Current decision

The initial implementation proved the bounded AI endpoint, structured output,
local validation, hardened persistence and deterministic fallback. Its normal
student experience is still form-first, so it is a technical prototype rather
than the Phase 2C candidate experience.

Phase 2C now enters an experience-design round before further implementation.
The approved direction is documented in
`docs/sprints/sprint-08/PHASE2C_EXPERIENCE_DESIGN.md`.

## Candidate experience

The normal path will be a guided evidence workspace:

1. one natural-language question at a time in a conversation area;
2. a live evidence area that keeps Claim, Evidence, Testing, Blocker and Next
   Action visibly separate;
3. stable collection directions with adaptive question choice;
4. current Session focus plus bounded same-student continuity;
5. explicit routes for evidence, clarification, a small next step and Teacher
   help;
6. student correction and confirmation before submission;
7. a deterministic full-form fallback if the provider fails.

The assistant may help a student reduce a task to a small action. The student
must accept or edit that action. The assistant cannot allocate Team
responsibility, make a Teacher decision, verify work, infer honesty or grade.

## Useful Intake outcomes

A valid Intake may record:

- scoped evidence ready for Teacher verification;
- a Claim whose evidence is explicitly missing;
- honest little/no progress plus an accepted small next step;
- a Teacher-help request describing the decision or support needed.

Repeated no-progress records and unfinished actions remain continuity facts for
Teacher guidance. They are not automatic risk scores.

## Retained technical boundaries

- authenticated activated-student endpoint;
- server-resolved Block, Session and same-student history;
- no direct identity or other-student raw text in provider input;
- at most three adaptive follow-ups and six total pre-summary questions;
- strict schema output and application/database validation;
- separate original conversation, extraction and student confirmation;
- deterministic completion after provider, network or schema failure;
- AI cannot write Teacher verification, Teacher Action or marks.

## Design-round deliverables

1. collection routes and transition/stop rules;
2. desktop and mobile workspace wireframes;
3. three full conversation-to-evidence examples: strong evidence, little
   progress, and repeated unfinished action;
4. minimal schema delta for outcome type, source links, accepted small action
   and Teacher-help request;
5. revised mandatory regression suite and acceptance thresholds.

No Phase 2C migration should be applied until the schema delta and candidate
experience are reviewed.

## Later implementation gate

After the design round:

1. refactor the form-first normal path into the guided workspace;
2. retain the current form as provider-independent fallback;
3. verify responsive scrolling and keyboard use;
4. run all mandatory content and authority cases with 2B2 mock students;
5. run the Phase 2C security audit and require every applicable check to pass;
6. confirm 2B1 remains unchanged;
7. merge only after explicit review.

The current Draft PR remains open while this redesign is developed.
