-- Hotfix: save Week 2 teacher reviews through an authoritative, teacher-only RPC.
-- Student identity and block context are derived from the selected Pre-check submission.

-- Repair databases where an earlier create-table migration was skipped or the table
-- already existed with an older shape. ADD COLUMN IF NOT EXISTS is safe to rerun and
-- preserves every existing review.
alter table public.teacher_progress_reviews
  add column if not exists block_id uuid references public.teaching_blocks(id),
  add column if not exists review_outcome text check (review_outcome is null or review_outcome in ('Verified','Partially verified','Not verified','Unable to demonstrate','Further evidence required')),
  add column if not exists demonstration_outcome text check (demonstration_outcome is null or demonstration_outcome in ('Worked on target system','Worked with limitations','Partial demonstration','Could not demonstrate','Not applicable')),
  add column if not exists method_explanation text check (method_explanation is null or method_explanation in ('Clear and credible','Mostly clear','Limited explanation','Could not explain')),
  add column if not exists evidence_quality text check (evidence_quality is null or evidence_quality in ('Strong and traceable','Adequate','Partial','No usable evidence')),
  add column if not exists contribution_verification text check (contribution_verification is null or contribution_verification in ('Clearly verified','Partly verified','Needs further evidence','Not verified')),
  add column if not exists report_alignment text check (report_alignment is null or report_alignment in ('Consistent','Minor update needed','Significant update needed','Not checked')),
  add column if not exists teacher_feedback text check (teacher_feedback is null or char_length(teacher_feedback) between 1 and 800),
  add column if not exists follow_up_status text check (follow_up_status is null or follow_up_status in ('Not reviewed','No follow-up needed','Action required','In progress','Recheck next session','Resolved')),
  add column if not exists follow_up_actions text[] default array[]::text[],
  add column if not exists follow_up_note text check (follow_up_note is null or char_length(follow_up_note) <= 400),
  add column if not exists recheck_week smallint check (recheck_week is null or recheck_week between 2 and 4),
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

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
    raise exception using
      errcode = '42501',
      message = 'Your teacher session is not authorised to save this review. Sign in again and retry.';
  end if;

  select submission.*
    into v_submission
  from public.week2_progress_reviews submission
  where submission.id = p_submission_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'The selected Week 2 Pre-check submission was not found. Refresh the dashboard and retry.';
  end if;

  if v_submission.block_id is null then
    raise exception using
      errcode = '23514',
      message = 'This Pre-check is not linked to a teaching block. Ask the administrator to repair the submission.';
  end if;

  if nullif(trim(coalesce(v_submission.student_name, '')), '') is null
     or nullif(trim(coalesce(v_submission.student_id, '')), '') is null
     or nullif(trim(coalesce(v_submission.team_name, '')), '') is null then
    raise exception using
      errcode = '23514',
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
    block_id,
    student_name,
    student_id,
    team_name,
    review_outcome,
    demonstration_outcome,
    method_explanation,
    evidence_quality,
    contribution_verification,
    report_alignment,
    teacher_feedback,
    follow_up_status,
    follow_up_actions,
    follow_up_note,
    recheck_week
  )
  values (
    v_submission.block_id,
    trim(v_submission.student_name),
    trim(v_submission.student_id),
    trim(v_submission.team_name),
    p_review ->> 'review_outcome',
    p_review ->> 'demonstration_outcome',
    p_review ->> 'method_explanation',
    p_review ->> 'evidence_quality',
    p_review ->> 'contribution_verification',
    p_review ->> 'report_alignment',
    trim(p_review ->> 'teacher_feedback'),
    p_review ->> 'follow_up_status',
    v_actions,
    nullif(trim(coalesce(p_review ->> 'follow_up_note', '')), ''),
    v_recheck_week
  )
  on conflict (block_id, student_id)
  do update set
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
