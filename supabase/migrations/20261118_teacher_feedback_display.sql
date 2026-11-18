-- Keep feedback attribution readable, with a configurable teacher name.
begin;
create or replace function public.get_my_teacher_display_name() returns text
language plpgsql stable security definer set search_path='' as $$
declare n text;
begin
 if auth.uid() is null or not public.is_teacher() then raise exception using errcode='42501',message='Teacher access required';end if;
 select display_name into n from public.teacher_profiles where user_id=auth.uid() and active;
 if not found then raise exception using errcode='42501',message='Teacher profile unavailable';end if;
 return n;
end $$;

create or replace function public.save_my_teacher_display_name(p_name text) returns text
language plpgsql security definer set search_path='' as $$
declare n text:=trim(p_name);
begin
 perform public.get_my_teacher_display_name();
 if n is null or length(n) not between 1 and 100 then raise exception 'Enter a teacher name between 1 and 100 characters';end if;
 update public.teacher_profiles set display_name=n where user_id=auth.uid();
 return n;
end $$;

create or replace function public.get_session_teacher_check(p_intake_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare i public.student_session_intakes%rowtype;c public.session_teacher_checks%rowtype;
begin
 select * into i from public.student_session_intakes where id=p_intake_id;
 if not found then raise exception 'Intake not found';end if;
 if i.auth_user_id is distinct from auth.uid() then perform public.require_teaching_class(i.block_id);end if;
 select * into c from public.session_teacher_checks where intake_id=i.id;
 return jsonb_build_object('version',coalesce(c.version,0),'summaryRevision',i.summary_revision,'correctionOpen',i.correction_opened_at is not null,
 'check',case when c.intake_id is null then null else jsonb_build_object('version',c.version,'summaryRevision',c.summary_revision,'level',c.level,'comment',c.comment,'checkedAt',c.checked_at,
 'teacherName',coalesce((select nullif(trim(p.display_name),'') from public.teacher_profiles p where p.user_id=c.checked_by),c.teacher_name),
 'current',c.summary_revision=i.summary_revision and i.correction_opened_at is null) end,
 'history',(select coalesce(jsonb_agg(jsonb_build_object('version',e.version,'summaryRevision',e.summary_revision,'level',e.level,'comment',e.comment,'checkedAt',e.checked_at,
 'teacherName',coalesce((select nullif(trim(p.display_name),'') from public.teacher_profiles p where p.user_id=e.checked_by),e.teacher_name)) order by e.version desc),'[]'::jsonb) from (select * from public.session_teacher_check_events where intake_id=i.id order by version desc limit 20) e));
end $$;
revoke all on function public.get_my_teacher_display_name(),public.save_my_teacher_display_name(text),public.get_session_teacher_check(uuid) from public,anon,authenticated;
grant execute on function public.get_my_teacher_display_name(),public.save_my_teacher_display_name(text),public.get_session_teacher_check(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
