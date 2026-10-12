-- Sprint 9 R02: minimum secure teacher Intake read workflow.
--
-- Purpose: let an authenticated teacher read, for a selected Session, the full
-- roster with each student's confirmed Session Intake (or an explicit "missing"
-- marker), so submitted/missing can be counted and a confirmed record and its
-- sources inspected. Student claims stay distinct from teacher verification.
--
-- This migration is ADDITIVE and read-only in effect:
--   * it creates ONE new function, public.get_teacher_session_intakes(uuid);
--   * it does not create/alter tables, columns, policies, blocks, sessions or
--     rows, and it does not call any AI provider;
--   * no existing function is modified.
--
-- Access-pattern decision
-- ------------------------
-- The RLS policy "teachers read session intakes" already lets a teacher SELECT
-- rows in public.student_session_intakes. That policy alone cannot produce the
-- MISSING entries this workflow needs (a student with no row), because RLS can
-- only filter rows that exist. Surfacing "missing" requires the roster as the
-- list base, left-joined to intakes. public.student_roster is not exposed to the
-- authenticated role for arbitrary selection, so a SECURITY DEFINER function
-- with an explicit is_teacher() gate is the narrowest pattern that:
--   * reuses the exact convention of public.get_teacher_session_work_tracks;
--   * keeps roster read access inside one audited, teacher-only function;
--   * returns only the fields this teacher workflow needs.
-- The function is read-only: it performs SELECT only and writes nothing.

begin;

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

-- 5. Least-privilege execution. No PUBLIC/anon execution; only authenticated.
--    The is_teacher() gate inside the function restricts the effective caller to
--    teachers even though EXECUTE is granted to the authenticated role (the same
--    pattern as get_teacher_session_work_tracks).
revoke all on function public.get_teacher_session_intakes(uuid) from public;
revoke all on function public.get_teacher_session_intakes(uuid) from anon;
grant execute on function public.get_teacher_session_intakes(uuid) to authenticated;

commit;

-- Verification (run read-only after apply; see
-- supabase/scripts/sprint9_r02_teacher_intake_read_audit.sql):
-- 1. Function is SECURITY DEFINER with proconfig search_path=''.
-- 2. EXECUTE is granted to authenticated only; not to public or anon.
-- 3. A non-teacher authenticated caller receives 'Teacher access required'.
-- 4. Roster completion is reported separately from off-roster history:
--    rosterSize = rosterSubmittedCount + missingCount; offRosterCount is counted
--    on its own and never added into rosterSubmittedCount. submittedCount is a
--    display-only grand total (rosterSubmittedCount + offRosterCount).
-- 5. A roster student with no Intake appears with submitted=false and null
--    studentRecord.
-- 6. A confirmed Intake from another Block or another Session never attaches to
--    this Session's rows.
-- 7. A confirmed Intake whose student left the roster still appears with
--    onRoster=false and is not dropped.
-- 8. testing[].baseline_or_expected is present verbatim inside studentRecord.
-- 9. teacherVerification is always {status:'unset', recorded:false}; this table
--    has no writable teacher-judgement field.
--
-- Rollback: drop function public.get_teacher_session_intakes(uuid);
-- No table/policy/row changes to reverse.
