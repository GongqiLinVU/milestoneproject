-- Sprint 5 Phase 2: roster-prepared student identities and activation.

create table if not exists public.student_accounts (
  student_id text primary key check (char_length(trim(student_id)) between 3 and 40),
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  status text not null default 'ready' check (status in ('ready', 'activated', 'disabled')),
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_checkins
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
create unique index if not exists student_checkins_auth_user_block_idx
  on public.student_checkins (auth_user_id, block_id) where auth_user_id is not null;

drop trigger if exists set_student_accounts_updated_at on public.student_accounts;
create trigger set_student_accounts_updated_at
before update on public.student_accounts
for each row execute function public.set_updated_at();

alter table public.student_accounts enable row level security;
revoke all on public.student_accounts from anon, authenticated;
grant select, update on public.student_accounts to authenticated;

drop policy if exists "students read own account" on public.student_accounts;
create policy "students read own account" on public.student_accounts
for select to authenticated using (auth_user_id = auth.uid() or public.is_teacher());
drop policy if exists "teachers manage student accounts" on public.student_accounts;
create policy "teachers manage student accounts" on public.student_accounts
for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

create or replace function public.get_my_student_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts;
  v_roster public.student_roster;
  v_block public.teaching_blocks;
  v_project_name text;
  v_checkin boolean;
begin
  select * into v_account from public.student_accounts
  where auth_user_id = auth.uid() and status <> 'disabled';
  if v_account.auth_user_id is null then
    raise exception using errcode = 'P0001', message = 'Student account is not available';
  end if;

  select roster, block into v_roster, v_block
  from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;
  if v_roster.id is null then
    raise exception using errcode = 'P0001', message = 'No active roster context is available';
  end if;
  if (select count(*) from public.student_roster roster
      join public.teaching_blocks block on block.id = roster.block_id
      where roster.student_id = v_account.student_id and block.status = 'active') <> 1 then
    raise exception using errcode = 'P0001', message = 'Student belongs to more than one active block';
  end if;

  select project.title into v_project_name
  from public.teams team
  join public.team_project_assignments assignment on assignment.team_id = team.id
  join public.projects project on project.id = assignment.project_id
  where team.block_id = v_roster.block_id and team.team_number = v_roster.team_number;

  select exists(select 1 from public.student_checkins
    where lower(trim(student_id)) = v_account.student_id)
    into v_checkin;
  return jsonb_build_object(
    'status', v_account.status,
    'studentName', coalesce(v_roster.preferred_name, v_roster.full_name),
    'blockLabel', concat(v_block.academic_year, ' · ', v_block.block_code),
    'teamName', concat('Team ', v_roster.team_number),
    'projectName', v_project_name,
    'checkinRecognised', v_checkin
  );
end;
$$;
revoke all on function public.get_my_student_context() from public;
grant execute on function public.get_my_student_context() to authenticated;

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

  select id into v_existing_id from public.student_checkins
  where lower(trim(student_id)) = v_account.student_id;
  if v_existing_id is not null then
    update public.student_checkins set auth_user_id = auth.uid()
    where id = v_existing_id and auth_user_id is null;
  else
    if char_length(trim(coalesce(p_goal, ''))) < 3 then
      raise exception using errcode = 'P0001', message = 'A Week 1 recovery goal is required';
    end if;
    insert into public.student_checkins (
      student_id, student_name, team_name, goal, block_id, auth_user_id
    ) values (
      v_account.student_id, coalesce(v_roster.preferred_name, v_roster.full_name),
      concat('Team ', v_roster.team_number), trim(p_goal), v_roster.block_id, auth.uid()
    );
  end if;
  update public.student_accounts
  set status = 'activated', activated_at = now()
  where auth_user_id = auth.uid();
  return public.get_my_student_context();
end;
$$;
revoke all on function public.complete_student_activation(text) from public;
grant execute on function public.complete_student_activation(text) to authenticated;

-- Retire anonymous team lookup only after student activation is deployed.
revoke execute on function public.find_student_team(text, text, text) from anon;

-- Verification:
-- 1. anon cannot select student_accounts or execute student context RPCs.
-- 2. authenticated students receive exactly one active roster context.
-- 3. a second active-block roster match raises an actionable ambiguity error.
-- 4. activation links one matching legacy check-in, or creates one recovery row.
-- 5. repeated provisioning never changes existing student_accounts.
-- Rollback:
-- Re-grant find_student_team to anon before rolling back the frontend. Revoke
-- the two RPCs, then drop policies/table only if no accounts have been issued.
-- Keep auth_user_id once production evidence has been linked.
