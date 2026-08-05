-- Sprint 6 Phase 2B: independent Session Task + Work Track for S6-S9.
-- Attendance and Weekly Activities remain separate evidence streams.

alter table public.studio_sessions add column if not exists task_guidance text;
alter table public.studio_sessions add column if not exists expected_evidence text;

alter table public.studio_sessions drop constraint if exists studio_sessions_task_guidance_length_check;
alter table public.studio_sessions add constraint studio_sessions_task_guidance_length_check
  check (task_guidance is null or char_length(task_guidance) <= 600) not valid;
alter table public.studio_sessions validate constraint studio_sessions_task_guidance_length_check;

alter table public.studio_sessions drop constraint if exists studio_sessions_expected_evidence_length_check;
alter table public.studio_sessions add constraint studio_sessions_expected_evidence_length_check
  check (expected_evidence is null or char_length(expected_evidence) <= 400) not valid;
alter table public.studio_sessions validate constraint studio_sessions_expected_evidence_length_check;

create table if not exists public.student_session_work_tracks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.studio_sessions(id) on delete restrict,
  student_id text not null references public.student_accounts(student_id) on delete restrict,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  block_id uuid not null references public.teaching_blocks(id) on delete restrict,
  response jsonb not null default '{}'::jsonb check (jsonb_typeof(response) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, student_id),
  unique (session_id, auth_user_id)
);

create index if not exists student_session_work_tracks_block_session_idx
  on public.student_session_work_tracks (block_id, session_id);

alter table public.student_session_work_tracks enable row level security;
revoke all on public.student_session_work_tracks from anon, authenticated;
grant select on public.student_session_work_tracks to authenticated;

drop policy if exists "teachers read session work tracks" on public.student_session_work_tracks;
create policy "teachers read session work tracks" on public.student_session_work_tracks
for select to authenticated using (public.is_teacher());

drop policy if exists "students read own session work tracks" on public.student_session_work_tracks;
create policy "students read own session work tracks" on public.student_session_work_tracks
for select to authenticated using (auth_user_id = auth.uid());

create or replace function public.get_my_session_work_track(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_session public.studio_sessions%rowtype;
  v_track public.student_session_work_tracks%rowtype;
  v_previous_next_focus text;
  v_block_id uuid;
begin
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  if v_account.student_id is null then
    raise exception using errcode = 'P0001', message = 'Student account is not available';
  end if;

  select roster.block_id into v_block_id
  from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;

  select * into v_session
  from public.studio_sessions
  where id = p_session_id
    and block_id = v_block_id
    and session_number between 6 and 9;

  if v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Session Work Track is not available';
  end if;

  select * into v_track
  from public.student_session_work_tracks
  where session_id = v_session.id and auth_user_id = auth.uid();

  if v_session.session_number = 7 then
    select track.response ->> 'nextFocus' into v_previous_next_focus
    from public.student_session_work_tracks track
    join public.studio_sessions previous on previous.id = track.session_id
    where track.auth_user_id = auth.uid()
      and track.block_id = v_block_id
      and previous.session_number = 6
    limit 1;
  end if;

  return jsonb_build_object(
    'sessionId', v_session.id,
    'sessionNumber', v_session.session_number,
    'focus', coalesce(v_session.curriculum_focus, v_session.title),
    'taskGuidance', v_session.task_guidance,
    'expectedEvidence', v_session.expected_evidence,
    'isOpen', (v_session.status = 'open' or (v_session.status = 'scheduled' and v_session.starts_at <= now() and (v_session.ends_at is null or v_session.ends_at > now()))),
    'response', coalesce(v_track.response, '{}'::jsonb),
    'updatedAt', v_track.updated_at,
    'previousNextFocus', v_previous_next_focus
  );
end;
$$;

revoke all on function public.get_my_session_work_track(uuid) from public;
grant execute on function public.get_my_session_work_track(uuid) to authenticated;

create or replace function public.save_my_session_work_track(p_session_id uuid, p_response jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_session public.studio_sessions%rowtype;
  v_block_id uuid;
  v_track public.student_session_work_tracks%rowtype;
begin
  if p_response is null or jsonb_typeof(p_response) <> 'object' or length(p_response::text) > 12000 then
    raise exception using errcode = 'P0001', message = 'Work Track response is invalid';
  end if;

  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  select roster.block_id into v_block_id
  from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;

  select * into v_session
  from public.studio_sessions
  where id = p_session_id
    and block_id = v_block_id
    and session_number between 6 and 9
    and (status = 'open' or (status = 'scheduled' and starts_at <= now() and (ends_at is null or ends_at > now())));

  if v_account.student_id is null or v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Work Track can only be updated while this session is open';
  end if;

  insert into public.student_session_work_tracks (
    session_id, student_id, auth_user_id, block_id, response
  ) values (
    v_session.id, v_account.student_id, auth.uid(), v_block_id, p_response
  )
  on conflict (session_id, student_id) do update
    set response = excluded.response,
        updated_at = now()
  returning * into v_track;

  return jsonb_build_object('updatedAt', v_track.updated_at, 'response', v_track.response);
end;
$$;

revoke all on function public.save_my_session_work_track(uuid, jsonb) from public;
grant execute on function public.save_my_session_work_track(uuid, jsonb) to authenticated;

create or replace function public.get_teacher_session_work_tracks(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_session public.studio_sessions%rowtype;
  v_result jsonb;
begin
  if not public.is_teacher() then
    raise exception using errcode = 'P0001', message = 'Teacher access required';
  end if;

  select * into v_session from public.studio_sessions where id = p_session_id;
  if v_session.id is null then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'studentId', roster.student_id,
    'studentName', coalesce(roster.preferred_name, roster.full_name),
    'teamName', concat('Team ', roster.team_number),
    'checkedInAt', checkin.checked_in_at,
    'response', track.response,
    'updatedAt', track.updated_at
  ) order by roster.team_number, coalesce(roster.preferred_name, roster.full_name), roster.student_id), '[]'::jsonb)
  into v_result
  from public.student_roster roster
  left join public.student_session_checkins checkin
    on checkin.session_id = v_session.id and checkin.student_id = roster.student_id
  left join public.student_session_work_tracks track
    on track.session_id = v_session.id and track.student_id = roster.student_id
  where roster.block_id = v_session.block_id;

  return v_result;
end;
$$;

revoke all on function public.get_teacher_session_work_tracks(uuid) from public;
grant execute on function public.get_teacher_session_work_tracks(uuid) to authenticated;

-- Extend the Phase 2A Journey with only the student's own Track completion marker.
create or replace function public.get_my_session_journey()
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
  if v_account.student_id is null then return '[]'::jsonb; end if;

  select roster.block_id into v_block_id
  from public.student_roster roster join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc limit 1;
  if v_block_id is null then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'sessionId', session.id,
    'sessionNumber', session.session_number,
    'weekNumber', session.week_number,
    'focus', coalesce(session.curriculum_focus, session.title),
    'title', session.title,
    'sessionDate', session.session_date,
    'startsAt', session.starts_at,
    'endsAt', session.ends_at,
    'status', case
      when session.status = 'closed' or (session.ends_at is not null and session.ends_at <= now()) then 'closed'
      when session.status = 'open' or (session.starts_at is not null and session.starts_at <= now() and (session.ends_at is null or session.ends_at > now())) then 'open'
      else 'scheduled' end,
    'checkedInAt', checkin.checked_in_at,
    'workTrackUpdatedAt', track.updated_at
  ) order by session.session_number nulls last, session.session_date, session.created_at), '[]'::jsonb)
  into v_result
  from public.studio_sessions session
  left join public.student_session_checkins checkin
    on checkin.session_id = session.id and checkin.auth_user_id = auth.uid()
  left join public.student_session_work_tracks track
    on track.session_id = session.id and track.auth_user_id = auth.uid()
  where session.block_id = v_block_id;

  return v_result;
end;
$$;

revoke all on function public.get_my_session_journey() from public;
grant execute on function public.get_my_session_journey() to authenticated;

-- Verification:
-- 1. Session Check-in and Weekly Activity tables/functions are unchanged.
-- 2. S6-S9 accept at most one Work Track per student/session and only save while open.
-- 3. Closed Work Tracks remain readable but cannot be edited by students.
-- 4. S7 may read S6 nextFocus as context; it is not copied into S7 evidence.
-- 5. Teacher evidence is block/session scoped and includes roster students even when Track is missing.
