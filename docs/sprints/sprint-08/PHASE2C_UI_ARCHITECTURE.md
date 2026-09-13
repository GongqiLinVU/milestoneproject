# Phase 2C UI Architecture — Session-first Student Portal

**Status:** UI-first design candidate  
**Decision:** Intake belongs to a Session, while all Sessions reuse one dedicated
AI Intake workspace.

## Why a hybrid model

Embedding a full conversation and evidence panel inside every Session card would
create repeated controls, competing open conversations and a very long page. A
completely independent Intake would lose the Session teaching focus and
continuity.

The selected model separates association from presentation:

- each Intake record remains bound to exactly one Session;
- the student portal exposes one primary Session action;
- opening any eligible Session loads the same full-page Intake workspace with
  that Session's context;
- no Session card contains its own full Intake instance.

## Student portal hierarchy

The 2B2 student portal should use this order:

1. **Current Session** — expanded by default and visually dominant;
2. **My Project** — compact summary, expandable for full project detail;
3. **Other Sessions** — completed, catch-up and upcoming groups collapsed by
   default;
4. **Class Activities** — moved to the bottom and collapsed by default;
5. **Get Help** — compact persistent link/action.

The current "This Week" activity hub no longer occupies the first screen.
Activities remain available because the Teacher guides their classroom use.

## Current Session panel

The first screen should answer four questions immediately:

- Which Session is the class working on?
- Have I checked in?
- Have I completed this Session's Intake?
- What should I do next?

Example:

```text
S3 · CURRENT SESSION                         Checked in
Implementation & first test

Your last agreed action
Fix the mobile navigation and connect dashboard data.

Session Intake
Continue your guided Intake                     [Continue Intake]
2 of 3 evidence areas identified

[View session guidance]
```

Selecting the Intake action navigates to a dedicated route/view such as
`/student/sessions/:sessionId/intake`. It is a full-page workspace with browser
Back support, rather than a long modal.

## Which Session becomes primary

Session status and Intake availability have different meanings:

- **Session status** says what the class is currently working on.
- **Intake access** says whether an Intake may be submitted.

Primary selection follows this order:

1. the Session whose status is `open`;
2. if none is open, the most recent eligible incomplete Session whose Intake is
   open;
3. if no Intake is currently available, the next scheduled Session;
4. otherwise the latest completed Session as read-only context.

The database should normally allow only one current/open Session per Block. The
student UI must still handle inconsistent or transitional data: if more than
one Session is marked open, select the latest scheduled one as primary and show
the others under **Other available Sessions**. Do not open multiple workspaces.

## Multiple Intake-access Sessions

A Teacher may keep S1 and S2 Intake access open for catch-up while S3 is the
current Session. This must not make all three look equally urgent.

- S3 appears as **Current Session**.
- S1 and S2 appear in a collapsed **Catch-up available** group.
- Opening S1 or S2 loads the same workspace with a persistent header:
  **Catch-up Intake · S1**.
- Before the first answer, show:
  "You are completing S1. The current class focus is S3."
- Answers and drafts are stored under the selected Session ID.
- Switching Sessions requires returning to the portal. A draft warning prevents
  accidental loss.
- Only one Intake workspace exists in the browser at a time.

This supports late students without letting catch-up work displace the current
class rhythm.

## Session list presentation

### Current

Exactly one expanded panel with Check-in, Intake state, last agreed action and
the primary action.

### Completed

Collapsed summary showing a count. Expanding reveals compact rows:

- S1 · Intake confirmed · Teacher review status
- S2 · No Intake submitted
- S3 · Teacher guidance requested

A completed Session never renders its conversation inline. Selecting it opens
the shared workspace in read-only mode.

### Catch-up available

Collapsed unless the student has no current Session action. It contains only
eligible incomplete Sessions and uses a secondary visual style.

### Upcoming

Collapsed summary. Upcoming cards show focus and date without an enabled Intake
button unless the Teacher explicitly opened Intake access.

## Class Activities

Rename the student-facing section to **Class Activities** and place it after the
Session areas.

Default state:

```text
Class Activities · guided during class                    [Show activities]
2 available
```

Expanding reveals the existing activity cards. The expansion choice may persist
for the current browser session, but every new login starts collapsed.

Activities do not compete with Current Session status. If an Activity is open,
its count appears in the collapsed summary; it does not move above the Session.

## AI Intake workspace

### Desktop

- left: guided conversation;
- right: live evidence workspace;
- top: Session number, teaching focus, current/catch-up label and save state;
- bottom of conversation: composer plus No progress and Teacher help actions;
- previous commitment appears in a separate context strip.

### Mobile

- Conversation and Evidence tabs;
- sticky Session identity and save state;
- page-level scrolling;
- sticky composer within Conversation;
- no fixed-height modal.

The workspace loads a single selected Session. It cannot silently move the
student to another open Session.

## Navigation rules

- **Start/Continue Intake** opens the workspace for the primary Session.
- **View confirmed Intake** opens the same workspace read-only.
- **Catch-up Intake** requires a deliberate selection from the collapsed group.
- Browser Back returns to the portal with the same group expansion state.
- Closing with an unsaved draft requires confirmation.
- Submission returns to Current Session and updates its status immediately.

## Session Intake lifecycle and history

Each Session produces one durable Intake snapshot. Conversation is available
only while that Session Intake is active.

| State | Student capability | Teacher capability |
|---|---|---|
| Not started | Start while Intake access is available | Open/close access |
| Draft | Continue conversation; edit extracted fields | See submission is in progress, not its unfinished private draft |
| Review pending | Correct fields and confirm | No verification yet |
| Confirmed | Read-only | Review original turns and confirmed evidence |
| Teacher reviewed | Read-only; view verification, comment and action | Append verification, comment and next action |
| Session closed without confirmation | View an incomplete/closed status; cannot resume | Decide whether to reopen access or record guidance |

A student confirmation immediately freezes:

- the original conversation;
- AI extraction shown at confirmation;
- student corrections;
- the final student-confirmed evidence record;
- the prompt/schema/model metadata used for that run.

Closing the Session also prevents continued conversation. Reopening Intake access
is an explicit Teacher action. If a confirmed record already exists, reopening
does not unlock or overwrite it; a correction requires a separate auditable
Teacher-managed correction workflow in a later phase.

Teacher review is stored separately from the student snapshot. Teacher comments,
verification status and Teacher Actions are append-only academic records and
cannot rewrite what the student originally claimed.

Students can read Teacher feedback on a historical Session. They cannot reply
inside the historical conversation. An unresolved Teacher Action is carried
forward as context in the next eligible Session Intake, where the student can
describe what happened in response.

The History view therefore contains:

- Session identity and teaching focus;
- confirmed timestamp and outcome type;
- read-only conversation transcript;
- read-only evidence workspace as confirmed;
- Teacher verification and comments;
- Teacher Action and its later resolution link, when available.

History must never present a button labelled Continue, Edit or Reply for a
confirmed or closed Session.

## Intake status language

| State | Primary action |
|---|---|
| Available, not started | Start guided Intake |
| Draft exists | Continue Intake |
| Waiting for student confirmation | Review evidence |
| Confirmed | View confirmed Intake |
| Teacher help requested | View request |
| Closed without submission | Intake closed |
| Provider unavailable | Continue with fallback |

## UI-first delivery order

1. Refactor the portal information hierarchy with mock/static state.
2. Build the dedicated responsive workspace shell with conversation/evidence
   placeholders.
3. Implement primary Session resolution and catch-up grouping.
4. Move Class Activities to a collapsed bottom section.
5. Validate desktop and mobile layout, scrolling, focus and back navigation.
6. Only then connect conversation routing, extraction and persistence.
7. Add Teacher guidance queue after the student experience is stable.

## UI acceptance

- the first viewport always makes the Current Session and its next action clear;
- no more than one primary Intake action is visible;
- multiple open Intake-access Sessions cannot create parallel workspaces;
- catch-up Sessions remain accessible but visually secondary;
- Activities are available at the bottom and collapsed on login;
- Session history and upcoming Sessions do not lengthen the default page;
- the Intake uses full-page scrolling and works on desktop and mobile;
- selected Session identity remains visible throughout Intake;
- a draft cannot be submitted to or silently switched into another Session;
- 2B1 historical experience remains unchanged during the isolated 2B2 pilot.
