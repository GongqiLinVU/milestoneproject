# Sprint 6 Phase 3 — Production Validation

**Status:** In progress

**Production target:** `https://milestoneproject-two.vercel.app/`

**Rule:** Record evidence; do not infer a pass from UI visibility alone.

## Gate 1 — Build and database baseline

- [x] Latest `main` production build passes locally (`npm run build`, 12 August 2026).
- [ ] Production Vercel deployment is healthy for the tested commit.
- [ ] All Sprint 6 migrations and hotfix migrations have been applied in Production.
- [ ] Run `supabase/scripts/sprint6_phase3_security_audit.sql` in Production.
- [ ] Audit returns no `FAIL` rows and the private Poster bucket is not public.
- [ ] Record tested commit SHA, Production deployment URL and audit timestamp below.

## Gate 2 — Unauthorised and public boundary

Use a signed-out/private browser window.

- [ ] Landing Page loads without exposing Poster content or storage URLs.
- [ ] `/admin` requires Teacher authentication.
- [ ] Student activities, Session Journey, Work Track and Platform Feedback cannot be read signed out.
- [ ] A copied Poster signed URL expires and is not a permanent public URL.

## Gate 3 — Student boundary

Use an activated student account in the current Block and, where available, a
student account from a different Block.

- [ ] Student sees only the roster-derived Block, Team and Project.
- [ ] Student cannot select or submit identity, Team or Block on behalf of another student.
- [ ] Student cannot open the Teacher Dashboard or teacher-only data.
- [ ] Student cannot upload/replace another Team's Poster by changing request data.
- [ ] Student from another Block cannot view a Poster version from the tested Block.
- [ ] Hidden Gallery exposes only the student's own current Team draft, never other Teams.
- [ ] Published Gallery exposes only published snapshots from the student's Block.
- [ ] Own-Team Poster feedback and duplicate target feedback remain blocked.

## Gate 4 — Poster lifecycle

- [ ] Valid one-page PDF at or below 1 MB uploads and previews.
- [ ] Valid PNG/JPEG at or below 1 MB uploads and previews.
- [ ] Oversize, unsupported, signature-mismatched and multi-page PDF files are rejected clearly.
- [ ] Replace changes the draft without changing the published snapshot.
- [ ] Publish updates the Block snapshot; missing Teams remain clearly unavailable.
- [ ] Hide removes student Gallery access without deleting Posters or feedback.
- [ ] Teacher can upload/replace any Team Poster and remove a disposable draft after confirmation.
- [ ] Existing Poster feedback remains visible after Gallery hide/re-publish.

## Gate 5 — Session Journey and Work Track

- [ ] S1–S5 remain historical/closed for current 2B1 without fabricated Work Track evidence.
- [ ] S6–S9 expose their correct task and structured Work Track only while open.
- [ ] Requirement scores accept only 0/25/50/75/100 and completion is server-calculated.
- [ ] S7 carries forward the requirement baseline and prior completion from S6.
- [ ] S7 Technical Report, S8 Product Verification and S9 Final Readiness checks remain distinct.
- [ ] Student can save, reopen and update Track evidence while the Session is open.
- [ ] Closing makes evidence read-only without deleting it.
- [ ] Teacher Confirm and Adjust both work; Adjust requires a reason.
- [ ] Reopen preserves attendance/evidence; Reset status changes lifecycle only and preserves records.

## Gate 6 — S10 Platform Feedback

- [ ] S10 shows `Feedback` rather than Work Track.
- [ ] Five required structured answers save; optional note may be blank.
- [ ] Reopening S10 displays the saved response.
- [ ] Teacher sees accurate Completed/Pending status for the full Block roster.
- [ ] Closing S10 preserves readable feedback and prevents editing.

## Gate 7 — Regression

- [ ] Session Check-in still opens/closes independently and preserves attendance history.
- [ ] Weekly Activity activation remains independent from Sessions and Poster Gallery.
- [ ] Week 2 Pre-check can be submitted and its Teacher Review can be saved, updated and reopened.
- [ ] Password reset shows `Password reset` and timestamp after refresh; downloaded credentials activate correctly.
- [ ] Existing student evidence is unchanged by password reset.
- [ ] Presentation Order draft/publish and CSV export still work.

## Production evidence

| Item | Result |
|---|---|
| Tested commit SHA | Pending |
| Vercel Production deployment | Pending |
| Supabase audit timestamp | Pending |
| Teacher test account | Pending (record identifier only; never record password) |
| Student test account / Block | Pending (record identifier only; never record password) |
| Cross-Block account | Pending / Not available |
| Tester and date | Pending |
| Failures / follow-up PRs | None recorded yet |

## Close decision

Sprint 6 may be marked **Closed** only when all available required checks pass,
any unavailable cross-Block test is explicitly documented, and the README,
AI Context, Architecture, Roadmap, Changelog and Handoff reflect the verified
Production state.
