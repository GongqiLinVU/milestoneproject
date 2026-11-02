-- Reopen one confirmed summary for its own student; no AI calls or session reopening.
begin;
alter table public.student_session_intakes add column if not exists summary_revision integer not null default 1;
alter table public.student_session_intakes add column if not exists correction_opened_at timestamptz;
alter table public.student_session_intakes add column if not exists correction_opened_by uuid references auth.users(id) on delete restrict;
create table if not exists public.intake_summary_corrections(
 intake_id uuid not null references public.student_session_intakes(id) on delete restrict,
 revision integer not null,opened_by uuid not null references auth.users(id) on delete restrict,
 opened_at timestamptz not null default now(),reconfirmed_at timestamptz,
 before_record jsonb not null,before_confirmation jsonb not null,before_confirmed_at timestamptz not null,
 before_hash text not null,after_record jsonb,after_confirmation jsonb,
 primary key(intake_id,revision)
);
alter table public.intake_summary_corrections enable row level security;
revoke all on public.intake_summary_corrections from public,anon,authenticated;
-- Internal helper, never directly callable by clients. Wrappers first authorize scope.
create or replace function public.intake_summary_correction_info(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('summaryRevision',i.summary_revision,'correctionOpenedAt',i.correction_opened_at,
 'correctionHistory',(select coalesce(jsonb_agg(jsonb_build_object('revision',c.revision,'openedByName',(select p.display_name from public.teacher_profiles p where p.user_id=c.opened_by),
 'openedAt',c.opened_at,'reconfirmedAt',c.reconfirmed_at,'beforeRecord',c.before_record,
 'afterRecord',c.after_record) order by c.revision),'[]'::jsonb) from public.intake_summary_corrections c where c.intake_id=i.id))
 from public.student_session_intakes i where i.id=p_id
$$;
revoke all on function public.intake_summary_correction_info(uuid) from public,anon,authenticated;
create or replace function public.reopen_intake_summary(p_intake_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i public.student_session_intakes%rowtype;
begin
 select * into i from public.student_session_intakes where id=p_intake_id for update;
 if not found then raise exception 'Intake not found';end if;
 perform public.require_teaching_class(i.block_id);
 if not exists(select 1 from public.student_roster r join public.student_accounts a on a.student_id=r.student_id
 where r.block_id=i.block_id and r.student_id=i.student_id and a.auth_user_id=i.auth_user_id and a.status='activated') then raise exception 'Student must still be enrolled with an activated account';end if;
 if i.correction_opened_at is null then
  insert into public.intake_summary_corrections(intake_id,revision,opened_by,before_record,before_confirmation,before_confirmed_at,before_hash)
  values(i.id,i.summary_revision,auth.uid(),i.student_record,i.student_confirmation,i.confirmed_at,i.confirmed_payload_hash);
  update public.student_session_intakes set correction_opened_at=now(),correction_opened_by=auth.uid() where id=i.id;
 end if;
 return public.intake_summary_correction_info(i.id);
end $$;
revoke all on function public.reopen_intake_summary(uuid) from public,anon,authenticated;
grant execute on function public.reopen_intake_summary(uuid) to authenticated;
create or replace function public.reconfirm_my_intake_summary(p_intake_id uuid,p_revision integer,p_student_record jsonb,p_attestation text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.student_session_intakes%rowtype;errors text[];confirmation jsonb;changes jsonb;
begin
 select * into i from public.student_session_intakes where id=p_intake_id and auth_user_id=auth.uid() for update;
 if not found or not exists(select 1 from public.student_accounts a join public.student_roster r on r.student_id=a.student_id
 where a.auth_user_id=auth.uid() and a.student_id=i.student_id and a.status='activated' and r.block_id=i.block_id) then raise exception using errcode='42501',message='Your Intake is not available';end if;
 if i.correction_opened_at is null or p_revision is distinct from i.summary_revision then raise exception 'Summary is locked or has changed. Reload before editing';end if;
 if p_attestation is distinct from 'This summary reflects what I am claiming and the evidence I have identified. Teacher verification is separate.' then raise exception 'Student confirmation is required';end if;
 if p_student_record is null or length(p_student_record::text)>48000 then raise exception 'Summary is too large or missing';end if;
 errors:=public.validate_session_intake_student_record_v12(p_student_record);
 if cardinality(errors)>0 then raise exception 'Invalid summary: %',array_to_string(errors,'; ');end if;
 select coalesce(jsonb_agg(jsonb_build_object('field',key,'before',i.student_record->key,'after',value)),'[]'::jsonb) into changes
 from jsonb_each(p_student_record) where value is distinct from i.student_record->key;
 confirmation:=jsonb_build_object('status','confirmed','attestation',p_attestation,'summary',p_student_record,'corrections',changes,'revision',i.summary_revision+1);
 update public.intake_summary_corrections set reconfirmed_at=now(),after_record=p_student_record,after_confirmation=confirmation where intake_id=i.id and revision=i.summary_revision;
 update public.student_session_intakes set student_record=p_student_record,student_confirmation=confirmation,
 confirmed_at=now(),schema_version='session-intake.v1.2.0',summary_revision=summary_revision+1,
 correction_opened_at=null,correction_opened_by=null,
 confirmed_payload_hash=md5('session-intake.v1.2.0'||session_id::text||auth_user_id::text||source_conversation::text||p_student_record::text||confirmation::text||ai_assistance::text)
 where id=i.id;
 return public.intake_summary_correction_info(i.id);
end $$;
revoke all on function public.reconfirm_my_intake_summary(uuid,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.reconfirm_my_intake_summary(uuid,integer,jsonb,text) to authenticated;

-- Preserve the existing read authorization and payload; append correction state.
do $$ begin
 if to_regprocedure('public.get_my_session_intake_before_corrections(uuid)') is null then alter function public.get_my_session_intake(uuid) rename to get_my_session_intake_before_corrections;end if;
 if to_regprocedure('public.get_teacher_session_intakes_before_corrections(uuid)') is null then alter function public.get_teacher_session_intakes(uuid) rename to get_teacher_session_intakes_before_corrections;end if;
end $$;
revoke all on function public.get_my_session_intake_before_corrections(uuid),public.get_teacher_session_intakes_before_corrections(uuid) from public,anon,authenticated;
create or replace function public.get_my_session_intake(p_session_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare payload jsonb;info jsonb;
begin
 payload:=public.get_my_session_intake_before_corrections(p_session_id);
 if payload->'confirmedRecord'<>'null'::jsonb then
  info:=public.intake_summary_correction_info((payload#>>'{confirmedRecord,intakeId}')::uuid);
  payload:=jsonb_set(payload,'{confirmedRecord}',(payload->'confirmedRecord')||info);
 end if;
 return payload;
end $$;
create or replace function public.get_teacher_session_intakes(p_session_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare payload jsonb;rows jsonb;
begin
 payload:=public.get_teacher_session_intakes_before_corrections(p_session_id);
 select coalesce(jsonb_agg(case when value->>'intakeId' is not null then value||public.intake_summary_correction_info((value->>'intakeId')::uuid) else value end order by ord),'[]'::jsonb)
 into rows from jsonb_array_elements(payload->'intakes') with ordinality e(value,ord);
 return jsonb_set(payload,'{intakes}',rows);
end $$;
revoke all on function public.get_my_session_intake(uuid),public.get_teacher_session_intakes(uuid) from public,anon,authenticated;
grant execute on function public.get_my_session_intake(uuid),public.get_teacher_session_intakes(uuid) to authenticated;
-- Keep correction lineage alongside the existing administrator diagnostics export.
do $$ declare definition text;begin
 if to_regprocedure('public.export_intake_diagnostics(uuid,uuid,uuid,timestamptz)') is not null then
  definition:=pg_get_functiondef('public.export_intake_diagnostics(uuid,uuid,uuid,timestamptz)'::regprocedure);
  if position('summaryCorrection' in definition)=0 then
   if position('''aiAssistance'',ai_assistance' in definition)=0 then raise exception 'Export definition changed; review correction metadata integration';end if;
   definition:=replace(definition,'''aiAssistance'',ai_assistance','''aiAssistance'',ai_assistance,''summaryCorrection'',public.intake_summary_correction_info(id)');
   execute definition;
  end if;
 end if;
end $$;
notify pgrst,'reload schema';
commit;
