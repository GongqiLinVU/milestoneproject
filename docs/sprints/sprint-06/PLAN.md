# Sprint 6 Plan — Poster Gallery & Session Work Evidence

**Status:** Planned  
**Source baseline:** Sprint 5 closed on 1 August 2026  
**Product area:** NIT3004 Engineering Studio Platform

## Sprint goal

Sprint 6 focuses on producing useful classroom evidence before attempting richer
analytics.

It delivers two immediate teaching capabilities:

1. a controlled Week 3 Poster Gallery so students can inspect projects and move
   naturally into peer feedback; and
2. a lightweight Session Work Track so every studio session records more than
   attendance and shows what students actually worked on.

Trajectory, Block analytics, enhanced evidence exports and AI-assisted teaching
insight are intentionally deferred to Sprint 7, after richer session evidence
exists.

Sprint 6 extends the stable identity, session, activity-control and teacher-review
foundation delivered in Sprint 5. It does not reopen completed Sprint 1–5 scope
unless a Sprint 6 integration explicitly requires it.

## Delivery principles

- Prioritise the Week 3 Poster Gallery because it has an immediate classroom
  deadline.
- Keep every phase independently reviewable and production-testable in a focused
  Draft PR.
- Treat attendance and work evidence as related but different records: check-in
  proves attendance; Work Track records the work performed.
- Keep student input short and structured. Do not create another long reflection
  form.
- Reuse roster-authoritative Block, Team, Project and Student context.
- Preserve student evidence and keep it scoped to the relevant Teaching Block.
- Do not turn Session Work Track into Jira, project management or marking.
- Do not generate automatic marks, attendance decisions or risk labels.
- Defer trend interpretation and AI conclusions until Sprint 7.

## Proposed delivery sequence

### Phase 1 — Week 3 Poster Gallery and Feedback Entry

#### Teaching purpose

Make Poster Peer Review fast and evidence-based. Students first inspect another
Team's Poster and project context, then enter feedback for that Team from the
same Gallery card.

The Poster is not a compressed project report. It is a one-page project
advertisement: concise, visually clear and persuasive enough to communicate the
problem, solution, key features and project value, and encourage useful peer
feedback.

#### Upload ownership

- A logged-in student may upload or replace the current Poster for their own Team.
- A teacher may upload or replace a Poster for any Team in the selected Block.
- A teacher may remove an invalid Poster after explicit confirmation.
- Each Team has one current Gallery Poster.
- Replacement history and uploader identity are retained for audit/recovery.
- Student and teacher uploads use the same validation rules.

#### Accepted file specification

| Rule | Requirement |
|---|---|
| Preferred format | PDF |
| Also accepted | PNG, JPG and JPEG |
| Page requirement | Exactly one page; multi-page content is rejected |
| Maximum file size | 5 MB |
| Recommended page size | A3 or A4 |
| Orientation | Portrait or landscape |
| Recommended quality | Text readable when fitted to a normal desktop screen; images preferably at least 1600 px on the long edge |
| Unsupported files | DOCX, PPTX, multi-page PDF, animated images and executable/archive formats |
| Filename handling | Safe generated storage name; original filename retained only as metadata |
| Replacement | Becomes the Team's new draft only after validation succeeds |

The upload UI must show the rules before file selection and return a specific,
student-friendly validation message when a file is rejected.

#### Storage and publication behaviour

- Store original accepted files in private, Block-scoped storage.
- Never expose a permanent public storage URL.
- Generate a consistent Gallery preview from PDF, PNG or JPG input.
- Preserve the original file for teacher download and recovery.
- Preview-generation failure must remain a recoverable processing state and must
  never silently publish a broken Poster.
- Upload/replace and publish are separate actions.
- Replacing a Poster does not alter the currently published Gallery snapshot
  until the teacher publishes again.
- Default Gallery state is Hidden.

Before implementation, confirm private object storage, server-side PDF page-count
validation and preview generation against the Vercel/Supabase deployment
constraints.

#### Teacher workflow

- Manage Posters by Teaching Block.
- See Missing, Processing, Ready and Published status per Team.
- Preview each Poster before publication.
- Upload/replace on behalf of a Team.
- Remove an invalid Poster with confirmation.
- Publish or hide the whole Gallery for the selected Block.
- A missing Poster does not block Gallery publication; that Team is clearly shown
  as unavailable.

#### Student workflow

- The public Landing Page may announce that the Week 3 Gallery is open but never
  displays Poster content.
- Poster content requires login and is limited to the student's current Block.
- Gallery cards show Team Number, Project Name, Poster preview and feedback
  status.
- Students can enlarge the Poster and choose **Give feedback** from the same
  context.
- Students cannot review their own Team.
- Duplicate feedback remains blocked.
- Completed target Teams show **Feedback completed**.
- Gallery visibility remains teacher-controlled and independent of normal weekly
  activity activation.

#### Security and privacy

- Posters are class-only learning material, not public assets.
- Storage access uses short-lived authorised access or a protected server
  endpoint.
- Students cannot list Posters from another Block or write to another Team.
- Database/storage policies enforce the same rules as the UI.
- Teacher operations reuse the existing teacher-role boundary.
- Student-facing Poster metadata does not expose Student ID, email or uploader
  identity unnecessarily.
- Migration and reproducible storage-policy setup are required before release.

#### Phase 1 acceptance criteria

- A Team student can upload a valid one-page PDF, PNG or JPG no larger than 5 MB.
- Invalid type, oversize file and multi-page PDF are rejected clearly.
- A student cannot upload for another Team.
- A teacher can upload, replace and remove any Team Poster in the selected Block.
- Mixed PDF/image inputs appear in a consistent Gallery layout.
- Public pages never reveal Poster content or permanent storage URLs.
- Hidden Gallery content cannot be retrieved through normal student access or
  direct unauthorised requests.
- Publishing exposes only the selected Block's published snapshot.
- Later replacements remain draft until the teacher publishes again.
- Poster → Peer Feedback is a direct student flow.
- Own-Team and duplicate-review protections remain effective.
- Hiding the Gallery does not delete Posters or existing feedback.

### Phase 2 — Session Task & Work Track

#### Teaching purpose

Session Check-in currently proves that a student attended, but it does not show
enough about the work performed during that studio. Every relevant studio session
should therefore carry a clear teacher task and allow each checked-in student to
leave a small, structured work-evidence record.

This is deliberately lighter than a weekly activity and much lighter than a
project-management tool.

#### Teacher Session Task

Extend the existing teacher-managed Session with a lightweight task definition:

- **Today's task** — a short description of what the class should focus on.
- **Expected evidence** — optional short guidance describing what students should
  be able to show by the end of the session.

The task belongs to the Session and is visible with that Session context. Existing
Session open/close/scheduling behaviour remains authoritative.

Example:

> **Today's task:** Finalise the Poster and identify remaining final-report gaps.  
> **Expected evidence:** Updated Poster, document change, completed feature or
> test result.

#### Student Work Track

After check-in, the active Session exposes **Today's Task → My Work Track**.
Student input should be quick and structured:

1. **Work area**
   - Development
   - Testing
   - Documentation
   - Poster / Presentation
   - Project management
   - Other
2. **What did you complete / progress today?**
   - one short text response, not a reflection essay
3. **Evidence type**
   - Demo shown
   - Code / feature
   - Test result
   - Document updated
   - Poster / presentation
   - Other
   - Not completed yet
4. **Status**
   - Completed
   - In progress
   - Blocked
5. **Need teacher help?**
   - No
   - Yes

The student may update the Work Track while the Session is open so it can reflect
actual end-of-session progress rather than only an intention recorded at arrival.

#### Teacher view

For the selected Session, the teacher can see attendance and Work Track together
without conflating them:

- Student / Team
- Checked-in state and time
- Work area
- Work status
- Evidence type
- Need teacher help
- short completion/progress note

The view should make **Needs teacher help** and **Blocked** easy to notice while
keeping the underlying student response accessible.

A missing Work Track is shown as missing evidence; it does not retroactively
change a valid attendance check-in.

#### Data and lifecycle rules

- One Work Track per Student per Session.
- Session, Student, Block, Team and Project context come from authoritative
  existing records rather than student re-entry.
- Attendance stays immutable under the existing Sprint 5 rules.
- Work Track can be created/updated only within the authorised Session workflow;
  teacher recovery rules, if needed, must be explicit rather than destructive.
- Historical Session tasks and Work Tracks remain readable after the Session
  closes.
- No automatic score, grade, penalty or risk classification is derived from Work
  Track fields.
- Sprint 6 stores source evidence; cross-session trend calculations are deferred
  to Sprint 7.

#### Phase 2 acceptance criteria

- A teacher can define/edit the task and optional expected evidence for an
  appropriate Session.
- A checked-in student sees the current Session task without re-entering identity,
  Team or Project.
- A student can save and update one lightweight Work Track for that Session while
  the Session is open.
- Another student cannot read or change private Work Track details outside the
  authorised experience.
- A teacher can review the selected Session's attendance and Work Track status
  together.
- Blocked/help-needed evidence is easy for the teacher to identify.
- Missing Work Track does not alter attendance.
- Closed historical Sessions retain their task and Work Track evidence.
- No Sprint 7 trajectory, analytics or AI interpretation is introduced here.

### Phase 3 — Production Hardening & Sprint Close

- Validate Student, Teacher and unauthorised role boundaries.
- Validate database RLS, private Poster storage and Block isolation.
- Test Poster upload, validation, preview, replace, publish/hide and recovery.
- Test Session task lifecycle, Work Track save/update, Session close and history.
- Verify existing attendance and weekly activities are not regressed.
- Run production build and migration verification.
- Update README, AI Context, Architecture, Roadmap, Changelog and Sprint Handoff.
- Record verified Production evidence before closing Sprint 6.

## Deferred explicitly to Sprint 7

- Student and Team Trajectory across weeks/sessions
- Block Teaching Analytics
- attendance vs activity/work-evidence comparisons
- Block/Team/Project/Student-aware enhanced evidence exports
- AI-assisted evidence summaries
- concern clustering and suggested teacher interventions
- any cross-session interpretation of Work Track evidence

## Explicitly out of scope

- Public Poster hosting or search-engine indexing
- Posters from another Teaching Block
- multi-page slide decks or in-platform Poster editing
- automatic Gallery publication based only on calendar date
- general-purpose task boards, assignments, sprints or Jira-like workflows
- file/code repository attachment management for each Work Track
- automatic marking from attendance, Work Track or Poster data
- AI judging Poster quality or student performance
