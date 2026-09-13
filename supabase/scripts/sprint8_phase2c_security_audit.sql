-- Sprint 8 Phase 2C read-only security audit.
with checks(check_name,result,detail) as (
  select 'AI save RPC is SECURITY DEFINER',
    case when p.prosecdef and p.proconfig @> array['search_path=""'] then 'PASS' else 'FAIL' end,
    'save_my_session_intake_ai'
  from pg_proc p
  where p.oid='public.save_my_session_intake_ai(uuid,jsonb,jsonb,jsonb,text,jsonb)'::regprocedure

  union all
  select 'Anon cannot execute AI save RPC',
    case when not has_function_privilege('anon','public.save_my_session_intake_ai(uuid,jsonb,jsonb,jsonb,text,jsonb)','EXECUTE') then 'PASS' else 'FAIL' end,
    'authenticated only'

  union all
  select 'Authenticated can execute AI save RPC',
    case when has_function_privilege('authenticated','public.save_my_session_intake_ai(uuid,jsonb,jsonb,jsonb,text,jsonb)','EXECUTE') then 'PASS' else 'FAIL' end,
    'RPC applies student identity and RLS boundary'

  union all
  select 'Intake table RLS remains enabled',
    case when c.relrowsecurity then 'PASS' else 'FAIL' end,
    'student_session_intakes'
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='student_session_intakes'

  union all
  select 'Authenticated cannot directly mutate Intake',
    case when not has_table_privilege('authenticated','public.student_session_intakes','INSERT')
           and not has_table_privilege('authenticated','public.student_session_intakes','UPDATE')
           and not has_table_privilege('authenticated','public.student_session_intakes','DELETE')
      then 'PASS' else 'FAIL' end,
    'AI-assisted writes require hardened RPC'
)
select * from checks order by check_name;
