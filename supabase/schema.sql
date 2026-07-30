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
