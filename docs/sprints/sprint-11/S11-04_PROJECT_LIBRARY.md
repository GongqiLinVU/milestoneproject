# S11-04 — Shared Project Library

Approved by Joseph on 1 November 2026 after creating 2B4 and finding its project list empty. Implementation starts from main `aab40f542caab989ae4ccb965ab3e836dbf4491d` (PR #100). Draft PR only; this report does not authorize production SQL execution.

## Delivered behaviour

- One shared `projects` library across Blocks/classes and NIT3003/NIT3004; no new Block needs project copies.
- Exactly two project statuses: `active` and `archived`, with Archive/Restore actions and Active/Archived/All display filters.
- Teachers with active class membership can browse library definitions. A project creator or super administrator can maintain a definition; legacy authorless projects remain administrator-maintained. Library visibility does not grant access to another class's roster, assignments or evidence.
- Team assignments stay class-owned. A team can reuse any active library project. An archived project remains visible on existing assignments and in student context, but cannot receive new assignments. Restore it before new use. Physical project deletion is unavailable.
- Optional explicit `predecessor_assignment_id` links a NIT3004 team's assignment to a NIT3003 assignment of the same library project. The teacher must manage both classes. The UI lists only accessible sources; it does not infer continuation from names or team numbers. An established source cannot change its project/team/link or be deleted while referenced.
- Continuation records provenance only: existing student progress, attendance and evidence stay in their original class. There is no cross-class history aggregation or student transfer in this change.
- Student project context/selection/proposal RPCs now require the activated authenticated student and resolve that student's unique active class. They no longer select an arbitrary globally active Block or accept another student's ID. Student browsers cannot select the raw library table.

## Data preservation and choices

The migration does not merge, delete or copy existing projects or assignments. Project IDs and all activity project references remain unchanged. Existing names may repeat across Blocks; those separate IDs are preserved without assuming they are equivalent. Selectors show short stable references to distinguish them.

`projects.block_id` becomes nullable `legacy_block_id`, retained only as origin metadata. Its FK uses SET NULL so deleting a class does not delete library definitions. The old per-Block title uniqueness is removed; no global unique-title assumption is introduced.

Published becomes Active; Draft becomes Archived, avoiding accidental publication of hidden drafts. `legacy_status` preserves original Draft/Published state. Already Archived remains Archived. No author is inferred for existing data. New projects default `created_by` to the authenticated creator. No Intake harness, model or automatic assessment behaviour changes.

## Installation snapshot repair

Fresh-schema validation uncovered pre-existing snapshot drift: a damaged/duplicated Week 2 definition, a literal patch marker, missing student-auth/session prerequisites, and missing released Sprint 6/7, Sprint 9 and October class/activation/budget definitions. `schema.sql` restores these from their authoritative migrations before appending the shared-library final state. Historical applied migration files are unchanged. The fresh-schema test exercises this complete installation path and reapplies the new migration. This accounts for the larger schema diff; production must run only the new incremental migration, not `schema.sql`.

## Validation

Run:

```bash
npm ci
npm run test:project-library
npm test
npm run build
```

Verified locally: **10/10 project-library checks**, **248/248 existing Intake/API checks**, and the production TypeScript/Vite build pass.

The project-library suite uses local PGlite/PostgreSQL semantics with mocked Auth/Storage schemas, no external database/provider calls. It covers preservation and repeatability, teacher ownership/RLS, cross-Block reuse, archive/restore, own-student selection, continuation authorization/integrity, cross-class evidence denial, and fresh-schema installation. Hosted PostgREST relation inference and browser layout are not validated by PGlite.

Production/Preview use the same Supabase backend. No hosted SQL, account operation, paid model call, merge or production release was performed in this task. A Vercel Preview cannot fully exercise the new UI until the backend migration exists; do not use Preview as an isolated database test.

## Production rollout (review before execution)

1. Confirm target Supabase project `gwihaizxivclamzehupk`, applied October prerequisites, and current backup/PITR availability. Export projects and team assignments securely if additional rollback evidence is desired. Record preflight row counts, statuses and existing IDs.
2. Pause teacher edits in Project setup. The column rename makes the old Project setup query incompatible during the SQL/frontend transition; arrange a short maintenance window for that page. Other student records are not moved.
3. Apply **only** `supabase/migrations/20261101_sprint11_shared_project_library.sql` once using an authorized database owner. It runs in a transaction and is repeatable. Do not run the whole schema against an existing environment.
4. Run the read-only verification below. Then deploy the matching frontend through an approved PR merge. Refresh the browser after deployment.
5. In 2B4, verify all shared active projects appear; assign an appropriate project to a team. Verify its student context, existing older assignments, archived filtering/restoration and staff ownership controls. Verify a NIT3003 source link only if a real intended continuation and both class permissions exist.

### Read-only SQL verification

```sql
-- Both results should contain only the expected two statuses / no old block_id.
select status, count(*) from public.projects group by status;
select column_name, is_nullable from information_schema.columns
where table_schema='public' and table_name='projects'
  and column_name in ('block_id','legacy_block_id','created_by','legacy_status');

-- Compare against the preflight inventory; assignment/evidence IDs are retained.
select count(*) as project_count from public.projects;
select count(*) as assignment_count from public.team_project_assignments;
select a.id, b.course_code, b.academic_year, b.block_code, b.class_code,
       t.team_number, a.project_id, p.title, p.status, a.predecessor_assignment_id
from public.team_project_assignments a
join public.teams t on t.id=a.team_id
join public.teaching_blocks b on b.id=t.block_id
join public.projects p on p.id=a.project_id
order by b.academic_year, b.block_code, t.team_number;

-- Must return zero. Archived existing assignments themselves are valid.
select count(*) as broken_continuations
from public.team_project_assignments a
left join public.team_project_assignments previous on previous.id=a.predecessor_assignment_id
where a.predecessor_assignment_id is not null
  and (previous.id is null or previous.project_id<>a.project_id);

select policyname, cmd, roles from pg_policies where schemaname='public' and tablename='projects';
select has_function_privilege('anon','public.get_project_checkin_context(text)','EXECUTE') as anon_context_access;
-- Expected false.
```

### Recovery

A failure before COMMIT rolls the transaction back. After a successful SQL migration, keep the matching frontend and fix forward; do not redeploy the old block-scoped Project setup page. A full reversal after cross-Block reuse requires an explicit mapping for new/shared projects and removal or preservation of continuation links; there is no automatic destructive down migration. Use the backup/PITR process only after evaluating unrelated writes since the snapshot. No project/assignment deletion is needed for normal recovery.
