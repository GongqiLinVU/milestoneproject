-- Read-only audit. Run after 20260916_sprint8_adaptive_intake.sql.
-- Behavioural submission/isolation tests additionally require authenticated mock users.
with funcs as (
 select p.oid, p.proname, p.prosecdef, p.proconfig, pg_get_functiondef(p.oid) as definition
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('save_my_session_intake_chat','validate_session_intake_student_record_v11')
)
select 'Adaptive functions installed' as check_name,
 case when count(*)=2 then 'PASS' else 'FAIL' end as result from funcs
union all
select 'Chat RPC security definer and empty search_path',
 case when count(*) filter(where proname='save_my_session_intake_chat' and prosecdef and array_to_string(proconfig,',') like '%search_path=""%')=1 then 'PASS' else 'FAIL' end from funcs
union all
select 'Anon cannot execute adaptive functions',
 case when count(*)=2 and not bool_or(has_function_privilege('anon',oid,'EXECUTE')) then 'PASS' else 'FAIL' end from funcs
union all
select 'Authenticated can execute chat RPC only',
 case when count(*)=2 and bool_and(has_function_privilege('authenticated',oid,'EXECUTE')=(proname='save_my_session_intake_chat')) then 'PASS' else 'FAIL' end from funcs
union all
select 'Chat RPC retains full bounded conversation',
 case when count(*) filter(where proname='save_my_session_intake_chat' and definition like '%between 3 and 17%' and definition like '%Chat conversation order is invalid%')=1 then 'PASS' else 'FAIL' end from funcs
union all
select 'Chat RPC restricts 2B2',
 case when count(*) filter(where proname='save_my_session_intake_chat' and definition like '%block_code=''2B2''%')=1 then 'PASS' else 'FAIL' end from funcs
union all
select 'Intake RLS remains enabled',case when relrowsecurity then 'PASS' else 'FAIL' end from pg_class where oid='public.student_session_intakes'::regclass
union all
select 'Authenticated cannot directly mutate Intake',case when not has_table_privilege('authenticated','public.student_session_intakes','INSERT,UPDATE,DELETE') then 'PASS' else 'FAIL' end
union all
select 'Both schema versions accepted',case when pg_get_constraintdef(oid) like '%session-intake.v1.0.0%' and pg_get_constraintdef(oid) like '%session-intake.v1.1.0%' then 'PASS' else 'FAIL' end from pg_constraint where conrelid='public.student_session_intakes'::regclass and conname='student_session_intakes_schema_version_check';
