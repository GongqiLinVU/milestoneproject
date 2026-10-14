-- S10-AI02: verified model identity and auditable correction of alias-only alerts.
-- Additive migration; applied AI01 SQL is never edited. No historical row updates.
begin;
alter table public.session_intake_ai_usage
 add column if not exists reported_model text,
 add column if not exists reconciled_at timestamptz,
 add column if not exists reconciliation_note text;

-- Exact identities plus one explicitly verified OpenAI alias/snapshot pair.
-- No prefix matching, wildcard dates, cross-provider or reverse alias matching.
create or replace function public.session_intake_ai_model_matches(p_provider text,p_configured_model text,p_reported_model text)
returns boolean language sql immutable set search_path='' as $$
 select coalesce(p_reported_model=p_configured_model or (
   p_provider='openai' and p_configured_model='gpt-5-mini'
   and p_reported_model='gpt-5-mini-2025-08-07'
 ),false);
$$;
revoke all on function public.session_intake_ai_model_matches(text,text,text) from public,anon,authenticated;
grant execute on function public.session_intake_ai_model_matches(text,text,text) to service_role;

create or replace function public.finish_session_intake_ai_attempt(p_attempt_id uuid,p_input_tokens bigint,p_output_tokens bigint,p_reported_model text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.session_intake_ai_usage%rowtype; v_cost numeric; v_known boolean; v_alert boolean; v_matches boolean;
begin
 select * into a from public.session_intake_ai_usage where id=p_attempt_id for update;
 if a.id is null then raise exception 'Unknown AI reservation'; end if;
 if a.status<>'reserved' then return jsonb_build_object('costUsd',a.observed_usd,'chargedUsd',a.charged_usd,'status',a.status,'reconciliationRequired',a.reconciliation_required); end if;
 v_matches:=public.session_intake_ai_model_matches(a.provider,a.model,p_reported_model);
 v_alert:=p_reported_model is not null and not v_matches;
 v_known:=p_input_tokens is not null and p_output_tokens is not null and p_input_tokens>=0 and p_output_tokens>=0
 and p_input_tokens<=a.input_ceiling and p_output_tokens<=a.output_ceiling and not v_alert and v_matches;
 if p_input_tokens>a.input_ceiling or p_output_tokens>a.output_ceiling then v_alert:=true; end if;
 v_cost:=case when v_known then ceil((p_input_tokens*a.input_rate+p_output_tokens*a.output_rate)/1000000*100000000)/100000000 else null end;
 update public.session_intake_ai_usage set input_tokens=p_input_tokens,output_tokens=p_output_tokens,reported_model=p_reported_model,
 observed_usd=v_cost,charged_usd=coalesce(v_cost,reserved_usd),status=case when v_known then 'settled' else 'uncertain' end,
 reconciliation_required=v_alert where id=a.id;
 return jsonb_build_object('costUsd',v_cost,'chargedUsd',coalesce(v_cost,a.reserved_usd),'status',case when v_known then 'settled' else 'uncertain' end,'reconciliationRequired',v_alert);
end; $$;
revoke all on function public.finish_session_intake_ai_attempt(uuid,bigint,bigint,text) from public,anon,authenticated;
grant execute on function public.finish_session_intake_ai_attempt(uuid,bigint,bigint,text) to service_role;


-- Manual correction only: stored tokens must match reviewed evidence. This does
-- not forgive timeouts, over-ceiling usage, missing usage or unexpected models.
create or replace function public.reconcile_session_intake_ai_alias(
 p_attempt_id uuid,p_expected_input_tokens bigint,p_expected_output_tokens bigint,
 p_reported_model text,p_evidence_reference text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.session_intake_ai_usage%rowtype; v_block uuid; v_cost numeric;
begin
 if p_evidence_reference is null or char_length(btrim(p_evidence_reference)) not between 10 and 1500 then
   raise exception 'Reviewed provider evidence is required'; end if;
 select block_id into v_block from public.session_intake_ai_usage where id=p_attempt_id;
 if v_block is null then raise exception 'Unknown AI reservation'; end if;
 perform 1 from public.teaching_blocks where id=v_block for update;
 select * into a from public.session_intake_ai_usage where id=p_attempt_id for update;
 if a.input_tokens is distinct from p_expected_input_tokens or a.output_tokens is distinct from p_expected_output_tokens
 or p_expected_input_tokens is null or p_expected_output_tokens is null
 or p_expected_input_tokens not between 0 and a.input_ceiling
 or p_expected_output_tokens not between 0 and a.output_ceiling
 or a.provider<>'openai' or a.model<>'gpt-5-mini' or p_reported_model<>'gpt-5-mini-2025-08-07'
 or not public.session_intake_ai_model_matches(a.provider,a.model,p_reported_model)
 or (a.reported_model is not null and a.reported_model<>p_reported_model) then
   raise exception 'Evidence does not establish an alias-only mismatch'; end if;
 if a.status='settled' and a.reconciled_at is not null and a.reported_model=p_reported_model then
   return jsonb_build_object('attemptId',a.id,'status',a.status,'costUsd',a.observed_usd,'alreadyReconciled',true); end if;
 if a.status<>'uncertain' or not a.reconciliation_required then raise exception 'Reservation is not an alias alert'; end if;
 v_cost:=ceil((a.input_tokens*a.input_rate+a.output_tokens*a.output_rate)/1000000*100000000)/100000000;
 update public.session_intake_ai_usage set reported_model=p_reported_model,observed_usd=v_cost,charged_usd=v_cost,
 status='settled',reconciliation_required=false,reconciled_at=now(),reconciliation_note=btrim(p_evidence_reference)
 where id=a.id;
 return jsonb_build_object('attemptId',a.id,'status','settled','costUsd',v_cost,'releasedUsd',a.charged_usd-v_cost);
end; $$;
revoke all on function public.reconcile_session_intake_ai_alias(uuid,bigint,bigint,text,text) from public,anon,authenticated;
grant execute on function public.reconcile_session_intake_ai_alias(uuid,bigint,bigint,text,text) to service_role;
-- Preserve the save contract; accept the new prompt guidance revision too.
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
    'extraction_status','stop_reason','extracted_record','turn_results','turn_decisions'
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

  v_errors := public.validate_session_intake_student_record_v11(p_student_record);
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
     or length(p_ai_assistance::text) > 96000 then
    raise exception 'Chat assistance metadata is invalid';
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
    'session-intake.v1.1.0' ||
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
    'session-intake.v1.1.0', case when (p_ai_assistance ->> 'used')::boolean then 'ai_assisted' else 'deterministic_fallback' end, p_prompt_version,
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
commit;
