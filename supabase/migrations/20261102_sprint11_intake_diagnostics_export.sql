-- Read-only, superadmin-only export. Apply before deploying the export button.
begin;
create or replace function public.export_intake_diagnostics(
 p_class_id uuid,p_session_id uuid default null,p_after_id uuid default null,p_as_of timestamptz default null
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_as_of timestamptz:=coalesce(p_as_of,statement_timestamp());v_rows jsonb;v_last uuid;v_count integer;
begin
 if not public.is_superadmin() then raise exception using errcode='42501',message='Only a platform administrator can export Intake diagnostics';end if;
 if p_class_id is null or not exists(select 1 from public.teaching_blocks where id=p_class_id) then raise exception 'Class not found';end if;
 if p_session_id is not null and not exists(select 1 from public.studio_sessions where id=p_session_id and block_id=p_class_id) then raise exception 'Session does not belong to this class';end if;
 if v_as_of>statement_timestamp() then raise exception 'Export timestamp cannot be in the future';end if;
 with page as (
  select i.*,s.session_number,s.title as session_title,s.session_date,r.full_name,r.team_number
  from public.student_session_intakes i
  join public.studio_sessions s on s.id=i.session_id and s.block_id=i.block_id
  left join public.student_roster r on r.block_id=i.block_id and r.student_id=i.student_id
  where i.block_id=p_class_id and (p_session_id is null or i.session_id=p_session_id)
   and (p_after_id is null or i.id>p_after_id)
   and i.confirmed_at<=v_as_of and i.created_at<=v_as_of
   and i.student_confirmation->>'status'='confirmed'
  order by i.id limit 25
 )
 select coalesce(jsonb_agg(jsonb_build_object(
  'intakeId',id,'studentId',student_id,'studentName',full_name,'currentTeamNumber',team_number,
  'sessionId',session_id,'sessionNumber',session_number,'sessionTitle',session_title,'sessionDate',session_date,
  'confirmedAt',confirmed_at,'sourceMode',source_mode,'schemaVersion',schema_version,
  'promptVersion',prompt_version,'testSuiteVersion',test_suite_version,
  'conversation',source_conversation,'studentRecord',student_record,
  'studentConfirmation',student_confirmation,'aiAssistance',ai_assistance
 ) order by id),'[]'::jsonb),count(*),(array_agg(id order by id desc))[1]
 into v_rows,v_count,v_last from page;
 return jsonb_build_object('formatVersion','intake-diagnostics.v1','asOf',v_as_of,
  'class',(select jsonb_build_object('id',id,'courseCode',course_code,'academicYear',academic_year,'blockCode',block_code,'classCode',class_code) from public.teaching_blocks where id=p_class_id),
  'sessionId',p_session_id,'records',v_rows,'nextCursor',case when v_count=25 then v_last else null end);
end $$;
revoke all on function public.export_intake_diagnostics(uuid,uuid,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.export_intake_diagnostics(uuid,uuid,uuid,timestamptz) to authenticated;
notify pgrst,'reload schema';
commit;
