-- Sprint 6 Phase 3 read-only Production security audit.
-- Safe to run in Supabase SQL Editor. It changes no schema or classroom data.

with expected_tables(table_name) as (
  values
    ('poster_gallery_settings'),
    ('poster_versions'),
    ('team_posters'),
    ('student_session_work_tracks'),
    ('student_platform_feedback')
),
table_checks as (
  select
    'RLS enabled: ' || expected.table_name as check_name,
    case when cls.oid is not null and cls.relrowsecurity then 'PASS' else 'FAIL' end as result,
    case when cls.oid is null then 'table missing'
         when not cls.relrowsecurity then 'row level security disabled'
         else 'enabled' end as detail
  from expected_tables expected
  left join pg_namespace ns on ns.nspname = 'public'
  left join pg_class cls on cls.relnamespace = ns.oid
    and cls.relname = expected.table_name and cls.relkind in ('r', 'p')
),
bucket_check as (
  select
    'Poster bucket private and constrained' as check_name,
    case when bucket.id = 'poster-gallery'
      and bucket.public = false
      and bucket.file_size_limit = 5242880
      and bucket.allowed_mime_types @> array['application/pdf','image/png','image/jpeg']::text[]
      then 'PASS' else 'FAIL' end as result,
    case when bucket.id is null then 'bucket missing'
      else concat('public=', bucket.public, ', limit=', bucket.file_size_limit,
        ', mime=', array_to_string(bucket.allowed_mime_types, ',')) end as detail
  from (values ('poster-gallery')) expected(id)
  left join storage.buckets bucket on bucket.id = expected.id
),
storage_policy_check as (
  select
    'No browser Poster object list/read policy' as check_name,
    case when count(*) = 0 then 'PASS' else 'FAIL' end as result,
    case when count(*) = 0 then 'no poster-gallery SELECT policy'
      else string_agg(policyname, ', ' order by policyname) end as detail
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and cmd = 'SELECT'
    and coalesce(qual, '') ilike '%poster-gallery%'
),
expected_functions(function_name, identity_arguments) as (
  values
    ('get_my_poster_upload_status', ''),
    ('get_my_poster_gallery', ''),
    ('get_teacher_poster_gallery', 'p_block_id uuid'),
    ('publish_poster_gallery', 'p_block_id uuid'),
    ('hide_poster_gallery', 'p_block_id uuid'),
    ('remove_team_poster_draft', 'p_team_id uuid'),
    ('get_my_session_work_track', 'p_session_id uuid'),
    ('save_my_session_work_track', 'p_session_id uuid, p_response jsonb'),
    ('get_teacher_session_work_tracks', 'p_session_id uuid'),
    ('verify_teacher_session_work_track', 'p_session_id uuid, p_student_id text, p_verified_completion integer, p_reason text'),
    ('get_my_platform_feedback', 'p_session_id uuid'),
    ('save_my_platform_feedback', 'p_session_id uuid, p_response jsonb'),
    ('get_teacher_platform_feedback_status', 'p_session_id uuid')
),
function_checks as (
  select
    'Hardened RPC: ' || expected.function_name as check_name,
    case when proc.oid is not null and proc.prosecdef
      and proc.proconfig @> array['search_path=""']::text[]
      then 'PASS' else 'FAIL' end as result,
    case when proc.oid is null then 'function/signature missing'
      else concat('security_definer=', proc.prosecdef,
        ', config=', coalesce(array_to_string(proc.proconfig, ','), 'none')) end as detail
  from expected_functions expected
  left join pg_namespace ns on ns.nspname = 'public'
  left join pg_proc proc on proc.pronamespace = ns.oid
    and proc.proname = expected.function_name
    and pg_get_function_identity_arguments(proc.oid) = expected.identity_arguments
),
anon_execute_check as (
  select
    'Anon cannot execute Sprint 6 RPCs' as check_name,
    case when count(*) = 0 then 'PASS' else 'FAIL' end as result,
    case when count(*) = 0 then 'no anon EXECUTE grants'
      else string_agg(proc.proname, ', ' order by proc.proname) end as detail
  from pg_proc proc
  join pg_namespace ns on ns.oid = proc.pronamespace and ns.nspname = 'public'
  join expected_functions expected on expected.function_name = proc.proname
    and expected.identity_arguments = pg_get_function_identity_arguments(proc.oid)
  where has_function_privilege('anon', proc.oid, 'EXECUTE')
),
cross_table_checks as (
  select
    'Poster pointers match version Block and Team' as check_name,
    case when count(*) = 0 then 'PASS' else 'FAIL' end as result,
    count(*)::text || ' mismatched pointer(s)' as detail
  from public.team_posters poster
  left join public.poster_versions draft on draft.id = poster.draft_version_id
  left join public.poster_versions published on published.id = poster.published_version_id
  where (draft.id is not null and (draft.block_id <> poster.block_id or draft.team_id <> poster.team_id))
     or (published.id is not null and (published.block_id <> poster.block_id or published.team_id <> poster.team_id))
  union all
  select
    'Work Track identity matches Session Block',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    count(*)::text || ' mismatched track(s)'
  from public.student_session_work_tracks track
  join public.studio_sessions session on session.id = track.session_id
  where track.block_id <> session.block_id
  union all
  select
    'Platform Feedback identity matches Session Block',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    count(*)::text || ' mismatched feedback record(s)'
  from public.student_platform_feedback feedback
  join public.studio_sessions session on session.id = feedback.session_id
  where feedback.block_id <> session.block_id or session.session_number <> 10
)
select check_name, result, detail from table_checks
union all select check_name, result, detail from bucket_check
union all select check_name, result, detail from storage_policy_check
union all select check_name, result, detail from function_checks
union all select check_name, result, detail from anon_execute_check
union all select check_name, result, detail from cross_table_checks
order by result, check_name;
