-- Sprint 4 Phase 1: rollout-safe Team & Project foundation
--
-- Current 2026 · 2B1 remains teacher_assigned. Future blocks may opt into
-- student_selection without exposing the private roster to browser roles.

alter table public.teaching_blocks
  add column if not exists project_setup_mode text not null default 'teacher_assigned';

alter table public.teaching_blocks
  drop constraint if exists teaching_blocks_project_setup_mode_check;
alter table public.teaching_blocks
  add constraint teaching_blocks_project_setup_mode_check
  check (project_setup_mode in ('teacher_assigned', 'student_selection'));

update public.teaching_blocks
set project_setup_mode = 'teacher_assigned'
where academic_year = 2026 and block_code = '2B1';

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.teaching_blocks(id) on delete cascade,
  team_number smallint not null check (team_number between 1 and 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (block_id, team_number)
);

insert into public.teams (block_id, team_number)
select distinct block_id, team_number
from public.student_roster
on conflict (block_id, team_number) do nothing;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.teaching_blocks(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 120),
  problem text not null check (char_length(trim(problem)) between 2 and 600),
  target_users text not null check (char_length(trim(target_users)) between 2 and 300),
  description text not null check (char_length(trim(description)) between 2 and 1200),
  expected_outcomes text check (
    expected_outcomes is null or char_length(trim(expected_outcomes)) between 2 and 600
  ),
  category text not null default 'Other'
    check (category in ('Web','Mobile','AI','Data','IoT','Cybersecurity','Game','Other')),
  difficulty text not null default 'Standard'
    check (difficulty in ('Foundation','Standard','Advanced')),
  status text not null default 'draft'
    check (status in ('draft','published','archived')),
  source text not null default 'teacher'
    check (source in ('teacher','student_proposal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (block_id, title)
);

create table if not exists public.team_project_assignments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete restrict,
  selection_status text not null default 'teacher_confirmed'
    check (selection_status in ('student_selected','teacher_confirmed')),
  selected_by_student_id text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id)
);

create table if not exists public.project_proposals (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  submitted_by_student_id text not null
    check (char_length(trim(submitted_by_student_id)) between 3 and 40),
  title text not null check (char_length(trim(title)) between 2 and 120),
  problem text not null check (char_length(trim(problem)) between 2 and 600),
  target_users text not null check (char_length(trim(target_users)) between 2 and 300),
  proposed_solution text not null
    check (char_length(trim(proposed_solution)) between 2 and 800),
  category text not null default 'Other'
    check (category in ('Web','Mobile','AI','Data','IoT','Cybersecurity','Game','Other')),
  note text check (note is null or char_length(trim(note)) <= 300),
  status text not null default 'submitted'
    check (status in ('submitted','changes_requested','approved','rejected')),
  teacher_note text check (
    teacher_note is null or char_length(trim(teacher_note)) <= 500
  ),
  approved_project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teams_block_idx on public.teams (block_id);
create index if not exists projects_block_status_idx
  on public.projects (block_id, status);
create index if not exists project_proposals_team_status_idx
  on public.project_proposals (team_id, status);

drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at before update on public.teams
for each row execute function public.set_updated_at();
drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at before update on public.projects
for each row execute function public.set_updated_at();
drop trigger if exists set_team_project_assignments_updated_at
  on public.team_project_assignments;
create trigger set_team_project_assignments_updated_at
before update on public.team_project_assignments
for each row execute function public.set_updated_at();
drop trigger if exists set_project_proposals_updated_at on public.project_proposals;
create trigger set_project_proposals_updated_at before update on public.project_proposals
for each row execute function public.set_updated_at();

-- Keep Team identities in sync with roster additions and team changes.
create or replace function public.ensure_roster_team()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.teams (block_id, team_number)
  values (new.block_id, new.team_number)
  on conflict (block_id, team_number) do nothing;
  return new;
end;
$$;

revoke all on function public.ensure_roster_team() from public;
drop trigger if exists ensure_roster_team on public.student_roster;
create trigger ensure_roster_team
after insert or update of block_id, team_number on public.student_roster
for each row execute function public.ensure_roster_team();

-- Preserve existing roster project names as teacher-created catalogue entries
-- and confirmed team assignments. Blank and inconsistent names are ignored.
insert into public.projects (
  block_id, title, problem, target_users, description, status, source
)
select
  roster.block_id,
  trim(roster.project_name),
  'Project details to be completed by the teacher.',
  'To be confirmed',
  'Imported from the existing teaching roster.',
  'published',
  'teacher'
from public.student_roster roster
where nullif(trim(roster.project_name), '') is not null
group by roster.block_id, trim(roster.project_name)
on conflict (block_id, title) do nothing;

insert into public.team_project_assignments (
  team_id, project_id, selection_status, confirmed_at
)
select
  team.id,
  min(project.id::text)::uuid,
  'teacher_confirmed',
  now()
from public.teams team
join public.student_roster roster
  on roster.block_id = team.block_id
 and roster.team_number = team.team_number
join public.projects project
  on project.block_id = roster.block_id
 and project.title = trim(roster.project_name)
where nullif(trim(roster.project_name), '') is not null
group by team.id
on conflict (team_id) do nothing;

-- Activities store the project identity at submission time. Existing evidence
-- stays null and is not rewritten.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'student_checkins',
    'team_health_checks',
    'weekly_engagement_checkouts',
    'week2_progress_reviews',
    'poster_reviews'
  ]
  loop
    execute format(
      'alter table public.%I add column if not exists project_id uuid references public.projects(id) on delete set null',
      table_name
    );
    execute format(
      'create index if not exists %I on public.%I (project_id)',
      table_name || '_project_id_idx',
      table_name
    );
  end loop;
end $$;

create or replace function public.assign_activity_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id text;
  v_project_id uuid;
  v_project public.projects;
begin
  v_student_id := lower(trim(
    case
      when tg_table_name = 'poster_reviews'
        then to_jsonb(new) ->> 'reviewer_student_id'
      else to_jsonb(new) ->> 'student_id'
    end
  ));

  select assignment.project_id
    into v_project_id
  from public.student_roster roster
  join public.teams team
    on team.block_id = roster.block_id
   and team.team_number = roster.team_number
  join public.team_project_assignments assignment on assignment.team_id = team.id
  where roster.block_id = new.block_id
    and roster.student_id = v_student_id
  limit 1;

  new := jsonb_populate_record(
    new,
    jsonb_build_object('project_id', v_project_id)
  );
  if tg_table_name = 'week2_progress_reviews' and v_project_id is null then
    raise exception using errcode = 'P0001',
      message = 'The student team does not have a current project';
  end if;
  if tg_table_name = 'week2_progress_reviews' then
    select * into v_project from public.projects where id = v_project_id;
    new := jsonb_populate_record(
      new,
      jsonb_build_object(
        'project_name', v_project.title,
        'project_area', v_project.category,
        'project_description', left(v_project.description, 300),
        'target_user_problem', left(
          concat(v_project.target_users, ' · ', v_project.problem),
          150
        )
      )
    );
  end if;
  return new;
end;
$$;

revoke all on function public.assign_activity_project() from public;
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'student_checkins',
    'team_health_checks',
    'weekly_engagement_checkouts',
    'week2_progress_reviews',
    'poster_reviews'
  ]
  loop
    execute format(
      'drop trigger if exists assign_activity_project on public.%I',
      table_name
    );
    execute format(
      'create trigger assign_activity_project before insert on public.%I
       for each row execute function public.assign_activity_project()',
      table_name
    );
  end loop;
end $$;

-- Student-safe context. It reveals only the matched student's team, current
-- assignment and the active block's published catalogue.
create or replace function public.get_project_checkin_context(p_student_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_block public.teaching_blocks;
  v_team public.teams;
  v_assignment public.team_project_assignments;
  v_project public.projects;
begin
  select * into v_block
  from public.teaching_blocks
  where status = 'active'
  limit 1;

  select team.* into v_team
  from public.student_roster roster
  join public.teams team
    on team.block_id = roster.block_id
   and team.team_number = roster.team_number
  where roster.block_id = v_block.id
    and roster.student_id = lower(trim(p_student_id))
  limit 1;

  if v_team.id is null then
    raise exception using
      errcode = 'P0001',
      message = 'Student ID is not present in the active teaching block roster';
  end if;

  select * into v_assignment
  from public.team_project_assignments
  where team_id = v_team.id;

  if v_assignment.project_id is not null then
    select * into v_project from public.projects
    where id = v_assignment.project_id;
  end if;

  return jsonb_build_object(
    'blockId', v_block.id,
    'blockLabel', concat(v_block.academic_year, ' · ', v_block.block_code),
    'setupMode', v_block.project_setup_mode,
    'teamId', v_team.id,
    'teamName', concat('Team ', v_team.team_number),
    'assignmentStatus', v_assignment.selection_status,
    'project', case when v_project.id is null then null else jsonb_build_object(
      'id', v_project.id,
      'title', v_project.title,
      'problem', v_project.problem,
      'targetUsers', v_project.target_users,
      'description', v_project.description,
      'category', v_project.category,
      'difficulty', v_project.difficulty
    ) end,
    'availableProjects', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', project.id,
        'title', project.title,
        'problem', project.problem,
        'targetUsers', project.target_users,
        'description', project.description,
        'category', project.category,
        'difficulty', project.difficulty
      ) order by project.title)
      from public.projects project
      where project.block_id = v_block.id
        and project.status = 'published'
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_project_checkin_context(text) from public;
grant execute on function public.get_project_checkin_context(text)
  to anon, authenticated;

create or replace function public.select_team_project(
  p_student_id text,
  p_project_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_block public.teaching_blocks;
  v_team public.teams;
  v_existing public.team_project_assignments;
begin
  select * into v_block from public.teaching_blocks
  where status = 'active' limit 1 for share;

  if v_block.project_setup_mode <> 'student_selection' then
    raise exception using errcode = 'P0001',
      message = 'Projects are assigned by the teacher for this teaching block';
  end if;

  select team.* into v_team
  from public.student_roster roster
  join public.teams team
    on team.block_id = roster.block_id
   and team.team_number = roster.team_number
  where roster.block_id = v_block.id
    and roster.student_id = lower(trim(p_student_id))
  limit 1;

  if v_team.id is null then
    raise exception using errcode = 'P0001',
      message = 'Student ID is not present in the active teaching block roster';
  end if;

  if not exists (
    select 1 from public.projects
    where id = p_project_id
      and block_id = v_block.id
      and status = 'published'
  ) then
    raise exception using errcode = 'P0001',
      message = 'That project is not available in this teaching block';
  end if;

  select * into v_existing
  from public.team_project_assignments
  where team_id = v_team.id
  for update;

  if v_existing.selection_status = 'teacher_confirmed' then
    raise exception using errcode = 'P0001',
      message = 'This team project has been confirmed by the teacher';
  end if;

  insert into public.team_project_assignments (
    team_id, project_id, selection_status, selected_by_student_id
  )
  values (
    v_team.id, p_project_id, 'student_selected', lower(trim(p_student_id))
  )
  on conflict (team_id) do update
  set project_id = excluded.project_id,
      selected_by_student_id = excluded.selected_by_student_id,
      selection_status = 'student_selected',
      confirmed_at = null;

  return public.get_project_checkin_context(p_student_id);
end;
$$;

revoke all on function public.select_team_project(text, uuid) from public;
grant execute on function public.select_team_project(text, uuid)
  to anon, authenticated;

create or replace function public.submit_team_project_proposal(
  p_student_id text,
  p_title text,
  p_problem text,
  p_target_users text,
  p_proposed_solution text,
  p_category text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_block public.teaching_blocks;
  v_team_id uuid;
  v_proposal_id uuid;
begin
  select * into v_block from public.teaching_blocks
  where status = 'active' limit 1;

  if v_block.project_setup_mode <> 'student_selection' then
    raise exception using errcode = 'P0001',
      message = 'Project proposals are not open for this teaching block';
  end if;

  select team.id into v_team_id
  from public.student_roster roster
  join public.teams team
    on team.block_id = roster.block_id
   and team.team_number = roster.team_number
  where roster.block_id = v_block.id
    and roster.student_id = lower(trim(p_student_id))
  limit 1;

  if v_team_id is null then
    raise exception using errcode = 'P0001',
      message = 'Student ID is not present in the active teaching block roster';
  end if;

  if exists (
    select 1 from public.project_proposals
    where team_id = v_team_id
      and status in ('submitted','changes_requested')
  ) then
    raise exception using errcode = '23505',
      message = 'This team already has an active project proposal';
  end if;

  insert into public.project_proposals (
    team_id, submitted_by_student_id, title, problem, target_users,
    proposed_solution, category, note
  ) values (
    v_team_id, lower(trim(p_student_id)), trim(p_title), trim(p_problem),
    trim(p_target_users), trim(p_proposed_solution), p_category,
    nullif(trim(p_note), '')
  )
  returning id into v_proposal_id;

  return v_proposal_id;
end;
$$;

revoke all on function public.submit_team_project_proposal(
  text, text, text, text, text, text, text
) from public;
grant execute on function public.submit_team_project_proposal(
  text, text, text, text, text, text, text
) to anon, authenticated;

-- Keep Find My Team on the new assignment source instead of the deprecated
-- per-student roster project_name.
create or replace function public.find_student_team(
  p_student_id text,
  p_requester_hash text,
  p_identity_hash text
)
returns table (
  outcome text,
  block_label text,
  team_label text,
  project_name text,
  teammates text[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id text := lower(trim(coalesce(p_student_id, '')));
  v_block public.teaching_blocks%rowtype;
  v_student public.student_roster%rowtype;
  v_attempt_count integer;
  v_project_name text;
begin
  if char_length(v_student_id) < 3 or char_length(v_student_id) > 40 then
    return query select 'not_found'::text, null::text, null::text, null::text, null::text[];
    return;
  end if;
  if p_requester_hash !~ '^[0-9a-f]{64}$'
     or p_identity_hash !~ '^[0-9a-f]{64}$' then
    return query select 'unavailable'::text, null::text, null::text, null::text, null::text[];
    return;
  end if;
  select count(*)::integer into v_attempt_count
  from public.team_lookup_attempts
  where requester_hash = p_requester_hash
    and attempted_at >= now() - interval '15 minutes';
  if v_attempt_count >= 5 then
    return query select 'rate_limited'::text, null::text, null::text, null::text, null::text[];
    return;
  end if;
  select * into v_block from public.teaching_blocks
  where status = 'active'
  order by starts_on desc nulls last, created_at desc limit 1;
  if v_block.id is null then
    return query select 'no_active_block'::text, null::text, null::text, null::text, null::text[];
    return;
  end if;
  select * into v_student from public.student_roster
  where block_id = v_block.id and student_id = v_student_id limit 1;
  insert into public.team_lookup_attempts (
    requester_hash, identity_hash, succeeded
  ) values (
    p_requester_hash, p_identity_hash, v_student.id is not null
  );
  if v_student.id is null then
    return query select 'not_found'::text, null::text, null::text, null::text, null::text[];
    return;
  end if;
  select project.title into v_project_name
  from public.teams team
  join public.team_project_assignments assignment on assignment.team_id = team.id
  join public.projects project on project.id = assignment.project_id
  where team.block_id = v_block.id
    and team.team_number = v_student.team_number
  limit 1;
  return query
  select
    'found'::text,
    concat(v_block.academic_year, ' · ', v_block.block_code)::text,
    concat('Team ', v_student.team_number)::text,
    v_project_name,
    coalesce(
      array_agg(coalesce(member.preferred_name, member.full_name)
        order by member.full_name)
        filter (where member.id <> v_student.id),
      array[]::text[]
    )
  from public.student_roster member
  where member.block_id = v_block.id
    and member.team_number = v_student.team_number;
end;
$$;

revoke all on function public.find_student_team(text, text, text) from public;
grant execute on function public.find_student_team(text, text, text) to anon;

alter table public.teams enable row level security;
alter table public.projects enable row level security;
alter table public.team_project_assignments enable row level security;
alter table public.project_proposals enable row level security;

revoke all on public.teams, public.projects,
  public.team_project_assignments, public.project_proposals
from anon, authenticated;
grant select, insert, update, delete on public.teams, public.projects,
  public.team_project_assignments, public.project_proposals
to authenticated;

drop policy if exists "teachers manage teams" on public.teams;
create policy "teachers manage teams" on public.teams
for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
drop policy if exists "teachers manage projects" on public.projects;
create policy "teachers manage projects" on public.projects
for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
drop policy if exists "teachers manage team projects"
  on public.team_project_assignments;
create policy "teachers manage team projects" on public.team_project_assignments
for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
drop policy if exists "teachers manage project proposals" on public.project_proposals;
create policy "teachers manage project proposals" on public.project_proposals
for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

-- Verification:
-- 1. 2026 · 2B1 is teacher_assigned.
-- 2. SELECT count(*) FROM teams matches distinct block/team pairs in roster.
-- 3. Existing nonblank roster project names have a project and assignment.
-- 4. anon cannot SELECT teams, roster, assignments or proposals directly.
-- 5. get_project_checkin_context returns only the matched team and published
--    catalogue; an unmatched Student ID raises P0001.
-- 6. select_team_project is rejected in teacher_assigned mode and can only
--    select a published project from the active block in student_selection.
-- 7. a teacher-confirmed assignment cannot be overwritten by a student RPC.
-- 8. identified activity inserts store the team's current project_id.
--
-- Rollback guidance:
-- Set every block to teacher_assigned and revoke the three student RPCs first.
-- Do not drop project_id after submissions use it. The new tables may be
-- dropped only before project data or new-block submissions enter production.
