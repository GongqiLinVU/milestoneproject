-- Sprint 4 Phase 1C: seed the confirmed 2026 · 2B1 roster and project assignments.
--
-- Before running:
--   1. Replace every REPLACE_*_STUDENT_ID value below with the real Student ID.
--   2. Run Phase 1 and Phase 1B first so the Team/Project foundation and
--      "AI Nutrition Assistant" catalogue entry already exist.
--
-- The VU email is derived as <student_id>@live.vu.edu.au so each Student ID
-- only needs to be entered once. This script is safe to run repeatedly.

begin;

create temporary table seed_2b1_roster (
  team_number smallint not null,
  student_id text not null,
  full_name text not null,
  preferred_name text not null
) on commit drop;

insert into seed_2b1_roster (
  team_number,
  student_id,
  full_name,
  preferred_name
)
values
  (1, 'REPLACE_TEAM1_THIEN_STUDENT_ID',       'Thien Hong',                  'Thien'),
  (1, 'REPLACE_TEAM1_BABATUNDJI_STUDENT_ID',  'Babatundji Williams-Fulwood', 'Babatundji'),
  (1, 'REPLACE_TEAM1_MANH_STUDENT_ID',        'Manh La',                     'Manh'),

  (2, 'REPLACE_TEAM2_SAMUEL_STUDENT_ID',      'Samuel Macdonald',            'Samuel'),
  (2, 'REPLACE_TEAM2_YUSUF_STUDENT_ID',       'Yusuf Servare',               'Yusuf'),
  (2, 'REPLACE_TEAM2_ASIM_STUDENT_ID',        'Asim Mir',                    'Asim'),

  (3, 'REPLACE_TEAM3_ZUBAIR_STUDENT_ID',      'Zubair Shah',                 'Zubair'),
  (3, 'REPLACE_TEAM3_ZACHARY_STUDENT_ID',     'Zachary G Arena',             'Zachary'),
  (3, 'REPLACE_TEAM3_MITCHELL_STUDENT_ID',    'Mitchell Herden',             'Mitchell'),

  (4, 'REPLACE_TEAM4_SITHUM_STUDENT_ID',      'Sithum Hans Abayasinghe',     'Sithum'),
  (4, 'REPLACE_TEAM4_UMAR_STUDENT_ID',        'Umar Kamal',                   'Umar'),
  (4, 'REPLACE_TEAM4_KUNAL_STUDENT_ID',       'Kunal Singh',                  'Kunal'),
  (4, 'REPLACE_TEAM4_TYLAH_STUDENT_ID',       'Tylah Sokolovski',             'Tylah'),

  (5, 'REPLACE_TEAM5_PRAVEEN_STUDENT_ID',     'Praveen Bashwal',              'Praveen'),
  (5, 'REPLACE_TEAM5_BAO_STUDENT_ID',         'Bao Tran',                     'Bao'),
  (5, 'REPLACE_TEAM5_SAHIL_STUDENT_ID',       'Sahil Bahad Devkota',          'Sahil');

do $$
begin
  if exists (
    select 1
    from seed_2b1_roster
    where student_id like 'REPLACE_%'
  ) then
    raise exception
      'Replace every REPLACE_*_STUDENT_ID placeholder before running this script.';
  end if;

  if exists (
    select lower(trim(student_id))
    from seed_2b1_roster
    group by lower(trim(student_id))
    having count(*) > 1
  ) then
    raise exception 'Student IDs in the seed list must be unique.';
  end if;
end
$$;

do $$
declare
  v_block_id uuid;
begin
  select id
    into v_block_id
  from public.teaching_blocks
  where academic_year = 2026
    and upper(block_code) = '2B1';

  if v_block_id is null then
    raise exception 'Teaching block 2026 · 2B1 was not found.';
  end if;

  insert into public.student_roster (
    block_id,
    student_id,
    full_name,
    preferred_name,
    vu_email,
    team_number,
    project_name
  )
  select
    v_block_id,
    lower(trim(seed.student_id)),
    seed.full_name,
    seed.preferred_name,
    lower(trim(seed.student_id)) || '@live.vu.edu.au',
    seed.team_number,
    null
  from seed_2b1_roster seed
  on conflict (block_id, student_id) do update
  set
    full_name = excluded.full_name,
    preferred_name = excluded.preferred_name,
    team_number = excluded.team_number,
    project_name = null;
end
$$;

-- Teams 1–3 have already selected AI Nutrition Assistant.
-- Teams 4–5 are intentionally left unassigned until the teacher adds
-- "Digital Human in campus" and "Stock Sentiment Analysis" in the dashboard.
insert into public.team_project_assignments (
  team_id,
  project_id,
  selection_status,
  selected_by_student_id,
  confirmed_at
)
select
  team.id,
  project.id,
  'teacher_confirmed',
  null,
  now()
from public.teams team
join public.teaching_blocks block on block.id = team.block_id
join public.projects project
  on project.block_id = block.id
 and project.title = 'AI Nutrition Assistant'
where block.academic_year = 2026
  and upper(block.block_code) = '2B1'
  and team.team_number in (1, 2, 3)
on conflict (team_id) do update
set
  project_id = excluded.project_id,
  selection_status = 'teacher_confirmed',
  selected_by_student_id = null,
  confirmed_at = now();

do $$
begin
  if (
    select count(*)
    from public.team_project_assignments assignment
    join public.teams team on team.id = assignment.team_id
    join public.teaching_blocks block on block.id = team.block_id
    join public.projects project on project.id = assignment.project_id
    where block.academic_year = 2026
      and upper(block.block_code) = '2B1'
      and team.team_number in (1, 2, 3)
      and project.title = 'AI Nutrition Assistant'
  ) <> 3 then
    raise exception
      'AI Nutrition Assistant must exist as a 2026 · 2B1 project before running this script.';
  end if;
end
$$;

commit;

-- Verification result: 16 students across five teams. Teams 1–3 should show
-- AI Nutrition Assistant; Teams 4–5 should remain blank until assigned later.
select
  team.team_number,
  roster.student_id,
  roster.full_name,
  project.title as project_title
from public.student_roster roster
join public.teams team
  on team.block_id = roster.block_id
 and team.team_number = roster.team_number
join public.teaching_blocks block on block.id = roster.block_id
left join public.team_project_assignments assignment on assignment.team_id = team.id
left join public.projects project on project.id = assignment.project_id
where block.academic_year = 2026
  and upper(block.block_code) = '2B1'
order by team.team_number, roster.full_name;
