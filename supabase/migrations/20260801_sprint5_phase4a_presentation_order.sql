-- Sprint 5 Phase 4A: block-based Presentation Order draft and publication.

create table if not exists public.presentation_orders (
  block_id uuid primary key references public.teaching_blocks(id) on delete cascade,
  draft_team_ids uuid[] not null default '{}',
  published_snapshot jsonb,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

drop trigger if exists set_presentation_orders_updated_at on public.presentation_orders;
create trigger set_presentation_orders_updated_at
before update on public.presentation_orders
for each row execute function public.set_updated_at();

alter table public.presentation_orders enable row level security;
revoke all on public.presentation_orders from anon, authenticated;
grant select on public.presentation_orders to authenticated;

drop policy if exists "teachers read presentation orders" on public.presentation_orders;
create policy "teachers read presentation orders" on public.presentation_orders
for select to authenticated using (public.is_teacher());

create or replace function public.save_presentation_order_draft(
  p_block_id uuid,
  p_team_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_count integer;
begin
  if not public.is_teacher() then
    raise exception using errcode = '42501', message = 'Teacher access required';
  end if;

  select count(*)::integer into v_team_count
  from public.teams where block_id = p_block_id;

  if v_team_count = 0
     or coalesce(array_length(p_team_ids, 1), 0) <> v_team_count
     or (select count(distinct team_id) from unnest(p_team_ids) as supplied(team_id)) <> v_team_count
     or exists (
       select 1 from unnest(p_team_ids) as supplied(team_id)
       where not exists (
         select 1 from public.teams team
         where team.id = supplied.team_id and team.block_id = p_block_id
       )
     ) then
    raise exception using errcode = '22023',
      message = 'Presentation order must contain every block team exactly once';
  end if;

  insert into public.presentation_orders (block_id, draft_team_ids)
  values (p_block_id, p_team_ids)
  on conflict (block_id) do update
  set draft_team_ids = excluded.draft_team_ids;
end;
$$;

revoke all on function public.save_presentation_order_draft(uuid, uuid[]) from public;
grant execute on function public.save_presentation_order_draft(uuid, uuid[]) to authenticated;

create or replace function public.publish_presentation_order(
  p_block_id uuid,
  p_team_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_snapshot jsonb;
begin
  perform public.save_presentation_order_draft(p_block_id, p_team_ids);

  select jsonb_agg(
    jsonb_build_object(
      'position', ordered.ordinality,
      'teamName', concat('Team ', team.team_number),
      'projectName', project.title
    ) order by ordered.ordinality
  ) into v_snapshot
  from unnest(p_team_ids) with ordinality as ordered(team_id, ordinality)
  join public.teams team on team.id = ordered.team_id
  left join public.team_project_assignments assignment on assignment.team_id = team.id
  left join public.projects project on project.id = assignment.project_id;

  update public.presentation_orders
  set published_snapshot = v_snapshot,
      published_at = now()
  where block_id = p_block_id;

  return coalesce(v_snapshot, '[]'::jsonb);
end;
$$;

revoke all on function public.publish_presentation_order(uuid, uuid[]) from public;
grant execute on function public.publish_presentation_order(uuid, uuid[]) to authenticated;

create or replace function public.get_my_published_presentation_order()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_block_id uuid;
  v_is_week_four_open boolean;
  v_snapshot jsonb;
begin
  select roster.block_id into v_block_id
  from public.student_accounts account
  join public.student_roster roster on roster.student_id = account.student_id
  join public.teaching_blocks block on block.id = roster.block_id
  where account.auth_user_id = auth.uid()
    and account.status = 'activated'
    and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;

  if v_block_id is null then
    raise exception using errcode = 'P0001', message = 'Active student block is not available';
  end if;

  select is_open into v_is_week_four_open
  from public.weekly_activity_settings
  where block_id = v_block_id and week_number = 4;

  if not coalesce(v_is_week_four_open, false) then
    return '[]'::jsonb;
  end if;

  select published_snapshot into v_snapshot
  from public.presentation_orders
  where block_id = v_block_id and published_at is not null;

  return coalesce(v_snapshot, '[]'::jsonb);
end;
$$;

revoke all on function public.get_my_published_presentation_order() from public;
grant execute on function public.get_my_published_presentation_order() to authenticated;

-- Verification:
-- 1. A teacher sees natural Team-number order before the first saved draft.
-- 2. A draft contains every selected-block team exactly once.
-- 3. Saving a changed draft leaves published_snapshot and published_at intact.
-- 4. Publishing stores a fixed ordered snapshot including project titles.
-- 5. A student receives [] while Week 4 is closed or before publication.
-- 6. In active Week 4, a student receives only their block's latest snapshot.
-- 7. anon and students cannot read presentation_orders directly.
