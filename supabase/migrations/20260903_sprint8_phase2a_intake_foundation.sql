-- Sprint 8 Phase 2A: AI Session Intake data and deterministic fallback foundation.
-- This migration does not create a test block, enable Intake on an existing
-- session, call an AI provider or modify historical activity records.

-- NIT3004 uses 2B2 as an isolated mock-pilot block. Existing block rows are
-- unaffected; the teacher creates the block explicitly through the dashboard.
alter table public.teaching_blocks
  drop constraint if exists teaching_blocks_block_code_check;
alter table public.teaching_blocks
  add constraint teaching_blocks_block_code_check
  check (block_code in ('1B1','1B4','2B1','2B2','2B4')) not valid;
alter table public.teaching_blocks
  validate constraint teaching_blocks_block_code_check;

-- Intake is opt-in per Session. Existing and newly prepared Sessions remain
-- closed until a teacher explicitly enables the pilot in a later UI or SQL step.
alter table public.studio_sessions
  add column if not exists intake_access text not null default 'closed';

alter table public.studio_sessions
  drop constraint if exists studio_sessions_intake_access_check;
alter table public.studio_sessions
  add constraint studio_sessions_intake_access_check
  check (intake_access in ('closed','session','open')) not valid;
alter table public.studio_sessions
  validate constraint studio_sessions_intake_access_check;

create table if not exists public.student_session_intakes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.studio_sessions(id) on delete restrict,
  block_id uuid not null references public.teaching_blocks(id) on delete restrict,
  student_id text not null references public.student_accounts(student_id) on delete restrict,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  schema_version text not null
    check (schema_version = 'session-intake.v1.0.0'),
  source_mode text not null
    check (source_mode in ('deterministic_fallback','ai_assisted')),
  prompt_version text,
  test_suite_version text not null default 'ai-intake-suite.v1.0.0',
  source_conversation jsonb not null
    check (jsonb_typeof(source_conversation) = 'array'),
  student_record jsonb not null
    check (jsonb_typeof(student_record) = 'object'),
  ai_assistance jsonb not null default '{"used":false}'::jsonb
    check (jsonb_typeof(ai_assistance) = 'object'),
  student_confirmation jsonb not null
    check (jsonb_typeof(student_confirmation) = 'object'),
  confirmed_payload_hash text not null,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (session_id, student_id),
  unique (session_id, auth_user_id)
);

create index if not exists student_session_intakes_block_session_idx
  on public.student_session_intakes (block_id, session_id);
create index if not exists student_session_intakes_student_history_idx
  on public.student_session_intakes (block_id, student_id, confirmed_at desc);

alter table public.student_session_intakes enable row level security;
revoke all on public.student_session_intakes from anon, authenticated;
grant select on public.student_session_intakes to authenticated;

drop policy if exists "students read own session intakes" on public.student_session_intakes;
create policy "students read own session intakes"
on public.student_session_intakes for select to authenticated
using (auth_user_id = auth.uid());

drop policy if exists "teachers read session intakes" on public.student_session_intakes;
create policy "teachers read session intakes"
on public.student_session_intakes for select to authenticated
using (public.is_teacher());

-- Returns validation messages. An empty array means the confirmed student
-- record satisfies session-intake.v1.0.0. Teacher fields are not accepted.
create or replace function public.validate_session_intake_student_record(p_record jsonb)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_errors text[] := array[]::text[];
  v_claim jsonb;
  v_evidence jsonb;
  v_test jsonb;
  v_claim_ids text[];
  v_allowed_keys text[] := array['responsibility','claims','evidence','testing','dependencies','blocker','next_action'];
begin
  if p_record is null or jsonb_typeof(p_record) <> 'object' then
    return array['student_record must be an object'];
  end if;

  if exists (
    select 1 from jsonb_object_keys(p_record) key
    where not (key = any(v_allowed_keys))
  ) then
    v_errors := array_append(v_errors, 'student_record contains unsupported fields');
  end if;

  if jsonb_typeof(p_record -> 'responsibility') is distinct from 'object'
     or char_length(btrim(coalesce(p_record #>> '{responsibility,current}', ''))) not between 3 and 500 then
    v_errors := array_append(v_errors, 'current responsibility must be 3 to 500 characters');
  end if;

  if coalesce(p_record #>> '{responsibility,change_from_previous}', '') not in
     ('initial','unchanged','refined','changed','unknown') then
    v_errors := array_append(v_errors, 'responsibility change state is invalid');
  end if;

  if jsonb_typeof(p_record -> 'claims') is distinct from 'array'
     or jsonb_array_length(coalesce(p_record -> 'claims', '[]'::jsonb)) not between 1 and 5 then
    v_errors := array_append(v_errors, 'one to five claims are required');
  else
    select array_agg(item ->> 'claim_id')
    into v_claim_ids
    from jsonb_array_elements(p_record -> 'claims') item;

    if exists (
      select 1
      from jsonb_array_elements(p_record -> 'claims') item
      where coalesce(item ->> 'claim_id','') !~ '^C[1-5]$'
         or char_length(btrim(coalesce(item ->> 'statement',''))) not between 3 and 1000
         or coalesce(item ->> 'progress_kind','') not in
            ('completed','advanced','investigated','attempted_failed','no_progress')
         or char_length(btrim(coalesce(item ->> 'scope',''))) not between 3 and 500
         or (
           item ? 'completion_percent'
           and item -> 'completion_percent' <> 'null'::jsonb
           and (
             jsonb_typeof(item -> 'completion_percent') <> 'number'
             or (item ->> 'completion_percent')::numeric not between 0 and 100
           )
         )
    ) then
      v_errors := array_append(v_errors, 'one or more claims are invalid');
    end if;

    if cardinality(v_claim_ids) <> cardinality(array(select distinct unnest(v_claim_ids))) then
      v_errors := array_append(v_errors, 'claim identifiers must be unique');
    end if;
  end if;

  if jsonb_typeof(p_record -> 'evidence') is distinct from 'array'
     or jsonb_array_length(coalesce(p_record -> 'evidence', '[]'::jsonb)) < 1
     or jsonb_array_length(coalesce(p_record -> 'evidence', '[]'::jsonb)) > 10 then
    v_errors := array_append(v_errors, 'one to ten evidence states are required');
  else
    for v_evidence in select value from jsonb_array_elements(p_record -> 'evidence')
    loop
      if coalesce(v_evidence ->> 'evidence_id','') !~ '^E([1-9]|10)$'
         or jsonb_typeof(v_evidence -> 'claim_ids') is distinct from 'array'
         or jsonb_array_length(coalesce(v_evidence -> 'claim_ids','[]'::jsonb)) < 1
         or coalesce(v_evidence ->> 'type','') not in (
           'repository_change','deployed_feature','live_demonstration','test_result',
           'experiment_result','data_analysis','design_artifact','documentation',
           'meeting_or_decision_record','external_system_record','other'
         )
         or coalesce(v_evidence ->> 'availability','') not in
           ('available_now','expected_later','not_produced','not_required','unknown')
      then
        v_errors := array_append(v_errors, 'one or more evidence entries are invalid');
        exit;
      end if;

      if exists (
        select 1 from jsonb_array_elements_text(v_evidence -> 'claim_ids') claim_id
        where not (claim_id = any(coalesce(v_claim_ids,array[]::text[])))
      ) then
        v_errors := array_append(v_errors, 'evidence references an unknown claim');
      end if;

      if v_evidence ->> 'availability' = 'available_now'
         and (
           char_length(btrim(coalesce(v_evidence ->> 'reference',''))) not between 3 and 1000
           or char_length(btrim(coalesce(v_evidence ->> 'verification_method',''))) not between 3 and 1000
         ) then
        v_errors := array_append(v_errors, 'available evidence needs a reference and verification method');
      end if;

      if v_evidence ->> 'availability' = 'expected_later'
         and char_length(btrim(coalesce(v_evidence ->> 'verification_method',''))) not between 3 and 1000 then
        v_errors := array_append(v_errors, 'expected evidence needs a verification method');
      end if;

      if v_evidence ->> 'availability' = 'not_required'
         and char_length(btrim(coalesce(v_evidence ->> 'not_required_reason',''))) not between 3 and 500 then
        v_errors := array_append(v_errors, 'not-required evidence needs a reason');
      end if;
    end loop;
  end if;

  if jsonb_typeof(p_record -> 'testing') is distinct from 'array'
     or jsonb_array_length(coalesce(p_record -> 'testing','[]'::jsonb)) > 10 then
    v_errors := array_append(v_errors, 'testing must be an array of at most ten entries');
  else
    for v_test in select value from jsonb_array_elements(p_record -> 'testing')
    loop
      if coalesce(v_test ->> 'execution_status','') not in
         ('executed','planned_not_executed','not_applicable') then
        v_errors := array_append(v_errors, 'testing execution status is invalid');
        exit;
      end if;
      if v_test ->> 'execution_status' = 'executed'
         and (
           char_length(btrim(coalesce(v_test ->> 'method',''))) not between 3 and 1000
           or char_length(btrim(coalesce(v_test ->> 'observed_result',''))) not between 1 and 1000
         ) then
        v_errors := array_append(v_errors, 'executed testing needs method and observed result');
      end if;
      if v_test ->> 'execution_status' = 'planned_not_executed'
         and coalesce(v_test ->> 'observed_result','') <> '' then
        v_errors := array_append(v_errors, 'planned testing cannot contain an observed result');
      end if;
    end loop;
  end if;

  if jsonb_typeof(p_record -> 'dependencies') is distinct from 'array'
     or jsonb_array_length(coalesce(p_record -> 'dependencies','[]'::jsonb)) > 10 then
    v_errors := array_append(v_errors, 'dependencies must be an array of at most ten entries');
  end if;

  if jsonb_typeof(p_record -> 'blocker') is distinct from 'object'
     or coalesce(p_record #>> '{blocker,status}','') not in ('none','active','resolved','unknown') then
    v_errors := array_append(v_errors, 'blocker state is invalid');
  end if;

  if coalesce(p_record #>> '{blocker,status}','') in ('active','resolved')
     and char_length(btrim(coalesce(p_record #>> '{blocker,description}',''))) not between 3 and 1000 then
    v_errors := array_append(v_errors, 'active or resolved blocker needs a description');
  end if;

  if jsonb_typeof(p_record -> 'next_action') is distinct from 'object'
     or char_length(btrim(coalesce(p_record #>> '{next_action,action}',''))) not between 3 and 1000
     or coalesce(p_record #>> '{next_action,due_session}','') !~ '^S([1-9]|10)$'
     or char_length(btrim(coalesce(p_record #>> '{next_action,expected_evidence}',''))) not between 3 and 1000 then
    v_errors := array_append(v_errors, 'next action, due Session and expected evidence are required');
  end if;

  return v_errors;
exception
  when others then
    return array['student_record contains invalid value types'];
end;
$$;

revoke all on function public.validate_session_intake_student_record(jsonb) from public;
revoke all on function public.validate_session_intake_student_record(jsonb) from anon, authenticated;

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
    'isOpen', (
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
    ),
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

revoke all on function public.get_my_session_intake(uuid) from public;
revoke all on function public.get_my_session_intake(uuid) from anon;
grant execute on function public.get_my_session_intake(uuid) to authenticated;

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

revoke all on function public.save_my_session_intake_fallback(uuid,jsonb,jsonb,jsonb) from public;
revoke all on function public.save_my_session_intake_fallback(uuid,jsonb,jsonb,jsonb) from anon;
grant execute on function public.save_my_session_intake_fallback(uuid,jsonb,jsonb,jsonb) to authenticated;

-- Verification:
-- 1. Existing block rows, activity records and Session state remain unchanged.
-- 2. 2026 · 2B2 can be created explicitly; duplicate year/block remains rejected.
-- 3. Existing Sessions have intake_access = closed.
-- 4. anon and authenticated students cannot INSERT/UPDATE/DELETE Intake rows directly.
-- 5. Students can SELECT only their own Intake; teachers can SELECT all authorised rows.
-- 6. Fallback save derives student/block/session identity and rejects a cross-Block session.
-- 7. One confirmed Intake is allowed per student per Session.
-- 8. Teacher verification, Teacher Action and marks have no writable field in this table.
-- 9. Invalid Evidence combinations are rejected before persistence.
-- 10. Provider-independent fallback can submit without prompt/model data.
