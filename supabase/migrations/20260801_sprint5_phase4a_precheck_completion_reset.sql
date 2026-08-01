-- Sprint 5 Phase 4A hotfix: authoritative completed-state lookup and teacher reset.

create or replace function public.get_my_week2_precheck_submission()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts;
  v_roster public.student_roster;
  v_submission public.week2_progress_reviews;
begin
  select account.* into v_account
  from public.student_accounts account
  where account.auth_user_id = auth.uid()
    and account.status = 'activated';

  if v_account.auth_user_id is null then
    raise exception using errcode = '42501', message = 'Active student account is required';
  end if;

  select roster.* into v_roster
  from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where lower(trim(roster.student_id)) = lower(trim(v_account.student_id))
    and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;

  if v_roster.id is null then
    return null;
  end if;

  select submission.* into v_submission
  from public.week2_progress_reviews submission
  where submission.block_id = v_roster.block_id
    and lower(trim(submission.student_id)) = lower(trim(v_account.student_id))
  order by submission.created_at desc
  limit 1;

  if v_submission.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'submittedAt', v_submission.created_at,
    'answers', (
      select coalesce(jsonb_agg(jsonb_build_object('label', answer.label, 'value', answer.value)), '[]'::jsonb)
      from (values
        ('Project name', v_submission.project_name),
        ('Project area', v_submission.project_area),
        ('Project description', v_submission.project_description),
        ('Target user / problem', v_submission.target_user_problem),
        ('Deliverable', v_submission.deliverable_area),
        ('Implementation claim', v_submission.implementation_item),
        ('Current state', v_submission.implementation_state),
        ('Where to find it', v_submission.work_location),
        ('Evidence reference', v_submission.evidence_reference),
        ('Demonstration plan', v_submission.demonstration_method),
        ('Verification completed', v_submission.verification_level),
        ('Method to explain', array_to_string(v_submission.implementation_methods, ', ')),
        ('Remaining issue', v_submission.remaining_issue),
        ('Issue details', v_submission.issue_note),
        ('Next action', v_submission.next_action),
        ('Teacher should verify', v_submission.teacher_verification)
      ) as answer(label, value)
      where answer.value is not null and trim(answer.value) <> ''
    )
  );
end;
$$;

revoke all on function public.get_my_week2_precheck_submission() from public;
grant execute on function public.get_my_week2_precheck_submission() to authenticated;

create or replace function public.teacher_reset_week2_precheck(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission public.week2_progress_reviews;
begin
  if not coalesce(public.is_teacher(), false) then
    raise exception using errcode = '42501', message = 'Teacher access is required';
  end if;

  select submission.* into v_submission
  from public.week2_progress_reviews submission
  where submission.id = p_submission_id;

  if v_submission.id is null then
    raise exception using errcode = 'P0002', message = 'Pre-check submission was not found';
  end if;

  delete from public.teacher_progress_reviews review
  where review.block_id = v_submission.block_id
    and lower(trim(review.student_id)) = lower(trim(v_submission.student_id));

  delete from public.week2_progress_reviews submission
  where submission.id = p_submission_id;
end;
$$;

revoke all on function public.teacher_reset_week2_precheck(uuid) from public;
grant execute on function public.teacher_reset_week2_precheck(uuid) to authenticated;

-- Verification:
-- 1. An authenticated student receives only their own active-block Pre-check receipt.
-- 2. A student without a submission receives null.
-- 3. A teacher reset removes the selected Pre-check and its matching private follow-up.
-- 4. Non-teachers cannot execute the reset.
