-- Sprint 3 Phase 2: Week 2 individual progress review
-- Apply after 20260729_sprint3_phase1_engagement_loop.sql.

create table if not exists public.week2_progress_reviews (
  id uuid primary key default gen_random_uuid(),
  student_name text not null check (char_length(student_name) between 1 and 100),
  student_id text not null,
  team_name text not null check (team_name ~ '^Team [1-8]$'),
  current_progress text not null check (current_progress in ('On track','Slightly behind','At risk','Blocked')),
  contribution_areas text[] not null check (cardinality(contribution_areas) > 0),
  evidence_status text not null check (evidence_status in ('Yes, clearly available','Partly available','Not yet')),
  evidence_reference text check (evidence_reference is null or char_length(evidence_reference) <= 300),
  next_task_clarity text not null check (next_task_clarity in ('Clear','Partly clear','Not clear')),
  support_needed text not null check (support_needed in ('No','Maybe','Yes')),
  discussion_note text check (discussion_note is null or char_length(discussion_note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint week2_progress_reviews_student_id_key unique (student_id)
);

alter table public.week2_progress_reviews enable row level security;

revoke all on public.week2_progress_reviews from anon, authenticated;
grant insert on public.week2_progress_reviews to anon, authenticated;
grant select, update, delete on public.week2_progress_reviews to authenticated;

drop policy if exists "students create week2 progress" on public.week2_progress_reviews;
create policy "students create week2 progress" on public.week2_progress_reviews
for insert to anon, authenticated with check (true);

drop policy if exists "teachers read week2 progress" on public.week2_progress_reviews;
create policy "teachers read week2 progress" on public.week2_progress_reviews
for select to authenticated using (public.is_teacher());

drop policy if exists "teachers manage week2 progress" on public.week2_progress_reviews;
create policy "teachers manage week2 progress" on public.week2_progress_reviews
for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

-- Verification:
-- 1. anon can INSERT one record and cannot SELECT, UPDATE or DELETE it.
-- 2. duplicate student_id fails with 23505.
-- 3. teacher can SELECT/UPDATE/DELETE through is_teacher().
-- 4. non-teacher authenticated users cannot read or manage records.
-- 5. weekly_engagement_checkouts accepts week_number = 2 and keeps the
--    existing unique (student_id, week_number) constraint.
-- Rollback: drop table if exists public.week2_progress_reviews;
