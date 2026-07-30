-- Sprint 3 Phase 3C-2 follow-up: least-privilege Find My Team RPC
--
-- The browser roles still cannot read student_roster or team_lookup_attempts.
-- This function exposes only the active block and the matched student's team details.

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

  select count(*)::integer
  into v_attempt_count
  from public.team_lookup_attempts
  where requester_hash = p_requester_hash
    and attempted_at >= now() - interval '15 minutes';

  if v_attempt_count >= 5 then
    return query select 'rate_limited'::text, null::text, null::text, null::text, null::text[];
    return;
  end if;

  select *
  into v_block
  from public.teaching_blocks
  where status = 'active'
  order by starts_on desc nulls last, created_at desc
  limit 1;

  if v_block.id is null then
    return query select 'no_active_block'::text, null::text, null::text, null::text, null::text[];
    return;
  end if;

  select *
  into v_student
  from public.student_roster
  where block_id = v_block.id
    and student_id = v_student_id
  limit 1;

  insert into public.team_lookup_attempts (
    requester_hash,
    identity_hash,
    succeeded
  )
  values (
    p_requester_hash,
    p_identity_hash,
    v_student.id is not null
  );

  if v_student.id is null then
    return query select 'not_found'::text, null::text, null::text, null::text, null::text[];
    return;
  end if;

  return query
  select
    'found'::text,
    concat(v_block.academic_year, ' · ', v_block.block_code)::text,
    concat('Team ', v_student.team_number)::text,
    v_student.project_name,
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

comment on function public.find_student_team(text, text, text) is
'Rate-limited active-block team lookup. Returns no student IDs, emails, or roster rows.';

-- Verification:
-- 1. anon still cannot select from student_roster or team_lookup_attempts.
-- 2. anon can execute find_student_team with 64-character hashes.
-- 3. a valid Student ID returns only block/team/project/teammate names.
-- 4. an invalid Student ID returns outcome = not_found.
-- 5. the sixth request for one requester hash within 15 minutes returns rate_limited.
