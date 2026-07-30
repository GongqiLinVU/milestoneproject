# Sprint 4 Handoff

**Status: Active — Phase 1 planned**

## Starting point

Sprint 3 was closed at an agreed delivery boundary on 30 July 2026. Its
production foundation includes:

- Week 1–3 engagement evidence and weekly tabs
- Week 2 Implementation Pre-check
- private Teacher Review and Follow-up
- optional teacher-controlled AI suggestions
- reusable teaching blocks and `2026 · 2B1` historical backfill
- teacher-managed roster and CSV import
- Student ID-only Find My Team through a least-privilege RPC
- explicit block-scoped submissions
- roster-authoritative automatic team assignment

## Current Phase

**Phase 1 — Week-specific engagement journey**

Before implementation, inspect the latest forms, table constraints, receipts,
Teacher Activity records, analytics and CSV mappings. Confirm which current
common questions remain useful across Weeks 1–3 and which questions should be
week-specific.

Deliver only Phase 1:

- short common pulse for longitudinal comparison
- Week 1 direction/alignment questions
- Week 2 implementation/evidence questions
- Week 3 completion/testing/report/presentation questions
- clear Week 4 presentation readiness or delivery confirmation where required
- no own-team field in student forms
- block-scoped roster-derived team storage
- migration/schema/RLS and production verification where data changes

## Acceptance gate

- normal student completion requires selections, not written comments
- no duplicated evidence between weekly activities
- old submissions remain correctly labelled and available
- duplicate and receipt behaviour remains block-aware
- teacher records and CSV keep block/team context
- build and role-based database smoke tests pass
- a focused Draft PR is created and not merged without approval

## Session protocol

Start the next session with:

> 请读取 GitHub 仓库 GongqiLinVU/milestoneproject 的最新 main，并按照 prompts/START_SESSION.md 开始 Sprint 4 Phase 1。开始修改前先汇报当前状态、Sprint 3 的关闭证据、本 Phase 范围、数据库与隐私影响及验收标准。一次只执行一个 Phase，完成后创建 Draft PR，未经我确认不要合并。
