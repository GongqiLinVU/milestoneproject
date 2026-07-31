-- Sprint 5 Phase 3: teacher-opened studio sessions and authenticated check-in.

create or replace function public.get_my_student_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts;
  v_roster public.student_roster;
  v_block public.teaching_blocks;
  v_project public.projects%rowtype;
  v_checkin boolean;
begin
  select * into v_account from public.student_accounts
  where auth_user_id = auth.uid() and status <> 'disabled';
  if v_account.auth_user_id is null then
    raise exception using errcode = 'P0001', message = 'Student account is not available';
  end if;

  if (select count(*) from public.student_roster roster
      join public.teaching_blocks block on block.id = roster.block_id
      where roster.student_id = v_account.student_id and block.status = 'active') <> 1 then
    raise exception using errcode = 'P0001', message = 'Student must belong to exactly one active block';
  end if;

  select roster.* into v_roster
  from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;

  select * into v_block from public.teaching_blocks where id = v_roster.block_id;

  select project.* into v_project
  from public.teams team
  join public.team_project_assignments assignment on assignment.team_id = team.id
  join public.projects project on project.id = assignment.project_id
  where team.block_id = v_roster.block_id and team.team_number = v_roster.team_number;

  select exists(select 1 from public.student_checkins
    where lower(trim(student_id)) = v_account.student_id)
    into v_checkin;

  return jsonb_build_object(
    'status', v_account.status,
    'studentId', v_account.student_id,
    'studentName', coalesce(v_roster.preferred_name, v_roster.full_name),
    'blockLabel', concat(v_block.academic_year, ' · ', v_block.block_code),
    'teamName', concat('Team ', v_roster.team_number),
    'projectName', coalesce(v_project.title, v_roster.project_name),
    'projectProblem', v_project.problem,
    'projectDescription', v_project.description,
    'projectTargetUsers', v_project.target_users,
    'projectExpectedOutcomes', v_project.expected_outcomes,
    'projectCategory', v_project.category,
    'projectDifficulty', v_project.difficulty,
    'projectSource', case when v_project.id is not null then 'catalogue' when v_roster.project_name is not null then 'roster' else 'none' end,
    'checkinRecognised', v_checkin
  );
end;
$$;

revoke all on function public.get_my_student_context() from public;
grant execute on function public.get_my_student_context() to authenticated;

create table if not exists public.studio_sessions (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.teaching_blocks(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 3 and 120),
  session_date date not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'open', 'closed')),
  starts_at timestamptz,
  ends_at timestamptz,
  opened_at timestamptz,
  closed_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.studio_sessions add column if not exists starts_at timestamptz;
alter table public.studio_sessions add column if not exists ends_at timestamptz;
alter table public.studio_sessions alter column opened_at drop not null;
alter table public.studio_sessions alter column opened_at drop default;
alter table public.studio_sessions drop constraint if exists studio_sessions_status_check;
alter table public.studio_sessions add constraint studio_sessions_status_check check (status in ('scheduled', 'open', 'closed')) not valid;
alter table public.studio_sessions validate constraint studio_sessions_status_check;
alter table public.studio_sessions drop constraint if exists studio_sessions_schedule_check;
alter table public.studio_sessions add constraint studio_sessions_schedule_check check (ends_at is null or starts_at is null or ends_at > starts_at) not valid;
alter table public.studio_sessions validate constraint studio_sessions_schedule_check;

create unique index if not exists studio_sessions_one_open_per_block_idx
  on public.studio_sessions (block_id) where status = 'open';

create table if not exists public.student_session_checkins (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.studio_sessions(id) on delete restrict,
  student_id text not null references public.student_accounts(student_id) on delete restrict,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  block_id uuid not null references public.teaching_blocks(id) on delete restrict,
  checked_in_at timestamptz not null default now(),
  unique (session_id, student_id),
  unique (session_id, auth_user_id)
);

alter table public.studio_sessions enable row level security;
alter table public.student_session_checkins enable row level security;

revoke all on public.studio_sessions, public.student_session_checkins from anon, authenticated;
grant select, insert, update on public.studio_sessions to authenticated;
grant select on public.student_session_checkins to authenticated;

drop policy if exists "teachers manage studio sessions" on public.studio_sessions;
create policy "teachers manage studio sessions" on public.studio_sessions
for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

drop policy if exists "teachers read session checkins" on public.student_session_checkins;
create policy "teachers read session checkins" on public.student_session_checkins
for select to authenticated using (public.is_teacher());

drop policy if exists "students read own session checkins" on public.student_session_checkins;
create policy "students read own session checkins" on public.student_session_checkins
for select to authenticated using (auth_user_id = auth.uid());

create or replace function public.get_my_open_studio_session()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_roster public.student_roster%rowtype;
  v_session public.studio_sessions%rowtype;
  v_checked_in_at timestamptz;
begin
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  if v_account.student_id is null then
    return null;
  end if;

  select roster.* into v_roster
  from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;

  select * into v_session
  from public.studio_sessions
  where block_id = v_roster.block_id
    and (status = 'open' or (status = 'scheduled' and starts_at <= now() and (ends_at is null or ends_at > now())))
  limit 1;

  if v_session.id is null then
    return null;
  end if;

  select checked_in_at into v_checked_in_at
  from public.student_session_checkins
  where session_id = v_session.id and auth_user_id = auth.uid();

  return jsonb_build_object(
    'sessionId', v_session.id,
    'title', v_session.title,
    'sessionDate', v_session.session_date,
    'checkedInAt', v_checked_in_at
  );
end;
$$;

revoke all on function public.get_my_open_studio_session() from public;
grant execute on function public.get_my_open_studio_session() to authenticated;

create or replace function public.get_my_session_history()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_block_id uuid;
  v_result jsonb;
begin
  select * into v_account from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';
  select roster.block_id into v_block_id from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active' limit 1;
  if v_block_id is null then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'sessionId', session.id, 'title', session.title, 'sessionDate', session.session_date,
    'startsAt', session.starts_at, 'endsAt', session.ends_at,
    'status', case when session.status = 'closed' or (session.ends_at is not null and session.ends_at <= now()) then 'closed'
      when session.status = 'open' or (session.starts_at <= now() and (session.ends_at is null or session.ends_at > now())) then 'open' else 'scheduled' end,
    'checkedInAt', checkin.checked_in_at
  ) order by session.session_date, session.created_at), '[]'::jsonb) into v_result
  from public.studio_sessions session left join public.student_session_checkins checkin
    on checkin.session_id = session.id and checkin.auth_user_id = auth.uid()
  where session.block_id = v_block_id;
  return v_result;
end;
$$;

revoke all on function public.get_my_session_history() from public;
grant execute on function public.get_my_session_history() to authenticated;

create or replace function public.check_in_to_studio_session(p_session_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_session public.studio_sessions%rowtype;
  v_block_id uuid;
  v_checked_in_at timestamptz;
begin
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  select * into v_session
  from public.studio_sessions
  where id = p_session_id
    and (status = 'open' or (status = 'scheduled' and starts_at <= now() and (ends_at is null or ends_at > now())));

  select roster.block_id into v_block_id
  from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id
    and roster.block_id = v_session.block_id
    and block.status = 'active'
  limit 1;

  if v_account.student_id is null or v_session.id is null or v_block_id is null then
    raise exception using errcode = 'P0001', message = 'Open session does not match the authenticated student';
  end if;

  insert into public.student_session_checkins (
    session_id, student_id, auth_user_id, block_id
  ) values (
    v_session.id, v_account.student_id, auth.uid(), v_block_id
  )
  on conflict (session_id, student_id) do update
    set checked_in_at = public.student_session_checkins.checked_in_at
  returning checked_in_at into v_checked_in_at;

  return v_checked_in_at;
end;
$$;

revoke all on function public.check_in_to_studio_session(uuid) from public;
grant execute on function public.check_in_to_studio_session(uuid) to authenticated;

-- Verification:
-- 1. A teacher can open only one session per block and can close it.
-- 2. An activated student in that block receives only the open session.
-- 3. Check-in is idempotent and the original timestamp is preserved.
-- 4. Students cannot check in to another block or a closed session.
-- 5. Students can read only their own check-in; teachers can read the block.
-- 6. Scheduled sessions cannot be checked into before starts_at or after ends_at.
--
-- Rollback:
-- Close open sessions, revoke both RPCs, then deploy the previous frontend.
-- Preserve both tables once real attendance exists; they are historical evidence.
