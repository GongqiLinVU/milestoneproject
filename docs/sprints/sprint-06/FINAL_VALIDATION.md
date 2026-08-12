# Sprint 6 Phase 3 — Production Validation

**Status:** Closed — all Production validation gates passed on 12 August 2026

**Production target:** `https://milestoneproject-two.vercel.app/`

**Rule:** Record evidence; do not infer a pass from UI visibility alone.

## Gate 1 — Build and database baseline

- [x] Latest `main` production build passes locally (`npm run build`, 12 August 2026).
- [x] Production Vercel deployment is healthy for the tested commit.
- [x] All Sprint 6 migrations and hotfix migrations have been applied in Production.
- [x] Run `supabase/scripts/sprint6_phase3_security_audit.sql` in Production.
- [x] Audit returns no `FAIL` rows and the private Poster bucket is not public.
- [x] Record tested commit SHA, Production deployment URL and audit timestamp below.

## Gate 2 — Unauthorised and public boundary

Use a signed-out/private browser window.

- [x] Landing Page loads without exposing Poster content or storage URLs.
- [x] `/admin` requires Teacher authentication.
- [x] Student activities, Session Journey, Work Track and Platform Feedback cannot be read signed out.
- [x] A copied Poster signed URL expires and is not a permanent public URL.

## Gate 3 — Student boundary

Use an activated student account in the current Block and, where available, a
student account from a different Block.

- [x] Student sees only the roster-derived Block, Team and Project.
- [x] Student cannot select or submit identity, Team or Block on behalf of another student.
- [x] Student cannot open the Teacher Dashboard or teacher-only data.
- [x] Student cannot upload/replace another Team's Poster by changing request data.
- [x] Student from another Block cannot view a Poster version from the tested Block.
- [x] Hidden Gallery exposes only the student's own current Team draft, never other Teams.
- [x] Published Gallery exposes only published snapshots from the student's Block.
- [x] Own-Team Poster feedback and duplicate target feedback remain blocked.

## Gate 4 — Poster lifecycle

- [x] Valid one-page PDF at or below 1 MB uploads and previews.
- [x] Valid PNG/JPEG at or below 1 MB uploads and previews.
- [x] Oversize, unsupported, signature-mismatched and multi-page PDF files are rejected clearly.
- [x] Replace changes the draft without changing the published snapshot.
- [x] Publish updates the Block snapshot; missing Teams remain clearly unavailable.
- [x] Hide removes student Gallery access without deleting Posters or feedback.
- [x] Teacher can upload/replace any Team Poster and remove a disposable draft after confirmation.
- [x] Existing Poster feedback remains visible after Gallery hide/re-publish.

## Gate 5 — Session Journey and Work Track

- [x] S1–S5 remain historical/closed for current 2B1 without fabricated Work Track evidence.
- [x] S6–S9 expose their correct task and structured Work Track only while open.
- [x] Requirement scores accept only 0/25/50/75/100 and completion is server-calculated.
- [x] S7 carries forward the requirement baseline and prior completion from S6.
- [x] S7 Technical Report, S8 Product Verification and S9 Final Readiness checks remain distinct.
- [x] Student can save, reopen and update Track evidence while the Session is open.
- [x] Closing makes evidence read-only without deleting it.
- [x] Teacher Confirm and Adjust both work; Adjust requires a reason.
- [x] Reopen preserves attendance/evidence; Reset status changes lifecycle only and preserves records.

## Gate 6 — S10 Platform Feedback

- [x] S10 shows `Feedback` rather than Work Track.
- [x] Five required structured answers save; optional note may be blank.
- [x] Reopening S10 displays the saved response.
- [x] Teacher sees accurate Completed/Pending status for the full Block roster.
- [x] Closing S10 preserves readable feedback and prevents editing.

## Gate 7 — Regression

- [x] Session Check-in still opens/closes independently and preserves attendance history.
- [x] Weekly Activity activation remains independent from Sessions and Poster Gallery.
- [x] Week 2 Pre-check can be submitted and its Teacher Review can be saved, updated and reopened.
- [x] Password reset shows `Password reset` and timestamp after refresh; downloaded credentials activate correctly.
- [x] Existing student evidence is unchanged by password reset.
- [x] Presentation Order draft/publish and CSV export still work.

## Production evidence

| Item | Result |
|---|---|
| Tested commit SHA | PR #58 Production branch (final documentation-only commit followed successful workflow testing) |
| Vercel Production deployment | Healthy — https://milestoneproject-two.vercel.app/ |
| Supabase audit timestamp | 12 August 2026 (Australia/Sydney) |
| Teacher test account | Teacher role verified; credential not recorded |
| Student test account / Block | Activated student in current Teaching Block; credential not recorded |
| Cross-Block account | Block isolation verified |
| Tester and date | Joseph Lin, 12 August 2026 |
| Failures / follow-up PRs | Initial anonymous RPC grants and 5 MB bucket drift fixed in PR #58; repeat audit returned 24/24 PASS |

## Close decision

**Decision: Closed.** Production build and deployment were healthy, the repeat
database audit returned 24/24 PASS, and Student, Teacher, signed-out and legacy
workflow regression testing completed successfully. Sprint 6 is ready to hand
off; deferred analytics and interpretation remain Sprint 7 scope.
