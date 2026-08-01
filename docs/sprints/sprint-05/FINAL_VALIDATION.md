# Sprint 5 Final Production Validation

Use this checklist against Production after all Sprint 5 migrations and merge
commit `b909db5d` or later are deployed. Record only observed results; do not
remove real student evidence to create test data.

## Deployment

- [ ] Public Landing Page loads and shows Student and Teacher entry points.
- [ ] Teacher Dashboard loads and accepts the configured teacher account.
- [ ] Student Portal requires a roster-prepared account.
- [ ] Vercel deployment for the tested `main` commit is successful.

## Student identity and attendance

- [ ] A prepared test student can activate with a temporary credential, set a
      personal password and later log in with that password.
- [ ] The student sees only their own Block, Team, Project and attendance.
- [ ] Session Check-in is unavailable while no session is open.
- [ ] After the teacher opens the correct Block session, Check-in succeeds once
      and a duplicate Check-in is rejected or shown as completed.
- [ ] Teacher password reset invalidates the prior password without removing
      roster, attendance or activity evidence.

## Weekly activities

- [ ] A closed week is visibly locked and a direct submission is rejected.
- [ ] Opening one Block/week does not open another Block.
- [ ] Week 2 Pre-check Continue, Back, Review and Submit work.
- [ ] An existing Week 2 submission opens as a read-only completed record.
- [ ] Teacher Reset submission affects only the selected record and allows a
      clean resubmission.
- [ ] Week 3 Poster Peer Review prevents own-team and duplicate reviews.

## Teacher review and AI

- [ ] Initial AI Review works before Teacher Review is saved.
- [ ] After-review Summary stays locked until Teacher Review is saved.
- [ ] Saving Review enables After-review Summary and includes the saved
      verification, Conversation note and follow-up context.
- [ ] A student or authenticated non-teacher cannot use teacher-only review,
      reset, provisioning or activity-management operations.

## Presentation Order

- [ ] Natural Team-number order loads for the selected Block.
- [ ] Saving Draft does not change the student's published order.
- [ ] Publishing exposes the order only when Week 4 is open.
- [ ] A later Draft leaves the old Published snapshot unchanged until republish.
- [ ] Students cannot read another Block's order or the underlying table.

## Data and recovery

- [ ] Historical Class Pulse and Team Conversation rows remain preserved.
- [ ] Closing/reopening a week does not delete submissions.
- [ ] CSV exports still match their selected Block/activity where currently
      supported.
- [ ] Recovery guidance in the applied migrations is available and no
      service-role credential appears in browser code or repository history.

## Completion record

- Tested commit:
- Tested environment:
- Tester:
- Date/time:
- Blocking defects:
- Non-blocking follow-ups moved to Sprint 6:

Sprint 5 may be marked Closed when all blocking checks pass. Non-blocking layout
or analytics improvements should be recorded for Sprint 6 rather than extending
Sprint 5.
