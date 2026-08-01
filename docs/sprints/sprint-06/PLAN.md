# Sprint 6 Plan — Evidence, Poster Gallery and Teaching Insight

**Status:** Planned
**Source baseline:** Sprint 5 closed on 1 August 2026
**Product area:** NIT3004 Engineering Studio Platform

## Sprint goal

Turn the authenticated Week 1–4 evidence into a clearer student journey and a
more useful teaching view, while adding a controlled Week 3 Poster Gallery that
lets students inspect each project before giving peer feedback.

Sprint 6 extends the stable identity, activity-control and teacher-review
foundation delivered in Sprint 5. It does not reopen or revise the completed
Sprint 5 scope.

## Delivery principles

- Keep every phase independently reviewable and production-testable.
- Reuse roster-authoritative Block, Team and Project context.
- Keep student work private to authenticated members of the relevant Teaching
  Block.
- Present descriptive evidence and teaching signals; do not generate marks,
  disciplinary decisions or unsupported risk labels.
- Require teacher control for classroom publication.
- Preserve source evidence and make AI output traceable to that evidence.

## Proposed delivery sequence

### Phase 1 — Student and Team Trajectory

- Summarise Week 1–4 evidence as Submitted, Missing or Not required.
- Support Block, Team, Project and Student filters.
- Allow teachers to open the original evidence from a trajectory item.
- Show progress descriptively without automatic scoring or risk prediction.
- Define how historical and retired activities appear without returning them to
  the active student experience.

### Phase 2 — Week 3 Poster Gallery and Feedback Entry

#### Teaching purpose

Make Poster Peer Review easier and more evidence-based. Students first inspect a
Team's Poster and project context, then enter feedback for that Team from the
same Gallery card.

#### Upload ownership

- A logged-in student may upload or replace the current Poster for their own
  Team.
- A teacher may upload or replace a Poster for any Team in the selected Block.
- A teacher may remove an invalid Poster after explicit confirmation.
- Each Team has one current Poster version in the Gallery.
- Replacement history and uploader identity are retained for audit and recovery.
- Student and teacher uploads use the same validation rules.

#### Accepted file specification

| Rule | Requirement |
|---|---|
| Preferred format | PDF |
| Also accepted | PNG, JPG and JPEG |
| PDF length | Exactly one page |
| Maximum file size | 15 MB |
| Image orientation | Portrait or landscape |
| Recommended quality | Text readable when fitted to a normal desktop screen; images should preferably be at least 1600 px on the long edge |
| Unsupported files | DOCX, PPTX, multiple-page PDF, animated images and executable/archive formats are rejected |
| Filename handling | The system generates a safe storage name; the original filename is retained only as metadata |
| Replacement | Replaces the Team's current version only after the new file passes validation |

The upload control must show these rules before file selection and return a
specific, student-friendly validation message when a file is rejected.

#### Storage and preview behaviour

- Store the original accepted file in private, Block-scoped storage.
- Do not expose a permanent public storage URL.
- Generate a consistent Gallery preview image from PDF, PNG or JPG input.
- Use the first and only PDF page as its preview.
- Preserve the original file for teacher download and recovery.
- The Gallery card uses the generated preview so mixed input formats have a
  consistent layout and loading behaviour.
- Preview generation failure must not silently publish a broken Poster; show the
  Team and teacher a recoverable processing state.
- File replacement must not change a previously published Gallery until the
  teacher publishes the updated Gallery state.

#### Teacher workflow

- Manage Posters by Teaching Block.
- See Missing, Processing, Ready and Published status per Team.
- Preview each Poster before publication.
- Upload or replace on behalf of a Team.
- Publish or hide the entire Gallery for the selected Block.
- Default Gallery state is Hidden.
- Publishing is an explicit teacher action intended for Week 3.
- Hiding the Gallery prevents further viewing without deleting Posters or peer
  feedback.
- A missing Poster does not block publication; its Team card clearly shows
  Poster not available.

#### Student workflow

- The public Landing Page may announce that the Week 3 Poster Gallery is open,
  but never displays Poster content.
- Poster content is available only after student login and only for the
  student's current Teaching Block.
- The authenticated portal displays Team Number, Project Name, Poster preview
  and feedback status.
- Students can enlarge the Poster and then choose Give feedback.
- Students cannot review their own Team.
- Duplicate feedback remains blocked.
- Completed target Teams show Feedback completed.
- The Gallery and Poster upload control are not assumed to open automatically
  with Week 3 activities; the teacher retains explicit publish/hide control.

#### Security and privacy

- Posters are treated as class-only learning material, not public assets.
- Storage access uses short-lived authorised access or a protected server
  endpoint.
- Students cannot list Posters from another Block or write to another Team.
- Database and storage policies enforce the same rules as the UI.
- Teacher operations use the existing teacher role boundary.
- Poster metadata must not expose unnecessary Student ID, email or uploader
  identity to other students.
- A migration and reproducible storage-policy setup are required before release.

#### Phase 2 acceptance criteria

- A Team student can upload a valid one-page PDF, PNG or JPG no larger than
  15 MB.
- Invalid type, oversize file and multi-page PDF are rejected before publication
  with clear messages.
- A student cannot upload for another Team.
- A teacher can upload, replace and remove any Team Poster in the selected Block.
- Mixed PDF and image uploads appear in a consistent Gallery layout.
- The public Landing Page never reveals Poster content or storage URLs.
- Hidden Gallery content cannot be retrieved by a student through the normal
  application or direct unauthorised requests.
- Publishing exposes only the selected Block's current published Poster
  snapshots.
- Later replacements remain draft until the teacher publishes again.
- Students can move from a target Team's Poster directly to its Peer Feedback
  form.
- Own-Team and duplicate-review protections remain effective.
- Hiding the Gallery does not delete Posters or existing feedback.

### Phase 3 — Block Teaching Analytics and Enhanced Export

- Summarise participation and completion at Block level.
- Compare Session Attendance with Activity Completion without treating either as
  an automatic mark.
- Surface unresolved support requests and teacher follow-up continuity.
- Add Block/Team/Project/Student-aware exports with stable headings.
- Preserve drill-down to the underlying evidence.

### Phase 4 — AI-assisted Teaching Insight

- Generate weekly evidence summaries that cite source records.
- Cluster common concerns without exposing unnecessary student identity.
- Suggest teacher interventions and reflection prompts.
- Keep all output advisory and teacher-controlled.
- Do not automatically change status, marks, attendance or follow-up records.

### Phase 5 — Production Hardening and Sprint Close

- Validate Student, Teacher and unauthorised role boundaries.
- Validate database RLS and private Poster storage policies.
- Test file replacement, preview processing, publish/hide and recovery paths.
- Run relevant production build and migration verification.
- Update README, AI Context, Architecture, Roadmap, Changelog and Sprint Handoff.
- Record verified Production evidence before closing Sprint 6.

## Explicitly out of scope

- Public Poster hosting or search-engine indexing
- Student access to Posters from another Teaching Block
- Multiple active Posters per Team
- Multi-page presentations or slide-deck viewers
- Editing PDF/image content inside the platform
- AI judging Poster quality or generating marks
- Automatic Gallery publication based only on calendar date

## Initial implementation note

Before Phase 2 implementation begins, confirm the selected private object
storage, server-side PDF page-count validation and preview-generation approach
against the Vercel/Supabase deployment constraints. The product requirements in
this plan remain stable even if the implementation technology changes.
