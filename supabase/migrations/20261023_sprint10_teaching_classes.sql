-- Independent teaching instances; no historical IDs or records are moved.
begin;
alter table public.teaching_blocks drop constraint if exists teaching_blocks_block_code_check;
alter table public.teaching_blocks add constraint teaching_blocks_block_code_check check(block_code ~ '^[12]B[1-4]$');
alter table public.teaching_blocks add column if not exists course_code text not null default 'NIT3004', add column if not exists class_code text not null default 'C1';
alter table public.teaching_blocks drop constraint if exists teaching_blocks_academic_year_block_code_key;
drop index if exists public.teaching_blocks_single_active_idx;
create unique index if not exists teaching_classes_identity on public.teaching_blocks(course_code,academic_year,block_code,class_code);
alter table public.teaching_blocks drop constraint if exists teaching_classes_codes;
alter table public.teaching_blocks add constraint teaching_classes_codes check(course_code ~ '^[A-Z][A-Z0-9]{2,19}$' and class_code ~ '^[A-Z0-9][A-Z0-9_-]{0,19}$');

create table if not exists public.platform_administrators(user_id uuid primary key references auth.users(id) on delete restrict,created_at timestamptz not null default now());
create table if not exists public.teacher_profiles(user_id uuid primary key references auth.users(id) on delete cascade,display_name text not null check(length(trim(display_name)) between 1 and 100),active boolean not null default true,must_change_password boolean not null default true,created_at timestamptz not null default now());
create table if not exists public.teacher_class_memberships(class_id uuid not null references public.teaching_blocks(id) on delete cascade,user_id uuid not null references public.teacher_profiles(user_id) on delete cascade,primary key(class_id,user_id));
alter table public.platform_administrators enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.teacher_class_memberships enable row level security;
revoke all on public.platform_administrators,public.teacher_profiles,public.teacher_class_memberships from public,anon,authenticated;
grant all on public.platform_administrators,public.teacher_profiles,public.teacher_class_memberships to service_role;

-- Bootstrap only the single pre-existing teacher. Multiple teachers require an
-- explicit administrator UUID in the session; never promote every teacher.
do $$declare v_id uuid; v_count integer; begin
 if not exists(select 1 from public.platform_administrators) then
  v_id:=nullif(current_setting('studio.bootstrap_administrator',true),'')::uuid;
  if v_id is null then
   select count(*),(array_agg(id))[1] into v_count,v_id from auth.users where raw_app_meta_data->>'role'='teacher';
   if v_count<>1 then raise exception 'Set studio.bootstrap_administrator to the existing owner UUID before applying this migration'; end if;
  end if;
  if not exists(select 1 from auth.users where id=v_id) then raise exception 'Administrator account does not exist'; end if;
  insert into public.platform_administrators values(v_id,now());
  insert into public.teacher_profiles(user_id,display_name,must_change_password) values(v_id,'Platform administrator',false) on conflict(user_id) do nothing;
 end if;
end $$;

-- Existing teacher logins remain usable, but receive no automatic class access.
insert into public.teacher_profiles(user_id,display_name,must_change_password)
select id,left(coalesce(nullif(email,''),'Teacher'),100),false from auth.users where raw_app_meta_data->>'role'='teacher'
on conflict(user_id) do nothing;

create or replace function public.is_superadmin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.platform_administrators where user_id=auth.uid())$$;
create or replace function public.is_teacher() returns boolean language sql stable security definer set search_path='' as $$
 select public.is_superadmin() or (coalesce(auth.jwt()->'app_metadata'->>'role','')='teacher' and not exists(select 1 from public.teacher_profiles where user_id=auth.uid() and (not active or must_change_password)))
$$;
create or replace function public.can_manage_teaching_class(p_class_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (public.is_superadmin() or (public.is_teacher() and exists(select 1 from public.teacher_class_memberships m join public.teacher_profiles p on p.user_id=m.user_id where m.class_id=p_class_id and m.user_id=auth.uid() and p.active and not p.must_change_password)))
$$;
create or replace function public.require_teaching_class(p_class_id uuid) returns void language plpgsql stable security definer set search_path='' as $$begin
 if p_class_id is null or not public.can_manage_teaching_class(p_class_id) then raise exception using errcode='42501',message='This class is not assigned to your account'; end if;
end $$;
create or replace function public.require_session_class(p_session_id uuid) returns void language plpgsql stable security definer set search_path='' as $$begin
 perform public.require_teaching_class((select block_id from public.studio_sessions where id=p_session_id));
end $$;
create or replace function public.require_team_class(p_team_id uuid) returns void language plpgsql stable security definer set search_path='' as $$begin
 perform public.require_teaching_class((select block_id from public.teams where id=p_team_id));
end $$;
create or replace function public.require_precheck_class(p_submission_id uuid) returns void language plpgsql stable security definer set search_path='' as $$begin
 perform public.require_teaching_class((select block_id from public.week2_progress_reviews where id=p_submission_id));
end $$;

-- Restrictive policies compose with existing student policies and cannot be
-- bypassed by an older permissive teacher policy.
do $$declare r record; begin
 for r in select c.table_name from information_schema.columns c join pg_class t on t.relname=c.table_name join pg_namespace n on n.oid=t.relnamespace and n.nspname='public' where c.table_schema='public' and c.column_name='block_id' and t.relkind='r' loop
  execute format('drop policy if exists teaching_class_staff_scope on public.%I',r.table_name);
  execute format('create policy teaching_class_staff_scope on public.%I as restrictive to authenticated using (not public.is_teacher() or public.can_manage_teaching_class(block_id)) with check (not public.is_teacher() or public.can_manage_teaching_class(block_id))',r.table_name);
 end loop;
end $$;
-- Disabled/unactivated staff are still staff for scope restrictions.
create or replace function public.is_staff_identity() returns boolean language sql stable security definer set search_path='' as $$ select public.is_superadmin() or coalesce(auth.jwt()->'app_metadata'->>'role','')='teacher' $$;
create or replace function public.can_access_teaching_class(p_class_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select case when public.is_staff_identity() then public.can_manage_teaching_class(p_class_id)
 when auth.uid() is not null then exists(select 1 from public.student_roster r join public.student_accounts a on a.student_id=r.student_id where r.block_id=p_class_id and a.auth_user_id=auth.uid() and a.status<>'disabled')
 else (select count(*) from public.teaching_blocks where status='active')=1 and exists(select 1 from public.teaching_blocks where id=p_class_id and status='active') end
$$;
revoke all on function public.can_access_teaching_class(uuid) from public;
grant execute on function public.can_access_teaching_class(uuid) to anon,authenticated,service_role;
do $$declare r record; begin
 for r in select table_name from information_schema.columns where table_schema='public' and column_name='block_id' loop
  execute format('alter policy teaching_class_staff_scope on public.%I to anon,authenticated using (public.can_access_teaching_class(block_id)) with check (public.can_access_teaching_class(block_id))',r.table_name);
 end loop;
end $$;
drop policy if exists teaching_class_instance_scope on public.teaching_blocks;
create policy teaching_class_instance_scope on public.teaching_blocks as restrictive to anon,authenticated using (public.can_access_teaching_class(id)) with check(public.can_manage_teaching_class(id));
drop policy if exists teaching_class_instance_create on public.teaching_blocks;
create policy teaching_class_instance_create on public.teaching_blocks as restrictive for insert to authenticated with check(public.is_superadmin());
drop policy if exists teaching_class_instance_delete on public.teaching_blocks;
create policy teaching_class_instance_delete on public.teaching_blocks as restrictive for delete to authenticated using(public.is_superadmin());

create or replace function public.can_manage_roster_account(p_student_id text) returns boolean language sql stable security definer set search_path='' as $$select public.is_superadmin() or exists(select 1 from public.student_roster r where r.student_id=p_student_id and public.can_manage_teaching_class(r.block_id))$$;
drop policy if exists teaching_class_account_scope on public.student_accounts;
create policy teaching_class_account_scope on public.student_accounts as restrictive to authenticated using(not public.is_staff_identity() or public.can_manage_roster_account(student_id)) with check(not public.is_staff_identity() or public.can_manage_roster_account(student_id));
-- Team-owned rows do not have a direct block_id.
do $$declare t text; begin foreach t in array array['team_project_assignments','project_proposals','team_posters'] loop
 execute format('drop policy if exists teaching_class_team_scope on public.%I',t);
 execute format('create policy teaching_class_team_scope on public.%I as restrictive to anon,authenticated using(exists(select 1 from public.teams t where t.id=team_id and public.can_access_teaching_class(t.block_id))) with check(exists(select 1 from public.teams t where t.id=team_id and public.can_access_teaching_class(t.block_id)))',t);
end loop;end $$;

create or replace function public.guard_teaching_class_identity() returns trigger language plpgsql set search_path='' as $$begin
 if current_user not in ('postgres','service_role') and not public.is_superadmin() and (new.course_code,new.class_code,new.academic_year,new.block_code,new.status) is distinct from (old.course_code,old.class_code,old.academic_year,old.block_code,old.status) then raise exception using errcode='42501',message='Only an administrator can change class identity or lifecycle';end if;return new;
end $$;
drop trigger if exists guard_teaching_class_identity on public.teaching_blocks;
create trigger guard_teaching_class_identity before update on public.teaching_blocks for each row execute function public.guard_teaching_class_identity();

-- Existing student RPCs require a single active roster context. Reject ambiguity
-- rather than selecting another class with LIMIT 1.
create or replace function public.guard_active_roster_context() returns trigger language plpgsql security definer set search_path='' as $$declare v_ids text[];begin
 perform pg_advisory_xact_lock(hashtext('studio.roster.context'));
 if tg_table_name='student_roster' then
  if exists(select 1 from public.student_roster r join public.teaching_blocks b on b.id=r.block_id join public.teaching_blocks nb on nb.id=new.block_id where r.student_id=new.student_id and r.block_id<>new.block_id and b.status='active' and nb.status='active') then raise exception 'Student already belongs to another active class; transfer the roster membership first';end if;
 else
  if new.status='active' and exists(select 1 from public.student_roster mine join public.student_roster other on other.student_id=mine.student_id and other.block_id<>new.id join public.teaching_blocks b on b.id=other.block_id where mine.block_id=new.id and b.status='active') then raise exception 'Activating this class would give a student multiple active classes';end if;
 end if;return new;
end $$;
drop trigger if exists guard_active_roster_context on public.student_roster;
create trigger guard_active_roster_context before insert or update on public.student_roster for each row execute function public.guard_active_roster_context();
drop trigger if exists guard_active_roster_context on public.teaching_blocks;
create trigger guard_active_roster_context before insert or update on public.teaching_blocks for each row execute function public.guard_active_roster_context();

create or replace function public.current_teaching_block_id() returns uuid language sql stable security definer set search_path='' as $$
 select case when count(*)=1 then (array_agg(b.id))[1] else null end from public.teaching_blocks b where b.status='active' and
 (case when public.is_staff_identity() then public.can_manage_teaching_class(b.id) when auth.uid() is not null then exists(select 1 from public.student_roster r join public.student_accounts a on a.student_id=r.student_id where r.block_id=b.id and a.auth_user_id=auth.uid() and a.status<>'disabled') else true end)
$$;

create or replace function public.get_staff_context() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('isSuperadmin',public.is_superadmin(),'isTeacher',public.is_teacher(),'mustChangePassword',coalesce((select must_change_password from public.teacher_profiles where user_id=auth.uid()),false))
$$;
create or replace function public.get_teacher_administration() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not public.is_superadmin() then raise exception using errcode='42501',message='Administrator access required';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('userId',p.user_id,'name',p.display_name,'email',u.email,'active',p.active,'mustChangePassword',p.must_change_password,'classIds',(select coalesce(jsonb_agg(m.class_id),'[]'::jsonb) from public.teacher_class_memberships m where m.user_id=p.user_id)) order by p.display_name),'[]'::jsonb) from public.teacher_profiles p join auth.users u on u.id=p.user_id where not exists(select 1 from public.platform_administrators a where a.user_id=p.user_id));
end $$;
create or replace function public.set_teacher_classes(p_user_id uuid,p_class_ids uuid[],p_display_name text default null,p_active boolean default true) returns void language plpgsql security definer set search_path='' as $$begin
 if not public.is_superadmin() then raise exception using errcode='42501',message='Administrator access required';end if;
 if exists(select 1 from public.platform_administrators where user_id=p_user_id) then raise exception 'Administrator permissions cannot be changed here';end if;
 if not exists(select 1 from auth.users where id=p_user_id and raw_app_meta_data->>'role'='teacher') then raise exception 'Teacher account does not exist';end if;
 if p_class_ids is null or exists(select 1 from unnest(p_class_ids) id where id is null or not exists(select 1 from public.teaching_blocks b where b.id=id)) then raise exception 'Unknown class';end if;
 insert into public.teacher_profiles(user_id,display_name,active) values(p_user_id,trim(p_display_name),p_active) on conflict(user_id) do update set display_name=coalesce(nullif(trim(p_display_name),''),teacher_profiles.display_name),active=p_active;
 delete from public.teacher_class_memberships where user_id=p_user_id;
 insert into public.teacher_class_memberships(class_id,user_id) select distinct id,p_user_id from unnest(p_class_ids) id;
end $$;

-- Every new helper has explicit grants; internal trigger helpers are not RPCs.
do $$declare n text;begin foreach n in array array['is_superadmin()','is_teacher()','is_staff_identity()','can_manage_teaching_class(uuid)','can_manage_roster_account(text)','require_teaching_class(uuid)','require_session_class(uuid)','require_team_class(uuid)','require_precheck_class(uuid)','get_staff_context()','get_teacher_administration()','set_teacher_classes(uuid,uuid[],text,boolean)'] loop
 execute 'revoke all on function public.'||n||' from public,anon,authenticated';execute 'grant execute on function public.'||n||' to authenticated,service_role';
end loop;end $$;
grant execute on function public.is_teacher(),public.is_staff_identity(),public.is_superadmin(),public.can_manage_teaching_class(uuid),public.can_manage_roster_account(text) to anon;
revoke all on function public.guard_teaching_class_identity(),public.guard_active_roster_context() from public,anon,authenticated;

-- Scoped existing RPC: teacher_reset_week2_precheck
create or replace function public.teacher_reset_week2_precheck(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission public.week2_progress_reviews;
begin
  perform public.require_precheck_class(p_submission_id);
  if not coalesce(public.is_teacher(), false) then
    raise exception using errcode = '42501', message = 'Teacher access is required';
  end if;

  select submission.* into v_submission
  from public.week2_progress_reviews submission
  where submission.id = p_submission_id;

  if v_submission.id is null then
    raise exception using errcode = 'P0002', message = 'Pre-check submission was not found';
  end if;

  delete from public.teacher_progress_reviews review
  where review.block_id = v_submission.block_id
    and lower(trim(review.student_id)) = lower(trim(v_submission.student_id));

  delete from public.week2_progress_reviews submission
  where submission.id = p_submission_id;
end;
$$;

-- Scoped existing RPC: save_presentation_order_draft
create or replace function public.save_presentation_order_draft(
  p_block_id uuid,
  p_team_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_count integer;
begin
  perform public.require_teaching_class(p_block_id);
  if not public.is_teacher() then
    raise exception using errcode = '42501', message = 'Teacher access required';
  end if;

  select count(*)::integer into v_team_count
  from public.teams where block_id = p_block_id;

  if v_team_count = 0
     or coalesce(array_length(p_team_ids, 1), 0) <> v_team_count
     or (select count(distinct team_id) from unnest(p_team_ids) as supplied(team_id)) <> v_team_count
     or exists (
       select 1 from unnest(p_team_ids) as supplied(team_id)
       where not exists (
         select 1 from public.teams team
         where team.id = supplied.team_id and team.block_id = p_block_id
       )
     ) then
    raise exception using errcode = '22023',
      message = 'Presentation order must contain every block team exactly once';
  end if;

  insert into public.presentation_orders (block_id, draft_team_ids)
  values (p_block_id, p_team_ids)
  on conflict (block_id) do update
  set draft_team_ids = excluded.draft_team_ids;
end;
$$;

-- Scoped existing RPC: get_teacher_poster_gallery
create or replace function public.get_teacher_poster_gallery(p_block_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_published boolean; v_published_at timestamptz;
begin
  perform public.require_teaching_class(p_block_id);
  if not public.is_teacher() then raise exception using errcode='42501', message='Teacher access required'; end if;
  select is_published,published_at into v_published,v_published_at from public.poster_gallery_settings where block_id=p_block_id;
  return jsonb_build_object(
    'isPublished',coalesce(v_published,false),'publishedAt',v_published_at,
    'teams',coalesce((select jsonb_agg(jsonb_build_object(
      'teamId',team.id,'teamName',concat('Team ',team.team_number),'projectName',project.title,
      'draft',case when draft.id is null then null else jsonb_build_object('versionId',draft.id,'originalFilename',draft.original_filename,'mimeType',draft.mime_type,'sizeBytes',draft.size_bytes,'createdAt',draft.created_at) end,
      'publishedVersionId',published.id
    ) order by team.team_number)
    from public.teams team
    left join public.team_project_assignments assignment on assignment.team_id=team.id
    left join public.projects project on project.id=assignment.project_id
    left join public.team_posters poster on poster.block_id=p_block_id and poster.team_id=team.id
    left join public.poster_versions draft on draft.id=poster.draft_version_id and draft.status='ready'
    left join public.poster_versions published on published.id=poster.published_version_id and published.status='ready'
    where team.block_id=p_block_id),'[]'::jsonb)
  );
end;
$$;

-- Scoped existing RPC: publish_poster_gallery
create or replace function public.publish_poster_gallery(p_block_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_teaching_class(p_block_id);
  if not public.is_teacher() then raise exception using errcode='42501', message='Teacher access required'; end if;
  update public.team_posters set published_version_id=draft_version_id
  where block_id=p_block_id;
  insert into public.poster_gallery_settings(block_id,is_published,published_at)
  values(p_block_id,true,now())
  on conflict(block_id) do update set is_published=true,published_at=now();
end;
$$;

-- Scoped existing RPC: hide_poster_gallery
create or replace function public.hide_poster_gallery(p_block_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_teaching_class(p_block_id);
  if not public.is_teacher() then raise exception using errcode='42501', message='Teacher access required'; end if;
  update public.poster_gallery_settings set is_published=false where block_id=p_block_id;
end;
$$;

-- Scoped existing RPC: remove_team_poster_draft
create or replace function public.remove_team_poster_draft(p_team_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_version_id uuid;
begin
  perform public.require_team_class(p_team_id);
  if not public.is_teacher() then raise exception using errcode='42501', message='Teacher access required'; end if;
  select draft_version_id into v_version_id from public.team_posters where team_id=p_team_id;
  update public.team_posters set draft_version_id=null where team_id=p_team_id;
  if v_version_id is not null then
    update public.poster_versions set status='removed',removed_at=now() where id=v_version_id;
  end if;
end;
$$;

-- Scoped existing RPC: get_teacher_session_work_tracks
create or replace function public.get_teacher_session_work_tracks(p_session_id uuid)
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
  perform public.require_session_class(p_session_id);
  if not public.is_teacher() then
    raise exception using errcode = 'P0001', message = 'Teacher access required';
  end if;

  select * into v_session from public.studio_sessions where id = p_session_id;
  if v_session.id is null then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'studentId', roster.student_id,
    'studentName', coalesce(roster.preferred_name, roster.full_name),
    'teamName', concat('Team ', roster.team_number),
    'checkedInAt', checkin.checked_in_at,
    'response', track.response,
    'updatedAt', track.updated_at,
    'teacherVerifiedCompletion', track.teacher_verified_completion,
    'teacherVerificationStatus', track.teacher_verification_status,
    'teacherVerificationReason', track.teacher_verification_reason,
    'teacherVerifiedAt', track.teacher_verified_at
  ) order by roster.team_number, coalesce(roster.preferred_name, roster.full_name), roster.student_id), '[]'::jsonb)
  into v_result
  from public.student_roster roster
  left join public.student_session_checkins checkin
    on checkin.session_id = v_session.id and checkin.student_id = roster.student_id
  left join public.student_session_work_tracks track
    on track.session_id = v_session.id and track.student_id = roster.student_id
  where roster.block_id = v_session.block_id;

  return v_result;
end;
$$;

-- Scoped existing RPC: verify_teacher_session_work_track
create or replace function public.verify_teacher_session_work_track(
  p_session_id uuid,
  p_student_id text,
  p_verified_completion integer,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_track public.student_session_work_tracks%rowtype;
  v_student_completion integer;
  v_status text;
begin
  perform public.require_session_class(p_session_id);
  if not public.is_teacher() then
    raise exception using errcode = 'P0001', message = 'Teacher access required';
  end if;
  if p_verified_completion is null or p_verified_completion < 0 or p_verified_completion > 100 then
    raise exception using errcode = 'P0001', message = 'Verified completion must be between 0 and 100';
  end if;
  if p_reason is not null and char_length(p_reason) > 300 then
    raise exception using errcode = 'P0001', message = 'Verification reason is too long';
  end if;

  select * into v_track
  from public.student_session_work_tracks
  where session_id = p_session_id and student_id = p_student_id;

  if v_track.id is null then
    raise exception using errcode = 'P0001', message = 'Student Work Track not found';
  end if;

  v_student_completion := case
    when jsonb_typeof(v_track.response -> 'completionPercent') = 'number'
    then (v_track.response ->> 'completionPercent')::numeric::integer
    else null
  end;
  if v_student_completion is null then
    raise exception using errcode = 'P0001', message = 'Student completion measure is not available';
  end if;

  v_status := case when p_verified_completion = v_student_completion then 'confirmed' else 'adjusted' end;
  if v_status = 'adjusted' and coalesce(btrim(p_reason), '') = '' then
    raise exception using errcode = 'P0001', message = 'Choose a reason when adjusting student completion';
  end if;

  update public.student_session_work_tracks
  set teacher_verified_completion = p_verified_completion,
      teacher_verification_status = v_status,
      teacher_verification_reason = nullif(btrim(p_reason), ''),
      teacher_verified_at = now(),
      teacher_verified_by = auth.uid()
  where id = v_track.id
  returning * into v_track;

  return jsonb_build_object(
    'teacherVerifiedCompletion', v_track.teacher_verified_completion,
    'teacherVerificationStatus', v_track.teacher_verification_status,
    'teacherVerificationReason', v_track.teacher_verification_reason,
    'teacherVerifiedAt', v_track.teacher_verified_at
  );
end;
$$;

-- Scoped existing RPC: get_teacher_platform_feedback_status
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
  perform public.require_session_class(p_session_id);
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

-- Scoped existing RPC: save_teacher_progress_review
create or replace function public.save_teacher_progress_review(
  p_submission_id uuid,
  p_review jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_submission public.week2_progress_reviews%rowtype;
  v_saved public.teacher_progress_reviews%rowtype;
  v_actions text[];
  v_recheck_week smallint;
begin
  perform public.require_precheck_class(p_submission_id);
  if auth.uid() is null or not coalesce(public.is_teacher(), false) then
    raise exception using errcode = '42501',
      message = 'Your teacher session is not authorised to save this review. Sign in again and retry.';
  end if;

  select submission.* into v_submission
  from public.week2_progress_reviews submission
  where submission.id = p_submission_id;

  if not found then
    raise exception using errcode = 'P0002',
      message = 'The selected Week 2 Pre-check submission was not found. Refresh the dashboard and retry.';
  end if;

  if v_submission.block_id is null then
    raise exception using errcode = '23514',
      message = 'This Pre-check is not linked to a teaching block. Ask the administrator to repair the submission.';
  end if;

  if nullif(trim(coalesce(v_submission.student_name, '')), '') is null
     or nullif(trim(coalesce(v_submission.student_id, '')), '') is null
     or nullif(trim(coalesce(v_submission.team_name, '')), '') is null then
    raise exception using errcode = '23514',
      message = 'This Pre-check has incomplete student or team identity. Refresh the roster link before saving a review.';
  end if;

  if jsonb_typeof(coalesce(p_review -> 'follow_up_actions', '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'Follow-up actions are invalid.';
  end if;

  select coalesce(array_agg(action), array[]::text[])
  into v_actions
  from jsonb_array_elements_text(coalesce(p_review -> 'follow_up_actions', '[]'::jsonb)) action;

  if cardinality(v_actions) < 1 then
    raise exception using errcode = '22023', message = 'Select at least one follow-up action.';
  end if;

  if nullif(trim(coalesce(p_review ->> 'teacher_feedback', '')), '') is null then
    raise exception using errcode = '22023', message = 'Add a Conversation note before saving.';
  end if;

  if char_length(trim(p_review ->> 'teacher_feedback')) > 800 then
    raise exception using errcode = '22023', message = 'Conversation note must be 800 characters or fewer.';
  end if;

  v_recheck_week := nullif(p_review ->> 'recheck_week', '')::smallint;

  insert into public.teacher_progress_reviews (
    block_id, student_name, student_id, team_name, review_outcome,
    demonstration_outcome, method_explanation, evidence_quality,
    contribution_verification, report_alignment, teacher_feedback,
    follow_up_status, follow_up_actions, follow_up_note, recheck_week
  ) values (
    v_submission.block_id, trim(v_submission.student_name),
    trim(v_submission.student_id), trim(v_submission.team_name),
    p_review ->> 'review_outcome', p_review ->> 'demonstration_outcome',
    p_review ->> 'method_explanation', p_review ->> 'evidence_quality',
    p_review ->> 'contribution_verification', p_review ->> 'report_alignment',
    trim(p_review ->> 'teacher_feedback'), p_review ->> 'follow_up_status',
    v_actions, nullif(trim(coalesce(p_review ->> 'follow_up_note', '')), ''),
    v_recheck_week
  )
  on conflict (block_id, student_id) do update set
    student_name = excluded.student_name,
    team_name = excluded.team_name,
    review_outcome = excluded.review_outcome,
    demonstration_outcome = excluded.demonstration_outcome,
    method_explanation = excluded.method_explanation,
    evidence_quality = excluded.evidence_quality,
    contribution_verification = excluded.contribution_verification,
    report_alignment = excluded.report_alignment,
    teacher_feedback = excluded.teacher_feedback,
    follow_up_status = excluded.follow_up_status,
    follow_up_actions = excluded.follow_up_actions,
    follow_up_note = excluded.follow_up_note,
    recheck_week = excluded.recheck_week
  returning * into v_saved;

  return to_jsonb(v_saved);
end;
$$;

-- Scoped existing RPC: get_teacher_session_intakes
create or replace function public.get_teacher_session_intakes(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_session public.studio_sessions%rowtype;
  v_roster_rows jsonb;
  v_orphan_rows jsonb;
  v_submitted integer;       -- roster students who submitted (roster completion numerator)
  v_missing integer;         -- roster students with no Intake
  v_offroster integer;       -- off-roster confirmed Intakes (history; NOT roster completion)
begin
  perform public.require_session_class(p_session_id);
  -- 1. Explicit, authenticated teacher requirement. No anon/student path.
  if not public.is_teacher() then
    raise exception using errcode = 'P0001', message = 'Teacher access required';
  end if;

  -- 2. Resolve the Block from the selected Session. Unknown Session => empty,
  --    well-formed payload (not an error), matching the work-track convention.
  select * into v_session
  from public.studio_sessions
  where id = p_session_id;

  if v_session.id is null then
    return jsonb_build_object(
      'sessionId', p_session_id,
      'sessionNumber', null,
      'blockId', null,
      'rosterSize', 0,
      'rosterSubmittedCount', 0,
      'missingCount', 0,
      'offRosterCount', 0,
      'submittedCount', 0,
      'intakes', '[]'::jsonb
    );
  end if;

  -- 3. Roster of the Session's Block is the LIST BASE. A left join to the
  --    confirmed Intake for THIS Session and THIS student surfaces missing
  --    submissions (intake fields null). Join key is (session_id, student_id)
  --    scoped to the Session's own block_id, so a row from another Block or
  --    another Session can never attach here.
  select
    coalesce(jsonb_agg(row_json order by team_number, student_label, student_id), '[]'::jsonb),
    coalesce(sum(case when submitted then 1 else 0 end), 0),
    coalesce(sum(case when submitted then 0 else 1 end), 0)
  into v_roster_rows, v_submitted, v_missing
  from (
    select
      roster.team_number as team_number,
      roster.student_id as student_id,
      coalesce(roster.preferred_name, roster.full_name) as student_label,
      (intake.id is not null) as submitted,
      jsonb_build_object(
        'studentId', roster.student_id,
        'studentName', coalesce(roster.preferred_name, roster.full_name),
        'teamName', concat('Team ', roster.team_number),
        'onRoster', true,
        'submitted', (intake.id is not null),
        'intakeId', intake.id,
        'sourceMode', intake.source_mode,
        'confirmedAt', intake.confirmed_at,
        -- Student claim and its sources. Teacher verification is NOT part of
        -- this record and is reported separately as unset (see below).
        'studentRecord', intake.student_record,
        'sourceConversation', intake.source_conversation,
        'corrections', case
          when intake.id is null then null
          else coalesce(intake.student_confirmation -> 'corrections', '[]'::jsonb)
        end,
        'studentAttestation', intake.student_confirmation ->> 'attestation',
        -- Teacher verification lives in no column of this table; always unset.
        'teacherVerification', jsonb_build_object('status', 'unset', 'recorded', false)
      ) as row_json
    from public.student_roster roster
    left join public.student_session_intakes intake
      on intake.session_id = v_session.id
     and intake.block_id = v_session.block_id
     and intake.student_id = roster.student_id
    where roster.block_id = v_session.block_id
  ) roster_base;

  -- 4. Historical preservation. A confirmed Intake whose student is no longer on
  --    the current roster would be dropped by the roster-base join above. We do
  --    NOT silently drop it: collect confirmed intakes for THIS Session whose
  --    student_id has no matching roster row, and append them flagged
  --    onRoster=false. They are counted as submitted.
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'studentId', intake.student_id,
      'studentName', intake.student_id,
      'teamName', null,
      'onRoster', false,
      'submitted', true,
      'intakeId', intake.id,
      'sourceMode', intake.source_mode,
      'confirmedAt', intake.confirmed_at,
      'studentRecord', intake.student_record,
      'sourceConversation', intake.source_conversation,
      'corrections', coalesce(intake.student_confirmation -> 'corrections', '[]'::jsonb),
      'studentAttestation', intake.student_confirmation ->> 'attestation',
      'teacherVerification', jsonb_build_object('status', 'unset', 'recorded', false)
    ) order by intake.confirmed_at), '[]'::jsonb)
  into v_orphan_rows
  from public.student_session_intakes intake
  where intake.session_id = v_session.id
    and intake.block_id = v_session.block_id
    and not exists (
      select 1 from public.student_roster roster
      where roster.block_id = v_session.block_id
        and roster.student_id = intake.student_id
    );

  v_offroster := jsonb_array_length(v_orphan_rows);

  return jsonb_build_object(
    'sessionId', v_session.id,
    'sessionNumber', v_session.session_number,
    'blockId', v_session.block_id,
    -- Roster completion metrics: numerator rosterSubmittedCount over
    -- rosterSize (= rosterSubmittedCount + missingCount). Off-roster history is
    -- counted SEPARATELY in offRosterCount and never inflates these.
    'rosterSize', v_submitted + v_missing,
    'rosterSubmittedCount', v_submitted,
    'missingCount', v_missing,
    'offRosterCount', v_offroster,
    -- Grand total of all confirmed Intakes shown (roster-submitted + off-roster).
    -- Provided for display only; it is NOT a roster completion rate.
    'submittedCount', v_submitted + v_offroster,
    'intakes', v_roster_rows || v_orphan_rows
  );
end;
$$;

-- Scoped existing RPC: get_teacher_session_ai_usage
create or replace function public.get_teacher_session_ai_usage(p_block_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare b public.teaching_blocks%rowtype; v_summary jsonb;
begin
  perform public.require_teaching_class(p_block_id);
 if not public.is_teacher() then raise exception 'Teacher access required'; end if;
 select * into b from public.teaching_blocks where id=p_block_id;
 if b.id is null then raise exception 'Unknown Block'; end if;
 select jsonb_build_object('attempts',count(*),'reportedUsd',coalesce(sum(observed_usd),0),
 'chargedUsd',coalesce(sum(charged_usd),0),'unresolvedAttempts',count(*) filter(where status<>'settled'),
 'reconciliationRequired',coalesce(bool_or(reconciliation_required),false)) into v_summary
 from public.session_intake_ai_usage where block_id=b.id;
 return v_summary||jsonb_build_object('budgetUsd',b.intake_ai_budget_usd,'attemptLimit',b.intake_ai_attempt_limit);
end; $$;

create or replace function public.can_manage_student_credentials(p_class_id uuid,p_student_id text) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_superadmin() or (public.can_manage_teaching_class(p_class_id) and exists(select 1 from public.teaching_blocks where id=p_class_id and status<>'archived') and exists(select 1 from public.student_roster own where own.block_id=p_class_id and own.student_id=p_student_id) and not exists(select 1 from public.student_roster r join public.teaching_blocks b on b.id=r.block_id where r.student_id=p_student_id and r.block_id<>p_class_id and b.status='active'))
$$;
revoke all on function public.can_manage_student_credentials(uuid,text) from public,anon;
grant execute on function public.can_manage_student_credentials(uuid,text) to authenticated,service_role;
create or replace function public.guard_class_parent_links() returns trigger language plpgsql security definer set search_path='' as $$
declare d jsonb:=to_jsonb(new);v_class uuid;v_ref uuid;v_key text;v_team uuid;
begin
 v_class:=(d->>'block_id')::uuid;
 foreach v_key in array array['team_id','session_id','project_id','approved_project_id','draft_version_id','published_version_id'] loop
  if d->>v_key is null then continue;end if;
  if v_key='team_id' then select block_id into v_ref from public.teams where id=(d->>v_key)::uuid;
  elsif v_key='session_id' then select block_id into v_ref from public.studio_sessions where id=(d->>v_key)::uuid;
  elsif v_key in ('draft_version_id','published_version_id') then select block_id,team_id into v_ref,v_team from public.poster_versions where id=(d->>v_key)::uuid;
   if v_team is not null and v_team is distinct from (d->>'team_id')::uuid then raise exception using errcode='23514',message='Poster version must belong to this team';end if;
  else select block_id into v_ref from public.projects where id=(d->>v_key)::uuid;end if;
  if v_ref is not null and v_class is not null and v_ref<>v_class then raise exception using errcode='23514',message='Linked records must belong to the same class';end if;
  v_class:=coalesce(v_class,v_ref);
 end loop;return new;
end $$;
revoke all on function public.guard_class_parent_links() from public,anon,authenticated;
do $$declare t text;begin foreach t in array array['team_project_assignments','project_proposals','team_posters','poster_versions','student_session_checkins','student_session_work_tracks','student_session_intakes','student_platform_feedback','session_intake_ai_usage'] loop
 execute format('drop trigger if exists guard_class_parent_links on public.%I',t);
 execute format('create trigger guard_class_parent_links before insert or update on public.%I for each row execute function public.guard_class_parent_links()',t);
end loop;end $$;

-- Display the enrolled class, without changing student identity lookup.
create or replace function public.get_my_student_context()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_account public.student_accounts; v_roster public.student_roster;
  v_block public.teaching_blocks; v_project public.projects%rowtype; v_checkin boolean;
begin
  select * into v_account from public.student_accounts where auth_user_id = auth.uid() and status <> 'disabled';
  if v_account.auth_user_id is null then raise exception using errcode='P0001', message='Student account is not available'; end if;
  select roster.* into v_roster from public.student_roster roster
  join public.teaching_blocks block on block.id=roster.block_id
  where roster.student_id=v_account.student_id and block.status='active'
  order by block.starts_on desc nulls last, block.created_at desc limit 1;
  if v_roster.id is null then raise exception using errcode='P0001', message='No active roster context is available'; end if;
  select * into v_block from public.teaching_blocks where id=v_roster.block_id;
  select project.* into v_project from public.teams team
  join public.team_project_assignments assignment on assignment.team_id=team.id
  join public.projects project on project.id=assignment.project_id
  where team.block_id=v_roster.block_id and team.team_number=v_roster.team_number;
  select exists(select 1 from public.student_checkins where block_id=v_roster.block_id and lower(trim(student_id))=v_account.student_id) into v_checkin;
  return jsonb_build_object(
    'status',v_account.status,'studentId',v_account.student_id,'studentName',coalesce(v_roster.preferred_name,v_roster.full_name),
    'blockId',v_block.id,'blockLabel',concat(v_block.course_code,' · ',v_block.academic_year,' · ',v_block.block_code,' · ',v_block.class_code),'teamName',concat('Team ',v_roster.team_number),
    'intakeMode',v_block.intake_mode,
    'projectName',coalesce(v_project.title,v_roster.project_name),'projectProblem',v_project.problem,'projectDescription',v_project.description,
    'projectTargetUsers',v_project.target_users,'projectExpectedOutcomes',v_project.expected_outcomes,'projectCategory',v_project.category,
    'projectDifficulty',v_project.difficulty,'projectSource',case when v_project.id is not null then 'catalogue' when v_roster.project_name is not null then 'roster' else 'none' end,
    'checkinRecognised',v_checkin);
end;
$$;
-- Teachers administer credentials through the checked server endpoint, not a
-- global student_accounts PATCH that could affect another class's enrolment.
drop policy if exists student_account_update_scope on public.student_accounts;
create policy student_account_update_scope on public.student_accounts as restrictive for update to authenticated using(not public.is_staff_identity() or public.is_superadmin()) with check(not public.is_staff_identity() or public.is_superadmin());
create or replace function public.guard_class_ownership() returns trigger language plpgsql security definer set search_path='' as $$
declare before_row jsonb:=to_jsonb(old);after_row jsonb:=to_jsonb(new);a uuid;b uuid;
begin
 if before_row ? 'block_id' and before_row->>'block_id' is distinct from after_row->>'block_id' then raise exception using errcode='23514',message='Existing records cannot be moved between classes';end if;
 if not(before_row ? 'block_id') and before_row ? 'team_id' and before_row->>'team_id' is distinct from after_row->>'team_id' then
  select block_id into a from public.teams where id=(before_row->>'team_id')::uuid;
  select block_id into b from public.teams where id=(after_row->>'team_id')::uuid;
  if a is distinct from b then raise exception using errcode='23514',message='Existing records cannot be moved between classes';end if;
 end if;return new;
end $$;
revoke all on function public.guard_class_ownership() from public,anon,authenticated;
do $$declare r record;t text;begin
 for r in select table_name from information_schema.columns where table_schema='public' and column_name='block_id' loop
  execute format('drop trigger if exists guard_class_ownership on public.%I',r.table_name);
  execute format('create trigger guard_class_ownership before update on public.%I for each row execute function public.guard_class_ownership()',r.table_name);
 end loop;
 foreach t in array array['team_project_assignments','project_proposals','team_posters'] loop
  execute format('drop trigger if exists guard_class_ownership on public.%I',t);
  execute format('create trigger guard_class_ownership before update on public.%I for each row execute function public.guard_class_ownership()',t);
 end loop;
end $$;

commit;
