-- Read-only audit for Sprint 9 R02. Run AFTER
-- 20261008_sprint9_r02_teacher_intake_read.sql is applied.
--
-- This script only inspects catalog metadata and privileges; it writes nothing.
-- Behavioural authorization (a real non-teacher receiving 'Teacher access
-- required', missing/submitted counts, cross-Block isolation and off-roster
-- preservation) additionally requires authenticated mock teacher/student users
-- and seeded rows, and is NOT exercised here.

with funcs as (
  select p.oid, p.proname, p.prosecdef, p.proconfig, pg_get_functiondef(p.oid) as definition
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_teacher_session_intakes'
)
select 'Teacher Intake read function installed' as check_name,
  case when count(*) = 1 then 'PASS' else 'FAIL' end as result from funcs
union all
select 'Function is SECURITY DEFINER',
  case when count(*) filter (where prosecdef) = 1 then 'PASS' else 'FAIL' end from funcs
union all
select 'Function pins empty search_path',
  case when count(*) filter (where array_to_string(proconfig, ',') like '%search_path=""%') = 1 then 'PASS' else 'FAIL' end from funcs
union all
select 'Function enforces explicit teacher check',
  case when count(*) filter (where definition like '%is_teacher()%' and definition like '%Teacher access required%') = 1 then 'PASS' else 'FAIL' end from funcs
union all
select 'PUBLIC cannot execute',
  case when count(*) = 1 and not bool_or(has_function_privilege('public', oid, 'EXECUTE')) then 'PASS' else 'FAIL' end from funcs
union all
select 'anon cannot execute',
  case when count(*) = 1 and not bool_or(has_function_privilege('anon', oid, 'EXECUTE')) then 'PASS' else 'FAIL' end from funcs
union all
select 'authenticated can execute',
  case when count(*) = 1 and bool_and(has_function_privilege('authenticated', oid, 'EXECUTE')) then 'PASS' else 'FAIL' end from funcs
union all
select 'Roster is the list base (left join to intakes)',
  case when count(*) filter (where definition like '%student_roster%' and definition like '%left join%public.student_session_intakes%') = 1 then 'PASS' else 'FAIL' end from funcs
union all
select 'Join is scoped to the Session block_id',
  case when count(*) filter (where definition like '%intake.block_id = v_session.block_id%') = 1 then 'PASS' else 'FAIL' end from funcs
union all
select 'Off-roster confirmed intakes are preserved',
  case when count(*) filter (where definition like '%onRoster%' and definition like '%not exists%student_roster%') = 1 then 'PASS' else 'FAIL' end from funcs
union all
select 'Teacher verification is reported unset (no writable field used)',
  case when count(*) filter (where definition like '%''status'', ''unset''%' and definition like '%''recorded'', false%') = 1 then 'PASS' else 'FAIL' end from funcs
union all
select 'Testing limitation field is returned inside student_record',
  -- student_record is passed through whole, so baseline_or_expected is present
  -- iff the record carries it; confirm the record column is selected, not a
  -- stripped projection.
  case when count(*) filter (where definition like '%intake.student_record%') = 1 then 'PASS' else 'FAIL' end from funcs
union all
select 'Counts distinguish roster completion from off-roster history',
  -- rosterSubmittedCount/rosterSize/missingCount are the roster completion
  -- metrics; offRosterCount is reported separately and is NOT added into them.
  case when count(*) filter (where definition like '%rosterSubmittedCount%'
                               and definition like '%offRosterCount%'
                               and definition like '%missingCount%'
                               and definition like '%onRoster%'
                               and definition like '%not exists%student_roster%') = 1
       then 'PASS' else 'FAIL' end from funcs
union all
select 'Function is read-only (no INSERT/UPDATE/DELETE on intakes)',
  case when count(*) filter (where definition !~* '\minsert\s+into\s+public\.student_session_intakes'
                               and definition !~* '\mupdate\s+public\.student_session_intakes'
                               and definition !~* '\mdelete\s+from\s+public\.student_session_intakes') = 1
       then 'PASS' else 'FAIL' end from funcs
union all
select 'Intake RLS remains enabled',
  case when relrowsecurity then 'PASS' else 'FAIL' end
  from pg_class where oid = 'public.student_session_intakes'::regclass
union all
select 'Teacher SELECT policy still present',
  case when exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'student_session_intakes'
      and policyname = 'teachers read session intakes'
  ) then 'PASS' else 'FAIL' end;
