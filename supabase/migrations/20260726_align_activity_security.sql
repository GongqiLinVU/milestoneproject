-- Align activity-table grants and insert policies with the production frontend.
-- This migration is idempotent and does not delete or rewrite student records.

alter table public.student_checkins enable row level security;
alter table public.week1_pulse enable row level security;
alter table public.team_conversations enable row level security;
alter table public.student_promises enable row level security;
alter table public.poster_reviews enable row level security;

-- Supabase default table grants are broader than this public workflow needs.
-- RLS already blocks unauthorised rows, but explicit least-privilege grants
-- reduce the impact of a future RLS configuration mistake.
revoke all privileges on
  public.student_checkins,
  public.week1_pulse,
  public.team_conversations,
  public.student_promises,
  public.poster_reviews
from anon, authenticated;

grant insert on
  public.student_checkins,
  public.week1_pulse,
  public.team_conversations,
  public.student_promises,
  public.poster_reviews
to anon, authenticated;

grant select on
  public.student_checkins,
  public.week1_pulse,
  public.team_conversations,
  public.student_promises,
  public.poster_reviews
to authenticated;

-- Remove both deployed and earlier repository policy names before recreating
-- one canonical policy per operation.
drop policy if exists "Students can submit check-ins" on public.student_checkins;
drop policy if exists "public can submit checkins" on public.student_checkins;
create policy "Students can submit check-ins"
on public.student_checkins
for insert to anon, authenticated
with check (
  char_length(trim(student_id)) between 3 and 40
  and char_length(trim(student_name)) between 1 and 100
  and team_name ~ '^Team [1-8]$'
  and char_length(trim(goal)) between 1 and 800
);

drop policy if exists "Students can submit class pulse" on public.week1_pulse;
drop policy if exists "public can submit pulse" on public.week1_pulse;
create policy "Students can submit class pulse"
on public.week1_pulse
for insert to anon, authenticated
with check (
  confidence between 1 and 5
  and concern in ('Working product','Documentation','Presentation','Teamwork','Testing','Time')
  and ai_usage in ('Rarely','Weekly','Daily','It is part of almost every task')
);

drop policy if exists "Teams can submit conversations" on public.team_conversations;
drop policy if exists "public can submit team conversation" on public.team_conversations;
create policy "Teams can submit conversations"
on public.team_conversations
for insert to anon, authenticated
with check (
  team_name ~ '^Team [1-8]$'
  and char_length(trim(proudest_achievement)) between 1 and 1200
  and char_length(trim(biggest_delivery_risk)) between 1 and 1200
  and char_length(trim(support_needed)) between 1 and 1200
);

drop policy if exists "Students can submit promises" on public.student_promises;
drop policy if exists "public can submit promises" on public.student_promises;
create policy "Students can submit promises"
on public.student_promises
for insert to anon, authenticated
with check (
  char_length(trim(student_id)) between 3 and 40
  and char_length(trim(student_name)) between 1 and 100
  and team_name ~ '^Team [1-8]$'
  and char_length(trim(promise)) between 1 and 1000
);

drop policy if exists "Students can submit poster reviews" on public.poster_reviews;
drop policy if exists "public can submit reviews" on public.poster_reviews;
create policy "Students can submit poster reviews"
on public.poster_reviews
for insert to anon, authenticated
with check (
  char_length(trim(reviewer_student_id)) between 3 and 40
  and char_length(trim(reviewer_name)) between 1 and 100
  and reviewer_team ~ '^Team [1-8]$'
  and reviewed_team ~ '^Team [1-8]$'
  and lower(trim(reviewer_team)) <> lower(trim(reviewed_team))
  and problem_clarity between 1 and 5
  and working_product between 1 and 5
  and evidence_testing between 1 and 5
  and document_readiness between 1 and 5
  and presentation_quality between 1 and 5
  and char_length(trim(strongest_part)) between 1 and 1000
  and char_length(trim(highest_priority)) between 1 and 1000
);

-- Teacher SELECT policies remain unchanged. They continue to require
-- public.is_teacher() through authenticated JWT app_metadata.

-- Verification:
-- select table_name, grantee, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public'
--   and table_name in (
--     'student_checkins','week1_pulse','team_conversations',
--     'student_promises','poster_reviews'
--   )
--   and grantee in ('anon','authenticated')
-- order by table_name, grantee, privilege_type;

-- Recovery:
-- Re-granting broader privileges is intentionally not automated. If rollback
-- is required, restore the previous policies from a reviewed database backup.
