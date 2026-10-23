-- Apply before deploying the optional-team UI. Existing allocations are retained.
begin;
alter table public.student_roster alter column team_number drop not null;
alter table public.student_roster alter column team_number drop default;
create or replace function public.ensure_roster_team() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.team_number is not null then
  insert into public.teams(block_id,team_number) values(new.block_id,new.team_number)
  on conflict(block_id,team_number) do nothing;
 end if;
 return new;
end; $$;
revoke all on function public.ensure_roster_team() from public,anon,authenticated;
drop trigger if exists ensure_roster_team on public.student_roster;
create trigger ensure_roster_team after insert or update of block_id,team_number on public.student_roster for each row execute function public.ensure_roster_team();
-- Restore missing identities without replacing any team/project/history IDs.
insert into public.teams(block_id,team_number)
select distinct block_id,team_number from public.student_roster where team_number is not null
on conflict(block_id,team_number) do nothing;
create or replace function public.get_my_student_context()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_account public.student_accounts; v_roster public.student_roster;
  v_block public.teaching_blocks; v_project public.projects%rowtype; v_checkin boolean;
begin
  select * into v_account from public.student_accounts where auth_user_id = auth.uid() and status <> 'disabled';
  if v_account.auth_user_id is null then raise exception using errcode='P0001', message='Student account is not available'; end if;
  select roster.* into v_roster from public.student_roster roster
  join public.teaching_blocks block on block.id=roster.block_id
  where roster.student_id=v_account.student_id and block.status='active'
  order by block.starts_on desc nulls last, block.created_at desc limit 1;
  if v_roster.id is null then raise exception using errcode='P0001', message='No active roster context is available'; end if;
  select * into v_block from public.teaching_blocks where id=v_roster.block_id;
  select project.* into v_project from public.teams team
  join public.team_project_assignments assignment on assignment.team_id=team.id
  join public.projects project on project.id=assignment.project_id
  where team.block_id=v_roster.block_id and team.team_number=v_roster.team_number;
  select exists(select 1 from public.student_checkins where block_id=v_roster.block_id and lower(trim(student_id))=v_account.student_id) into v_checkin;
  return jsonb_build_object(
    'status',v_account.status,'studentId',v_account.student_id,'studentName',coalesce(v_roster.preferred_name,v_roster.full_name),
    'blockId',v_block.id,'blockLabel',concat(v_block.course_code,' · ',v_block.academic_year,' · ',v_block.block_code,' · ',v_block.class_code),'teamAssigned',v_roster.team_number is not null,'teamName',case when v_roster.team_number is null then 'Not assigned' else concat('Team ',v_roster.team_number) end,
    'intakeMode',v_block.intake_mode,
    'projectName',case when v_roster.team_number is not null then coalesce(v_project.title,v_roster.project_name) end,'projectProblem',v_project.problem,'projectDescription',v_project.description,
    'projectTargetUsers',v_project.target_users,'projectExpectedOutcomes',v_project.expected_outcomes,'projectCategory',v_project.category,
    'projectDifficulty',v_project.difficulty,'projectSource',case when v_roster.team_number is null then 'none' when v_project.id is not null then 'catalogue' when v_roster.project_name is not null then 'roster' else 'none' end,
    'checkinRecognised',v_checkin);
end;
$$;
create or replace function public.assign_activity_team_from_roster()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id text;
  v_team_name text;
  v_team_column text;
begin
  v_student_id := lower(trim(
    case
      when tg_table_name = 'poster_reviews'
        then to_jsonb(new) ->> 'reviewer_student_id'
      else to_jsonb(new) ->> 'student_id'
    end
  ));

  select concat('Team ', roster.team_number)
  into v_team_name
  from public.student_roster roster
  where roster.block_id = new.block_id
    and roster.student_id = v_student_id
    and roster.team_number is not null
  limit 1;

  if v_team_name is null then
    raise exception using
      errcode = 'P0001',
      message = 'Student has no team in this class. Ask your teacher to assign a team first.';
  end if;

  v_team_column := case
    when tg_table_name = 'poster_reviews' then 'reviewer_team'
    else 'team_name'
  end;

  new := jsonb_populate_record(
    new,
    jsonb_build_object(v_team_column, v_team_name)
  );
  return new;
end;
$$;

revoke all on function public.assign_activity_team_from_roster() from public;

create or replace function public.complete_student_activation(p_goal text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts;
  v_roster public.student_roster;
  v_existing_id uuid;
begin
  select * into v_account from public.student_accounts
  where auth_user_id = auth.uid() and status = 'ready' for update;
  if v_account.auth_user_id is null then
    raise exception using errcode = 'P0001', message = 'Account is not ready to activate';
  end if;
  select roster.* into v_roster from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  limit 1;
  if v_roster.id is null then
    raise exception using errcode = 'P0001', message = 'Active roster context is missing';
  end if;

  if v_roster.team_number is null then raise exception 'Student has no team in this class. Ask your teacher to assign a team first.'; end if;

  select id into v_existing_id from public.student_checkins
  where lower(trim(student_id)) = v_account.student_id;
  if v_existing_id is not null then
    update public.student_checkins set auth_user_id = auth.uid()
    where id = v_existing_id and auth_user_id is null;
  else
    if char_length(trim(coalesce(p_goal, ''))) < 3 then
      raise exception using errcode = 'P0001', message = 'A Week 1 recovery goal is required';
    end if;
    insert into public.student_checkins (
      student_id, student_name, team_name, goal, block_id, auth_user_id
    ) values (
      v_account.student_id, coalesce(v_roster.preferred_name, v_roster.full_name),
      concat('Team ', v_roster.team_number), trim(p_goal), v_roster.block_id, auth.uid()
    );
  end if;
  update public.student_accounts
  set status = 'activated', activated_at = now()
  where auth_user_id = auth.uid();
  return public.get_my_student_context();
end;
$$;
revoke all on function public.complete_student_activation(text) from public;
grant execute on function public.complete_student_activation(text) to authenticated;

-- Teacher review lists must label unassigned students, never fabricate "Team ".
do $$
declare signature text;definition text;
begin
 foreach signature in array array['public.get_teacher_session_intakes(uuid)','public.get_teacher_session_work_tracks(uuid)','public.get_teacher_platform_feedback_status(uuid)'] loop
  definition:=pg_get_functiondef(signature::regprocedure);
  if position('then ''Not assigned'' else concat(''Team '', roster.team_number)' in definition)>0 then continue;end if;
  definition:=replace(definition, 'concat(''Team '', roster.team_number)', 'case when roster.team_number is null then ''Not assigned'' else concat(''Team '', roster.team_number) end');
  execute definition;
 end loop;
end $$;
commit;
