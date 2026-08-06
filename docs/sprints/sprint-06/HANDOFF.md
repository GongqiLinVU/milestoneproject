# Sprint 6 Handoff

## Current gate

**Phase 1 — Week 3 Poster Gallery** has passed classroom-path testing and was
squash-merged to `main` in PR #50 on 5 August 2026.

**Phase 2A — Session Journey Foundation** passed Preview testing and was squash-merged to `main` in PR #52 on 5 August 2026.

**Phase 2B — Live Work Track S6–S9** passed Preview testing and was squash-merged to `main` in PR #53 on 6 August 2026.

**Phase 2C — S10 Platform Feedback** is the current implementation / Preview gate.

Phase 2C adds the short individual feedback checkpoint before Final Presentation. It is separate from Work Track and non-graded; Teacher sees Completed / Pending immediately.

### Phase 2C Preview setup

Run in the Preview Supabase SQL Editor:

`supabase/migrations/20260806_sprint6_phase2c_platform_feedback.sql`

Then test:

1. Open S10 as Teacher and confirm the student Journey shows `Feedback →` rather than Work Track.
2. Submit the five required structured questions; confirm the optional change note may be blank.
3. Confirm completion changes to `Feedback completed` and reopening S10 shows the saved response.
4. Teacher S10 → Feedback status shows each roster student as Completed / Pending.
5. Close S10 and confirm submitted feedback remains readable but cannot be edited.
6. Confirm S6–S9 Work Track, Session Check-in and Weekly Activities are unchanged.
7. Close any Session, confirm Teacher can `Reopen` it with existing attendance/evidence preserved, then `Reset status` and confirm it returns to Not opened without deleting student records.

Local verification: `npm run build` and `git diff --check` pass for the complete Phase 2C diff.

### Phase 2B reference

Phase 2B uses requirement-based, server-calculated completion with limited branching by progress stage and Teacher confirm/adjust verification.

### Phase 2B Preview setup

Run in the Preview Supabase SQL Editor:

`supabase/migrations/20260805_sprint6_phase2b_session_work_track.sql`

Then test:

1. Open S6 and add 3–8 committed requirements. Confirm each can only use the 0/25/50/75/100 evidence standard.
2. Confirm the overall percentage is calculated automatically and cannot be directly entered.
3. Verify the calculated percentage opens the correct S6 path: ≤70 Building/Developing, 71–90 Completing, >90 Verifying/Finalising.
4. Save S6, then open S7 and confirm the same requirement baseline plus previous completion carry forward; update requirement states and confirm the new percentage/change.
5. Confirm S7 Technical Report, S8 Product Verification and S9 Final Readiness keep their distinct Session-specific checks.
6. Teacher Sessions → Work Track should show the student's calculated %, requirement detail, and let the teacher Confirm or Adjust completion; Adjust requires a reason.
7. Close a Session and confirm saved Track evidence remains read-only.
8. Confirm Session Check-in, Weekly Activities and Poster Gallery remain independent and unchanged.

Because the Preview migration was already run before this measurement refinement,
rerun the same Phase 2B migration once after this PR update; it is idempotent and
will add/update the verification fields and RPCs.

### Phase 2A migration reference

Run in the Preview Supabase SQL Editor:

`supabase/migrations/20260805_sprint6_phase2a_session_journey.sql`

Then test 2026 · 2B1 as both teacher and student:

1. Teacher Session Check-in shows S1–S10 with the agreed Week/focus labels.
2. S1–S5 are Closed; S6–S10 retain their existing lifecycle state.
3. Student Sessions shows all ten sessions with only real Check-in state; no Weekly Activity evidence appears inside Session cards.
4. S1–S5 show Track closed; the current live Session exposes `Track →` into the independent Session Task + Work Track area.
5. Existing Check-in still opens/closes only through the original session controls.
6. Existing Week activity activation still controls Weekly Activity submission independently.

S10 Platform Feedback is implemented in Phase 2C above.

### Phase 2 agreed direction

- Keep the complete S1–S10 curriculum journey visible and reusable.
- For current `2026 · 2B1`, S1–S5 are historical/closed: keep their real Check-in history and never reopen them to backfill Work Track.
- S6 begins the live Work Track with **Review → Action**, using requirement-based calculated completion and three lightweight progress paths.
- S6–S9 reuse the same 3–8 committed requirements with 0/25/50/75/100 evidence states; the server calculates the percentage and later Sessions show change from the previous Track.
- Teacher Review can confirm the calculated percentage or adjust it with a recorded reason.
- S7 checks **Application Progress + Technical Implementation Report structure**.
- S8 checks **Project/Final Report completion + Product Verification**.
- S9 is the **Final Readiness** gate for Product, Report, Presentation and Demo.
- S10 requires short individual **Platform Feedback before Final Presentation**;
  the teacher sees Completed/Pending.
- Existing Session Check-in remains attendance evidence; Weekly Activities remain separate Monday teaching evidence; Session Task + Work Track is an independent progress area reached through `Track →`.
- Keep input structured and short. Do not turn the feature into Jira, marking or
  automatic risk classification.
- Implement in 2A Journey foundation, 2B live S6–S9 Work Track, then 2C S10
  Platform Feedback.

## Phase 1 implementation

- Private `poster-gallery` Supabase Storage bucket, capped at 1 MB and limited
  to PDF/PNG/JPEG.
- Immutable Poster version history with separate Team draft and published
  pointers.
- Student upload/replace is restricted to the authenticated roster Team.
- Teacher upload/replace supports any Team in the selected Teaching Block.
- Upload files travel directly from browser to private Supabase Storage using a
  short-lived signed upload token; Poster bytes do not need to pass through the
  application API.
- Server-side finalisation downloads the private object, verifies size and file
  signature, and verifies that PDF files contain exactly one page using
  `pdf-lib`. Failed validation removes the staged object.
- Gallery preview uses a short-lived signed read URL; no public bucket URL is
  created.
- Teacher Publish copies draft pointers into the Block's published snapshot.
  Later replacement does not change that snapshot until Publish is used again.
- Teacher Hide preserves Posters and peer-review evidence.
- Student Gallery is Block-scoped and shows Team, Project, Poster and feedback
  completion state.
- `Give feedback` opens the existing Poster Peer Review form with the Gallery
  Team fixed as the target. Own-Team and duplicate protections remain database
  enforced.
- Poster Gallery publication is the Peer Feedback gate, independent of the broad
  Week 3 activity switch.

## Upload architecture decision

The accepted Poster limit is 1 MB. Files still upload directly to the private
Supabase bucket using a short-lived token: this keeps file transfer separate from
the application API and preserves the existing private-storage design. The API
then validates the stored object before it becomes a Team draft.

## Required migration before Preview testing

Run in the Preview Supabase SQL Editor:

`supabase/migrations/20260805_sprint6_phase1_poster_gallery.sql`

The migration creates the private Storage bucket, Gallery/version tables,
Block-scoped RPCs and the Gallery-controlled Poster Peer Review policy.

No new Vercel secret is required. The Poster API reuses the existing
`SUPABASE_SERVICE_ROLE_KEY` server-only environment variable from Sprint 5.

## Preview test checklist

### Student

1. Log in as a prepared/activated student and open Week 3.
2. Confirm `Your Team Poster` identifies the roster Team without asking the
   student to select a Team.
3. Upload a valid one-page PDF below 1 MB; confirm it becomes the Team draft.
4. Replace it with PNG or JPEG and confirm the new draft appears.
5. Confirm a PDF with two pages is rejected with an exact one-page message.
6. Confirm DOCX/PPTX and a file over 1 MB are rejected with the concise-design guidance.
7. Before Publish, confirm the student can preview/enlarge their own current Team draft while the rest of the Gallery remains hidden.
8. Replace the Team draft and confirm the own-Team preview immediately shows the replacement.
9. After teacher Publish, confirm only the current Block's Team cards appear.
10. Enlarge another Team Poster and choose **Give feedback**.
11. Confirm the target Team is fixed in the form, own Team has no feedback
    button, and an already-reviewed Team shows **Feedback completed**.

### Teacher

1. Open **Teacher Dashboard → Poster Gallery** and select the Preview Block.
2. Confirm every Team appears as Missing or Ready with its current project.
3. Upload/replace a Poster on behalf of one Team and preview it.
4. Publish the Gallery; confirm Ready versions become the student snapshot.
5. Replace one Team Poster after publishing; confirm students still see the old
   snapshot and the teacher sees `Draft changed`.
6. Publish again; confirm students now see the replacement.
7. Hide the Gallery; confirm Posters disappear from student access but are not
   deleted from teacher management.
8. Remove a disposable draft using the explicit confirmation flow.

### Security / isolation

1. A student cannot upload for another Team by changing browser/API payloads.
2. A student from another Block cannot obtain a signed URL for this Block's
   Poster version.
3. While the Gallery is hidden, students can obtain a signed read URL only for their own Team's current draft; other Team and non-current versions remain unavailable.
4. Storage bucket listing is unavailable to normal browser roles.

## Verification already completed locally

- `npm run build` passes.
- `api/poster.ts` bundles successfully for Node 20 via esbuild.
- `git diff --check` passes.

## Not included in Sprint 6 Phase 2C

- Sprint 7 trajectory, analytics, enhanced export or AI insight.
- Automatic Poster scoring or public Poster hosting.
