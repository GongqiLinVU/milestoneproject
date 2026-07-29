-- Sprint 3 Phase 1: Week 1 engagement loop
create table if not exists public.team_health_checks (
  id uuid primary key default gen_random_uuid(),
  student_name text not null check (char_length(student_name) between 1 and 100),
  student_id text not null,
  team_name text not null check (team_name ~ '^Team [1-8]$'),
  communication text not null check (communication in ('Yes','Not yet')),
  role_clarity text not null check (role_clarity in ('Clear','Partly clear','Not clear')),
  participation_balance text not null check (participation_balance in ('Balanced','Some difference','Significant difference')),
  delivery_status text not null check (delivery_status in ('On track','Some risk','Blocked')),
  voice text not null check (voice in ('Yes','Sometimes','No')),
  teacher_support text not null check (teacher_support in ('No','Maybe','Yes')),
  main_issue text not null check (main_issue in ('None','Communication','Participation','Technical','Scope','Time','Other')),
  risk_note text check (risk_note is null or char_length(risk_note) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_health_checks_student_id_key unique (student_id)
);

create table if not exists public.weekly_engagement_checkouts (
  id uuid primary key default gen_random_uuid(),
  week_number smallint not null check (week_number between 1 and 3),
  student_name text not null check (char_length(student_name) between 1 and 100),
  student_id text not null,
  team_name text not null check (team_name ~ '^Team [1-8]$'),
  participation_mode text not null,
  time_invested text not null,
  contribution_areas text[] not null check (cardinality(contribution_areas) > 0),
  task_completion text not null,
  evidence_status text not null,
  team_communication text not null,
  participation_balance text not null,
  next_task_clarity text not null,
  work_status text not null,
  discussion_focus text not null,
  detail_note text check (detail_note is null or char_length(detail_note) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_engagement_student_week_key unique (student_id, week_number)
);

alter table public.team_health_checks enable row level security;
alter table public.weekly_engagement_checkouts enable row level security;

revoke all on public.team_health_checks from anon, authenticated;
revoke all on public.weekly_engagement_checkouts from anon, authenticated;
grant insert on public.team_health_checks to anon, authenticated;
grant insert on public.weekly_engagement_checkouts to anon, authenticated;
grant select, update, delete on public.team_health_checks to authenticated;
grant select, update, delete on public.weekly_engagement_checkouts to authenticated;

drop policy if exists "students create team health" on public.team_health_checks;
create policy "students create team health" on public.team_health_checks
for insert to anon, authenticated with check (true);
drop policy if exists "teachers read team health" on public.team_health_checks;
create policy "teachers read team health" on public.team_health_checks
for select to authenticated using (public.is_teacher());
drop policy if exists "teachers manage team health" on public.team_health_checks;
create policy "teachers manage team health" on public.team_health_checks
for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

drop policy if exists "students create engagement checkout" on public.weekly_engagement_checkouts;
create policy "students create engagement checkout" on public.weekly_engagement_checkouts
for insert to anon, authenticated with check (true);
drop policy if exists "teachers read engagement checkout" on public.weekly_engagement_checkouts;
create policy "teachers read engagement checkout" on public.weekly_engagement_checkouts
for select to authenticated using (public.is_teacher());
drop policy if exists "teachers manage engagement checkout" on public.weekly_engagement_checkouts;
create policy "teachers manage engagement checkout" on public.weekly_engagement_checkouts
for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

-- Verification: anon INSERT succeeds; anon SELECT/UPDATE/DELETE return no rows.
-- Teacher SELECT succeeds through is_teacher(); non-teacher SELECT returns no rows.
-- Rollback: drop both new tables. Historical tables are unchanged.
