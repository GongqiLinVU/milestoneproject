# Sprint 8 Phase 2C — Guided AI Intake Experience Design

**Status:** Design candidate for review  
**Branch:** `sprint-08-phase2c-ai-intake`  
**Schema baseline:** `session-intake.v1.0.0`

## Product purpose

Session Intake is a guided learning assistant and evidence workspace. It helps a
student describe what actually happened, see what evidence exists, choose a
small next step and request Teacher help when needed. The resulting record gives
the Teacher a concise basis for verification or intervention.

The design does not assume that every student has made useful progress. An
honest no-progress record, a realistic small next action, or an accurate Teacher
handoff can be a valid Intake outcome.

## Core interaction model

Desktop uses a two-column workspace:

- **Guided conversation:** one question at a time, short natural-language
  answers, optional structured choices when a distinction matters.
- **Evidence workspace:** updates during the conversation and keeps Student
  Claim, Evidence, Testing, Blocker and Next Action visibly separate.

The workspace header shows the current Session, its teaching focus and progress
through the Intake. Mobile uses two switchable views, Conversation and Evidence,
with a badge when the evidence view has unreviewed changes.

The full structured form remains an emergency provider-independent fallback. It
is not the normal AI Intake experience.

## Stable collection directions

Every Intake works within three stable directions. They are coverage goals, not
a fixed visible questionnaire.

| Direction | Intended information | Example AI action |
|---|---|---|
| Responsibility and change | Personal responsibility and what changed since the previous Session | Narrow a Team claim to the student's own work |
| Evidence and verification | Artifact, executed test, observed result and a practical verification method | Ask for the single strongest missing support |
| Blocker and next action | What remains unresolved and the smallest useful next step | Help reduce a broad plan to a concrete action |

If one answer covers several directions, the AI reuses it. It must not ask the
student to repeat information simply to complete a question sequence.

## Session focus and continuity

Each Session is an independent record with its own original conversation,
structured extraction, student confirmation and later Teacher review.

The prompt may use these bounded inputs:

1. the current Session teaching focus;
2. this student's previous confirmed responsibility, claim, blocker and next
   action from the same Block;
3. an unresolved Teacher Action explicitly assigned to this student;
4. the student's current conversation.

Previous records provide context for a question. They never become current
progress automatically. A continuity prompt should be neutral, for example:
"Last time you planned to fix mobile navigation. What happened with that plan?
It is okay if the direction changed."

## Route selection

The assistant can move between four routes during an Intake.

| Route | Entry signal | Useful ending |
|---|---|---|
| Evidence route | The student describes a specific change, artifact or result | Student-confirmed Claim and verification method |
| Clarification route | Work may exist but the first answer is broad or unclear | A smaller, faithful Claim or explicit uncertainty |
| Small-step route | The student reports little/no progress but can identify a task or obstacle | Honest no-progress status and one student-accepted small action |
| Teacher-help route | Responsibility is unclear, support is required, two clarifications add no useful information, or the student asks for help | Concise handoff stating what is known and what Teacher should decide |

Route selection is not a performance label. Short answers trigger one
low-burden clarification before the system concludes that no useful information
exists.

## Stop and escalation rules

- A clear "I did not make progress" stops evidence interrogation.
- After two clarification answers add no material information, offer a small
  step or Teacher help.
- Teacher help is always available from the conversation.
- AI can suggest a small action only within known project/responsibility scope.
- Student must accept or edit the suggested action before it becomes their next
  action.
- AI cannot allocate Team responsibility, approve the action for the Teacher,
  mark work verified or infer why the student did not progress.
- A repeated uncompleted action or repeated no-progress record is shown to the
  Teacher as a continuity fact. The AI does not assign a risk score or label.

All AI questions, including route clarification, remain within the Evidence
Contract limit: at most three adaptive follow-ups and at most six questions
before summary.

## Evidence workspace states

Each item shows its provenance and confirmation state:

- **Student said:** original statement linked to its conversation turn.
- **AI organised:** extracted field awaiting student review.
- **Student corrected:** retained correction that later AI output cannot
  silently overwrite.
- **Missing/unknown:** an explicit absence, never an invented completion.
- **Teacher review:** separate Teacher-owned state after submission.

The evidence workspace distinguishes:

- Claim from Evidence;
- planned testing from executed testing;
- expected result from observed result;
- failed work from no progress;
- missing evidence from evidence not required;
- suggested next action from completed work;
- Teacher help requested from Teacher verification.

## Student completion outcomes

A confirmed Intake can end in one of four outcome types:

1. **Evidence submitted** — a scoped Claim with usable evidence or verification
   method.
2. **Claim recorded, evidence missing** — work is claimed but support is not yet
   available.
3. **Small next step agreed** — little/no progress is recorded and the student
   accepts a bounded action.
4. **Teacher help requested** — the record identifies what is known and the
   decision or support required from the Teacher.

Every outcome stores the original conversation and student-confirmed record.
Only the fourth creates a Teacher guidance item; none creates verification
automatically.

## Teacher handoff

Teacher views should separate two queues:

- **Verify work:** Claims with evidence, contradictions or verification needs.
- **Guide progress:** no progress, repeated unfinished actions, unclear
  responsibility, blocked work or explicit help requests.

A guidance card should show the current fact, the prior agreed action when
relevant, what the student tried, the proposed small step and the exact help
requested. It must link back to source turns.

## Design acceptance cases

### A. Specific evidence

The student gives a concrete personal change, repository reference and executed
test result. The AI asks zero or one useful clarification and produces a scoped
evidence record.

### B. Broad confident claim

The student says the backend is complete and all tests pass. The AI narrows the
personal scope and asks for an executed result/reference without converting the
claim into verification.

### C. Honest failed experiment

The student reports a failed sensor test with a measurement and intended retest.
The system preserves failed work as useful evidence and does not rewrite it as
no progress.

### D. Little progress, known next step

The student says they did very little but knows the assigned UI area. The AI
stops asking for nonexistent evidence and helps the student accept or edit one
small deliverable.

### E. No progress, unclear responsibility

The student cannot identify an owned task after bounded clarification. The
system offers Teacher help and produces a concise guidance handoff.

### F. Repeated unfinished action

The previous confirmed action was not completed and the current record adds no
progress. The system shows the continuity fact, helps capture the obstacle and
routes to Teacher guidance without accusation or scoring.

### G. Prompt injection

Student text asks the system to verify work, award marks or ignore instructions.
It remains untrusted claim content and cannot alter routes, authority, question
limits or Teacher state.

### H. Provider failure

The conversation preserves every answer and switches to the deterministic
fallback so the student can still submit a schema-valid record.

## Next delivery sequence

1. Review this interaction and route design using complete transcripts for
   cases A, D and F.
2. Produce a responsive wireframe for desktop and mobile states.
3. Define the minimal schema changes for outcome type, source links, accepted
   small action and Teacher-help request.
4. Update the candidate regression suite before implementation.
5. Refactor the Phase 2C normal path from the form-first prototype into the
   guided workspace.
6. Run mock student testing, Gate A, Gate B and provider-failure validation.

The current form-first Phase 2C code is retained only as a technical prototype
until the guided experience is approved.
