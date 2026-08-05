# Sprint 6 Plan — Poster Gallery & Session Work Evidence

**Status:** In progress — Phase 2A merged; Phase 2B in implementation
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
| Maximum file size | 1 MB |
| Recommended page size | A3 or A4 |
| Orientation | Portrait or landscape |
| Recommended quality | Text readable when fitted to a normal desktop screen; images preferably at least 1600 px on the long edge |
| Unsupported files | DOCX, PPTX, multi-page PDF, animated images and executable/archive formats |
| Filename handling | Safe generated storage name; original filename retained only as metadata |
| Replacement | Becomes the Team's new draft only after validation succeeds |

The upload UI must show the rules before file selection and return a specific,
student-friendly validation message when a file is rejected.

The 1 MB limit is also a teaching constraint: the Poster should behave like a
project advertisement, not a mini report. Prefer one strong visual idea and
short, high-impact copy over dense text or oversized imagery.

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

- A Team student can upload a valid one-page PDF, PNG or JPG no larger than 1 MB.
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

### Phase 2 — Session Journey, Task & Work Track

#### Teaching purpose

Model the full NIT3004 block as one coherent ten-session Project Journey rather
than a set of disconnected weekly forms. Session Check-in proves attendance;
the Session Task explains the teaching focus; Work Track evidence shows how each
student moves from inherited project work to final delivery. Weekly Activities
remain a separate Monday teaching-interaction evidence stream.

For the current 2026 · 2B1 block, Sessions 1–5 have already happened. They remain
visible as historical, closed sessions and are never reopened simply to backfill
missing Work Track data. The same S1–S10 definitions are reusable from the
beginning for future Teaching Blocks.

The overall journey remains:

> **Commit → Prove → Validate → Deliver**

#### Master Session Journey

| Session | Week | Session focus | Current 2B1 behaviour |
|---|---|---|---|
| S1 | Week 1 | **Project Reconnect & Check-in** | Historical / closed |
| S2 | Week 1 | **Team Alignment & Four-Week Commitment** | Historical / closed |
| S3 | Week 1 | **Project Progress & Work Focus** | Historical / closed |
| S4 | Week 2 | **Progress Pre-check** | Historical / closed |
| S5 | Week 2 | **Progress Review** | Historical / closed |
| S6 | Week 2 | **Review → Action** | First live Session Task / Work Track |
| S7 | Week 3 | **Application Progress + Technical Implementation Report** | Upcoming |
| S8 | Week 3 | **Completion Check + Product Verification** | Upcoming |
| S9 | Week 3 | **Final Readiness** | Upcoming |
| S10 | Week 4 | **Platform Feedback + Final Presentation** | Upcoming |

The journey is a curriculum structure, not a scoring model. A historical Session
may legitimately contain Check-in but no Work Track.

#### Historical Sessions S1–S5

Do not fabricate or request retrospective Work Track submissions for the current
2B1 block.

- Keep only the real Session Check-in history associated with S1–S5.
- Existing Week 1 / Week 2 Activities remain in the independent Weekly Activity
  system and are not re-labelled as Session evidence.

If no historical evidence exists, show that honestly rather than presenting a
missing submission as a failure. S1–S5 remain closed/read-only for current 2B1,
but their task definitions are retained so future blocks can use the complete
journey.

#### Common Session model

Each Session can contain three related but distinct elements:

1. **Session Check-in** — attendance evidence governed by existing Session
   open/close/scheduling rules.
2. **Session Task** — the teaching focus and optional teacher guidance for that Session.
3. **My Work Track** — lightweight individual evidence of what the student
   actually progressed, where that Session uses Work Track.

Teacher-defined task fields remain lightweight:

- **Today's task** — short Session focus/guidance.
- **Expected evidence** — optional concise description of what students should be
  able to demonstrate by the end of the Session.

Student identity, Block, Team and Project are always derived from authoritative
roster/auth context; students do not re-enter them.

#### Shared Completion Standard — S6–S9

Work Track percentage is an evidence-based measurement, not a student estimate or
a mark. Every IT Milestone Project starts from the same three locked core requirements:

1. **Core functionality** — meets the primary user needs.
2. **End-to-end integration & usability** — the main workflow works across integrated components.
3. **Verification & quality** — critical features are tested or validated with evidence.

Students assess those three requirements rather than writing them. Each fixed core
requirement has a `?` help control with a short **What this means** explanation and
practical IT examples, so teams interpret the baseline consistently. They may optionally
add up to five project-specific requirements where that improves accuracy. All assessed
requirements use one standard:

| Requirement state | Completion contribution |
|---|---:|
| Not started | 0% |
| Started / design only | 25% |
| Partially implemented | 50% |
| Working in main flow | 75% |
| Working + verified with evidence | 100% |

The platform calculates the arithmetic mean across the committed requirements.
100% therefore means the requirements are implemented, demonstrable and verified;
it does not merely mean that code has been written.

S7–S9 carry forward the same requirement list and current scores so the team can
update evidence without redefining the baseline. The previous calculated percentage
is shown for context; longitudinal interpretation remains Sprint 7 scope.

Teacher review uses the same standard. The teacher can **Confirm** the calculated
percentage or **Adjust** it after demo/verification. An adjustment requires a
structured reason, preserving Student calculated % and Teacher verified % as
distinct evidence.

#### S6 — Review → Action

S6 converts the completed Week 2 review into measurable action without repeating
the Pre-check. The calculated completion selects one of three lightweight paths:

- **≤70% — Building / Developing:** what is still being built, the main blocker,
  and the next focus.
- **71–90% — Completing:** what remains, end-to-end workflow state, evidence
  available today, and the next focus.
- **>90% — Verifying / Finalising:** what is being verified, critical-issue state,
  product confidence, and the next focus.

Branching is deliberately limited to these three paths. The percentage is never
entered directly by the student.

#### S7 — Application Progress + Technical Implementation Report

S7 checks both the application and the structure of the Technical Implementation
Report. It is a readiness/evidence check, not a request to write the report
inside the platform.

**Application progress**

- Shared requirement-based calculated completion and change from the previous Track.
- Integration status.
- Major unresolved functionality.
- Whether the application can currently be demonstrated end-to-end.

**Technical Implementation Report structure**

Show the expected sections as a checklist/readiness grid:

- System / solution architecture
- Implementation approach
- Key technical components
- Data / integration
- Testing approach
- Technical challenges
- Evidence / screenshots

Each section uses a small state such as **Not started / Draft / Ready**. The
teacher should be able to use this view during the Session to identify missing
structure quickly.

#### S8 — Completion Check + Product Verification

S8 makes completion and verification explicit before the final-readiness gate.

**Project completion**

Reuse the shared requirement-based calculated completion; do not ask for a second
subjective project-completion estimate.

**Final Report completion**

Use the same completion bands and structured selection of any remaining report
areas rather than a long free-text response.

**Product Verification**

Check whether:

- Core requirements have been verified.
- Critical workflows have been tested.
- An end-to-end scenario has been tested.
- Known defects have been reviewed.
- The demo environment is working.
- Verification evidence is available.

Summarise the student's declared state as:

- **Not Ready**
- **Partially Verified**
- **Verified**

This is descriptive evidence only and must not become an automatic mark.

#### S9 — Final Readiness

S9 is the final delivery gate before Presentation. It should emphasise readiness,
not another generic progress form.

Show four readiness areas:

| Area | State |
|---|---|
| Product | Ready / Attention / Not Ready |
| Final Report | Ready / Attention / Not Ready |
| Presentation | Ready / Attention / Not Ready |
| Demo | Ready / Attention / Not Ready |

Also capture:

- **Any critical blocker?** — Yes / No, with a short note only when needed.
- **Overall readiness** — Not Ready / Almost Ready / Ready to Present.

The Teacher view should make teams/students needing attention immediately visible
while preserving the underlying evidence.

#### S10 — Platform Feedback + Final Presentation

S10 does not use the normal Work Track. Before presenting, every student must
complete a short individual Platform Feedback checkpoint.

Required feedback should stay concise and structured:

1. **Overall usefulness** — 1–5.
2. **Did the platform help you stay engaged with the project?** —
   Yes / Somewhat / No.
3. **Most useful feature** — Session Check-in / Weekly Activities / Teacher Review
   / Poster Gallery / Work Track / Peer Feedback.
4. **What should we improve most?** — Navigation / Activities / Feedback /
   Session workflow / Poster / Other.
5. **Would you recommend this platform for future Capstone classes?** —
   Yes / Maybe / No.
6. **One thing you would change** — optional short text.

After submission, show:

> **Platform feedback completed — you are ready for your Final Presentation.**

The Teacher view shows each student's **Feedback Completed / Pending** state so
completion can be checked immediately before presentations. This is a workflow
checkpoint, not a presentation grade.

#### Student Journey UI

Introduce a clear **Your Project Journey** view from S1 through S10.

- Past Sessions are visibly completed/closed and remain readable where historical
  evidence exists.
- The current open Session is prominent.
- Upcoming Sessions show their focus without allowing early submission unless
  explicitly opened by the teacher/session schedule.
- Opening Track shows its Session Task and Work Track or
  S10 Feedback as appropriate.
- Historical missing evidence is described neutrally; it is not rendered as a
  failure or penalty.
- Existing Week activities remain valid independent teaching evidence and are not
  duplicated or mapped into the Session Journey.

#### Teacher view and lifecycle

- Teacher manages the ten Session definitions within the selected Teaching Block.
- Existing Session scheduling/open/close behaviour remains authoritative.
- Teacher can see attendance and relevant task/activity/Work Track evidence in
  one Session context without conflating the records.
- For S6–S9, Blocked / Need teacher help / readiness states are easy to notice.
- For S10, individual Platform Feedback completion is easy to check before
  Presentation.
- One Work Track per Student per Session where Work Track is enabled.
- Work Track is editable only through the authorised open-Session workflow;
  historical evidence remains readable after close.
- Future Teaching Blocks can use all S1–S10 definitions from the start.
- No automatic score, grade, penalty or predictive risk classification is
  derived from Journey or Work Track fields.
- Cross-session analytics and interpretation remain Sprint 7 work.

#### Phase 2 implementation slices

**Phase 2A — Session Journey foundation**

Implementation status: **implemented for Preview validation**.

- Represent S1–S10 focus/definition consistently.
- Keep Session Check-in attendance-only; do not map Weekly Activity evidence into it.
- Add the complete S1–S10 Session Journey with historical/open/upcoming behaviour.
- Add a separate Track entry point from each Session card into Session Task + Work Track.
- Preserve Weekly Activities as an independent Monday teaching-interaction evidence stream.
- Persist stable Session Number, Week and curriculum focus on existing `studio_sessions` without changing attendance or teacher-authored dates/windows.
- Current 2026 · 2B1 S1–S5 are explicitly closed by the idempotent Phase 2A migration; no historical Work Track is created.
- Student Journey RPC returns only Session curriculum/lifecycle and the student's own Check-in status; it does not return Weekly Activity evidence.
- For current 2B1, S1–S5 Track is closed; live Track opens independently with the relevant Session and is implemented in Phase 2B.
- Future 10-session plans use the real Mon/Wed/Thu, Mon/Wed/Thu, Mon/Wed/Thu, Mon course rhythm from the Teaching Block start date.

**Phase 2B — Live Work Track S6–S9**

- Implement the shared Session Task / Work Track foundation.
- Implement the Session-specific structured evidence for S6, S7, S8 and S9.
- Calculate project completion from 3 locked IT core requirements plus up to 5 optional
  project-specific requirements using the shared 0/25/50/75/100 evidence standard;
  never ask students to invent the common baseline or estimate the final percentage.
- Use three progress paths (≤70 / 71–90 / >90) in S6 so different team stages get
  relevant questions without creating a large decision tree.
- Carry the same requirement baseline and prior percentage into later Tracks.
- Let Teacher Review confirm or adjust calculated completion with a recorded reason.
- Carry forward useful prior-session context such as S6 next focus where it helps
  the next Session without turning the system into task management.
- Add the teacher Session evidence view.

**Phase 2C — S10 Platform Feedback**

- Add the mandatory individual feedback checkpoint before Presentation.
- Add teacher Completed / Pending visibility.
- Keep feedback concise, non-graded and reusable for platform improvement.

#### Phase 2 acceptance criteria

- The student experience represents the complete S1–S10 Project Journey.
- Current 2B1 S1–S5 are closed/read-only and do not request retrospective Work
  Track submissions.
- Existing Weekly Activity evidence remains in its current independent activity system and is not reused as Session evidence.
- Future blocks can use the same S1–S10 definitions from the beginning.
- S6 captures Review → Action evidence without duplicating the Week 2 Pre-check.
- Project completion is server-calculated from requirement evidence; 100% requires
  working + verified evidence, and Teacher Review can confirm or adjust the result.
- S7 captures Application progress and Technical Implementation Report structure.
- S8 captures Project/Final Report completion plus Product Verification.
- S9 captures Product, Report, Presentation and Demo Final Readiness.
- S10 requires each student to complete Platform Feedback before Presentation and
  exposes Completed/Pending state to the teacher.
- Student identity/Block/Team/Project context is derived from existing
  authoritative records.
- Closed historical Sessions retain only their real Session Check-in history; no Weekly Activity is presented as Session evidence.
- Session Check-in and Work Track remain separate records: attendance never implies Work Track completion, and missing Work Track never changes attendance.
- No Sprint 7 trajectory analytics, automatic marking or AI interpretation is
  introduced in Phase 2.

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
