-- Exact-ID lookup and explicit enrolment; no account/password/history changes.
begin;
create or replace function public.lookup_student_for_enrolment(p_class_id uuid,p_student_id text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_id text:=lower(trim(p_student_id));v_target public.teaching_blocks;v_account text;v_candidates jsonb;v_conflict boolean;
begin
 perform public.require_teaching_class(p_class_id);
 if v_id is null or char_length(v_id) not between 3 and 40 then raise exception using errcode='22023',message='Enter a complete Student ID (3–40 characters)';end if;
 select * into v_target from public.teaching_blocks where id=p_class_id;
 if v_target.id is null then raise exception using errcode='P0002',message='Class was not found';end if;
 if v_target.status='archived' then raise exception using errcode='23514',message='Students cannot be enrolled into an archived class';end if;
 select status into v_account from public.student_accounts where student_id=v_id;
 if exists(select 1 from public.student_roster where block_id=p_class_id and student_id=v_id) then
  return jsonb_build_object('status','already_enrolled','studentId',v_id,'accountStatus',v_account,'candidates','[]'::jsonb);
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('rosterId',r.id,'fullName',r.full_name,'preferredName',r.preferred_name,'email',r.vu_email,'sourceClass',concat(b.course_code,' · ',b.academic_year,' · ',b.block_code,' · ',b.class_code),'classStatus',b.status) order by b.academic_year desc,b.starts_on desc nulls last,r.updated_at desc,r.id),'[]'::jsonb)
 into v_candidates from public.student_roster r join public.teaching_blocks b on b.id=r.block_id where r.student_id=v_id;
 select exists(select 1 from public.student_roster r join public.teaching_blocks b on b.id=r.block_id where r.student_id=v_id and r.block_id<>p_class_id and b.status='active') into v_conflict;
 return jsonb_build_object('status',case when v_conflict then 'active_class_conflict' when jsonb_array_length(v_candidates)>0 then 'found' else 'not_found' end,'studentId',v_id,'accountStatus',v_account,'candidates',v_candidates);
end $$;

create or replace function public.enrol_existing_student(p_class_id uuid,p_student_id text,p_source_roster_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id text:=lower(trim(p_student_id));v_source public.student_roster;v_status text;v_roster_id uuid;v_account text;
begin
 perform public.require_teaching_class(p_class_id);
 if v_id is null or char_length(v_id) not between 3 and 40 then raise exception using errcode='22023',message='Enter a complete Student ID';end if;
 -- Same lock as guard_active_roster_context, so class activation/imports and
 -- enrolment cannot silently create ambiguous active contexts.
 perform pg_advisory_xact_lock(hashtext('studio.roster.context'));
 select status into v_status from public.teaching_blocks where id=p_class_id for share;
 if v_status is null then raise exception using errcode='P0002',message='Class was not found';end if;
 if v_status='archived' then raise exception using errcode='23514',message='Students cannot be enrolled into an archived class';end if;
 select id into v_roster_id from public.student_roster where block_id=p_class_id and student_id=v_id;
 if v_roster_id is not null then return jsonb_build_object('status','already_enrolled','studentId',v_id);end if;
 if exists(select 1 from public.student_roster r join public.teaching_blocks b on b.id=r.block_id where r.student_id=v_id and r.block_id<>p_class_id and b.status='active') then
  return jsonb_build_object('status','active_class_conflict','studentId',v_id);
 end if;
 select * into v_source from public.student_roster where id=p_source_roster_id and student_id=v_id for share;
 if v_source.id is null then raise exception using errcode='22023',message='The selected student record is no longer available. Search again';end if;
 insert into public.student_roster(block_id,student_id,full_name,preferred_name,vu_email,team_number,project_name)
 values(p_class_id,v_id,v_source.full_name,v_source.preferred_name,v_source.vu_email,null,null) returning id into v_roster_id;
 select status into v_account from public.student_accounts where student_id=v_id;
 return jsonb_build_object('status','enrolled','studentId',v_id,'rosterId',v_roster_id,'accountStatus',v_account);
end $$;
revoke all on function public.lookup_student_for_enrolment(uuid,text),public.enrol_existing_student(uuid,text,uuid) from public,anon;
grant execute on function public.lookup_student_for_enrolment(uuid,text),public.enrol_existing_student(uuid,text,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
