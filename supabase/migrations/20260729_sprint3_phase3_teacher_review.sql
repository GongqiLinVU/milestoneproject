-- Phase 3A: project context is optional at database level for compatibility
-- with Phase 2 submissions, but required by the new student form.
alter table public.week2_progress_reviews
  add column if not exists project_name text check (project_name is null or char_length(trim(project_name)) between 1 and 120),
  add column if not exists project_area text check (project_area is null or project_area in ('Web','Mobile','AI','Data','IoT','Cybersecurity','Game','Other')),
  add column if not exists project_description text check (project_description is null or char_length(trim(project_description)) between 1 and 300),
  add column if not exists target_user_problem text check (target_user_problem is null or char_length(trim(target_user_problem)) <= 150);

-- Sprint 3 Phase 3: teacher review outcomes and Week 3 engagement
-- Week 3 engagement uses the existing weekly_engagement_checkouts table.

create table if not exists public.teacher_progress_reviews (
  id uuid primary key default gen_random_uuid(),
  student_name text not null check (char_length(student_name) between 1 and 100),
  student_id text not null,
  team_name text not null check (team_name ~ '^Team [1-8]$'),
  review_outcome text not null check (review_outcome in ('Verified','Partially verified','Not verified','Unable to demonstrate','Further evidence required')),
  demonstration_outcome text not null check (demonstration_outcome in ('Worked on target system','Worked with limitations','Partial demonstration','Could not demonstrate','Not applicable')),
  method_explanation text not null check (method_explanation in ('Clear and credible','Mostly clear','Limited explanation','Could not explain')),
  evidence_quality text not null check (evidence_quality in ('Strong and traceable','Adequate','Partial','No usable evidence')),
  contribution_verification text not null check (contribution_verification in ('Clearly verified','Partly verified','Needs further evidence','Not verified')),
  report_alignment text not null check (report_alignment in ('Consistent','Minor update needed','Significant update needed','Not checked')),
  teacher_feedback text not null check (char_length(teacher_feedback) between 1 and 800),
  follow_up_status text not null check (follow_up_status in ('Not reviewed','No follow-up needed','Action required','In progress','Recheck next session','Resolved')),
  follow_up_actions text[] not null check (
    cardinality(follow_up_actions) between 1 and 10
    and follow_up_actions <@ array['No action required','Complete implementation','Fix identified issue','Provide code or commit evidence','Add or run tests','Complete integration','Update Progress Report','Clarify individual contribution','Prepare another demonstration','Other']::text[]
  ),
  follow_up_note text check (follow_up_note is null or char_length(follow_up_note) <= 400),
  recheck_week smallint check (recheck_week is null or recheck_week between 2 and 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_progress_reviews_student_id_key unique (student_id)
);
alter table public.teacher_progress_reviews enable row level security;
revoke all on public.teacher_progress_reviews from anon, authenticated;
grant select, insert, update, delete on public.teacher_progress_reviews to authenticated;

drop trigger if exists normalise_teacher_progress_review_id on public.teacher_progress_reviews;
create trigger normalise_teacher_progress_review_id
before insert or update on public.teacher_progress_reviews
for each row execute function public.normalise_student_id();

drop trigger if exists set_teacher_progress_reviews_updated_at on public.teacher_progress_reviews;
create trigger set_teacher_progress_reviews_updated_at
before update on public.teacher_progress_reviews
for each row execute function public.set_updated_at();

drop policy if exists "teachers manage progress reviews" on public.teacher_progress_reviews;
create policy "teachers manage progress reviews" on public.teacher_progress_reviews
for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

-- Verification:
-- 1. anon cannot INSERT or SELECT teacher reviews.
-- 2. authenticated non-teachers receive no rows and cannot mutate.
-- 3. teachers can create, read, update and delete.
-- 4. the same student can submit weekly_engagement_checkouts for week_number 3.
-- Rollback: drop table if exists public.teacher_progress_reviews;
