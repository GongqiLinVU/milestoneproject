-- Sprint 5 Phase 4A: block-based weekly activity activation.

create table if not exists public.weekly_activity_settings (
  block_id uuid not null references public.teaching_blocks(id) on delete cascade,
  week_number smallint not null check (week_number between 1 and 4),
  is_open boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (block_id, week_number)
);

insert into public.weekly_activity_settings (block_id, week_number, is_open)
select block.id, week_number, false
from public.teaching_blocks block
cross join generate_series(1, 4) as week_number
on conflict (block_id, week_number) do nothing;

create or replace function public.prepare_weekly_activity_settings()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.weekly_activity_settings (block_id, week_number)
  select new.id, generate_series(1, 4)
  on conflict (block_id, week_number) do nothing;
  return new;
end;
$$;
drop trigger if exists prepare_weekly_activity_settings on public.teaching_blocks;
create trigger prepare_weekly_activity_settings after insert on public.teaching_blocks
for each row execute function public.prepare_weekly_activity_settings();

drop trigger if exists set_weekly_activity_settings_updated_at on public.weekly_activity_settings;
create trigger set_weekly_activity_settings_updated_at before update on public.weekly_activity_settings
for each row execute function public.set_updated_at();

alter table public.weekly_activity_settings enable row level security;
revoke all on public.weekly_activity_settings from anon, authenticated;
grant select, update on public.weekly_activity_settings to authenticated;

drop policy if exists "teachers manage weekly activity settings" on public.weekly_activity_settings;
create policy "teachers manage weekly activity settings" on public.weekly_activity_settings
for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

create or replace function public.get_my_weekly_activity_states()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_block_id uuid;
begin
  select roster.block_id into v_block_id
  from public.student_accounts account
  join public.student_roster roster on roster.student_id = account.student_id
  join public.teaching_blocks block on block.id = roster.block_id
  where account.auth_user_id = auth.uid() and account.status = 'activated' and block.status = 'active'
  order by block.starts_on desc nulls last limit 1;
  if v_block_id is null then
    raise exception using errcode = 'P0001', message = 'Active student block is not available';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('weekNumber', week_number, 'isOpen', is_open) order by week_number)
    from public.weekly_activity_settings where block_id = v_block_id), '[]'::jsonb);
end;
$$;
revoke all on function public.get_my_weekly_activity_states() from public;
grant execute on function public.get_my_weekly_activity_states() to authenticated;

create or replace function public.student_can_submit_week_v2(p_block_id uuid, p_week integer)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.student_accounts account
    join public.student_roster roster on roster.student_id = account.student_id and roster.block_id = p_block_id
    join public.weekly_activity_settings setting on setting.block_id = roster.block_id and setting.week_number = p_week
    where account.auth_user_id = auth.uid() and account.status = 'activated' and setting.is_open
  );
$$;
revoke all on function public.student_can_submit_week_v2(uuid, integer) from public;
grant execute on function public.student_can_submit_week_v2(uuid, integer) to authenticated;

revoke insert on public.team_health_checks, public.weekly_engagement_checkouts, public.week2_progress_reviews, public.poster_reviews from anon;

drop policy if exists "students create team health" on public.team_health_checks;
create policy "students create team health" on public.team_health_checks for insert to authenticated
with check (public.student_can_submit_week_v2(block_id, 1));

drop policy if exists "students create engagement checkout" on public.weekly_engagement_checkouts;
create policy "students create engagement checkout" on public.weekly_engagement_checkouts for insert to authenticated
with check (public.student_can_submit_week_v2(block_id, week_number::integer));

drop policy if exists "students create week2 progress" on public.week2_progress_reviews;
create policy "students create week2 progress" on public.week2_progress_reviews for insert to authenticated
with check (public.student_can_submit_week_v2(block_id, 2));

drop policy if exists "Students can submit poster reviews" on public.poster_reviews;
create policy "Students can submit poster reviews" on public.poster_reviews for insert to authenticated
with check (
  public.student_can_submit_week_v2(block_id, 3)
  and lower(trim(reviewer_team)) <> lower(trim(reviewed_team))
  and problem_clarity between 1 and 5 and working_product between 1 and 5
  and evidence_testing between 1 and 5 and document_readiness between 1 and 5
  and presentation_quality between 1 and 5
);

-- Add stable block identity to the authenticated student portal context.
create or replace function public.get_my_student_context()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_account public.student_accounts; v_roster public.student_roster;
  v_block public.teaching_blocks; v_project public.projects%rowtype; v_checkin boolean;
begin
  select * into v_account from public.student_accounts where auth_user_id = auth.uid() and status <> 'disabled';
  if v_account.auth_user_id is null then raise exception using errcode='P0001', message='Student account is not available'; end if;
  select roster.* into v_roster from public.student_roster roster
  join public.teaching_blocks block on block.id=roster.block_id
  where roster.student_id=v_account.student_id and block.status='active'
  order by block.starts_on desc nulls last, block.created_at desc limit 1;
  if v_roster.id is null then raise exception using errcode='P0001', message='No active roster context is available'; end if;
  select * into v_block from public.teaching_blocks where id=v_roster.block_id;
  select project.* into v_project from public.teams team
  join public.team_project_assignments assignment on assignment.team_id=team.id
  join public.projects project on project.id=assignment.project_id
  where team.block_id=v_roster.block_id and team.team_number=v_roster.team_number;
  select exists(select 1 from public.student_checkins where block_id=v_roster.block_id and lower(trim(student_id))=v_account.student_id) into v_checkin;
  return jsonb_build_object(
    'status',v_account.status,'studentId',v_account.student_id,'studentName',coalesce(v_roster.preferred_name,v_roster.full_name),
    'blockId',v_block.id,'blockLabel',concat(v_block.academic_year,' · ',v_block.block_code),'teamName',concat('Team ',v_roster.team_number),
    'projectName',coalesce(v_project.title,v_roster.project_name),'projectProblem',v_project.problem,'projectDescription',v_project.description,
    'projectTargetUsers',v_project.target_users,'projectExpectedOutcomes',v_project.expected_outcomes,'projectCategory',v_project.category,
    'projectDifficulty',v_project.difficulty,'projectSource',case when v_project.id is not null then 'catalogue' when v_roster.project_name is not null then 'roster' else 'none' end,
    'checkinRecognised',v_checkin);
end;
$$;
revoke all on function public.get_my_student_context() from public;
grant execute on function public.get_my_student_context() to authenticated;

-- Verification: every block has four rows; all rows default closed; teachers can
-- update only the selected block; students can read only through the RPC; direct
-- inserts fail for a closed week and succeed for the student's own open week.
