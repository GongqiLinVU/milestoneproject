/*
  2026 2B1 Intake effectiveness and later-participation export

  READ ONLY
  - Does not create or modify database objects.
  - Removes names, emails and raw Student IDs.
  - Uses a temporary pseudonymous key to connect one student's records.
  - Raw output must not be committed to Git.
*/

with target_block as (
  select id, academic_year, block_code
  from public.teaching_blocks
  where academic_year = 2026 and block_code = '2B1'
  limit 1
),
roster as (
  select
    r.block_id,
    r.student_id,
    left(md5(lower(trim(r.student_id))), 12) as student_key,
    r.team_number,
    r.project_name
  from public.student_roster r
  join target_block b on b.id = r.block_id
),
observation_records as (
  select
    '00_roster'::text as record_type,
    r.student_key,
    r.team_number,
    null::integer as week_number,
    null::integer as session_number,
    null::timestamptz as submitted_at,
    jsonb_build_object('project_name', r.project_name) as response
  from roster r

  union all

  select
    '01_week1_checkin', r.student_key, r.team_number, 1, null, c.created_at,
    to_jsonb(c) - 'id' - 'student_id' - 'student_name' - 'block_id'
      - 'created_at' - 'updated_at' - 'team_name'
  from public.student_checkins c
  join roster r
    on lower(trim(r.student_id)) = lower(trim(c.student_id))
   and c.block_id = r.block_id

  union all

  select
    '02_four_week_promise', r.student_key, r.team_number, 1, null, p.created_at,
    to_jsonb(p) - 'id' - 'student_id' - 'student_name' - 'block_id'
      - 'created_at' - 'updated_at' - 'team_name'
  from public.student_promises p
  join roster r
    on lower(trim(r.student_id)) = lower(trim(p.student_id))
   and p.block_id = r.block_id

  union all

  select
    '03_team_health', r.student_key, r.team_number, 1, null, h.created_at,
    to_jsonb(h) - 'id' - 'student_id' - 'student_name' - 'block_id'
      - 'created_at' - 'updated_at' - 'team_name'
  from public.team_health_checks h
  join roster r
    on lower(trim(r.student_id)) = lower(trim(h.student_id))
   and h.block_id = r.block_id

  union all

  select
    '04_week2_precheck', r.student_key, r.team_number, 2, null, w.created_at,
    to_jsonb(w) - 'id' - 'student_id' - 'student_name' - 'block_id'
      - 'created_at' - 'updated_at' - 'team_name'
  from public.week2_progress_reviews w
  join roster r
    on lower(trim(r.student_id)) = lower(trim(w.student_id))
   and w.block_id = r.block_id

  union all

  select
    '05_weekly_checkout', r.student_key, r.team_number,
    e.week_number::integer, null, e.created_at,
    to_jsonb(e) - 'id' - 'student_id' - 'student_name' - 'block_id'
      - 'created_at' - 'updated_at' - 'team_name' - 'week_number'
  from public.weekly_engagement_checkouts e
  join roster r
    on lower(trim(r.student_id)) = lower(trim(e.student_id))
   and e.block_id = r.block_id

  union all

  select
    '06_session_checkin', r.student_key, r.team_number,
    s.week_number::integer, s.session_number::integer, sc.checked_in_at,
    to_jsonb(sc) - 'id' - 'student_id' - 'auth_user_id' - 'block_id'
      - 'session_id' - 'checked_in_at' - 'created_at' - 'updated_at'
  from public.student_session_checkins sc
  join public.studio_sessions s on s.id = sc.session_id
  join roster r
    on lower(trim(r.student_id)) = lower(trim(sc.student_id))
   and s.block_id = r.block_id

  union all

  select
    '07_session_work_track', r.student_key, r.team_number,
    s.week_number::integer, s.session_number::integer, wt.updated_at,
    jsonb_build_object(
      'student_response', wt.response,
      'teacher_verified_completion', wt.teacher_verified_completion,
      'teacher_verification_status', wt.teacher_verification_status,
      'teacher_verification_reason', wt.teacher_verification_reason,
      'teacher_verified_at', wt.teacher_verified_at
    )
  from public.student_session_work_tracks wt
  join public.studio_sessions s on s.id = wt.session_id
  join roster r
    on lower(trim(r.student_id)) = lower(trim(wt.student_id))
   and wt.block_id = r.block_id
)
select
  record_type,
  student_key,
  team_number,
  week_number,
  session_number,
  submitted_at,
  response
from observation_records
order by
  team_number,
  student_key,
  record_type,
  week_number nulls first,
  session_number nulls first,
  submitted_at nulls first;
