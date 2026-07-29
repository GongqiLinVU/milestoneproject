-- Sprint 3 Phase 3: teacher review outcomes and Week 3 engagement
-- Week 3 engagement uses the existing weekly_engagement_checkouts table.

create table if not exists public.teacher_progress_reviews (
  id uuid primary key default gen_random_uuid(),
  student_name text not null check (char_length(student_name) between 1 and 100),
  student_id text not null,
  team_name text not null check (team_name ~ '^Team [1-8]$'),
  claim_status text not null check (claim_status in ('Verified','Partially verified','Not demonstrated','Different from pre-check')),
  demonstration_outcome text not null check (demonstration_outcome in ('Worked on target system','Worked with limitations','Partial demonstration','Could not demonstrate','Not applicable')),
  method_explanation text not null check (method_explanation in ('Clear and credible','Mostly clear','Limited explanation','Could not explain')),
  evidence_quality text not null check (evidence_quality in ('Strong and traceable','Adequate','Partial','No usable evidence')),
  contribution_verification text not null check (contribution_verification in ('Clearly verified','Partly verified','Needs further evidence','Not verified')),
  report_alignment text not null check (report_alignment in ('Consistent','Minor update needed','Significant update needed','Not checked')),
  follow_up_priority text not null check (follow_up_priority in ('No follow-up','Implementation','Integration','Testing','Evidence','Documentation','Team contribution','Urgent intervention')),
  teacher_note text check (teacher_note is null or char_length(teacher_note) <= 400),
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
