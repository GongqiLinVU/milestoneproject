-- Sprint 3 Phase 3C-1: reusable teaching-block foundation
-- Existing classroom data is assigned to 2026 · 2B1.
-- New anonymous inserts continue to work by defaulting to the single active block.

create table if not exists public.teaching_blocks (
  id uuid primary key default gen_random_uuid(),
  academic_year integer not null check (academic_year between 2020 and 2100),
  block_code text not null check (block_code in ('1B1','1B4','2B1','2B4')),
  starts_on date,
  ends_on date,
  status text not null default 'planned'
    check (status in ('planned','active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_on is null or ends_on is null or starts_on <= ends_on),
  unique (academic_year, block_code)
);

create unique index if not exists teaching_blocks_single_active_idx
on public.teaching_blocks ((status))
where status = 'active';

insert into public.teaching_blocks (academic_year, block_code, status)
values (2026, '2B1', 'active')
on conflict (academic_year, block_code) do update
set status = case
  when public.teaching_blocks.status = 'archived' then public.teaching_blocks.status
  else 'active'
end;

create or replace function public.current_teaching_block_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.teaching_blocks
  where status = 'active'
  limit 1;
$$;

revoke all on function public.current_teaching_block_id() from public;
grant execute on function public.current_teaching_block_id() to anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'activity_settings',
    'student_checkins',
    'week1_pulse',
    'team_conversations',
    'student_promises',
    'poster_reviews',
    'team_health_checks',
    'weekly_engagement_checkouts',
    'week2_progress_reviews',
    'teacher_progress_reviews'
  ]
  loop
    execute format(
      'alter table public.%I add column if not exists block_id uuid',
      table_name
    );
    execute format(
      'update public.%I set block_id = public.current_teaching_block_id() where block_id is null',
      table_name
    );
    execute format(
      'alter table public.%I alter column block_id set default public.current_teaching_block_id()',
      table_name
    );
    execute format(
      'alter table public.%I alter column block_id set not null',
      table_name
    );

    if not exists (
      select 1
      from pg_constraint
      where conname = table_name || '_block_id_fkey'
        and conrelid = format('public.%I', table_name)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (block_id) references public.teaching_blocks(id)',
        table_name,
        table_name || '_block_id_fkey'
      );
    end if;

    execute format(
      'create index if not exists %I on public.%I (block_id)',
      table_name || '_block_id_idx',
      table_name
    );
  end loop;
end $$;

-- Replace singleton/global keys with block-scoped keys.
alter table public.activity_settings
  drop constraint if exists activity_settings_pkey;
alter table public.activity_settings
  add constraint activity_settings_pkey primary key (block_id, setting_key);

alter table public.student_checkins
  drop constraint if exists student_checkins_student_id_key;
alter table public.student_checkins
  add constraint student_checkins_block_student_key unique (block_id, student_id);

alter table public.team_conversations
  drop constraint if exists team_conversations_team_name_key;
alter table public.team_conversations
  add constraint team_conversations_block_team_key unique (block_id, team_name);

alter table public.student_promises
  drop constraint if exists student_promises_student_id_key;
alter table public.student_promises
  add constraint student_promises_block_student_key unique (block_id, student_id);

alter table public.poster_reviews
  drop constraint if exists poster_reviews_reviewer_student_id_reviewed_team_key;
alter table public.poster_reviews
  add constraint poster_reviews_block_reviewer_team_key
  unique (block_id, reviewer_student_id, reviewed_team);

alter table public.team_health_checks
  drop constraint if exists team_health_checks_student_id_key;
alter table public.team_health_checks
  add constraint team_health_checks_block_student_key unique (block_id, student_id);

alter table public.weekly_engagement_checkouts
  drop constraint if exists weekly_engagement_student_week_key;
alter table public.weekly_engagement_checkouts
  add constraint weekly_engagement_block_student_week_key
  unique (block_id, student_id, week_number);

alter table public.week2_progress_reviews
  drop constraint if exists week2_progress_reviews_student_id_key;
alter table public.week2_progress_reviews
  add constraint week2_progress_reviews_block_student_key unique (block_id, student_id);

alter table public.teacher_progress_reviews
  drop constraint if exists teacher_progress_reviews_student_id_key;
alter table public.teacher_progress_reviews
  add constraint teacher_progress_reviews_block_student_key unique (block_id, student_id);

drop trigger if exists set_teaching_blocks_updated_at on public.teaching_blocks;
create trigger set_teaching_blocks_updated_at
before update on public.teaching_blocks
for each row execute function public.set_updated_at();

alter table public.teaching_blocks enable row level security;
revoke all on public.teaching_blocks from anon, authenticated;
grant select on public.teaching_blocks to anon, authenticated;
grant insert, update, delete on public.teaching_blocks to authenticated;

drop policy if exists "public reads active teaching block" on public.teaching_blocks;
create policy "public reads active teaching block"
on public.teaching_blocks for select to anon, authenticated
using (status = 'active' or public.is_teacher());

drop policy if exists "teachers manage teaching blocks" on public.teaching_blocks;
create policy "teachers manage teaching blocks"
on public.teaching_blocks for all to authenticated
using (public.is_teacher())
with check (public.is_teacher());

-- The current activity setting remains publicly readable only for the active block.
drop policy if exists "Public can read peer review state" on public.activity_settings;
create policy "Public can read peer review state"
on public.activity_settings for select to anon, authenticated
using (
  setting_key = 'poster_peer_review'
  and block_id = public.current_teaching_block_id()
);

drop policy if exists "Teachers can update peer review state" on public.activity_settings;
create policy "Teachers can update peer review state"
on public.activity_settings for update to authenticated
using (public.is_teacher())
with check (public.is_teacher());

-- Verification
-- 1. Exactly one row has status = 'active'.
-- 2. All listed activity tables have non-null block_id values.
-- 3. Existing rows reference 2026 · 2B1.
-- 4. A duplicate Student ID/week in the same block fails.
-- 5. The same Student ID/week in a different block succeeds.
-- 6. anon can read only the active teaching block and cannot mutate it.
-- 7. teacher can read archived blocks and manage lifecycle state.
--
-- Recovery: do not drop block_id after production use. Restore the previous
-- uniqueness constraints only if the migration is rolled back before any
-- second teaching block or block-scoped record is created.
