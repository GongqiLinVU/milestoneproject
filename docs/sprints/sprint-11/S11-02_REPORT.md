# S11-02 — Short stage specific openings for S1 to S9

## Evidence and approval

Joseph requested review of the full rehearsal, then supplied the current S2 opening screenshot. The saved exports reviewed cover S1 and S3–S9: eight Sessions. S2 had been skipped in that rehearsal, so there is no ninth original export. Its no-prior-record opening was checked against the current screenshot and code. These are simulated-student rehearsal outputs, not independent classroom evidence. Original private exports were read without alteration and are not added to the repository; the existing frozen rehearsal corpus remains unchanged.

The old S1 question assumed a new commitment before an unexplained S2. The no-history S2 question demanded an observable result despite its team-alignment focus. S3–S9 all repeated a long generic question and embedded increasingly long prior actions. S3's student also corrected the previous backend role, demonstrating why historical context must be presented as changeable rather than authoritative current responsibility.

## New displayed questions

| Session | Teaching focus | Opening question |
|---|---|---|
| S1 | Reconnect with existing work | Where is your project up to, and what part will you be responsible for in this unit? |
| S2 | Agree individual work within the team | What have you agreed with your team about your part, and what will you work on next? |
| S3 | Describe actual implementation or investigation | What have you worked on since the last class, and where have you got to? |
| S4 | Prepare a concrete progress discussion | What can you show or explain about your work so far, and what still needs attention? |
| S5 | Review progress and next direction | How is your part progressing, and what will you work on next? |
| S6 | Act on the previous plan or review | What did you work on after the last class, and what will you do next? |
| S7 | Connect project progress and technical writing | What progress have you made on your part of the project and the technical report? |
| S8 | Separate performed checks from unknowns | What have you checked in your part of the project, and what still needs checking? |
| S9 | Prepare an honest final handover and demonstration | What is ready in your part for submission and presentation, and what still needs work? |

Each is one opening message, not a list of compulsory subquestions. Session focus guides the entry point; it does not require students to have reached a particular stage. Existing Session titles and teacher configuration are not migrated or overwritten. Current course scope remains NIT3004, with NIT3003 design deferred.

## Display and context contract

All nine openings have a brief hint, collapsed sentence starters and a collapsed illustrative example. Examples are labelled as illustrations and never prefill an answer. Unresolved roles/plans, no progress, report work not yet started or outside the student's responsibility, unexecuted tests and incomplete readiness are explicitly permitted in the appropriate hints. No new evidence-link requirement or minimum round count is introduced.

Where available, a collapsed “Your last check-in” panel retains the complete prior role and next action, including multiple actions and line breaks. Blank fields are omitted, not quoted as empty values. Students are told roles/plans may change. The opening bubble shows only the short stage question. The original prior text is also retained in the underlying opening, explicitly labelled historical rather than a current update, so the chat and record tasks can interpret brief references to earlier plans. The API's existing authoritative prior-role/action loading is unchanged.

Hints, sentence starters and examples stay outside the transcript and model inputs. Historical context is system context, not a student turn or newly accepted evidence. Source grounding and the student's confirmation still determine the saved record. No history is rewritten. Sufficient answers can still finish after one reply; two-clarification/global and per-target limits, provider instructions/schema, record task and O/W/A remain unchanged.

## Verification

- Offline suite: 248 of 248 passed. The opening tests cover all nine short/distinct questions, stage-specific acceptance of unknowns, full multi-action context, missing fields and all eight frozen rehearsal openings without rewriting that corpus.
- TypeScript and production Vite build passed; existing chunk-size warning only.
- Actual React component with synthetic RPC/provider transport: all nine initial screens on mobile; S1 and S2 desktop; collapsed scaffolding, draft-only shortcuts, direct one-answer review/save and optional model-selected clarification; no scaffolding in chat/record/saved source; full multi-action historical context retained in source but not repeated in the question; missing-action/no-history paths; closed and saved first Session read-only.
- Desktop/mobile screenshots inspected. Synthetic browser acceptance does not prove live model question quality, extraction quality or classroom benefit. Existing record-grounding regression tests remain passing, but no fresh paid evaluation was run.

No migration, production account/data action or paid model call. This extends the same Draft PR #99; it is not a merge authorization. Temporary browser dependencies remain outside the repository and do not change its package lockfile.

## Acceptance after release

Continue the demonstration using an unsubmitted S2: check the team-agreement question and optional hints, with or without a previous confirmed record. Open a later Session and expand its last-check-in panel; verify a short question plus the full earlier plan. Complete a representative answer and check the review, without replaying every old paid case. Compare future real output against the student's words before approving further changes.
