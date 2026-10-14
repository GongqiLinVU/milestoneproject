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
  week_number smallint not null check (week_number between 1 and 4),
  student_name text not null check (char_length(student_name) between 1 and 100),
  student_id text not null,
  team_name text not null check (team_name ~ '^Team [1-8]$'),
  participation_mode text not null,
  weekly_status text,
  support_need text,
  project_access text,
  team_continuity text,
  remaining_work_clarity text,
  implementation_progress text,
  evidence_readiness text,
  demo_readiness text,
  product_readiness text,
  testing_readiness text,
  report_readiness text,
  presentation_readiness text,
  demo_backup_readiness text,
  speaking_role_readiness text,
  final_submission_status text,
  time_invested text,
  contribution_areas text[] check (contribution_areas is null or cardinality(contribution_areas) > 0),
  task_completion text,
  evidence_status text,
  team_communication text,
  participation_balance text,
  next_task_clarity text,
  work_status text,
  discussion_focus text,
  detail_note text check (detail_note is null or char_length(detail_note) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_engagement_student_week_key unique (student_id, week_number),
  constraint weekly_engagement_new_journey_check check (
    (weekly_status is null and time_invested is not null)
    or
    (
      week_number between 1 and 3
      and weekly_status is not null
      and support_need is not null
      and case week_number
        when 1 then project_access is not null and team_continuity is not null and remaining_work_clarity is not null
        when 2 then implementation_progress is not null and evidence_readiness is not null and demo_readiness is not null
        when 3 then product_readiness is not null and testing_readiness is not null and report_readiness is not null and presentation_readiness is not null
        else false
      end
    )
    or
    (
      week_number = 4
      and presentation_readiness is not null
      and demo_backup_readiness is not null
      and speaking_role_readiness is not null
      and final_submission_status is not null
    )
  )
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


-- Sprint 3 Phase 3C-2: block-scoped roster and private team lookup

create table if not exists public.student_roster (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.teaching_blocks(id) on delete cascade,
  student_id text not null check (char_length(trim(student_id)) between 3 and 40),
  full_name text not null check (char_length(trim(full_name)) between 1 and 100),
  preferred_name text check (preferred_name is null or char_length(trim(preferred_name)) between 1 and 60),
  vu_email text not null check (char_length(trim(vu_email)) between 5 and 160),
  team_number smallint not null check (team_number between 1 and 8),
  project_name text check (project_name is null or char_length(trim(project_name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (block_id, student_id),
  unique (block_id, vu_email)
);

create or replace function public.normalise_roster_identity()
returns trigger language plpgsql set search_path = public as $$
begin
  new.student_id := lower(trim(new.student_id));
  new.vu_email := lower(trim(new.vu_email));
  new.full_name := trim(new.full_name);
  new.preferred_name := nullif(trim(new.preferred_name), '');
  new.project_name := nullif(trim(new.project_name), '');
  return new;
end;
$$;

drop trigger if exists normalise_student_roster_identity on public.student_roster;
create trigger normalise_student_roster_identity
before insert or update on public.student_roster
for each row execute function public.normalise_roster_identity();

drop trigger if exists set_student_roster_updated_at on public.student_roster;
create trigger set_student_roster_updated_at
before update on public.student_roster
for each row execute function public.set_updated_at();

create index if not exists student_roster_block_team_idx
on public.student_roster (block_id, team_number);

alter table public.student_roster enable row level security;
revoke all on public.student_roster from anon, authenticated;
grant select, insert, update, delete on public.student_roster to authenticated;

drop policy if exists "teachers manage block roster" on public.student_roster;
create policy "teachers manage block roster"
on public.student_roster for all to authenticated
using (public.is_teacher())
with check (public.is_teacher());

-- Server-only audit data used by /api/find-my-team for rate limiting.
create table if not exists public.team_lookup_attempts (
  id bigint generated always as identity primary key,
  requester_hash text not null,
  identity_hash text not null,
  succeeded boolean not null default false,
  attempted_at timestamptz not null default now()
);
create index if not exists team_lookup_attempts_rate_idx
on public.team_lookup_attempts (requester_hash, attempted_at desc);
alter table public.team_lookup_attempts enable row level security;
revoke all on public.team_lookup_attempts from anon, authenticated;

-- Verification:
-- 1. Teacher can CRUD roster rows only for authenticated teacher sessions.
-- 2. anon/authenticated non-teacher cannot read roster rows.
-- 3. the same Student ID/email can be reused in a different block.
-- 4. duplicate Student ID or email inside one block fails.
-- 5. service-role lookup returns only the matched team and teammate names.
-- 6. audit rows are inaccessible to browser roles.

-- Identified student activities derive their team from the private roster.
create or replace function public.assign_activity_team_from_roster()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id text;
  v_team_name text;
  v_team_column text;
begin
  v_student_id := lower(trim(
    case
      when tg_table_name = 'poster_reviews'
        then to_jsonb(new) ->> 'reviewer_student_id'
      else to_jsonb(new) ->> 'student_id'
    end
  ));

  select concat('Team ', roster.team_number)
  into v_team_name
  from public.student_roster roster
  where roster.block_id = new.block_id
    and roster.student_id = v_student_id
  limit 1;

  if v_team_name is null then
    raise exception using
      errcode = 'P0001',
      message = 'Student ID is not present in the selected teaching block roster';
  end if;

  v_team_column := case
    when tg_table_name = 'poster_reviews' then 'reviewer_team'
    else 'team_name'
  end;

  new := jsonb_populate_record(
    new,
    jsonb_build_object(v_team_column, v_team_name)
  );
  return new;
end;
$$;

revoke all on function public.assign_activity_team_from_roster() from public;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'student_checkins',
    'team_health_checks',
    'weekly_engagement_checkouts',
    'week2_progress_reviews',
    'poster_reviews'
  ]
  loop
    execute format(
      'drop trigger if exists assign_activity_team_from_roster on public.%I',
      table_name
    );
    execute format(
      'create trigger assign_activity_team_from_roster
       before insert on public.%I
       for each row execute function public.assign_activity_team_from_roster()',
      table_name
    );
  end loop;
end $$;

comment on function public.assign_activity_team_from_roster() is
'Assigns team_name/reviewer_team from the private block roster before identified student activity inserts.';
-- Sprint 4 Phase 1: rollout-safe Team & Project foundation
--
-- Current 2026 · 2B1 remains teacher_assigned. Future blocks may opt into
-- student_selection without exposing the private roster to browser roles.

alter table public.teaching_blocks
  add column if not exists project_setup_mode text not null default 'teacher_assigned';

alter table public.teaching_blocks
  drop constraint if exists teaching_blocks_project_setup_mode_check;
alter table public.teaching_blocks
  add constraint teaching_blocks_project_setup_mode_check
  check (project_setup_mode in ('teacher_assigned', 'student_selection'));

update public.teaching_blocks
set project_setup_mode = 'teacher_assigned'
where academic_year = 2026 and block_code = '2B1';

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.teaching_blocks(id) on delete cascade,
  team_number smallint not null check (team_number between 1 and 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (block_id, team_number)
);

insert into public.teams (block_id, team_number)
select distinct block_id, team_number
from public.student_roster
on conflict (block_id, team_number) do nothing;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.teaching_blocks(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 120),
  problem text not null check (char_length(trim(problem)) between 2 and 600),
  target_users text not null check (char_length(trim(target_users)) between 2 and 300),
  description text not null check (char_length(trim(description)) between 2 and 1200),
  expected_outcomes text check (
    expected_outcomes is null or char_length(trim(expected_outcomes)) between 2 and 600
  ),
  category text not null default 'Other'
    check (category in ('Web','Mobile','AI','Data','IoT','Cybersecurity','Game','Other')),
  difficulty text not null default 'Standard'
    check (difficulty in ('Foundation','Standard','Advanced')),
  status text not null default 'draft'
    check (status in ('draft','published','archived')),
  source text not null default 'teacher'
    check (source in ('teacher','student_proposal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (block_id, title)
);

create table if not exists public.team_project_assignments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete restrict,
  selection_status text not null default 'teacher_confirmed'
    check (selection_status in ('student_selected','teacher_confirmed')),
  selected_by_student_id text,
  confirmed_at timestamptz,
  origin_unit text not null default 'NIT3004'
    check (origin_unit in ('NIT3003', 'NIT3004')),
  continued_from_previous_unit boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id)
);

create table if not exists public.project_proposals (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  submitted_by_student_id text not null
    check (char_length(trim(submitted_by_student_id)) between 3 and 40),
  title text not null check (char_length(trim(title)) between 2 and 120),
  problem text not null check (char_length(trim(problem)) between 2 and 600),
  target_users text not null check (char_length(trim(target_users)) between 2 and 300),
  proposed_solution text not null
    check (char_length(trim(proposed_solution)) between 2 and 800),
  category text not null default 'Other'
    check (category in ('Web','Mobile','AI','Data','IoT','Cybersecurity','Game','Other')),
  note text check (note is null or char_length(trim(note)) <= 300),
  status text not null default 'submitted'
    check (status in ('submitted','changes_requested','approved','rejected')),
  teacher_note text check (
    teacher_note is null or char_length(trim(teacher_note)) <= 500
  ),
  approved_project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teams_block_idx on public.teams (block_id);
create index if not exists projects_block_status_idx
  on public.projects (block_id, status);
create index if not exists project_proposals_team_status_idx
  on public.project_proposals (team_id, status);

drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at before update on public.teams
for each row execute function public.set_updated_at();
drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at before update on public.projects
for each row execute function public.set_updated_at();
drop trigger if exists set_team_project_assignments_updated_at
  on public.team_project_assignments;
create trigger set_team_project_assignments_updated_at
before update on public.team_project_assignments
for each row execute function public.set_updated_at();
drop trigger if exists set_project_proposals_updated_at on public.project_proposals;
create trigger set_project_proposals_updated_at before update on public.project_proposals
for each row execute function public.set_updated_at();

-- Keep Team identities in sync with roster additions and team changes.
create or replace function public.ensure_roster_team()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.teams (block_id, team_number)
  values (new.block_id, new.team_number)
  on conflict (block_id, team_number) do nothing;
  return new;
end;
$$;

revoke all on function public.ensure_roster_team() from public;
drop trigger if exists ensure_roster_team on public.student_roster;
create trigger ensure_roster_team
after insert or update of block_id, team_number on public.student_roster
for each row execute function public.ensure_roster_team();

-- Preserve existing roster project names as teacher-created catalogue entries
-- and confirmed team assignments. Blank and inconsistent names are ignored.
insert into public.projects (
  block_id, title, problem, target_users, description, status, source
)
select
  roster.block_id,
  trim(roster.project_name),
  'Project details to be completed by the teacher.',
  'To be confirmed',
  'Imported from the existing teaching roster.',
  'published',
  'teacher'
from public.student_roster roster
where nullif(trim(roster.project_name), '') is not null
group by roster.block_id, trim(roster.project_name)
on conflict (block_id, title) do nothing;

insert into public.team_project_assignments (
  team_id, project_id, selection_status, confirmed_at
)
select
  team.id,
  min(project.id::text)::uuid,
  'teacher_confirmed',
  now()
from public.teams team
join public.student_roster roster
  on roster.block_id = team.block_id
 and roster.team_number = team.team_number
join public.projects project
  on project.block_id = roster.block_id
 and project.title = trim(roster.project_name)
where nullif(trim(roster.project_name), '') is not null
group by team.id
on conflict (team_id) do nothing;

-- Activities store the project identity at submission time. Existing evidence
-- stays null and is not rewritten.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'student_checkins',
    'team_health_checks',
    'weekly_engagement_checkouts',
    'week2_progress_reviews',
    'poster_reviews'
  ]
  loop
    execute format(
      'alter table public.%I add column if not exists project_id uuid references public.projects(id) on delete set null',
      table_name
    );
    execute format(
      'create index if not exists %I on public.%I (project_id)',
      table_name || '_project_id_idx',
      table_name
    );
  end loop;
end $$;

create or replace function public.assign_activity_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id text;
  v_project_id uuid;
  v_project public.projects;
begin
  v_student_id := lower(trim(
    case
      when tg_table_name = 'poster_reviews'
        then to_jsonb(new) ->> 'reviewer_student_id'
      else to_jsonb(new) ->> 'student_id'
    end
  ));

  select assignment.project_id
    into v_project_id
  from public.student_roster roster
  join public.teams team
    on team.block_id = roster.block_id
   and team.team_number = roster.team_number
  join public.team_project_assignments assignment on assignment.team_id = team.id
  where roster.block_id = new.block_id
    and roster.student_id = v_student_id
  limit 1;

  new := jsonb_populate_record(
    new,
    jsonb_build_object('project_id', v_project_id)
  );
  if tg_table_name = 'week2_progress_reviews' and v_project_id is null then
    raise exception using errcode = 'P0001',
      message = 'The student team does not have a current project';
  end if;
  if tg_table_name = 'week2_progress_reviews' then
    select * into v_project from public.projects where id = v_project_id;
    new := jsonb_populate_record(
      new,
      jsonb_build_object(
        'project_name', v_project.title,
        'project_area', v_project.category,
        'project_description', left(v_project.description, 300),
        'target_user_problem', left(
          concat(v_project.target_users, ' · ', v_project.problem),
          150
        )
      )
    );
  end if;
  return new;
end;
$$;

revoke all on function public.assign_activity_project() from public;
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'student_checkins',
    'team_health_checks',
    'weekly_engagement_checkouts',
    'week2_progress_reviews',
    'poster_reviews'
  ]
  loop
    execute format(
      'drop trigger if exists assign_activity_project on public.%I',
      table_name
    );
    execute format(
      'create trigger assign_activity_project before insert on public.%I
       for each row execute function public.assign_activity_project()',
      table_name
    );
  end loop;
end $$;

-- Student-safe context. It reveals only the matched student's team, current
-- assignment and the active block's published catalogue.
create or replace function public.get_project_checkin_context(p_student_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_block public.teaching_blocks;
  v_team public.teams;
  v_assignment public.team_project_assignments;
  v_project public.projects;
begin
  select * into v_block
  from public.teaching_blocks
  where status = 'active'
  limit 1;

  select team.* into v_team
  from public.student_roster roster
  join public.teams team
    on team.block_id = roster.block_id
   and team.team_number = roster.team_number
  where roster.block_id = v_block.id
    and roster.student_id = lower(trim(p_student_id))
  limit 1;

  if v_team.id is null then
    raise exception using
      errcode = 'P0001',
      message = 'Student ID is not present in the active teaching block roster';
  end if;

  select * into v_assignment
  from public.team_project_assignments
  where team_id = v_team.id;

  if v_assignment.project_id is not null then
    select * into v_project from public.projects
    where id = v_assignment.project_id;
  end if;

  return jsonb_build_object(
    'blockId', v_block.id,
    'blockLabel', concat(v_block.academic_year, ' · ', v_block.block_code),
    'setupMode', v_block.project_setup_mode,
    'teamId', v_team.id,
    'teamName', concat('Team ', v_team.team_number),
    'assignmentStatus', v_assignment.selection_status,
    'project', case when v_project.id is null then null else jsonb_build_object(
      'id', v_project.id,
      'title', v_project.title,
      'problem', v_project.problem,
      'targetUsers', v_project.target_users,
      'description', v_project.description,
      'category', v_project.category,
      'difficulty', v_project.difficulty
    ) end,
    'availableProjects', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', project.id,
        'title', project.title,
        'problem', project.problem,
        'targetUsers', project.target_users,
        'description', project.description,
        'category', project.category,
        'difficulty', project.difficulty
      ) order by project.title)
      from public.projects project
      where project.block_id = v_block.id
        and project.status = 'published'
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_project_checkin_context(text) from public;
grant execute on function public.get_project_checkin_context(text)
  to anon, authenticated;

create or replace function public.select_team_project(
  p_student_id text,
  p_project_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_block public.teaching_blocks;
  v_team public.teams;
  v_existing public.team_project_assignments;
begin
  select * into v_block from public.teaching_blocks
  where status = 'active' limit 1 for share;

  if v_block.project_setup_mode <> 'student_selection' then
    raise exception using errcode = 'P0001',
      message = 'Projects are assigned by the teacher for this teaching block';
  end if;

  select team.* into v_team
  from public.student_roster roster
  join public.teams team
    on team.block_id = roster.block_id
   and team.team_number = roster.team_number
  where roster.block_id = v_block.id
    and roster.student_id = lower(trim(p_student_id))
  limit 1;

  if v_team.id is null then
    raise exception using errcode = 'P0001',
      message = 'Student ID is not present in the active teaching block roster';
  end if;

  if not exists (
    select 1 from public.projects
    where id = p_project_id
      and block_id = v_block.id
      and status = 'published'
  ) then
    raise exception using errcode = 'P0001',
      message = 'That project is not available in this teaching block';
  end if;

  select * into v_existing
  from public.team_project_assignments
  where team_id = v_team.id
  for update;

  if v_existing.selection_status = 'teacher_confirmed' then
    raise exception using errcode = 'P0001',
      message = 'This team project has been confirmed by the teacher';
  end if;

  insert into public.team_project_assignments (
    team_id, project_id, selection_status, selected_by_student_id
  )
  values (
    v_team.id, p_project_id, 'student_selected', lower(trim(p_student_id))
  )
  on conflict (team_id) do update
  set project_id = excluded.project_id,
      selected_by_student_id = excluded.selected_by_student_id,
      selection_status = 'student_selected',
      confirmed_at = null;

  return public.get_project_checkin_context(p_student_id);
end;
$$;

revoke all on function public.select_team_project(text, uuid) from public;
grant execute on function public.select_team_project(text, uuid)
  to anon, authenticated;

create or replace function public.submit_team_project_proposal(
  p_student_id text,
  p_title text,
  p_problem text,
  p_target_users text,
  p_proposed_solution text,
  p_category text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_block public.teaching_blocks;
  v_team_id uuid;
  v_proposal_id uuid;
begin
  select * into v_block from public.teaching_blocks
  where status = 'active' limit 1;

  if v_block.project_setup_mode <> 'student_selection' then
    raise exception using errcode = 'P0001',
      message = 'Project proposals are not open for this teaching block';
  end if;

  select team.id into v_team_id
  from public.student_roster roster
  join public.teams team
    on team.block_id = roster.block_id
   and team.team_number = roster.team_number
  where roster.block_id = v_block.id
    and roster.student_id = lower(trim(p_student_id))
  limit 1;

  if v_team_id is null then
    raise exception using errcode = 'P0001',
      message = 'Student ID is not present in the active teaching block roster';
  end if;

  if exists (
    select 1 from public.project_proposals
    where team_id = v_team_id
      and status in ('submitted','changes_requested')
  ) then
    raise exception using errcode = '23505',
      message = 'This team already has an active project proposal';
  end if;

  insert into public.project_proposals (
    team_id, submitted_by_student_id, title, problem, target_users,
    proposed_solution, category, note
  ) values (
    v_team_id, lower(trim(p_student_id)), trim(p_title), trim(p_problem),
    trim(p_target_users), trim(p_proposed_solution), p_category,
    nullif(trim(p_note), '')
  )
  returning id into v_proposal_id;

  return v_proposal_id;
end;
$$;

revoke all on function public.submit_team_project_proposal(
  text, text, text, text, text, text, text
) from public;
grant execute on function public.submit_team_project_proposal(
  text, text, text, text, text, text, text
) to anon, authenticated;

-- Keep Find My Team on the new assignment source instead of the deprecated
-- per-student roster project_name.
create or replace function public.find_student_team(
  p_student_id text,
  p_requester_hash text,
  p_identity_hash text
)
returns table (
  outcome text,
  block_label text,
  team_label text,
  project_name text,
  teammates text[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id text := lower(trim(coalesce(p_student_id, '')));
  v_block public.teaching_blocks%rowtype;
  v_student public.student_roster%rowtype;
  v_attempt_count integer;
  v_project_name text;
begin
  if char_length(v_student_id) < 3 or char_length(v_student_id) > 40 then
    return query select 'not_found'::text, null::text, null::text, null::text, null::text[];
    return;
  end if;
  if p_requester_hash !~ '^[0-9a-f]{64}$'
     or p_identity_hash !~ '^[0-9a-f]{64}$' then
    return query select 'unavailable'::text, null::text, null::text, null::text, null::text[];
    return;
  end if;
  select count(*)::integer into v_attempt_count
  from public.team_lookup_attempts
  where requester_hash = p_requester_hash
    and attempted_at >= now() - interval '15 minutes';
  if v_attempt_count >= 5 then
    return query select 'rate_limited'::text, null::text, null::text, null::text, null::text[];
    return;
  end if;
  select * into v_block from public.teaching_blocks
  where status = 'active'
  order by starts_on desc nulls last, created_at desc limit 1;
  if v_block.id is null then
    return query select 'no_active_block'::text, null::text, null::text, null::text, null::text[];
    return;
  end if;
  select * into v_student from public.student_roster
  where block_id = v_block.id and student_id = v_student_id limit 1;
  insert into public.team_lookup_attempts (
    requester_hash, identity_hash, succeeded
  ) values (
    p_requester_hash, p_identity_hash, v_student.id is not null
  );
  if v_student.id is null then
    return query select 'not_found'::text, null::text, null::text, null::text, null::text[];
    return;
  end if;
  select project.title into v_project_name
  from public.teams team
  join public.team_project_assignments assignment on assignment.team_id = team.id
  join public.projects project on project.id = assignment.project_id
  where team.block_id = v_block.id
    and team.team_number = v_student.team_number
  limit 1;
  return query
  select
    'found'::text,
    concat(v_block.academic_year, ' · ', v_block.block_code)::text,
    concat('Team ', v_student.team_number)::text,
    v_project_name,
    coalesce(
      array_agg(coalesce(member.preferred_name, member.full_name)
        order by member.full_name)
        filter (where member.id <> v_student.id),
      array[]::text[]
    )
  from public.student_roster member
  where member.block_id = v_block.id
    and member.team_number = v_student.team_number;
end;
$$;

revoke all on function public.find_student_team(text, text, text) from public;
grant execute on function public.find_student_team(text, text, text) to anon;

-- Sprint 5 Phase 2 student authentication is applied by:
-- supabase/migrations/20260731_sprint5_phase2_student_auth.sql
-- Keep this marker aligned with the idempotent migration; production rollout
-- applies the migration before deploying the Phase 2 frontend and endpoints.

-- Sprint 6 Phase 2A Session Journey is applied by:
-- supabase/migrations/20260805_sprint6_phase2a_session_journey.sql
-- It adds stable S1-S10 curriculum identity and the authenticated student
-- Session Journey RPC while preserving attendance authority. Weekly Activities
-- remain independent and are not mapped into Session Check-in.

-- Sprint 5 Phase 3 authenticated session check-in is applied by:
-- supabase/migrations/20260731_sprint5_phase3_session_portal.sql
-- The migration creates teacher-opened studio sessions, student attendance
-- evidence, role-scoped RLS and authenticated student RPCs. Its latest
-- idempotent form also adds scheduled start/end windows, the student session
-- history RPC and full Project Catalogue fields in student context.

alter table public.teams enable row level security;
alter table public.projects enable row level security;
alter table public.team_project_assignments enable row level security;
alter table public.project_proposals enable row level security;

revoke all on public.teams, public.projects,
  public.team_project_assignments, public.project_proposals
from anon, authenticated;
grant select, insert, update, delete on public.teams, public.projects,
  public.team_project_assignments, public.project_proposals
to authenticated;

drop policy if exists "teachers manage teams" on public.teams;
create policy "teachers manage teams" on public.teams
for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
drop policy if exists "teachers manage projects" on public.projects;
create policy "teachers manage projects" on public.projects
for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
drop policy if exists "teachers manage team projects"
  on public.team_project_assignments;
create policy "teachers manage team projects" on public.team_project_assignments
for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
drop policy if exists "teachers manage project proposals" on public.project_proposals;
create policy "teachers manage project proposals" on public.project_proposals
for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

-- Verification:
-- 1. 2026 · 2B1 is teacher_assigned.
-- 2. SELECT count(*) FROM teams matches distinct block/team pairs in roster.
-- 3. Existing nonblank roster project names have a project and assignment.
-- 4. anon cannot SELECT teams, roster, assignments or proposals directly.
-- 5. get_project_checkin_context returns only the matched team and published
--    catalogue; an unmatched Student ID raises P0001.
-- 6. select_team_project is rejected in teacher_assigned mode and can only
--    select a published project from the active block in student_selection.
-- 7. a teacher-confirmed assignment cannot be overwritten by a student RPC.
-- 8. identified activity inserts store the team's current project_id.
--
-- Rollback guidance:
-- Set every block to teacher_assigned and revoke the three student RPCs first.
-- Do not drop project_id after submissions use it. The new tables may be
-- dropped only before project data or new-block submissions enter production.

-- Sprint 5 Phase 4A: block-based weekly activity activation.

create table if not exists public.weekly_activity_settings (
  block_id uuid not null references public.teaching_blocks(id) on delete cascade,
  week_number smallint not null check (week_number between 1 and 4),
  is_open boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (block_id, week_number)
);

insert into public.weekly_activity_settings (block_id, week_number, is_open)
select block.id, week_number, false
from public.teaching_blocks block
cross join generate_series(1, 4) as week_number
on conflict (block_id, week_number) do nothing;

create or replace function public.prepare_weekly_activity_settings()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.weekly_activity_settings (block_id, week_number)
  select new.id, generate_series(1, 4)
  on conflict (block_id, week_number) do nothing;
  return new;
end;
$$;
drop trigger if exists prepare_weekly_activity_settings on public.teaching_blocks;
create trigger prepare_weekly_activity_settings after insert on public.teaching_blocks
for each row execute function public.prepare_weekly_activity_settings();

drop trigger if exists set_weekly_activity_settings_updated_at on public.weekly_activity_settings;
create trigger set_weekly_activity_settings_updated_at before update on public.weekly_activity_settings
for each row execute function public.set_updated_at();

alter table public.weekly_activity_settings enable row level security;
revoke all on public.weekly_activity_settings from anon, authenticated;
grant select, update on public.weekly_activity_settings to authenticated;

drop policy if exists "teachers manage weekly activity settings" on public.weekly_activity_settings;
create policy "teachers manage weekly activity settings" on public.weekly_activity_settings
for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

create or replace function public.get_my_weekly_activity_states()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_block_id uuid;
begin
  select roster.block_id into v_block_id
  from public.student_accounts account
  join public.student_roster roster on roster.student_id = account.student_id
  join public.teaching_blocks block on block.id = roster.block_id
  where account.auth_user_id = auth.uid() and account.status = 'activated' and block.status = 'active'
  order by block.starts_on desc nulls last limit 1;
  if v_block_id is null then
    raise exception using errcode = 'P0001', message = 'Active student block is not available';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('weekNumber', week_number, 'isOpen', is_open) order by week_number)
    from public.weekly_activity_settings where block_id = v_block_id), '[]'::jsonb);
end;
$$;
revoke all on function public.get_my_weekly_activity_states() from public;
grant execute on function public.get_my_weekly_activity_states() to authenticated;

create or replace function public.student_can_submit_week(p_block_id uuid, p_week smallint)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.student_accounts account
    join public.student_roster roster on roster.student_id = account.student_id and roster.block_id = p_block_id
    join public.weekly_activity_settings setting on setting.block_id = roster.block_id and setting.week_number = p_week
    where account.auth_user_id = auth.uid() and account.status = 'activated' and setting.is_open
  );
$$;
revoke all on function public.student_can_submit_week(uuid, smallint) from public;
grant execute on function public.student_can_submit_week(uuid, smallint) to authenticated;

revoke insert on public.team_health_checks, public.weekly_engagement_checkouts, public.week2_progress_reviews, public.poster_reviews from anon;

drop policy if exists "students create team health" on public.team_health_checks;
create policy "students create team health" on public.team_health_checks for insert to authenticated
with check (public.student_can_submit_week(block_id, 1));

drop policy if exists "students create engagement checkout" on public.weekly_engagement_checkouts;
create policy "students create engagement checkout" on public.weekly_engagement_checkouts for insert to authenticated
with check (public.student_can_submit_week(block_id, week_number));

drop policy if exists "students create week2 progress" on public.week2_progress_reviews;
create policy "students create week2 progress" on public.week2_progress_reviews for insert to authenticated
with check (public.student_can_submit_week(block_id, 2));

drop policy if exists "Students can submit poster reviews" on public.poster_reviews;
create policy "Students can submit poster reviews" on public.poster_reviews for insert to authenticated
with check (
  public.student_can_submit_week(block_id, 3)
  and lower(trim(reviewer_team)) <> lower(trim(reviewed_team))
  and problem_clarity between 1 and 5 and working_product between 1 and 5
  and evidence_testing between 1 and 5 and document_readiness between 1 and 5
  and presentation_quality between 1 and 5
);

-- Add stable block identity to the authenticated student portal context.
create or replace function public.get_my_student_context()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_account public.student_accounts; v_roster public.student_roster;
  v_block public.teaching_blocks; v_project public.projects%rowtype; v_checkin boolean;
begin
  select * into v_account from public.student_accounts where auth_user_id = auth.uid() and status <> 'disabled';
  if v_account.auth_user_id is null then raise exception using errcode='P0001', message='Student account is not available'; end if;
  select roster.* into v_roster from public.student_roster roster
  join public.teaching_blocks block on block.id=roster.block_id
  where roster.student_id=v_account.student_id and block.status='active'
  order by block.starts_on desc nulls last, block.created_at desc limit 1;
  if v_roster.id is null then raise exception using errcode='P0001', message='No active roster context is available'; end if;
  select * into v_block from public.teaching_blocks where id=v_roster.block_id;
  select project.* into v_project from public.teams team
  join public.team_project_assignments assignment on assignment.team_id=team.id
  join public.projects project on project.id=assignment.project_id
  where team.block_id=v_roster.block_id and team.team_number=v_roster.team_number;
  select exists(select 1 from public.student_checkins where block_id=v_roster.block_id and lower(trim(student_id))=v_account.student_id) into v_checkin;
  return jsonb_build_object(
    'status',v_account.status,'studentId',v_account.student_id,'studentName',coalesce(v_roster.preferred_name,v_roster.full_name),
    'blockId',v_block.id,'blockLabel',concat(v_block.academic_year,' · ',v_block.block_code),'teamName',concat('Team ',v_roster.team_number),
    'projectName',coalesce(v_project.title,v_roster.project_name),'projectProblem',v_project.problem,'projectDescription',v_project.description,
    'projectTargetUsers',v_project.target_users,'projectExpectedOutcomes',v_project.expected_outcomes,'projectCategory',v_project.category,
    'projectDifficulty',v_project.difficulty,'projectSource',case when v_project.id is not null then 'catalogue' when v_roster.project_name is not null then 'roster' else 'none' end,
    'checkinRecognised',v_checkin);
end;
$$;
revoke all on function public.get_my_student_context() from public;
grant execute on function public.get_my_student_context() to authenticated;

-- Verification: every block has four rows; all rows default closed; teachers can
-- update only the selected block; students can read only through the RPC; direct
-- inserts fail for a closed week and succeed for the student's own open week.
\n+-- Sprint 5 Phase 4A: block-based Presentation Order draft and publication.

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


-- Sprint 8 Phase 2A: AI Session Intake data and deterministic fallback foundation.
-- This migration does not create a test block, enable Intake on an existing
-- session, call an AI provider or modify historical activity records.

-- NIT3004 uses 2B2 as an isolated mock-pilot block. Existing block rows are
-- unaffected; the teacher creates the block explicitly through the dashboard.
alter table public.teaching_blocks
  drop constraint if exists teaching_blocks_block_code_check;
alter table public.teaching_blocks
  add constraint teaching_blocks_block_code_check
  check (block_code in ('1B1','1B4','2B1','2B2','2B4')) not valid;
alter table public.teaching_blocks
  validate constraint teaching_blocks_block_code_check;

-- Intake is opt-in per Session. Existing and newly prepared Sessions remain
-- closed until a teacher explicitly enables the pilot in a later UI or SQL step.
alter table public.studio_sessions
  add column if not exists intake_access text not null default 'closed';

alter table public.studio_sessions
  drop constraint if exists studio_sessions_intake_access_check;
alter table public.studio_sessions
  add constraint studio_sessions_intake_access_check
  check (intake_access in ('closed','session','open')) not valid;
alter table public.studio_sessions
  validate constraint studio_sessions_intake_access_check;

create table if not exists public.student_session_intakes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.studio_sessions(id) on delete restrict,
  block_id uuid not null references public.teaching_blocks(id) on delete restrict,
  student_id text not null references public.student_accounts(student_id) on delete restrict,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  schema_version text not null
    check (schema_version = 'session-intake.v1.0.0'),
  source_mode text not null
    check (source_mode in ('deterministic_fallback','ai_assisted')),
  prompt_version text,
  test_suite_version text not null default 'ai-intake-suite.v1.0.0',
  source_conversation jsonb not null
    check (jsonb_typeof(source_conversation) = 'array'),
  student_record jsonb not null
    check (jsonb_typeof(student_record) = 'object'),
  ai_assistance jsonb not null default '{"used":false}'::jsonb
    check (jsonb_typeof(ai_assistance) = 'object'),
  student_confirmation jsonb not null
    check (jsonb_typeof(student_confirmation) = 'object'),
  confirmed_payload_hash text not null,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (session_id, student_id),
  unique (session_id, auth_user_id)
);

create index if not exists student_session_intakes_block_session_idx
  on public.student_session_intakes (block_id, session_id);
create index if not exists student_session_intakes_student_history_idx
  on public.student_session_intakes (block_id, student_id, confirmed_at desc);

alter table public.student_session_intakes enable row level security;
revoke all on public.student_session_intakes from anon, authenticated;
grant select on public.student_session_intakes to authenticated;

drop policy if exists "students read own session intakes" on public.student_session_intakes;
create policy "students read own session intakes"
on public.student_session_intakes for select to authenticated
using (auth_user_id = auth.uid());

drop policy if exists "teachers read session intakes" on public.student_session_intakes;
create policy "teachers read session intakes"
on public.student_session_intakes for select to authenticated
using (public.is_teacher());

-- Returns validation messages. An empty array means the confirmed student
-- record satisfies session-intake.v1.0.0. Teacher fields are not accepted.
create or replace function public.validate_session_intake_student_record(p_record jsonb)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_errors text[] := array[]::text[];
  v_claim jsonb;
  v_evidence jsonb;
  v_test jsonb;
  v_claim_ids text[];
  v_allowed_keys text[] := array['responsibility','claims','evidence','testing','dependencies','blocker','next_action'];
begin
  if p_record is null or jsonb_typeof(p_record) <> 'object' then
    return array['student_record must be an object'];
  end if;

  if exists (
    select 1 from jsonb_object_keys(p_record) key
    where not (key = any(v_allowed_keys))
  ) then
    v_errors := array_append(v_errors, 'student_record contains unsupported fields');
  end if;

  if jsonb_typeof(p_record -> 'responsibility') is distinct from 'object'
     or char_length(btrim(coalesce(p_record #>> '{responsibility,current}', ''))) not between 2 and 500 then
    v_errors := array_append(v_errors, 'current responsibility must be 2 to 500 characters');
  end if;

  if coalesce(p_record #>> '{responsibility,change_from_previous}', '') not in
     ('initial','unchanged','refined','changed','unknown') then
    v_errors := array_append(v_errors, 'responsibility change state is invalid');
  end if;

  if jsonb_typeof(p_record -> 'claims') is distinct from 'array'
     or jsonb_array_length(coalesce(p_record -> 'claims', '[]'::jsonb)) not between 1 and 5 then
    v_errors := array_append(v_errors, 'one to five claims are required');
  else
    select array_agg(item ->> 'claim_id')
    into v_claim_ids
    from jsonb_array_elements(p_record -> 'claims') item;

    if exists (
      select 1
      from jsonb_array_elements(p_record -> 'claims') item
      where coalesce(item ->> 'claim_id','') !~ '^C[1-5]$'
         or char_length(btrim(coalesce(item ->> 'statement',''))) not between 3 and 1000
         or coalesce(item ->> 'progress_kind','') not in
            ('completed','advanced','investigated','attempted_failed','no_progress')
         or char_length(btrim(coalesce(item ->> 'scope',''))) not between 3 and 500
         or (
           item ? 'completion_percent'
           and item -> 'completion_percent' <> 'null'::jsonb
           and (
             jsonb_typeof(item -> 'completion_percent') <> 'number'
             or (item ->> 'completion_percent')::numeric not between 0 and 100
           )
         )
    ) then
      v_errors := array_append(v_errors, 'one or more claims are invalid');
    end if;

    if cardinality(v_claim_ids) <> cardinality(array(select distinct unnest(v_claim_ids))) then
      v_errors := array_append(v_errors, 'claim identifiers must be unique');
    end if;
  end if;

  if jsonb_typeof(p_record -> 'evidence') is distinct from 'array'
     or jsonb_array_length(coalesce(p_record -> 'evidence', '[]'::jsonb)) < 1
     or jsonb_array_length(coalesce(p_record -> 'evidence', '[]'::jsonb)) > 10 then
    v_errors := array_append(v_errors, 'one to ten evidence states are required');
  else
    for v_evidence in select value from jsonb_array_elements(p_record -> 'evidence')
    loop
      if coalesce(v_evidence ->> 'evidence_id','') !~ '^E([1-9]|10)$'
         or jsonb_typeof(v_evidence -> 'claim_ids') is distinct from 'array'
         or jsonb_array_length(coalesce(v_evidence -> 'claim_ids','[]'::jsonb)) < 1
         or coalesce(v_evidence ->> 'type','') not in (
           'repository_change','deployed_feature','live_demonstration','test_result',
           'experiment_result','data_analysis','design_artifact','documentation',
           'meeting_or_decision_record','external_system_record','other'
         )
         or coalesce(v_evidence ->> 'availability','') not in
           ('available_now','expected_later','not_produced','not_required','unknown')
      then
        v_errors := array_append(v_errors, 'one or more evidence entries are invalid');
        exit;
      end if;

      if exists (
        select 1 from jsonb_array_elements_text(v_evidence -> 'claim_ids') claim_id
        where not (claim_id = any(coalesce(v_claim_ids,array[]::text[])))
      ) then
        v_errors := array_append(v_errors, 'evidence references an unknown claim');
      end if;

      if v_evidence ->> 'availability' = 'available_now'
         and (
           char_length(btrim(coalesce(v_evidence ->> 'reference',''))) not between 3 and 1000
           or char_length(btrim(coalesce(v_evidence ->> 'verification_method',''))) not between 3 and 1000
         ) then
        v_errors := array_append(v_errors, 'available evidence needs a reference and verification method');
      end if;

      if v_evidence ->> 'availability' = 'expected_later'
         and char_length(btrim(coalesce(v_evidence ->> 'verification_method',''))) not between 3 and 1000 then
        v_errors := array_append(v_errors, 'expected evidence needs a verification method');
      end if;

      if v_evidence ->> 'availability' = 'not_required'
         and char_length(btrim(coalesce(v_evidence ->> 'not_required_reason',''))) not between 3 and 500 then
        v_errors := array_append(v_errors, 'not-required evidence needs a reason');
      end if;
    end loop;
  end if;

  if jsonb_typeof(p_record -> 'testing') is distinct from 'array'
     or jsonb_array_length(coalesce(p_record -> 'testing','[]'::jsonb)) > 10 then
    v_errors := array_append(v_errors, 'testing must be an array of at most ten entries');
  else
    for v_test in select value from jsonb_array_elements(p_record -> 'testing')
    loop
      if coalesce(v_test ->> 'execution_status','') not in
         ('executed','planned_not_executed','not_applicable') then
        v_errors := array_append(v_errors, 'testing execution status is invalid');
        exit;
      end if;
      if v_test ->> 'execution_status' = 'executed'
         and (
           char_length(btrim(coalesce(v_test ->> 'method',''))) not between 3 and 1000
           or char_length(btrim(coalesce(v_test ->> 'observed_result',''))) not between 1 and 1000
         ) then
        v_errors := array_append(v_errors, 'executed testing needs method and observed result');
      end if;
      if v_test ->> 'execution_status' = 'planned_not_executed'
         and coalesce(v_test ->> 'observed_result','') <> '' then
        v_errors := array_append(v_errors, 'planned testing cannot contain an observed result');
      end if;
    end loop;
  end if;

  if jsonb_typeof(p_record -> 'dependencies') is distinct from 'array'
     or jsonb_array_length(coalesce(p_record -> 'dependencies','[]'::jsonb)) > 10 then
    v_errors := array_append(v_errors, 'dependencies must be an array of at most ten entries');
  end if;

  if jsonb_typeof(p_record -> 'blocker') is distinct from 'object'
     or coalesce(p_record #>> '{blocker,status}','') not in ('none','active','resolved','unknown') then
    v_errors := array_append(v_errors, 'blocker state is invalid');
  end if;

  if coalesce(p_record #>> '{blocker,status}','') in ('active','resolved')
     and char_length(btrim(coalesce(p_record #>> '{blocker,description}',''))) not between 3 and 1000 then
    v_errors := array_append(v_errors, 'active or resolved blocker needs a description');
  end if;

  if jsonb_typeof(p_record -> 'next_action') is distinct from 'object'
     or char_length(btrim(coalesce(p_record #>> '{next_action,action}',''))) not between 3 and 1000
     or coalesce(p_record #>> '{next_action,due_session}','') !~ '^S([1-9]|10)$'
     or char_length(btrim(coalesce(p_record #>> '{next_action,expected_evidence}',''))) not between 3 and 1000 then
    v_errors := array_append(v_errors, 'next action, due Session and expected evidence are required');
  end if;

  return v_errors;
exception
  when others then
    return array['student_record contains invalid value types'];
end;
$$;

revoke all on function public.validate_session_intake_student_record(jsonb) from public;
revoke all on function public.validate_session_intake_student_record(jsonb) from anon, authenticated;

create or replace function public.get_my_session_intake(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_roster public.student_roster%rowtype;
  v_session public.studio_sessions%rowtype;
  v_current public.student_session_intakes%rowtype;
  v_previous public.student_session_intakes%rowtype;
begin
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  if v_account.student_id is null then
    raise exception using errcode = 'P0001', message = 'Student account is not available';
  end if;

  select roster.* into v_roster
  from public.student_roster roster
  where roster.student_id = v_account.student_id
    and roster.block_id = (
      select session.block_id from public.studio_sessions session where session.id = p_session_id
    );

  select session.* into v_session
  from public.studio_sessions session
  where session.id = p_session_id
    and session.block_id = v_roster.block_id
    and session.session_number between 1 and 9;

  if v_roster.id is null or v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Session Intake is not available';
  end if;

  select * into v_current
  from public.student_session_intakes intake
  where intake.session_id = v_session.id and intake.auth_user_id = auth.uid();

  select intake.* into v_previous
  from public.student_session_intakes intake
  join public.studio_sessions previous_session on previous_session.id = intake.session_id
  where intake.block_id = v_session.block_id
    and intake.student_id = v_account.student_id
    and previous_session.session_number < v_session.session_number
  order by previous_session.session_number desc
  limit 1;

  return jsonb_build_object(
    'schemaVersion', 'session-intake.v1.0.0',
    'testSuiteVersion', 'ai-intake-suite.v1.0.0',
    'sessionId', v_session.id,
    'sessionNumber', v_session.session_number,
    'blockId', v_session.block_id,
    'isOpen', (
      v_session.intake_access = 'open'
      or (
        v_session.intake_access = 'session'
        and (
          v_session.status = 'open'
          or (
            v_session.status = 'scheduled'
            and v_session.starts_at <= now()
            and (v_session.ends_at is null or v_session.ends_at > now())
          )
        )
      )
    ),
    'confirmedRecord', case when v_current.id is null then null else jsonb_build_object(
      'intakeId', v_current.id,
      'sourceMode', v_current.source_mode,
      'studentRecord', v_current.student_record,
      'studentConfirmation', v_current.student_confirmation,
      'confirmedAt', v_current.confirmed_at
    ) end,
    'previousConfirmed', case when v_previous.id is null then null else jsonb_build_object(
      'intakeId', v_previous.id,
      'studentRecord', v_previous.student_record,
      'confirmedAt', v_previous.confirmed_at
    ) end
  );
end;
$$;

revoke all on function public.get_my_session_intake(uuid) from public;
revoke all on function public.get_my_session_intake(uuid) from anon;
grant execute on function public.get_my_session_intake(uuid) to authenticated;

create or replace function public.save_my_session_intake_fallback(
  p_session_id uuid,
  p_source_conversation jsonb,
  p_student_record jsonb,
  p_student_confirmation jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_roster public.student_roster%rowtype;
  v_session public.studio_sessions%rowtype;
  v_intake public.student_session_intakes%rowtype;
  v_errors text[];
  v_payload_hash text;
begin
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  if v_account.student_id is null then
    raise exception using errcode = 'P0001', message = 'Student account is not available';
  end if;

  select roster.* into v_roster
  from public.student_roster roster
  where roster.student_id = v_account.student_id
    and roster.block_id = (
      select session.block_id from public.studio_sessions session where session.id = p_session_id
    );

  select session.* into v_session
  from public.studio_sessions session
  where session.id = p_session_id
    and session.block_id = v_roster.block_id
    and session.session_number between 1 and 9
    and (
      session.intake_access = 'open'
      or (
        session.intake_access = 'session'
        and (
          session.status = 'open'
          or (
            session.status = 'scheduled'
            and session.starts_at <= now()
            and (session.ends_at is null or session.ends_at > now())
          )
        )
      )
    );

  if v_roster.id is null or v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Session Intake can only be submitted while it is open';
  end if;

  if exists (
    select 1 from public.student_session_intakes
    where session_id = v_session.id and student_id = v_account.student_id
  ) then
    raise exception using errcode = 'P0001', message = 'This Session Intake has already been confirmed';
  end if;

  if p_source_conversation is null
     or jsonb_typeof(p_source_conversation) <> 'array'
     or jsonb_array_length(p_source_conversation) not between 3 and 12
     or length(p_source_conversation::text) > 16000
     or exists (
       select 1 from jsonb_array_elements(p_source_conversation) turn
       where jsonb_typeof(turn) <> 'object'
          or coalesce(turn ->> 'actor','') not in ('student','system')
          or char_length(btrim(coalesce(turn ->> 'purpose',''))) not between 3 and 80
          or char_length(btrim(coalesce(turn ->> 'text',''))) not between 1 and 2000
     ) then
    raise exception using errcode = 'P0001', message = 'Fallback conversation is invalid';
  end if;

  v_errors := public.validate_session_intake_student_record(p_student_record);
  if cardinality(v_errors) > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Session Intake evidence is incomplete',
      detail = array_to_string(v_errors, '; ');
  end if;

  if p_student_confirmation is null
     or jsonb_typeof(p_student_confirmation) <> 'object'
     or coalesce(p_student_confirmation ->> 'status','') <> 'confirmed'
     or coalesce(p_student_confirmation ->> 'attestation','') <>
       'This summary reflects what I am claiming and the evidence I have identified. Teacher verification is separate.'
     or jsonb_typeof(coalesce(p_student_confirmation -> 'corrections','[]'::jsonb)) <> 'array'
     or length(p_student_confirmation::text) > 8000 then
    raise exception using errcode = 'P0001', message = 'Student confirmation is invalid';
  end if;

  v_payload_hash := md5(
    'session-intake.v1.0.0' ||
    p_session_id::text ||
    auth.uid()::text ||
    p_source_conversation::text ||
    p_student_record::text ||
    p_student_confirmation::text
  );

  insert into public.student_session_intakes (
    session_id, block_id, student_id, auth_user_id,
    schema_version, source_mode, prompt_version, test_suite_version,
    source_conversation, student_record, ai_assistance,
    student_confirmation, confirmed_payload_hash
  ) values (
    v_session.id, v_session.block_id, v_account.student_id, auth.uid(),
    'session-intake.v1.0.0', 'deterministic_fallback', null,
    'ai-intake-suite.v1.0.0', p_source_conversation, p_student_record,
    '{"used":false,"follow_up_count":0,"question_purposes":[],"extraction_status":"not_used","uncertainties":[],"flags":[],"suggested_teacher_questions":[]}'::jsonb,
    p_student_confirmation, v_payload_hash
  )
  returning * into v_intake;

  return jsonb_build_object(
    'intakeId', v_intake.id,
    'schemaVersion', v_intake.schema_version,
    'sourceMode', v_intake.source_mode,
    'confirmedAt', v_intake.confirmed_at,
    'confirmedPayloadHash', v_intake.confirmed_payload_hash
  );
end;
$$;

revoke all on function public.save_my_session_intake_fallback(uuid,jsonb,jsonb,jsonb) from public;
revoke all on function public.save_my_session_intake_fallback(uuid,jsonb,jsonb,jsonb) from anon;
grant execute on function public.save_my_session_intake_fallback(uuid,jsonb,jsonb,jsonb) to authenticated;

-- Verification:
-- 1. Existing block rows, activity records and Session state remain unchanged.
-- 2. 2026 · 2B2 can be created explicitly; duplicate year/block remains rejected.
-- 3. Existing Sessions have intake_access = closed.
-- 4. anon and authenticated students cannot INSERT/UPDATE/DELETE Intake rows directly.
-- 5. Students can SELECT only their own Intake; teachers can SELECT all authorised rows.
-- 6. Fallback save derives student/block/session identity and rejects a cross-Block session.
-- 7. One confirmed Intake is allowed per student per Session.
-- 8. Teacher verification, Teacher Action and marks have no writable field in this table.
-- 9. Invalid Evidence combinations are rejected before persistence.
-- 10. Provider-independent fallback can submit without prompt/model data.



-- Sprint 8 Phase 2C: bounded AI-assisted Intake persistence.
-- The AI endpoint may propose questions and extraction, but this RPC remains the
-- final identity, Session-access, schema and authority boundary.

create or replace function public.save_my_session_intake_ai(
  p_session_id uuid,
  p_source_conversation jsonb,
  p_student_record jsonb,
  p_student_confirmation jsonb,
  p_prompt_version text,
  p_ai_assistance jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_roster public.student_roster%rowtype;
  v_session public.studio_sessions%rowtype;
  v_intake public.student_session_intakes%rowtype;
  v_errors text[];
  v_payload_hash text;
  v_allowed_ai_keys text[] := array[
    'used','model','follow_up_count','question_purposes','extraction_status',
    'uncertainties','flags','suggested_teacher_questions'
  ];
begin
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  if v_account.student_id is null then
    raise exception using errcode = 'P0001', message = 'Student account is not available';
  end if;

  select roster.* into v_roster
  from public.student_roster roster
  where roster.student_id = v_account.student_id
    and roster.block_id = (
      select session.block_id from public.studio_sessions session where session.id = p_session_id
    );

  select session.* into v_session
  from public.studio_sessions session
  where session.id = p_session_id
    and session.block_id = v_roster.block_id
    and session.session_number between 1 and 9
    and (
      session.intake_access = 'open'
      or (
        session.intake_access = 'session'
        and (
          session.status = 'open'
          or (
            session.status = 'scheduled'
            and session.starts_at <= now()
            and (session.ends_at is null or session.ends_at > now())
          )
        )
      )
    );

  if v_roster.id is null or v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Session Intake can only be submitted while it is open';
  end if;

  if exists (
    select 1 from public.student_session_intakes
    where session_id = v_session.id and student_id = v_account.student_id
  ) then
    raise exception using errcode = 'P0001', message = 'This Session Intake has already been confirmed';
  end if;

  if p_source_conversation is null
     or jsonb_typeof(p_source_conversation) <> 'array'
     or jsonb_array_length(p_source_conversation) not between 3 and 12
     or length(p_source_conversation::text) > 16000
     or exists (
       select 1 from jsonb_array_elements(p_source_conversation) turn
       where jsonb_typeof(turn) <> 'object'
          or coalesce(turn ->> 'actor','') not in ('student','system')
          or char_length(btrim(coalesce(turn ->> 'purpose',''))) not between 3 and 80
          or char_length(btrim(coalesce(turn ->> 'text',''))) not between 1 and 2000
     ) then
    raise exception using errcode = 'P0001', message = 'AI-assisted conversation is invalid';
  end if;

  v_errors := public.validate_session_intake_student_record(p_student_record);
  if cardinality(v_errors) > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Session Intake evidence is incomplete',
      detail = array_to_string(v_errors, '; ');
  end if;

  if p_student_confirmation is null
     or jsonb_typeof(p_student_confirmation) <> 'object'
     or coalesce(p_student_confirmation ->> 'status','') <> 'confirmed'
     or coalesce(p_student_confirmation ->> 'attestation','') <>
       'This summary reflects what I am claiming and the evidence I have identified. Teacher verification is separate.'
     or jsonb_typeof(coalesce(p_student_confirmation -> 'corrections','[]'::jsonb)) <> 'array'
     or length(p_student_confirmation::text) > 8000 then
    raise exception using errcode = 'P0001', message = 'Student confirmation is invalid';
  end if;

  if p_prompt_version is null
     or p_prompt_version <> 'session-intake-ai.v1.1.0' then
    raise exception using errcode = 'P0001', message = 'AI Intake prompt version is invalid';
  end if;

  if p_ai_assistance is null
     or jsonb_typeof(p_ai_assistance) <> 'object'
     or exists (
       select 1 from jsonb_object_keys(p_ai_assistance) key
       where not (key = any(v_allowed_ai_keys))
     )
     or coalesce((p_ai_assistance ->> 'used')::boolean, false) is not true
     or coalesce(p_ai_assistance ->> 'extraction_status','') <> 'completed'
     or coalesce((p_ai_assistance ->> 'follow_up_count')::integer, -1) not between 0 and 3
     or jsonb_typeof(coalesce(p_ai_assistance -> 'question_purposes','[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_ai_assistance -> 'question_purposes','[]'::jsonb)) > 3
     or jsonb_typeof(coalesce(p_ai_assistance -> 'uncertainties','[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_ai_assistance -> 'uncertainties','[]'::jsonb)) > 5
     or jsonb_typeof(coalesce(p_ai_assistance -> 'flags','[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_ai_assistance -> 'flags','[]'::jsonb)) > 5
     or jsonb_typeof(coalesce(p_ai_assistance -> 'suggested_teacher_questions','[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_ai_assistance -> 'suggested_teacher_questions','[]'::jsonb)) > 3
     or length(p_ai_assistance::text) > 8000 then
    raise exception using errcode = 'P0001', message = 'AI assistance metadata is invalid';
  end if;

  -- Student confirmation remains separate from AI metadata. Teacher-controlled
  -- fields are neither accepted by the Evidence validator nor this metadata list.
  v_payload_hash := md5(
    'session-intake.v1.0.0' ||
    p_session_id::text ||
    auth.uid()::text ||
    p_source_conversation::text ||
    p_student_record::text ||
    p_student_confirmation::text ||
    p_ai_assistance::text
  );

  insert into public.student_session_intakes (
    session_id, block_id, student_id, auth_user_id,
    schema_version, source_mode, prompt_version, test_suite_version,
    source_conversation, student_record, ai_assistance,
    student_confirmation, confirmed_payload_hash
  ) values (
    v_session.id, v_session.block_id, v_account.student_id, auth.uid(),
    'session-intake.v1.0.0', 'ai_assisted', p_prompt_version,
    'ai-intake-suite.v1.0.0', p_source_conversation, p_student_record,
    p_ai_assistance, p_student_confirmation, v_payload_hash
  )
  returning * into v_intake;

  return jsonb_build_object(
    'intakeId', v_intake.id,
    'schemaVersion', v_intake.schema_version,
    'sourceMode', v_intake.source_mode,
    'promptVersion', v_intake.prompt_version,
    'confirmedAt', v_intake.confirmed_at,
    'confirmedPayloadHash', v_intake.confirmed_payload_hash
  );
end;
$$;

revoke all on function public.save_my_session_intake_ai(uuid,jsonb,jsonb,jsonb,text,jsonb) from public;
revoke all on function public.save_my_session_intake_ai(uuid,jsonb,jsonb,jsonb,text,jsonb) from anon;
grant execute on function public.save_my_session_intake_ai(uuid,jsonb,jsonb,jsonb,text,jsonb) to authenticated;

-- Adaptive chat v1.1; historical v1.0 functions and records are unchanged.
-- Apply after Phase 2A. No rows, Block status, or Session access are modified.
begin;
alter table public.student_session_intakes drop constraint if exists student_session_intakes_schema_version_check;
alter table public.student_session_intakes add constraint student_session_intakes_schema_version_check
  check (schema_version in ('session-intake.v1.0.0','session-intake.v1.1.0'));

create or replace function public.validate_session_intake_student_record_v11(p_record jsonb)
returns text[] language plpgsql immutable set search_path = '' as $$
declare
  v_record jsonb := p_record;
  v_testing jsonb;
begin
  if jsonb_typeof(p_record -> 'testing') = 'array' then
    if jsonb_array_length(p_record -> 'testing') > 10 then
      return array['testing must be an array of at most ten entries'];
    end if;
    if exists (select 1 from jsonb_array_elements(p_record -> 'testing') t
      where t ->> 'execution_status' = 'unknown' and coalesce(t ->> 'observed_result','') <> '') then
      return array['unknown testing cannot contain an observed result'];
    end if;
    select coalesce(jsonb_agg(t),'[]'::jsonb) into v_testing
    from jsonb_array_elements(p_record -> 'testing') t
    where t ->> 'execution_status' is distinct from 'unknown';
    v_record := jsonb_set(v_record,'{testing}',v_testing);
  end if;
  return public.validate_session_intake_student_record(v_record);
end;
$$;
revoke all on function public.validate_session_intake_student_record_v11(jsonb) from public, anon, authenticated;

create or replace function public.save_my_session_intake_chat(
  p_session_id uuid,
  p_source_conversation jsonb,
  p_student_record jsonb,
  p_student_confirmation jsonb,
  p_prompt_version text,
  p_ai_assistance jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_roster public.student_roster%rowtype;
  v_session public.studio_sessions%rowtype;
  v_intake public.student_session_intakes%rowtype;
  v_errors text[];
  v_payload_hash text;
  v_allowed_ai_keys text[] := array[
    'used','model','policy_version','follow_up_count','question_purposes',
    'extraction_status','stop_reason','extracted_record','turn_results'
  ];
begin
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  if v_account.student_id is null then
    raise exception using errcode = 'P0001', message = 'Student account is not available';
  end if;

  select roster.* into v_roster
  from public.student_roster roster
  where roster.student_id = v_account.student_id
    and roster.block_id = (
      select session.block_id from public.studio_sessions session where session.id = p_session_id
    );

  select session.* into v_session
  from public.studio_sessions session
  where session.id = p_session_id
    and session.block_id = v_roster.block_id
    and session.session_number between 1 and 9
    and exists (select 1 from public.teaching_blocks b where b.id=session.block_id and b.block_code='2B2')
    and (
      session.intake_access = 'open'
      or (
        session.intake_access = 'session'
        and (
          session.status = 'open'
          or (
            session.status = 'scheduled'
            and session.starts_at <= now()
            and (session.ends_at is null or session.ends_at > now())
          )
        )
      )
    );

  if v_roster.id is null or v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Session Intake can only be submitted while it is open';
  end if;

  if exists (
    select 1 from public.student_session_intakes
    where session_id = v_session.id and student_id = v_account.student_id
  ) then
    raise exception using errcode = 'P0001', message = 'This Session Intake has already been confirmed';
  end if;

  if p_source_conversation is null
     or jsonb_typeof(p_source_conversation) <> 'array'
     or jsonb_array_length(p_source_conversation) not between 3 and 17
     or length(p_source_conversation::text) > 48000
     or exists (
       select 1 from jsonb_array_elements(p_source_conversation) turn
       where jsonb_typeof(turn) <> 'object'
          or coalesce(turn ->> 'actor','') not in ('student','system')
          or char_length(btrim(coalesce(turn ->> 'purpose',''))) not between 3 and 80
          or char_length(btrim(coalesce(turn ->> 'text',''))) not between 1 and 2000
     ) then
    raise exception using errcode = 'P0001', message = 'AI-assisted conversation is invalid';
  end if;

  if mod(jsonb_array_length(p_source_conversation),2) <> 1
     or p_source_conversation -> -1 ->> 'purpose' is distinct from 'review transition'
     or exists (
       select 1 from jsonb_array_elements(p_source_conversation) with ordinality as t(value,n)
       where value ->> 'actor' is distinct from case when mod(n,2)=1 then 'system' else 'student' end
          or (value ->> 'purpose' = 'review transition' and n <> jsonb_array_length(p_source_conversation))
     ) then
    raise exception 'Chat conversation order is invalid';
  end if;

  v_errors := public.validate_session_intake_student_record_v11(p_student_record);
  if cardinality(v_errors) > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Session Intake evidence is incomplete',
      detail = array_to_string(v_errors, '; ');
  end if;

  if p_student_confirmation is null
     or jsonb_typeof(p_student_confirmation) <> 'object'
     or coalesce(p_student_confirmation ->> 'status','') <> 'confirmed'
     or coalesce(p_student_confirmation ->> 'attestation','') <>
       'This summary reflects what I am claiming and the evidence I have identified. Teacher verification is separate.'
     or jsonb_typeof(coalesce(p_student_confirmation -> 'corrections','[]'::jsonb)) <> 'array'
     or length(p_student_confirmation::text) > 48000 then
    raise exception using errcode = 'P0001', message = 'Student confirmation is invalid';
  end if;

  if p_prompt_version is null
     or p_prompt_version <> 'session-intake-ai.v1.2.0' then
    raise exception using errcode = 'P0001', message = 'AI Intake prompt version is invalid';
  end if;

  if p_ai_assistance is null or jsonb_typeof(p_ai_assistance) <> 'object'
     or exists (select 1 from jsonb_object_keys(p_ai_assistance) key where not (key = any(v_allowed_ai_keys)))
     or p_ai_assistance ->> 'policy_version' is distinct from 'adaptive-intake.v1.0.0'
     or jsonb_typeof(p_ai_assistance -> 'used') is distinct from 'boolean'
     or coalesce(p_ai_assistance ->> 'extraction_status','') not in ('completed','fallback','not_used')
     or coalesce(p_ai_assistance ->> 'stop_reason','') not in ('sufficient_information','teacher_help','budget_exhausted','provider_failure')
     or coalesce((p_ai_assistance ->> 'follow_up_count')::integer,-1) <> greatest(0, (jsonb_array_length(p_source_conversation)-1)/2-3)
     or jsonb_typeof(p_ai_assistance -> 'question_purposes') is distinct from 'array'
     or jsonb_array_length(p_ai_assistance -> 'question_purposes') <> greatest(0, (jsonb_array_length(p_source_conversation)-1)/2-3)
     or jsonb_typeof(p_ai_assistance -> 'extracted_record') is distinct from 'object'
     or jsonb_typeof(p_ai_assistance -> 'turn_results') is distinct from 'array'
     or jsonb_array_length(p_ai_assistance -> 'turn_results') > 8
     or length(p_ai_assistance::text) > 96000 then
    raise exception 'Chat assistance metadata is invalid';
  end if;

  -- Metadata is an unverified model trace, never Teacher authority.
  -- Validate every source pointer against the preserved student messages.
  if exists (
    select 1 from jsonb_array_elements(p_ai_assistance -> 'turn_results') r,
      lateral jsonb_array_elements(r -> 'evidenceUpdates') u
    where coalesce(u ->> 'sourceTurn','') !~ '^[0-9]+$'
       or p_source_conversation -> ((u ->> 'sourceTurn')::integer) ->> 'actor' is distinct from 'student'
  ) then
    raise exception 'Chat evidence source is invalid';
  end if;

  -- Student confirmation remains separate from AI metadata. Teacher-controlled
  -- fields are neither accepted by the Evidence validator nor this metadata list.
  v_payload_hash := md5(
    'session-intake.v1.1.0' ||
    p_session_id::text ||
    auth.uid()::text ||
    p_source_conversation::text ||
    p_student_record::text ||
    p_student_confirmation::text ||
    p_ai_assistance::text
  );

  insert into public.student_session_intakes (
    session_id, block_id, student_id, auth_user_id,
    schema_version, source_mode, prompt_version, test_suite_version,
    source_conversation, student_record, ai_assistance,
    student_confirmation, confirmed_payload_hash
  ) values (
    v_session.id, v_session.block_id, v_account.student_id, auth.uid(),
    'session-intake.v1.1.0', case when (p_ai_assistance ->> 'used')::boolean then 'ai_assisted' else 'deterministic_fallback' end, p_prompt_version,
    'ai-intake-suite.v1.1.0', p_source_conversation, p_student_record,
    p_ai_assistance, p_student_confirmation, v_payload_hash
  )
  returning * into v_intake;

  return jsonb_build_object(
    'intakeId', v_intake.id,
    'schemaVersion', v_intake.schema_version,
    'sourceMode', v_intake.source_mode,
    'promptVersion', v_intake.prompt_version,
    'confirmedAt', v_intake.confirmed_at,
    'confirmedPayloadHash', v_intake.confirmed_payload_hash
  );
end;
$$;

revoke all on function public.save_my_session_intake_chat(uuid,jsonb,jsonb,jsonb,text,jsonb) from public;
revoke all on function public.save_my_session_intake_chat(uuid,jsonb,jsonb,jsonb,text,jsonb) from anon;
grant execute on function public.save_my_session_intake_chat(uuid,jsonb,jsonb,jsonb,text,jsonb) to authenticated;

commit;

-- Sprint 10 S10-01: S1-S9 Work Track and selected-method write gating.
-- New migration: no changes to existing rows, tables, RLS or applied migrations.
-- Requires the applied Sprint 9 block intake_mode migration.
-- Apply before the matching frontend release; reads retain existing history.
begin;

create or replace function public.get_my_session_work_track(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_session public.studio_sessions%rowtype;
  v_track public.student_session_work_tracks%rowtype;
  v_previous_next_focus text;
  v_previous_response jsonb;
  v_previous_completion integer;
  v_block_id uuid;
begin
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  if v_account.student_id is null then
    raise exception using errcode = 'P0001', message = 'Student account is not available';
  end if;

  select roster.block_id into v_block_id
  from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;

  select * into v_session
  from public.studio_sessions
  where id = p_session_id
    and block_id = v_block_id
    and session_number between 1 and 9;

  if v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Session Work Track is not available';
  end if;

  select * into v_track
  from public.student_session_work_tracks
  where session_id = v_session.id and auth_user_id = auth.uid();

  if v_session.session_number > 1 then
    select track.response,
           coalesce(track.response ->> 'nextAction', track.response ->> 'nextFocus'),
           case when jsonb_typeof(track.response -> 'completionPercent') = 'number'
             then (track.response ->> 'completionPercent')::numeric::integer else null end
    into v_previous_response, v_previous_next_focus, v_previous_completion
    from public.student_session_work_tracks track
    join public.studio_sessions previous on previous.id = track.session_id
    where track.auth_user_id = auth.uid()
      and track.block_id = v_block_id
      and previous.session_number < v_session.session_number
      and previous.session_number between 1 and 9
    order by previous.session_number desc
    limit 1;
  end if;

  return jsonb_build_object(
    'sessionId', v_session.id,
    'sessionNumber', v_session.session_number,
    'focus', coalesce(v_session.curriculum_focus, v_session.title),
    'taskGuidance', v_session.task_guidance,
    'expectedEvidence', v_session.expected_evidence,
    'isOpen', (
      exists (select 1 from public.teaching_blocks b where b.id = v_block_id and b.intake_mode = 'disabled')
      and (v_session.work_track_access = 'open'
      or (
        v_session.work_track_access = 'session'
        and (
          v_session.status = 'open'
          or (
            v_session.status = 'scheduled'
            and v_session.starts_at <= now()
            and (v_session.ends_at is null or v_session.ends_at > now())
          )
        )
      )
    )),
    'response', coalesce(v_track.response, '{}'::jsonb),
    'updatedAt', v_track.updated_at,
    'previousNextFocus', v_previous_next_focus,
    'previousResponse', v_previous_response,
    'previousCompletion', v_previous_completion
  );
end;
$$;

revoke all on function public.get_my_session_work_track(uuid) from public;
grant execute on function public.get_my_session_work_track(uuid) to authenticated;

create or replace function public.save_my_session_work_track(p_session_id uuid, p_response jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_session public.studio_sessions%rowtype;
  v_block_id uuid;
  v_track public.student_session_work_tracks%rowtype;
  v_response jsonb;
  v_requirement_count integer;
  v_invalid_requirement_count integer;
  v_completion integer;
  v_stage text;
  v_path text;
begin
  if p_response is null or jsonb_typeof(p_response) <> 'object' or length(p_response::text) > 12000 then
    raise exception using errcode = 'P0001', message = 'Work Track response is invalid';
  end if;

  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  select roster.block_id into v_block_id
  from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;

  select * into v_session
  from public.studio_sessions
  where id = p_session_id
    and block_id = v_block_id
    and session_number between 1 and 9
    and exists (select 1 from public.teaching_blocks b where b.id = v_block_id and b.intake_mode = 'disabled')
    and (
      work_track_access = 'open'
      or (
        work_track_access = 'session'
        and (
          status = 'open'
          or (
            status = 'scheduled'
            and starts_at <= now()
            and (ends_at is null or ends_at > now())
          )
        )
      )
    );

  if v_account.student_id is null or v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Work Track can only be updated while this Track is open';
  end if;

  if v_session.session_number between 1 and 5 then
    -- Early progress is not a percentage assessment. Whitelist stored fields;
    -- submitted late metrics or unsupported keys cannot fabricate a score.
    if exists (
      select 1 from unnest(array['responsibility','progress','nextAction']) field
      where jsonb_typeof(p_response -> field) is distinct from 'string'
        or coalesce(btrim(p_response ->> field), '') = ''
        or char_length(p_response ->> field) > 800
    ) or exists (
      select 1 from unnest(array['evidence','support']) field
      where p_response ? field and (
        jsonb_typeof(p_response -> field) is distinct from 'string'
        or char_length(p_response ->> field) > 800
      )
    ) then
      raise exception using errcode = 'P0001', message = 'Describe your responsibility, current progress and next action (up to 800 characters each)';
    end if;
    v_response := jsonb_build_object(
      'responsibility', btrim(p_response ->> 'responsibility'),
      'progress', btrim(p_response ->> 'progress'),
      'nextAction', btrim(p_response ->> 'nextAction'),
      'evidence', coalesce(btrim(p_response ->> 'evidence'), ''),
      'support', coalesce(btrim(p_response ->> 'support'), '')
    );
  else
  if jsonb_typeof(p_response -> 'requirements') is distinct from 'array' then
    raise exception using errcode = 'P0001', message = 'Add and assess the committed project requirements first';
  end if;

  select count(*),
         count(*) filter (
           where coalesce(btrim(requirement ->> 'label'), '') = ''
              or char_length(requirement ->> 'label') > 120
              or coalesce(requirement ->> 'score', '') not in ('0','25','50','75','100')
         ),
         round(avg(case when coalesce(requirement ->> 'score', '') in ('0','25','50','75','100') then (requirement ->> 'score')::numeric else null end))::integer
  into v_requirement_count, v_invalid_requirement_count, v_completion
  from jsonb_array_elements(p_response -> 'requirements') requirement;

  if v_requirement_count < 3 or v_requirement_count > 8 or v_invalid_requirement_count > 0 then
    raise exception using errcode = 'P0001', message = 'Assess the 3 core requirements and any optional requirements with the 0/25/50/75/100 standard';
  end if;

  if coalesce(p_response -> 'requirements' -> 0 ->> 'label', '') <> 'Core functionality meets the primary user needs'
     or coalesce(p_response -> 'requirements' -> 1 ->> 'label', '') <> 'Main workflow works end-to-end across integrated components'
     or coalesce(p_response -> 'requirements' -> 2 ->> 'label', '') <> 'Critical features are tested or validated with evidence' then
    raise exception using errcode = 'P0001', message = 'The 3 IT Milestone Project core requirements cannot be changed';
  end if;

  v_stage := case
    when v_completion <= 40 then 'Building'
    when v_completion <= 70 then 'Developing'
    when v_completion <= 90 then 'Completing'
    when v_completion < 100 then 'Finalising / Verifying'
    else 'Completed & Verified'
  end;
  v_path := case when v_completion <= 70 then 'building' when v_completion <= 90 then 'completing' else 'verifying' end;
  v_response := jsonb_set(
    jsonb_set(
      jsonb_set(p_response, '{completionPercent}', to_jsonb(v_completion), true),
      '{completionStage}', to_jsonb(v_stage), true
    ),
    '{progressPath}', to_jsonb(v_path), true
  );

  end if;

  insert into public.student_session_work_tracks (
    session_id, student_id, auth_user_id, block_id, response
  ) values (
    v_session.id, v_account.student_id, auth.uid(), v_block_id, v_response
  )
  on conflict (session_id, student_id) do update
    set response = excluded.response,
        updated_at = now(),
        teacher_verified_completion = null,
        teacher_verification_status = null,
        teacher_verification_reason = null,
        teacher_verified_at = null,
        teacher_verified_by = null
  returning * into v_track;

  return jsonb_build_object('updatedAt', v_track.updated_at, 'response', v_track.response);
end;
$$;

revoke all on function public.save_my_session_work_track(uuid, jsonb) from public;
grant execute on function public.save_my_session_work_track(uuid, jsonb) to authenticated;

create or replace function public.get_my_session_journey()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_block_id uuid;
  v_result jsonb;
begin
  select * into v_account from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';
  if v_account.student_id is null then return '[]'::jsonb; end if;

  select roster.block_id into v_block_id
  from public.student_roster roster join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc limit 1;
  if v_block_id is null then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'sessionId', session.id,
    'sessionNumber', session.session_number,
    'weekNumber', session.week_number,
    'focus', coalesce(session.curriculum_focus, session.title),
    'title', session.title,
    'sessionDate', session.session_date,
    'startsAt', session.starts_at,
    'endsAt', session.ends_at,
    'status', case
      when session.status = 'open' then 'open'
      when session.status = 'closed' then 'closed'
      when session.starts_at is not null and session.starts_at <= now() and (session.ends_at is null or session.ends_at > now()) then 'open'
      when session.ends_at is not null and session.ends_at <= now() then 'closed'
      else 'scheduled' end,
    'checkedInAt', checkin.checked_in_at,
    'workTrackUpdatedAt', track.updated_at,
    'workTrackStatus', case
      when session.session_number not between 1 and 9 then null
      when not exists (select 1 from public.teaching_blocks b where b.id = v_block_id and b.intake_mode = 'disabled') then 'closed'
      when session.work_track_access = 'open' then 'open'
      when session.work_track_access = 'closed' then 'closed'
      when session.status = 'closed' or (session.ends_at is not null and session.ends_at <= now()) then 'closed'
      when session.status = 'open'
        or (
          session.status = 'scheduled'
          and session.starts_at <= now()
          and (session.ends_at is null or session.ends_at > now())
        ) then 'open'
      else 'scheduled'
    end,
    'platformFeedbackCompletedAt', feedback.submitted_at
  ) order by session.session_number nulls last, session.session_date, session.created_at), '[]'::jsonb)
  into v_result
  from public.studio_sessions session
  left join public.student_session_checkins checkin
    on checkin.session_id = session.id and checkin.auth_user_id = auth.uid()
  left join public.student_session_work_tracks track
    on track.session_id = session.id and track.auth_user_id = auth.uid()
  left join public.student_platform_feedback feedback
    on feedback.session_id = session.id and feedback.auth_user_id = auth.uid()
  where session.block_id = v_block_id;

  return v_result;
end;
$$;

revoke all on function public.get_my_session_journey() from public;
grant execute on function public.get_my_session_journey() to authenticated;

-- Security remains authenticated-only after function replacement.
revoke all on function public.get_my_session_work_track(uuid) from public;
grant execute on function public.get_my_session_work_track(uuid) to authenticated;
revoke all on function public.save_my_session_work_track(uuid, jsonb) from public;
grant execute on function public.save_my_session_work_track(uuid, jsonb) to authenticated;
revoke all on function public.get_my_session_journey() from public;
grant execute on function public.get_my_session_journey() to authenticated;


commit;

-- S10-01 post-apply correction: Supabase can retain explicit anon EXECUTE grants.
-- The Work Track range migration revoked PUBLIC only; this clears both sources.
-- No function bodies or student records change. Apply once after s01_work_track.
begin;
revoke all on function public.get_my_session_work_track(uuid) from public, anon;
revoke all on function public.save_my_session_work_track(uuid, jsonb) from public, anon;
revoke all on function public.get_my_session_journey() from public, anon;
grant execute on function public.get_my_session_work_track(uuid) to authenticated;
grant execute on function public.save_my_session_work_track(uuid, jsonb) to authenticated;
grant execute on function public.get_my_session_journey() to authenticated;
commit;

-- Sprint 10 S10-01b: persist bounded compact-form choices alongside existing early answers.
-- Optional metadata preserves compatibility with the previously deployed form.
-- Getter advertises compact support, preventing premature Preview saves on the shared DB.
-- No table/data change; late requirements/calculation and write authorization unchanged.
begin;
create or replace function public.get_my_session_work_track(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_session public.studio_sessions%rowtype;
  v_track public.student_session_work_tracks%rowtype;
  v_previous_next_focus text;
  v_previous_response jsonb;
  v_previous_completion integer;
  v_block_id uuid;
begin
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  if v_account.student_id is null then
    raise exception using errcode = 'P0001', message = 'Student account is not available';
  end if;

  select roster.block_id into v_block_id
  from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;

  select * into v_session
  from public.studio_sessions
  where id = p_session_id
    and block_id = v_block_id
    and session_number between 1 and 9;

  if v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Session Work Track is not available';
  end if;

  select * into v_track
  from public.student_session_work_tracks
  where session_id = v_session.id and auth_user_id = auth.uid();

  if v_session.session_number > 1 then
    select track.response,
           coalesce(track.response ->> 'nextAction', track.response ->> 'nextFocus'),
           case when jsonb_typeof(track.response -> 'completionPercent') = 'number'
             then (track.response ->> 'completionPercent')::numeric::integer else null end
    into v_previous_response, v_previous_next_focus, v_previous_completion
    from public.student_session_work_tracks track
    join public.studio_sessions previous on previous.id = track.session_id
    where track.auth_user_id = auth.uid()
      and track.block_id = v_block_id
      and previous.session_number < v_session.session_number
      and previous.session_number between 1 and 9
    order by previous.session_number desc
    limit 1;
  end if;

  return jsonb_build_object(
    'earlyFormVersion', 'compact.v1',
    'sessionId', v_session.id,
    'sessionNumber', v_session.session_number,
    'focus', coalesce(v_session.curriculum_focus, v_session.title),
    'taskGuidance', v_session.task_guidance,
    'expectedEvidence', v_session.expected_evidence,
    'isOpen', (
      exists (select 1 from public.teaching_blocks b where b.id = v_block_id and b.intake_mode = 'disabled')
      and (v_session.work_track_access = 'open'
      or (
        v_session.work_track_access = 'session'
        and (
          v_session.status = 'open'
          or (
            v_session.status = 'scheduled'
            and v_session.starts_at <= now()
            and (v_session.ends_at is null or v_session.ends_at > now())
          )
        )
      )
    )),
    'response', coalesce(v_track.response, '{}'::jsonb),
    'updatedAt', v_track.updated_at,
    'previousNextFocus', v_previous_next_focus,
    'previousResponse', v_previous_response,
    'previousCompletion', v_previous_completion
  );
end;
$$;

revoke all on function public.get_my_session_work_track(uuid) from public, anon;
grant execute on function public.get_my_session_work_track(uuid) to authenticated;

create or replace function public.save_my_session_work_track(p_session_id uuid, p_response jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_session public.studio_sessions%rowtype;
  v_block_id uuid;
  v_track public.student_session_work_tracks%rowtype;
  v_response jsonb;
  v_requirement_count integer;
  v_invalid_requirement_count integer;
  v_completion integer;
  v_stage text;
  v_path text;
begin
  if p_response is null or jsonb_typeof(p_response) <> 'object' or length(p_response::text) > 12000 then
    raise exception using errcode = 'P0001', message = 'Work Track response is invalid';
  end if;

  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  select roster.block_id into v_block_id
  from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;

  select * into v_session
  from public.studio_sessions
  where id = p_session_id
    and block_id = v_block_id
    and session_number between 1 and 9
    and exists (select 1 from public.teaching_blocks b where b.id = v_block_id and b.intake_mode = 'disabled')
    and (
      work_track_access = 'open'
      or (
        work_track_access = 'session'
        and (
          status = 'open'
          or (
            status = 'scheduled'
            and starts_at <= now()
            and (ends_at is null or ends_at > now())
          )
        )
      )
    );

  if v_account.student_id is null or v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Work Track can only be updated while this Track is open';
  end if;

  if v_session.session_number between 1 and 5 then
    -- Early progress is not a percentage assessment. Whitelist stored fields;
    -- submitted late metrics or unsupported keys cannot fabricate a score.
    if exists (
      select 1 from unnest(array['responsibility','progress','nextAction']) field
      where jsonb_typeof(p_response -> field) is distinct from 'string'
        or coalesce(btrim(p_response ->> field), '') = ''
        or char_length(p_response ->> field) > 800
    ) or exists (
      select 1 from unnest(array['evidence','support']) field
      where p_response ? field and (
        jsonb_typeof(p_response -> field) is distinct from 'string'
        or char_length(p_response ->> field) > 800
      )
    ) then
      raise exception using errcode = 'P0001', message = 'Describe your responsibility, current progress and next action (up to 800 characters each)';
    end if;
    if p_response ? 'formVersion' then
      if coalesce(p_response ->> 'formVersion','') <> 'compact.v1'
         or jsonb_typeof(p_response -> 'workAreas') is distinct from 'array' then
        raise exception using errcode = 'P0001', message = 'Choose valid Work Track options';
      end if;
      if jsonb_array_length(p_response -> 'workAreas') not between 1 and 7
         or exists (select 1 from jsonb_array_elements(p_response -> 'workAreas') area
           where jsonb_typeof(area) <> 'string' or (area #>> '{}') not in
           ('Requirements','Design','Development','Integration','Testing','Documentation','Other'))
         or (select count(*) from jsonb_array_elements(p_response -> 'workAreas')) <>
            (select count(distinct area) from jsonb_array_elements(p_response -> 'workAreas') area)
         or coalesce(p_response ->> 'progressState','') not in
            ('Completed a task','Made progress','Tried but did not succeed','No progress')
         or coalesce(p_response ->> 'helpKind','') not in
            ('No help needed','Technical problem','Requirement unclear','Team coordination','Teacher guidance')
         or (p_response ? 'previousActionStatus' and coalesce(p_response ->> 'previousActionStatus','') not in
            ('Completed','Partly completed','Not completed','Plan changed'))
         or (p_response ? 'responsibilityCarriedForward' and jsonb_typeof(p_response -> 'responsibilityCarriedForward') is distinct from 'boolean')
         or (p_response ->> 'helpKind' <> 'No help needed' and coalesce(btrim(p_response ->> 'support'),'') = '') then
        raise exception using errcode = 'P0001', message = 'Choose valid Work Track options and describe any help needed';
      end if;
    end if;
    v_response := jsonb_build_object(
      'responsibility', btrim(p_response ->> 'responsibility'),
      'progress', btrim(p_response ->> 'progress'),
      'nextAction', btrim(p_response ->> 'nextAction'),
      'evidence', coalesce(btrim(p_response ->> 'evidence'), ''),
      'support', case when p_response ->> 'formVersion' = 'compact.v1'
        and p_response ->> 'helpKind' = 'No help needed' then ''
        else coalesce(btrim(p_response ->> 'support'), '') end
    );
    if p_response ->> 'formVersion' = 'compact.v1' then
      v_response := v_response || jsonb_strip_nulls(jsonb_build_object(
        'formVersion', 'compact.v1', 'workAreas', p_response -> 'workAreas',
        'progressState', p_response -> 'progressState', 'helpKind', p_response -> 'helpKind',
        'previousActionStatus', p_response -> 'previousActionStatus',
        'responsibilityCarriedForward', coalesce(p_response -> 'responsibilityCarriedForward','false'::jsonb)
      ));
    end if;
  else
  if jsonb_typeof(p_response -> 'requirements') is distinct from 'array' then
    raise exception using errcode = 'P0001', message = 'Add and assess the committed project requirements first';
  end if;

  select count(*),
         count(*) filter (
           where coalesce(btrim(requirement ->> 'label'), '') = ''
              or char_length(requirement ->> 'label') > 120
              or coalesce(requirement ->> 'score', '') not in ('0','25','50','75','100')
         ),
         round(avg(case when coalesce(requirement ->> 'score', '') in ('0','25','50','75','100') then (requirement ->> 'score')::numeric else null end))::integer
  into v_requirement_count, v_invalid_requirement_count, v_completion
  from jsonb_array_elements(p_response -> 'requirements') requirement;

  if v_requirement_count < 3 or v_requirement_count > 8 or v_invalid_requirement_count > 0 then
    raise exception using errcode = 'P0001', message = 'Assess the 3 core requirements and any optional requirements with the 0/25/50/75/100 standard';
  end if;

  if coalesce(p_response -> 'requirements' -> 0 ->> 'label', '') <> 'Core functionality meets the primary user needs'
     or coalesce(p_response -> 'requirements' -> 1 ->> 'label', '') <> 'Main workflow works end-to-end across integrated components'
     or coalesce(p_response -> 'requirements' -> 2 ->> 'label', '') <> 'Critical features are tested or validated with evidence' then
    raise exception using errcode = 'P0001', message = 'The 3 IT Milestone Project core requirements cannot be changed';
  end if;

  v_stage := case
    when v_completion <= 40 then 'Building'
    when v_completion <= 70 then 'Developing'
    when v_completion <= 90 then 'Completing'
    when v_completion < 100 then 'Finalising / Verifying'
    else 'Completed & Verified'
  end;
  v_path := case when v_completion <= 70 then 'building' when v_completion <= 90 then 'completing' else 'verifying' end;
  v_response := jsonb_set(
    jsonb_set(
      jsonb_set(p_response, '{completionPercent}', to_jsonb(v_completion), true),
      '{completionStage}', to_jsonb(v_stage), true
    ),
    '{progressPath}', to_jsonb(v_path), true
  );

  end if;

  insert into public.student_session_work_tracks (
    session_id, student_id, auth_user_id, block_id, response
  ) values (
    v_session.id, v_account.student_id, auth.uid(), v_block_id, v_response
  )
  on conflict (session_id, student_id) do update
    set response = excluded.response,
        updated_at = now(),
        teacher_verified_completion = null,
        teacher_verification_status = null,
        teacher_verification_reason = null,
        teacher_verified_at = null,
        teacher_verified_by = null
  returning * into v_track;

  return jsonb_build_object('updatedAt', v_track.updated_at, 'response', v_track.response);
end;
$$;

revoke all on function public.save_my_session_work_track(uuid, jsonb) from public, anon;
grant execute on function public.save_my_session_work_track(uuid, jsonb) to authenticated;


commit;

-- Sprint 10 S10-AI01: per-Session collection and durable paid-attempt controls.
-- Additive; no modes/windows/budgets are enabled and no historical row is rewritten.
-- Requires applied Sprint 9 and S10-01/01b migrations. Apply once to the shared backend.
begin;
alter table public.studio_sessions add column if not exists intake_mode_override text
  check (intake_mode_override is null or intake_mode_override in ('disabled','deterministic','ai'));
alter table public.teaching_blocks add column if not exists intake_ai_budget_usd numeric(12,6) not null default 0 check (intake_ai_budget_usd between 0 and 1000);
alter table public.teaching_blocks add column if not exists intake_ai_attempt_limit integer not null default 0 check (intake_ai_attempt_limit between 0 and 50);

create or replace function public.resolve_session_collection_mode(p_session_id uuid)
returns text language sql stable security definer set search_path='' as $$
 select coalesce(s.intake_mode_override,b.intake_mode) from public.studio_sessions s
 join public.teaching_blocks b on b.id=s.block_id where s.id=p_session_id;
$$;
revoke all on function public.resolve_session_collection_mode(uuid) from public,anon,authenticated;
grant execute on function public.resolve_session_collection_mode(uuid) to service_role;

-- Serialize both record families to prevent concurrent method-switch double reporting.
create or replace function public.assert_single_session_progress(p_session_id uuid,p_family text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authenticated student required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||p_session_id::text,0));
 if (p_family='intake' and exists(select 1 from public.student_session_work_tracks where session_id=p_session_id and auth_user_id=auth.uid()))
 or (p_family='work' and exists(select 1 from public.student_session_intakes where session_id=p_session_id and auth_user_id=auth.uid())) then
   raise exception 'Progress is already recorded for this Session. View your saved history.';
 end if;
end; $$;
revoke all on function public.assert_single_session_progress(uuid,text) from public,anon,authenticated;
create or replace function public.get_my_session_work_track(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_session public.studio_sessions%rowtype;
  v_track public.student_session_work_tracks%rowtype;
  v_previous_next_focus text;
  v_previous_response jsonb;
  v_previous_completion integer;
  v_block_id uuid;
begin
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  if v_account.student_id is null then
    raise exception using errcode = 'P0001', message = 'Student account is not available';
  end if;

  select roster.block_id into v_block_id
  from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;

  select * into v_session
  from public.studio_sessions
  where id = p_session_id
    and block_id = v_block_id
    and session_number between 1 and 9;

  if v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Session Work Track is not available';
  end if;

  select * into v_track
  from public.student_session_work_tracks
  where session_id = v_session.id and auth_user_id = auth.uid();

  if v_session.session_number > 1 then
    select track.response,
           coalesce(track.response ->> 'nextAction', track.response ->> 'nextFocus'),
           case when jsonb_typeof(track.response -> 'completionPercent') = 'number'
             then (track.response ->> 'completionPercent')::numeric::integer else null end
    into v_previous_response, v_previous_next_focus, v_previous_completion
    from public.student_session_work_tracks track
    join public.studio_sessions previous on previous.id = track.session_id
    where track.auth_user_id = auth.uid()
      and track.block_id = v_block_id
      and previous.session_number < v_session.session_number
      and previous.session_number between 1 and 9
    order by previous.session_number desc
    limit 1;
  end if;

  return jsonb_build_object(
    'earlyFormVersion', 'compact.v1',
    'sessionId', v_session.id,
    'sessionNumber', v_session.session_number,
    'focus', coalesce(v_session.curriculum_focus, v_session.title),
    'taskGuidance', v_session.task_guidance,
    'expectedEvidence', v_session.expected_evidence,
    'isOpen', (
      public.resolve_session_collection_mode(v_session.id) = 'disabled'
      and not exists(select 1 from public.student_session_intakes where session_id=v_session.id and auth_user_id=auth.uid())
      and (v_session.work_track_access = 'open'
      or (
        v_session.work_track_access = 'session'
        and (
          v_session.status = 'open'
          or (
            v_session.status = 'scheduled'
            and v_session.starts_at <= now()
            and (v_session.ends_at is null or v_session.ends_at > now())
          )
        )
      )
    )),
    'response', coalesce(v_track.response, '{}'::jsonb),
    'updatedAt', v_track.updated_at,
    'previousNextFocus', v_previous_next_focus,
    'previousResponse', v_previous_response,
    'previousCompletion', v_previous_completion
  );
end;
$$;

create or replace function public.save_my_session_work_track(p_session_id uuid, p_response jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_session public.studio_sessions%rowtype;
  v_block_id uuid;
  v_track public.student_session_work_tracks%rowtype;
  v_response jsonb;
  v_requirement_count integer;
  v_invalid_requirement_count integer;
  v_completion integer;
  v_stage text;
  v_path text;
begin
  if p_response is null or jsonb_typeof(p_response) <> 'object' or length(p_response::text) > 12000 then
    raise exception using errcode = 'P0001', message = 'Work Track response is invalid';
  end if;

  perform public.assert_single_session_progress(p_session_id,'work');
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  select roster.block_id into v_block_id
  from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;

  select * into v_session
  from public.studio_sessions
  where id = p_session_id
    and block_id = v_block_id
    and session_number between 1 and 9
    and public.resolve_session_collection_mode(p_session_id) = 'disabled'
    and (
      work_track_access = 'open'
      or (
        work_track_access = 'session'
        and (
          status = 'open'
          or (
            status = 'scheduled'
            and starts_at <= now()
            and (ends_at is null or ends_at > now())
          )
        )
      )
    );

  if v_account.student_id is null or v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Work Track can only be updated while this Track is open';
  end if;

  if v_session.session_number between 1 and 5 then
    -- Early progress is not a percentage assessment. Whitelist stored fields;
    -- submitted late metrics or unsupported keys cannot fabricate a score.
    if exists (
      select 1 from unnest(array['responsibility','progress','nextAction']) field
      where jsonb_typeof(p_response -> field) is distinct from 'string'
        or coalesce(btrim(p_response ->> field), '') = ''
        or char_length(p_response ->> field) > 800
    ) or exists (
      select 1 from unnest(array['evidence','support']) field
      where p_response ? field and (
        jsonb_typeof(p_response -> field) is distinct from 'string'
        or char_length(p_response ->> field) > 800
      )
    ) then
      raise exception using errcode = 'P0001', message = 'Describe your responsibility, current progress and next action (up to 800 characters each)';
    end if;
    if p_response ? 'formVersion' then
      if coalesce(p_response ->> 'formVersion','') <> 'compact.v1'
         or jsonb_typeof(p_response -> 'workAreas') is distinct from 'array' then
        raise exception using errcode = 'P0001', message = 'Choose valid Work Track options';
      end if;
      if jsonb_array_length(p_response -> 'workAreas') not between 1 and 7
         or exists (select 1 from jsonb_array_elements(p_response -> 'workAreas') area
           where jsonb_typeof(area) <> 'string' or (area #>> '{}') not in
           ('Requirements','Design','Development','Integration','Testing','Documentation','Other'))
         or (select count(*) from jsonb_array_elements(p_response -> 'workAreas')) <>
            (select count(distinct area) from jsonb_array_elements(p_response -> 'workAreas') area)
         or coalesce(p_response ->> 'progressState','') not in
            ('Completed a task','Made progress','Tried but did not succeed','No progress')
         or coalesce(p_response ->> 'helpKind','') not in
            ('No help needed','Technical problem','Requirement unclear','Team coordination','Teacher guidance')
         or (p_response ? 'previousActionStatus' and coalesce(p_response ->> 'previousActionStatus','') not in
            ('Completed','Partly completed','Not completed','Plan changed'))
         or (p_response ? 'responsibilityCarriedForward' and jsonb_typeof(p_response -> 'responsibilityCarriedForward') is distinct from 'boolean')
         or (p_response ->> 'helpKind' <> 'No help needed' and coalesce(btrim(p_response ->> 'support'),'') = '') then
        raise exception using errcode = 'P0001', message = 'Choose valid Work Track options and describe any help needed';
      end if;
    end if;
    v_response := jsonb_build_object(
      'responsibility', btrim(p_response ->> 'responsibility'),
      'progress', btrim(p_response ->> 'progress'),
      'nextAction', btrim(p_response ->> 'nextAction'),
      'evidence', coalesce(btrim(p_response ->> 'evidence'), ''),
      'support', case when p_response ->> 'formVersion' = 'compact.v1'
        and p_response ->> 'helpKind' = 'No help needed' then ''
        else coalesce(btrim(p_response ->> 'support'), '') end
    );
    if p_response ->> 'formVersion' = 'compact.v1' then
      v_response := v_response || jsonb_strip_nulls(jsonb_build_object(
        'formVersion', 'compact.v1', 'workAreas', p_response -> 'workAreas',
        'progressState', p_response -> 'progressState', 'helpKind', p_response -> 'helpKind',
        'previousActionStatus', p_response -> 'previousActionStatus',
        'responsibilityCarriedForward', coalesce(p_response -> 'responsibilityCarriedForward','false'::jsonb)
      ));
    end if;
  else
  if jsonb_typeof(p_response -> 'requirements') is distinct from 'array' then
    raise exception using errcode = 'P0001', message = 'Add and assess the committed project requirements first';
  end if;

  select count(*),
         count(*) filter (
           where coalesce(btrim(requirement ->> 'label'), '') = ''
              or char_length(requirement ->> 'label') > 120
              or coalesce(requirement ->> 'score', '') not in ('0','25','50','75','100')
         ),
         round(avg(case when coalesce(requirement ->> 'score', '') in ('0','25','50','75','100') then (requirement ->> 'score')::numeric else null end))::integer
  into v_requirement_count, v_invalid_requirement_count, v_completion
  from jsonb_array_elements(p_response -> 'requirements') requirement;

  if v_requirement_count < 3 or v_requirement_count > 8 or v_invalid_requirement_count > 0 then
    raise exception using errcode = 'P0001', message = 'Assess the 3 core requirements and any optional requirements with the 0/25/50/75/100 standard';
  end if;

  if coalesce(p_response -> 'requirements' -> 0 ->> 'label', '') <> 'Core functionality meets the primary user needs'
     or coalesce(p_response -> 'requirements' -> 1 ->> 'label', '') <> 'Main workflow works end-to-end across integrated components'
     or coalesce(p_response -> 'requirements' -> 2 ->> 'label', '') <> 'Critical features are tested or validated with evidence' then
    raise exception using errcode = 'P0001', message = 'The 3 IT Milestone Project core requirements cannot be changed';
  end if;

  v_stage := case
    when v_completion <= 40 then 'Building'
    when v_completion <= 70 then 'Developing'
    when v_completion <= 90 then 'Completing'
    when v_completion < 100 then 'Finalising / Verifying'
    else 'Completed & Verified'
  end;
  v_path := case when v_completion <= 70 then 'building' when v_completion <= 90 then 'completing' else 'verifying' end;
  v_response := jsonb_set(
    jsonb_set(
      jsonb_set(p_response, '{completionPercent}', to_jsonb(v_completion), true),
      '{completionStage}', to_jsonb(v_stage), true
    ),
    '{progressPath}', to_jsonb(v_path), true
  );

  end if;

  insert into public.student_session_work_tracks (
    session_id, student_id, auth_user_id, block_id, response
  ) values (
    v_session.id, v_account.student_id, auth.uid(), v_block_id, v_response
  )
  on conflict (session_id, student_id) do update
    set response = excluded.response,
        updated_at = now(),
        teacher_verified_completion = null,
        teacher_verification_status = null,
        teacher_verification_reason = null,
        teacher_verified_at = null,
        teacher_verified_by = null
  returning * into v_track;

  return jsonb_build_object('updatedAt', v_track.updated_at, 'response', v_track.response);
end;
$$;

create or replace function public.save_my_session_intake_chat(
  p_session_id uuid,
  p_source_conversation jsonb,
  p_student_record jsonb,
  p_student_confirmation jsonb,
  p_prompt_version text,
  p_ai_assistance jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_roster public.student_roster%rowtype;
  v_session public.studio_sessions%rowtype;
  v_intake public.student_session_intakes%rowtype;
  v_errors text[];
  v_payload_hash text;
  v_allowed_ai_keys text[] := array[
    'used','model','policy_version','follow_up_count','question_purposes',
    'extraction_status','stop_reason','extracted_record','turn_results','turn_decisions'
  ];
begin
  perform public.assert_single_session_progress(p_session_id,'intake');
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  if v_account.student_id is null then
    raise exception using errcode = 'P0001', message = 'Student account is not available';
  end if;

  select roster.* into v_roster
  from public.student_roster roster
  where roster.student_id = v_account.student_id
    and roster.block_id = (
      select session.block_id from public.studio_sessions session where session.id = p_session_id
    );

  select session.* into v_session
  from public.studio_sessions session
  where session.id = p_session_id
    and session.block_id = v_roster.block_id
    and session.session_number between 1 and 9
    and public.resolve_session_collection_mode(session.id) in ('deterministic','ai')
    and (
      session.intake_access = 'open'
      or (
        session.intake_access = 'session'
        and (
          session.status = 'open'
          or (
            session.status = 'scheduled'
            and session.starts_at <= now()
            and (session.ends_at is null or session.ends_at > now())
          )
        )
      )
    );

  if v_roster.id is null or v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Session Intake can only be submitted while it is open';
  end if;

  if exists (
    select 1 from public.student_session_intakes
    where session_id = v_session.id and student_id = v_account.student_id
  ) then
    raise exception using errcode = 'P0001', message = 'This Session Intake has already been confirmed';
  end if;

  if p_source_conversation is null
     or jsonb_typeof(p_source_conversation) <> 'array'
     or jsonb_array_length(p_source_conversation) not between 3 and 17
     or length(p_source_conversation::text) > 48000
     or exists (
       select 1 from jsonb_array_elements(p_source_conversation) turn
       where jsonb_typeof(turn) <> 'object'
          or coalesce(turn ->> 'actor','') not in ('student','system')
          or char_length(btrim(coalesce(turn ->> 'purpose',''))) not between 3 and 80
          or char_length(btrim(coalesce(turn ->> 'text',''))) not between 1 and 2000
     ) then
    raise exception using errcode = 'P0001', message = 'AI-assisted conversation is invalid';
  end if;

  if mod(jsonb_array_length(p_source_conversation),2) <> 1
     or p_source_conversation -> -1 ->> 'purpose' is distinct from 'review transition'
     or exists (
       select 1 from jsonb_array_elements(p_source_conversation) with ordinality as t(value,n)
       where value ->> 'actor' is distinct from case when mod(n,2)=1 then 'system' else 'student' end
          or (value ->> 'purpose' = 'review transition' and n <> jsonb_array_length(p_source_conversation))
     ) then
    raise exception 'Chat conversation order is invalid';
  end if;

  v_errors := public.validate_session_intake_student_record_v11(p_student_record);
  if cardinality(v_errors) > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Session Intake evidence is incomplete',
      detail = array_to_string(v_errors, '; ');
  end if;

  if p_student_confirmation is null
     or jsonb_typeof(p_student_confirmation) <> 'object'
     or coalesce(p_student_confirmation ->> 'status','') <> 'confirmed'
     or coalesce(p_student_confirmation ->> 'attestation','') <>
       'This summary reflects what I am claiming and the evidence I have identified. Teacher verification is separate.'
     or jsonb_typeof(coalesce(p_student_confirmation -> 'corrections','[]'::jsonb)) <> 'array'
     or length(p_student_confirmation::text) > 48000 then
    raise exception using errcode = 'P0001', message = 'Student confirmation is invalid';
  end if;

  if p_prompt_version is null
     or p_prompt_version not in ('session-intake-ai.v1.2.0','session-intake-ai.v1.3.0') then
    raise exception using errcode = 'P0001', message = 'AI Intake prompt version is invalid';
  end if;

  if p_ai_assistance is null or jsonb_typeof(p_ai_assistance) <> 'object'
     or exists (select 1 from jsonb_object_keys(p_ai_assistance) key where not (key = any(v_allowed_ai_keys)))
     or p_ai_assistance ->> 'policy_version' not in ('adaptive-intake.v1.0.0','adaptive-intake.v1.1.0')
     or jsonb_typeof(p_ai_assistance -> 'used') is distinct from 'boolean'
     or coalesce(p_ai_assistance ->> 'extraction_status','') not in ('completed','fallback','not_used')
     or coalesce(p_ai_assistance ->> 'stop_reason','') not in ('sufficient_information','teacher_help','budget_exhausted','provider_failure')
     or coalesce((p_ai_assistance ->> 'follow_up_count')::integer,-1) <> greatest(0, (jsonb_array_length(p_source_conversation)-1)/2-3)
     or jsonb_typeof(p_ai_assistance -> 'question_purposes') is distinct from 'array'
     or jsonb_array_length(p_ai_assistance -> 'question_purposes') <> greatest(0, (jsonb_array_length(p_source_conversation)-1)/2-3)
     or jsonb_typeof(p_ai_assistance -> 'extracted_record') is distinct from 'object'
     or jsonb_typeof(p_ai_assistance -> 'turn_results') is distinct from 'array'
     or jsonb_array_length(p_ai_assistance -> 'turn_results') > 8
     or (p_ai_assistance ? 'turn_decisions' and (jsonb_typeof(p_ai_assistance -> 'turn_decisions') is distinct from 'array' or jsonb_array_length(p_ai_assistance -> 'turn_decisions') > 8))
     or length(p_ai_assistance::text) > 96000 then
    raise exception 'Chat assistance metadata is invalid';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_ai_assistance -> 'turn_results') r,
      lateral jsonb_array_elements(r -> 'evidenceUpdates') u
    where coalesce(u ->> 'sourceTurn','') !~ '^[0-9]+$'
       or p_source_conversation -> ((u ->> 'sourceTurn')::integer) ->> 'actor' is distinct from 'student'
  ) then
    raise exception 'Chat evidence source is invalid';
  end if;

  v_payload_hash := md5(
    'session-intake.v1.1.0' ||
    p_session_id::text ||
    auth.uid()::text ||
    p_source_conversation::text ||
    p_student_record::text ||
    p_student_confirmation::text ||
    p_ai_assistance::text
  );

  insert into public.student_session_intakes (
    session_id, block_id, student_id, auth_user_id,
    schema_version, source_mode, prompt_version, test_suite_version,
    source_conversation, student_record, ai_assistance,
    student_confirmation, confirmed_payload_hash
  ) values (
    v_session.id, v_session.block_id, v_account.student_id, auth.uid(),
    'session-intake.v1.1.0', case when (p_ai_assistance ->> 'used')::boolean then 'ai_assisted' else 'deterministic_fallback' end, p_prompt_version,
    'ai-intake-suite.v1.1.0', p_source_conversation, p_student_record,
    p_ai_assistance, p_student_confirmation, v_payload_hash
  )
  returning * into v_intake;

  return jsonb_build_object(
    'intakeId', v_intake.id,
    'schemaVersion', v_intake.schema_version,
    'sourceMode', v_intake.source_mode,
    'promptVersion', v_intake.prompt_version,
    'confirmedAt', v_intake.confirmed_at,
    'confirmedPayloadHash', v_intake.confirmed_payload_hash
  );
end;
$$;

create or replace function public.save_my_session_intake_ai(
  p_session_id uuid,
  p_source_conversation jsonb,
  p_student_record jsonb,
  p_student_confirmation jsonb,
  p_prompt_version text,
  p_ai_assistance jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_roster public.student_roster%rowtype;
  v_session public.studio_sessions%rowtype;
  v_intake public.student_session_intakes%rowtype;
  v_errors text[];
  v_payload_hash text;
  v_allowed_ai_keys text[] := array[
    'used','model','follow_up_count','question_purposes','extraction_status',
    'uncertainties','flags','suggested_teacher_questions'
  ];
begin
  perform public.assert_single_session_progress(p_session_id,'intake');
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  if v_account.student_id is null then
    raise exception using errcode = 'P0001', message = 'Student account is not available';
  end if;

  select roster.* into v_roster
  from public.student_roster roster
  where roster.student_id = v_account.student_id
    and roster.block_id = (
      select session.block_id from public.studio_sessions session where session.id = p_session_id
    );

  select session.* into v_session
  from public.studio_sessions session
  where session.id = p_session_id
    and session.block_id = v_roster.block_id
    and session.session_number between 1 and 9
    and public.resolve_session_collection_mode(session.id) = 'ai'
    and (
      session.intake_access = 'open'
      or (
        session.intake_access = 'session'
        and (
          session.status = 'open'
          or (
            session.status = 'scheduled'
            and session.starts_at <= now()
            and (session.ends_at is null or session.ends_at > now())
          )
        )
      )
    );

  if v_roster.id is null or v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Session Intake can only be submitted while it is open';
  end if;

  if exists (
    select 1 from public.student_session_intakes
    where session_id = v_session.id and student_id = v_account.student_id
  ) then
    raise exception using errcode = 'P0001', message = 'This Session Intake has already been confirmed';
  end if;

  if p_source_conversation is null
     or jsonb_typeof(p_source_conversation) <> 'array'
     or jsonb_array_length(p_source_conversation) not between 3 and 12
     or length(p_source_conversation::text) > 16000
     or exists (
       select 1 from jsonb_array_elements(p_source_conversation) turn
       where jsonb_typeof(turn) <> 'object'
          or coalesce(turn ->> 'actor','') not in ('student','system')
          or char_length(btrim(coalesce(turn ->> 'purpose',''))) not between 3 and 80
          or char_length(btrim(coalesce(turn ->> 'text',''))) not between 1 and 2000
     ) then
    raise exception using errcode = 'P0001', message = 'AI-assisted conversation is invalid';
  end if;

  v_errors := public.validate_session_intake_student_record(p_student_record);
  if cardinality(v_errors) > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Session Intake evidence is incomplete',
      detail = array_to_string(v_errors, '; ');
  end if;

  if p_student_confirmation is null
     or jsonb_typeof(p_student_confirmation) <> 'object'
     or coalesce(p_student_confirmation ->> 'status','') <> 'confirmed'
     or coalesce(p_student_confirmation ->> 'attestation','') <>
       'This summary reflects what I am claiming and the evidence I have identified. Teacher verification is separate.'
     or jsonb_typeof(coalesce(p_student_confirmation -> 'corrections','[]'::jsonb)) <> 'array'
     or length(p_student_confirmation::text) > 8000 then
    raise exception using errcode = 'P0001', message = 'Student confirmation is invalid';
  end if;

  if p_prompt_version is null
     or p_prompt_version <> 'session-intake-ai.v1.1.0' then
    raise exception using errcode = 'P0001', message = 'AI Intake prompt version is invalid';
  end if;

  if p_ai_assistance is null
     or jsonb_typeof(p_ai_assistance) <> 'object'
     or exists (
       select 1 from jsonb_object_keys(p_ai_assistance) key
       where not (key = any(v_allowed_ai_keys))
     )
     or coalesce((p_ai_assistance ->> 'used')::boolean, false) is not true
     or coalesce(p_ai_assistance ->> 'extraction_status','') <> 'completed'
     or coalesce((p_ai_assistance ->> 'follow_up_count')::integer, -1) not between 0 and 3
     or jsonb_typeof(coalesce(p_ai_assistance -> 'question_purposes','[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_ai_assistance -> 'question_purposes','[]'::jsonb)) > 3
     or jsonb_typeof(coalesce(p_ai_assistance -> 'uncertainties','[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_ai_assistance -> 'uncertainties','[]'::jsonb)) > 5
     or jsonb_typeof(coalesce(p_ai_assistance -> 'flags','[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_ai_assistance -> 'flags','[]'::jsonb)) > 5
     or jsonb_typeof(coalesce(p_ai_assistance -> 'suggested_teacher_questions','[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_ai_assistance -> 'suggested_teacher_questions','[]'::jsonb)) > 3
     or length(p_ai_assistance::text) > 8000 then
    raise exception using errcode = 'P0001', message = 'AI assistance metadata is invalid';
  end if;

  v_payload_hash := md5(
    'session-intake.v1.0.0' ||
    p_session_id::text ||
    auth.uid()::text ||
    p_source_conversation::text ||
    p_student_record::text ||
    p_student_confirmation::text ||
    p_ai_assistance::text
  );

  insert into public.student_session_intakes (
    session_id, block_id, student_id, auth_user_id,
    schema_version, source_mode, prompt_version, test_suite_version,
    source_conversation, student_record, ai_assistance,
    student_confirmation, confirmed_payload_hash
  ) values (
    v_session.id, v_session.block_id, v_account.student_id, auth.uid(),
    'session-intake.v1.0.0', 'ai_assisted', p_prompt_version,
    'ai-intake-suite.v1.0.0', p_source_conversation, p_student_record,
    p_ai_assistance, p_student_confirmation, v_payload_hash
  )
  returning * into v_intake;

  return jsonb_build_object(
    'intakeId', v_intake.id,
    'schemaVersion', v_intake.schema_version,
    'sourceMode', v_intake.source_mode,
    'promptVersion', v_intake.prompt_version,
    'confirmedAt', v_intake.confirmed_at,
    'confirmedPayloadHash', v_intake.confirmed_payload_hash
  );
end;
$$;

create or replace function public.save_my_session_intake_fallback(
  p_session_id uuid,
  p_source_conversation jsonb,
  p_student_record jsonb,
  p_student_confirmation jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_roster public.student_roster%rowtype;
  v_session public.studio_sessions%rowtype;
  v_intake public.student_session_intakes%rowtype;
  v_errors text[];
  v_payload_hash text;
begin
  perform public.assert_single_session_progress(p_session_id,'intake');
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  if v_account.student_id is null then
    raise exception using errcode = 'P0001', message = 'Student account is not available';
  end if;

  select roster.* into v_roster
  from public.student_roster roster
  where roster.student_id = v_account.student_id
    and roster.block_id = (
      select session.block_id from public.studio_sessions session where session.id = p_session_id
    );

  select session.* into v_session
  from public.studio_sessions session
  where session.id = p_session_id
    and session.block_id = v_roster.block_id
    and session.session_number between 1 and 9
    and public.resolve_session_collection_mode(session.id) in ('deterministic','ai')
    and (
      session.intake_access = 'open'
      or (
        session.intake_access = 'session'
        and (
          session.status = 'open'
          or (
            session.status = 'scheduled'
            and session.starts_at <= now()
            and (session.ends_at is null or session.ends_at > now())
          )
        )
      )
    );

  if v_roster.id is null or v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Session Intake can only be submitted while it is open';
  end if;

  if exists (
    select 1 from public.student_session_intakes
    where session_id = v_session.id and student_id = v_account.student_id
  ) then
    raise exception using errcode = 'P0001', message = 'This Session Intake has already been confirmed';
  end if;

  if p_source_conversation is null
     or jsonb_typeof(p_source_conversation) <> 'array'
     or jsonb_array_length(p_source_conversation) not between 3 and 12
     or length(p_source_conversation::text) > 16000
     or exists (
       select 1 from jsonb_array_elements(p_source_conversation) turn
       where jsonb_typeof(turn) <> 'object'
          or coalesce(turn ->> 'actor','') not in ('student','system')
          or char_length(btrim(coalesce(turn ->> 'purpose',''))) not between 3 and 80
          or char_length(btrim(coalesce(turn ->> 'text',''))) not between 1 and 2000
     ) then
    raise exception using errcode = 'P0001', message = 'Fallback conversation is invalid';
  end if;

  v_errors := public.validate_session_intake_student_record(p_student_record);
  if cardinality(v_errors) > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Session Intake evidence is incomplete',
      detail = array_to_string(v_errors, '; ');
  end if;

  if p_student_confirmation is null
     or jsonb_typeof(p_student_confirmation) <> 'object'
     or coalesce(p_student_confirmation ->> 'status','') <> 'confirmed'
     or coalesce(p_student_confirmation ->> 'attestation','') <>
       'This summary reflects what I am claiming and the evidence I have identified. Teacher verification is separate.'
     or jsonb_typeof(coalesce(p_student_confirmation -> 'corrections','[]'::jsonb)) <> 'array'
     or length(p_student_confirmation::text) > 8000 then
    raise exception using errcode = 'P0001', message = 'Student confirmation is invalid';
  end if;

  v_payload_hash := md5(
    'session-intake.v1.0.0' ||
    p_session_id::text ||
    auth.uid()::text ||
    p_source_conversation::text ||
    p_student_record::text ||
    p_student_confirmation::text
  );

  insert into public.student_session_intakes (
    session_id, block_id, student_id, auth_user_id,
    schema_version, source_mode, prompt_version, test_suite_version,
    source_conversation, student_record, ai_assistance,
    student_confirmation, confirmed_payload_hash
  ) values (
    v_session.id, v_session.block_id, v_account.student_id, auth.uid(),
    'session-intake.v1.0.0', 'deterministic_fallback', null,
    'ai-intake-suite.v1.0.0', p_source_conversation, p_student_record,
    '{"used":false,"follow_up_count":0,"question_purposes":[],"extraction_status":"not_used","uncertainties":[],"flags":[],"suggested_teacher_questions":[]}'::jsonb,
    p_student_confirmation, v_payload_hash
  )
  returning * into v_intake;

  return jsonb_build_object(
    'intakeId', v_intake.id,
    'schemaVersion', v_intake.schema_version,
    'sourceMode', v_intake.source_mode,
    'confirmedAt', v_intake.confirmed_at,
    'confirmedPayloadHash', v_intake.confirmed_payload_hash
  );
end;
$$;

create or replace function public.get_my_session_journey()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_block_id uuid;
  v_result jsonb;
begin
  select * into v_account from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';
  if v_account.student_id is null then return '[]'::jsonb; end if;

  select roster.block_id into v_block_id
  from public.student_roster roster join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc limit 1;
  if v_block_id is null then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'sessionId', session.id,
    'sessionNumber', session.session_number,
    'weekNumber', session.week_number,
    'focus', coalesce(session.curriculum_focus, session.title),
    'title', session.title,
    'sessionDate', session.session_date,
    'startsAt', session.starts_at,
    'endsAt', session.ends_at,
    'status', case
      when session.status = 'open' then 'open'
      when session.status = 'closed' then 'closed'
      when session.starts_at is not null and session.starts_at <= now() and (session.ends_at is null or session.ends_at > now()) then 'open'
      when session.ends_at is not null and session.ends_at <= now() then 'closed'
      else 'scheduled' end,
    'checkedInAt', checkin.checked_in_at,
    'collectionMode', public.resolve_session_collection_mode(session.id),
    'intakeConfirmedAt', (select confirmed_at from public.student_session_intakes where session_id=session.id and auth_user_id=auth.uid()),
    'intakeStatus', case
      when session.session_number not between 1 and 9 then null
      when public.resolve_session_collection_mode(session.id)='disabled' then 'closed'
      when session.intake_access='open' then 'open'
      when session.intake_access='closed' then 'closed'
      when session.status='open' or (session.status='scheduled' and session.starts_at<=now() and (session.ends_at is null or session.ends_at>now())) then 'open'
      else 'closed' end,
    'workTrackUpdatedAt', track.updated_at,
    'workTrackStatus', case
      when session.session_number not between 1 and 9 then null
      when public.resolve_session_collection_mode(session.id) <> 'disabled' then 'closed'
      when session.work_track_access = 'open' then 'open'
      when session.work_track_access = 'closed' then 'closed'
      when session.status = 'closed' or (session.ends_at is not null and session.ends_at <= now()) then 'closed'
      when session.status = 'open'
        or (
          session.status = 'scheduled'
          and session.starts_at <= now()
          and (session.ends_at is null or session.ends_at > now())
        ) then 'open'
      else 'scheduled'
    end,
    'platformFeedbackCompletedAt', feedback.submitted_at
  ) order by session.session_number nulls last, session.session_date, session.created_at), '[]'::jsonb)
  into v_result
  from public.studio_sessions session
  left join public.student_session_checkins checkin
    on checkin.session_id = session.id and checkin.auth_user_id = auth.uid()
  left join public.student_session_work_tracks track
    on track.session_id = session.id and track.auth_user_id = auth.uid()
  left join public.student_platform_feedback feedback
    on feedback.session_id = session.id and feedback.auth_user_id = auth.uid()
  where session.block_id = v_block_id;

  return v_result;
end;
$$;

create or replace function public.get_my_session_intake(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_roster public.student_roster%rowtype;
  v_session public.studio_sessions%rowtype;
  v_current public.student_session_intakes%rowtype;
  v_previous public.student_session_intakes%rowtype;
begin
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  if v_account.student_id is null then
    raise exception using errcode = 'P0001', message = 'Student account is not available';
  end if;

  select roster.* into v_roster
  from public.student_roster roster
  where roster.student_id = v_account.student_id
    and roster.block_id = (
      select session.block_id from public.studio_sessions session where session.id = p_session_id
    );

  select session.* into v_session
  from public.studio_sessions session
  where session.id = p_session_id
    and session.block_id = v_roster.block_id
    and session.session_number between 1 and 9;

  if v_roster.id is null or v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Session Intake is not available';
  end if;

  select * into v_current
  from public.student_session_intakes intake
  where intake.session_id = v_session.id and intake.auth_user_id = auth.uid();

  select intake.* into v_previous
  from public.student_session_intakes intake
  join public.studio_sessions previous_session on previous_session.id = intake.session_id
  where intake.block_id = v_session.block_id
    and intake.student_id = v_account.student_id
    and previous_session.session_number < v_session.session_number
  order by previous_session.session_number desc
  limit 1;

  return jsonb_build_object(
    'schemaVersion', 'session-intake.v1.0.0',
    'testSuiteVersion', 'ai-intake-suite.v1.0.0',
    'sessionId', v_session.id,
    'sessionNumber', v_session.session_number,
    'blockId', v_session.block_id,
    'effectiveMode', public.resolve_session_collection_mode(v_session.id),
    'workTrackUpdatedAt', (select updated_at from public.student_session_work_tracks where session_id=v_session.id and auth_user_id=auth.uid()),
    'isOpen', (
      public.resolve_session_collection_mode(v_session.id) in ('deterministic','ai')
      and not exists(select 1 from public.student_session_work_tracks where session_id=v_session.id and auth_user_id=auth.uid())
      and (
      v_session.intake_access = 'open'
      or (
        v_session.intake_access = 'session'
        and (
          v_session.status = 'open'
          or (
            v_session.status = 'scheduled'
            and v_session.starts_at <= now()
            and (v_session.ends_at is null or v_session.ends_at > now())
          )
        )
      )
    )),
    'confirmedRecord', case when v_current.id is null then null else jsonb_build_object(
      'intakeId', v_current.id,
      'sourceMode', v_current.source_mode,
      'studentRecord', v_current.student_record,
      'studentConfirmation', v_current.student_confirmation,
      'confirmedAt', v_current.confirmed_at
    ) end,
    'previousConfirmed', case when v_previous.id is null then null else jsonb_build_object(
      'intakeId', v_previous.id,
      'studentRecord', v_previous.student_record,
      'confirmedAt', v_previous.confirmed_at
    ) end
  );
end;
$$;
revoke all on function public.get_my_session_work_track(uuid) from public,anon;
grant execute on function public.get_my_session_work_track(uuid) to authenticated;
revoke all on function public.save_my_session_work_track(uuid,jsonb) from public,anon;
grant execute on function public.save_my_session_work_track(uuid,jsonb) to authenticated;
revoke all on function public.get_my_session_journey() from public,anon;
grant execute on function public.get_my_session_journey() to authenticated;
revoke all on function public.get_my_session_intake(uuid) from public,anon;
grant execute on function public.get_my_session_intake(uuid) to authenticated;
revoke all on function public.save_my_session_intake_chat(uuid,jsonb,jsonb,jsonb,text,jsonb) from public,anon;
grant execute on function public.save_my_session_intake_chat(uuid,jsonb,jsonb,jsonb,text,jsonb) to authenticated;
revoke all on function public.save_my_session_intake_ai(uuid,jsonb,jsonb,jsonb,text,jsonb) from public,anon;
grant execute on function public.save_my_session_intake_ai(uuid,jsonb,jsonb,jsonb,text,jsonb) to authenticated;
revoke all on function public.save_my_session_intake_fallback(uuid,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.save_my_session_intake_fallback(uuid,jsonb,jsonb,jsonb) to authenticated;

-- No transcripts, prompts, keys or provider responses are stored in the usage ledger.
create table if not exists public.session_intake_ai_usage (
 id uuid primary key default gen_random_uuid(), block_id uuid not null references public.teaching_blocks(id),
 session_id uuid not null references public.studio_sessions(id), auth_user_id uuid not null references auth.users(id),
 student_id text not null, request_id uuid not null, attempt integer not null check(attempt between 0 and 1),
 provider text not null, model text not null, pricing_version text not null,
 input_ceiling bigint not null, output_ceiling bigint not null,
 input_rate numeric not null, output_rate numeric not null,
 reserved_usd numeric(14,8) not null, charged_usd numeric(14,8) not null,
 observed_usd numeric(14,8), input_tokens bigint, output_tokens bigint,
 status text not null default 'reserved' check(status in ('reserved','settled','uncertain')),
 reconciliation_required boolean not null default false, created_at timestamptz not null default now(),
 unique(auth_user_id,request_id,attempt)
);
create index if not exists session_intake_ai_usage_block on public.session_intake_ai_usage(block_id);
create index if not exists session_intake_ai_usage_student_session on public.session_intake_ai_usage(auth_user_id,session_id);
alter table public.session_intake_ai_usage enable row level security;
revoke all on public.session_intake_ai_usage from public,anon,authenticated;
grant all on public.session_intake_ai_usage to service_role;

create or replace function public.reserve_session_intake_ai_attempt(
 p_auth_user_id uuid,p_session_id uuid,p_request_id uuid,p_attempt integer,
 p_provider text,p_model text,p_pricing_version text,p_input_ceiling bigint,p_output_ceiling bigint,
 p_input_rate numeric,p_output_rate numeric
) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.studio_sessions%rowtype; b public.teaching_blocks%rowtype;
 a public.student_accounts%rowtype; v_cost numeric; v_used numeric; v_id uuid; v_active uuid;
begin
 if p_attempt not between 0 and 1 or p_request_id is null or p_model is null or p_pricing_version is null
 or p_provider not in ('openai','deepseek') or p_input_ceiling not between 1 and 1000000
 or p_output_ceiling not between 1 and 20000 or p_input_rate is null or p_output_rate is null
 or p_input_rate<0 or p_output_rate<0 or p_input_rate+p_output_rate<=0
 or p_input_rate>1000 or p_output_rate>1000 then raise exception 'Usage configuration invalid'; end if;
 select * into a from public.student_accounts where auth_user_id=p_auth_user_id and status='activated';
 select r.block_id into v_active from public.student_roster r join public.teaching_blocks tb on tb.id=r.block_id
 where r.student_id=a.student_id and tb.status='active' order by tb.starts_on desc nulls last,tb.created_at desc limit 1;
 select * into s from public.studio_sessions where id=p_session_id and block_id=v_active and session_number between 1 and 9;
 if a.student_id is null or s.id is null then raise exception 'Session AI access denied'; end if;
 -- Block lock serializes all reservations and budget edits, including concurrent students.
 select * into b from public.teaching_blocks where id=s.block_id for update;
 perform pg_advisory_xact_lock(hashtextextended(p_auth_user_id::text||':'||s.id::text,0));
 if public.resolve_session_collection_mode(s.id)<>'ai'
 or not coalesce((s.intake_access='open' or (s.intake_access='session' and (s.status='open' or (s.status='scheduled' and s.starts_at<=now() and (s.ends_at is null or s.ends_at>now()))))),false) then
 raise exception 'Session AI is not open'; end if;
 if exists(select 1 from public.student_session_intakes where session_id=s.id and auth_user_id=p_auth_user_id)
 or exists(select 1 from public.student_session_work_tracks where session_id=s.id and auth_user_id=p_auth_user_id) then
 raise exception 'Progress already recorded'; end if;
 if b.intake_ai_budget_usd<=0 or b.intake_ai_attempt_limit<=0 then raise exception 'AI trial budget not configured'; end if;
 if exists(select 1 from public.session_intake_ai_usage where block_id=b.id and reconciliation_required) then raise exception 'AI usage needs reconciliation'; end if;
 if exists(select 1 from public.session_intake_ai_usage where auth_user_id=p_auth_user_id and request_id=p_request_id and attempt=p_attempt) then
 raise exception 'AI request already reserved'; end if;
 if (select count(*) from public.session_intake_ai_usage where auth_user_id=p_auth_user_id and session_id=s.id)>=b.intake_ai_attempt_limit then
 raise exception 'Session AI attempt limit reached'; end if;
 v_cost:=ceil((p_input_ceiling*p_input_rate+p_output_ceiling*p_output_rate)/1000000*100000000)/100000000;
 select coalesce(sum(charged_usd),0) into v_used from public.session_intake_ai_usage where block_id=b.id;
 if v_used+v_cost>b.intake_ai_budget_usd then raise exception 'Block AI budget reached'; end if;
 insert into public.session_intake_ai_usage(block_id,session_id,auth_user_id,student_id,request_id,attempt,provider,model,pricing_version,input_ceiling,output_ceiling,input_rate,output_rate,reserved_usd,charged_usd)
 values(b.id,s.id,p_auth_user_id,a.student_id,p_request_id,p_attempt,p_provider,p_model,p_pricing_version,p_input_ceiling,p_output_ceiling,p_input_rate,p_output_rate,v_cost,v_cost) returning id into v_id;
 return jsonb_build_object('attemptId',v_id,'reservedUsd',v_cost,'pricingVersion',p_pricing_version);
end; $$;
revoke all on function public.reserve_session_intake_ai_attempt(uuid,uuid,uuid,integer,text,text,text,bigint,bigint,numeric,numeric) from public,anon,authenticated;
grant execute on function public.reserve_session_intake_ai_attempt(uuid,uuid,uuid,integer,text,text,text,bigint,bigint,numeric,numeric) to service_role;

create or replace function public.finish_session_intake_ai_attempt(p_attempt_id uuid,p_input_tokens bigint,p_output_tokens bigint,p_reported_model text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.session_intake_ai_usage%rowtype; v_cost numeric; v_known boolean; v_alert boolean;
begin
 select * into a from public.session_intake_ai_usage where id=p_attempt_id for update;
 if a.id is null then raise exception 'Unknown AI reservation'; end if;
 if a.status<>'reserved' then return jsonb_build_object('costUsd',a.observed_usd,'chargedUsd',a.charged_usd,'status',a.status); end if;
 v_alert:=p_reported_model is not null and p_reported_model<>a.model;
 v_known:=p_input_tokens is not null and p_output_tokens is not null and p_input_tokens>=0 and p_output_tokens>=0
 and p_input_tokens<=a.input_ceiling and p_output_tokens<=a.output_ceiling and not v_alert and p_reported_model=a.model;
 if p_input_tokens>a.input_ceiling or p_output_tokens>a.output_ceiling then v_alert:=true; end if;
 v_cost:=case when v_known then ceil((p_input_tokens*a.input_rate+p_output_tokens*a.output_rate)/1000000*100000000)/100000000 else null end;
 update public.session_intake_ai_usage set input_tokens=p_input_tokens,output_tokens=p_output_tokens,
 observed_usd=v_cost,charged_usd=coalesce(v_cost,reserved_usd),status=case when v_known then 'settled' else 'uncertain' end,
 reconciliation_required=v_alert where id=a.id;
 return jsonb_build_object('costUsd',v_cost,'chargedUsd',coalesce(v_cost,a.reserved_usd),'status',case when v_known then 'settled' else 'uncertain' end,'reconciliationRequired',v_alert);
end; $$;
revoke all on function public.finish_session_intake_ai_attempt(uuid,bigint,bigint,text) from public,anon,authenticated;
grant execute on function public.finish_session_intake_ai_attempt(uuid,bigint,bigint,text) to service_role;

create or replace function public.get_teacher_session_ai_usage(p_block_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare b public.teaching_blocks%rowtype; v_summary jsonb;
begin
 if not public.is_teacher() then raise exception 'Teacher access required'; end if;
 select * into b from public.teaching_blocks where id=p_block_id;
 if b.id is null then raise exception 'Unknown Block'; end if;
 select jsonb_build_object('attempts',count(*),'reportedUsd',coalesce(sum(observed_usd),0),
 'chargedUsd',coalesce(sum(charged_usd),0),'unresolvedAttempts',count(*) filter(where status<>'settled'),
 'reconciliationRequired',coalesce(bool_or(reconciliation_required),false)) into v_summary
 from public.session_intake_ai_usage where block_id=b.id;
 return v_summary||jsonb_build_object('budgetUsd',b.intake_ai_budget_usd,'attemptLimit',b.intake_ai_attempt_limit);
end; $$;
revoke all on function public.get_teacher_session_ai_usage(uuid) from public,anon;
grant execute on function public.get_teacher_session_ai_usage(uuid) to authenticated;
commit;

-- S10-AI02: verified model identity and auditable correction of alias-only alerts.
-- Additive migration; applied AI01 SQL is never edited. No historical row updates.
begin;
alter table public.session_intake_ai_usage
 add column if not exists reported_model text,
 add column if not exists reconciled_at timestamptz,
 add column if not exists reconciliation_note text;

-- Exact identities plus one explicitly verified OpenAI alias/snapshot pair.
-- No prefix matching, wildcard dates, cross-provider or reverse alias matching.
create or replace function public.session_intake_ai_model_matches(p_provider text,p_configured_model text,p_reported_model text)
returns boolean language sql immutable set search_path='' as $$
 select coalesce(p_reported_model=p_configured_model or (
   p_provider='openai' and p_configured_model='gpt-5-mini'
   and p_reported_model='gpt-5-mini-2025-08-07'
 ),false);
$$;
revoke all on function public.session_intake_ai_model_matches(text,text,text) from public,anon,authenticated;
grant execute on function public.session_intake_ai_model_matches(text,text,text) to service_role;

create or replace function public.finish_session_intake_ai_attempt(p_attempt_id uuid,p_input_tokens bigint,p_output_tokens bigint,p_reported_model text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.session_intake_ai_usage%rowtype; v_cost numeric; v_known boolean; v_alert boolean; v_matches boolean;
begin
 select * into a from public.session_intake_ai_usage where id=p_attempt_id for update;
 if a.id is null then raise exception 'Unknown AI reservation'; end if;
 if a.status<>'reserved' then return jsonb_build_object('costUsd',a.observed_usd,'chargedUsd',a.charged_usd,'status',a.status,'reconciliationRequired',a.reconciliation_required); end if;
 v_matches:=public.session_intake_ai_model_matches(a.provider,a.model,p_reported_model);
 v_alert:=p_reported_model is not null and not v_matches;
 v_known:=p_input_tokens is not null and p_output_tokens is not null and p_input_tokens>=0 and p_output_tokens>=0
 and p_input_tokens<=a.input_ceiling and p_output_tokens<=a.output_ceiling and not v_alert and v_matches;
 if p_input_tokens>a.input_ceiling or p_output_tokens>a.output_ceiling then v_alert:=true; end if;
 v_cost:=case when v_known then ceil((p_input_tokens*a.input_rate+p_output_tokens*a.output_rate)/1000000*100000000)/100000000 else null end;
 update public.session_intake_ai_usage set input_tokens=p_input_tokens,output_tokens=p_output_tokens,reported_model=p_reported_model,
 observed_usd=v_cost,charged_usd=coalesce(v_cost,reserved_usd),status=case when v_known then 'settled' else 'uncertain' end,
 reconciliation_required=v_alert where id=a.id;
 return jsonb_build_object('costUsd',v_cost,'chargedUsd',coalesce(v_cost,a.reserved_usd),'status',case when v_known then 'settled' else 'uncertain' end,'reconciliationRequired',v_alert);
end; $$;
revoke all on function public.finish_session_intake_ai_attempt(uuid,bigint,bigint,text) from public,anon,authenticated;
grant execute on function public.finish_session_intake_ai_attempt(uuid,bigint,bigint,text) to service_role;


-- Manual correction only: stored tokens must match reviewed evidence. This does
-- not forgive timeouts, over-ceiling usage, missing usage or unexpected models.
create or replace function public.reconcile_session_intake_ai_alias(
 p_attempt_id uuid,p_expected_input_tokens bigint,p_expected_output_tokens bigint,
 p_reported_model text,p_evidence_reference text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.session_intake_ai_usage%rowtype; v_block uuid; v_cost numeric;
begin
 if p_evidence_reference is null or char_length(btrim(p_evidence_reference)) not between 10 and 1500 then
   raise exception 'Reviewed provider evidence is required'; end if;
 select block_id into v_block from public.session_intake_ai_usage where id=p_attempt_id;
 if v_block is null then raise exception 'Unknown AI reservation'; end if;
 perform 1 from public.teaching_blocks where id=v_block for update;
 select * into a from public.session_intake_ai_usage where id=p_attempt_id for update;
 if a.input_tokens is distinct from p_expected_input_tokens or a.output_tokens is distinct from p_expected_output_tokens
 or p_expected_input_tokens is null or p_expected_output_tokens is null
 or p_expected_input_tokens not between 0 and a.input_ceiling
 or p_expected_output_tokens not between 0 and a.output_ceiling
 or a.provider<>'openai' or a.model<>'gpt-5-mini' or p_reported_model<>'gpt-5-mini-2025-08-07'
 or not public.session_intake_ai_model_matches(a.provider,a.model,p_reported_model)
 or (a.reported_model is not null and a.reported_model<>p_reported_model) then
   raise exception 'Evidence does not establish an alias-only mismatch'; end if;
 if a.status='settled' and a.reconciled_at is not null and a.reported_model=p_reported_model then
   return jsonb_build_object('attemptId',a.id,'status',a.status,'costUsd',a.observed_usd,'alreadyReconciled',true); end if;
 if a.status<>'uncertain' or not a.reconciliation_required then raise exception 'Reservation is not an alias alert'; end if;
 v_cost:=ceil((a.input_tokens*a.input_rate+a.output_tokens*a.output_rate)/1000000*100000000)/100000000;
 update public.session_intake_ai_usage set reported_model=p_reported_model,observed_usd=v_cost,charged_usd=v_cost,
 status='settled',reconciliation_required=false,reconciled_at=now(),reconciliation_note=btrim(p_evidence_reference)
 where id=a.id;
 return jsonb_build_object('attemptId',a.id,'status','settled','costUsd',v_cost,'releasedUsd',a.charged_usd-v_cost);
end; $$;
revoke all on function public.reconcile_session_intake_ai_alias(uuid,bigint,bigint,text,text) from public,anon,authenticated;
grant execute on function public.reconcile_session_intake_ai_alias(uuid,bigint,bigint,text,text) to service_role;
-- Preserve the save contract; accept the new prompt guidance revision too.
create or replace function public.save_my_session_intake_chat(
  p_session_id uuid,
  p_source_conversation jsonb,
  p_student_record jsonb,
  p_student_confirmation jsonb,
  p_prompt_version text,
  p_ai_assistance jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_roster public.student_roster%rowtype;
  v_session public.studio_sessions%rowtype;
  v_intake public.student_session_intakes%rowtype;
  v_errors text[];
  v_payload_hash text;
  v_allowed_ai_keys text[] := array[
    'used','model','policy_version','follow_up_count','question_purposes',
    'extraction_status','stop_reason','extracted_record','turn_results','turn_decisions'
  ];
begin
  perform public.assert_single_session_progress(p_session_id,'intake');
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  if v_account.student_id is null then
    raise exception using errcode = 'P0001', message = 'Student account is not available';
  end if;

  select roster.* into v_roster
  from public.student_roster roster
  where roster.student_id = v_account.student_id
    and roster.block_id = (
      select session.block_id from public.studio_sessions session where session.id = p_session_id
    );

  select session.* into v_session
  from public.studio_sessions session
  where session.id = p_session_id
    and session.block_id = v_roster.block_id
    and session.session_number between 1 and 9
    and public.resolve_session_collection_mode(session.id) in ('deterministic','ai')
    and (
      session.intake_access = 'open'
      or (
        session.intake_access = 'session'
        and (
          session.status = 'open'
          or (
            session.status = 'scheduled'
            and session.starts_at <= now()
            and (session.ends_at is null or session.ends_at > now())
          )
        )
      )
    );

  if v_roster.id is null or v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Session Intake can only be submitted while it is open';
  end if;

  if exists (
    select 1 from public.student_session_intakes
    where session_id = v_session.id and student_id = v_account.student_id
  ) then
    raise exception using errcode = 'P0001', message = 'This Session Intake has already been confirmed';
  end if;

  if p_source_conversation is null
     or jsonb_typeof(p_source_conversation) <> 'array'
     or jsonb_array_length(p_source_conversation) not between 3 and 17
     or length(p_source_conversation::text) > 48000
     or exists (
       select 1 from jsonb_array_elements(p_source_conversation) turn
       where jsonb_typeof(turn) <> 'object'
          or coalesce(turn ->> 'actor','') not in ('student','system')
          or char_length(btrim(coalesce(turn ->> 'purpose',''))) not between 3 and 80
          or char_length(btrim(coalesce(turn ->> 'text',''))) not between 1 and 2000
     ) then
    raise exception using errcode = 'P0001', message = 'AI-assisted conversation is invalid';
  end if;

  if mod(jsonb_array_length(p_source_conversation),2) <> 1
     or p_source_conversation -> -1 ->> 'purpose' is distinct from 'review transition'
     or exists (
       select 1 from jsonb_array_elements(p_source_conversation) with ordinality as t(value,n)
       where value ->> 'actor' is distinct from case when mod(n,2)=1 then 'system' else 'student' end
          or (value ->> 'purpose' = 'review transition' and n <> jsonb_array_length(p_source_conversation))
     ) then
    raise exception 'Chat conversation order is invalid';
  end if;

  v_errors := public.validate_session_intake_student_record_v11(p_student_record);
  if cardinality(v_errors) > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Session Intake evidence is incomplete',
      detail = array_to_string(v_errors, '; ');
  end if;

  if p_student_confirmation is null
     or jsonb_typeof(p_student_confirmation) <> 'object'
     or coalesce(p_student_confirmation ->> 'status','') <> 'confirmed'
     or coalesce(p_student_confirmation ->> 'attestation','') <>
       'This summary reflects what I am claiming and the evidence I have identified. Teacher verification is separate.'
     or jsonb_typeof(coalesce(p_student_confirmation -> 'corrections','[]'::jsonb)) <> 'array'
     or length(p_student_confirmation::text) > 48000 then
    raise exception using errcode = 'P0001', message = 'Student confirmation is invalid';
  end if;

  if p_prompt_version is null
     or p_prompt_version not in ('session-intake-ai.v1.2.0','session-intake-ai.v1.3.0','session-intake-ai.v1.3.1') then
    raise exception using errcode = 'P0001', message = 'AI Intake prompt version is invalid';
  end if;

  if p_ai_assistance is null or jsonb_typeof(p_ai_assistance) <> 'object'
     or exists (select 1 from jsonb_object_keys(p_ai_assistance) key where not (key = any(v_allowed_ai_keys)))
     or p_ai_assistance ->> 'policy_version' not in ('adaptive-intake.v1.0.0','adaptive-intake.v1.1.0')
     or jsonb_typeof(p_ai_assistance -> 'used') is distinct from 'boolean'
     or coalesce(p_ai_assistance ->> 'extraction_status','') not in ('completed','fallback','not_used')
     or coalesce(p_ai_assistance ->> 'stop_reason','') not in ('sufficient_information','teacher_help','budget_exhausted','provider_failure')
     or coalesce((p_ai_assistance ->> 'follow_up_count')::integer,-1) <> greatest(0, (jsonb_array_length(p_source_conversation)-1)/2-3)
     or jsonb_typeof(p_ai_assistance -> 'question_purposes') is distinct from 'array'
     or jsonb_array_length(p_ai_assistance -> 'question_purposes') <> greatest(0, (jsonb_array_length(p_source_conversation)-1)/2-3)
     or jsonb_typeof(p_ai_assistance -> 'extracted_record') is distinct from 'object'
     or jsonb_typeof(p_ai_assistance -> 'turn_results') is distinct from 'array'
     or jsonb_array_length(p_ai_assistance -> 'turn_results') > 8
     or (p_ai_assistance ? 'turn_decisions' and (jsonb_typeof(p_ai_assistance -> 'turn_decisions') is distinct from 'array' or jsonb_array_length(p_ai_assistance -> 'turn_decisions') > 8))
     or length(p_ai_assistance::text) > 96000 then
    raise exception 'Chat assistance metadata is invalid';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_ai_assistance -> 'turn_results') r,
      lateral jsonb_array_elements(r -> 'evidenceUpdates') u
    where coalesce(u ->> 'sourceTurn','') !~ '^[0-9]+$'
       or p_source_conversation -> ((u ->> 'sourceTurn')::integer) ->> 'actor' is distinct from 'student'
  ) then
    raise exception 'Chat evidence source is invalid';
  end if;

  v_payload_hash := md5(
    'session-intake.v1.1.0' ||
    p_session_id::text ||
    auth.uid()::text ||
    p_source_conversation::text ||
    p_student_record::text ||
    p_student_confirmation::text ||
    p_ai_assistance::text
  );

  insert into public.student_session_intakes (
    session_id, block_id, student_id, auth_user_id,
    schema_version, source_mode, prompt_version, test_suite_version,
    source_conversation, student_record, ai_assistance,
    student_confirmation, confirmed_payload_hash
  ) values (
    v_session.id, v_session.block_id, v_account.student_id, auth.uid(),
    'session-intake.v1.1.0', case when (p_ai_assistance ->> 'used')::boolean then 'ai_assisted' else 'deterministic_fallback' end, p_prompt_version,
    'ai-intake-suite.v1.1.0', p_source_conversation, p_student_record,
    p_ai_assistance, p_student_confirmation, v_payload_hash
  )
  returning * into v_intake;

  return jsonb_build_object(
    'intakeId', v_intake.id,
    'schemaVersion', v_intake.schema_version,
    'sourceMode', v_intake.source_mode,
    'promptVersion', v_intake.prompt_version,
    'confirmedAt', v_intake.confirmed_at,
    'confirmedPayloadHash', v_intake.confirmed_payload_hash
  );
end;
$$;

revoke all on function public.save_my_session_intake_chat(uuid,jsonb,jsonb,jsonb,text,jsonb) from public,anon;
grant execute on function public.save_my_session_intake_chat(uuid,jsonb,jsonb,jsonb,text,jsonb) to authenticated;
commit;

-- S10-AI03: use the trusted configured provider/model as the billing identity.
-- Returned model labels are opaque audit data, never an identity/price gate.
-- Self-contained after AI01; also safe if the earlier AI02 candidate was applied.
-- No historical row updates, price changes or budget resets.
begin;
alter table public.session_intake_ai_usage
 add column if not exists reported_model text,
 add column if not exists reconciled_at timestamptz,
 add column if not exists reconciliation_note text;

create or replace function public.finish_session_intake_ai_attempt(p_attempt_id uuid,p_input_tokens bigint,p_output_tokens bigint,p_reported_model text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.session_intake_ai_usage%rowtype; v_cost numeric; v_known boolean; v_alert boolean;
begin
 select * into a from public.session_intake_ai_usage where id=p_attempt_id for update;
 if a.id is null then raise exception 'Unknown AI reservation'; end if;
 if a.status<>'reserved' then return jsonb_build_object('costUsd',a.observed_usd,'chargedUsd',a.charged_usd,'status',a.status,'reconciliationRequired',a.reconciliation_required,'costBasis','configured_model_rates'); end if;
 -- Pricing and provider/model were authorized and frozen at reservation time.
 -- No inference about family, suffix, alias or date is made from this label.
 v_known:=p_input_tokens is not null and p_output_tokens is not null
 and p_input_tokens>=0 and p_output_tokens>=0
 and p_input_tokens<=a.input_ceiling and p_output_tokens<=a.output_ceiling;
 v_alert:=coalesce(p_input_tokens>a.input_ceiling or p_output_tokens>a.output_ceiling,false);
 v_cost:=case when v_known then ceil((p_input_tokens*a.input_rate+p_output_tokens*a.output_rate)/1000000*100000000)/100000000 else null end;
 update public.session_intake_ai_usage set input_tokens=p_input_tokens,output_tokens=p_output_tokens,
 reported_model=left(p_reported_model,200),observed_usd=v_cost,charged_usd=coalesce(v_cost,reserved_usd),
 status=case when v_known then 'settled' else 'uncertain' end,reconciliation_required=v_alert where id=a.id;
 return jsonb_build_object('costUsd',v_cost,'chargedUsd',coalesce(v_cost,a.reserved_usd),'status',case when v_known then 'settled' else 'uncertain' end,'reconciliationRequired',v_alert,'costBasis','configured_model_rates');
end; $$;
revoke all on function public.finish_session_intake_ai_attempt(uuid,bigint,bigint,text) from public,anon,authenticated;
grant execute on function public.finish_session_intake_ai_attempt(uuid,bigint,bigint,text) to service_role;

-- Explicit operator recovery of historical name-only alerts. Review the stored
-- request identity and provider usage before invocation; token/ceiling checks
-- cannot be bypassed. No automatic scan or bulk alert clearing.
create or replace function public.reconcile_session_intake_ai_usage(
 p_attempt_id uuid,p_expected_input_tokens bigint,p_expected_output_tokens bigint,
 p_reported_model text,p_evidence_reference text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.session_intake_ai_usage%rowtype; v_block uuid; v_cost numeric;
begin
 if p_evidence_reference is null or char_length(btrim(p_evidence_reference)) not between 10 and 1500 then
   raise exception 'Reviewed provider evidence is required'; end if;
 select block_id into v_block from public.session_intake_ai_usage where id=p_attempt_id;
 if v_block is null then raise exception 'Unknown AI reservation'; end if;
 perform 1 from public.teaching_blocks where id=v_block for update;
 select * into a from public.session_intake_ai_usage where id=p_attempt_id for update;
 if a.input_tokens is distinct from p_expected_input_tokens or a.output_tokens is distinct from p_expected_output_tokens
 or p_expected_input_tokens is null or p_expected_output_tokens is null
 or p_expected_input_tokens not between 0 and a.input_ceiling
 or p_expected_output_tokens not between 0 and a.output_ceiling
 or (a.reported_model is not null and a.reported_model is distinct from left(p_reported_model,200)) then
   raise exception 'Reviewed usage must match stored tokens and fit the provision'; end if;
 if a.status='settled' and a.reconciled_at is not null then
   return jsonb_build_object('attemptId',a.id,'status',a.status,'costUsd',a.observed_usd,'alreadyReconciled',true); end if;
 if a.status<>'uncertain' then raise exception 'Reservation is not unresolved'; end if;
 v_cost:=ceil((a.input_tokens*a.input_rate+a.output_tokens*a.output_rate)/1000000*100000000)/100000000;
 update public.session_intake_ai_usage set reported_model=left(p_reported_model,200),observed_usd=v_cost,charged_usd=v_cost,
 status='settled',reconciliation_required=false,reconciled_at=now(),reconciliation_note=btrim(p_evidence_reference)
 where id=a.id;
 return jsonb_build_object('attemptId',a.id,'status','settled','costUsd',v_cost,'releasedUsd',a.charged_usd-v_cost,'costBasis','configured_model_rates');
end; $$;
revoke all on function public.reconcile_session_intake_ai_usage(uuid,bigint,bigint,text,text) from public,anon,authenticated;
grant execute on function public.reconcile_session_intake_ai_usage(uuid,bigint,bigint,text,text) to service_role;

-- Retire unreleased alias-specific helpers if a reviewer previously applied AI02.
drop function if exists public.reconcile_session_intake_ai_alias(uuid,bigint,bigint,text,text);
drop function if exists public.session_intake_ai_model_matches(text,text,text);
-- Preserve the save contract; accept the new prompt guidance revision too.
create or replace function public.save_my_session_intake_chat(
  p_session_id uuid,
  p_source_conversation jsonb,
  p_student_record jsonb,
  p_student_confirmation jsonb,
  p_prompt_version text,
  p_ai_assistance jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_roster public.student_roster%rowtype;
  v_session public.studio_sessions%rowtype;
  v_intake public.student_session_intakes%rowtype;
  v_errors text[];
  v_payload_hash text;
  v_allowed_ai_keys text[] := array[
    'used','model','policy_version','follow_up_count','question_purposes',
    'extraction_status','stop_reason','extracted_record','turn_results','turn_decisions'
  ];
begin
  perform public.assert_single_session_progress(p_session_id,'intake');
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  if v_account.student_id is null then
    raise exception using errcode = 'P0001', message = 'Student account is not available';
  end if;

  select roster.* into v_roster
  from public.student_roster roster
  where roster.student_id = v_account.student_id
    and roster.block_id = (
      select session.block_id from public.studio_sessions session where session.id = p_session_id
    );

  select session.* into v_session
  from public.studio_sessions session
  where session.id = p_session_id
    and session.block_id = v_roster.block_id
    and session.session_number between 1 and 9
    and public.resolve_session_collection_mode(session.id) in ('deterministic','ai')
    and (
      session.intake_access = 'open'
      or (
        session.intake_access = 'session'
        and (
          session.status = 'open'
          or (
            session.status = 'scheduled'
            and session.starts_at <= now()
            and (session.ends_at is null or session.ends_at > now())
          )
        )
      )
    );

  if v_roster.id is null or v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Session Intake can only be submitted while it is open';
  end if;

  if exists (
    select 1 from public.student_session_intakes
    where session_id = v_session.id and student_id = v_account.student_id
  ) then
    raise exception using errcode = 'P0001', message = 'This Session Intake has already been confirmed';
  end if;

  if p_source_conversation is null
     or jsonb_typeof(p_source_conversation) <> 'array'
     or jsonb_array_length(p_source_conversation) not between 3 and 17
     or length(p_source_conversation::text) > 48000
     or exists (
       select 1 from jsonb_array_elements(p_source_conversation) turn
       where jsonb_typeof(turn) <> 'object'
          or coalesce(turn ->> 'actor','') not in ('student','system')
          or char_length(btrim(coalesce(turn ->> 'purpose',''))) not between 3 and 80
          or char_length(btrim(coalesce(turn ->> 'text',''))) not between 1 and 2000
     ) then
    raise exception using errcode = 'P0001', message = 'AI-assisted conversation is invalid';
  end if;

  if mod(jsonb_array_length(p_source_conversation),2) <> 1
     or p_source_conversation -> -1 ->> 'purpose' is distinct from 'review transition'
     or exists (
       select 1 from jsonb_array_elements(p_source_conversation) with ordinality as t(value,n)
       where value ->> 'actor' is distinct from case when mod(n,2)=1 then 'system' else 'student' end
          or (value ->> 'purpose' = 'review transition' and n <> jsonb_array_length(p_source_conversation))
     ) then
    raise exception 'Chat conversation order is invalid';
  end if;

  v_errors := public.validate_session_intake_student_record_v11(p_student_record);
  if cardinality(v_errors) > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Session Intake evidence is incomplete',
      detail = array_to_string(v_errors, '; ');
  end if;

  if p_student_confirmation is null
     or jsonb_typeof(p_student_confirmation) <> 'object'
     or coalesce(p_student_confirmation ->> 'status','') <> 'confirmed'
     or coalesce(p_student_confirmation ->> 'attestation','') <>
       'This summary reflects what I am claiming and the evidence I have identified. Teacher verification is separate.'
     or jsonb_typeof(coalesce(p_student_confirmation -> 'corrections','[]'::jsonb)) <> 'array'
     or length(p_student_confirmation::text) > 48000 then
    raise exception using errcode = 'P0001', message = 'Student confirmation is invalid';
  end if;

  if p_prompt_version is null
     or p_prompt_version not in ('session-intake-ai.v1.2.0','session-intake-ai.v1.3.0','session-intake-ai.v1.3.1') then
    raise exception using errcode = 'P0001', message = 'AI Intake prompt version is invalid';
  end if;

  if p_ai_assistance is null or jsonb_typeof(p_ai_assistance) <> 'object'
     or exists (select 1 from jsonb_object_keys(p_ai_assistance) key where not (key = any(v_allowed_ai_keys)))
     or p_ai_assistance ->> 'policy_version' not in ('adaptive-intake.v1.0.0','adaptive-intake.v1.1.0')
     or jsonb_typeof(p_ai_assistance -> 'used') is distinct from 'boolean'
     or coalesce(p_ai_assistance ->> 'extraction_status','') not in ('completed','fallback','not_used')
     or coalesce(p_ai_assistance ->> 'stop_reason','') not in ('sufficient_information','teacher_help','budget_exhausted','provider_failure')
     or coalesce((p_ai_assistance ->> 'follow_up_count')::integer,-1) <> greatest(0, (jsonb_array_length(p_source_conversation)-1)/2-3)
     or jsonb_typeof(p_ai_assistance -> 'question_purposes') is distinct from 'array'
     or jsonb_array_length(p_ai_assistance -> 'question_purposes') <> greatest(0, (jsonb_array_length(p_source_conversation)-1)/2-3)
     or jsonb_typeof(p_ai_assistance -> 'extracted_record') is distinct from 'object'
     or jsonb_typeof(p_ai_assistance -> 'turn_results') is distinct from 'array'
     or jsonb_array_length(p_ai_assistance -> 'turn_results') > 8
     or (p_ai_assistance ? 'turn_decisions' and (jsonb_typeof(p_ai_assistance -> 'turn_decisions') is distinct from 'array' or jsonb_array_length(p_ai_assistance -> 'turn_decisions') > 8))
     or length(p_ai_assistance::text) > 96000 then
    raise exception 'Chat assistance metadata is invalid';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_ai_assistance -> 'turn_results') r,
      lateral jsonb_array_elements(r -> 'evidenceUpdates') u
    where coalesce(u ->> 'sourceTurn','') !~ '^[0-9]+$'
       or p_source_conversation -> ((u ->> 'sourceTurn')::integer) ->> 'actor' is distinct from 'student'
  ) then
    raise exception 'Chat evidence source is invalid';
  end if;

  v_payload_hash := md5(
    'session-intake.v1.1.0' ||
    p_session_id::text ||
    auth.uid()::text ||
    p_source_conversation::text ||
    p_student_record::text ||
    p_student_confirmation::text ||
    p_ai_assistance::text
  );

  insert into public.student_session_intakes (
    session_id, block_id, student_id, auth_user_id,
    schema_version, source_mode, prompt_version, test_suite_version,
    source_conversation, student_record, ai_assistance,
    student_confirmation, confirmed_payload_hash
  ) values (
    v_session.id, v_session.block_id, v_account.student_id, auth.uid(),
    'session-intake.v1.1.0', case when (p_ai_assistance ->> 'used')::boolean then 'ai_assisted' else 'deterministic_fallback' end, p_prompt_version,
    'ai-intake-suite.v1.1.0', p_source_conversation, p_student_record,
    p_ai_assistance, p_student_confirmation, v_payload_hash
  )
  returning * into v_intake;

  return jsonb_build_object(
    'intakeId', v_intake.id,
    'schemaVersion', v_intake.schema_version,
    'sourceMode', v_intake.source_mode,
    'promptVersion', v_intake.prompt_version,
    'confirmedAt', v_intake.confirmed_at,
    'confirmedPayloadHash', v_intake.confirmed_payload_hash
  );
end;
$$;

revoke all on function public.save_my_session_intake_chat(uuid,jsonb,jsonb,jsonb,text,jsonb) from public,anon;
grant execute on function public.save_my_session_intake_chat(uuid,jsonb,jsonb,jsonb,text,jsonb) to authenticated;
commit;
