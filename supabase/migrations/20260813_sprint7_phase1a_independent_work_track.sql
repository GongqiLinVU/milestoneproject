-- Sprint 7 Phase 1A: separate Work Track access from Session Check-in.
-- Default behaviour follows the Session schedule; teachers may independently open
-- or close an S6-S9 Work Track without changing attendance access.

alter table public.studio_sessions
  add column if not exists work_track_access text not null default 'session';

alter table public.studio_sessions
  drop constraint if exists studio_sessions_work_track_access_check;
alter table public.studio_sessions
  add constraint studio_sessions_work_track_access_check
  check (work_track_access in ('session', 'open', 'closed')) not valid;
alter table public.studio_sessions
  validate constraint studio_sessions_work_track_access_check;

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
  v_previous_response jsonb;
  v_previous_completion integer;
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

  if v_session.session_number > 6 then
    select track.response,
           track.response ->> 'nextFocus',
           case when jsonb_typeof(track.response -> 'completionPercent') = 'number'
             then (track.response ->> 'completionPercent')::numeric::integer else null end
    into v_previous_response, v_previous_next_focus, v_previous_completion
    from public.student_session_work_tracks track
    join public.studio_sessions previous on previous.id = track.session_id
    where track.auth_user_id = auth.uid()
      and track.block_id = v_block_id
      and previous.session_number < v_session.session_number
      and previous.session_number between 6 and 9
    order by previous.session_number desc
    limit 1;
  end if;

  return jsonb_build_object(
    'sessionId', v_session.id,
    'sessionNumber', v_session.session_number,
    'focus', coalesce(v_session.curriculum_focus, v_session.title),
    'taskGuidance', v_session.task_guidance,
    'expectedEvidence', v_session.expected_evidence,
    'isOpen', (
      v_session.work_track_access = 'open'
      or (
        v_session.work_track_access = 'session'
        and (
          v_session.status = 'open'
          or (
            v_session.status = 'scheduled'
            and v_session.starts_at <= now()
            and (v_session.ends_at is null or v_session.ends_at > now())
          )
        )
      )
    ),
    'response', coalesce(v_track.response, '{}'::jsonb),
    'updatedAt', v_track.updated_at,
    'previousNextFocus', v_previous_next_focus,
    'previousResponse', v_previous_response,
    'previousCompletion', v_previous_completion
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
  v_response jsonb;
  v_requirement_count integer;
  v_invalid_requirement_count integer;
  v_completion integer;
  v_stage text;
  v_path text;
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
    and (
      work_track_access = 'open'
      or (
        work_track_access = 'session'
        and (
          status = 'open'
          or (
            status = 'scheduled'
            and starts_at <= now()
            and (ends_at is null or ends_at > now())
          )
        )
      )
    );

  if v_account.student_id is null or v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Work Track can only be updated while this Track is open';
  end if;

  if jsonb_typeof(p_response -> 'requirements') is distinct from 'array' then
    raise exception using errcode = 'P0001', message = 'Add and assess the committed project requirements first';
  end if;

  select count(*),
         count(*) filter (
           where coalesce(btrim(requirement ->> 'label'), '') = ''
              or char_length(requirement ->> 'label') > 120
              or coalesce(requirement ->> 'score', '') not in ('0','25','50','75','100')
         ),
         round(avg(case when coalesce(requirement ->> 'score', '') in ('0','25','50','75','100') then (requirement ->> 'score')::numeric else null end))::integer
  into v_requirement_count, v_invalid_requirement_count, v_completion
  from jsonb_array_elements(p_response -> 'requirements') requirement;

  if v_requirement_count < 3 or v_requirement_count > 8 or v_invalid_requirement_count > 0 then
    raise exception using errcode = 'P0001', message = 'Assess the 3 core requirements and any optional requirements with the 0/25/50/75/100 standard';
  end if;

  if coalesce(p_response -> 'requirements' -> 0 ->> 'label', '') <> 'Core functionality meets the primary user needs'
     or coalesce(p_response -> 'requirements' -> 1 ->> 'label', '') <> 'Main workflow works end-to-end across integrated components'
     or coalesce(p_response -> 'requirements' -> 2 ->> 'label', '') <> 'Critical features are tested or validated with evidence' then
    raise exception using errcode = 'P0001', message = 'The 3 IT Milestone Project core requirements cannot be changed';
  end if;

  v_stage := case
    when v_completion <= 40 then 'Building'
    when v_completion <= 70 then 'Developing'
    when v_completion <= 90 then 'Completing'
    when v_completion < 100 then 'Finalising / Verifying'
    else 'Completed & Verified'
  end;
  v_path := case when v_completion <= 70 then 'building' when v_completion <= 90 then 'completing' else 'verifying' end;
  v_response := jsonb_set(
    jsonb_set(
      jsonb_set(p_response, '{completionPercent}', to_jsonb(v_completion), true),
      '{completionStage}', to_jsonb(v_stage), true
    ),
    '{progressPath}', to_jsonb(v_path), true
  );

  insert into public.student_session_work_tracks (
    session_id, student_id, auth_user_id, block_id, response
  ) values (
    v_session.id, v_account.student_id, auth.uid(), v_block_id, v_response
  )
  on conflict (session_id, student_id) do update
    set response = excluded.response,
        updated_at = now(),
        teacher_verified_completion = null,
        teacher_verification_status = null,
        teacher_verification_reason = null,
        teacher_verified_at = null,
        teacher_verified_by = null
  returning * into v_track;

  return jsonb_build_object('updatedAt', v_track.updated_at, 'response', v_track.response);
end;
$$;

revoke all on function public.save_my_session_work_track(uuid, jsonb) from public;
grant execute on function public.save_my_session_work_track(uuid, jsonb) to authenticated;

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
      when session.status = 'open' then 'open'
      when session.status = 'closed' then 'closed'
      when session.starts_at is not null and session.starts_at <= now() and (session.ends_at is null or session.ends_at > now()) then 'open'
      when session.ends_at is not null and session.ends_at <= now() then 'closed'
      else 'scheduled' end,
    'checkedInAt', checkin.checked_in_at,
    'workTrackUpdatedAt', track.updated_at,
    'workTrackStatus', case
      when session.session_number not between 6 and 9 then null
      when session.work_track_access = 'open' then 'open'
      when session.work_track_access = 'closed' then 'closed'
      when session.status = 'closed' or (session.ends_at is not null and session.ends_at <= now()) then 'closed'
      when session.status = 'open'
        or (
          session.status = 'scheduled'
          and session.starts_at <= now()
          and (session.ends_at is null or session.ends_at > now())
        ) then 'open'
      else 'scheduled'
    end,
    'platformFeedbackCompletedAt', feedback.submitted_at
  ) order by session.session_number nulls last, session.session_date, session.created_at), '[]'::jsonb)
  into v_result
  from public.studio_sessions session
  left join public.student_session_checkins checkin
    on checkin.session_id = session.id and checkin.auth_user_id = auth.uid()
  left join public.student_session_work_tracks track
    on track.session_id = session.id and track.auth_user_id = auth.uid()
  left join public.student_platform_feedback feedback
    on feedback.session_id = session.id and feedback.auth_user_id = auth.uid()
  where session.block_id = v_block_id;

  return v_result;
end;
$$;

revoke all on function public.get_my_session_journey() from public;
grant execute on function public.get_my_session_journey() to authenticated;

-- Security remains authenticated-only after function replacement.
revoke all on function public.get_my_session_work_track(uuid) from public;
grant execute on function public.get_my_session_work_track(uuid) to authenticated;
revoke all on function public.save_my_session_work_track(uuid, jsonb) from public;
grant execute on function public.save_my_session_work_track(uuid, jsonb) to authenticated;
revoke all on function public.get_my_session_journey() from public;
grant execute on function public.get_my_session_journey() to authenticated;

-- Verification:
-- 1. Existing rows default to Follow session without changing Check-in or evidence.
-- 2. Teacher may open S8 Track while S8 Check-in is closed and S9 is current.
-- 3. S8 and S9 Tracks may be open simultaneously.
-- 4. Closing a Track preserves saved evidence as read-only.
-- 5. Returning to Follow session restores schedule-derived Track access.
