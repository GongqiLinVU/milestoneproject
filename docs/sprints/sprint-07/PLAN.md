# Sprint 7 Plan — Observation, Feedback & Evidence Review

**Status:** Observation cycle completed; documentation close-out pending  
**Source baseline:** Sprint 6 production state plus Phase 1A independent Work Track access  
**Product area:** NIT3004 Engineering Studio Platform

## Sprint goal

Use the completed 2026 2B1 teaching block to understand how students actually
used Intake, Activities, Session Check-in, Work Track, Poster/Peer Feedback and
Teacher Review before designing the next product change.

Sprint 7 is deliberately an observation sprint, not a feature-expansion sprint.
Its purpose is to replace assumptions with evidence and convert the findings into
an evidence-based Sprint 8 plan.

## Cohort baseline

- Starting cohort: **17**
- Withdrawn: **3**
- Active/eligible cohort: **14**
- Teams represented: **6**

Withdrawn students are excluded from missing-participation denominators.

## Delivered exception — Phase 1A

Independent Work Track access was implemented before the observation window
because the teacher needed to reopen S8 Track without reopening S8 attendance.

Delivered and production validated:

- Follow session / Open / Closed Track states
- S8 and S9 Tracks may be open simultaneously
- attendance remains independent
- closed evidence remains readable
- existing evidence and S10 Platform Feedback are preserved
- RPCs remain authenticated-only

## Observation evidence

The final export connected 243 pseudonymised records across:

- Week 1 Check-in and Four-Week Promise
- Team Health and Week 2 Pre-check
- Weekly Check-outs and Session attendance
- S6–S9 Work Track and Teacher verification
- S10 Platform Feedback
- Poster participation and 40 Peer Feedback records
- 13 Teacher Progress Reviews
- final Team Report evaluation and individual adjustment reasoning

Raw student-level exports remain outside Git. Durable analysis stores only
queries, anonymised summaries, decisions and limitations.

## Decisive findings

1. Classroom-timed activities achieved materially higher participation than
   unsupported self-directed forms.
2. Fixed broad questions produced ideal answers such as Clear, Balanced and On
   track, but often failed to predict later demonstration or contribution gaps.
3. Specific implementation questions produced more useful evidence than general
   reflection.
4. Student-reported completion rose to 93.4% among S9 submitters, but several
   students reporting 100% remained Partially verified, Unable to demonstrate or
   in need of further evidence.
5. Teacher Review was the most actionable evidence source: it exposed missing
   demonstrations, duplicate responsibility, shallow explanation, integration
   gaps and insufficient testing.
6. Final Reports can be polished or AI-assisted without proving participation,
   ownership or understanding. Report text is a claim source, not verified fact.
7. Students valued Weekly Activities, Teacher Review and Session Check-in most.
   Their main improvement requests concerned workflow, navigation, clearer
   step-by-step guidance and reminders.
8. AI should reduce teacher review effort by extracting claims, comparing
   evidence and preparing targeted questions—not by autonomously awarding marks.

## Sprint 7 decision

The old Trajectory / Analytics / AI Insight implementation plan is superseded.
Those ideas are not discarded, but must be reconsidered through the final
evidence rather than implemented as a dashboard-first programme.

The accepted product relationship is:

> Report is a claim; Activity is a process record; Artifact is work evidence;
> Teacher Review is verification; AI connects them.

## Close criteria

- final anonymised observation recorded
- Sprint 8 evidence decisions recorded
- raw exports excluded from Git
- export privacy gap documented: nested JSON must remove auth identifiers
- Sprint 8 plan created
- no retrospective production workflow changes made merely to improve metrics
