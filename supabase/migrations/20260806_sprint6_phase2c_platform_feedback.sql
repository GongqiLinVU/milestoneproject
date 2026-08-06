-- Sprint 6 Phase 2C: S10 individual Platform Feedback checkpoint.
-- This is intentionally separate from attendance, Weekly Activities and S6-S9 Work Track.

create table if not exists public.student_platform_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.studio_sessions(id) on delete restrict,
  student_id text not null references public.student_accounts(student_id) on delete restrict,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  block_id uuid not null references public.teaching_blocks(id) on delete restrict,
  overall_usefulness smallint not null check (overall_usefulness between 1 and 5),
  engagement_help text not null check (engagement_help in ('Yes', 'Somewhat', 'No')),
  most_useful_feature text not null check (most_useful_feature in ('Session Check-in', 'Weekly Activities', 'Teacher Review', 'Poster Gallery', 'Work Track', 'Peer Feedback')),
  improve_area text not null check (improve_area in ('Navigation', 'Activities', 'Feedback', 'Session workflow', 'Poster', 'Other')),
  recommendation text not null check (recommendation in ('Yes', 'Maybe', 'No')),
  change_note text check (change_note is null or char_length(change_note) <= 300),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, student_id),
  unique (session_id, auth_user_id)
);

create index if not exists student_platform_feedback_block_session_idx
  on public.student_platform_feedback (block_id, session_id);

alter table public.student_platform_feedback enable row level security;
revoke all on public.student_platform_feedback from anon, authenticated;
grant select on public.student_platform_feedback to authenticated;

drop policy if exists "students read own platform feedback" on public.student_platform_feedback;
create policy "students read own platform feedback" on public.student_platform_feedback
for select to authenticated using (auth_user_id = auth.uid());

drop policy if exists "teachers read platform feedback" on public.student_platform_feedback;

create or replace function public.get_my_platform_feedback(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_session public.studio_sessions%rowtype;
  v_feedback public.student_platform_feedback%rowtype;
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
  where id = p_session_id and block_id = v_block_id and session_number = 10;

  if v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Final Platform Feedback is not available';
  end if;

  select * into v_feedback
  from public.student_platform_feedback
  where session_id = v_session.id and auth_user_id = auth.uid();

  return jsonb_build_object(
    'sessionId', v_session.id,
    'focus', coalesce(v_session.curriculum_focus, v_session.title),
    'isOpen', (v_session.status = 'open' or (v_session.status = 'scheduled' and v_session.starts_at <= now() and (v_session.ends_at is null or v_session.ends_at > now()))),
    'response', case when v_feedback.id is null then '{}'::jsonb else jsonb_build_object(
      'overallUsefulness', v_feedback.overall_usefulness,
      'engagementHelp', v_feedback.engagement_help,
      'mostUsefulFeature', v_feedback.most_useful_feature,
      'improveArea', v_feedback.improve_area,
      'recommendation', v_feedback.recommendation,
      'changeNote', coalesce(v_feedback.change_note, '')
    ) end,
    'submittedAt', v_feedback.submitted_at,
    'updatedAt', v_feedback.updated_at
  );
end;
$$;

revoke all on function public.get_my_platform_feedback(uuid) from public;
grant execute on function public.get_my_platform_feedback(uuid) to authenticated;

create or replace function public.save_my_platform_feedback(p_session_id uuid, p_response jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_session public.studio_sessions%rowtype;
  v_feedback public.student_platform_feedback%rowtype;
  v_block_id uuid;
  v_usefulness integer;
  v_engagement text;
  v_feature text;
  v_improve text;
  v_recommendation text;
  v_note text;
begin
  if p_response is null or jsonb_typeof(p_response) <> 'object' or length(p_response::text) > 3000 then
    raise exception using errcode = 'P0001', message = 'Platform Feedback is invalid';
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
    and session_number = 10
    and (status = 'open' or (status = 'scheduled' and starts_at <= now() and (ends_at is null or ends_at > now())));

  if v_account.student_id is null or v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Platform Feedback can only be updated while Session 10 is open';
  end if;

  begin
    v_usefulness := (p_response ->> 'overallUsefulness')::integer;
  exception when invalid_text_representation then
    raise exception using errcode = 'P0001', message = 'Choose an overall usefulness rating from 1 to 5';
  end;
  v_engagement := p_response ->> 'engagementHelp';
  v_feature := p_response ->> 'mostUsefulFeature';
  v_improve := p_response ->> 'improveArea';
  v_recommendation := p_response ->> 'recommendation';
  v_note := nullif(btrim(p_response ->> 'changeNote'), '');

  if v_usefulness is null
     or v_usefulness not between 1 and 5
     or coalesce(v_engagement, '') not in ('Yes', 'Somewhat', 'No')
     or coalesce(v_feature, '') not in ('Session Check-in', 'Weekly Activities', 'Teacher Review', 'Poster Gallery', 'Work Track', 'Peer Feedback')
     or coalesce(v_improve, '') not in ('Navigation', 'Activities', 'Feedback', 'Session workflow', 'Poster', 'Other')
     or coalesce(v_recommendation, '') not in ('Yes', 'Maybe', 'No')
     or char_length(coalesce(v_note, '')) > 300 then
    raise exception using errcode = 'P0001', message = 'Complete all required Platform Feedback choices';
  end if;

  insert into public.student_platform_feedback (
    session_id, student_id, auth_user_id, block_id, overall_usefulness, engagement_help,
    most_useful_feature, improve_area, recommendation, change_note
  ) values (
    v_session.id, v_account.student_id, auth.uid(), v_block_id, v_usefulness, v_engagement,
    v_feature, v_improve, v_recommendation, v_note
  )
  on conflict (session_id, student_id) do update
    set overall_usefulness = excluded.overall_usefulness,
        engagement_help = excluded.engagement_help,
        most_useful_feature = excluded.most_useful_feature,
        improve_area = excluded.improve_area,
        recommendation = excluded.recommendation,
        change_note = excluded.change_note,
        updated_at = now()
  returning * into v_feedback;

  return jsonb_build_object('submittedAt', v_feedback.submitted_at, 'updatedAt', v_feedback.updated_at);
end;
$$;

revoke all on function public.save_my_platform_feedback(uuid, jsonb) from public;
grant execute on function public.save_my_platform_feedback(uuid, jsonb) to authenticated;

create or replace function public.get_teacher_platform_feedback_status(p_session_id uuid)
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

  select * into v_session from public.studio_sessions where id = p_session_id and session_number = 10;
  if v_session.id is null then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'studentId', roster.student_id,
    'studentName', coalesce(roster.preferred_name, roster.full_name),
    'teamName', concat('Team ', roster.team_number),
    'completedAt', feedback.submitted_at,
    'updatedAt', feedback.updated_at
  ) order by roster.team_number, coalesce(roster.preferred_name, roster.full_name), roster.student_id), '[]'::jsonb)
  into v_result
  from public.student_roster roster
  left join public.student_platform_feedback feedback
    on feedback.session_id = v_session.id and feedback.student_id = roster.student_id
  where roster.block_id = v_session.block_id;

  return v_result;
end;
$$;

revoke all on function public.get_teacher_platform_feedback_status(uuid) from public;
grant execute on function public.get_teacher_platform_feedback_status(uuid) to authenticated;

-- Extend the Session Journey with only the authenticated student's S10 completion marker.
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
    'workTrackUpdatedAt', track.updated_at,
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

-- Verification:
-- 1. S10 feedback is one individual record per student/session and cannot be written outside the open S10 window.
-- 2. The five structured questions are required; the final change note is optional and capped at 300 characters.
-- 3. Teacher status exposes completion only; it does not convert feedback into a grade.
-- 4. Session Check-in, Weekly Activities and S6-S9 Work Track remain independent.
