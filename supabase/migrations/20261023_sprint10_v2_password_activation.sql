-- Activation is password setup, not a progress/attendance submission.
-- Keep the optional legacy p_goal argument for old clients, but do not record it.
begin;
create or replace function public.complete_student_activation(p_goal text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts;
  v_roster public.student_roster;
  v_existing_id uuid;
begin
  select * into v_account from public.student_accounts
  where auth_user_id = auth.uid() and status = 'ready' for update;
  if v_account.auth_user_id is null then
    raise exception using errcode = 'P0001', message = 'Account is not ready to activate';
  end if;
  select roster.* into v_roster from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  limit 1;
  if v_roster.id is null then
    raise exception using errcode = 'P0001', message = 'Active roster context is missing';
  end if;

  if v_roster.team_number is null then raise exception 'Student has no team in this class. Ask your teacher to assign a team first.'; end if;

  select id into v_existing_id from public.student_checkins
  where lower(trim(student_id)) = v_account.student_id and block_id = v_roster.block_id;
  if v_existing_id is not null then
    update public.student_checkins set auth_user_id = auth.uid()
    where id = v_existing_id and auth_user_id is null;
  end if;
  update public.student_accounts
  set status = 'activated', activated_at = now()
  where auth_user_id = auth.uid();
  return public.get_my_student_context();
end;
$$;
revoke all on function public.complete_student_activation(text) from public;
grant execute on function public.complete_student_activation(text) to authenticated;

comment on function public.complete_student_activation(text) is 'Activate own ready account; preserve/link existing current-class legacy check-in, without requiring a goal or creating a check-in.';
commit;
