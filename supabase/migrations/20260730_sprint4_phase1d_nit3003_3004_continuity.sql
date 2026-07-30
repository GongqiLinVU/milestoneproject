-- Sprint 4 Phase 1D: NIT3003 -> NIT3004 project continuity
--
-- NIT3003 is where teams select a project and build the prototype.
-- NIT3004 resumes the same team/project after a break and expects an
-- approximately 80%-complete entry baseline. This patch records that origin
-- without changing current assignments or opening any new browser access.

alter table public.team_project_assignments
  add column if not exists origin_unit text not null default 'NIT3004';

alter table public.team_project_assignments
  drop constraint if exists team_project_assignments_origin_unit_check;
alter table public.team_project_assignments
  add constraint team_project_assignments_origin_unit_check
  check (origin_unit in ('NIT3003', 'NIT3004'));

alter table public.team_project_assignments
  add column if not exists continued_from_previous_unit boolean not null default false;

comment on column public.team_project_assignments.origin_unit is
  'Unit where the team originally selected or created this project.';
comment on column public.team_project_assignments.continued_from_previous_unit is
  'True when the current block resumes a team project established in an earlier unit.';

-- The live 2026 · 2B1 cohort entered NIT3004 with projects established in
-- NIT3003. Preserve every existing assignment and add only its origin semantics.
update public.team_project_assignments assignment
set origin_unit = 'NIT3003',
    continued_from_previous_unit = true
from public.teams team
join public.teaching_blocks block on block.id = team.block_id
where assignment.team_id = team.id
  and block.academic_year = 2026
  and block.block_code = '2B1';

-- Verification:
-- select block.academic_year, block.block_code, team.team_number,
--        project.title, assignment.origin_unit,
--        assignment.continued_from_previous_unit
-- from public.team_project_assignments assignment
-- join public.teams team on team.id = assignment.team_id
-- join public.teaching_blocks block on block.id = team.block_id
-- join public.projects project on project.id = assignment.project_id
-- where block.academic_year = 2026 and block.block_code = '2B1'
-- order by team.team_number;
--
-- Expected: every currently assigned 2B1 team reports NIT3003 / true.
--
-- Rollback guidance:
-- Data rollback only:
-- update public.team_project_assignments assignment
-- set origin_unit = 'NIT3004', continued_from_previous_unit = false
-- from public.teams team
-- join public.teaching_blocks block on block.id = team.block_id
-- where assignment.team_id = team.id
--   and block.academic_year = 2026 and block.block_code = '2B1';
--
-- Structural rollback, only if no application code depends on these columns:
-- alter table public.team_project_assignments
--   drop column if exists continued_from_previous_unit,
--   drop column if exists origin_unit;
