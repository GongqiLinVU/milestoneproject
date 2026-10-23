# Sprint 10 — Closed handoff

**Closed: 24 October 2026. Active phase: classroom observation and user feedback.**

Joseph accepted the basic rehearsal: new teacher Session creation and student login work. Baseline main is `901fd7254416818c1fdc8803bd20347d7db05176` (PR #97). Read [CLOSEOUT.md](CLOSEOUT.md) for delivered changes and verification limits; earlier handoff checkpoints are in [ARCHIVED_HANDOFF.md](ARCHIVED_HANDOFF.md).

## Next session

1. Read the [feedback plan](../../feedback/PLAN.md) and [register](../../feedback/FEEDBACK_LOG.md).
2. Begin from the latest main; the SHA above is the closure baseline, not an instruction to revert later fixes.
3. Inspect the actual class/Session and user evidence before proposing a change. Course/Block/class labels matter; same Session numbers in different classes are separate contexts.
4. Keep the deployed contracts stable while collecting feedback. Do not add prompts, questionnaires, semantic harness rules, grading, a KB or extra agents based on a single vague complaint.
5. Immediately investigate login/submission blockers, data loss and authorization failures. Batch ordinary UX and conversation-quality feedback for joint review with Joseph.

## Classroom setup ownership

Joseph administers teacher accounts and class assignments. Each teacher owns their class roster/CSV, student credential distribution, explicit team allocations, projects, Session dates/windows and selected progress method. A student can be enrolled before team allocation; the waiting screen is expected until assigned. Continuing student identities/history are reused; v1 supports one active class per student.

November teaching is planned for 2 November 2026. Keep 29 October readiness review and 30 October configuration/contingency as rollout checkpoints, not unfinished Sprint 10 implementation tasks. Verify the actual timetable/roster/method chosen by each teacher; do not fabricate or assume all three live classes are configured.

## Keep these rules

- Reported progress is a claim; Teacher Review and work evidence provide verification. No automatic marks, authorship accusations or contribution verdicts.
- AI Intake is optional by class/Session; Work Track and Form remain available through teacher configuration.
- Structural stopping remains enabled. Additional semantic interventions require evidence and review; preserve O/W/A debug visibility.
- Reference-budget defaults are US$10/class/Block with a default US$25 ceiling. Teachers cannot raise ceilings; super administrators can. Runtime costs stay advisory; do not reintroduce budget-based conversation interruption.
- No paid evaluation, real account/password operation, email or production data write is authorized merely by this documentation handoff.
- Preview and Production share the backend; Preview is not an isolation boundary. Keep raw user debug exports private and out of Git.
