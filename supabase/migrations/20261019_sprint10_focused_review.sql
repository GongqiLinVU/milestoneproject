-- Focused AI review; preserves existing records, privileges and window/mode checks.
-- Apply after AI03. No usage resets or collection configuration changes.
begin;
alter table public.student_session_intakes drop constraint if exists student_session_intakes_schema_version_check;
alter table public.student_session_intakes add constraint student_session_intakes_schema_version_check check(schema_version in ('session-intake.v1.0.0','session-intake.v1.1.0','session-intake.v1.2.0'));
create or replace function public.validate_session_intake_student_record_v12(p_record jsonb)
returns text[] language plpgsql immutable set search_path='' as $$
declare v_errors text[]; v_item jsonb; v_key text;
begin
 v_errors:=public.validate_session_intake_student_record_v11(p_record);
 select coalesce(array_agg(e),'{}'::text[]) into v_errors from unnest(v_errors) e
 where e not in ('available evidence needs a reference and verification method','expected evidence needs a verification method','not-required evidence needs a reason','executed testing needs method and observed result','active or resolved blocker needs a description','next action, due Session and expected evidence are required');
 if jsonb_typeof(p_record->'next_action') is distinct from 'object'
 or jsonb_typeof(p_record#>'{next_action,action}') is distinct from 'string'
 or length(p_record#>>'{next_action,action}')>1000
 or jsonb_typeof(p_record#>'{next_action,expected_evidence}') is distinct from 'string'
 or length(p_record#>>'{next_action,expected_evidence}')>1000
 or coalesce(p_record#>>'{next_action,due_session}','') !~ '^S([1-9]|10)$' then
 v_errors:=array_append(v_errors,'Next-step structure is invalid');end if;
 if jsonb_typeof(p_record->'evidence')='array' then
 for v_item in select * from jsonb_array_elements(p_record->'evidence') loop
 foreach v_key in array array['reference','verification_method','not_required_reason'] loop
 if v_item ? v_key and v_item->v_key <> 'null'::jsonb and (jsonb_typeof(v_item->v_key)<>'string' or length(v_item->>v_key)>case when v_key='not_required_reason' then 500 else 1000 end) then v_errors:=array_append(v_errors,'Evidence text is invalid');end if;
 end loop;end loop;end if;
 if jsonb_typeof(p_record->'testing')='array' then
 for v_item in select * from jsonb_array_elements(p_record->'testing') loop
 foreach v_key in array array['method','observed_result','baseline_or_expected'] loop
 if v_item ? v_key and v_item->v_key <> 'null'::jsonb and (jsonb_typeof(v_item->v_key)<>'string' or length(v_item->>v_key)>1000) then v_errors:=array_append(v_errors,'Testing text is invalid');end if;
 end loop;end loop;end if;
 foreach v_key in array array['description','support_requested'] loop
 if (p_record->'blocker') ? v_key and p_record#>array['blocker',v_key] <> 'null'::jsonb and (jsonb_typeof(p_record#>array['blocker',v_key])<>'string' or length(p_record#>>array['blocker',v_key])>case when v_key='support_requested' then 500 else 1000 end) then v_errors:=array_append(v_errors,'Help text is invalid');end if;
 end loop;
 return v_errors;
end; $$;
revoke all on function public.validate_session_intake_student_record_v12(jsonb) from public,anon,authenticated;

create or replace function public.save_my_session_intake_chat(
  p_session_id uuid,
  p_source_conversation jsonb,
  p_student_record jsonb,
  p_student_confirmation jsonb,
  p_prompt_version text,
  p_ai_assistance jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_roster public.student_roster%rowtype;
  v_session public.studio_sessions%rowtype;
  v_intake public.student_session_intakes%rowtype;
  v_errors text[];
  v_payload_hash text;
  v_allowed_ai_keys text[] := array[
    'used','model','policy_version','follow_up_count','question_purposes',
    'extraction_status','stop_reason','extracted_record','turn_results','turn_decisions','review_version','debug_events'
  ];
begin
  perform public.assert_single_session_progress(p_session_id,'intake');
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  if v_account.student_id is null then
    raise exception using errcode = 'P0001', message = 'Student account is not available';
  end if;

  select roster.* into v_roster
  from public.student_roster roster
  where roster.student_id = v_account.student_id
    and roster.block_id = (
      select session.block_id from public.studio_sessions session where session.id = p_session_id
    );

  select session.* into v_session
  from public.studio_sessions session
  where session.id = p_session_id
    and session.block_id = v_roster.block_id
    and session.session_number between 1 and 9
    and public.resolve_session_collection_mode(session.id) in ('deterministic','ai')
    and (
      session.intake_access = 'open'
      or (
        session.intake_access = 'session'
        and (
          session.status = 'open'
          or (
            session.status = 'scheduled'
            and session.starts_at <= now()
            and (session.ends_at is null or session.ends_at > now())
          )
        )
      )
    );

  if v_roster.id is null or v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Session Intake can only be submitted while it is open';
  end if;

  if exists (
    select 1 from public.student_session_intakes
    where session_id = v_session.id and student_id = v_account.student_id
  ) then
    raise exception using errcode = 'P0001', message = 'This Session Intake has already been confirmed';
  end if;

  if p_source_conversation is null
     or jsonb_typeof(p_source_conversation) <> 'array'
     or jsonb_array_length(p_source_conversation) not between 3 and 17
     or length(p_source_conversation::text) > 48000
     or exists (
       select 1 from jsonb_array_elements(p_source_conversation) turn
       where jsonb_typeof(turn) <> 'object'
          or coalesce(turn ->> 'actor','') not in ('student','system')
          or char_length(btrim(coalesce(turn ->> 'purpose',''))) not between 3 and 80
          or char_length(btrim(coalesce(turn ->> 'text',''))) not between 1 and 2000
     ) then
    raise exception using errcode = 'P0001', message = 'AI-assisted conversation is invalid';
  end if;

  if mod(jsonb_array_length(p_source_conversation),2) <> 1
     or p_source_conversation -> -1 ->> 'purpose' is distinct from 'review transition'
     or exists (
       select 1 from jsonb_array_elements(p_source_conversation) with ordinality as t(value,n)
       where value ->> 'actor' is distinct from case when mod(n,2)=1 then 'system' else 'student' end
          or (value ->> 'purpose' = 'review transition' and n <> jsonb_array_length(p_source_conversation))
     ) then
    raise exception 'Chat conversation order is invalid';
  end if;

  v_errors := case when p_ai_assistance->>'review_version'='focused-review.v1' then public.validate_session_intake_student_record_v12(p_student_record) else public.validate_session_intake_student_record_v11(p_student_record) end;
  if cardinality(v_errors) > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Session Intake evidence is incomplete',
      detail = array_to_string(v_errors, '; ');
  end if;

  if p_student_confirmation is null
     or jsonb_typeof(p_student_confirmation) <> 'object'
     or coalesce(p_student_confirmation ->> 'status','') <> 'confirmed'
     or coalesce(p_student_confirmation ->> 'attestation','') <>
       'This summary reflects what I am claiming and the evidence I have identified. Teacher verification is separate.'
     or jsonb_typeof(coalesce(p_student_confirmation -> 'corrections','[]'::jsonb)) <> 'array'
     or length(p_student_confirmation::text) > 48000 then
    raise exception using errcode = 'P0001', message = 'Student confirmation is invalid';
  end if;

  if p_prompt_version is null
     or p_prompt_version not in ('session-intake-ai.v1.2.0','session-intake-ai.v1.3.0','session-intake-ai.v1.3.1') then
    raise exception using errcode = 'P0001', message = 'AI Intake prompt version is invalid';
  end if;

  if p_ai_assistance is null or jsonb_typeof(p_ai_assistance) <> 'object'
     or exists (select 1 from jsonb_object_keys(p_ai_assistance) key where not (key = any(v_allowed_ai_keys)))
     or p_ai_assistance ->> 'policy_version' not in ('adaptive-intake.v1.0.0','adaptive-intake.v1.1.0')
     or jsonb_typeof(p_ai_assistance -> 'used') is distinct from 'boolean'
     or coalesce(p_ai_assistance ->> 'extraction_status','') not in ('completed','fallback','not_used')
     or coalesce(p_ai_assistance ->> 'stop_reason','') not in ('sufficient_information','teacher_help','budget_exhausted','provider_failure')
     or coalesce((p_ai_assistance ->> 'follow_up_count')::integer,-1) <> greatest(0, (jsonb_array_length(p_source_conversation)-1)/2-3)
     or jsonb_typeof(p_ai_assistance -> 'question_purposes') is distinct from 'array'
     or jsonb_array_length(p_ai_assistance -> 'question_purposes') <> greatest(0, (jsonb_array_length(p_source_conversation)-1)/2-3)
     or jsonb_typeof(p_ai_assistance -> 'extracted_record') is distinct from 'object'
     or jsonb_typeof(p_ai_assistance -> 'turn_results') is distinct from 'array'
     or jsonb_array_length(p_ai_assistance -> 'turn_results') > 8
     or (p_ai_assistance ? 'turn_decisions' and (jsonb_typeof(p_ai_assistance -> 'turn_decisions') is distinct from 'array' or jsonb_array_length(p_ai_assistance -> 'turn_decisions') > 8))
     or length(p_ai_assistance::text) > (case when p_ai_assistance->>'review_version'='focused-review.v1' then 384000 else 96000 end) then
    raise exception 'Chat assistance metadata is invalid';
  end if;

  if p_ai_assistance ? 'review_version' and (p_ai_assistance->>'review_version' is distinct from 'focused-review.v1' or jsonb_typeof(p_ai_assistance->'debug_events') is distinct from 'array' or jsonb_array_length(p_ai_assistance->'debug_events')>32 or length((p_ai_assistance->'debug_events')::text)>300000) then
    raise exception 'Focused review debug metadata is invalid';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_ai_assistance -> 'turn_results') r,
      lateral jsonb_array_elements(r -> 'evidenceUpdates') u
    where coalesce(u ->> 'sourceTurn','') !~ '^[0-9]+$'
       or p_source_conversation -> ((u ->> 'sourceTurn')::integer) ->> 'actor' is distinct from 'student'
  ) then
    raise exception 'Chat evidence source is invalid';
  end if;

  v_payload_hash := md5(
    (case when p_ai_assistance->>'review_version'='focused-review.v1' then 'session-intake.v1.2.0' else 'session-intake.v1.1.0' end) ||
    p_session_id::text ||
    auth.uid()::text ||
    p_source_conversation::text ||
    p_student_record::text ||
    p_student_confirmation::text ||
    p_ai_assistance::text
  );

  insert into public.student_session_intakes (
    session_id, block_id, student_id, auth_user_id,
    schema_version, source_mode, prompt_version, test_suite_version,
    source_conversation, student_record, ai_assistance,
    student_confirmation, confirmed_payload_hash
  ) values (
    v_session.id, v_session.block_id, v_account.student_id, auth.uid(),
    case when p_ai_assistance->>'review_version'='focused-review.v1' then 'session-intake.v1.2.0' else 'session-intake.v1.1.0' end, case when (p_ai_assistance ->> 'used')::boolean then 'ai_assisted' else 'deterministic_fallback' end, p_prompt_version,
    'ai-intake-suite.v1.1.0', p_source_conversation, p_student_record,
    p_ai_assistance, p_student_confirmation, v_payload_hash
  )
  returning * into v_intake;

  return jsonb_build_object(
    'intakeId', v_intake.id,
    'schemaVersion', v_intake.schema_version,
    'sourceMode', v_intake.source_mode,
    'promptVersion', v_intake.prompt_version,
    'confirmedAt', v_intake.confirmed_at,
    'confirmedPayloadHash', v_intake.confirmed_payload_hash
  );
end;
$$;

revoke all on function public.save_my_session_intake_chat(uuid,jsonb,jsonb,jsonb,text,jsonb) from public,anon;
grant execute on function public.save_my_session_intake_chat(uuid,jsonb,jsonb,jsonb,text,jsonb) to authenticated;

create or replace function public.get_my_session_intake(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_roster public.student_roster%rowtype;
  v_session public.studio_sessions%rowtype;
  v_current public.student_session_intakes%rowtype;
  v_previous public.student_session_intakes%rowtype;
begin
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  if v_account.student_id is null then
    raise exception using errcode = 'P0001', message = 'Student account is not available';
  end if;

  select roster.* into v_roster
  from public.student_roster roster
  where roster.student_id = v_account.student_id
    and roster.block_id = (
      select session.block_id from public.studio_sessions session where session.id = p_session_id
    );

  select session.* into v_session
  from public.studio_sessions session
  where session.id = p_session_id
    and session.block_id = v_roster.block_id
    and session.session_number between 1 and 9;

  if v_roster.id is null or v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Session Intake is not available';
  end if;

  select * into v_current
  from public.student_session_intakes intake
  where intake.session_id = v_session.id and intake.auth_user_id = auth.uid();

  select intake.* into v_previous
  from public.student_session_intakes intake
  join public.studio_sessions previous_session on previous_session.id = intake.session_id
  where intake.block_id = v_session.block_id
    and intake.student_id = v_account.student_id
    and previous_session.session_number < v_session.session_number
  order by previous_session.session_number desc
  limit 1;

  return jsonb_build_object(
    'schemaVersion', 'session-intake.v1.0.0',
    'testSuiteVersion', 'ai-intake-suite.v1.0.0',
    'sessionId', v_session.id,
    'sessionNumber', v_session.session_number,
    'blockId', v_session.block_id,
    'effectiveMode', public.resolve_session_collection_mode(v_session.id),
    'workTrackUpdatedAt', (select updated_at from public.student_session_work_tracks where session_id=v_session.id and auth_user_id=auth.uid()),
    'isOpen', (
      public.resolve_session_collection_mode(v_session.id) in ('deterministic','ai')
      and not exists(select 1 from public.student_session_work_tracks where session_id=v_session.id and auth_user_id=auth.uid())
      and (
      v_session.intake_access = 'open'
      or (
        v_session.intake_access = 'session'
        and (
          v_session.status = 'open'
          or (
            v_session.status = 'scheduled'
            and v_session.starts_at <= now()
            and (v_session.ends_at is null or v_session.ends_at > now())
          )
        )
      )
    )),
    'confirmedRecord', case when v_current.id is null then null else jsonb_build_object(
      'intakeId', v_current.id,
      'sourceMode', v_current.source_mode,
      'studentRecord', v_current.student_record,
      'studentConfirmation', v_current.student_confirmation,
      'sourceConversation', v_current.source_conversation,
      'aiAssistance', v_current.ai_assistance,
      'confirmedAt', v_current.confirmed_at
    ) end,
    'previousConfirmed', case when v_previous.id is null then null else jsonb_build_object(
      'intakeId', v_previous.id,
      'studentRecord', v_previous.student_record,
      'confirmedAt', v_previous.confirmed_at
    ) end
  );
end;
$$;
revoke all on function public.get_my_session_intake(uuid) from public,anon;
grant execute on function public.get_my_session_intake(uuid) to authenticated;
commit;
