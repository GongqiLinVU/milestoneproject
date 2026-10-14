-- Sprint 10 S10-AI01: per-Session collection and durable paid-attempt controls.
-- Additive; no modes/windows/budgets are enabled and no historical row is rewritten.
-- Requires applied Sprint 9 and S10-01/01b migrations. Apply once to the shared backend.
begin;
alter table public.studio_sessions add column if not exists intake_mode_override text
  check (intake_mode_override is null or intake_mode_override in ('disabled','deterministic','ai'));
alter table public.teaching_blocks add column if not exists intake_ai_budget_usd numeric(12,6) not null default 0 check (intake_ai_budget_usd between 0 and 1000);
alter table public.teaching_blocks add column if not exists intake_ai_attempt_limit integer not null default 0 check (intake_ai_attempt_limit between 0 and 50);

create or replace function public.resolve_session_collection_mode(p_session_id uuid)
returns text language sql stable security definer set search_path='' as $$
 select coalesce(s.intake_mode_override,b.intake_mode) from public.studio_sessions s
 join public.teaching_blocks b on b.id=s.block_id where s.id=p_session_id;
$$;
revoke all on function public.resolve_session_collection_mode(uuid) from public,anon,authenticated;
grant execute on function public.resolve_session_collection_mode(uuid) to service_role;

-- Serialize both record families to prevent concurrent method-switch double reporting.
create or replace function public.assert_single_session_progress(p_session_id uuid,p_family text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authenticated student required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||p_session_id::text,0));
 if (p_family='intake' and exists(select 1 from public.student_session_work_tracks where session_id=p_session_id and auth_user_id=auth.uid()))
 or (p_family='work' and exists(select 1 from public.student_session_intakes where session_id=p_session_id and auth_user_id=auth.uid())) then
   raise exception 'Progress is already recorded for this Session. View your saved history.';
 end if;
end; $$;
revoke all on function public.assert_single_session_progress(uuid,text) from public,anon,authenticated;
create or replace function public.get_my_session_work_track(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_session public.studio_sessions%rowtype;
  v_track public.student_session_work_tracks%rowtype;
  v_previous_next_focus text;
  v_previous_response jsonb;
  v_previous_completion integer;
  v_block_id uuid;
begin
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  if v_account.student_id is null then
    raise exception using errcode = 'P0001', message = 'Student account is not available';
  end if;

  select roster.block_id into v_block_id
  from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;

  select * into v_session
  from public.studio_sessions
  where id = p_session_id
    and block_id = v_block_id
    and session_number between 1 and 9;

  if v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Session Work Track is not available';
  end if;

  select * into v_track
  from public.student_session_work_tracks
  where session_id = v_session.id and auth_user_id = auth.uid();

  if v_session.session_number > 1 then
    select track.response,
           coalesce(track.response ->> 'nextAction', track.response ->> 'nextFocus'),
           case when jsonb_typeof(track.response -> 'completionPercent') = 'number'
             then (track.response ->> 'completionPercent')::numeric::integer else null end
    into v_previous_response, v_previous_next_focus, v_previous_completion
    from public.student_session_work_tracks track
    join public.studio_sessions previous on previous.id = track.session_id
    where track.auth_user_id = auth.uid()
      and track.block_id = v_block_id
      and previous.session_number < v_session.session_number
      and previous.session_number between 1 and 9
    order by previous.session_number desc
    limit 1;
  end if;

  return jsonb_build_object(
    'earlyFormVersion', 'compact.v1',
    'sessionId', v_session.id,
    'sessionNumber', v_session.session_number,
    'focus', coalesce(v_session.curriculum_focus, v_session.title),
    'taskGuidance', v_session.task_guidance,
    'expectedEvidence', v_session.expected_evidence,
    'isOpen', (
      public.resolve_session_collection_mode(v_session.id) = 'disabled'
      and not exists(select 1 from public.student_session_intakes where session_id=v_session.id and auth_user_id=auth.uid())
      and (v_session.work_track_access = 'open'
      or (
        v_session.work_track_access = 'session'
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
    'response', coalesce(v_track.response, '{}'::jsonb),
    'updatedAt', v_track.updated_at,
    'previousNextFocus', v_previous_next_focus,
    'previousResponse', v_previous_response,
    'previousCompletion', v_previous_completion
  );
end;
$$;

create or replace function public.save_my_session_work_track(p_session_id uuid, p_response jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_session public.studio_sessions%rowtype;
  v_block_id uuid;
  v_track public.student_session_work_tracks%rowtype;
  v_response jsonb;
  v_requirement_count integer;
  v_invalid_requirement_count integer;
  v_completion integer;
  v_stage text;
  v_path text;
begin
  if p_response is null or jsonb_typeof(p_response) <> 'object' or length(p_response::text) > 12000 then
    raise exception using errcode = 'P0001', message = 'Work Track response is invalid';
  end if;

  perform public.assert_single_session_progress(p_session_id,'work');
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  select roster.block_id into v_block_id
  from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;

  select * into v_session
  from public.studio_sessions
  where id = p_session_id
    and block_id = v_block_id
    and session_number between 1 and 9
    and public.resolve_session_collection_mode(p_session_id) = 'disabled'
    and (
      work_track_access = 'open'
      or (
        work_track_access = 'session'
        and (
          status = 'open'
          or (
            status = 'scheduled'
            and starts_at <= now()
            and (ends_at is null or ends_at > now())
          )
        )
      )
    );

  if v_account.student_id is null or v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Work Track can only be updated while this Track is open';
  end if;

  if v_session.session_number between 1 and 5 then
    -- Early progress is not a percentage assessment. Whitelist stored fields;
    -- submitted late metrics or unsupported keys cannot fabricate a score.
    if exists (
      select 1 from unnest(array['responsibility','progress','nextAction']) field
      where jsonb_typeof(p_response -> field) is distinct from 'string'
        or coalesce(btrim(p_response ->> field), '') = ''
        or char_length(p_response ->> field) > 800
    ) or exists (
      select 1 from unnest(array['evidence','support']) field
      where p_response ? field and (
        jsonb_typeof(p_response -> field) is distinct from 'string'
        or char_length(p_response ->> field) > 800
      )
    ) then
      raise exception using errcode = 'P0001', message = 'Describe your responsibility, current progress and next action (up to 800 characters each)';
    end if;
    if p_response ? 'formVersion' then
      if coalesce(p_response ->> 'formVersion','') <> 'compact.v1'
         or jsonb_typeof(p_response -> 'workAreas') is distinct from 'array' then
        raise exception using errcode = 'P0001', message = 'Choose valid Work Track options';
      end if;
      if jsonb_array_length(p_response -> 'workAreas') not between 1 and 7
         or exists (select 1 from jsonb_array_elements(p_response -> 'workAreas') area
           where jsonb_typeof(area) <> 'string' or (area #>> '{}') not in
           ('Requirements','Design','Development','Integration','Testing','Documentation','Other'))
         or (select count(*) from jsonb_array_elements(p_response -> 'workAreas')) <>
            (select count(distinct area) from jsonb_array_elements(p_response -> 'workAreas') area)
         or coalesce(p_response ->> 'progressState','') not in
            ('Completed a task','Made progress','Tried but did not succeed','No progress')
         or coalesce(p_response ->> 'helpKind','') not in
            ('No help needed','Technical problem','Requirement unclear','Team coordination','Teacher guidance')
         or (p_response ? 'previousActionStatus' and coalesce(p_response ->> 'previousActionStatus','') not in
            ('Completed','Partly completed','Not completed','Plan changed'))
         or (p_response ? 'responsibilityCarriedForward' and jsonb_typeof(p_response -> 'responsibilityCarriedForward') is distinct from 'boolean')
         or (p_response ->> 'helpKind' <> 'No help needed' and coalesce(btrim(p_response ->> 'support'),'') = '') then
        raise exception using errcode = 'P0001', message = 'Choose valid Work Track options and describe any help needed';
      end if;
    end if;
    v_response := jsonb_build_object(
      'responsibility', btrim(p_response ->> 'responsibility'),
      'progress', btrim(p_response ->> 'progress'),
      'nextAction', btrim(p_response ->> 'nextAction'),
      'evidence', coalesce(btrim(p_response ->> 'evidence'), ''),
      'support', case when p_response ->> 'formVersion' = 'compact.v1'
        and p_response ->> 'helpKind' = 'No help needed' then ''
        else coalesce(btrim(p_response ->> 'support'), '') end
    );
    if p_response ->> 'formVersion' = 'compact.v1' then
      v_response := v_response || jsonb_strip_nulls(jsonb_build_object(
        'formVersion', 'compact.v1', 'workAreas', p_response -> 'workAreas',
        'progressState', p_response -> 'progressState', 'helpKind', p_response -> 'helpKind',
        'previousActionStatus', p_response -> 'previousActionStatus',
        'responsibilityCarriedForward', coalesce(p_response -> 'responsibilityCarriedForward','false'::jsonb)
      ));
    end if;
  else
  if jsonb_typeof(p_response -> 'requirements') is distinct from 'array' then
    raise exception using errcode = 'P0001', message = 'Add and assess the committed project requirements first';
  end if;

  select count(*),
         count(*) filter (
           where coalesce(btrim(requirement ->> 'label'), '') = ''
              or char_length(requirement ->> 'label') > 120
              or coalesce(requirement ->> 'score', '') not in ('0','25','50','75','100')
         ),
         round(avg(case when coalesce(requirement ->> 'score', '') in ('0','25','50','75','100') then (requirement ->> 'score')::numeric else null end))::integer
  into v_requirement_count, v_invalid_requirement_count, v_completion
  from jsonb_array_elements(p_response -> 'requirements') requirement;

  if v_requirement_count < 3 or v_requirement_count > 8 or v_invalid_requirement_count > 0 then
    raise exception using errcode = 'P0001', message = 'Assess the 3 core requirements and any optional requirements with the 0/25/50/75/100 standard';
  end if;

  if coalesce(p_response -> 'requirements' -> 0 ->> 'label', '') <> 'Core functionality meets the primary user needs'
     or coalesce(p_response -> 'requirements' -> 1 ->> 'label', '') <> 'Main workflow works end-to-end across integrated components'
     or coalesce(p_response -> 'requirements' -> 2 ->> 'label', '') <> 'Critical features are tested or validated with evidence' then
    raise exception using errcode = 'P0001', message = 'The 3 IT Milestone Project core requirements cannot be changed';
  end if;

  v_stage := case
    when v_completion <= 40 then 'Building'
    when v_completion <= 70 then 'Developing'
    when v_completion <= 90 then 'Completing'
    when v_completion < 100 then 'Finalising / Verifying'
    else 'Completed & Verified'
  end;
  v_path := case when v_completion <= 70 then 'building' when v_completion <= 90 then 'completing' else 'verifying' end;
  v_response := jsonb_set(
    jsonb_set(
      jsonb_set(p_response, '{completionPercent}', to_jsonb(v_completion), true),
      '{completionStage}', to_jsonb(v_stage), true
    ),
    '{progressPath}', to_jsonb(v_path), true
  );

  end if;

  insert into public.student_session_work_tracks (
    session_id, student_id, auth_user_id, block_id, response
  ) values (
    v_session.id, v_account.student_id, auth.uid(), v_block_id, v_response
  )
  on conflict (session_id, student_id) do update
    set response = excluded.response,
        updated_at = now(),
        teacher_verified_completion = null,
        teacher_verification_status = null,
        teacher_verification_reason = null,
        teacher_verified_at = null,
        teacher_verified_by = null
  returning * into v_track;

  return jsonb_build_object('updatedAt', v_track.updated_at, 'response', v_track.response);
end;
$$;

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
     or p_prompt_version not in ('session-intake-ai.v1.2.0','session-intake-ai.v1.3.0') then
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
    and public.resolve_session_collection_mode(session.id) = 'ai'
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
     or p_prompt_version <> 'session-intake-ai.v1.1.0' then
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

create or replace function public.save_my_session_intake_fallback(
  p_session_id uuid,
  p_source_conversation jsonb,
  p_student_record jsonb,
  p_student_confirmation jsonb
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
     or jsonb_array_length(p_source_conversation) not between 3 and 12
     or length(p_source_conversation::text) > 16000
     or exists (
       select 1 from jsonb_array_elements(p_source_conversation) turn
       where jsonb_typeof(turn) <> 'object'
          or coalesce(turn ->> 'actor','') not in ('student','system')
          or char_length(btrim(coalesce(turn ->> 'purpose',''))) not between 3 and 80
          or char_length(btrim(coalesce(turn ->> 'text',''))) not between 1 and 2000
     ) then
    raise exception using errcode = 'P0001', message = 'Fallback conversation is invalid';
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

  v_payload_hash := md5(
    'session-intake.v1.0.0' ||
    p_session_id::text ||
    auth.uid()::text ||
    p_source_conversation::text ||
    p_student_record::text ||
    p_student_confirmation::text
  );

  insert into public.student_session_intakes (
    session_id, block_id, student_id, auth_user_id,
    schema_version, source_mode, prompt_version, test_suite_version,
    source_conversation, student_record, ai_assistance,
    student_confirmation, confirmed_payload_hash
  ) values (
    v_session.id, v_session.block_id, v_account.student_id, auth.uid(),
    'session-intake.v1.0.0', 'deterministic_fallback', null,
    'ai-intake-suite.v1.0.0', p_source_conversation, p_student_record,
    '{"used":false,"follow_up_count":0,"question_purposes":[],"extraction_status":"not_used","uncertainties":[],"flags":[],"suggested_teacher_questions":[]}'::jsonb,
    p_student_confirmation, v_payload_hash
  )
  returning * into v_intake;

  return jsonb_build_object(
    'intakeId', v_intake.id,
    'schemaVersion', v_intake.schema_version,
    'sourceMode', v_intake.source_mode,
    'confirmedAt', v_intake.confirmed_at,
    'confirmedPayloadHash', v_intake.confirmed_payload_hash
  );
end;
$$;

create or replace function public.get_my_session_journey()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_block_id uuid;
  v_result jsonb;
begin
  select * into v_account from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';
  if v_account.student_id is null then return '[]'::jsonb; end if;

  select roster.block_id into v_block_id
  from public.student_roster roster join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc limit 1;
  if v_block_id is null then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'sessionId', session.id,
    'sessionNumber', session.session_number,
    'weekNumber', session.week_number,
    'focus', coalesce(session.curriculum_focus, session.title),
    'title', session.title,
    'sessionDate', session.session_date,
    'startsAt', session.starts_at,
    'endsAt', session.ends_at,
    'status', case
      when session.status = 'open' then 'open'
      when session.status = 'closed' then 'closed'
      when session.starts_at is not null and session.starts_at <= now() and (session.ends_at is null or session.ends_at > now()) then 'open'
      when session.ends_at is not null and session.ends_at <= now() then 'closed'
      else 'scheduled' end,
    'checkedInAt', checkin.checked_in_at,
    'collectionMode', public.resolve_session_collection_mode(session.id),
    'intakeConfirmedAt', (select confirmed_at from public.student_session_intakes where session_id=session.id and auth_user_id=auth.uid()),
    'intakeStatus', case
      when session.session_number not between 1 and 9 then null
      when public.resolve_session_collection_mode(session.id)='disabled' then 'closed'
      when session.intake_access='open' then 'open'
      when session.intake_access='closed' then 'closed'
      when session.status='open' or (session.status='scheduled' and session.starts_at<=now() and (session.ends_at is null or session.ends_at>now())) then 'open'
      else 'closed' end,
    'workTrackUpdatedAt', track.updated_at,
    'workTrackStatus', case
      when session.session_number not between 1 and 9 then null
      when public.resolve_session_collection_mode(session.id) <> 'disabled' then 'closed'
      when session.work_track_access = 'open' then 'open'
      when session.work_track_access = 'closed' then 'closed'
      when session.status = 'closed' or (session.ends_at is not null and session.ends_at <= now()) then 'closed'
      when session.status = 'open'
        or (
          session.status = 'scheduled'
          and session.starts_at <= now()
          and (session.ends_at is null or session.ends_at > now())
        ) then 'open'
      else 'scheduled'
    end,
    'platformFeedbackCompletedAt', feedback.submitted_at
  ) order by session.session_number nulls last, session.session_date, session.created_at), '[]'::jsonb)
  into v_result
  from public.studio_sessions session
  left join public.student_session_checkins checkin
    on checkin.session_id = session.id and checkin.auth_user_id = auth.uid()
  left join public.student_session_work_tracks track
    on track.session_id = session.id and track.auth_user_id = auth.uid()
  left join public.student_platform_feedback feedback
    on feedback.session_id = session.id and feedback.auth_user_id = auth.uid()
  where session.block_id = v_block_id;

  return v_result;
end;
$$;

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
revoke all on function public.get_my_session_work_track(uuid) from public,anon;
grant execute on function public.get_my_session_work_track(uuid) to authenticated;
revoke all on function public.save_my_session_work_track(uuid,jsonb) from public,anon;
grant execute on function public.save_my_session_work_track(uuid,jsonb) to authenticated;
revoke all on function public.get_my_session_journey() from public,anon;
grant execute on function public.get_my_session_journey() to authenticated;
revoke all on function public.get_my_session_intake(uuid) from public,anon;
grant execute on function public.get_my_session_intake(uuid) to authenticated;
revoke all on function public.save_my_session_intake_chat(uuid,jsonb,jsonb,jsonb,text,jsonb) from public,anon;
grant execute on function public.save_my_session_intake_chat(uuid,jsonb,jsonb,jsonb,text,jsonb) to authenticated;
revoke all on function public.save_my_session_intake_ai(uuid,jsonb,jsonb,jsonb,text,jsonb) from public,anon;
grant execute on function public.save_my_session_intake_ai(uuid,jsonb,jsonb,jsonb,text,jsonb) to authenticated;
revoke all on function public.save_my_session_intake_fallback(uuid,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.save_my_session_intake_fallback(uuid,jsonb,jsonb,jsonb) to authenticated;

-- No transcripts, prompts, keys or provider responses are stored in the usage ledger.
create table if not exists public.session_intake_ai_usage (
 id uuid primary key default gen_random_uuid(), block_id uuid not null references public.teaching_blocks(id),
 session_id uuid not null references public.studio_sessions(id), auth_user_id uuid not null references auth.users(id),
 student_id text not null, request_id uuid not null, attempt integer not null check(attempt between 0 and 1),
 provider text not null, model text not null, pricing_version text not null,
 input_ceiling bigint not null, output_ceiling bigint not null,
 input_rate numeric not null, output_rate numeric not null,
 reserved_usd numeric(14,8) not null, charged_usd numeric(14,8) not null,
 observed_usd numeric(14,8), input_tokens bigint, output_tokens bigint,
 status text not null default 'reserved' check(status in ('reserved','settled','uncertain')),
 reconciliation_required boolean not null default false, created_at timestamptz not null default now(),
 unique(auth_user_id,request_id,attempt)
);
create index if not exists session_intake_ai_usage_block on public.session_intake_ai_usage(block_id);
create index if not exists session_intake_ai_usage_student_session on public.session_intake_ai_usage(auth_user_id,session_id);
alter table public.session_intake_ai_usage enable row level security;
revoke all on public.session_intake_ai_usage from public,anon,authenticated;
grant all on public.session_intake_ai_usage to service_role;

create or replace function public.reserve_session_intake_ai_attempt(
 p_auth_user_id uuid,p_session_id uuid,p_request_id uuid,p_attempt integer,
 p_provider text,p_model text,p_pricing_version text,p_input_ceiling bigint,p_output_ceiling bigint,
 p_input_rate numeric,p_output_rate numeric
) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.studio_sessions%rowtype; b public.teaching_blocks%rowtype;
 a public.student_accounts%rowtype; v_cost numeric; v_used numeric; v_id uuid; v_active uuid;
begin
 if p_attempt not between 0 and 1 or p_request_id is null or p_model is null or p_pricing_version is null
 or p_provider not in ('openai','deepseek') or p_input_ceiling not between 1 and 1000000
 or p_output_ceiling not between 1 and 20000 or p_input_rate is null or p_output_rate is null
 or p_input_rate<0 or p_output_rate<0 or p_input_rate+p_output_rate<=0
 or p_input_rate>1000 or p_output_rate>1000 then raise exception 'Usage configuration invalid'; end if;
 select * into a from public.student_accounts where auth_user_id=p_auth_user_id and status='activated';
 select r.block_id into v_active from public.student_roster r join public.teaching_blocks tb on tb.id=r.block_id
 where r.student_id=a.student_id and tb.status='active' order by tb.starts_on desc nulls last,tb.created_at desc limit 1;
 select * into s from public.studio_sessions where id=p_session_id and block_id=v_active and session_number between 1 and 9;
 if a.student_id is null or s.id is null then raise exception 'Session AI access denied'; end if;
 -- Block lock serializes all reservations and budget edits, including concurrent students.
 select * into b from public.teaching_blocks where id=s.block_id for update;
 perform pg_advisory_xact_lock(hashtextextended(p_auth_user_id::text||':'||s.id::text,0));
 if public.resolve_session_collection_mode(s.id)<>'ai'
 or not coalesce((s.intake_access='open' or (s.intake_access='session' and (s.status='open' or (s.status='scheduled' and s.starts_at<=now() and (s.ends_at is null or s.ends_at>now()))))),false) then
 raise exception 'Session AI is not open'; end if;
 if exists(select 1 from public.student_session_intakes where session_id=s.id and auth_user_id=p_auth_user_id)
 or exists(select 1 from public.student_session_work_tracks where session_id=s.id and auth_user_id=p_auth_user_id) then
 raise exception 'Progress already recorded'; end if;
 if b.intake_ai_budget_usd<=0 or b.intake_ai_attempt_limit<=0 then raise exception 'AI trial budget not configured'; end if;
 if exists(select 1 from public.session_intake_ai_usage where block_id=b.id and reconciliation_required) then raise exception 'AI usage needs reconciliation'; end if;
 if exists(select 1 from public.session_intake_ai_usage where auth_user_id=p_auth_user_id and request_id=p_request_id and attempt=p_attempt) then
 raise exception 'AI request already reserved'; end if;
 if (select count(*) from public.session_intake_ai_usage where auth_user_id=p_auth_user_id and session_id=s.id)>=b.intake_ai_attempt_limit then
 raise exception 'Session AI attempt limit reached'; end if;
 v_cost:=ceil((p_input_ceiling*p_input_rate+p_output_ceiling*p_output_rate)/1000000*100000000)/100000000;
 select coalesce(sum(charged_usd),0) into v_used from public.session_intake_ai_usage where block_id=b.id;
 if v_used+v_cost>b.intake_ai_budget_usd then raise exception 'Block AI budget reached'; end if;
 insert into public.session_intake_ai_usage(block_id,session_id,auth_user_id,student_id,request_id,attempt,provider,model,pricing_version,input_ceiling,output_ceiling,input_rate,output_rate,reserved_usd,charged_usd)
 values(b.id,s.id,p_auth_user_id,a.student_id,p_request_id,p_attempt,p_provider,p_model,p_pricing_version,p_input_ceiling,p_output_ceiling,p_input_rate,p_output_rate,v_cost,v_cost) returning id into v_id;
 return jsonb_build_object('attemptId',v_id,'reservedUsd',v_cost,'pricingVersion',p_pricing_version);
end; $$;
revoke all on function public.reserve_session_intake_ai_attempt(uuid,uuid,uuid,integer,text,text,text,bigint,bigint,numeric,numeric) from public,anon,authenticated;
grant execute on function public.reserve_session_intake_ai_attempt(uuid,uuid,uuid,integer,text,text,text,bigint,bigint,numeric,numeric) to service_role;

create or replace function public.finish_session_intake_ai_attempt(p_attempt_id uuid,p_input_tokens bigint,p_output_tokens bigint,p_reported_model text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.session_intake_ai_usage%rowtype; v_cost numeric; v_known boolean; v_alert boolean;
begin
 select * into a from public.session_intake_ai_usage where id=p_attempt_id for update;
 if a.id is null then raise exception 'Unknown AI reservation'; end if;
 if a.status<>'reserved' then return jsonb_build_object('costUsd',a.observed_usd,'chargedUsd',a.charged_usd,'status',a.status); end if;
 v_alert:=p_reported_model is not null and p_reported_model<>a.model;
 v_known:=p_input_tokens is not null and p_output_tokens is not null and p_input_tokens>=0 and p_output_tokens>=0
 and p_input_tokens<=a.input_ceiling and p_output_tokens<=a.output_ceiling and not v_alert and p_reported_model=a.model;
 if p_input_tokens>a.input_ceiling or p_output_tokens>a.output_ceiling then v_alert:=true; end if;
 v_cost:=case when v_known then ceil((p_input_tokens*a.input_rate+p_output_tokens*a.output_rate)/1000000*100000000)/100000000 else null end;
 update public.session_intake_ai_usage set input_tokens=p_input_tokens,output_tokens=p_output_tokens,
 observed_usd=v_cost,charged_usd=coalesce(v_cost,reserved_usd),status=case when v_known then 'settled' else 'uncertain' end,
 reconciliation_required=v_alert where id=a.id;
 return jsonb_build_object('costUsd',v_cost,'chargedUsd',coalesce(v_cost,a.reserved_usd),'status',case when v_known then 'settled' else 'uncertain' end,'reconciliationRequired',v_alert);
end; $$;
revoke all on function public.finish_session_intake_ai_attempt(uuid,bigint,bigint,text) from public,anon,authenticated;
grant execute on function public.finish_session_intake_ai_attempt(uuid,bigint,bigint,text) to service_role;

create or replace function public.get_teacher_session_ai_usage(p_block_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare b public.teaching_blocks%rowtype; v_summary jsonb;
begin
 if not public.is_teacher() then raise exception 'Teacher access required'; end if;
 select * into b from public.teaching_blocks where id=p_block_id;
 if b.id is null then raise exception 'Unknown Block'; end if;
 select jsonb_build_object('attempts',count(*),'reportedUsd',coalesce(sum(observed_usd),0),
 'chargedUsd',coalesce(sum(charged_usd),0),'unresolvedAttempts',count(*) filter(where status<>'settled'),
 'reconciliationRequired',coalesce(bool_or(reconciliation_required),false)) into v_summary
 from public.session_intake_ai_usage where block_id=b.id;
 return v_summary||jsonb_build_object('budgetUsd',b.intake_ai_budget_usd,'attemptLimit',b.intake_ai_attempt_limit);
end; $$;
revoke all on function public.get_teacher_session_ai_usage(uuid) from public,anon;
grant execute on function public.get_teacher_session_ai_usage(uuid) to authenticated;
commit;
