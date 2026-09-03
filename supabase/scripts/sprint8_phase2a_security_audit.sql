-- Sprint 8 Phase 2A security and contract audit.
-- Run after 20260903_sprint8_phase2a_intake_foundation.sql.
-- The query is read-only and returns PASS/FAIL rows.

with checks as (
  select
    '2B2 is an allowed block code'::text as check_name,
    case when exists (
      select 1 from pg_constraint
      where conrelid = 'public.teaching_blocks'::regclass
        and conname = 'teaching_blocks_block_code_check'
        and pg_get_constraintdef(oid) like '%2B2%'
    ) then 'PASS' else 'FAIL' end as result,
    'constraint includes 2B2 without creating a block'::text as detail

  union all
  select
    'Intake table has RLS enabled',
    case when relrowsecurity then 'PASS' else 'FAIL' end,
    'student_session_intakes'
  from pg_class where oid = 'public.student_session_intakes'::regclass

  union all
  select
    'Anon has no Intake privileges',
    case when not exists (
      select 1 from information_schema.role_table_grants
      where table_schema='public' and table_name='student_session_intakes'
        and grantee='anon'
    ) then 'PASS' else 'FAIL' end,
    'no anon table grants'

  union all
  select
    'Authenticated cannot directly mutate Intake',
    case when not exists (
      select 1 from information_schema.role_table_grants
      where table_schema='public' and table_name='student_session_intakes'
        and grantee='authenticated' and privilege_type in ('INSERT','UPDATE','DELETE')
    ) then 'PASS' else 'FAIL' end,
    'writes require hardened RPC'

  union all
  select
    'Authenticated can read Intake through RLS',
    case when exists (
      select 1 from information_schema.role_table_grants
      where table_schema='public' and table_name='student_session_intakes'
        and grantee='authenticated' and privilege_type='SELECT'
    ) then 'PASS' else 'FAIL' end,
    'own-row and teacher policies apply'

  union all
  select
    'Fallback RPC is SECURITY DEFINER',
    case when p.prosecdef and p.proconfig @> array['search_path=""'] then 'PASS' else 'FAIL' end,
    'save_my_session_intake_fallback'
  from pg_proc p
  where p.oid='public.save_my_session_intake_fallback(uuid,jsonb,jsonb,jsonb)'::regprocedure

  union all
  select
    'Get RPC is SECURITY DEFINER',
    case when p.prosecdef and p.proconfig @> array['search_path=""'] then 'PASS' else 'FAIL' end,
    'get_my_session_intake'
  from pg_proc p
  where p.oid='public.get_my_session_intake(uuid)'::regprocedure

  union all
  select
    'Anon cannot execute Intake RPCs',
    case when not has_function_privilege('anon','public.get_my_session_intake(uuid)','EXECUTE')
           and not has_function_privilege('anon','public.save_my_session_intake_fallback(uuid,jsonb,jsonb,jsonb)','EXECUTE')
      then 'PASS' else 'FAIL' end,
    'authenticated only'

  union all
  select
    'Existing Sessions default Intake closed',
    case when not exists (
      select 1 from public.studio_sessions where intake_access <> 'closed'
    ) then 'PASS' else 'FAIL' end,
    'no existing Session enabled by migration'

  union all
  select
    'No 2B2 block auto-created',
    case when not exists (
      select 1 from public.teaching_blocks where academic_year=2026 and block_code='2B2'
    ) then 'PASS' else 'CHECK' end,
    'create through Teacher dashboard when ready'
)
select * from checks order by check_name;
