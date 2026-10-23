# Sprint 10 closeout — 24 October 2026

## Acceptance

Joseph: basic testing passed; a new teacher can create Sessions and students can log in. Joseph requested closure of Sprint 10 and a shift to collecting real user feedback. The accepted release baseline is main `901fd7254416818c1fdc8803bd20347d7db05176` (PR #97), on https://milestoneproject-two.vercel.app.

## Delivered

S1–S9 progress collection is usable through Work Track, Guided Form or teacher-selected AI Intake, while recurring attendance and S10 feedback remain distinct. Intake conversation and record extraction are separate requests. Student review is focused, debug records remain accessible, processing is visible and natural progress collection is bounded by structural stop rules. Student-source grounding and uncertainty are retained in the record; multiple next actions and confirmed history are preserved.

Recent operational delivery:

| PR | Result | Operator/rehearsal basis |
|---|---|---|
| [#92](https://github.com/GongqiLinVU/milestoneproject/pull/92) | Independent classes, super administrator and teacher assignments; per-class roster/accounts | Joseph confirmed production SQL succeeded; later new-teacher/student basic workflow accepted |
| [#93](https://github.com/GongqiLinVU/milestoneproject/pull/93) | Teacher row actions, reset password, disable/delete controls | 229 offline/API tests, build and isolated React/SQL flow; live Auth transport not comprehensively retested |
| [#94](https://github.com/GongqiLinVU/milestoneproject/pull/94) | Preserve open forms on same-account auth/visibility refresh | Browser checked Add project DOM/input preservation, student draft, sign-out/account switch and revocation |
| [#95](https://github.com/GongqiLinVU/milestoneproject/pull/95) | Unassigned enrolment, explicit teams and repaired roster/team sync | Joseph confirmed SQL; 16 SQL tests and real React/isolated SQL allocation/project flow |
| [#96](https://github.com/GongqiLinVU/milestoneproject/pull/96) | Password-only student activation; no artificial goal/check-in | Joseph confirmed SQL; activation browser flow and 6 SQL tests including historical preservation |
| [#97](https://github.com/GongqiLinVU/milestoneproject/pull/97) | New plans start at S1/first unfinished Session; class budget defaults and administrator ceilings | Joseph confirmed SQL; 237 tests, 5 budget SQL tests, real Session-control browser flow and build |

Earlier Intake design and implementation evidence remain in this sprint's focused reports, especially [conversation split](S10-SPLIT-INTAKE.md), [structural stopping](S10-STRUCTURAL_CHAT_STOP.md), [focused review](S10-FOCUSED_REVIEW.md) and [record contract](S10-RECORD-CONTRACT.md). Implementation-time pending statements in those reports are historical, not the active task list.

## Current operating contract

- Separate NIT3004 classes use course/year/Block/class identity and assigned-teacher access. Super administrators distribute teachers; teachers manage their own students.
- Students start unassigned unless a team is explicitly selected/imported. Projects are assigned to teams, inherited by their students. Existing history is retained.
- Activation collects password/confirmation only. It does not create attendance or require a goal.
- Viewing a Session never opens it. Open Sessions take focus priority, otherwise the first unfinished Session is shown; a fully closed plan shows the last.
- Financial records remain monitoring estimates. US$10 is the class reference default, US$25 the default teacher configuration ceiling. Administrator exceptions and legacy higher references are supported. This is not a guarantee that provider spend cannot exceed the reference; conversations remain round-controlled.
- Form/Work Track are operational alternatives; AI does not grade students or replace teacher judgement.

## Evidence limits and rollout follow-ups

Automated SQL and browser tests use isolated data and synthetic Auth/provider transport. They are not proof of live Supabase account creation/reset/deletion/email delivery, peak classroom concurrency, blanket end-to-end coverage or learning impact. Joseph's report establishes the basic live paths stated above; it is not expanded into every earlier acceptance scenario. Cross-Block continuing-student operation, hosted recovery-email routing, real concurrent use and AI quality/safety remain areas to observe/verify as relevant during rollout. Institutional approval remains an external dependency for applicable classroom/research use; no ethics or grading approval is claimed.

Not every classroom account/configuration has been checked by this closeout. Keep the 29/30 October readiness/configuration checkpoints. No new test run, paid model call, production database/account change or deployment is part of this documentation update.

## Next phase

[Classroom observation and feedback](../../feedback/PLAN.md) is active. Collect real traces and short teacher/student observations, review patterns together, then select a focused improvement batch. Avoid speculative harness expansion and continuous prompt changes before observing the deployed baseline.
