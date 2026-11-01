-- Shared project definitions; class-owned assignments and evidence remain in place.
-- Apply after all Sprint 10 class/roster migrations. Transactional and repeatable.
begin;
-- Remove the class boundary from project definitions, retaining origin as metadata.
drop policy if exists teaching_class_staff_scope on public.projects;
drop policy if exists "teachers manage projects" on public.projects;
drop trigger if exists guard_class_ownership on public.projects;
do $$ begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='projects' and column_name='block_id') then
  alter table public.projects rename column block_id to legacy_block_id;
 end if;
end $$;
alter table public.projects alter column legacy_block_id drop not null;
alter table public.projects drop constraint if exists projects_block_id_fkey;
alter table public.projects drop constraint if exists projects_legacy_block_id_fkey;
alter table public.projects add constraint projects_legacy_block_id_fkey foreign key(legacy_block_id) references public.teaching_blocks(id) on delete set null;
alter table public.projects drop constraint if exists projects_block_id_title_key;
alter table public.projects add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.projects alter column created_by set default auth.uid();
alter table public.projects add column if not exists legacy_status text;
-- Old records have no reliable author. Only administrators maintain them until
-- ownership is explicitly assigned; never infer authorship from class membership.
update public.projects set legacy_status=status where legacy_status is null and status in ('draft','published');
alter table public.projects drop constraint if exists projects_status_check;
update public.projects set status=case when status='published' then 'active' when status='draft' then 'archived' else status end where status in ('draft','published');
alter table public.projects alter column status set default 'active';
alter table public.projects add constraint projects_status_check check(status in ('active','archived'));
drop index if exists public.projects_block_status_idx;
create index if not exists projects_library_status_title_idx on public.projects(status,title);

create or replace function public.can_read_project_library() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (public.is_superadmin() or (
 public.is_teacher() and exists(select 1 from public.teacher_profiles p where p.user_id=auth.uid() and p.active and not p.must_change_password)
 and exists(select 1 from public.teacher_class_memberships m where m.user_id=auth.uid())))
$$;
revoke all on function public.can_read_project_library() from public,anon;
grant execute on function public.can_read_project_library() to authenticated,service_role;
revoke all on public.projects from anon,authenticated;
grant select,insert,update on public.projects to authenticated;
-- No project deletion endpoint: archive preserves all existing references.
drop policy if exists project_library_read on public.projects;
create policy project_library_read on public.projects for select to authenticated using(public.can_read_project_library());
drop policy if exists project_library_create on public.projects;
create policy project_library_create on public.projects for insert to authenticated with check(public.can_read_project_library() and created_by=auth.uid() and legacy_block_id is null and legacy_status is null);
drop policy if exists project_library_edit on public.projects;
create policy project_library_edit on public.projects for update to authenticated using(public.can_read_project_library() and (public.is_superadmin() or created_by=auth.uid())) with check(public.can_read_project_library() and (public.is_superadmin() or created_by=auth.uid()));

-- Projects are reusable; all other parent links must still share one class.

create or replace function public.guard_class_parent_links() returns trigger language plpgsql security definer set search_path='' as $$
declare d jsonb:=to_jsonb(new);v_class uuid;v_ref uuid;v_key text;v_team uuid;
begin
 v_class:=(d->>'block_id')::uuid;
 foreach v_key in array array['team_id','session_id','project_id','approved_project_id','draft_version_id','published_version_id'] loop
  if d->>v_key is null then continue;end if;
  if v_key='team_id' then select block_id into v_ref from public.teams where id=(d->>v_key)::uuid;
  elsif v_key='session_id' then select block_id into v_ref from public.studio_sessions where id=(d->>v_key)::uuid;
  elsif v_key in ('draft_version_id','published_version_id') then select block_id,team_id into v_ref,v_team from public.poster_versions where id=(d->>v_key)::uuid;
   if v_team is not null and v_team is distinct from (d->>'team_id')::uuid then raise exception using errcode='23514',message='Poster version must belong to this team';end if;
  else continue; -- project_id/approved_project_id reference the shared library
  end if;
  if v_ref is not null and v_class is not null and v_ref<>v_class then raise exception using errcode='23514',message='Linked records must belong to the same class';end if;
  v_class:=coalesce(v_class,v_ref);
 end loop;return new;
end $$;


alter table public.team_project_assignments add column if not exists predecessor_assignment_id uuid references public.team_project_assignments(id) on delete restrict;
create index if not exists team_project_predecessor_idx on public.team_project_assignments(predecessor_assignment_id);
create or replace function public.guard_project_assignment() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_status text; v_previous public.team_project_assignments; v_source_course text; v_target_course text;
begin
 if tg_op='UPDATE' and (new.project_id,new.team_id,new.predecessor_assignment_id) is distinct from (old.project_id,old.team_id,old.predecessor_assignment_id)
 and exists(select 1 from public.team_project_assignments where predecessor_assignment_id=old.id) then
  raise exception using errcode='23514',message='This assignment is referenced by a continuing project; keep its project and source link unchanged';
 end if;
 if tg_op='INSERT' or new.project_id is distinct from old.project_id or new.team_id is distinct from old.team_id then
  select status into v_status from public.projects where id=new.project_id for share;
  if v_status is distinct from 'active' then raise exception using errcode='23514',message='Only active library projects can receive new assignments';end if;
 end if;
 if new.predecessor_assignment_id is not null and (tg_op='INSERT' or (new.predecessor_assignment_id,new.project_id,new.team_id) is distinct from (old.predecessor_assignment_id,old.project_id,old.team_id)) then
  select * into v_previous from public.team_project_assignments where id=new.predecessor_assignment_id for share;
  if v_previous.id is null or v_previous.id=new.id or v_previous.project_id<>new.project_id then raise exception using errcode='23514',message='Continuation must reference an existing assignment of the same project';end if;
  perform public.require_team_class(new.team_id);
  perform public.require_team_class(v_previous.team_id);
  select b.course_code into v_source_course from public.teams t join public.teaching_blocks b on b.id=t.block_id where t.id=v_previous.team_id;
  select b.course_code into v_target_course from public.teams t join public.teaching_blocks b on b.id=t.block_id where t.id=new.team_id;
  if v_source_course<>'NIT3003' or v_target_course<>'NIT3004' then raise exception using errcode='23514',message='Continuation links must run from NIT3003 to NIT3004';end if;
 end if;
 if new.predecessor_assignment_id is not null then new.continued_from_previous_unit:=true;
 elsif tg_op='INSERT' or old.predecessor_assignment_id is not null or new.project_id is distinct from old.project_id then new.continued_from_previous_unit:=false;end if;
 if new.predecessor_assignment_id is not null then new.origin_unit:='NIT3003';end if;
 return new;
end $$;
revoke all on function public.guard_project_assignment() from public,anon,authenticated;
drop trigger if exists guard_project_assignment on public.team_project_assignments;
create trigger guard_project_assignment before insert or update on public.team_project_assignments for each row execute function public.guard_project_assignment();

-- Legacy project-selection RPC names remain compatible, now bound to the
-- authenticated activated student and their unique active class.
create or replace function public.require_project_student(p_student_id text) returns uuid
language plpgsql stable security definer set search_path='' as $$
declare v_class uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.student_accounts a where a.auth_user_id=auth.uid() and a.status='activated' and a.student_id=lower(trim(p_student_id))) then raise exception using errcode='42501',message='Activated student access required';end if;
 v_class:=public.current_teaching_block_id();
 if v_class is null then raise exception using errcode='42501',message='A single active enrolled class is required';end if;
 return v_class;
end $$;
revoke all on function public.require_project_student(text) from public,anon;
grant execute on function public.require_project_student(text) to authenticated;

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
  select * into v_block from public.teaching_blocks where id=public.require_project_student(p_student_id);

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
      where project.status = 'active' and v_block.project_setup_mode='student_selection'
    ), '[]'::jsonb)
  );
end;
$$;

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
  select * into v_block from public.teaching_blocks where id=public.require_project_student(p_student_id) for share;

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
      and status = 'active'
  ) then
    raise exception using errcode = 'P0001',
      message = 'That project is not active in the project library';
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
  select * into v_block from public.teaching_blocks where id=public.require_project_student(p_student_id);

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


revoke all on function public.get_project_checkin_context(text),public.select_team_project(text,uuid),public.submit_team_project_proposal(text,text,text,text,text,text,text) from public,anon;
grant execute on function public.get_project_checkin_context(text),public.select_team_project(text,uuid),public.submit_team_project_proposal(text,text,text,text,text,text,text) to authenticated;
commit;
