# Team meeting capture, individual decisions

Approved 19 November 2026. Team and Individual are entry points for the existing independent review nodes. Session AI checks and marks are unchanged.

## Classroom workflow

1. In Review → To review, select the node, then choose **Team**. Team cards show member names and individual completion counts.
2. Open a team meeting. Select the students who actually participated; attendance starts empty. The initial meeting date uses Melbourne time and can be edited. Use **Select all present** only if everyone joined.
3. Review the one saved Top 3 guide and frozen session context. Missing submissions are unknown, not failure. Refresh sources or guide explicitly when needed.
4. Write one natural observation, naming students for individual checks. A pause of three seconds or leaving the field starts organisation, after saving. The AI separates explicit team matters, attributable personal observations and unresolved attribution.
5. Edit shared feedback and member cards as needed. Manual edits stop automatic replacement; explicitly organise again to replace them. **Save draft** is also available, including after failures.
6. Select the members whose personal feedback you have reviewed, then confirm them together. Existing individual work requires explicit replacement consent. Earlier publications and private individual notes are retained. Shared work alone cannot complete an individual review.
7. Resume an existing meeting or use **New meeting** for a later discussion with missing members. Individual mode remains available for one-to-one work. Team meetings are also searchable under Review records → Team meetings.

Students see only their own confirmed individual feedback plus the shared feedback confirmed with that publication. Raw meeting observations, unresolved attribution, attendance lists and classmates' individual feedback remain teacher-only. Absent members receive no inferred result and are not completed by the meeting.

## Attribution rules

Only a statement explicitly about the team belongs in shared feedback. An unidentified person's work stays unresolved; it is not inferred to be shared. A teammate answering is not evidence of someone else's understanding. Requests for demonstrations do not imply the student previously failed to demonstrate. Do not invent who promised an action. The same conservative request-versus-failure rule was added to the existing individual feedback prompt.

These rules guide extraction; teachers still review and confirm the draft. Offline tests verify validation and access boundaries, not model accuracy on every possible observation.

## Persistence and safeguards

- `teacher_review_meetings` stores the roster/node/source snapshots, participants, date, natural observation, editable feedback and member confirmation references. Meetings may be resumed; later meetings have distinct IDs.
- `teacher_meeting_ai` stores guide/feedback results with fingerprints, per-kind leases and explicit retry after failure. A current cached result is reused. A generation that finishes after its observation/participants changed cannot be accepted as current.
- All tables are private. Security-definer RPCs enforce teaching-class authorization, including linked previous-class access for AI source retrieval. The API resolves source context on the server; it ignores client-supplied context and validates participant IDs in generated output.
- Saves use expected meeting versions. Individual target versions stay frozen while the teacher edits; background saves do not silently adopt another teacher's updated review. Conflicts preserve input and require explicit reload/reconciliation. Editing an observation or feedback clears earlier confirmation selections, so teachers confirm the latest content. Background saving keeps the observation editable and preserves typing that arrives while a save is in flight.
- Selected member publication is atomic. It rechecks class/team membership, participants, personal evidence, current source snapshots, open summary corrections, individual versions and replacement consent. One failure rolls back the whole selected batch.
- Publishing writes existing `teacher_node_reviews` and append-only publication history. Only the personal points become the individual draft observation; full group notes are never copied into someone's individual observation. Shared points are separately labelled `teamFeedback` in that student's publication.
- A later change to a meeting does not rewrite earlier published feedback. Meetings themselves remain editable teacher workspaces; individual publication snapshots preserve what students received. Original meeting notes are not a full version-by-version transcript archive.
- Started team node definitions are locked, as individual node definitions already were. A roster change preserves the original meeting snapshot; start a new meeting for the current roster.

## Rollout

1. Apply `supabase/migrations/20261119_team_review_meetings.sql` after the existing independent-node migrations. It is additive and rerunnable. The fresh schema contains the same migration.
2. After SQL success and the teacher's explicit merge request, deploy the feature PR.
3. Use a test team: select one attendee, record a named personal observation and a shared issue, inspect the output and confirm only that member. Verify the absent member stays unreviewed.
4. Sign in as each test student: only the selected student should receive their personal and shared feedback; neither should see raw notes or anyone else's personal assessment.
5. Check desktop/mobile modal scrolling, long names, source history, replacement warnings, two-window conflicts and resuming/starting meetings.

No production DB writes or paid model calls are made by the automated tests. Browser visual checks are currently blocked by Chromium startup in the execution environment; complete the above manual checks on the preview before release. If reverting the UI, retain the additive tables and migration: existing students can still read their individual publications.
