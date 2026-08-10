-- Hotfix: align the live teacher_progress_reviews table with the current
-- Week 2 Teacher Review UI, then save through an authoritative teacher-only RPC.
--
-- Some databases contain legacy columns (claim_status, follow_up_priority,
-- teacher_note) because an older table pre-dated the repository migration.
-- Keep those columns for backwards compatibility, but stop requiring them for
-- current writes. Existing legacy rows are mapped before current constraints
-- are enforced. This script is idempotent and does not delete review records.

alter table public.teacher_progress_reviews
  add column if not exists block_id uuid references public.teaching_blocks(id),
  add column if not exists claim_status text,
  add column if not exists review_outcome text,
  add column if not exists demonstration_outcome text,
  add column if not exists method_explanation text,
  add column if not exists evidence_quality text,
  add column if not exists contribution_verification text,
  add column if not exists report_alignment text,
  add column if not exists teacher_feedback text,
  add column if not exists follow_up_priority text,
  add column if not exists follow_up_status text,
  add column if not exists follow_up_actions text[] default array[]::text[],
  add column if not exists teacher_note text,
  add column if not exists follow_up_note text,
  add column if not exists recheck_week smallint,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- Legacy-only fields must not be mandatory for the current review model.
alter table public.teacher_progress_reviews
  alter column claim_status drop not null,
  alter column follow_up_priority drop not null;

-- Migrate any legacy rows without overwriting current review data.
update public.teacher_progress_reviews
set
  review_outcome = coalesce(
    review_outcome,
    case claim_status
      when 'Verified' then 'Verified'
      when 'Partially verified' then 'Partially verified'
      when 'Not demonstrated' then 'Unable to demonstrate'
      when 'Different from pre-check' then 'Further evidence required'
    end
  ),
  teacher_feedback = coalesce(
    teacher_feedback,
    nullif(trim(teacher_note), ''),
    'Migrated from legacy teacher review.'
  ),
  follow_up_status = coalesce(
    follow_up_status,
    case
      when follow_up_priority = 'No follow-up' then 'No follow-up needed'
      when follow_up_priority is not null then 'Action required'
      else 'Not reviewed'
    end
  ),
  follow_up_actions = case
    when coalesce(cardinality(follow_up_actions), 0) > 0 then follow_up_actions
    when follow_up_priority = 'No follow-up' then array['No action required']::text[]
    when follow_up_priority = 'Implementation' then array['Complete implementation']::text[]
    when follow_up_priority = 'Integration' then array['Complete integration']::text[]
    when follow_up_priority = 'Testing' then array['Add or run tests']::text[]
    when follow_up_priority = 'Evidence' then array['Provide code or commit evidence']::text[]
    when follow_up_priority = 'Documentation' then array['Update Progress Report']::text[]
    when follow_up_priority = 'Team contribution' then array['Clarify individual contribution']::text[]
    when follow_up_priority = 'Urgent intervention' then array['Other']::text[]
    else array['Other']::text[]
  end;

-- Replace only the current-model constraints so reruns converge to one schema.
alter table public.teacher_progress_reviews
  drop constraint if exists teacher_progress_reviews_review_outcome_check,
  drop constraint if exists teacher_progress_reviews_demonstration_outcome_check,
  drop constraint if exists teacher_progress_reviews_method_explanation_check,
  drop constraint if exists teacher_progress_reviews_evidence_quality_check,
  drop constraint if exists teacher_progress_reviews_contribution_verification_check,
  drop constraint if exists teacher_progress_reviews_report_alignment_check,
  drop constraint if exists teacher_progress_reviews_teacher_feedback_check,
  drop constraint if exists teacher_progress_reviews_follow_up_status_check,
  drop constraint if exists teacher_progress_reviews_follow_up_actions_check,
  drop constraint if exists teacher_progress_reviews_follow_up_note_check,
  drop constraint if exists teacher_progress_reviews_recheck_week_check;

alter table public.teacher_progress_reviews
  alter column review_outcome set not null,
  alter column demonstration_outcome set not null,
  alter column method_explanation set not null,
  alter column evidence_quality set not null,
  alter column contribution_verification set not null,
  alter column report_alignment set not null,
  alter column teacher_feedback set not null,
  alter column follow_up_status set not null,
  alter column follow_up_actions set default array[]::text[],
  alter column follow_up_actions set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null,
  add constraint teacher_progress_reviews_review_outcome_check
    check (review_outcome in ('Verified','Partially verified','Not verified','Unable to demonstrate','Further evidence required')),
  add constraint teacher_progress_reviews_demonstration_outcome_check
    check (demonstration_outcome in ('Worked on target system','Worked with limitations','Partial demonstration','Could not demonstrate','Not applicable')),
  add constraint teacher_progress_reviews_method_explanation_check
    check (method_explanation in ('Clear and credible','Mostly clear','Limited explanation','Could not explain')),
  add constraint teacher_progress_reviews_evidence_quality_check
    check (evidence_quality in ('Strong and traceable','Adequate','Partial','No usable evidence')),
  add constraint teacher_progress_reviews_contribution_verification_check
    check (contribution_verification in ('Clearly verified','Partly verified','Needs further evidence','Not verified')),
  add constraint teacher_progress_reviews_report_alignment_check
    check (report_alignment in ('Consistent','Minor update needed','Significant update needed','Not checked')),
  add constraint teacher_progress_reviews_teacher_feedback_check
    check (char_length(teacher_feedback) between 1 and 800),
  add constraint teacher_progress_reviews_follow_up_status_check
    check (follow_up_status in ('Not reviewed','No follow-up needed','Action required','In progress','Recheck next session','Resolved')),
  add constraint teacher_progress_reviews_follow_up_actions_check
    check (
      cardinality(follow_up_actions) between 1 and 10
      and follow_up_actions <@ array[
        'No action required','Complete implementation','Fix identified issue',
        'Provide code or commit evidence','Add or run tests','Complete integration',
        'Update Progress Report','Clarify individual contribution',
        'Prepare another demonstration','Other'
      ]::text[]
    ),
  add constraint teacher_progress_reviews_follow_up_note_check
    check (follow_up_note is null or char_length(follow_up_note) <= 400),
  add constraint teacher_progress_reviews_recheck_week_check
    check (recheck_week is null or recheck_week between 2 and 4);

create unique index if not exists teacher_progress_reviews_block_student_key
  on public.teacher_progress_reviews (block_id, student_id);

create or replace function public.save_teacher_progress_review(
  p_submission_id uuid,
  p_review jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_submission public.week2_progress_reviews%rowtype;
  v_saved public.teacher_progress_reviews%rowtype;
  v_actions text[];
  v_recheck_week smallint;
begin
  if auth.uid() is null or not coalesce(public.is_teacher(), false) then
    raise exception using errcode = '42501',
      message = 'Your teacher session is not authorised to save this review. Sign in again and retry.';
  end if;

  select submission.* into v_submission
  from public.week2_progress_reviews submission
  where submission.id = p_submission_id;

  if not found then
    raise exception using errcode = 'P0002',
      message = 'The selected Week 2 Pre-check submission was not found. Refresh the dashboard and retry.';
  end if;

  if v_submission.block_id is null then
    raise exception using errcode = '23514',
      message = 'This Pre-check is not linked to a teaching block. Ask the administrator to repair the submission.';
  end if;

  if nullif(trim(coalesce(v_submission.student_name, '')), '') is null
     or nullif(trim(coalesce(v_submission.student_id, '')), '') is null
     or nullif(trim(coalesce(v_submission.team_name, '')), '') is null then
    raise exception using errcode = '23514',
      message = 'This Pre-check has incomplete student or team identity. Refresh the roster link before saving a review.';
  end if;

  if jsonb_typeof(coalesce(p_review -> 'follow_up_actions', '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'Follow-up actions are invalid.';
  end if;

  select coalesce(array_agg(action), array[]::text[])
  into v_actions
  from jsonb_array_elements_text(coalesce(p_review -> 'follow_up_actions', '[]'::jsonb)) action;

  if cardinality(v_actions) < 1 then
    raise exception using errcode = '22023', message = 'Select at least one follow-up action.';
  end if;

  if nullif(trim(coalesce(p_review ->> 'teacher_feedback', '')), '') is null then
    raise exception using errcode = '22023', message = 'Add a Conversation note before saving.';
  end if;

  if char_length(trim(p_review ->> 'teacher_feedback')) > 800 then
    raise exception using errcode = '22023', message = 'Conversation note must be 800 characters or fewer.';
  end if;

  v_recheck_week := nullif(p_review ->> 'recheck_week', '')::smallint;

  insert into public.teacher_progress_reviews (
    block_id, student_name, student_id, team_name, review_outcome,
    demonstration_outcome, method_explanation, evidence_quality,
    contribution_verification, report_alignment, teacher_feedback,
    follow_up_status, follow_up_actions, follow_up_note, recheck_week
  ) values (
    v_submission.block_id, trim(v_submission.student_name),
    trim(v_submission.student_id), trim(v_submission.team_name),
    p_review ->> 'review_outcome', p_review ->> 'demonstration_outcome',
    p_review ->> 'method_explanation', p_review ->> 'evidence_quality',
    p_review ->> 'contribution_verification', p_review ->> 'report_alignment',
    trim(p_review ->> 'teacher_feedback'), p_review ->> 'follow_up_status',
    v_actions, nullif(trim(coalesce(p_review ->> 'follow_up_note', '')), ''),
    v_recheck_week
  )
  on conflict (block_id, student_id) do update set
    student_name = excluded.student_name,
    team_name = excluded.team_name,
    review_outcome = excluded.review_outcome,
    demonstration_outcome = excluded.demonstration_outcome,
    method_explanation = excluded.method_explanation,
    evidence_quality = excluded.evidence_quality,
    contribution_verification = excluded.contribution_verification,
    report_alignment = excluded.report_alignment,
    teacher_feedback = excluded.teacher_feedback,
    follow_up_status = excluded.follow_up_status,
    follow_up_actions = excluded.follow_up_actions,
    follow_up_note = excluded.follow_up_note,
    recheck_week = excluded.recheck_week
  returning * into v_saved;

  return to_jsonb(v_saved);
end;
$$;

revoke all on function public.save_teacher_progress_review(uuid, jsonb) from public, anon;
grant execute on function public.save_teacher_progress_review(uuid, jsonb) to authenticated;
