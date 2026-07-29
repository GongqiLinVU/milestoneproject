-- Sprint 3 Phase 2: Week 2 implementation pre-check
-- Apply after 20260729_sprint3_phase1_engagement_loop.sql.

create table if not exists public.week2_progress_reviews (
  id uuid primary key default gen_random_uuid(),
  student_name text not null check (char_length(student_name) between 1 and 100),
  student_id text not null,
  team_name text not null check (team_name ~ '^Team [1-8]$'),
  deliverable_area text not null check (deliverable_area in ('Frontend / UI','Backend / API','Database','Authentication / Security','Hardware / Integration','Testing','Documentation','Project coordination','Other')),
  implementation_item text not null check (char_length(implementation_item) between 1 and 200),
  implementation_state text not null check (implementation_state in ('Implemented and verified','Implemented but not fully verified','Partially implemented','Designed but not implemented','Blocked')),
  work_location text not null check (work_location in ('GitHub repository / commits','Application or deployed system','Database / backend service','Test records','Design or documentation','Hardware prototype','Not yet available','Other')),
  evidence_reference text check (evidence_reference is null or char_length(evidence_reference) <= 300),
  demonstration_method text not null check (demonstration_method in ('Run the function live','Show the implemented code and explain it','Run a test case','Show database / API output','Demonstrate hardware integration','Show design / document evidence','Cannot demonstrate it yet')),
  verification_level text not null check (verification_level in ('Demonstrated successfully on the target system','Integrated with other project components','Tested independently only','Informally checked','Not yet tested')),
  implementation_methods text[] not null check (cardinality(implementation_methods) > 0),
  remaining_issue text not null check (remaining_issue in ('No major issue','Integration incomplete','Testing incomplete','Technical defect','Security or data concern','Dependency on another team member','Scope or time constraint','Implementation not yet working','Other')),
  issue_note text check (issue_note is null or char_length(issue_note) <= 200),
  next_action text not null check (next_action in ('Complete implementation','Integrate components','Fix defects','Add or run tests','Verify security / data','Deploy to target device or environment','Prepare evidence','Update documentation','Other')),
  teacher_verification text not null check (teacher_verification in ('Whether the function works','My implementation method','My individual contribution','Integration with the team project','Testing and evidence','Current blocker','Progress Report accuracy','Other')),
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
