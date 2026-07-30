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

-- Keep the seed data inside one PL/pgSQL block. This avoids relying on a
-- temporary table, which may disappear if Supabase SQL Editor reruns only part
-- of the script after an error.
do $$
declare
  v_block_id uuid;
  v_roster jsonb := $roster$
  [
    {"team_number":1,"student_id":"REPLACE_TEAM1_THIEN_STUDENT_ID","full_name":"Thien Hong","preferred_name":"Thien"},
    {"team_number":1,"student_id":"REPLACE_TEAM1_BABATUNDJI_STUDENT_ID","full_name":"Babatundji Williams-Fulwood","preferred_name":"Babatundji"},
    {"team_number":1,"student_id":"REPLACE_TEAM1_MANH_STUDENT_ID","full_name":"Manh La","preferred_name":"Manh"},

    {"team_number":2,"student_id":"REPLACE_TEAM2_SAMUEL_STUDENT_ID","full_name":"Samuel Macdonald","preferred_name":"Samuel"},
    {"team_number":2,"student_id":"REPLACE_TEAM2_YUSUF_STUDENT_ID","full_name":"Yusuf Servare","preferred_name":"Yusuf"},
    {"team_number":2,"student_id":"REPLACE_TEAM2_ASIM_STUDENT_ID","full_name":"Asim Mir","preferred_name":"Asim"},

    {"team_number":3,"student_id":"REPLACE_TEAM3_ZUBAIR_STUDENT_ID","full_name":"Zubair Shah","preferred_name":"Zubair"},
    {"team_number":3,"student_id":"REPLACE_TEAM3_ZACHARY_STUDENT_ID","full_name":"Zachary G Arena","preferred_name":"Zachary"},
    {"team_number":3,"student_id":"REPLACE_TEAM3_MITCHELL_STUDENT_ID","full_name":"Mitchell Herden","preferred_name":"Mitchell"},

    {"team_number":4,"student_id":"REPLACE_TEAM4_SITHUM_STUDENT_ID","full_name":"Sithum Hans Abayasinghe","preferred_name":"Sithum"},
    {"team_number":4,"student_id":"REPLACE_TEAM4_UMAR_STUDENT_ID","full_name":"Umar Kamal","preferred_name":"Umar"},
    {"team_number":4,"student_id":"REPLACE_TEAM4_KUNAL_STUDENT_ID","full_name":"Kunal Singh","preferred_name":"Kunal"},
    {"team_number":4,"student_id":"REPLACE_TEAM4_TYLAH_STUDENT_ID","full_name":"Tylah Sokolovski","preferred_name":"Tylah"},

    {"team_number":5,"student_id":"REPLACE_TEAM5_PRAVEEN_STUDENT_ID","full_name":"Praveen Bashwal","preferred_name":"Praveen"},
    {"team_number":5,"student_id":"REPLACE_TEAM5_BAO_STUDENT_ID","full_name":"Bao Tran","preferred_name":"Bao"},
    {"team_number":5,"student_id":"REPLACE_TEAM5_SAHIL_STUDENT_ID","full_name":"Sahil Bahad Devkota","preferred_name":"Sahil"}
  ]
  $roster$::jsonb;
begin
  if exists (
    select 1
    from jsonb_to_recordset(v_roster) as seed(
      team_number smallint,
      student_id text,
      full_name text,
      preferred_name text
    )
    where seed.student_id like 'REPLACE_%'
  ) then
    raise exception
      'Replace every REPLACE_*_STUDENT_ID placeholder before running this script.';
  end if;

  if exists (
    select lower(trim(seed.student_id))
    from jsonb_to_recordset(v_roster) as seed(
      team_number smallint,
      student_id text,
      full_name text,
      preferred_name text
    )
    group by lower(trim(seed.student_id))
    having count(*) > 1
  ) then
    raise exception 'Student IDs in the seed list must be unique.';
  end if;

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
  from jsonb_to_recordset(v_roster) as seed(
    team_number smallint,
    student_id text,
    full_name text,
    preferred_name text
  )
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
