-- Sprint 6 Phase 2A: stable S1-S10 curriculum identity and student Project Journey.
-- Attendance remains governed by the existing studio session lifecycle.
-- Weekly Activities remain independent and are never mapped into Session Check-in.

alter table public.studio_sessions add column if not exists session_number smallint;
alter table public.studio_sessions add column if not exists week_number smallint;
alter table public.studio_sessions add column if not exists curriculum_focus text;

-- Number existing sessions deterministically without changing their dates, titles,
-- attendance or teacher-authored schedule windows.
with ranked as (
  select id,
         row_number() over (
           partition by block_id
           order by session_date, created_at, id
         )::smallint as session_number
  from public.studio_sessions
)
update public.studio_sessions session
set session_number = ranked.session_number
from ranked
where session.id = ranked.id
  and session.session_number is null
  and ranked.session_number between 1 and 10;

update public.studio_sessions
set week_number = case session_number
      when 1 then 1 when 2 then 1 when 3 then 1
      when 4 then 2 when 5 then 2 when 6 then 2
      when 7 then 3 when 8 then 3 when 9 then 3
      when 10 then 4 else week_number end,
    curriculum_focus = case session_number
      when 1 then 'Project Reconnect & Check-in'
      when 2 then 'Team Alignment & Four-Week Commitment'
      when 3 then 'Project Progress & Work Focus'
      when 4 then 'Progress Pre-check'
      when 5 then 'Progress Review'
      when 6 then 'Review → Action'
      when 7 then 'Application Progress + Technical Implementation Report'
      when 8 then 'Completion Check + Product Verification'
      when 9 then 'Final Readiness'
      when 10 then 'Platform Feedback + Final Presentation'
      else curriculum_focus end
where session_number between 1 and 10;

alter table public.studio_sessions drop constraint if exists studio_sessions_session_number_check;
alter table public.studio_sessions add constraint studio_sessions_session_number_check
  check (session_number is null or session_number between 1 and 10) not valid;
alter table public.studio_sessions validate constraint studio_sessions_session_number_check;

alter table public.studio_sessions drop constraint if exists studio_sessions_week_number_check;
alter table public.studio_sessions add constraint studio_sessions_week_number_check
  check (week_number is null or week_number between 1 and 4) not valid;
alter table public.studio_sessions validate constraint studio_sessions_week_number_check;

create unique index if not exists studio_sessions_block_session_number_idx
  on public.studio_sessions (block_id, session_number)
  where session_number is not null;

-- The current 2026 2B1 class is already past S1-S5. Preserve those sessions as
-- read-only history even if an old schedule row was left in "scheduled" state.
update public.studio_sessions session
set status = 'closed',
    closed_at = coalesce(session.closed_at, now())
from public.teaching_blocks block
where session.block_id = block.id
  and block.academic_year = 2026
  and block.block_code = '2B1'
  and session.session_number between 1 and 5
  and session.status <> 'closed';

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
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  if v_account.student_id is null then
    return '[]'::jsonb;
  end if;

  select roster.block_id into v_block_id
  from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id
    and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;

  if v_block_id is null then
    return '[]'::jsonb;
  end if;

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
      when session.status = 'closed'
        or (session.ends_at is not null and session.ends_at <= now()) then 'closed'
      when session.status = 'open'
        or (session.starts_at is not null and session.starts_at <= now()
          and (session.ends_at is null or session.ends_at > now())) then 'open'
      else 'scheduled' end,
    'checkedInAt', checkin.checked_in_at
  ) order by session.session_number nulls last, session.session_date, session.created_at), '[]'::jsonb)
  into v_result
  from public.studio_sessions session
  left join public.student_session_checkins checkin
    on checkin.session_id = session.id and checkin.auth_user_id = auth.uid()
  where session.block_id = v_block_id;

  return v_result;
end;
$$;

revoke all on function public.get_my_session_journey() from public;
grant execute on function public.get_my_session_journey() to authenticated;

-- Verification:
-- 1. Existing block session dates, titles, attendance and schedule windows are unchanged.
-- 2. Existing sessions are numbered S1-S10 in chronological order and have the agreed focus.
-- 3. 2026 2B1 S1-S5 are closed; S6-S10 retain their existing lifecycle state.
-- 4. Students receive only their active block and only their own Session Check-in history.
-- 5. Weekly Activity evidence is not mapped, copied or backfilled into the Session Journey.
-- 6. Existing get_my_session_history/check-in RPCs continue to work unchanged.
