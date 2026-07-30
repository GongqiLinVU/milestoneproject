-- NIT3004 Engineering Studio Portal
create extension if not exists pgcrypto;

create table if not exists public.portal_health (
  id smallint primary key default 1 check (id = 1),
  status text not null default 'ok'
);
insert into public.portal_health (id, status) values (1, 'ok') on conflict (id) do nothing;

create table if not exists public.activity_settings (
  setting_key text primary key check (setting_key = 'poster_peer_review'),
  is_open boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.activity_settings (setting_key, is_open)
values ('poster_peer_review', false)
on conflict (setting_key) do nothing;

create table if not exists public.student_checkins (
  id uuid primary key default gen_random_uuid(),
  student_id text not null check (char_length(student_id) between 3 and 40),
  student_name text check (student_name is null or char_length(student_name) between 1 and 100),
  team_name text not null check (team_name ~ '^Team [1-8]$'),
  confidence integer check (confidence is null or confidence between 1 and 5),
  current_status text,
  biggest_concern text,
  support_needed text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  goal text check (goal is null or char_length(goal) between 1 and 800),
  unique (student_id)
);

create table if not exists public.week1_pulse (
  id uuid primary key default gen_random_uuid(),
  student_id text,
  team_name text,
  ai_usage text check (ai_usage is null or ai_usage in ('Rarely','Weekly','Daily','It is part of almost every task')),
  confidence integer check (confidence is null or confidence between 1 and 5),
  biggest_concern text,
  expected_outcome text,
  anonymous_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  concern text not null check (concern in ('Working product','Documentation','Presentation','Teamwork','Testing','Time','Not recorded (legacy)'))
);

create table if not exists public.team_conversations (
  id uuid primary key default gen_random_uuid(),
  team_name text not null check (team_name ~ '^Team [1-8]$'),
  proudest_achievement text not null check (char_length(proudest_achievement) between 1 and 1200),
  biggest_delivery_risk text not null check (char_length(biggest_delivery_risk) between 1 and 1200),
  support_needed text check (support_needed is null or char_length(support_needed) between 1 and 1200),
  submitted_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_name)
);

create table if not exists public.student_promises (
  id uuid primary key default gen_random_uuid(),
  student_id text not null check (char_length(student_id) between 3 and 40),
  student_name text check (student_name is null or char_length(student_name) between 1 and 100),
  team_name text check (team_name is null or team_name ~ '^Team [1-8]$'),
  promise text not null check (char_length(promise) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id)
);

create table if not exists public.poster_reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_name text check (reviewer_name is null or char_length(reviewer_name) between 1 and 100),
  reviewer_student_id text not null check (char_length(reviewer_student_id) between 3 and 40),
  reviewer_team text not null check (reviewer_team ~ '^Team [1-8]$'),
  reviewed_team text not null check (reviewed_team ~ '^Team [1-8]$'),
  problem_clarity integer not null check (problem_clarity between 1 and 5),
  working_product integer not null check (working_product between 1 and 5),
  evidence_testing integer not null check (evidence_testing between 1 and 5),
  document_readiness integer not null check (document_readiness between 1 and 5),
  presentation_quality integer not null check (presentation_quality between 1 and 5),
  strongest_part text not null check (char_length(strongest_part) between 1 and 1000),
  highest_priority text not null check (char_length(highest_priority) between 1 and 1000),
  additional_feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lower(trim(reviewer_team)) <> lower(trim(reviewed_team))),
  unique (reviewer_student_id, reviewed_team)
);

create or replace function public.normalise_student_id() returns trigger language plpgsql as $$
begin new.student_id := lower(trim(new.student_id)); return new; end; $$;
create or replace function public.normalise_reviewer_student_id() returns trigger language plpgsql as $$
begin new.reviewer_student_id := lower(trim(new.reviewer_student_id)); return new; end; $$;
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists normalise_student_checkin_id on public.student_checkins;
create trigger normalise_student_checkin_id before insert or update on public.student_checkins for each row execute function public.normalise_student_id();
drop trigger if exists normalise_week1_pulse_id on public.week1_pulse;
create trigger normalise_week1_pulse_id before insert or update on public.week1_pulse for each row execute function public.normalise_student_id();
drop trigger if exists normalise_student_promise_id on public.student_promises;
create trigger normalise_student_promise_id before insert or update on public.student_promises for each row execute function public.normalise_student_id();
drop trigger if exists normalise_poster_reviewer_id on public.poster_reviews;
create trigger normalise_poster_reviewer_id before insert or update on public.poster_reviews for each row execute function public.normalise_reviewer_student_id();

drop trigger if exists set_student_checkins_updated_at on public.student_checkins;
create trigger set_student_checkins_updated_at before update on public.student_checkins for each row execute function public.set_updated_at();
drop trigger if exists set_week1_pulse_updated_at on public.week1_pulse;
create trigger set_week1_pulse_updated_at before update on public.week1_pulse for each row execute function public.set_updated_at();
drop trigger if exists set_team_conversations_updated_at on public.team_conversations;
create trigger set_team_conversations_updated_at before update on public.team_conversations for each row execute function public.set_updated_at();
drop trigger if exists set_student_promises_updated_at on public.student_promises;
create trigger set_student_promises_updated_at before update on public.student_promises for each row execute function public.set_updated_at();
drop trigger if exists set_poster_reviews_updated_at on public.poster_reviews;
create trigger set_poster_reviews_updated_at before update on public.poster_reviews for each row execute function public.set_updated_at();
drop trigger if exists set_activity_settings_updated_at on public.activity_settings;
create trigger set_activity_settings_updated_at before update on public.activity_settings for each row execute function public.set_updated_at();

alter table public.portal_health enable row level security;
alter table public.activity_settings enable row level security;
alter table public.student_checkins enable row level security;
alter table public.week1_pulse enable row level security;
alter table public.team_conversations enable row level security;
alter table public.student_promises enable row level security;
alter table public.poster_reviews enable row level security;

create policy "public can read portal health" on public.portal_health for select to anon, authenticated using (true);
create policy "Public can read peer review state" on public.activity_settings for select to anon, authenticated using (setting_key = 'poster_peer_review');
create policy "Students can submit check-ins" on public.student_checkins for insert to anon, authenticated with check (
  char_length(trim(student_id)) between 3 and 40
  and char_length(trim(student_name)) between 1 and 100
  and team_name ~ '^Team [1-8]$'
  and char_length(trim(goal)) between 1 and 800
);
create policy "Students can submit class pulse" on public.week1_pulse for insert to anon, authenticated with check (
  confidence between 1 and 5
  and concern in ('Working product','Documentation','Presentation','Teamwork','Testing','Time')
  and ai_usage in ('Rarely','Weekly','Daily','It is part of almost every task')
);
create policy "Teams can submit conversations" on public.team_conversations for insert to anon, authenticated with check (
  team_name ~ '^Team [1-8]$'
  and char_length(trim(proudest_achievement)) between 1 and 1200
  and char_length(trim(biggest_delivery_risk)) between 1 and 1200
  and char_length(trim(support_needed)) between 1 and 1200
);
create policy "Students can submit promises" on public.student_promises for insert to anon, authenticated with check (
  char_length(trim(student_id)) between 3 and 40
  and char_length(trim(student_name)) between 1 and 100
  and team_name ~ '^Team [1-8]$'
  and char_length(trim(promise)) between 1 and 1000
);
create policy "Students can submit poster reviews" on public.poster_reviews for insert to anon, authenticated with check (
  exists (
    select 1 from public.activity_settings
    where setting_key = 'poster_peer_review' and is_open
  )
  and char_length(trim(reviewer_student_id)) between 3 and 40
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

create or replace function public.is_teacher() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher', false);
$$;
create policy "Teachers can update peer review state" on public.activity_settings for update to authenticated
using (setting_key = 'poster_peer_review' and public.is_teacher())
with check (setting_key = 'poster_peer_review' and public.is_teacher());
create policy "Teachers can read check-ins" on public.student_checkins for select to authenticated using (public.is_teacher());
create policy "Teachers can read class pulse" on public.week1_pulse for select to authenticated using (public.is_teacher());
create policy "Teachers can read conversations" on public.team_conversations for select to authenticated using (public.is_teacher());
create policy "Teachers can read promises" on public.student_promises for select to authenticated using (public.is_teacher());
create policy "Teachers can read poster reviews" on public.poster_reviews for select to authenticated using (public.is_teacher());
create policy "Teachers can update check-ins" on public.student_checkins for update to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy "Teachers can delete check-ins" on public.student_checkins for delete to authenticated using (public.is_teacher());
create policy "Teachers can update conversations" on public.team_conversations for update to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy "Teachers can delete conversations" on public.team_conversations for delete to authenticated using (public.is_teacher());
create policy "Teachers can update promises" on public.student_promises for update to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy "Teachers can delete promises" on public.student_promises for delete to authenticated using (public.is_teacher());
create policy "Teachers can update poster reviews" on public.poster_reviews for update to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy "Teachers can delete poster reviews" on public.poster_reviews for delete to authenticated using (public.is_teacher());

grant select on public.portal_health to anon, authenticated;
grant select on public.activity_settings to anon, authenticated;
grant update on public.activity_settings to authenticated;
revoke all privileges on public.student_checkins, public.week1_pulse, public.team_conversations, public.student_promises, public.poster_reviews from anon, authenticated;
grant insert on public.student_checkins, public.week1_pulse, public.team_conversations, public.student_promises, public.poster_reviews to anon, authenticated;
grant select on public.student_checkins, public.week1_pulse, public.team_conversations, public.student_promises, public.poster_reviews to authenticated;
grant update, delete on public.student_checkins, public.team_conversations, public.student_promises, public.poster_reviews to authenticated;


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



-- Sprint 3 Phase 2: Week 2 individual progress review
create table if not exists public.week2_progress_reviews (
  id uuid primary key default gen_random_uuid(),
  student_name text not null check (char_length(student_name) between 1 and 100),
  student_id text not null,
  team_name text not null check (team_name ~ '^Team [1-8]
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

-- Verification: anon INSERT only; teacher manage through is_teacher().
-- Rollback: drop table if exists public.week2_progress_reviews;


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
),
  project_name text check (project_name is null or char_length(trim(project_name)) between 1 and 120),
  project_area text check (project_area is null or project_area in ('Web','Mobile','AI','Data','IoT','Cybersecurity','Game','Other')),
  project_description text check (project_description is null or char_length(trim(project_description)) between 1 and 300),
  target_user_problem text check (target_user_problem is null or char_length(trim(target_user_problem)) <= 150),
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

-- Verification: anon INSERT only; teacher manage through is_teacher().
-- Rollback: drop table if exists public.week2_progress_reviews;


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
