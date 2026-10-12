-- Read-only audit for Sprint 9 R01. Run AFTER
-- 20261009_sprint9_r01_block_intake_mode.sql is applied.
--
-- Inspects catalog metadata, column definition, function bodies and privileges.
-- It writes nothing. Behavioural authorization (a student with mode='disabled'
-- being refused a save, an AI call refused unless mode='ai', etc.) additionally
-- requires authenticated mock users and seeded rows and is NOT exercised here.

-- 1. Capability column: present, NOT NULL, default 'disabled', CHECK constrained.
select 'intake_mode column present' as check_name,
  case when exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='teaching_blocks' and column_name='intake_mode'
  ) then 'PASS' else 'FAIL' end as result
union all
select 'intake_mode default is disabled',
  case when exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='teaching_blocks' and column_name='intake_mode'
      and column_default like '%disabled%'
  ) then 'PASS' else 'FAIL' end
union all
select 'intake_mode CHECK constrains the three modes',
  case when exists (
    select 1 from pg_constraint
    where conname='teaching_blocks_intake_mode_check'
      and pg_get_constraintdef(oid) like '%disabled%'
      and pg_get_constraintdef(oid) like '%deterministic%'
      and pg_get_constraintdef(oid) like '%ai%'
  ) then 'PASS' else 'FAIL' end
union all
-- 2. No existing Block was auto-enabled by the migration.
select 'every existing Block defaults to disabled (none auto-enabled by migration)',
  -- NOTE: this reflects post-migration state before any deliberate teacher change.
  -- After a teacher sets a real Block to deterministic/ai this check is expected
  -- to change; interpret it only immediately after apply.
  case when not exists (select 1 from public.teaching_blocks where intake_mode <> 'disabled')
       then 'PASS' else 'REVIEW: a Block is non-disabled (expected only after a deliberate teacher change)' end
union all
-- 3. block_code CHECK unchanged (no new teaching code introduced by R01).
select 'block_code CHECK not widened by R01',
  case when exists (
    select 1 from pg_constraint
    where conname='teaching_blocks_block_code_check'
      and pg_get_constraintdef(oid) like '%2B2%'
      and pg_get_constraintdef(oid) not like '%2B3%'
  ) then 'PASS' else 'REVIEW: block_code CHECK differs from the pre-R01 set' end
union all
-- 4. Capability is teacher-managed only: students/anon have no UPDATE on the table.
select 'anon/authenticated cannot directly UPDATE teaching_blocks capability',
  case when not has_table_privilege('anon','public.teaching_blocks','UPDATE')
         and not has_table_privilege('authenticated','public.teaching_blocks','UPDATE')
       then 'PASS'
       -- authenticated may hold UPDATE via the teacher management policy; the RLS
       -- WITH CHECK is_teacher() still restricts WHO may change rows. If the grant
       -- model relies on RLS rather than table privilege, confirm the policy below.
       else 'REVIEW: table UPDATE granted — confirm is_teacher() policy gates it' end
union all
select 'teacher management policy present on teaching_blocks',
  case when exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='teaching_blocks' and policyname='teachers manage teaching blocks'
  ) then 'PASS' else 'FAIL' end;

-- 5. Intake functions gate on intake_mode, not block_code = '2B2'.
with funcs as (
  select p.proname, pg_get_functiondef(p.oid) as definition, p.prosecdef, p.proconfig
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('save_my_session_intake_chat','save_my_session_intake_ai',
                      'save_my_session_intake_fallback','get_my_session_intake',
                      'get_my_student_context')
)
select 'chat save gates on deterministic|ai, not 2B2' as check_name,
  case when count(*) filter (where proname='save_my_session_intake_chat'
    and definition like '%intake_mode in (''deterministic'',''ai'')%'
    and definition not like '%block_code=''2B2''%') = 1 then 'PASS' else 'FAIL' end as result
from funcs
union all
select 'fallback save gates on deterministic|ai',
  case when count(*) filter (where proname='save_my_session_intake_fallback'
    and definition like '%intake_mode in (''deterministic'',''ai'')%') = 1 then 'PASS' else 'FAIL' end
from funcs
union all
select 'ai save gates on ai only',
  case when count(*) filter (where proname='save_my_session_intake_ai'
    and definition like '%intake_mode = ''ai''%') = 1 then 'PASS' else 'FAIL' end
from funcs
union all
select 'get_my_student_context exposes intakeMode',
  case when count(*) filter (where proname='get_my_student_context'
    and definition like '%intakeMode%') = 1 then 'PASS' else 'FAIL' end
from funcs
union all
select 'get_my_session_intake has NO mode gate (history always readable)',
  case when count(*) filter (where proname='get_my_session_intake'
    and definition not like '%intake_mode%') = 1 then 'PASS' else 'FAIL' end
from funcs
union all
select 'all intake functions remain SECURITY DEFINER with empty search_path',
  case when count(*) filter (where prosecdef and array_to_string(proconfig,',') like '%search_path=%') = 5
       then 'PASS' else 'FAIL' end
from funcs;
