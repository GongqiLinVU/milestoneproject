# Classroom observation and user feedback

**Active from 24 October 2026. Sprint 10 is closed.**

## Goal

Learn whether students can complete their work without friction and whether the resulting records make teacher review more useful and efficient. Keep the deployed baseline stable while collecting real classroom evidence. Joseph opened [Sprint 11](../sprints/sprint-11/PLAN.md) on 26 October for one approved rehearsal finding: the first NIT3004 question needs a project baseline, a personal role and optional guidance. This does not authorize broader harness expansion.

## Rollout

- Before teaching: each teacher checks their own class, roster/accounts, team/project allocations and Session dates/windows/method. Existing readiness review: 29 October; configuration/contingency: 30 October; teaching planned from 2 November.
- First live Sessions: Joseph and the teachers note completion problems and collect existing debug exports for selected successful and problematic cases. Do not require a debug download or another form from every student.
- After the first one or two live Sessions, review evidence across the three classes where available. Choose a small prioritized improvement batch with Joseph. Ordinary changes are reviewed together; urgent access/data/security defects are handled immediately.

## What to observe

| Dimension | Evidence to record | Question |
|---|---|---|
| Completion and friction | Class/Session, started/completed/abandoned cases where observable, point of failure, recovery | Can a student log in, complete and save without teacher rescue? |
| Conversation quality | Transcript/debug, actual clarification count, repeated or irrelevant questions, early/late stop | Is the conversation short and sufficient? |
| Record fidelity | Student answers versus saved/reviewed record, corrections, omitted actions, unsupported claims and unknowns | Does the record say what the student actually reported? |
| Teacher value | A few observed review times, concrete useful/missing facts and follow-up decisions | Does this reduce review effort while preserving teacher judgement? |
| Latency and cost | Existing request duration, token/model/estimated cost, retries and unresolved usage | What does a completed Intake cost and how long does it take in real use? |

Do not infer an abandonment rate without reliable starts/completions. No new analytics pipeline or instrumentation is promised by this plan. Initially use available records, observations and exports; mark missing denominators/data as unknown. Distinguish estimates from settled provider costs.

## Lightweight feedback

During normal teaching, ask students where they got stuck or what they had to repeat. Ask teachers which record helped them understand a student's progress, and what they still had to ask. Capture the answer in [FEEDBACK_LOG.md](FEEDBACK_LOG.md) with an anonymous case ID and a brief expected-versus-observed description. No extra mandatory student questionnaire.

Use class/Session labels and anonymous aliases (for example C2-S3-case01). Keep raw debug exports and identifiable screenshots in an authorized private location; put only redacted summaries/references in repository documents or issues. Never commit student names, emails, credentials, tokens or raw identifiable conversations. No new retention/consent policy is invented here; follow applicable institutional arrangements and approvals.

## Triage and change discipline

- Urgent: blocked login/submission, lost records or drafts, cross-class/student access, exposed credentials. Investigate the specific case immediately; preserve evidence and ship a focused fix after validation.
- Review batch: confusing navigation, unnecessary wording/questions, premature or delayed closure, inaccurate/omitted record fields, teacher review burden, latency/cost outliers. Observe recurrence and impact before changing the baseline.
- Idea: features without a demonstrated user problem stay in the register until reviewed.

For each accepted change, state the evidence, intended outcome and regression case, then compare new usage with the previous baseline. One example may justify a reproducible blocker fix; it does not establish a general semantic rule. Keep O/W/A observations distinguishable, retain structural stop guarantees and avoid topic blacklists. AI does not assign marks or make authorship/contribution verdicts.

## First review output

A short summary of the most consequential cases, what worked, what failed, evidence gaps, and the next few approved changes. Do not report learning gains or time/cost savings without a comparison and sufficient evidence. Joseph reviews further development scope; Sprint 11 currently contains only the approved onboarding increment.
