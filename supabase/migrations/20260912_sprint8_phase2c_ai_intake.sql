-- Sprint 8 Phase 2C: bounded AI-assisted Intake persistence.
-- The AI endpoint may propose questions and extraction, but this RPC remains the
-- final identity, Session-access, schema and authority boundary.

create or replace function public.save_my_session_intake_ai(
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
    'used','model','follow_up_count','question_purposes','extraction_status',
    'uncertainties','flags','suggested_teacher_questions'
  ];
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
    and session.session_number between 1 and 9
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
     or jsonb_array_length(p_source_conversation) not between 3 and 12
     or length(p_source_conversation::text) > 16000
     or exists (
       select 1 from jsonb_array_elements(p_source_conversation) turn
       where jsonb_typeof(turn) <> 'object'
          or coalesce(turn ->> 'actor','') not in ('student','system')
          or char_length(btrim(coalesce(turn ->> 'purpose',''))) not between 3 and 80
          or char_length(btrim(coalesce(turn ->> 'text',''))) not between 1 and 2000
     ) then
    raise exception using errcode = 'P0001', message = 'AI-assisted conversation is invalid';
  end if;

  v_errors := public.validate_session_intake_student_record(p_student_record);
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
     or length(p_student_confirmation::text) > 8000 then
    raise exception using errcode = 'P0001', message = 'Student confirmation is invalid';
  end if;

  if p_prompt_version is null
     or p_prompt_version <> 'session-intake-ai.v1.0.0' then
    raise exception using errcode = 'P0001', message = 'AI Intake prompt version is invalid';
  end if;

  if p_ai_assistance is null
     or jsonb_typeof(p_ai_assistance) <> 'object'
     or exists (
       select 1 from jsonb_object_keys(p_ai_assistance) key
       where not (key = any(v_allowed_ai_keys))
     )
     or coalesce((p_ai_assistance ->> 'used')::boolean, false) is not true
     or coalesce(p_ai_assistance ->> 'extraction_status','') <> 'completed'
     or coalesce((p_ai_assistance ->> 'follow_up_count')::integer, -1) not between 0 and 3
     or jsonb_typeof(coalesce(p_ai_assistance -> 'question_purposes','[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_ai_assistance -> 'question_purposes','[]'::jsonb)) > 3
     or jsonb_typeof(coalesce(p_ai_assistance -> 'uncertainties','[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_ai_assistance -> 'uncertainties','[]'::jsonb)) > 5
     or jsonb_typeof(coalesce(p_ai_assistance -> 'flags','[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_ai_assistance -> 'flags','[]'::jsonb)) > 5
     or jsonb_typeof(coalesce(p_ai_assistance -> 'suggested_teacher_questions','[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_ai_assistance -> 'suggested_teacher_questions','[]'::jsonb)) > 3
     or length(p_ai_assistance::text) > 8000 then
    raise exception using errcode = 'P0001', message = 'AI assistance metadata is invalid';
  end if;

  -- Student confirmation remains separate from AI metadata. Teacher-controlled
  -- fields are neither accepted by the Evidence validator nor this metadata list.
  v_payload_hash := md5(
    'session-intake.v1.0.0' ||
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
    'session-intake.v1.0.0', 'ai_assisted', p_prompt_version,
    'ai-intake-suite.v1.0.0', p_source_conversation, p_student_record,
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

revoke all on function public.save_my_session_intake_ai(uuid,jsonb,jsonb,jsonb,text,jsonb) from public;
revoke all on function public.save_my_session_intake_ai(uuid,jsonb,jsonb,jsonb,text,jsonb) from anon;
grant execute on function public.save_my_session_intake_ai(uuid,jsonb,jsonb,jsonb,text,jsonb) to authenticated;
