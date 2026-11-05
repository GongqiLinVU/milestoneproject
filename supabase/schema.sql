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

-- Sprint 5 Phase 2: roster-prepared student identities and activation.

create table if not exists public.student_accounts (
  student_id text primary key check (char_length(trim(student_id)) between 3 and 40),
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  status text not null default 'ready' check (status in ('ready', 'activated', 'disabled')),
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_checkins
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
create unique index if not exists student_checkins_auth_user_block_idx
  on public.student_checkins (auth_user_id, block_id) where auth_user_id is not null;

drop trigger if exists set_student_accounts_updated_at on public.student_accounts;
create trigger set_student_accounts_updated_at
before update on public.student_accounts
for each row execute function public.set_updated_at();

alter table public.student_accounts enable row level security;
revoke all on public.student_accounts from anon, authenticated;
grant select, update on public.student_accounts to authenticated;

drop policy if exists "students read own account" on public.student_accounts;
create policy "students read own account" on public.student_accounts
for select to authenticated using (auth_user_id = auth.uid() or public.is_teacher());
drop policy if exists "teachers manage student accounts" on public.student_accounts;
create policy "teachers manage student accounts" on public.student_accounts
for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

create or replace function public.get_my_student_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts;
  v_roster public.student_roster;
  v_block public.teaching_blocks;
  v_project_name text;
  v_checkin boolean;
begin
  select * into v_account from public.student_accounts
  where auth_user_id = auth.uid() and status <> 'disabled';
  if v_account.auth_user_id is null then
    raise exception using errcode = 'P0001', message = 'Student account is not available';
  end if;

  if (select count(*) from public.student_roster roster
      join public.teaching_blocks block on block.id = roster.block_id
      where roster.student_id = v_account.student_id and block.status = 'active') > 1 then
    raise exception using errcode = 'P0001', message = 'Student belongs to more than one active block';
  end if;

  select roster.* into v_roster
  from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;
  if v_roster.id is null then
    raise exception using errcode = 'P0001', message = 'No active roster context is available';
  end if;

  select * into v_block
  from public.teaching_blocks
  where id = v_roster.block_id;

  select project.title into v_project_name
  from public.teams team
  join public.team_project_assignments assignment on assignment.team_id = team.id
  join public.projects project on project.id = assignment.project_id
  where team.block_id = v_roster.block_id and team.team_number = v_roster.team_number;

  select exists(select 1 from public.student_checkins
    where lower(trim(student_id)) = v_account.student_id)
    into v_checkin;
  return jsonb_build_object(
    'status', v_account.status,
    'studentName', coalesce(v_roster.preferred_name, v_roster.full_name),
    'blockLabel', concat(v_block.academic_year, ' · ', v_block.block_code),
    'teamName', concat('Team ', v_roster.team_number),
    'projectName', v_project_name,
    'checkinRecognised', v_checkin
  );
end;
$$;
revoke all on function public.get_my_student_context() from public;
grant execute on function public.get_my_student_context() to authenticated;

create or replace function public.complete_student_activation(p_goal text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts;
  v_roster public.student_roster;
  v_existing_id uuid;
begin
  select * into v_account from public.student_accounts
  where auth_user_id = auth.uid() and status = 'ready' for update;
  if v_account.auth_user_id is null then
    raise exception using errcode = 'P0001', message = 'Account is not ready to activate';
  end if;
  select roster.* into v_roster from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  limit 1;
  if v_roster.id is null then
    raise exception using errcode = 'P0001', message = 'Active roster context is missing';
  end if;

  select id into v_existing_id from public.student_checkins
  where lower(trim(student_id)) = v_account.student_id;
  if v_existing_id is not null then
    update public.student_checkins set auth_user_id = auth.uid()
    where id = v_existing_id and auth_user_id is null;
  else
    if char_length(trim(coalesce(p_goal, ''))) < 3 then
      raise exception using errcode = 'P0001', message = 'A Week 1 recovery goal is required';
    end if;
    insert into public.student_checkins (
      student_id, student_name, team_name, goal, block_id, auth_user_id
    ) values (
      v_account.student_id, coalesce(v_roster.preferred_name, v_roster.full_name),
      concat('Team ', v_roster.team_number), trim(p_goal), v_roster.block_id, auth.uid()
    );
  end if;
  update public.student_accounts
  set status = 'activated', activated_at = now()
  where auth_user_id = auth.uid();
  return public.get_my_student_context();
end;
$$;
revoke all on function public.complete_student_activation(text) from public;
grant execute on function public.complete_student_activation(text) to authenticated;

-- Retire anonymous team lookup only after student activation is deployed.
revoke execute on function public.find_student_team(text, text, text) from anon;

-- Verification:
-- 1. anon cannot select student_accounts or execute student context RPCs.
-- 2. authenticated students receive exactly one active roster context.
-- 3. a second active-block roster match raises an actionable ambiguity error.
-- 4. activation links one matching legacy check-in, or creates one recovery row.
-- 5. repeated provisioning never changes existing student_accounts.
-- Rollback:
-- Re-grant find_student_team to anon before rolling back the frontend. Revoke
-- the two RPCs, then drop policies/table only if no accounts have been issued.
-- Keep auth_user_id once production evidence has been linked.


-- Sprint 5 Phase 3: teacher-opened studio sessions and authenticated check-in.

create or replace function public.get_my_student_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts;
  v_roster public.student_roster;
  v_block public.teaching_blocks;
  v_project public.projects%rowtype;
  v_checkin boolean;
begin
  select * into v_account from public.student_accounts
  where auth_user_id = auth.uid() and status <> 'disabled';
  if v_account.auth_user_id is null then
    raise exception using errcode = 'P0001', message = 'Student account is not available';
  end if;

  if (select count(*) from public.student_roster roster
      join public.teaching_blocks block on block.id = roster.block_id
      where roster.student_id = v_account.student_id and block.status = 'active') <> 1 then
    raise exception using errcode = 'P0001', message = 'Student must belong to exactly one active block';
  end if;

  select roster.* into v_roster
  from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;

  select * into v_block from public.teaching_blocks where id = v_roster.block_id;

  select project.* into v_project
  from public.teams team
  join public.team_project_assignments assignment on assignment.team_id = team.id
  join public.projects project on project.id = assignment.project_id
  where team.block_id = v_roster.block_id and team.team_number = v_roster.team_number;

  select exists(select 1 from public.student_checkins
    where lower(trim(student_id)) = v_account.student_id)
    into v_checkin;

  return jsonb_build_object(
    'status', v_account.status,
    'studentId', v_account.student_id,
    'studentName', coalesce(v_roster.preferred_name, v_roster.full_name),
    'blockLabel', concat(v_block.academic_year, ' · ', v_block.block_code),
    'teamName', concat('Team ', v_roster.team_number),
    'projectName', coalesce(v_project.title, v_roster.project_name),
    'projectProblem', v_project.problem,
    'projectDescription', v_project.description,
    'projectTargetUsers', v_project.target_users,
    'projectExpectedOutcomes', v_project.expected_outcomes,
    'projectCategory', v_project.category,
    'projectDifficulty', v_project.difficulty,
    'projectSource', case when v_project.id is not null then 'catalogue' when v_roster.project_name is not null then 'roster' else 'none' end,
    'checkinRecognised', v_checkin
  );
end;
$$;

revoke all on function public.get_my_student_context() from public;
grant execute on function public.get_my_student_context() to authenticated;

create table if not exists public.studio_sessions (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.teaching_blocks(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 3 and 120),
  session_date date not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'open', 'closed')),
  starts_at timestamptz,
  ends_at timestamptz,
  opened_at timestamptz,
  closed_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.studio_sessions add column if not exists starts_at timestamptz;
alter table public.studio_sessions add column if not exists ends_at timestamptz;
alter table public.studio_sessions alter column opened_at drop not null;
alter table public.studio_sessions alter column opened_at drop default;
alter table public.studio_sessions drop constraint if exists studio_sessions_status_check;
alter table public.studio_sessions add constraint studio_sessions_status_check check (status in ('scheduled', 'open', 'closed')) not valid;
alter table public.studio_sessions validate constraint studio_sessions_status_check;
alter table public.studio_sessions drop constraint if exists studio_sessions_schedule_check;
alter table public.studio_sessions add constraint studio_sessions_schedule_check check (ends_at is null or starts_at is null or ends_at > starts_at) not valid;
alter table public.studio_sessions validate constraint studio_sessions_schedule_check;

create unique index if not exists studio_sessions_one_open_per_block_idx
  on public.studio_sessions (block_id) where status = 'open';

create table if not exists public.student_session_checkins (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.studio_sessions(id) on delete restrict,
  student_id text not null references public.student_accounts(student_id) on delete restrict,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  block_id uuid not null references public.teaching_blocks(id) on delete restrict,
  checked_in_at timestamptz not null default now(),
  unique (session_id, student_id),
  unique (session_id, auth_user_id)
);

alter table public.studio_sessions enable row level security;
alter table public.student_session_checkins enable row level security;

revoke all on public.studio_sessions, public.student_session_checkins from anon, authenticated;
grant select, insert, update on public.studio_sessions to authenticated;
grant select on public.student_session_checkins to authenticated;

drop policy if exists "teachers manage studio sessions" on public.studio_sessions;
create policy "teachers manage studio sessions" on public.studio_sessions
for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

drop policy if exists "teachers read session checkins" on public.student_session_checkins;
create policy "teachers read session checkins" on public.student_session_checkins
for select to authenticated using (public.is_teacher());

drop policy if exists "students read own session checkins" on public.student_session_checkins;
create policy "students read own session checkins" on public.student_session_checkins
for select to authenticated using (auth_user_id = auth.uid());

create or replace function public.get_my_open_studio_session()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_roster public.student_roster%rowtype;
  v_session public.studio_sessions%rowtype;
  v_checked_in_at timestamptz;
begin
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  if v_account.student_id is null then
    return null;
  end if;

  select roster.* into v_roster
  from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;

  select * into v_session
  from public.studio_sessions
  where block_id = v_roster.block_id
    and (status = 'open' or (status = 'scheduled' and starts_at <= now() and (ends_at is null or ends_at > now())))
  limit 1;

  if v_session.id is null then
    return null;
  end if;

  select checked_in_at into v_checked_in_at
  from public.student_session_checkins
  where session_id = v_session.id and auth_user_id = auth.uid();

  return jsonb_build_object(
    'sessionId', v_session.id,
    'title', v_session.title,
    'sessionDate', v_session.session_date,
    'checkedInAt', v_checked_in_at
  );
end;
$$;

revoke all on function public.get_my_open_studio_session() from public;
grant execute on function public.get_my_open_studio_session() to authenticated;

create or replace function public.get_my_session_history()
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
  select roster.block_id into v_block_id from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active' limit 1;
  if v_block_id is null then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'sessionId', session.id, 'title', session.title, 'sessionDate', session.session_date,
    'startsAt', session.starts_at, 'endsAt', session.ends_at,
    'status', case when session.status = 'closed' or (session.ends_at is not null and session.ends_at <= now()) then 'closed'
      when session.status = 'open' or (session.starts_at <= now() and (session.ends_at is null or session.ends_at > now())) then 'open' else 'scheduled' end,
    'checkedInAt', checkin.checked_in_at
  ) order by session.session_date, session.created_at), '[]'::jsonb) into v_result
  from public.studio_sessions session left join public.student_session_checkins checkin
    on checkin.session_id = session.id and checkin.auth_user_id = auth.uid()
  where session.block_id = v_block_id;
  return v_result;
end;
$$;

revoke all on function public.get_my_session_history() from public;
grant execute on function public.get_my_session_history() to authenticated;

create or replace function public.check_in_to_studio_session(p_session_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_session public.studio_sessions%rowtype;
  v_block_id uuid;
  v_checked_in_at timestamptz;
begin
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  select * into v_session
  from public.studio_sessions
  where id = p_session_id
    and (status = 'open' or (status = 'scheduled' and starts_at <= now() and (ends_at is null or ends_at > now())));

  select roster.block_id into v_block_id
  from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id
    and roster.block_id = v_session.block_id
    and block.status = 'active'
  limit 1;

  if v_account.student_id is null or v_session.id is null or v_block_id is null then
    raise exception using errcode = 'P0001', message = 'Open session does not match the authenticated student';
  end if;

  insert into public.student_session_checkins (
    session_id, student_id, auth_user_id, block_id
  ) values (
    v_session.id, v_account.student_id, auth.uid(), v_block_id
  )
  on conflict (session_id, student_id) do update
    set checked_in_at = public.student_session_checkins.checked_in_at
  returning checked_in_at into v_checked_in_at;

  return v_checked_in_at;
end;
$$;

revoke all on function public.check_in_to_studio_session(uuid) from public;
grant execute on function public.check_in_to_studio_session(uuid) to authenticated;

-- Verification:
-- 1. A teacher can open only one session per block and can close it.
-- 2. An activated student in that block receives only the open session.
-- 3. Check-in is idempotent and the original timestamp is preserved.
-- 4. Students cannot check in to another block or a closed session.
-- 5. Students can read only their own check-in; teachers can read the block.
-- 6. Scheduled sessions cannot be checked into before starts_at or after ends_at.
--
-- Rollback:
-- Close open sessions, revoke both RPCs, then deploy the previous frontend.
-- Preserve both tables once real attendance exists; they are historical evidence.


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

create or replace function public.student_can_submit_week_v2(p_block_id uuid, p_week integer)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.student_accounts account
    join public.student_roster roster on roster.student_id = account.student_id and roster.block_id = p_block_id
    join public.weekly_activity_settings setting on setting.block_id = roster.block_id and setting.week_number = p_week
    where account.auth_user_id = auth.uid() and account.status = 'activated' and setting.is_open
  );
$$;
revoke all on function public.student_can_submit_week_v2(uuid, integer) from public;
grant execute on function public.student_can_submit_week_v2(uuid, integer) to authenticated;

revoke insert on public.team_health_checks, public.weekly_engagement_checkouts, public.week2_progress_reviews, public.poster_reviews from anon;

drop policy if exists "students create team health" on public.team_health_checks;
create policy "students create team health" on public.team_health_checks for insert to authenticated
with check (public.student_can_submit_week_v2(block_id, 1));

drop policy if exists "students create engagement checkout" on public.weekly_engagement_checkouts;
create policy "students create engagement checkout" on public.weekly_engagement_checkouts for insert to authenticated
with check (public.student_can_submit_week_v2(block_id, week_number::integer));

drop policy if exists "students create week2 progress" on public.week2_progress_reviews;
create policy "students create week2 progress" on public.week2_progress_reviews for insert to authenticated
with check (public.student_can_submit_week_v2(block_id, 2));

drop policy if exists "Students can submit poster reviews" on public.poster_reviews;
create policy "Students can submit poster reviews" on public.poster_reviews for insert to authenticated
with check (
  public.student_can_submit_week_v2(block_id, 3)
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


-- Sprint 5 Phase 4A: block-based Presentation Order draft and publication.

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



-- Missing Sprint 6/7 installation prerequisites, restored from released migrations.
-- Sprint 5 Phase 4A hotfix: authoritative completed-state lookup and teacher reset.

create or replace function public.get_my_week2_precheck_submission()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts;
  v_roster public.student_roster;
  v_submission public.week2_progress_reviews;
begin
  select account.* into v_account
  from public.student_accounts account
  where account.auth_user_id = auth.uid()
    and account.status = 'activated';

  if v_account.auth_user_id is null then
    raise exception using errcode = '42501', message = 'Active student account is required';
  end if;

  select roster.* into v_roster
  from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where lower(trim(roster.student_id)) = lower(trim(v_account.student_id))
    and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;

  if v_roster.id is null then
    return null;
  end if;

  select submission.* into v_submission
  from public.week2_progress_reviews submission
  where submission.block_id = v_roster.block_id
    and lower(trim(submission.student_id)) = lower(trim(v_account.student_id))
  order by submission.created_at desc
  limit 1;

  if v_submission.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'submittedAt', v_submission.created_at,
    'answers', (
      select coalesce(jsonb_agg(jsonb_build_object('label', answer.label, 'value', answer.value)), '[]'::jsonb)
      from (values
        ('Project name', v_submission.project_name),
        ('Project area', v_submission.project_area),
        ('Project description', v_submission.project_description),
        ('Target user / problem', v_submission.target_user_problem),
        ('Deliverable', v_submission.deliverable_area),
        ('Implementation claim', v_submission.implementation_item),
        ('Current state', v_submission.implementation_state),
        ('Where to find it', v_submission.work_location),
        ('Evidence reference', v_submission.evidence_reference),
        ('Demonstration plan', v_submission.demonstration_method),
        ('Verification completed', v_submission.verification_level),
        ('Method to explain', array_to_string(v_submission.implementation_methods, ', ')),
        ('Remaining issue', v_submission.remaining_issue),
        ('Issue details', v_submission.issue_note),
        ('Next action', v_submission.next_action),
        ('Teacher should verify', v_submission.teacher_verification)
      ) as answer(label, value)
      where answer.value is not null and trim(answer.value) <> ''
    )
  );
end;
$$;

revoke all on function public.get_my_week2_precheck_submission() from public;
grant execute on function public.get_my_week2_precheck_submission() to authenticated;

create or replace function public.teacher_reset_week2_precheck(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission public.week2_progress_reviews;
begin
  if not coalesce(public.is_teacher(), false) then
    raise exception using errcode = '42501', message = 'Teacher access is required';
  end if;

  select submission.* into v_submission
  from public.week2_progress_reviews submission
  where submission.id = p_submission_id;

  if v_submission.id is null then
    raise exception using errcode = 'P0002', message = 'Pre-check submission was not found';
  end if;

  delete from public.teacher_progress_reviews review
  where review.block_id = v_submission.block_id
    and lower(trim(review.student_id)) = lower(trim(v_submission.student_id));

  delete from public.week2_progress_reviews submission
  where submission.id = p_submission_id;
end;
$$;

revoke all on function public.teacher_reset_week2_precheck(uuid) from public;
grant execute on function public.teacher_reset_week2_precheck(uuid) to authenticated;

-- Verification:
-- 1. An authenticated student receives only their own active-block Pre-check receipt.
-- 2. A student without a submission receives null.
-- 3. A teacher reset removes the selected Pre-check and its matching private follow-up.
-- 4. Non-teachers cannot execute the reset.


-- Sprint 5 Phase 4A: block-based Presentation Order draft and publication.

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


-- Sprint 6 Phase 1: private, block-scoped Poster Gallery.
-- Originals live in a private Storage bucket. Immutable poster_versions keep
-- replacement history while team_posters separates draft from published state.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'poster-gallery',
  'poster-gallery',
  false,
  1048576,
  array['application/pdf','image/png','image/jpeg']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.poster_gallery_settings (
  block_id uuid primary key references public.teaching_blocks(id) on delete cascade,
  is_published boolean not null default false,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.poster_versions (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.teaching_blocks(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  storage_path text not null unique,
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  mime_type text not null check (mime_type in ('application/pdf','image/png','image/jpeg')),
  size_bytes integer not null check (size_bytes between 1 and 1048576),
  uploader_auth_user_id uuid not null references auth.users(id) on delete restrict,
  uploader_role text not null check (uploader_role in ('student','teacher')),
  status text not null default 'ready' check (status in ('ready','removed')),
  removed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists poster_versions_block_team_created_idx
  on public.poster_versions (block_id, team_id, created_at desc);

-- Keep a re-run of this migration authoritative for Preview environments that
-- previously used the original 5 MB Phase 1 limit.
alter table public.poster_versions
  drop constraint if exists poster_versions_size_bytes_check;
alter table public.poster_versions
  add constraint poster_versions_size_bytes_check
  check (size_bytes between 1 and 1048576);

create table if not exists public.team_posters (
  block_id uuid not null references public.teaching_blocks(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  draft_version_id uuid references public.poster_versions(id) on delete restrict,
  published_version_id uuid references public.poster_versions(id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key (block_id, team_id),
  unique (team_id)
);

insert into public.poster_gallery_settings (block_id)
select id from public.teaching_blocks
on conflict (block_id) do nothing;

create or replace function public.prepare_poster_gallery_settings()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.poster_gallery_settings (block_id) values (new.id)
  on conflict (block_id) do nothing;
  return new;
end;
$$;
revoke all on function public.prepare_poster_gallery_settings() from public;
drop trigger if exists prepare_poster_gallery_settings on public.teaching_blocks;
create trigger prepare_poster_gallery_settings after insert on public.teaching_blocks
for each row execute function public.prepare_poster_gallery_settings();

drop trigger if exists set_poster_gallery_settings_updated_at on public.poster_gallery_settings;
create trigger set_poster_gallery_settings_updated_at before update on public.poster_gallery_settings
for each row execute function public.set_updated_at();
drop trigger if exists set_team_posters_updated_at on public.team_posters;
create trigger set_team_posters_updated_at before update on public.team_posters
for each row execute function public.set_updated_at();

alter table public.poster_gallery_settings enable row level security;
alter table public.poster_versions enable row level security;
alter table public.team_posters enable row level security;
revoke all on public.poster_gallery_settings, public.poster_versions, public.team_posters from anon, authenticated;
grant select, insert, update on public.poster_gallery_settings, public.poster_versions, public.team_posters to authenticated;

drop policy if exists "teachers manage poster gallery settings" on public.poster_gallery_settings;
create policy "teachers manage poster gallery settings" on public.poster_gallery_settings
for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
drop policy if exists "teachers read poster versions" on public.poster_versions;
create policy "teachers read poster versions" on public.poster_versions
for select to authenticated using (public.is_teacher());
drop policy if exists "teachers read team posters" on public.team_posters;
create policy "teachers read team posters" on public.team_posters
for select to authenticated using (public.is_teacher());

-- Student reads use narrow security-definer RPCs. Browser roles cannot list the
-- Storage bucket or the underlying poster tables.
create or replace function public.get_my_poster_upload_status()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_block_id uuid; v_team_id uuid; v_team_number smallint; v_version public.poster_versions;
begin
  select roster.block_id, team.id, team.team_number
    into v_block_id, v_team_id, v_team_number
  from public.student_accounts account
  join public.student_roster roster on roster.student_id = account.student_id
  join public.teaching_blocks block on block.id = roster.block_id
  join public.teams team on team.block_id = roster.block_id and team.team_number = roster.team_number
  where account.auth_user_id = auth.uid() and account.status = 'activated' and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc limit 1;
  if v_team_id is null then
    raise exception using errcode='P0001', message='Active student team is not available';
  end if;
  select version.* into v_version
  from public.team_posters poster
  join public.poster_versions version on version.id = poster.draft_version_id
  where poster.block_id = v_block_id and poster.team_id = v_team_id and version.status = 'ready';
  return jsonb_build_object(
    'blockId', v_block_id, 'teamId', v_team_id, 'teamName', concat('Team ', v_team_number),
    'draft', case when v_version.id is null then null else jsonb_build_object(
      'versionId',v_version.id,'originalFilename',v_version.original_filename,
      'mimeType',v_version.mime_type,'sizeBytes',v_version.size_bytes,'createdAt',v_version.created_at) end
  );
end;
$$;
revoke all on function public.get_my_poster_upload_status() from public;
grant execute on function public.get_my_poster_upload_status() to authenticated;

create or replace function public.get_my_poster_gallery()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_student_id text; v_block_id uuid; v_team_number smallint; v_published boolean;
begin
  select account.student_id, roster.block_id, roster.team_number
    into v_student_id, v_block_id, v_team_number
  from public.student_accounts account
  join public.student_roster roster on roster.student_id = account.student_id
  join public.teaching_blocks block on block.id = roster.block_id
  where account.auth_user_id = auth.uid() and account.status = 'activated' and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc limit 1;
  if v_block_id is null then
    raise exception using errcode='P0001', message='Active student block is not available';
  end if;
  select is_published into v_published from public.poster_gallery_settings where block_id = v_block_id;
  return jsonb_build_object(
    'isPublished', coalesce(v_published,false),
    'posters', case when coalesce(v_published,false) then coalesce((
      select jsonb_agg(jsonb_build_object(
        'teamId',team.id,'teamName',concat('Team ',team.team_number),
        'projectName',project.title,'versionId',version.id,
        'originalFilename',version.original_filename,'mimeType',version.mime_type,
        'isOwnTeam',team.team_number = v_team_number,
        'feedbackCompleted',exists(select 1 from public.poster_reviews review
          where review.block_id = v_block_id and lower(trim(review.reviewer_student_id)) = v_student_id
            and lower(trim(review.reviewed_team)) = lower(concat('Team ',team.team_number)))
      ) order by team.team_number)
      from public.teams team
      left join public.team_project_assignments assignment on assignment.team_id = team.id
      left join public.projects project on project.id = assignment.project_id
      left join public.team_posters poster on poster.block_id = v_block_id and poster.team_id = team.id
      left join public.poster_versions version on version.id = poster.published_version_id and version.status = 'ready'
      where team.block_id = v_block_id
    ),'[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;
revoke all on function public.get_my_poster_gallery() from public;
grant execute on function public.get_my_poster_gallery() to authenticated;

create or replace function public.get_teacher_poster_gallery(p_block_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_published boolean; v_published_at timestamptz;
begin
  if not public.is_teacher() then raise exception using errcode='42501', message='Teacher access required'; end if;
  select is_published,published_at into v_published,v_published_at from public.poster_gallery_settings where block_id=p_block_id;
  return jsonb_build_object(
    'isPublished',coalesce(v_published,false),'publishedAt',v_published_at,
    'teams',coalesce((select jsonb_agg(jsonb_build_object(
      'teamId',team.id,'teamName',concat('Team ',team.team_number),'projectName',project.title,
      'draft',case when draft.id is null then null else jsonb_build_object('versionId',draft.id,'originalFilename',draft.original_filename,'mimeType',draft.mime_type,'sizeBytes',draft.size_bytes,'createdAt',draft.created_at) end,
      'publishedVersionId',published.id
    ) order by team.team_number)
    from public.teams team
    left join public.team_project_assignments assignment on assignment.team_id=team.id
    left join public.projects project on project.id=assignment.project_id
    left join public.team_posters poster on poster.block_id=p_block_id and poster.team_id=team.id
    left join public.poster_versions draft on draft.id=poster.draft_version_id and draft.status='ready'
    left join public.poster_versions published on published.id=poster.published_version_id and published.status='ready'
    where team.block_id=p_block_id),'[]'::jsonb)
  );
end;
$$;
revoke all on function public.get_teacher_poster_gallery(uuid) from public;
grant execute on function public.get_teacher_poster_gallery(uuid) to authenticated;

create or replace function public.publish_poster_gallery(p_block_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_teacher() then raise exception using errcode='42501', message='Teacher access required'; end if;
  update public.team_posters set published_version_id=draft_version_id
  where block_id=p_block_id;
  insert into public.poster_gallery_settings(block_id,is_published,published_at)
  values(p_block_id,true,now())
  on conflict(block_id) do update set is_published=true,published_at=now();
end;
$$;
revoke all on function public.publish_poster_gallery(uuid) from public;
grant execute on function public.publish_poster_gallery(uuid) to authenticated;

create or replace function public.hide_poster_gallery(p_block_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_teacher() then raise exception using errcode='42501', message='Teacher access required'; end if;
  update public.poster_gallery_settings set is_published=false where block_id=p_block_id;
end;
$$;
revoke all on function public.hide_poster_gallery(uuid) from public;
grant execute on function public.hide_poster_gallery(uuid) to authenticated;

create or replace function public.remove_team_poster_draft(p_team_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_version_id uuid;
begin
  if not public.is_teacher() then raise exception using errcode='42501', message='Teacher access required'; end if;
  select draft_version_id into v_version_id from public.team_posters where team_id=p_team_id;
  update public.team_posters set draft_version_id=null where team_id=p_team_id;
  if v_version_id is not null then
    update public.poster_versions set status='removed',removed_at=now() where id=v_version_id;
  end if;
end;
$$;
revoke all on function public.remove_team_poster_draft(uuid) from public;
grant execute on function public.remove_team_poster_draft(uuid) to authenticated;

-- Gallery publication is the authoritative Peer Feedback gate for the direct
-- Poster -> feedback flow. It is intentionally independent from Week 3's broad
-- activity activation switch.
create or replace function public.student_can_review_poster_gallery(p_block_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.student_accounts account
    join public.student_roster roster on roster.student_id=account.student_id and roster.block_id=p_block_id
    join public.poster_gallery_settings gallery on gallery.block_id=roster.block_id and gallery.is_published
    where account.auth_user_id=auth.uid() and account.status='activated'
  );
$$;
revoke all on function public.student_can_review_poster_gallery(uuid) from public;
grant execute on function public.student_can_review_poster_gallery(uuid) to authenticated;

drop policy if exists "Students can submit poster reviews" on public.poster_reviews;
create policy "Students can submit poster reviews" on public.poster_reviews for insert to authenticated
with check (
  public.student_can_review_poster_gallery(block_id)
  and lower(trim(reviewer_team)) <> lower(trim(reviewed_team))
  and exists (
    select 1 from public.teams team
    join public.team_posters poster on poster.team_id=team.id and poster.block_id=team.block_id
    join public.poster_versions version on version.id=poster.published_version_id and version.status='ready'
    where team.block_id=poster_reviews.block_id
      and lower(concat('Team ',team.team_number))=lower(trim(poster_reviews.reviewed_team))
  )
  and problem_clarity between 1 and 5 and working_product between 1 and 5
  and evidence_testing between 1 and 5 and document_readiness between 1 and 5
  and presentation_quality between 1 and 5
);

-- Storage stays private and service-managed. No browser SELECT/LIST policy is
-- created on storage.objects; uploads and reads use short-lived signed tokens.

-- Verification:
-- 1. bucket is private, 1 MB, PDF/PNG/JPEG only; browser roles cannot list it.
-- 2. student RPCs resolve only the authenticated active Block/Team.
-- 3. publish copies each Team's draft pointer into an immutable published snapshot.
-- 4. replacement changes only draft_version_id until Publish is called again.
-- 5. Hide preserves versions, published pointers and existing feedback.


-- Sprint 6 Phase 2A: stable S1-S10 curriculum identity and student Project Journey.
-- Attendance remains governed by the existing studio session lifecycle.
-- Weekly Activities remain independent and are never mapped into Session Check-in.

alter table public.studio_sessions add column if not exists session_number smallint;
alter table public.studio_sessions add column if not exists week_number smallint;
alter table public.studio_sessions add column if not exists curriculum_focus text;

-- Number existing sessions deterministically without changing their dates, titles,
-- attendance or teacher-authored schedule windows.
with ranked as (
  select id,
         row_number() over (
           partition by block_id
           order by session_date, created_at, id
         )::smallint as session_number
  from public.studio_sessions
)
update public.studio_sessions session
set session_number = ranked.session_number
from ranked
where session.id = ranked.id
  and session.session_number is null
  and ranked.session_number between 1 and 10;

update public.studio_sessions
set week_number = case session_number
      when 1 then 1 when 2 then 1 when 3 then 1
      when 4 then 2 when 5 then 2 when 6 then 2
      when 7 then 3 when 8 then 3 when 9 then 3
      when 10 then 4 else week_number end,
    curriculum_focus = case session_number
      when 1 then 'Project Reconnect & Check-in'
      when 2 then 'Team Alignment & Four-Week Commitment'
      when 3 then 'Project Progress & Work Focus'
      when 4 then 'Progress Pre-check'
      when 5 then 'Progress Review'
      when 6 then 'Review → Action'
      when 7 then 'Application Progress + Technical Implementation Report'
      when 8 then 'Completion Check + Product Verification'
      when 9 then 'Final Readiness'
      when 10 then 'Platform Feedback + Final Presentation'
      else curriculum_focus end
where session_number between 1 and 10;

alter table public.studio_sessions drop constraint if exists studio_sessions_session_number_check;
alter table public.studio_sessions add constraint studio_sessions_session_number_check
  check (session_number is null or session_number between 1 and 10) not valid;
alter table public.studio_sessions validate constraint studio_sessions_session_number_check;

alter table public.studio_sessions drop constraint if exists studio_sessions_week_number_check;
alter table public.studio_sessions add constraint studio_sessions_week_number_check
  check (week_number is null or week_number between 1 and 4) not valid;
alter table public.studio_sessions validate constraint studio_sessions_week_number_check;

create unique index if not exists studio_sessions_block_session_number_idx
  on public.studio_sessions (block_id, session_number)
  where session_number is not null;

-- The current 2026 2B1 class is already past S1-S5. Preserve those sessions as
-- read-only history even if an old schedule row was left in "scheduled" state.
update public.studio_sessions session
set status = 'closed',
    closed_at = coalesce(session.closed_at, now())
from public.teaching_blocks block
where session.block_id = block.id
  and block.academic_year = 2026
  and block.block_code = '2B1'
  and session.session_number between 1 and 5
  and session.status <> 'closed';

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
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid() and status = 'activated';

  if v_account.student_id is null then
    return '[]'::jsonb;
  end if;

  select roster.block_id into v_block_id
  from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id
    and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;

  if v_block_id is null then
    return '[]'::jsonb;
  end if;

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
      when session.status = 'closed'
        or (session.ends_at is not null and session.ends_at <= now()) then 'closed'
      when session.status = 'open'
        or (session.starts_at is not null and session.starts_at <= now()
          and (session.ends_at is null or session.ends_at > now())) then 'open'
      else 'scheduled' end,
    'checkedInAt', checkin.checked_in_at
  ) order by session.session_number nulls last, session.session_date, session.created_at), '[]'::jsonb)
  into v_result
  from public.studio_sessions session
  left join public.student_session_checkins checkin
    on checkin.session_id = session.id and checkin.auth_user_id = auth.uid()
  where session.block_id = v_block_id;

  return v_result;
end;
$$;

revoke all on function public.get_my_session_journey() from public;
grant execute on function public.get_my_session_journey() to authenticated;

-- Verification:
-- 1. Existing block session dates, titles, attendance and schedule windows are unchanged.
-- 2. Existing sessions are numbered S1-S10 in chronological order and have the agreed focus.
-- 3. 2026 2B1 S1-S5 are closed; S6-S10 retain their existing lifecycle state.
-- 4. Students receive only their active block and only their own Session Check-in history.
-- 5. Weekly Activity evidence is not mapped, copied or backfilled into the Session Journey.
-- 6. Existing get_my_session_history/check-in RPCs continue to work unchanged.


-- Sprint 6 Phase 2B: independent Session Task + Work Track for S6-S9.
-- Attendance and Weekly Activities remain separate evidence streams.

alter table public.studio_sessions add column if not exists task_guidance text;
alter table public.studio_sessions add column if not exists expected_evidence text;

alter table public.studio_sessions drop constraint if exists studio_sessions_task_guidance_length_check;
alter table public.studio_sessions add constraint studio_sessions_task_guidance_length_check
  check (task_guidance is null or char_length(task_guidance) <= 600) not valid;
alter table public.studio_sessions validate constraint studio_sessions_task_guidance_length_check;

alter table public.studio_sessions drop constraint if exists studio_sessions_expected_evidence_length_check;
alter table public.studio_sessions add constraint studio_sessions_expected_evidence_length_check
  check (expected_evidence is null or char_length(expected_evidence) <= 400) not valid;
alter table public.studio_sessions validate constraint studio_sessions_expected_evidence_length_check;

create table if not exists public.student_session_work_tracks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.studio_sessions(id) on delete restrict,
  student_id text not null references public.student_accounts(student_id) on delete restrict,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  block_id uuid not null references public.teaching_blocks(id) on delete restrict,
  response jsonb not null default '{}'::jsonb check (jsonb_typeof(response) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, student_id),
  unique (session_id, auth_user_id)
);

alter table public.student_session_work_tracks add column if not exists teacher_verified_completion smallint;
alter table public.student_session_work_tracks add column if not exists teacher_verification_status text;
alter table public.student_session_work_tracks add column if not exists teacher_verification_reason text;
alter table public.student_session_work_tracks add column if not exists teacher_verified_at timestamptz;
alter table public.student_session_work_tracks add column if not exists teacher_verified_by uuid references auth.users(id) on delete set null;

alter table public.student_session_work_tracks drop constraint if exists student_session_work_tracks_teacher_completion_check;
alter table public.student_session_work_tracks add constraint student_session_work_tracks_teacher_completion_check
  check (teacher_verified_completion is null or teacher_verified_completion between 0 and 100) not valid;
alter table public.student_session_work_tracks validate constraint student_session_work_tracks_teacher_completion_check;

alter table public.student_session_work_tracks drop constraint if exists student_session_work_tracks_teacher_status_check;
alter table public.student_session_work_tracks add constraint student_session_work_tracks_teacher_status_check
  check (teacher_verification_status is null or teacher_verification_status in ('confirmed', 'adjusted')) not valid;
alter table public.student_session_work_tracks validate constraint student_session_work_tracks_teacher_status_check;

create index if not exists student_session_work_tracks_block_session_idx
  on public.student_session_work_tracks (block_id, session_id);

alter table public.student_session_work_tracks enable row level security;
revoke all on public.student_session_work_tracks from anon, authenticated;
grant select on public.student_session_work_tracks to authenticated;

drop policy if exists "teachers read session work tracks" on public.student_session_work_tracks;
create policy "teachers read session work tracks" on public.student_session_work_tracks
for select to authenticated using (public.is_teacher());

drop policy if exists "students read own session work tracks" on public.student_session_work_tracks;
create policy "students read own session work tracks" on public.student_session_work_tracks
for select to authenticated using (auth_user_id = auth.uid());

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
    and session_number between 6 and 9;

  if v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Session Work Track is not available';
  end if;

  select * into v_track
  from public.student_session_work_tracks
  where session_id = v_session.id and auth_user_id = auth.uid();

  if v_session.session_number > 6 then
    select track.response,
           track.response ->> 'nextFocus',
           case when jsonb_typeof(track.response -> 'completionPercent') = 'number'
             then (track.response ->> 'completionPercent')::numeric::integer else null end
    into v_previous_response, v_previous_next_focus, v_previous_completion
    from public.student_session_work_tracks track
    join public.studio_sessions previous on previous.id = track.session_id
    where track.auth_user_id = auth.uid()
      and track.block_id = v_block_id
      and previous.session_number < v_session.session_number
      and previous.session_number between 6 and 9
    order by previous.session_number desc
    limit 1;
  end if;

  return jsonb_build_object(
    'sessionId', v_session.id,
    'sessionNumber', v_session.session_number,
    'focus', coalesce(v_session.curriculum_focus, v_session.title),
    'taskGuidance', v_session.task_guidance,
    'expectedEvidence', v_session.expected_evidence,
    'isOpen', (v_session.status = 'open' or (v_session.status = 'scheduled' and v_session.starts_at <= now() and (v_session.ends_at is null or v_session.ends_at > now()))),
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
    and session_number between 6 and 9
    and (status = 'open' or (status = 'scheduled' and starts_at <= now() and (ends_at is null or ends_at > now())));

  if v_account.student_id is null or v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Work Track can only be updated while this session is open';
  end if;

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

create or replace function public.get_teacher_session_work_tracks(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_session public.studio_sessions%rowtype;
  v_result jsonb;
begin
  if not public.is_teacher() then
    raise exception using errcode = 'P0001', message = 'Teacher access required';
  end if;

  select * into v_session from public.studio_sessions where id = p_session_id;
  if v_session.id is null then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'studentId', roster.student_id,
    'studentName', coalesce(roster.preferred_name, roster.full_name),
    'teamName', concat('Team ', roster.team_number),
    'checkedInAt', checkin.checked_in_at,
    'response', track.response,
    'updatedAt', track.updated_at,
    'teacherVerifiedCompletion', track.teacher_verified_completion,
    'teacherVerificationStatus', track.teacher_verification_status,
    'teacherVerificationReason', track.teacher_verification_reason,
    'teacherVerifiedAt', track.teacher_verified_at
  ) order by roster.team_number, coalesce(roster.preferred_name, roster.full_name), roster.student_id), '[]'::jsonb)
  into v_result
  from public.student_roster roster
  left join public.student_session_checkins checkin
    on checkin.session_id = v_session.id and checkin.student_id = roster.student_id
  left join public.student_session_work_tracks track
    on track.session_id = v_session.id and track.student_id = roster.student_id
  where roster.block_id = v_session.block_id;

  return v_result;
end;
$$;

revoke all on function public.get_teacher_session_work_tracks(uuid) from public;
grant execute on function public.get_teacher_session_work_tracks(uuid) to authenticated;

create or replace function public.verify_teacher_session_work_track(
  p_session_id uuid,
  p_student_id text,
  p_verified_completion integer,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_track public.student_session_work_tracks%rowtype;
  v_student_completion integer;
  v_status text;
begin
  if not public.is_teacher() then
    raise exception using errcode = 'P0001', message = 'Teacher access required';
  end if;
  if p_verified_completion is null or p_verified_completion < 0 or p_verified_completion > 100 then
    raise exception using errcode = 'P0001', message = 'Verified completion must be between 0 and 100';
  end if;
  if p_reason is not null and char_length(p_reason) > 300 then
    raise exception using errcode = 'P0001', message = 'Verification reason is too long';
  end if;

  select * into v_track
  from public.student_session_work_tracks
  where session_id = p_session_id and student_id = p_student_id;

  if v_track.id is null then
    raise exception using errcode = 'P0001', message = 'Student Work Track not found';
  end if;

  v_student_completion := case
    when jsonb_typeof(v_track.response -> 'completionPercent') = 'number'
    then (v_track.response ->> 'completionPercent')::numeric::integer
    else null
  end;
  if v_student_completion is null then
    raise exception using errcode = 'P0001', message = 'Student completion measure is not available';
  end if;

  v_status := case when p_verified_completion = v_student_completion then 'confirmed' else 'adjusted' end;
  if v_status = 'adjusted' and coalesce(btrim(p_reason), '') = '' then
    raise exception using errcode = 'P0001', message = 'Choose a reason when adjusting student completion';
  end if;

  update public.student_session_work_tracks
  set teacher_verified_completion = p_verified_completion,
      teacher_verification_status = v_status,
      teacher_verification_reason = nullif(btrim(p_reason), ''),
      teacher_verified_at = now(),
      teacher_verified_by = auth.uid()
  where id = v_track.id
  returning * into v_track;

  return jsonb_build_object(
    'teacherVerifiedCompletion', v_track.teacher_verified_completion,
    'teacherVerificationStatus', v_track.teacher_verification_status,
    'teacherVerificationReason', v_track.teacher_verification_reason,
    'teacherVerifiedAt', v_track.teacher_verified_at
  );
end;
$$;

revoke all on function public.verify_teacher_session_work_track(uuid, text, integer, text) from public;
grant execute on function public.verify_teacher_session_work_track(uuid, text, integer, text) to authenticated;

-- Extend the Phase 2A Journey with only the student's own Track completion marker.
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
      when session.status = 'closed' or (session.ends_at is not null and session.ends_at <= now()) then 'closed'
      when session.status = 'open' or (session.starts_at is not null and session.starts_at <= now() and (session.ends_at is null or session.ends_at > now())) then 'open'
      else 'scheduled' end,
    'checkedInAt', checkin.checked_in_at,
    'workTrackUpdatedAt', track.updated_at
  ) order by session.session_number nulls last, session.session_date, session.created_at), '[]'::jsonb)
  into v_result
  from public.studio_sessions session
  left join public.student_session_checkins checkin
    on checkin.session_id = session.id and checkin.auth_user_id = auth.uid()
  left join public.student_session_work_tracks track
    on track.session_id = session.id and track.auth_user_id = auth.uid()
  where session.block_id = v_block_id;

  return v_result;
end;
$$;

revoke all on function public.get_my_session_journey() from public;
grant execute on function public.get_my_session_journey() to authenticated;

-- Verification:
-- 1. Session Check-in and Weekly Activity tables/functions are unchanged.
-- 2. S6-S9 accept at most one Work Track per student/session and only save while open.
-- 3. Closed Work Tracks remain readable but cannot be edited by students.
-- 4. S7 may read S6 nextFocus as context; it is not copied into S7 evidence.
-- 5. Completion is server-calculated from 3 fixed IT core requirements plus up to 5 optional project-specific requirements.
-- 6. The first 3 requirement labels are enforced server-side and use the shared 0/25/50/75/100 evidence standard.
-- 7. S7-S9 carry the previous requirement assessment forward for longitudinal comparison.
-- 8. Teacher evidence is block/session scoped and teachers can confirm or adjust the calculated completion with a reason.


-- Sprint 6 Phase 2C: S10 individual Platform Feedback checkpoint.
-- This is intentionally separate from attendance, Weekly Activities and S6-S9 Work Track.

create table if not exists public.student_platform_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.studio_sessions(id) on delete restrict,
  student_id text not null references public.student_accounts(student_id) on delete restrict,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  block_id uuid not null references public.teaching_blocks(id) on delete restrict,
  overall_usefulness smallint not null check (overall_usefulness between 1 and 5),
  engagement_help text not null check (engagement_help in ('Yes', 'Somewhat', 'No')),
  most_useful_feature text not null check (most_useful_feature in ('Session Check-in', 'Weekly Activities', 'Teacher Review', 'Poster Gallery', 'Work Track', 'Peer Feedback')),
  improve_area text not null check (improve_area in ('Navigation', 'Activities', 'Feedback', 'Session workflow', 'Poster', 'Other')),
  recommendation text not null check (recommendation in ('Yes', 'Maybe', 'No')),
  change_note text check (change_note is null or char_length(change_note) <= 300),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, student_id),
  unique (session_id, auth_user_id)
);

create index if not exists student_platform_feedback_block_session_idx
  on public.student_platform_feedback (block_id, session_id);

alter table public.student_platform_feedback enable row level security;
revoke all on public.student_platform_feedback from anon, authenticated;
grant select on public.student_platform_feedback to authenticated;

drop policy if exists "students read own platform feedback" on public.student_platform_feedback;
create policy "students read own platform feedback" on public.student_platform_feedback
for select to authenticated using (auth_user_id = auth.uid());

drop policy if exists "teachers read platform feedback" on public.student_platform_feedback;

create or replace function public.get_my_platform_feedback(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_session public.studio_sessions%rowtype;
  v_feedback public.student_platform_feedback%rowtype;
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
  where id = p_session_id and block_id = v_block_id and session_number = 10;

  if v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Final Platform Feedback is not available';
  end if;

  select * into v_feedback
  from public.student_platform_feedback
  where session_id = v_session.id and auth_user_id = auth.uid();

  return jsonb_build_object(
    'sessionId', v_session.id,
    'focus', coalesce(v_session.curriculum_focus, v_session.title),
    'isOpen', (v_session.status = 'open' or (v_session.status = 'scheduled' and v_session.starts_at <= now() and (v_session.ends_at is null or v_session.ends_at > now()))),
    'response', case when v_feedback.id is null then '{}'::jsonb else jsonb_build_object(
      'overallUsefulness', v_feedback.overall_usefulness,
      'engagementHelp', v_feedback.engagement_help,
      'mostUsefulFeature', v_feedback.most_useful_feature,
      'improveArea', v_feedback.improve_area,
      'recommendation', v_feedback.recommendation,
      'changeNote', coalesce(v_feedback.change_note, '')
    ) end,
    'submittedAt', v_feedback.submitted_at,
    'updatedAt', v_feedback.updated_at
  );
end;
$$;

revoke all on function public.get_my_platform_feedback(uuid) from public;
grant execute on function public.get_my_platform_feedback(uuid) to authenticated;

create or replace function public.save_my_platform_feedback(p_session_id uuid, p_response jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_session public.studio_sessions%rowtype;
  v_feedback public.student_platform_feedback%rowtype;
  v_block_id uuid;
  v_usefulness integer;
  v_engagement text;
  v_feature text;
  v_improve text;
  v_recommendation text;
  v_note text;
begin
  if p_response is null or jsonb_typeof(p_response) <> 'object' or length(p_response::text) > 3000 then
    raise exception using errcode = 'P0001', message = 'Platform Feedback is invalid';
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
    and session_number = 10
    and (status = 'open' or (status = 'scheduled' and starts_at <= now() and (ends_at is null or ends_at > now())));

  if v_account.student_id is null or v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Platform Feedback can only be updated while Session 10 is open';
  end if;

  begin
    v_usefulness := (p_response ->> 'overallUsefulness')::integer;
  exception when invalid_text_representation then
    raise exception using errcode = 'P0001', message = 'Choose an overall usefulness rating from 1 to 5';
  end;
  v_engagement := p_response ->> 'engagementHelp';
  v_feature := p_response ->> 'mostUsefulFeature';
  v_improve := p_response ->> 'improveArea';
  v_recommendation := p_response ->> 'recommendation';
  v_note := nullif(btrim(p_response ->> 'changeNote'), '');

  if v_usefulness is null
     or v_usefulness not between 1 and 5
     or coalesce(v_engagement, '') not in ('Yes', 'Somewhat', 'No')
     or coalesce(v_feature, '') not in ('Session Check-in', 'Weekly Activities', 'Teacher Review', 'Poster Gallery', 'Work Track', 'Peer Feedback')
     or coalesce(v_improve, '') not in ('Navigation', 'Activities', 'Feedback', 'Session workflow', 'Poster', 'Other')
     or coalesce(v_recommendation, '') not in ('Yes', 'Maybe', 'No')
     or char_length(coalesce(v_note, '')) > 300 then
    raise exception using errcode = 'P0001', message = 'Complete all required Platform Feedback choices';
  end if;

  insert into public.student_platform_feedback (
    session_id, student_id, auth_user_id, block_id, overall_usefulness, engagement_help,
    most_useful_feature, improve_area, recommendation, change_note
  ) values (
    v_session.id, v_account.student_id, auth.uid(), v_block_id, v_usefulness, v_engagement,
    v_feature, v_improve, v_recommendation, v_note
  )
  on conflict (session_id, student_id) do update
    set overall_usefulness = excluded.overall_usefulness,
        engagement_help = excluded.engagement_help,
        most_useful_feature = excluded.most_useful_feature,
        improve_area = excluded.improve_area,
        recommendation = excluded.recommendation,
        change_note = excluded.change_note,
        updated_at = now()
  returning * into v_feedback;

  return jsonb_build_object('submittedAt', v_feedback.submitted_at, 'updatedAt', v_feedback.updated_at);
end;
$$;

revoke all on function public.save_my_platform_feedback(uuid, jsonb) from public;
grant execute on function public.save_my_platform_feedback(uuid, jsonb) to authenticated;

create or replace function public.get_teacher_platform_feedback_status(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_session public.studio_sessions%rowtype;
  v_result jsonb;
begin
  if not public.is_teacher() then
    raise exception using errcode = 'P0001', message = 'Teacher access required';
  end if;

  select * into v_session from public.studio_sessions where id = p_session_id and session_number = 10;
  if v_session.id is null then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'studentId', roster.student_id,
    'studentName', coalesce(roster.preferred_name, roster.full_name),
    'teamName', concat('Team ', roster.team_number),
    'completedAt', feedback.submitted_at,
    'updatedAt', feedback.updated_at
  ) order by roster.team_number, coalesce(roster.preferred_name, roster.full_name), roster.student_id), '[]'::jsonb)
  into v_result
  from public.student_roster roster
  left join public.student_platform_feedback feedback
    on feedback.session_id = v_session.id and feedback.student_id = roster.student_id
  where roster.block_id = v_session.block_id;

  return v_result;
end;
$$;

revoke all on function public.get_teacher_platform_feedback_status(uuid) from public;
grant execute on function public.get_teacher_platform_feedback_status(uuid) to authenticated;

-- Extend the Session Journey with only the authenticated student's S10 completion marker.
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

-- Verification:
-- 1. S10 feedback is one individual record per student/session and cannot be written outside the open S10 window.
-- 2. The five structured questions are required; the final change note is optional and capped at 300 characters.
-- 3. Teacher status exposes completion only; it does not convert feedback into a grade.
-- 4. Session Check-in, Weekly Activities and S6-S9 Work Track remain independent.
-- 5. An explicit Teacher reopen remains open even when an older automatic end time has passed.


-- Sprint 6 hotfix: bind Poster Gallery feedback to the authenticated roster identity.
-- The UI supplies reviewer_team again. A narrow SECURITY DEFINER helper performs
-- the private roster lookup because browser roles cannot read those tables.

create or replace function public.student_matches_poster_reviewer(
  p_block_id uuid,
  p_student_id text,
  p_team_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.student_accounts account
    join public.student_roster roster
      on lower(trim(roster.student_id)) = lower(trim(account.student_id))
     and roster.block_id = p_block_id
    join public.teaching_blocks block
      on block.id = roster.block_id
     and block.status = 'active'
    where account.auth_user_id = auth.uid()
      and account.status = 'activated'
      and lower(trim(account.student_id)) = lower(trim(p_student_id))
      and lower(trim(concat('Team ', roster.team_number))) = lower(trim(p_team_name))
  );
$$;

revoke all on function public.student_matches_poster_reviewer(uuid, text, text) from public;
grant execute on function public.student_matches_poster_reviewer(uuid, text, text) to authenticated;

drop policy if exists "Students can submit poster reviews"
on public.poster_reviews;

create policy "Students can submit poster reviews"
on public.poster_reviews
for insert
to authenticated
with check (
  public.student_can_review_poster_gallery(block_id)
  and public.student_matches_poster_reviewer(
    block_id,
    reviewer_student_id,
    reviewer_team
  )
  and lower(trim(reviewer_team)) <> lower(trim(reviewed_team))
  and exists (
    select 1
    from public.teams team
    join public.team_posters poster
      on poster.team_id = team.id
     and poster.block_id = team.block_id
    join public.poster_versions version
      on version.id = poster.published_version_id
     and version.status = 'ready'
    where team.block_id = poster_reviews.block_id
      and lower(concat('Team ', team.team_number)) = lower(trim(poster_reviews.reviewed_team))
  )
  and char_length(trim(reviewer_name)) between 1 and 100
  and problem_clarity between 1 and 5
  and working_product between 1 and 5
  and evidence_testing between 1 and 5
  and document_readiness between 1 and 5
  and presentation_quality between 1 and 5
  and char_length(trim(strongest_part)) between 1 and 1000
  and char_length(trim(highest_priority)) between 1 and 1000
);

-- Verification:
-- 1. A logged-in student can submit against another published Team Poster.
-- 2. The browser role never receives direct SELECT access to accounts or roster.
-- 3. Changing reviewer_student_id, reviewer_team or block_id is rejected.
-- 4. Own-Team, hidden-Gallery and missing published-Poster submissions are rejected.


-- Submit through one authoritative server path. Reviewer identity and Block are
-- derived from auth.uid(); the browser supplies only the review target/content.
create or replace function public.submit_poster_review(
  p_reviewed_team text,
  p_problem_clarity integer,
  p_working_product integer,
  p_evidence_testing integer,
  p_document_readiness integer,
  p_presentation_quality integer,
  p_strongest_part text,
  p_highest_priority text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_roster public.student_roster%rowtype;
  v_target_team public.teams%rowtype;
  v_review_id uuid;
begin
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid()
    and status = 'activated';

  if v_account.student_id is null then
    raise exception using errcode = '42501', message = 'Activated student account is not available';
  end if;

  select roster.* into v_roster
  from public.student_roster roster
  join public.teaching_blocks block
    on block.id = roster.block_id
   and block.status = 'active'
  where lower(trim(roster.student_id)) = lower(trim(v_account.student_id))
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;

  if v_roster.id is null then
    raise exception using errcode = '42501', message = 'Active class roster is not available';
  end if;

  if not exists (
    select 1
    from public.poster_gallery_settings gallery
    where gallery.block_id = v_roster.block_id
      and gallery.is_published
  ) then
    raise exception using errcode = '42501', message = 'Poster Gallery is not published';
  end if;

  select team.* into v_target_team
  from public.teams team
  where team.block_id = v_roster.block_id
    and lower(trim(concat('Team ', team.team_number))) = lower(trim(p_reviewed_team))
  limit 1;

  if v_target_team.id is null or not exists (
    select 1
    from public.team_posters poster
    join public.poster_versions version
      on version.id = poster.published_version_id
     and version.status = 'ready'
    where poster.block_id = v_roster.block_id
      and poster.team_id = v_target_team.id
  ) then
    raise exception using errcode = '42501', message = 'The published Poster is not available';
  end if;

  if v_target_team.team_number = v_roster.team_number then
    raise exception using errcode = '42501', message = 'Your Team cannot review its own Poster';
  end if;

  if p_problem_clarity not between 1 and 5
    or p_working_product not between 1 and 5
    or p_evidence_testing not between 1 and 5
    or p_document_readiness not between 1 and 5
    or p_presentation_quality not between 1 and 5 then
    raise exception using errcode = '22023', message = 'Complete every Poster rating';
  end if;

  if char_length(trim(coalesce(p_strongest_part, ''))) < 1
    or char_length(trim(coalesce(p_highest_priority, ''))) < 1 then
    raise exception using errcode = '22023', message = 'Complete the strongest area and next priority';
  end if;

  insert into public.poster_reviews (
    reviewer_name,
    reviewer_student_id,
    reviewer_team,
    reviewed_team,
    problem_clarity,
    working_product,
    evidence_testing,
    document_readiness,
    presentation_quality,
    strongest_part,
    highest_priority,
    block_id
  ) values (
    coalesce(v_roster.preferred_name, v_roster.full_name),
    v_account.student_id,
    concat('Team ', v_roster.team_number),
    concat('Team ', v_target_team.team_number),
    p_problem_clarity,
    p_working_product,
    p_evidence_testing,
    p_document_readiness,
    p_presentation_quality,
    trim(p_strongest_part),
    trim(p_highest_priority),
    v_roster.block_id
  )
  returning id into v_review_id;

  return v_review_id;
end;
$$;

revoke all on function public.submit_poster_review(text, integer, integer, integer, integer, integer, text, text) from public;
grant execute on function public.submit_poster_review(text, integer, integer, integer, integer, integer, text, text) to authenticated;


-- Hotfix: align the live teacher_progress_reviews table with the current
-- Week 2 Teacher Review UI, then save through an authoritative teacher-only RPC.
--
-- Some databases contain legacy columns (claim_status, follow_up_priority,
-- teacher_note) because an older table pre-dated the repository migration.
-- Keep those columns for backwards compatibility, but stop requiring them for
-- current writes. Existing legacy rows are mapped before current constraints
-- are enforced. This script is idempotent and does not delete review records.

alter table public.teacher_progress_reviews
  add column if not exists block_id uuid references public.teaching_blocks(id),
  add column if not exists claim_status text,
  add column if not exists review_outcome text,
  add column if not exists demonstration_outcome text,
  add column if not exists method_explanation text,
  add column if not exists evidence_quality text,
  add column if not exists contribution_verification text,
  add column if not exists report_alignment text,
  add column if not exists teacher_feedback text,
  add column if not exists follow_up_priority text,
  add column if not exists follow_up_status text,
  add column if not exists follow_up_actions text[] default array[]::text[],
  add column if not exists teacher_note text,
  add column if not exists follow_up_note text,
  add column if not exists recheck_week smallint,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- Legacy-only fields must not be mandatory for the current review model.
alter table public.teacher_progress_reviews
  alter column claim_status drop not null,
  alter column follow_up_priority drop not null;

-- Migrate any legacy rows without overwriting current review data.
update public.teacher_progress_reviews
set
  review_outcome = coalesce(
    review_outcome,
    case claim_status
      when 'Verified' then 'Verified'
      when 'Partially verified' then 'Partially verified'
      when 'Not demonstrated' then 'Unable to demonstrate'
      when 'Different from pre-check' then 'Further evidence required'
    end
  ),
  teacher_feedback = coalesce(
    teacher_feedback,
    nullif(trim(teacher_note), ''),
    'Migrated from legacy teacher review.'
  ),
  follow_up_status = coalesce(
    follow_up_status,
    case
      when follow_up_priority = 'No follow-up' then 'No follow-up needed'
      when follow_up_priority is not null then 'Action required'
      else 'Not reviewed'
    end
  ),
  follow_up_actions = case
    when coalesce(cardinality(follow_up_actions), 0) > 0 then follow_up_actions
    when follow_up_priority = 'No follow-up' then array['No action required']::text[]
    when follow_up_priority = 'Implementation' then array['Complete implementation']::text[]
    when follow_up_priority = 'Integration' then array['Complete integration']::text[]
    when follow_up_priority = 'Testing' then array['Add or run tests']::text[]
    when follow_up_priority = 'Evidence' then array['Provide code or commit evidence']::text[]
    when follow_up_priority = 'Documentation' then array['Update Progress Report']::text[]
    when follow_up_priority = 'Team contribution' then array['Clarify individual contribution']::text[]
    when follow_up_priority = 'Urgent intervention' then array['Other']::text[]
    else array['Other']::text[]
  end;

-- Replace only the current-model constraints so reruns converge to one schema.
alter table public.teacher_progress_reviews
  drop constraint if exists teacher_progress_reviews_review_outcome_check,
  drop constraint if exists teacher_progress_reviews_demonstration_outcome_check,
  drop constraint if exists teacher_progress_reviews_method_explanation_check,
  drop constraint if exists teacher_progress_reviews_evidence_quality_check,
  drop constraint if exists teacher_progress_reviews_contribution_verification_check,
  drop constraint if exists teacher_progress_reviews_report_alignment_check,
  drop constraint if exists teacher_progress_reviews_teacher_feedback_check,
  drop constraint if exists teacher_progress_reviews_follow_up_status_check,
  drop constraint if exists teacher_progress_reviews_follow_up_actions_check,
  drop constraint if exists teacher_progress_reviews_follow_up_note_check,
  drop constraint if exists teacher_progress_reviews_recheck_week_check;

alter table public.teacher_progress_reviews
  alter column review_outcome set not null,
  alter column demonstration_outcome set not null,
  alter column method_explanation set not null,
  alter column evidence_quality set not null,
  alter column contribution_verification set not null,
  alter column report_alignment set not null,
  alter column teacher_feedback set not null,
  alter column follow_up_status set not null,
  alter column follow_up_actions set default array[]::text[],
  alter column follow_up_actions set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null,
  add constraint teacher_progress_reviews_review_outcome_check
    check (review_outcome in ('Verified','Partially verified','Not verified','Unable to demonstrate','Further evidence required')),
  add constraint teacher_progress_reviews_demonstration_outcome_check
    check (demonstration_outcome in ('Worked on target system','Worked with limitations','Partial demonstration','Could not demonstrate','Not applicable')),
  add constraint teacher_progress_reviews_method_explanation_check
    check (method_explanation in ('Clear and credible','Mostly clear','Limited explanation','Could not explain')),
  add constraint teacher_progress_reviews_evidence_quality_check
    check (evidence_quality in ('Strong and traceable','Adequate','Partial','No usable evidence')),
  add constraint teacher_progress_reviews_contribution_verification_check
    check (contribution_verification in ('Clearly verified','Partly verified','Needs further evidence','Not verified')),
  add constraint teacher_progress_reviews_report_alignment_check
    check (report_alignment in ('Consistent','Minor update needed','Significant update needed','Not checked')),
  add constraint teacher_progress_reviews_teacher_feedback_check
    check (char_length(teacher_feedback) between 1 and 800),
  add constraint teacher_progress_reviews_follow_up_status_check
    check (follow_up_status in ('Not reviewed','No follow-up needed','Action required','In progress','Recheck next session','Resolved')),
  add constraint teacher_progress_reviews_follow_up_actions_check
    check (
      cardinality(follow_up_actions) between 1 and 10
      and follow_up_actions <@ array[
        'No action required','Complete implementation','Fix identified issue',
        'Provide code or commit evidence','Add or run tests','Complete integration',
        'Update Progress Report','Clarify individual contribution',
        'Prepare another demonstration','Other'
      ]::text[]
    ),
  add constraint teacher_progress_reviews_follow_up_note_check
    check (follow_up_note is null or char_length(follow_up_note) <= 400),
  add constraint teacher_progress_reviews_recheck_week_check
    check (recheck_week is null or recheck_week between 2 and 4);

create unique index if not exists teacher_progress_reviews_block_student_key
  on public.teacher_progress_reviews (block_id, student_id);

create or replace function public.save_teacher_progress_review(
  p_submission_id uuid,
  p_review jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_submission public.week2_progress_reviews%rowtype;
  v_saved public.teacher_progress_reviews%rowtype;
  v_actions text[];
  v_recheck_week smallint;
begin
  if auth.uid() is null or not coalesce(public.is_teacher(), false) then
    raise exception using errcode = '42501',
      message = 'Your teacher session is not authorised to save this review. Sign in again and retry.';
  end if;

  select submission.* into v_submission
  from public.week2_progress_reviews submission
  where submission.id = p_submission_id;

  if not found then
    raise exception using errcode = 'P0002',
      message = 'The selected Week 2 Pre-check submission was not found. Refresh the dashboard and retry.';
  end if;

  if v_submission.block_id is null then
    raise exception using errcode = '23514',
      message = 'This Pre-check is not linked to a teaching block. Ask the administrator to repair the submission.';
  end if;

  if nullif(trim(coalesce(v_submission.student_name, '')), '') is null
     or nullif(trim(coalesce(v_submission.student_id, '')), '') is null
     or nullif(trim(coalesce(v_submission.team_name, '')), '') is null then
    raise exception using errcode = '23514',
      message = 'This Pre-check has incomplete student or team identity. Refresh the roster link before saving a review.';
  end if;

  if jsonb_typeof(coalesce(p_review -> 'follow_up_actions', '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'Follow-up actions are invalid.';
  end if;

  select coalesce(array_agg(action), array[]::text[])
  into v_actions
  from jsonb_array_elements_text(coalesce(p_review -> 'follow_up_actions', '[]'::jsonb)) action;

  if cardinality(v_actions) < 1 then
    raise exception using errcode = '22023', message = 'Select at least one follow-up action.';
  end if;

  if nullif(trim(coalesce(p_review ->> 'teacher_feedback', '')), '') is null then
    raise exception using errcode = '22023', message = 'Add a Conversation note before saving.';
  end if;

  if char_length(trim(p_review ->> 'teacher_feedback')) > 800 then
    raise exception using errcode = '22023', message = 'Conversation note must be 800 characters or fewer.';
  end if;

  v_recheck_week := nullif(p_review ->> 'recheck_week', '')::smallint;

  insert into public.teacher_progress_reviews (
    block_id, student_name, student_id, team_name, review_outcome,
    demonstration_outcome, method_explanation, evidence_quality,
    contribution_verification, report_alignment, teacher_feedback,
    follow_up_status, follow_up_actions, follow_up_note, recheck_week
  ) values (
    v_submission.block_id, trim(v_submission.student_name),
    trim(v_submission.student_id), trim(v_submission.team_name),
    p_review ->> 'review_outcome', p_review ->> 'demonstration_outcome',
    p_review ->> 'method_explanation', p_review ->> 'evidence_quality',
    p_review ->> 'contribution_verification', p_review ->> 'report_alignment',
    trim(p_review ->> 'teacher_feedback'), p_review ->> 'follow_up_status',
    v_actions, nullif(trim(coalesce(p_review ->> 'follow_up_note', '')), ''),
    v_recheck_week
  )
  on conflict (block_id, student_id) do update set
    student_name = excluded.student_name,
    team_name = excluded.team_name,
    review_outcome = excluded.review_outcome,
    demonstration_outcome = excluded.demonstration_outcome,
    method_explanation = excluded.method_explanation,
    evidence_quality = excluded.evidence_quality,
    contribution_verification = excluded.contribution_verification,
    report_alignment = excluded.report_alignment,
    teacher_feedback = excluded.teacher_feedback,
    follow_up_status = excluded.follow_up_status,
    follow_up_actions = excluded.follow_up_actions,
    follow_up_note = excluded.follow_up_note,
    recheck_week = excluded.recheck_week
  returning * into v_saved;

  return to_jsonb(v_saved);
end;
$$;

revoke all on function public.save_teacher_progress_review(uuid, jsonb) from public, anon;
grant execute on function public.save_teacher_progress_review(uuid, jsonb) to authenticated;


-- Sprint 6 Phase 2D: persist teacher password reset feedback.
-- Safe to run repeatedly. Existing accounts are unchanged.

alter table public.student_accounts
  add column if not exists password_reset_at timestamptz;

comment on column public.student_accounts.password_reset_at is
  'Most recent teacher-issued temporary-password reset. Null means no teacher reset has been recorded.';

create index if not exists student_accounts_password_reset_at_idx
  on public.student_accounts (password_reset_at)
  where password_reset_at is not null;


-- Sprint 6 Phase 3 storage and RPC privilege hardening.
-- Keep Poster objects private and constrain new uploads/replacements to
-- PDF/JPEG/PNG files at or below 1 MB. Existing objects are not deleted.

update storage.buckets
set
  public = false,
  file_size_limit = 1048576,
  allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg']::text[]
where id = 'poster-gallery';

revoke execute on function public.get_my_poster_upload_status() from public, anon;
revoke execute on function public.get_my_poster_gallery() from public, anon;
revoke execute on function public.get_teacher_poster_gallery(uuid) from public, anon;
revoke execute on function public.publish_poster_gallery(uuid) from public, anon;
revoke execute on function public.hide_poster_gallery(uuid) from public, anon;
revoke execute on function public.remove_team_poster_draft(uuid) from public, anon;

revoke execute on function public.get_my_session_work_track(uuid) from public, anon;
revoke execute on function public.save_my_session_work_track(uuid, jsonb) from public, anon;
revoke execute on function public.get_teacher_session_work_tracks(uuid) from public, anon;
revoke execute on function public.verify_teacher_session_work_track(uuid, text, integer, text) from public, anon;

revoke execute on function public.get_my_platform_feedback(uuid) from public, anon;
revoke execute on function public.save_my_platform_feedback(uuid, jsonb) from public, anon;
revoke execute on function public.get_teacher_platform_feedback_status(uuid) from public, anon;

grant execute on function public.get_my_poster_upload_status() to authenticated, service_role;
grant execute on function public.get_my_poster_gallery() to authenticated, service_role;
grant execute on function public.get_teacher_poster_gallery(uuid) to authenticated, service_role;
grant execute on function public.publish_poster_gallery(uuid) to authenticated, service_role;
grant execute on function public.hide_poster_gallery(uuid) to authenticated, service_role;
grant execute on function public.remove_team_poster_draft(uuid) to authenticated, service_role;

grant execute on function public.get_my_session_work_track(uuid) to authenticated, service_role;
grant execute on function public.save_my_session_work_track(uuid, jsonb) to authenticated, service_role;
grant execute on function public.get_teacher_session_work_tracks(uuid) to authenticated, service_role;
grant execute on function public.verify_teacher_session_work_track(uuid, text, integer, text) to authenticated, service_role;

grant execute on function public.get_my_platform_feedback(uuid) to authenticated, service_role;
grant execute on function public.save_my_platform_feedback(uuid, jsonb) to authenticated, service_role;
grant execute on function public.get_teacher_platform_feedback_status(uuid) to authenticated, service_role;


-- Sprint 7 Phase 1A: separate Work Track access from Session Check-in.
-- Default behaviour follows the Session schedule; teachers may independently open
-- or close an S6-S9 Work Track without changing attendance access.

alter table public.studio_sessions
  add column if not exists work_track_access text not null default 'session';

alter table public.studio_sessions
  drop constraint if exists studio_sessions_work_track_access_check;
alter table public.studio_sessions
  add constraint studio_sessions_work_track_access_check
  check (work_track_access in ('session', 'open', 'closed')) not valid;
alter table public.studio_sessions
  validate constraint studio_sessions_work_track_access_check;

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
    and session_number between 6 and 9;

  if v_session.id is null then
    raise exception using errcode = 'P0001', message = 'Session Work Track is not available';
  end if;

  select * into v_track
  from public.student_session_work_tracks
  where session_id = v_session.id and auth_user_id = auth.uid();

  if v_session.session_number > 6 then
    select track.response,
           track.response ->> 'nextFocus',
           case when jsonb_typeof(track.response -> 'completionPercent') = 'number'
             then (track.response ->> 'completionPercent')::numeric::integer else null end
    into v_previous_response, v_previous_next_focus, v_previous_completion
    from public.student_session_work_tracks track
    join public.studio_sessions previous on previous.id = track.session_id
    where track.auth_user_id = auth.uid()
      and track.block_id = v_block_id
      and previous.session_number < v_session.session_number
      and previous.session_number between 6 and 9
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
      v_session.work_track_access = 'open'
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
    ),
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
    and session_number between 6 and 9
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
      when session.session_number not between 6 and 9 then null
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

-- Verification:
-- 1. Existing rows default to Follow session without changing Check-in or evidence.
-- 2. Teacher may open S8 Track while S8 Check-in is closed and S9 is current.
-- 3. S8 and S9 Tracks may be open simultaneously.
-- 4. Closing a Track preserves saved evidence as read-only.
-- 5. Returning to Follow session restores schedule-derived Track access.


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

-- Sprint 9 R02: minimum secure teacher Intake read workflow.
--
-- Purpose: let an authenticated teacher read, for a selected Session, the full
-- roster with each student's confirmed Session Intake (or an explicit "missing"
-- marker), so submitted/missing can be counted and a confirmed record and its
-- sources inspected. Student claims stay distinct from teacher verification.
--
-- This migration is ADDITIVE and read-only in effect:
--   * it creates ONE new function, public.get_teacher_session_intakes(uuid);
--   * it does not create/alter tables, columns, policies, blocks, sessions or
--     rows, and it does not call any AI provider;
--   * no existing function is modified.
--
-- Access-pattern decision
-- ------------------------
-- The RLS policy "teachers read session intakes" already lets a teacher SELECT
-- rows in public.student_session_intakes. That policy alone cannot produce the
-- MISSING entries this workflow needs (a student with no row), because RLS can
-- only filter rows that exist. Surfacing "missing" requires the roster as the
-- list base, left-joined to intakes. public.student_roster is not exposed to the
-- authenticated role for arbitrary selection, so a SECURITY DEFINER function
-- with an explicit is_teacher() gate is the narrowest pattern that:
--   * reuses the exact convention of public.get_teacher_session_work_tracks;
--   * keeps roster read access inside one audited, teacher-only function;
--   * returns only the fields this teacher workflow needs.
-- The function is read-only: it performs SELECT only and writes nothing.

begin;

create or replace function public.get_teacher_session_intakes(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_session public.studio_sessions%rowtype;
  v_roster_rows jsonb;
  v_orphan_rows jsonb;
  v_submitted integer;       -- roster students who submitted (roster completion numerator)
  v_missing integer;         -- roster students with no Intake
  v_offroster integer;       -- off-roster confirmed Intakes (history; NOT roster completion)
begin
  -- 1. Explicit, authenticated teacher requirement. No anon/student path.
  if not public.is_teacher() then
    raise exception using errcode = 'P0001', message = 'Teacher access required';
  end if;

  -- 2. Resolve the Block from the selected Session. Unknown Session => empty,
  --    well-formed payload (not an error), matching the work-track convention.
  select * into v_session
  from public.studio_sessions
  where id = p_session_id;

  if v_session.id is null then
    return jsonb_build_object(
      'sessionId', p_session_id,
      'sessionNumber', null,
      'blockId', null,
      'rosterSize', 0,
      'rosterSubmittedCount', 0,
      'missingCount', 0,
      'offRosterCount', 0,
      'submittedCount', 0,
      'intakes', '[]'::jsonb
    );
  end if;

  -- 3. Roster of the Session's Block is the LIST BASE. A left join to the
  --    confirmed Intake for THIS Session and THIS student surfaces missing
  --    submissions (intake fields null). Join key is (session_id, student_id)
  --    scoped to the Session's own block_id, so a row from another Block or
  --    another Session can never attach here.
  select
    coalesce(jsonb_agg(row_json order by team_number, student_label, student_id), '[]'::jsonb),
    coalesce(sum(case when submitted then 1 else 0 end), 0),
    coalesce(sum(case when submitted then 0 else 1 end), 0)
  into v_roster_rows, v_submitted, v_missing
  from (
    select
      roster.team_number as team_number,
      roster.student_id as student_id,
      coalesce(roster.preferred_name, roster.full_name) as student_label,
      (intake.id is not null) as submitted,
      jsonb_build_object(
        'studentId', roster.student_id,
        'studentName', coalesce(roster.preferred_name, roster.full_name),
        'teamName', concat('Team ', roster.team_number),
        'onRoster', true,
        'submitted', (intake.id is not null),
        'intakeId', intake.id,
        'sourceMode', intake.source_mode,
        'confirmedAt', intake.confirmed_at,
        -- Student claim and its sources. Teacher verification is NOT part of
        -- this record and is reported separately as unset (see below).
        'studentRecord', intake.student_record,
        'sourceConversation', intake.source_conversation,
        'corrections', case
          when intake.id is null then null
          else coalesce(intake.student_confirmation -> 'corrections', '[]'::jsonb)
        end,
        'studentAttestation', intake.student_confirmation ->> 'attestation',
        -- Teacher verification lives in no column of this table; always unset.
        'teacherVerification', jsonb_build_object('status', 'unset', 'recorded', false)
      ) as row_json
    from public.student_roster roster
    left join public.student_session_intakes intake
      on intake.session_id = v_session.id
     and intake.block_id = v_session.block_id
     and intake.student_id = roster.student_id
    where roster.block_id = v_session.block_id
  ) roster_base;

  -- 4. Historical preservation. A confirmed Intake whose student is no longer on
  --    the current roster would be dropped by the roster-base join above. We do
  --    NOT silently drop it: collect confirmed intakes for THIS Session whose
  --    student_id has no matching roster row, and append them flagged
  --    onRoster=false. They are counted as submitted.
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'studentId', intake.student_id,
      'studentName', intake.student_id,
      'teamName', null,
      'onRoster', false,
      'submitted', true,
      'intakeId', intake.id,
      'sourceMode', intake.source_mode,
      'confirmedAt', intake.confirmed_at,
      'studentRecord', intake.student_record,
      'sourceConversation', intake.source_conversation,
      'corrections', coalesce(intake.student_confirmation -> 'corrections', '[]'::jsonb),
      'studentAttestation', intake.student_confirmation ->> 'attestation',
      'teacherVerification', jsonb_build_object('status', 'unset', 'recorded', false)
    ) order by intake.confirmed_at), '[]'::jsonb)
  into v_orphan_rows
  from public.student_session_intakes intake
  where intake.session_id = v_session.id
    and intake.block_id = v_session.block_id
    and not exists (
      select 1 from public.student_roster roster
      where roster.block_id = v_session.block_id
        and roster.student_id = intake.student_id
    );

  v_offroster := jsonb_array_length(v_orphan_rows);

  return jsonb_build_object(
    'sessionId', v_session.id,
    'sessionNumber', v_session.session_number,
    'blockId', v_session.block_id,
    -- Roster completion metrics: numerator rosterSubmittedCount over
    -- rosterSize (= rosterSubmittedCount + missingCount). Off-roster history is
    -- counted SEPARATELY in offRosterCount and never inflates these.
    'rosterSize', v_submitted + v_missing,
    'rosterSubmittedCount', v_submitted,
    'missingCount', v_missing,
    'offRosterCount', v_offroster,
    -- Grand total of all confirmed Intakes shown (roster-submitted + off-roster).
    -- Provided for display only; it is NOT a roster completion rate.
    'submittedCount', v_submitted + v_offroster,
    'intakes', v_roster_rows || v_orphan_rows
  );
end;
$$;

-- 5. Least-privilege execution. No PUBLIC/anon execution; only authenticated.
--    The is_teacher() gate inside the function restricts the effective caller to
--    teachers even though EXECUTE is granted to the authenticated role (the same
--    pattern as get_teacher_session_work_tracks).
revoke all on function public.get_teacher_session_intakes(uuid) from public;
revoke all on function public.get_teacher_session_intakes(uuid) from anon;
grant execute on function public.get_teacher_session_intakes(uuid) to authenticated;

commit;

-- Verification (run read-only after apply; see
-- supabase/scripts/sprint9_r02_teacher_intake_read_audit.sql):
-- 1. Function is SECURITY DEFINER with proconfig search_path=''.
-- 2. EXECUTE is granted to authenticated only; not to public or anon.
-- 3. A non-teacher authenticated caller receives 'Teacher access required'.
-- 4. Roster completion is reported separately from off-roster history:
--    rosterSize = rosterSubmittedCount + missingCount; offRosterCount is counted
--    on its own and never added into rosterSubmittedCount. submittedCount is a
--    display-only grand total (rosterSubmittedCount + offRosterCount).
-- 5. A roster student with no Intake appears with submitted=false and null
--    studentRecord.
-- 6. A confirmed Intake from another Block or another Session never attaches to
--    this Session's rows.
-- 7. A confirmed Intake whose student left the roster still appears with
--    onRoster=false and is not dropped.
-- 8. testing[].baseline_or_expected is present verbatim inside studentRecord.
-- 9. teacherVerification is always {status:'unset', recorded:false}; this table
--    has no writable teacher-judgement field.
--
-- Rollback: drop function public.get_teacher_session_intakes(uuid);
-- No table/policy/row changes to reverse.

-- Sprint 9 R01: server-authoritative per-Block Intake capability.
--
-- Replaces the hardcoded 2B2 eligibility with a trusted per-Block capability
-- column teaching_blocks.intake_mode in ('disabled','deterministic','ai'),
-- default 'disabled'. The capability is resolved server-side and surfaced to the
-- student client through get_my_student_context(); the client can never supply
-- or forge it.
--
-- This migration is ADDITIVE:
--   * adds one column with a CHECK constraint and a safe default;
--   * does NOT enable Intake on any existing Block (every existing row defaults
--     to 'disabled'; 2B2 is NOT auto-promoted — a teacher sets it explicitly);
--   * does NOT widen teaching_blocks.block_code (no new teaching code is
--     confirmed yet; the November Block code remains Joseph's input);
--   * re-creates get_my_student_context() to expose 'intakeMode', and the Intake
--     RPCs to gate on intake_mode instead of block_code = '2B2'. Bodies are
--     otherwise unchanged, preserving enrollment, Session-open, identity and
--     duplicate-submission checks.
--
-- Mode semantics (Block-level capability; separate from Session intake_access):
--   disabled      : the Block runs the existing non-Intake classroom workflow.
--                   No save path accepts a new Intake. Previously confirmed
--                   Intake history remains readable (get_my_session_intake is
--                   NOT gated on mode).
--   deterministic : provider-independent Intake only. The deterministic/chat
--                   save paths accept records; no model calls are authorized
--                   (the AI endpoint requires 'ai').
--   ai            : conversational Intake with deterministic fallback. All save
--                   paths accept records; the AI endpoint is authorized.
--
-- Apply AFTER: 20260903 (foundation), 20260912 (ai save), 20260916 (chat save).

begin;

-- 1. Capability column. Default 'disabled' so no existing Block is enabled.
alter table public.teaching_blocks
  add column if not exists intake_mode text not null default 'disabled';

alter table public.teaching_blocks
  drop constraint if exists teaching_blocks_intake_mode_check;
alter table public.teaching_blocks
  add constraint teaching_blocks_intake_mode_check
  check (intake_mode in ('disabled','deterministic','ai')) not valid;
alter table public.teaching_blocks
  validate constraint teaching_blocks_intake_mode_check;

-- Only teachers may change the capability. teaching_blocks already carries the
-- authorized management policy "teachers manage teaching blocks" (FOR ALL USING
-- is_teacher() WITH CHECK is_teacher()); intake_mode is covered by it. Students
-- and anon have no UPDATE grant on teaching_blocks, so they cannot change it.
-- (No new policy is needed; this comment records the authorization path.)

-- 2. Student context exposes the server-owned capability as 'intakeMode'.
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
    'intakeMode',v_block.intake_mode,
    'projectName',coalesce(v_project.title,v_roster.project_name),'projectProblem',v_project.problem,'projectDescription',v_project.description,
    'projectTargetUsers',v_project.target_users,'projectExpectedOutcomes',v_project.expected_outcomes,'projectCategory',v_project.category,
    'projectDifficulty',v_project.difficulty,'projectSource',case when v_project.id is not null then 'catalogue' when v_roster.project_name is not null then 'roster' else 'none' end,
    'checkinRecognised',v_checkin);
end;
$$;
revoke all on function public.get_my_student_context() from public;
revoke all on function public.get_my_student_context() from anon;
grant execute on function public.get_my_student_context() to authenticated;

-- 3. Chat (adaptive) save: gate on intake_mode in ('deterministic','ai') instead
--    of block_code = '2B2'. All other checks are unchanged from 20260916.
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
    and exists (select 1 from public.teaching_blocks b where b.id=session.block_id and b.intake_mode in ('deterministic','ai'))
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

revoke all on function public.save_my_session_intake_chat(uuid,jsonb,jsonb,jsonb,text,jsonb) from public;
revoke all on function public.save_my_session_intake_chat(uuid,jsonb,jsonb,jsonb,text,jsonb) from anon;
grant execute on function public.save_my_session_intake_chat(uuid,jsonb,jsonb,jsonb,text,jsonb) to authenticated;

-- 4. AI (v1.1) save: require intake_mode = 'ai'. Body otherwise unchanged from
--    20260912 (which previously had no block gate; the AI entry point was gated
--    only client-side and at the endpoint). Adding the server gate here makes
--    the authority consistent.
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
    and exists (select 1 from public.teaching_blocks b where b.id=session.block_id and b.intake_mode = 'ai')
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

revoke all on function public.save_my_session_intake_ai(uuid,jsonb,jsonb,jsonb,text,jsonb) from public;
revoke all on function public.save_my_session_intake_ai(uuid,jsonb,jsonb,jsonb,text,jsonb) from anon;
grant execute on function public.save_my_session_intake_ai(uuid,jsonb,jsonb,jsonb,text,jsonb) to authenticated;

-- 5. Deterministic fallback save: gate on intake_mode in ('deterministic','ai').
--    Body otherwise unchanged from 20260903.
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
    and exists (select 1 from public.teaching_blocks b where b.id=session.block_id and b.intake_mode in ('deterministic','ai'))
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

-- 6. get_my_session_intake is intentionally NOT re-created here. It already does
--    not gate on block_code, so previously confirmed Intake history remains
--    readable regardless of the current intake_mode (including 'disabled').

commit;

-- Verification (read-only; see
-- supabase/scripts/sprint9_r01_block_intake_mode_audit.sql):
-- 1. teaching_blocks.intake_mode exists, default 'disabled', CHECK in
--    (disabled,deterministic,ai).
-- 2. Every existing Block row has intake_mode = 'disabled' (nothing auto-enabled).
-- 3. block_code CHECK is unchanged (no new teaching code added).
-- 4. get_my_student_context returns 'intakeMode' from the active Block.
-- 5. save_my_session_intake_chat and _fallback require intake_mode in
--    (deterministic,ai); save_my_session_intake_ai requires intake_mode = 'ai'.
-- 6. A forged client cannot set intake_mode: students/anon have no UPDATE grant
--    on teaching_blocks; only is_teacher() may update.
-- 7. get_my_session_intake still returns confirmed history under 'disabled'.
--
-- Rollback: the capability column may be kept (inert) or removed with
--   alter table public.teaching_blocks drop column if exists intake_mode;
-- after restoring the previous function bodies. Do not drop the column while a
-- deployed function references it.


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

-- Focused AI review; preserves existing records, privileges and window/mode checks.
-- Apply after AI03. No usage resets or collection configuration changes.
begin;
alter table public.student_session_intakes drop constraint if exists student_session_intakes_schema_version_check;
alter table public.student_session_intakes add constraint student_session_intakes_schema_version_check check(schema_version in ('session-intake.v1.0.0','session-intake.v1.1.0','session-intake.v1.2.0'));
create or replace function public.validate_session_intake_student_record_v12(p_record jsonb)
returns text[] language plpgsql immutable set search_path='' as $$
declare v_errors text[]; v_item jsonb; v_key text;
begin
 v_errors:=public.validate_session_intake_student_record_v11(p_record);
 select coalesce(array_agg(e),'{}'::text[]) into v_errors from unnest(v_errors) e
 where e not in ('available evidence needs a reference and verification method','expected evidence needs a verification method','not-required evidence needs a reason','executed testing needs method and observed result','active or resolved blocker needs a description','next action, due Session and expected evidence are required');
 if jsonb_typeof(p_record->'next_action') is distinct from 'object'
 or jsonb_typeof(p_record#>'{next_action,action}') is distinct from 'string'
 or length(p_record#>>'{next_action,action}')>1000
 or jsonb_typeof(p_record#>'{next_action,expected_evidence}') is distinct from 'string'
 or length(p_record#>>'{next_action,expected_evidence}')>1000
 or coalesce(p_record#>>'{next_action,due_session}','') !~ '^S([1-9]|10)$' then
 v_errors:=array_append(v_errors,'Next-step structure is invalid');end if;
 if jsonb_typeof(p_record->'evidence')='array' then
 for v_item in select * from jsonb_array_elements(p_record->'evidence') loop
 foreach v_key in array array['reference','verification_method','not_required_reason'] loop
 if v_item ? v_key and v_item->v_key <> 'null'::jsonb and (jsonb_typeof(v_item->v_key)<>'string' or length(v_item->>v_key)>case when v_key='not_required_reason' then 500 else 1000 end) then v_errors:=array_append(v_errors,'Evidence text is invalid');end if;
 end loop;end loop;end if;
 if jsonb_typeof(p_record->'testing')='array' then
 for v_item in select * from jsonb_array_elements(p_record->'testing') loop
 foreach v_key in array array['method','observed_result','baseline_or_expected'] loop
 if v_item ? v_key and v_item->v_key <> 'null'::jsonb and (jsonb_typeof(v_item->v_key)<>'string' or length(v_item->>v_key)>1000) then v_errors:=array_append(v_errors,'Testing text is invalid');end if;
 end loop;end loop;end if;
 foreach v_key in array array['description','support_requested'] loop
 if (p_record->'blocker') ? v_key and p_record#>array['blocker',v_key] <> 'null'::jsonb and (jsonb_typeof(p_record#>array['blocker',v_key])<>'string' or length(p_record#>>array['blocker',v_key])>case when v_key='support_requested' then 500 else 1000 end) then v_errors:=array_append(v_errors,'Help text is invalid');end if;
 end loop;
 return v_errors;
end; $$;
revoke all on function public.validate_session_intake_student_record_v12(jsonb) from public,anon,authenticated;

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
    'extraction_status','stop_reason','extracted_record','turn_results','turn_decisions','review_version','debug_events'
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

  v_errors := case when p_ai_assistance->>'review_version'='focused-review.v1' then public.validate_session_intake_student_record_v12(p_student_record) else public.validate_session_intake_student_record_v11(p_student_record) end;
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
     or length(p_ai_assistance::text) > (case when p_ai_assistance->>'review_version'='focused-review.v1' then 384000 else 96000 end) then
    raise exception 'Chat assistance metadata is invalid';
  end if;

  if p_ai_assistance ? 'review_version' and (p_ai_assistance->>'review_version' is distinct from 'focused-review.v1' or jsonb_typeof(p_ai_assistance->'debug_events') is distinct from 'array' or jsonb_array_length(p_ai_assistance->'debug_events')>32 or length((p_ai_assistance->'debug_events')::text)>300000) then
    raise exception 'Focused review debug metadata is invalid';
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
    (case when p_ai_assistance->>'review_version'='focused-review.v1' then 'session-intake.v1.2.0' else 'session-intake.v1.1.0' end) ||
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
    case when p_ai_assistance->>'review_version'='focused-review.v1' then 'session-intake.v1.2.0' else 'session-intake.v1.1.0' end, case when (p_ai_assistance ->> 'used')::boolean then 'ai_assisted' else 'deterministic_fallback' end, p_prompt_version,
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
      'sourceConversation', v_current.source_conversation,
      'aiAssistance', v_current.ai_assistance,
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
revoke all on function public.get_my_session_intake(uuid) from public,anon;
grant execute on function public.get_my_session_intake(uuid) to authenticated;
commit;


-- Allow explicit unknown progress in focused review; preserve legacy validation.
-- Apply after 20261019_sprint10_focused_review.sql. No row updates or permission expansion.
begin;
create or replace function public.validate_session_intake_student_record_v12_known(p_record jsonb)
returns text[] language plpgsql immutable set search_path='' as $$
declare v_errors text[]; v_item jsonb; v_key text;
begin
 v_errors:=public.validate_session_intake_student_record_v11(p_record);
 select coalesce(array_agg(e),'{}'::text[]) into v_errors from unnest(v_errors) e
 where e not in ('available evidence needs a reference and verification method','expected evidence needs a verification method','not-required evidence needs a reason','executed testing needs method and observed result','active or resolved blocker needs a description','next action, due Session and expected evidence are required');
 if jsonb_typeof(p_record->'next_action') is distinct from 'object'
 or jsonb_typeof(p_record#>'{next_action,action}') is distinct from 'string'
 or length(p_record#>>'{next_action,action}')>1000
 or jsonb_typeof(p_record#>'{next_action,expected_evidence}') is distinct from 'string'
 or length(p_record#>>'{next_action,expected_evidence}')>1000
 or coalesce(p_record#>>'{next_action,due_session}','') !~ '^S([1-9]|10)$' then
 v_errors:=array_append(v_errors,'Next-step structure is invalid');end if;
 if jsonb_typeof(p_record->'evidence')='array' then
 for v_item in select * from jsonb_array_elements(p_record->'evidence') loop
 foreach v_key in array array['reference','verification_method','not_required_reason'] loop
 if v_item ? v_key and v_item->v_key <> 'null'::jsonb and (jsonb_typeof(v_item->v_key)<>'string' or length(v_item->>v_key)>case when v_key='not_required_reason' then 500 else 1000 end) then v_errors:=array_append(v_errors,'Evidence text is invalid');end if;
 end loop;end loop;end if;
 if jsonb_typeof(p_record->'testing')='array' then
 for v_item in select * from jsonb_array_elements(p_record->'testing') loop
 foreach v_key in array array['method','observed_result','baseline_or_expected'] loop
 if v_item ? v_key and v_item->v_key <> 'null'::jsonb and (jsonb_typeof(v_item->v_key)<>'string' or length(v_item->>v_key)>1000) then v_errors:=array_append(v_errors,'Testing text is invalid');end if;
 end loop;end loop;end if;
 foreach v_key in array array['description','support_requested'] loop
 if (p_record->'blocker') ? v_key and p_record#>array['blocker',v_key] <> 'null'::jsonb and (jsonb_typeof(p_record#>array['blocker',v_key])<>'string' or length(p_record#>>array['blocker',v_key])>case when v_key='support_requested' then 500 else 1000 end) then v_errors:=array_append(v_errors,'Help text is invalid');end if;
 end loop;
 return v_errors;
end; $$;
revoke all on function public.validate_session_intake_student_record_v12_known(jsonb) from public,anon,authenticated;
create or replace function public.validate_session_intake_student_record_v12(p_record jsonb)
returns text[] language plpgsql immutable set search_path='' as $$
declare v_check jsonb:=p_record; v_i integer;
begin
 if jsonb_typeof(p_record->'claims')='array' and jsonb_array_length(p_record->'claims')>0 then
  for v_i in 0..jsonb_array_length(p_record->'claims')-1 loop
   if p_record#>>array['claims',v_i::text,'progress_kind']='unknown' then
    v_check:=jsonb_set(v_check,array['claims',v_i::text,'progress_kind'],'"advanced"'::jsonb,false);
   end if;
  end loop;
 end if;
 -- Substitute only for validation; the original record is stored unchanged as unknown.
 return public.validate_session_intake_student_record_v12_known(v_check);
end; $$;
revoke all on function public.validate_session_intake_student_record_v12(jsonb) from public,anon,authenticated;
commit;


-- Current class/identity baseline (previously distributed as incremental migrations only).

-- Snapshot of 20261023_sprint10_teaching_classes.sql
-- Independent teaching instances; no historical IDs or records are moved.
begin;
alter table public.teaching_blocks drop constraint if exists teaching_blocks_block_code_check;
alter table public.teaching_blocks add constraint teaching_blocks_block_code_check check(block_code ~ '^[12]B[1-4]$');
alter table public.teaching_blocks add column if not exists course_code text not null default 'NIT3004', add column if not exists class_code text not null default 'C1';
alter table public.teaching_blocks drop constraint if exists teaching_blocks_academic_year_block_code_key;
drop index if exists public.teaching_blocks_single_active_idx;
create unique index if not exists teaching_classes_identity on public.teaching_blocks(course_code,academic_year,block_code,class_code);
alter table public.teaching_blocks drop constraint if exists teaching_classes_codes;
alter table public.teaching_blocks add constraint teaching_classes_codes check(course_code ~ '^[A-Z][A-Z0-9]{2,19}$' and class_code ~ '^[A-Z0-9][A-Z0-9_-]{0,19}$');

create table if not exists public.platform_administrators(user_id uuid primary key references auth.users(id) on delete restrict,created_at timestamptz not null default now());
create table if not exists public.teacher_profiles(user_id uuid primary key references auth.users(id) on delete cascade,display_name text not null check(length(trim(display_name)) between 1 and 100),active boolean not null default true,must_change_password boolean not null default true,created_at timestamptz not null default now());
create table if not exists public.teacher_class_memberships(class_id uuid not null references public.teaching_blocks(id) on delete cascade,user_id uuid not null references public.teacher_profiles(user_id) on delete cascade,primary key(class_id,user_id));
alter table public.platform_administrators enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.teacher_class_memberships enable row level security;
revoke all on public.platform_administrators,public.teacher_profiles,public.teacher_class_memberships from public,anon,authenticated;
grant all on public.platform_administrators,public.teacher_profiles,public.teacher_class_memberships to service_role;

-- Bootstrap only the single pre-existing teacher. Multiple teachers require an
-- explicit administrator UUID in the session; never promote every teacher.
do $$declare v_id uuid; v_count integer; begin
 if not exists(select 1 from public.platform_administrators) then
  v_id:=nullif(current_setting('studio.bootstrap_administrator',true),'')::uuid;
  if v_id is null then
   select count(*),(array_agg(id))[1] into v_count,v_id from auth.users where raw_app_meta_data->>'role'='teacher';
   if v_count<>1 then raise exception 'Set studio.bootstrap_administrator to the existing owner UUID before applying this migration'; end if;
  end if;
  if not exists(select 1 from auth.users where id=v_id) then raise exception 'Administrator account does not exist'; end if;
  insert into public.platform_administrators values(v_id,now());
  insert into public.teacher_profiles(user_id,display_name,must_change_password) values(v_id,'Platform administrator',false) on conflict(user_id) do nothing;
 end if;
end $$;

-- Existing teacher logins remain usable, but receive no automatic class access.
insert into public.teacher_profiles(user_id,display_name,must_change_password)
select id,left(coalesce(nullif(email,''),'Teacher'),100),false from auth.users where raw_app_meta_data->>'role'='teacher'
on conflict(user_id) do nothing;

create or replace function public.is_superadmin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.platform_administrators where user_id=auth.uid())$$;
create or replace function public.is_teacher() returns boolean language sql stable security definer set search_path='' as $$
 select public.is_superadmin() or (coalesce(auth.jwt()->'app_metadata'->>'role','')='teacher' and not exists(select 1 from public.teacher_profiles where user_id=auth.uid() and (not active or must_change_password)))
$$;
create or replace function public.can_manage_teaching_class(p_class_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (public.is_superadmin() or (public.is_teacher() and exists(select 1 from public.teacher_class_memberships m join public.teacher_profiles p on p.user_id=m.user_id where m.class_id=p_class_id and m.user_id=auth.uid() and p.active and not p.must_change_password)))
$$;
create or replace function public.require_teaching_class(p_class_id uuid) returns void language plpgsql stable security definer set search_path='' as $$begin
 if p_class_id is null or not public.can_manage_teaching_class(p_class_id) then raise exception using errcode='42501',message='This class is not assigned to your account'; end if;
end $$;
create or replace function public.require_session_class(p_session_id uuid) returns void language plpgsql stable security definer set search_path='' as $$begin
 perform public.require_teaching_class((select block_id from public.studio_sessions where id=p_session_id));
end $$;
create or replace function public.require_team_class(p_team_id uuid) returns void language plpgsql stable security definer set search_path='' as $$begin
 perform public.require_teaching_class((select block_id from public.teams where id=p_team_id));
end $$;
create or replace function public.require_precheck_class(p_submission_id uuid) returns void language plpgsql stable security definer set search_path='' as $$begin
 perform public.require_teaching_class((select block_id from public.week2_progress_reviews where id=p_submission_id));
end $$;

-- Restrictive policies compose with existing student policies and cannot be
-- bypassed by an older permissive teacher policy.
do $$declare r record; begin
 for r in select c.table_name from information_schema.columns c join pg_class t on t.relname=c.table_name join pg_namespace n on n.oid=t.relnamespace and n.nspname='public' where c.table_schema='public' and c.column_name='block_id' and t.relkind='r' loop
  execute format('drop policy if exists teaching_class_staff_scope on public.%I',r.table_name);
  execute format('create policy teaching_class_staff_scope on public.%I as restrictive to authenticated using (not public.is_teacher() or public.can_manage_teaching_class(block_id)) with check (not public.is_teacher() or public.can_manage_teaching_class(block_id))',r.table_name);
 end loop;
end $$;
-- Disabled/unactivated staff are still staff for scope restrictions.
create or replace function public.is_staff_identity() returns boolean language sql stable security definer set search_path='' as $$ select public.is_superadmin() or coalesce(auth.jwt()->'app_metadata'->>'role','')='teacher' $$;
create or replace function public.can_access_teaching_class(p_class_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select case when public.is_staff_identity() then public.can_manage_teaching_class(p_class_id)
 when auth.uid() is not null then exists(select 1 from public.student_roster r join public.student_accounts a on a.student_id=r.student_id where r.block_id=p_class_id and a.auth_user_id=auth.uid() and a.status<>'disabled')
 else (select count(*) from public.teaching_blocks where status='active')=1 and exists(select 1 from public.teaching_blocks where id=p_class_id and status='active') end
$$;
revoke all on function public.can_access_teaching_class(uuid) from public;
grant execute on function public.can_access_teaching_class(uuid) to anon,authenticated,service_role;
do $$declare r record; begin
 for r in select table_name from information_schema.columns where table_schema='public' and column_name='block_id' loop
  execute format('alter policy teaching_class_staff_scope on public.%I to anon,authenticated using (public.can_access_teaching_class(block_id)) with check (public.can_access_teaching_class(block_id))',r.table_name);
 end loop;
end $$;
drop policy if exists teaching_class_instance_scope on public.teaching_blocks;
create policy teaching_class_instance_scope on public.teaching_blocks as restrictive to anon,authenticated using (public.can_access_teaching_class(id)) with check(public.can_manage_teaching_class(id));
drop policy if exists teaching_class_instance_create on public.teaching_blocks;
create policy teaching_class_instance_create on public.teaching_blocks as restrictive for insert to authenticated with check(public.is_superadmin());
drop policy if exists teaching_class_instance_delete on public.teaching_blocks;
create policy teaching_class_instance_delete on public.teaching_blocks as restrictive for delete to authenticated using(public.is_superadmin());

create or replace function public.can_manage_roster_account(p_student_id text) returns boolean language sql stable security definer set search_path='' as $$select public.is_superadmin() or exists(select 1 from public.student_roster r where r.student_id=p_student_id and public.can_manage_teaching_class(r.block_id))$$;
drop policy if exists teaching_class_account_scope on public.student_accounts;
create policy teaching_class_account_scope on public.student_accounts as restrictive to authenticated using(not public.is_staff_identity() or public.can_manage_roster_account(student_id)) with check(not public.is_staff_identity() or public.can_manage_roster_account(student_id));
-- Team-owned rows do not have a direct block_id.
do $$declare t text; begin foreach t in array array['team_project_assignments','project_proposals','team_posters'] loop
 execute format('drop policy if exists teaching_class_team_scope on public.%I',t);
 execute format('create policy teaching_class_team_scope on public.%I as restrictive to anon,authenticated using(exists(select 1 from public.teams t where t.id=team_id and public.can_access_teaching_class(t.block_id))) with check(exists(select 1 from public.teams t where t.id=team_id and public.can_access_teaching_class(t.block_id)))',t);
end loop;end $$;

create or replace function public.guard_teaching_class_identity() returns trigger language plpgsql set search_path='' as $$begin
 if current_user not in ('postgres','service_role') and not public.is_superadmin() and (new.course_code,new.class_code,new.academic_year,new.block_code,new.status) is distinct from (old.course_code,old.class_code,old.academic_year,old.block_code,old.status) then raise exception using errcode='42501',message='Only an administrator can change class identity or lifecycle';end if;return new;
end $$;
drop trigger if exists guard_teaching_class_identity on public.teaching_blocks;
create trigger guard_teaching_class_identity before update on public.teaching_blocks for each row execute function public.guard_teaching_class_identity();

-- Existing student RPCs require a single active roster context. Reject ambiguity
-- rather than selecting another class with LIMIT 1.
create or replace function public.guard_active_roster_context() returns trigger language plpgsql security definer set search_path='' as $$declare v_ids text[];begin
 perform pg_advisory_xact_lock(hashtext('studio.roster.context'));
 if tg_table_name='student_roster' then
  if exists(select 1 from public.student_roster r join public.teaching_blocks b on b.id=r.block_id join public.teaching_blocks nb on nb.id=new.block_id where r.student_id=new.student_id and r.block_id<>new.block_id and b.status='active' and nb.status='active') then raise exception 'Student already belongs to another active class; transfer the roster membership first';end if;
 else
  if new.status='active' and exists(select 1 from public.student_roster mine join public.student_roster other on other.student_id=mine.student_id and other.block_id<>new.id join public.teaching_blocks b on b.id=other.block_id where mine.block_id=new.id and b.status='active') then raise exception 'Activating this class would give a student multiple active classes';end if;
 end if;return new;
end $$;
drop trigger if exists guard_active_roster_context on public.student_roster;
create trigger guard_active_roster_context before insert or update on public.student_roster for each row execute function public.guard_active_roster_context();
drop trigger if exists guard_active_roster_context on public.teaching_blocks;
create trigger guard_active_roster_context before insert or update on public.teaching_blocks for each row execute function public.guard_active_roster_context();

create or replace function public.current_teaching_block_id() returns uuid language sql stable security definer set search_path='' as $$
 select case when count(*)=1 then (array_agg(b.id))[1] else null end from public.teaching_blocks b where b.status='active' and
 (case when public.is_staff_identity() then public.can_manage_teaching_class(b.id) when auth.uid() is not null then exists(select 1 from public.student_roster r join public.student_accounts a on a.student_id=r.student_id where r.block_id=b.id and a.auth_user_id=auth.uid() and a.status<>'disabled') else true end)
$$;

create or replace function public.get_staff_context() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('isSuperadmin',public.is_superadmin(),'isTeacher',public.is_teacher(),'mustChangePassword',coalesce((select must_change_password from public.teacher_profiles where user_id=auth.uid()),false))
$$;
create or replace function public.get_teacher_administration() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not public.is_superadmin() then raise exception using errcode='42501',message='Administrator access required';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('userId',p.user_id,'name',p.display_name,'email',u.email,'active',p.active,'mustChangePassword',p.must_change_password,'classIds',(select coalesce(jsonb_agg(m.class_id),'[]'::jsonb) from public.teacher_class_memberships m where m.user_id=p.user_id)) order by p.display_name),'[]'::jsonb) from public.teacher_profiles p join auth.users u on u.id=p.user_id where not exists(select 1 from public.platform_administrators a where a.user_id=p.user_id));
end $$;
create or replace function public.set_teacher_classes(p_user_id uuid,p_class_ids uuid[],p_display_name text default null,p_active boolean default true) returns void language plpgsql security definer set search_path='' as $$begin
 if not public.is_superadmin() then raise exception using errcode='42501',message='Administrator access required';end if;
 if exists(select 1 from public.platform_administrators where user_id=p_user_id) then raise exception 'Administrator permissions cannot be changed here';end if;
 if not exists(select 1 from auth.users where id=p_user_id and raw_app_meta_data->>'role'='teacher') then raise exception 'Teacher account does not exist';end if;
 if p_class_ids is null or exists(select 1 from unnest(p_class_ids) id where id is null or not exists(select 1 from public.teaching_blocks b where b.id=id)) then raise exception 'Unknown class';end if;
 insert into public.teacher_profiles(user_id,display_name,active) values(p_user_id,trim(p_display_name),p_active) on conflict(user_id) do update set display_name=coalesce(nullif(trim(p_display_name),''),teacher_profiles.display_name),active=p_active;
 delete from public.teacher_class_memberships where user_id=p_user_id;
 insert into public.teacher_class_memberships(class_id,user_id) select distinct id,p_user_id from unnest(p_class_ids) id;
end $$;

-- Every new helper has explicit grants; internal trigger helpers are not RPCs.
do $$declare n text;begin foreach n in array array['is_superadmin()','is_teacher()','is_staff_identity()','can_manage_teaching_class(uuid)','can_manage_roster_account(text)','require_teaching_class(uuid)','require_session_class(uuid)','require_team_class(uuid)','require_precheck_class(uuid)','get_staff_context()','get_teacher_administration()','set_teacher_classes(uuid,uuid[],text,boolean)'] loop
 execute 'revoke all on function public.'||n||' from public,anon,authenticated';execute 'grant execute on function public.'||n||' to authenticated,service_role';
end loop;end $$;
grant execute on function public.is_teacher(),public.is_staff_identity(),public.is_superadmin(),public.can_manage_teaching_class(uuid),public.can_manage_roster_account(text) to anon;
revoke all on function public.guard_teaching_class_identity(),public.guard_active_roster_context() from public,anon,authenticated;

-- Scoped existing RPC: teacher_reset_week2_precheck
create or replace function public.teacher_reset_week2_precheck(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission public.week2_progress_reviews;
begin
  perform public.require_precheck_class(p_submission_id);
  if not coalesce(public.is_teacher(), false) then
    raise exception using errcode = '42501', message = 'Teacher access is required';
  end if;

  select submission.* into v_submission
  from public.week2_progress_reviews submission
  where submission.id = p_submission_id;

  if v_submission.id is null then
    raise exception using errcode = 'P0002', message = 'Pre-check submission was not found';
  end if;

  delete from public.teacher_progress_reviews review
  where review.block_id = v_submission.block_id
    and lower(trim(review.student_id)) = lower(trim(v_submission.student_id));

  delete from public.week2_progress_reviews submission
  where submission.id = p_submission_id;
end;
$$;

-- Scoped existing RPC: save_presentation_order_draft
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
  perform public.require_teaching_class(p_block_id);
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

-- Scoped existing RPC: get_teacher_poster_gallery
create or replace function public.get_teacher_poster_gallery(p_block_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_published boolean; v_published_at timestamptz;
begin
  perform public.require_teaching_class(p_block_id);
  if not public.is_teacher() then raise exception using errcode='42501', message='Teacher access required'; end if;
  select is_published,published_at into v_published,v_published_at from public.poster_gallery_settings where block_id=p_block_id;
  return jsonb_build_object(
    'isPublished',coalesce(v_published,false),'publishedAt',v_published_at,
    'teams',coalesce((select jsonb_agg(jsonb_build_object(
      'teamId',team.id,'teamName',concat('Team ',team.team_number),'projectName',project.title,
      'draft',case when draft.id is null then null else jsonb_build_object('versionId',draft.id,'originalFilename',draft.original_filename,'mimeType',draft.mime_type,'sizeBytes',draft.size_bytes,'createdAt',draft.created_at) end,
      'publishedVersionId',published.id
    ) order by team.team_number)
    from public.teams team
    left join public.team_project_assignments assignment on assignment.team_id=team.id
    left join public.projects project on project.id=assignment.project_id
    left join public.team_posters poster on poster.block_id=p_block_id and poster.team_id=team.id
    left join public.poster_versions draft on draft.id=poster.draft_version_id and draft.status='ready'
    left join public.poster_versions published on published.id=poster.published_version_id and published.status='ready'
    where team.block_id=p_block_id),'[]'::jsonb)
  );
end;
$$;

-- Scoped existing RPC: publish_poster_gallery
create or replace function public.publish_poster_gallery(p_block_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_teaching_class(p_block_id);
  if not public.is_teacher() then raise exception using errcode='42501', message='Teacher access required'; end if;
  update public.team_posters set published_version_id=draft_version_id
  where block_id=p_block_id;
  insert into public.poster_gallery_settings(block_id,is_published,published_at)
  values(p_block_id,true,now())
  on conflict(block_id) do update set is_published=true,published_at=now();
end;
$$;

-- Scoped existing RPC: hide_poster_gallery
create or replace function public.hide_poster_gallery(p_block_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_teaching_class(p_block_id);
  if not public.is_teacher() then raise exception using errcode='42501', message='Teacher access required'; end if;
  update public.poster_gallery_settings set is_published=false where block_id=p_block_id;
end;
$$;

-- Scoped existing RPC: remove_team_poster_draft
create or replace function public.remove_team_poster_draft(p_team_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_version_id uuid;
begin
  perform public.require_team_class(p_team_id);
  if not public.is_teacher() then raise exception using errcode='42501', message='Teacher access required'; end if;
  select draft_version_id into v_version_id from public.team_posters where team_id=p_team_id;
  update public.team_posters set draft_version_id=null where team_id=p_team_id;
  if v_version_id is not null then
    update public.poster_versions set status='removed',removed_at=now() where id=v_version_id;
  end if;
end;
$$;

-- Scoped existing RPC: get_teacher_session_work_tracks
create or replace function public.get_teacher_session_work_tracks(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_session public.studio_sessions%rowtype;
  v_result jsonb;
begin
  perform public.require_session_class(p_session_id);
  if not public.is_teacher() then
    raise exception using errcode = 'P0001', message = 'Teacher access required';
  end if;

  select * into v_session from public.studio_sessions where id = p_session_id;
  if v_session.id is null then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'studentId', roster.student_id,
    'studentName', coalesce(roster.preferred_name, roster.full_name),
    'teamName', concat('Team ', roster.team_number),
    'checkedInAt', checkin.checked_in_at,
    'response', track.response,
    'updatedAt', track.updated_at,
    'teacherVerifiedCompletion', track.teacher_verified_completion,
    'teacherVerificationStatus', track.teacher_verification_status,
    'teacherVerificationReason', track.teacher_verification_reason,
    'teacherVerifiedAt', track.teacher_verified_at
  ) order by roster.team_number, coalesce(roster.preferred_name, roster.full_name), roster.student_id), '[]'::jsonb)
  into v_result
  from public.student_roster roster
  left join public.student_session_checkins checkin
    on checkin.session_id = v_session.id and checkin.student_id = roster.student_id
  left join public.student_session_work_tracks track
    on track.session_id = v_session.id and track.student_id = roster.student_id
  where roster.block_id = v_session.block_id;

  return v_result;
end;
$$;

-- Scoped existing RPC: verify_teacher_session_work_track
create or replace function public.verify_teacher_session_work_track(
  p_session_id uuid,
  p_student_id text,
  p_verified_completion integer,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_track public.student_session_work_tracks%rowtype;
  v_student_completion integer;
  v_status text;
begin
  perform public.require_session_class(p_session_id);
  if not public.is_teacher() then
    raise exception using errcode = 'P0001', message = 'Teacher access required';
  end if;
  if p_verified_completion is null or p_verified_completion < 0 or p_verified_completion > 100 then
    raise exception using errcode = 'P0001', message = 'Verified completion must be between 0 and 100';
  end if;
  if p_reason is not null and char_length(p_reason) > 300 then
    raise exception using errcode = 'P0001', message = 'Verification reason is too long';
  end if;

  select * into v_track
  from public.student_session_work_tracks
  where session_id = p_session_id and student_id = p_student_id;

  if v_track.id is null then
    raise exception using errcode = 'P0001', message = 'Student Work Track not found';
  end if;

  v_student_completion := case
    when jsonb_typeof(v_track.response -> 'completionPercent') = 'number'
    then (v_track.response ->> 'completionPercent')::numeric::integer
    else null
  end;
  if v_student_completion is null then
    raise exception using errcode = 'P0001', message = 'Student completion measure is not available';
  end if;

  v_status := case when p_verified_completion = v_student_completion then 'confirmed' else 'adjusted' end;
  if v_status = 'adjusted' and coalesce(btrim(p_reason), '') = '' then
    raise exception using errcode = 'P0001', message = 'Choose a reason when adjusting student completion';
  end if;

  update public.student_session_work_tracks
  set teacher_verified_completion = p_verified_completion,
      teacher_verification_status = v_status,
      teacher_verification_reason = nullif(btrim(p_reason), ''),
      teacher_verified_at = now(),
      teacher_verified_by = auth.uid()
  where id = v_track.id
  returning * into v_track;

  return jsonb_build_object(
    'teacherVerifiedCompletion', v_track.teacher_verified_completion,
    'teacherVerificationStatus', v_track.teacher_verification_status,
    'teacherVerificationReason', v_track.teacher_verification_reason,
    'teacherVerifiedAt', v_track.teacher_verified_at
  );
end;
$$;

-- Scoped existing RPC: get_teacher_platform_feedback_status
create or replace function public.get_teacher_platform_feedback_status(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_session public.studio_sessions%rowtype;
  v_result jsonb;
begin
  perform public.require_session_class(p_session_id);
  if not public.is_teacher() then
    raise exception using errcode = 'P0001', message = 'Teacher access required';
  end if;

  select * into v_session from public.studio_sessions where id = p_session_id and session_number = 10;
  if v_session.id is null then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'studentId', roster.student_id,
    'studentName', coalesce(roster.preferred_name, roster.full_name),
    'teamName', concat('Team ', roster.team_number),
    'completedAt', feedback.submitted_at,
    'updatedAt', feedback.updated_at
  ) order by roster.team_number, coalesce(roster.preferred_name, roster.full_name), roster.student_id), '[]'::jsonb)
  into v_result
  from public.student_roster roster
  left join public.student_platform_feedback feedback
    on feedback.session_id = v_session.id and feedback.student_id = roster.student_id
  where roster.block_id = v_session.block_id;

  return v_result;
end;
$$;

-- Scoped existing RPC: save_teacher_progress_review
create or replace function public.save_teacher_progress_review(
  p_submission_id uuid,
  p_review jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_submission public.week2_progress_reviews%rowtype;
  v_saved public.teacher_progress_reviews%rowtype;
  v_actions text[];
  v_recheck_week smallint;
begin
  perform public.require_precheck_class(p_submission_id);
  if auth.uid() is null or not coalesce(public.is_teacher(), false) then
    raise exception using errcode = '42501',
      message = 'Your teacher session is not authorised to save this review. Sign in again and retry.';
  end if;

  select submission.* into v_submission
  from public.week2_progress_reviews submission
  where submission.id = p_submission_id;

  if not found then
    raise exception using errcode = 'P0002',
      message = 'The selected Week 2 Pre-check submission was not found. Refresh the dashboard and retry.';
  end if;

  if v_submission.block_id is null then
    raise exception using errcode = '23514',
      message = 'This Pre-check is not linked to a teaching block. Ask the administrator to repair the submission.';
  end if;

  if nullif(trim(coalesce(v_submission.student_name, '')), '') is null
     or nullif(trim(coalesce(v_submission.student_id, '')), '') is null
     or nullif(trim(coalesce(v_submission.team_name, '')), '') is null then
    raise exception using errcode = '23514',
      message = 'This Pre-check has incomplete student or team identity. Refresh the roster link before saving a review.';
  end if;

  if jsonb_typeof(coalesce(p_review -> 'follow_up_actions', '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'Follow-up actions are invalid.';
  end if;

  select coalesce(array_agg(action), array[]::text[])
  into v_actions
  from jsonb_array_elements_text(coalesce(p_review -> 'follow_up_actions', '[]'::jsonb)) action;

  if cardinality(v_actions) < 1 then
    raise exception using errcode = '22023', message = 'Select at least one follow-up action.';
  end if;

  if nullif(trim(coalesce(p_review ->> 'teacher_feedback', '')), '') is null then
    raise exception using errcode = '22023', message = 'Add a Conversation note before saving.';
  end if;

  if char_length(trim(p_review ->> 'teacher_feedback')) > 800 then
    raise exception using errcode = '22023', message = 'Conversation note must be 800 characters or fewer.';
  end if;

  v_recheck_week := nullif(p_review ->> 'recheck_week', '')::smallint;

  insert into public.teacher_progress_reviews (
    block_id, student_name, student_id, team_name, review_outcome,
    demonstration_outcome, method_explanation, evidence_quality,
    contribution_verification, report_alignment, teacher_feedback,
    follow_up_status, follow_up_actions, follow_up_note, recheck_week
  ) values (
    v_submission.block_id, trim(v_submission.student_name),
    trim(v_submission.student_id), trim(v_submission.team_name),
    p_review ->> 'review_outcome', p_review ->> 'demonstration_outcome',
    p_review ->> 'method_explanation', p_review ->> 'evidence_quality',
    p_review ->> 'contribution_verification', p_review ->> 'report_alignment',
    trim(p_review ->> 'teacher_feedback'), p_review ->> 'follow_up_status',
    v_actions, nullif(trim(coalesce(p_review ->> 'follow_up_note', '')), ''),
    v_recheck_week
  )
  on conflict (block_id, student_id) do update set
    student_name = excluded.student_name,
    team_name = excluded.team_name,
    review_outcome = excluded.review_outcome,
    demonstration_outcome = excluded.demonstration_outcome,
    method_explanation = excluded.method_explanation,
    evidence_quality = excluded.evidence_quality,
    contribution_verification = excluded.contribution_verification,
    report_alignment = excluded.report_alignment,
    teacher_feedback = excluded.teacher_feedback,
    follow_up_status = excluded.follow_up_status,
    follow_up_actions = excluded.follow_up_actions,
    follow_up_note = excluded.follow_up_note,
    recheck_week = excluded.recheck_week
  returning * into v_saved;

  return to_jsonb(v_saved);
end;
$$;

-- Scoped existing RPC: get_teacher_session_intakes
create or replace function public.get_teacher_session_intakes(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_session public.studio_sessions%rowtype;
  v_roster_rows jsonb;
  v_orphan_rows jsonb;
  v_submitted integer;       -- roster students who submitted (roster completion numerator)
  v_missing integer;         -- roster students with no Intake
  v_offroster integer;       -- off-roster confirmed Intakes (history; NOT roster completion)
begin
  perform public.require_session_class(p_session_id);
  -- 1. Explicit, authenticated teacher requirement. No anon/student path.
  if not public.is_teacher() then
    raise exception using errcode = 'P0001', message = 'Teacher access required';
  end if;

  -- 2. Resolve the Block from the selected Session. Unknown Session => empty,
  --    well-formed payload (not an error), matching the work-track convention.
  select * into v_session
  from public.studio_sessions
  where id = p_session_id;

  if v_session.id is null then
    return jsonb_build_object(
      'sessionId', p_session_id,
      'sessionNumber', null,
      'blockId', null,
      'rosterSize', 0,
      'rosterSubmittedCount', 0,
      'missingCount', 0,
      'offRosterCount', 0,
      'submittedCount', 0,
      'intakes', '[]'::jsonb
    );
  end if;

  -- 3. Roster of the Session's Block is the LIST BASE. A left join to the
  --    confirmed Intake for THIS Session and THIS student surfaces missing
  --    submissions (intake fields null). Join key is (session_id, student_id)
  --    scoped to the Session's own block_id, so a row from another Block or
  --    another Session can never attach here.
  select
    coalesce(jsonb_agg(row_json order by team_number, student_label, student_id), '[]'::jsonb),
    coalesce(sum(case when submitted then 1 else 0 end), 0),
    coalesce(sum(case when submitted then 0 else 1 end), 0)
  into v_roster_rows, v_submitted, v_missing
  from (
    select
      roster.team_number as team_number,
      roster.student_id as student_id,
      coalesce(roster.preferred_name, roster.full_name) as student_label,
      (intake.id is not null) as submitted,
      jsonb_build_object(
        'studentId', roster.student_id,
        'studentName', coalesce(roster.preferred_name, roster.full_name),
        'teamName', concat('Team ', roster.team_number),
        'onRoster', true,
        'submitted', (intake.id is not null),
        'intakeId', intake.id,
        'sourceMode', intake.source_mode,
        'confirmedAt', intake.confirmed_at,
        -- Student claim and its sources. Teacher verification is NOT part of
        -- this record and is reported separately as unset (see below).
        'studentRecord', intake.student_record,
        'sourceConversation', intake.source_conversation,
        'corrections', case
          when intake.id is null then null
          else coalesce(intake.student_confirmation -> 'corrections', '[]'::jsonb)
        end,
        'studentAttestation', intake.student_confirmation ->> 'attestation',
        -- Teacher verification lives in no column of this table; always unset.
        'teacherVerification', jsonb_build_object('status', 'unset', 'recorded', false)
      ) as row_json
    from public.student_roster roster
    left join public.student_session_intakes intake
      on intake.session_id = v_session.id
     and intake.block_id = v_session.block_id
     and intake.student_id = roster.student_id
    where roster.block_id = v_session.block_id
  ) roster_base;

  -- 4. Historical preservation. A confirmed Intake whose student is no longer on
  --    the current roster would be dropped by the roster-base join above. We do
  --    NOT silently drop it: collect confirmed intakes for THIS Session whose
  --    student_id has no matching roster row, and append them flagged
  --    onRoster=false. They are counted as submitted.
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'studentId', intake.student_id,
      'studentName', intake.student_id,
      'teamName', null,
      'onRoster', false,
      'submitted', true,
      'intakeId', intake.id,
      'sourceMode', intake.source_mode,
      'confirmedAt', intake.confirmed_at,
      'studentRecord', intake.student_record,
      'sourceConversation', intake.source_conversation,
      'corrections', coalesce(intake.student_confirmation -> 'corrections', '[]'::jsonb),
      'studentAttestation', intake.student_confirmation ->> 'attestation',
      'teacherVerification', jsonb_build_object('status', 'unset', 'recorded', false)
    ) order by intake.confirmed_at), '[]'::jsonb)
  into v_orphan_rows
  from public.student_session_intakes intake
  where intake.session_id = v_session.id
    and intake.block_id = v_session.block_id
    and not exists (
      select 1 from public.student_roster roster
      where roster.block_id = v_session.block_id
        and roster.student_id = intake.student_id
    );

  v_offroster := jsonb_array_length(v_orphan_rows);

  return jsonb_build_object(
    'sessionId', v_session.id,
    'sessionNumber', v_session.session_number,
    'blockId', v_session.block_id,
    -- Roster completion metrics: numerator rosterSubmittedCount over
    -- rosterSize (= rosterSubmittedCount + missingCount). Off-roster history is
    -- counted SEPARATELY in offRosterCount and never inflates these.
    'rosterSize', v_submitted + v_missing,
    'rosterSubmittedCount', v_submitted,
    'missingCount', v_missing,
    'offRosterCount', v_offroster,
    -- Grand total of all confirmed Intakes shown (roster-submitted + off-roster).
    -- Provided for display only; it is NOT a roster completion rate.
    'submittedCount', v_submitted + v_offroster,
    'intakes', v_roster_rows || v_orphan_rows
  );
end;
$$;

-- Scoped existing RPC: get_teacher_session_ai_usage
create or replace function public.get_teacher_session_ai_usage(p_block_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare b public.teaching_blocks%rowtype; v_summary jsonb;
begin
  perform public.require_teaching_class(p_block_id);
 if not public.is_teacher() then raise exception 'Teacher access required'; end if;
 select * into b from public.teaching_blocks where id=p_block_id;
 if b.id is null then raise exception 'Unknown Block'; end if;
 select jsonb_build_object('attempts',count(*),'reportedUsd',coalesce(sum(observed_usd),0),
 'chargedUsd',coalesce(sum(charged_usd),0),'unresolvedAttempts',count(*) filter(where status<>'settled'),
 'reconciliationRequired',coalesce(bool_or(reconciliation_required),false)) into v_summary
 from public.session_intake_ai_usage where block_id=b.id;
 return v_summary||jsonb_build_object('budgetUsd',b.intake_ai_budget_usd,'attemptLimit',b.intake_ai_attempt_limit);
end; $$;

create or replace function public.can_manage_student_credentials(p_class_id uuid,p_student_id text) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_superadmin() or (public.can_manage_teaching_class(p_class_id) and exists(select 1 from public.teaching_blocks where id=p_class_id and status<>'archived') and exists(select 1 from public.student_roster own where own.block_id=p_class_id and own.student_id=p_student_id) and not exists(select 1 from public.student_roster r join public.teaching_blocks b on b.id=r.block_id where r.student_id=p_student_id and r.block_id<>p_class_id and b.status='active'))
$$;
revoke all on function public.can_manage_student_credentials(uuid,text) from public,anon;
grant execute on function public.can_manage_student_credentials(uuid,text) to authenticated,service_role;
create or replace function public.guard_class_parent_links() returns trigger language plpgsql security definer set search_path='' as $$
declare d jsonb:=to_jsonb(new);v_class uuid;v_ref uuid;v_key text;v_team uuid;
begin
 v_class:=(d->>'block_id')::uuid;
 foreach v_key in array array['team_id','session_id','project_id','approved_project_id','draft_version_id','published_version_id'] loop
  if d->>v_key is null then continue;end if;
  if v_key='team_id' then select block_id into v_ref from public.teams where id=(d->>v_key)::uuid;
  elsif v_key='session_id' then select block_id into v_ref from public.studio_sessions where id=(d->>v_key)::uuid;
  elsif v_key in ('draft_version_id','published_version_id') then select block_id,team_id into v_ref,v_team from public.poster_versions where id=(d->>v_key)::uuid;
   if v_team is not null and v_team is distinct from (d->>'team_id')::uuid then raise exception using errcode='23514',message='Poster version must belong to this team';end if;
  else select block_id into v_ref from public.projects where id=(d->>v_key)::uuid;end if;
  if v_ref is not null and v_class is not null and v_ref<>v_class then raise exception using errcode='23514',message='Linked records must belong to the same class';end if;
  v_class:=coalesce(v_class,v_ref);
 end loop;return new;
end $$;
revoke all on function public.guard_class_parent_links() from public,anon,authenticated;
do $$declare t text;begin foreach t in array array['team_project_assignments','project_proposals','team_posters','poster_versions','student_session_checkins','student_session_work_tracks','student_session_intakes','student_platform_feedback','session_intake_ai_usage'] loop
 execute format('drop trigger if exists guard_class_parent_links on public.%I',t);
 execute format('create trigger guard_class_parent_links before insert or update on public.%I for each row execute function public.guard_class_parent_links()',t);
end loop;end $$;

-- Display the enrolled class, without changing student identity lookup.
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
    'blockId',v_block.id,'blockLabel',concat(v_block.course_code,' · ',v_block.academic_year,' · ',v_block.block_code,' · ',v_block.class_code),'teamName',concat('Team ',v_roster.team_number),
    'intakeMode',v_block.intake_mode,
    'projectName',coalesce(v_project.title,v_roster.project_name),'projectProblem',v_project.problem,'projectDescription',v_project.description,
    'projectTargetUsers',v_project.target_users,'projectExpectedOutcomes',v_project.expected_outcomes,'projectCategory',v_project.category,
    'projectDifficulty',v_project.difficulty,'projectSource',case when v_project.id is not null then 'catalogue' when v_roster.project_name is not null then 'roster' else 'none' end,
    'checkinRecognised',v_checkin);
end;
$$;
-- Teachers administer credentials through the checked server endpoint, not a
-- global student_accounts PATCH that could affect another class's enrolment.
drop policy if exists student_account_update_scope on public.student_accounts;
create policy student_account_update_scope on public.student_accounts as restrictive for update to authenticated using(not public.is_staff_identity() or public.is_superadmin()) with check(not public.is_staff_identity() or public.is_superadmin());
create or replace function public.guard_class_ownership() returns trigger language plpgsql security definer set search_path='' as $$
declare before_row jsonb:=to_jsonb(old);after_row jsonb:=to_jsonb(new);a uuid;b uuid;
begin
 if before_row ? 'block_id' and before_row->>'block_id' is distinct from after_row->>'block_id' then raise exception using errcode='23514',message='Existing records cannot be moved between classes';end if;
 if not(before_row ? 'block_id') and before_row ? 'team_id' and before_row->>'team_id' is distinct from after_row->>'team_id' then
  select block_id into a from public.teams where id=(before_row->>'team_id')::uuid;
  select block_id into b from public.teams where id=(after_row->>'team_id')::uuid;
  if a is distinct from b then raise exception using errcode='23514',message='Existing records cannot be moved between classes';end if;
 end if;return new;
end $$;
revoke all on function public.guard_class_ownership() from public,anon,authenticated;
do $$declare r record;t text;begin
 for r in select table_name from information_schema.columns where table_schema='public' and column_name='block_id' loop
  execute format('drop trigger if exists guard_class_ownership on public.%I',r.table_name);
  execute format('create trigger guard_class_ownership before update on public.%I for each row execute function public.guard_class_ownership()',r.table_name);
 end loop;
 foreach t in array array['team_project_assignments','project_proposals','team_posters'] loop
  execute format('drop trigger if exists guard_class_ownership on public.%I',t);
  execute format('create trigger guard_class_ownership before update on public.%I for each row execute function public.guard_class_ownership()',t);
 end loop;
end $$;

commit;


-- Snapshot of 20261023_sprint10_unassigned_roster.sql
-- Apply before deploying the optional-team UI. Existing allocations are retained.
begin;
alter table public.student_roster alter column team_number drop not null;
alter table public.student_roster alter column team_number drop default;
create or replace function public.ensure_roster_team() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.team_number is not null then
  insert into public.teams(block_id,team_number) values(new.block_id,new.team_number)
  on conflict(block_id,team_number) do nothing;
 end if;
 return new;
end; $$;
revoke all on function public.ensure_roster_team() from public,anon,authenticated;
drop trigger if exists ensure_roster_team on public.student_roster;
create trigger ensure_roster_team after insert or update of block_id,team_number on public.student_roster for each row execute function public.ensure_roster_team();
-- Restore missing identities without replacing any team/project/history IDs.
insert into public.teams(block_id,team_number)
select distinct block_id,team_number from public.student_roster where team_number is not null
on conflict(block_id,team_number) do nothing;
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
    'blockId',v_block.id,'blockLabel',concat(v_block.course_code,' · ',v_block.academic_year,' · ',v_block.block_code,' · ',v_block.class_code),'teamAssigned',v_roster.team_number is not null,'teamName',case when v_roster.team_number is null then 'Not assigned' else concat('Team ',v_roster.team_number) end,
    'intakeMode',v_block.intake_mode,
    'projectName',case when v_roster.team_number is not null then coalesce(v_project.title,v_roster.project_name) end,'projectProblem',v_project.problem,'projectDescription',v_project.description,
    'projectTargetUsers',v_project.target_users,'projectExpectedOutcomes',v_project.expected_outcomes,'projectCategory',v_project.category,
    'projectDifficulty',v_project.difficulty,'projectSource',case when v_roster.team_number is null then 'none' when v_project.id is not null then 'catalogue' when v_roster.project_name is not null then 'roster' else 'none' end,
    'checkinRecognised',v_checkin);
end;
$$;
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
    and roster.team_number is not null
  limit 1;

  if v_team_name is null then
    raise exception using
      errcode = 'P0001',
      message = 'Student has no team in this class. Ask your teacher to assign a team first.';
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

create or replace function public.complete_student_activation(p_goal text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts;
  v_roster public.student_roster;
  v_existing_id uuid;
begin
  select * into v_account from public.student_accounts
  where auth_user_id = auth.uid() and status = 'ready' for update;
  if v_account.auth_user_id is null then
    raise exception using errcode = 'P0001', message = 'Account is not ready to activate';
  end if;
  select roster.* into v_roster from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  limit 1;
  if v_roster.id is null then
    raise exception using errcode = 'P0001', message = 'Active roster context is missing';
  end if;

  if v_roster.team_number is null then raise exception 'Student has no team in this class. Ask your teacher to assign a team first.'; end if;

  select id into v_existing_id from public.student_checkins
  where lower(trim(student_id)) = v_account.student_id;
  if v_existing_id is not null then
    update public.student_checkins set auth_user_id = auth.uid()
    where id = v_existing_id and auth_user_id is null;
  else
    if char_length(trim(coalesce(p_goal, ''))) < 3 then
      raise exception using errcode = 'P0001', message = 'A Week 1 recovery goal is required';
    end if;
    insert into public.student_checkins (
      student_id, student_name, team_name, goal, block_id, auth_user_id
    ) values (
      v_account.student_id, coalesce(v_roster.preferred_name, v_roster.full_name),
      concat('Team ', v_roster.team_number), trim(p_goal), v_roster.block_id, auth.uid()
    );
  end if;
  update public.student_accounts
  set status = 'activated', activated_at = now()
  where auth_user_id = auth.uid();
  return public.get_my_student_context();
end;
$$;
revoke all on function public.complete_student_activation(text) from public;
grant execute on function public.complete_student_activation(text) to authenticated;

-- Teacher review lists must label unassigned students, never fabricate "Team ".
do $$
declare signature text;definition text;
begin
 foreach signature in array array['public.get_teacher_session_intakes(uuid)','public.get_teacher_session_work_tracks(uuid)','public.get_teacher_platform_feedback_status(uuid)'] loop
  definition:=pg_get_functiondef(signature::regprocedure);
  if position('then ''Not assigned'' else concat(''Team '', roster.team_number)' in definition)>0 then continue;end if;
  definition:=replace(definition, 'concat(''Team '', roster.team_number)', 'case when roster.team_number is null then ''Not assigned'' else concat(''Team '', roster.team_number) end');
  execute definition;
 end loop;
end $$;
commit;


-- Snapshot of 20261023_sprint10_v2_password_activation.sql
-- Activation is password setup, not a progress/attendance submission.
-- Keep the optional legacy p_goal argument for old clients, but do not record it.
begin;
create or replace function public.complete_student_activation(p_goal text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts;
  v_roster public.student_roster;
  v_existing_id uuid;
begin
  select * into v_account from public.student_accounts
  where auth_user_id = auth.uid() and status = 'ready' for update;
  if v_account.auth_user_id is null then
    raise exception using errcode = 'P0001', message = 'Account is not ready to activate';
  end if;
  select roster.* into v_roster from public.student_roster roster
  join public.teaching_blocks block on block.id = roster.block_id
  where roster.student_id = v_account.student_id and block.status = 'active'
  limit 1;
  if v_roster.id is null then
    raise exception using errcode = 'P0001', message = 'Active roster context is missing';
  end if;

  if v_roster.team_number is null then raise exception 'Student has no team in this class. Ask your teacher to assign a team first.'; end if;

  select id into v_existing_id from public.student_checkins
  where lower(trim(student_id)) = v_account.student_id and block_id = v_roster.block_id;
  if v_existing_id is not null then
    update public.student_checkins set auth_user_id = auth.uid()
    where id = v_existing_id and auth_user_id is null;
  end if;
  update public.student_accounts
  set status = 'activated', activated_at = now()
  where auth_user_id = auth.uid();
  return public.get_my_student_context();
end;
$$;
revoke all on function public.complete_student_activation(text) from public;
grant execute on function public.complete_student_activation(text) to authenticated;

comment on function public.complete_student_activation(text) is 'Activate own ready account; preserve/link existing current-class legacy check-in, without requiring a goal or creating a check-in.';
commit;


-- Snapshot of 20261023_sprint10_w_budget_defaults.sql
begin;
-- Initialize old trial references only on first installation, never on rerun.
do $$begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='teaching_blocks' and column_name='intake_ai_budget_ceiling_usd') then
  alter table public.teaching_blocks add column intake_ai_budget_ceiling_usd numeric(12,6) not null default 25 check(intake_ai_budget_ceiling_usd between 0 and 1000);
  update public.teaching_blocks b set intake_ai_budget_usd=10
  where b.intake_ai_budget_usd in (0,1) and not exists(select 1 from public.session_intake_ai_usage u where u.block_id=b.id);
  update public.teaching_blocks set intake_ai_budget_ceiling_usd=greatest(intake_ai_budget_ceiling_usd,intake_ai_budget_usd);
 end if;
end $$;
alter table public.teaching_blocks alter column intake_ai_budget_usd set default 10;
create or replace function public.guard_class_ai_budget() returns trigger language plpgsql set search_path='' as $$begin
 if current_user not in ('postgres','service_role') and not public.is_superadmin() then
  if tg_op='INSERT' then
   if new.intake_ai_budget_ceiling_usd<>25 then raise exception using errcode='42501',message='Only a super administrator can change the AI budget ceiling';end if;
  elsif new.intake_ai_budget_ceiling_usd is distinct from old.intake_ai_budget_ceiling_usd then raise exception using errcode='42501',message='Only a super administrator can change the AI budget ceiling';end if;
 end if;
 if new.intake_ai_budget_usd>new.intake_ai_budget_ceiling_usd then raise exception using errcode='23514',message='Budget exceeds the administrator ceiling';end if;
 return new;
end $$;
revoke all on function public.guard_class_ai_budget() from public,anon,authenticated;
drop trigger if exists guard_class_ai_budget on public.teaching_blocks;
create trigger guard_class_ai_budget before insert or update on public.teaching_blocks for each row execute function public.guard_class_ai_budget();
create or replace function public.get_teacher_session_ai_usage(p_block_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare b public.teaching_blocks%rowtype; v_summary jsonb;
begin
  perform public.require_teaching_class(p_block_id);
 if not public.is_teacher() then raise exception 'Teacher access required'; end if;
 select * into b from public.teaching_blocks where id=p_block_id;
 if b.id is null then raise exception 'Unknown Block'; end if;
 select jsonb_build_object('attempts',count(*),'reportedUsd',coalesce(sum(observed_usd),0),
 'chargedUsd',coalesce(sum(charged_usd),0),'unresolvedAttempts',count(*) filter(where status<>'settled'),
 'reconciliationRequired',coalesce(bool_or(reconciliation_required),false)) into v_summary
 from public.session_intake_ai_usage where block_id=b.id;
 return v_summary||jsonb_build_object('budgetUsd',b.intake_ai_budget_usd,'attemptLimit',b.intake_ai_attempt_limit,'budgetCeilingUsd',b.intake_ai_budget_ceiling_usd,'canManageBudgetCeiling',public.is_superadmin(),'rosterSize',(select count(*) from public.student_roster where block_id=b.id));
end; $$;

commit;


-- Snapshot of 20261101_sprint11_shared_project_library.sql
-- Shared project definitions; class-owned assignments and evidence remain in place.
-- Apply after all Sprint 10 class/roster migrations. Transactional and repeatable.
begin;
-- Remove the class boundary from project definitions, retaining origin as metadata.
drop policy if exists teaching_class_staff_scope on public.projects;
drop policy if exists "teachers manage projects" on public.projects;
drop trigger if exists guard_class_ownership on public.projects;
do $$ begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='projects' and column_name='block_id') then
  alter table public.projects rename column block_id to legacy_block_id;
 end if;
end $$;
alter table public.projects alter column legacy_block_id drop not null;
alter table public.projects drop constraint if exists projects_block_id_fkey;
alter table public.projects drop constraint if exists projects_legacy_block_id_fkey;
alter table public.projects add constraint projects_legacy_block_id_fkey foreign key(legacy_block_id) references public.teaching_blocks(id) on delete set null;
alter table public.projects drop constraint if exists projects_block_id_title_key;
alter table public.projects add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.projects alter column created_by set default auth.uid();
alter table public.projects add column if not exists legacy_status text;
-- Old records have no reliable author. Only administrators maintain them until
-- ownership is explicitly assigned; never infer authorship from class membership.
update public.projects set legacy_status=status where legacy_status is null and status in ('draft','published');
alter table public.projects drop constraint if exists projects_status_check;
update public.projects set status=case when status='published' then 'active' when status='draft' then 'archived' else status end where status in ('draft','published');
alter table public.projects alter column status set default 'active';
alter table public.projects add constraint projects_status_check check(status in ('active','archived'));
drop index if exists public.projects_block_status_idx;
create index if not exists projects_library_status_title_idx on public.projects(status,title);

create or replace function public.can_read_project_library() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (public.is_superadmin() or (
 public.is_teacher() and exists(select 1 from public.teacher_profiles p where p.user_id=auth.uid() and p.active and not p.must_change_password)
 and exists(select 1 from public.teacher_class_memberships m where m.user_id=auth.uid())))
$$;
revoke all on function public.can_read_project_library() from public,anon;
grant execute on function public.can_read_project_library() to authenticated,service_role;
revoke all on public.projects from anon,authenticated;
grant select,insert,update on public.projects to authenticated;
-- No project deletion endpoint: archive preserves all existing references.
drop policy if exists project_library_read on public.projects;
create policy project_library_read on public.projects for select to authenticated using(public.can_read_project_library());
drop policy if exists project_library_create on public.projects;
create policy project_library_create on public.projects for insert to authenticated with check(public.can_read_project_library() and created_by=auth.uid() and legacy_block_id is null and legacy_status is null);
drop policy if exists project_library_edit on public.projects;
create policy project_library_edit on public.projects for update to authenticated using(public.can_read_project_library() and (public.is_superadmin() or created_by=auth.uid())) with check(public.can_read_project_library() and (public.is_superadmin() or created_by=auth.uid()));

-- Projects are reusable; all other parent links must still share one class.

create or replace function public.guard_class_parent_links() returns trigger language plpgsql security definer set search_path='' as $$
declare d jsonb:=to_jsonb(new);v_class uuid;v_ref uuid;v_key text;v_team uuid;
begin
 v_class:=(d->>'block_id')::uuid;
 foreach v_key in array array['team_id','session_id','project_id','approved_project_id','draft_version_id','published_version_id'] loop
  if d->>v_key is null then continue;end if;
  if v_key='team_id' then select block_id into v_ref from public.teams where id=(d->>v_key)::uuid;
  elsif v_key='session_id' then select block_id into v_ref from public.studio_sessions where id=(d->>v_key)::uuid;
  elsif v_key in ('draft_version_id','published_version_id') then select block_id,team_id into v_ref,v_team from public.poster_versions where id=(d->>v_key)::uuid;
   if v_team is not null and v_team is distinct from (d->>'team_id')::uuid then raise exception using errcode='23514',message='Poster version must belong to this team';end if;
  else continue; -- project_id/approved_project_id reference the shared library
  end if;
  if v_ref is not null and v_class is not null and v_ref<>v_class then raise exception using errcode='23514',message='Linked records must belong to the same class';end if;
  v_class:=coalesce(v_class,v_ref);
 end loop;return new;
end $$;


alter table public.team_project_assignments add column if not exists predecessor_assignment_id uuid references public.team_project_assignments(id) on delete restrict;
create index if not exists team_project_predecessor_idx on public.team_project_assignments(predecessor_assignment_id);
create or replace function public.guard_project_assignment() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_status text; v_previous public.team_project_assignments; v_source_course text; v_target_course text;
begin
 if tg_op='UPDATE' and (new.project_id,new.team_id,new.predecessor_assignment_id) is distinct from (old.project_id,old.team_id,old.predecessor_assignment_id)
 and exists(select 1 from public.team_project_assignments where predecessor_assignment_id=old.id) then
  raise exception using errcode='23514',message='This assignment is referenced by a continuing project; keep its project and source link unchanged';
 end if;
 if tg_op='INSERT' or new.project_id is distinct from old.project_id or new.team_id is distinct from old.team_id then
  select status into v_status from public.projects where id=new.project_id for share;
  if v_status is distinct from 'active' then raise exception using errcode='23514',message='Only active library projects can receive new assignments';end if;
 end if;
 if new.predecessor_assignment_id is not null and (tg_op='INSERT' or (new.predecessor_assignment_id,new.project_id,new.team_id) is distinct from (old.predecessor_assignment_id,old.project_id,old.team_id)) then
  select * into v_previous from public.team_project_assignments where id=new.predecessor_assignment_id for share;
  if v_previous.id is null or v_previous.id=new.id or v_previous.project_id<>new.project_id then raise exception using errcode='23514',message='Continuation must reference an existing assignment of the same project';end if;
  perform public.require_team_class(new.team_id);
  perform public.require_team_class(v_previous.team_id);
  select b.course_code into v_source_course from public.teams t join public.teaching_blocks b on b.id=t.block_id where t.id=v_previous.team_id;
  select b.course_code into v_target_course from public.teams t join public.teaching_blocks b on b.id=t.block_id where t.id=new.team_id;
  if v_source_course<>'NIT3003' or v_target_course<>'NIT3004' then raise exception using errcode='23514',message='Continuation links must run from NIT3003 to NIT3004';end if;
 end if;
 if new.predecessor_assignment_id is not null then new.continued_from_previous_unit:=true;
 elsif tg_op='INSERT' or old.predecessor_assignment_id is not null or new.project_id is distinct from old.project_id then new.continued_from_previous_unit:=false;end if;
 if new.predecessor_assignment_id is not null then new.origin_unit:='NIT3003';end if;
 return new;
end $$;
revoke all on function public.guard_project_assignment() from public,anon,authenticated;
drop trigger if exists guard_project_assignment on public.team_project_assignments;
create trigger guard_project_assignment before insert or update on public.team_project_assignments for each row execute function public.guard_project_assignment();

-- Legacy project-selection RPC names remain compatible, now bound to the
-- authenticated activated student and their unique active class.
create or replace function public.require_project_student(p_student_id text) returns uuid
language plpgsql stable security definer set search_path='' as $$
declare v_class uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.student_accounts a where a.auth_user_id=auth.uid() and a.status='activated' and a.student_id=lower(trim(p_student_id))) then raise exception using errcode='42501',message='Activated student access required';end if;
 v_class:=public.current_teaching_block_id();
 if v_class is null then raise exception using errcode='42501',message='A single active enrolled class is required';end if;
 return v_class;
end $$;
revoke all on function public.require_project_student(text) from public,anon;
grant execute on function public.require_project_student(text) to authenticated;

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
  select * into v_block from public.teaching_blocks where id=public.require_project_student(p_student_id);

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
      where project.status = 'active' and v_block.project_setup_mode='student_selection'
    ), '[]'::jsonb)
  );
end;
$$;

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
  select * into v_block from public.teaching_blocks where id=public.require_project_student(p_student_id) for share;

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
      and status = 'active'
  ) then
    raise exception using errcode = 'P0001',
      message = 'That project is not active in the project library';
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
  select * into v_block from public.teaching_blocks where id=public.require_project_student(p_student_id);

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


revoke all on function public.get_project_checkin_context(text),public.select_team_project(text,uuid),public.submit_team_project_proposal(text,text,text,text,text,text,text) from public,anon;
grant execute on function public.get_project_checkin_context(text),public.select_team_project(text,uuid),public.submit_team_project_proposal(text,text,text,text,text,text,text) to authenticated;
commit;

-- Snapshot of 20261101_sprint11_student_id_enrolment.sql
-- Exact-ID lookup and explicit enrolment; no account/password/history changes.
begin;
create or replace function public.lookup_student_for_enrolment(p_class_id uuid,p_student_id text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_id text:=lower(trim(p_student_id));v_target public.teaching_blocks;v_account text;v_candidates jsonb;v_conflict boolean;
begin
 perform public.require_teaching_class(p_class_id);
 if v_id is null or char_length(v_id) not between 3 and 40 then raise exception using errcode='22023',message='Enter a complete Student ID (3–40 characters)';end if;
 select * into v_target from public.teaching_blocks where id=p_class_id;
 if v_target.id is null then raise exception using errcode='P0002',message='Class was not found';end if;
 if v_target.status='archived' then raise exception using errcode='23514',message='Students cannot be enrolled into an archived class';end if;
 select status into v_account from public.student_accounts where student_id=v_id;
 if exists(select 1 from public.student_roster where block_id=p_class_id and student_id=v_id) then
  return jsonb_build_object('status','already_enrolled','studentId',v_id,'accountStatus',v_account,'candidates','[]'::jsonb);
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('rosterId',r.id,'fullName',r.full_name,'preferredName',r.preferred_name,'email',r.vu_email,'sourceClass',concat(b.course_code,' · ',b.academic_year,' · ',b.block_code,' · ',b.class_code),'classStatus',b.status) order by b.academic_year desc,b.starts_on desc nulls last,r.updated_at desc,r.id),'[]'::jsonb)
 into v_candidates from public.student_roster r join public.teaching_blocks b on b.id=r.block_id where r.student_id=v_id;
 select exists(select 1 from public.student_roster r join public.teaching_blocks b on b.id=r.block_id where r.student_id=v_id and r.block_id<>p_class_id and b.status='active') into v_conflict;
 return jsonb_build_object('status',case when v_conflict then 'active_class_conflict' when jsonb_array_length(v_candidates)>0 then 'found' else 'not_found' end,'studentId',v_id,'accountStatus',v_account,'candidates',v_candidates);
end $$;

create or replace function public.enrol_existing_student(p_class_id uuid,p_student_id text,p_source_roster_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id text:=lower(trim(p_student_id));v_source public.student_roster;v_status text;v_roster_id uuid;v_account text;
begin
 perform public.require_teaching_class(p_class_id);
 if v_id is null or char_length(v_id) not between 3 and 40 then raise exception using errcode='22023',message='Enter a complete Student ID';end if;
 -- Same lock as guard_active_roster_context, so class activation/imports and
 -- enrolment cannot silently create ambiguous active contexts.
 perform pg_advisory_xact_lock(hashtext('studio.roster.context'));
 select status into v_status from public.teaching_blocks where id=p_class_id for share;
 if v_status is null then raise exception using errcode='P0002',message='Class was not found';end if;
 if v_status='archived' then raise exception using errcode='23514',message='Students cannot be enrolled into an archived class';end if;
 select id into v_roster_id from public.student_roster where block_id=p_class_id and student_id=v_id;
 if v_roster_id is not null then return jsonb_build_object('status','already_enrolled','studentId',v_id);end if;
 if exists(select 1 from public.student_roster r join public.teaching_blocks b on b.id=r.block_id where r.student_id=v_id and r.block_id<>p_class_id and b.status='active') then
  return jsonb_build_object('status','active_class_conflict','studentId',v_id);
 end if;
 select * into v_source from public.student_roster where id=p_source_roster_id and student_id=v_id for share;
 if v_source.id is null then raise exception using errcode='22023',message='The selected student record is no longer available. Search again';end if;
 insert into public.student_roster(block_id,student_id,full_name,preferred_name,vu_email,team_number,project_name)
 values(p_class_id,v_id,v_source.full_name,v_source.preferred_name,v_source.vu_email,null,null) returning id into v_roster_id;
 select status into v_account from public.student_accounts where student_id=v_id;
 return jsonb_build_object('status','enrolled','studentId',v_id,'rosterId',v_roster_id,'accountStatus',v_account);
end $$;
revoke all on function public.lookup_student_for_enrolment(uuid,text),public.enrol_existing_student(uuid,text,uuid) from public,anon;
grant execute on function public.lookup_student_for_enrolment(uuid,text),public.enrol_existing_student(uuid,text,uuid) to authenticated;
notify pgrst,'reload schema';
commit;

-- Sprint 11: expanded team numbering (incremental migration below).
-- Expand team numbering without changing IDs, allocations or access rules.
-- Apply before deploying the new roster UI. Keep the existing smallint storage
-- (1..32767); NULL still means Unassigned in student_roster.
begin;
alter table public.student_roster drop constraint if exists student_roster_team_number_check;
alter table public.student_roster add constraint student_roster_team_number_check check (team_number >= 1);
alter table public.teams drop constraint if exists teams_team_number_check;
alter table public.teams add constraint teams_team_number_check check (team_number >= 1);

-- Old activity tables also validate the display label. Preserve each complete
-- constraint and replace only the obsolete Team 1..8 expression.
do $$
declare item record; definition text;
begin
 for item in
  select c.conrelid::regclass as relation,c.conname,pg_get_constraintdef(c.oid) as definition
  from pg_constraint c join pg_namespace n on n.oid=c.connamespace
  where n.nspname='public' and c.contype='c'
    and position('^Team [1-8]$' in pg_get_constraintdef(c.oid))>0
 loop
  definition:=replace(item.definition,'^Team [1-8]$','^Team [1-9][0-9]*$');
  execute format('alter table %s drop constraint %I',item.relation,item.conname);
  execute format('alter table %s add constraint %I %s',item.relation,item.conname,definition);
 end loop;
 -- Preserve roles, command, USING and WITH CHECK; change only label validation.
 for item in select * from pg_policies where schemaname='public'
  and (position('^Team [1-8]$' in coalesce(qual,''))>0 or position('^Team [1-8]$' in coalesce(with_check,''))>0)
 loop
  definition:=format('alter policy %I on %I.%I',item.policyname,item.schemaname,item.tablename);
  if item.qual is not null then definition:=definition||' using ('||replace(item.qual,'^Team [1-8]$','^Team [1-9][0-9]*$')||')';end if;
  if item.with_check is not null then definition:=definition||' with check ('||replace(item.with_check,'^Team [1-8]$','^Team [1-9][0-9]*$')||')';end if;
  execute definition;
 end loop;
end $$;
notify pgrst,'reload schema';
commit;


-- Read-only, superadmin-only export. Apply before deploying the export button.
begin;
create or replace function public.export_intake_diagnostics(
 p_class_id uuid,p_session_id uuid default null,p_after_id uuid default null,p_as_of timestamptz default null
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_as_of timestamptz:=coalesce(p_as_of,statement_timestamp());v_rows jsonb;v_last uuid;v_count integer;
begin
 if not public.is_superadmin() then raise exception using errcode='42501',message='Only a platform administrator can export Intake diagnostics';end if;
 if p_class_id is null or not exists(select 1 from public.teaching_blocks where id=p_class_id) then raise exception 'Class not found';end if;
 if p_session_id is not null and not exists(select 1 from public.studio_sessions where id=p_session_id and block_id=p_class_id) then raise exception 'Session does not belong to this class';end if;
 if v_as_of>statement_timestamp() then raise exception 'Export timestamp cannot be in the future';end if;
 with page as (
  select i.*,s.session_number,s.title as session_title,s.session_date,r.full_name,r.team_number
  from public.student_session_intakes i
  join public.studio_sessions s on s.id=i.session_id and s.block_id=i.block_id
  left join public.student_roster r on r.block_id=i.block_id and r.student_id=i.student_id
  where i.block_id=p_class_id and (p_session_id is null or i.session_id=p_session_id)
   and (p_after_id is null or i.id>p_after_id)
   and i.confirmed_at<=v_as_of and i.created_at<=v_as_of
   and i.student_confirmation->>'status'='confirmed'
  order by i.id limit 25
 )
 select coalesce(jsonb_agg(jsonb_build_object(
  'intakeId',id,'studentId',student_id,'studentName',full_name,'currentTeamNumber',team_number,
  'sessionId',session_id,'sessionNumber',session_number,'sessionTitle',session_title,'sessionDate',session_date,
  'confirmedAt',confirmed_at,'sourceMode',source_mode,'schemaVersion',schema_version,
  'promptVersion',prompt_version,'testSuiteVersion',test_suite_version,
  'conversation',source_conversation,'studentRecord',student_record,
  'studentConfirmation',student_confirmation,'aiAssistance',ai_assistance
 ) order by id),'[]'::jsonb),count(*),(array_agg(id order by id desc))[1]
 into v_rows,v_count,v_last from page;
 return jsonb_build_object('formatVersion','intake-diagnostics.v1','asOf',v_as_of,
  'class',(select jsonb_build_object('id',id,'courseCode',course_code,'academicYear',academic_year,'blockCode',block_code,'classCode',class_code) from public.teaching_blocks where id=p_class_id),
  'sessionId',p_session_id,'records',v_rows,'nextCursor',case when v_count=25 then v_last else null end);
end $$;
revoke all on function public.export_intake_diagnostics(uuid,uuid,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.export_intake_diagnostics(uuid,uuid,uuid,timestamptz) to authenticated;
notify pgrst,'reload schema';
commit;


-- Reopen one confirmed summary for its own student; no AI calls or session reopening.
begin;
alter table public.student_session_intakes add column if not exists summary_revision integer not null default 1;
alter table public.student_session_intakes add column if not exists correction_opened_at timestamptz;
alter table public.student_session_intakes add column if not exists correction_opened_by uuid references auth.users(id) on delete restrict;
create table if not exists public.intake_summary_corrections(
 intake_id uuid not null references public.student_session_intakes(id) on delete restrict,
 revision integer not null,opened_by uuid not null references auth.users(id) on delete restrict,
 opened_at timestamptz not null default now(),reconfirmed_at timestamptz,
 before_record jsonb not null,before_confirmation jsonb not null,before_confirmed_at timestamptz not null,
 before_hash text not null,after_record jsonb,after_confirmation jsonb,
 primary key(intake_id,revision)
);
alter table public.intake_summary_corrections enable row level security;
revoke all on public.intake_summary_corrections from public,anon,authenticated;
-- Internal helper, never directly callable by clients. Wrappers first authorize scope.
create or replace function public.intake_summary_correction_info(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('summaryRevision',i.summary_revision,'correctionOpenedAt',i.correction_opened_at,
 'correctionHistory',(select coalesce(jsonb_agg(jsonb_build_object('revision',c.revision,'openedByName',(select p.display_name from public.teacher_profiles p where p.user_id=c.opened_by),
 'openedAt',c.opened_at,'reconfirmedAt',c.reconfirmed_at,'beforeRecord',c.before_record,
 'afterRecord',c.after_record) order by c.revision),'[]'::jsonb) from public.intake_summary_corrections c where c.intake_id=i.id))
 from public.student_session_intakes i where i.id=p_id
$$;
revoke all on function public.intake_summary_correction_info(uuid) from public,anon,authenticated;
create or replace function public.reopen_intake_summary(p_intake_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i public.student_session_intakes%rowtype;
begin
 select * into i from public.student_session_intakes where id=p_intake_id for update;
 if not found then raise exception 'Intake not found';end if;
 perform public.require_teaching_class(i.block_id);
 if not exists(select 1 from public.student_roster r join public.student_accounts a on a.student_id=r.student_id
 where r.block_id=i.block_id and r.student_id=i.student_id and a.auth_user_id=i.auth_user_id and a.status='activated') then raise exception 'Student must still be enrolled with an activated account';end if;
 if i.correction_opened_at is null then
  insert into public.intake_summary_corrections(intake_id,revision,opened_by,before_record,before_confirmation,before_confirmed_at,before_hash)
  values(i.id,i.summary_revision,auth.uid(),i.student_record,i.student_confirmation,i.confirmed_at,i.confirmed_payload_hash);
  update public.student_session_intakes set correction_opened_at=now(),correction_opened_by=auth.uid() where id=i.id;
 end if;
 return public.intake_summary_correction_info(i.id);
end $$;
revoke all on function public.reopen_intake_summary(uuid) from public,anon,authenticated;
grant execute on function public.reopen_intake_summary(uuid) to authenticated;
create or replace function public.reconfirm_my_intake_summary(p_intake_id uuid,p_revision integer,p_student_record jsonb,p_attestation text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare i public.student_session_intakes%rowtype;errors text[];confirmation jsonb;changes jsonb;
begin
 select * into i from public.student_session_intakes where id=p_intake_id and auth_user_id=auth.uid() for update;
 if not found or not exists(select 1 from public.student_accounts a join public.student_roster r on r.student_id=a.student_id
 where a.auth_user_id=auth.uid() and a.student_id=i.student_id and a.status='activated' and r.block_id=i.block_id) then raise exception using errcode='42501',message='Your Intake is not available';end if;
 if i.correction_opened_at is null or p_revision is distinct from i.summary_revision then raise exception 'Summary is locked or has changed. Reload before editing';end if;
 if p_attestation is distinct from 'This summary reflects what I am claiming and the evidence I have identified. Teacher verification is separate.' then raise exception 'Student confirmation is required';end if;
 if p_student_record is null or length(p_student_record::text)>48000 then raise exception 'Summary is too large or missing';end if;
 errors:=public.validate_session_intake_student_record_v12(p_student_record);
 if cardinality(errors)>0 then raise exception 'Invalid summary: %',array_to_string(errors,'; ');end if;
 select coalesce(jsonb_agg(jsonb_build_object('field',key,'before',i.student_record->key,'after',value)),'[]'::jsonb) into changes
 from jsonb_each(p_student_record) where value is distinct from i.student_record->key;
 confirmation:=jsonb_build_object('status','confirmed','attestation',p_attestation,'summary',p_student_record,'corrections',changes,'revision',i.summary_revision+1);
 update public.intake_summary_corrections set reconfirmed_at=now(),after_record=p_student_record,after_confirmation=confirmation where intake_id=i.id and revision=i.summary_revision;
 update public.student_session_intakes set student_record=p_student_record,student_confirmation=confirmation,
 confirmed_at=now(),schema_version='session-intake.v1.2.0',summary_revision=summary_revision+1,
 correction_opened_at=null,correction_opened_by=null,
 confirmed_payload_hash=md5('session-intake.v1.2.0'||session_id::text||auth_user_id::text||source_conversation::text||p_student_record::text||confirmation::text||ai_assistance::text)
 where id=i.id;
 return public.intake_summary_correction_info(i.id);
end $$;
revoke all on function public.reconfirm_my_intake_summary(uuid,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.reconfirm_my_intake_summary(uuid,integer,jsonb,text) to authenticated;

-- Preserve the existing read authorization and payload; append correction state.
do $$ begin
 if to_regprocedure('public.get_my_session_intake_before_corrections(uuid)') is null then alter function public.get_my_session_intake(uuid) rename to get_my_session_intake_before_corrections;end if;
 if to_regprocedure('public.get_teacher_session_intakes_before_corrections(uuid)') is null then alter function public.get_teacher_session_intakes(uuid) rename to get_teacher_session_intakes_before_corrections;end if;
end $$;
revoke all on function public.get_my_session_intake_before_corrections(uuid),public.get_teacher_session_intakes_before_corrections(uuid) from public,anon,authenticated;
create or replace function public.get_my_session_intake(p_session_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare payload jsonb;info jsonb;
begin
 payload:=public.get_my_session_intake_before_corrections(p_session_id);
 if payload->'confirmedRecord'<>'null'::jsonb then
  info:=public.intake_summary_correction_info((payload#>>'{confirmedRecord,intakeId}')::uuid);
  payload:=jsonb_set(payload,'{confirmedRecord}',(payload->'confirmedRecord')||info);
 end if;
 return payload;
end $$;
create or replace function public.get_teacher_session_intakes(p_session_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare payload jsonb;rows jsonb;
begin
 payload:=public.get_teacher_session_intakes_before_corrections(p_session_id);
 select coalesce(jsonb_agg(case when value->>'intakeId' is not null then value||public.intake_summary_correction_info((value->>'intakeId')::uuid) else value end order by ord),'[]'::jsonb)
 into rows from jsonb_array_elements(payload->'intakes') with ordinality e(value,ord);
 return jsonb_set(payload,'{intakes}',rows);
end $$;
revoke all on function public.get_my_session_intake(uuid),public.get_teacher_session_intakes(uuid) from public,anon,authenticated;
grant execute on function public.get_my_session_intake(uuid),public.get_teacher_session_intakes(uuid) to authenticated;
-- Keep correction lineage alongside the existing administrator diagnostics export.
do $$ declare definition text;begin
 if to_regprocedure('public.export_intake_diagnostics(uuid,uuid,uuid,timestamptz)') is not null then
  definition:=pg_get_functiondef('public.export_intake_diagnostics(uuid,uuid,uuid,timestamptz)'::regprocedure);
  if position('summaryCorrection' in definition)=0 then
   if position('''aiAssistance'',ai_assistance' in definition)=0 then raise exception 'Export definition changed; review correction metadata integration';end if;
   definition:=replace(definition,'''aiAssistance'',ai_assistance','''aiAssistance'',ai_assistance,''summaryCorrection'',public.intake_summary_correction_info(id)');
   execute definition;
  end if;
 end if;
end $$;
notify pgrst,'reload schema';
commit;

-- Existing administrators can teach without creating a second Auth identity.
create or replace function public.get_teacher_administration() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not public.is_superadmin() then raise exception using errcode='42501',message='Administrator access required';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object(
 'userId',u.id,'name',coalesce(nullif(p.display_name,''),u.email),'email',u.email,
 'isSuperadmin',a.user_id is not null,'active',case when a.user_id is not null then true else p.active end,
 'mustChangePassword',case when a.user_id is not null then false else p.must_change_password end,
 'classIds',(select coalesce(jsonb_agg(m.class_id),'[]'::jsonb) from public.teacher_class_memberships m where m.user_id=u.id)) order by coalesce(p.display_name,u.email)),'[]'::jsonb)
 from auth.users u left join public.teacher_profiles p on p.user_id=u.id
 left join public.platform_administrators a on a.user_id=u.id
 where p.user_id is not null or a.user_id is not null);
end $$;

-- Membership only: never changes roles, profiles, passwords or other classes.
create or replace function public.set_teacher_class_membership(p_user_id uuid,p_class_id uuid,p_assigned boolean) returns void language plpgsql security definer set search_path='' as $$begin
 if not public.is_superadmin() then raise exception using errcode='42501',message='Administrator access required';end if;
 if p_assigned is null then raise exception 'Assignment choice required';end if;
 if not exists(select 1 from public.teaching_blocks where id=p_class_id and status<>'archived') then raise exception 'Choose a current class';end if;
 if not exists(select 1 from public.platform_administrators where user_id=p_user_id) then
  if not exists(select 1 from public.teacher_profiles p join auth.users u on u.id=p.user_id where p.user_id=p_user_id and u.raw_app_meta_data->>'role'='teacher' and (not p_assigned or p.active)) then raise exception 'Enabled teacher account required';end if;
 end if;
 if p_assigned then
  insert into public.teacher_class_memberships(class_id,user_id) values(p_class_id,p_user_id) on conflict do nothing;
 else delete from public.teacher_class_memberships where class_id=p_class_id and user_id=p_user_id;
 end if;
end $$;
revoke all on function public.set_teacher_class_membership(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_teacher_class_membership(uuid,uuid,boolean) to authenticated,service_role;

-- Repair only the teaching association explicitly confirmed by Joseph.
-- Does not infer teaching assignments for other administrators or classes.
insert into public.teacher_class_memberships(class_id,user_id)
select b.id,a.user_id from public.platform_administrators a
join auth.users u on u.id=a.user_id
cross join public.teaching_blocks b
where lower(u.email)='gongqi.lin@vu.edu.au' and b.course_code='NIT3004'
and b.academic_year=2026 and b.block_code='2B4' and b.class_code='C1' and b.status='active'
on conflict do nothing;

-- Teacher-authored feedback; student claims remain unchanged. No automatic assessment.
begin;
create table if not exists public.intake_teacher_reviews (
 intake_id uuid primary key references public.student_session_intakes(id) on delete restrict,
 version integer not null default 0,
 draft jsonb not null default '{"status":"reviewed","items":[],"actions":[]}',
 private_note text not null default '',
 published jsonb,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete restrict
);
alter table public.intake_teacher_reviews enable row level security;
revoke all on public.intake_teacher_reviews from public,anon,authenticated;

create or replace function public.get_intake_teacher_review(p_intake_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare i public.student_session_intakes%rowtype; r public.intake_teacher_reviews%rowtype; history jsonb;
begin
 select * into i from public.student_session_intakes where id=p_intake_id;
 if not found then raise exception 'Intake not found';end if;
 perform public.require_teaching_class(i.block_id);
 select * into r from public.intake_teacher_reviews where intake_id=i.id;
 select coalesce(jsonb_agg(x.payload order by x.n desc),'[]'::jsonb) into history from (
  select s.session_number n,jsonb_build_object('sessionNumber',s.session_number,'studentRecord',past.student_record,'feedback',review.published) payload
  from public.student_session_intakes past join public.studio_sessions s on s.id=past.session_id
  left join public.intake_teacher_reviews review on review.intake_id=past.id
  where past.block_id=i.block_id and past.auth_user_id=i.auth_user_id and past.id<>i.id
  and s.session_number<(select session_number from public.studio_sessions where id=i.session_id)
  order by s.session_number desc limit 5
 ) x;
 return jsonb_build_object('version',coalesce(r.version,0),'summaryRevision',i.summary_revision,
 'studentRecord',i.student_record,'correctionOpen',i.correction_opened_at is not null,'draft',coalesce(r.draft,'{"status":"reviewed","items":[],"actions":[]}'::jsonb),
 'privateNote',coalesce(r.private_note,''),'published',r.published,'updatedAt',r.updated_at,'history',history);
end $$;

create or replace function public.save_intake_teacher_review(p_intake_id uuid,p_version integer,p_summary_revision integer,p_draft jsonb,p_private_note text,p_publish boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i public.student_session_intakes%rowtype; r public.intake_teacher_reviews%rowtype; item jsonb; action jsonb; snapshot jsonb;
begin
 -- Serialize with student corrections and other teacher saves. Reject stale editors.
 select * into i from public.student_session_intakes where id=p_intake_id for update;
 if not found then raise exception 'Intake not found';end if;
 perform public.require_teaching_class(i.block_id);
 if p_summary_revision is distinct from i.summary_revision then raise exception 'Student summary changed. Reload before reviewing';end if;
 if p_publish is null or p_version is null then raise exception 'Review version and publication choice required';end if;
 if p_publish and i.correction_opened_at is not null then raise exception 'Wait for the student to reconfirm the summary before publishing';end if;
 if p_draft is null or jsonb_typeof(p_draft)<>'object' or length(p_draft::text)>40000 or length(coalesce(p_private_note,''))>6000 then raise exception 'Review is missing or too large';end if;
 if (p_draft->>'status') is null or (p_draft->>'status') not in ('reviewed','follow_up') or jsonb_typeof(p_draft->'items') is distinct from 'array' or jsonb_typeof(p_draft->'actions') is distinct from 'array' then raise exception 'Invalid review structure';end if;
 if jsonb_array_length(p_draft->'items')>12 or jsonb_array_length(p_draft->'actions')>8 then raise exception 'Too many review items or actions';end if;
 for item in select value from jsonb_array_elements(p_draft->'items') loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'category','') not in ('Implementation','Code review','Testing','Documentation','Presentation','Other') or coalesce(item->>'status','') not in ('observed','follow_up','not_verified') then raise exception 'Invalid review item';end if;
  if jsonb_typeof(item->'observation') is distinct from 'string' or jsonb_typeof(item->'recommendation') is distinct from 'string' or jsonb_typeof(item->'evidence') is distinct from 'string' or length(item->>'observation')>3000 or length(item->>'recommendation')>3000 or length(item->>'evidence')>2000 then raise exception 'Invalid review item text';end if;
  if p_publish and length(trim(item->>'observation'))=0 then raise exception 'Describe each observation before publishing';end if;
 end loop;
 for action in select value from jsonb_array_elements(p_draft->'actions') loop
  if jsonb_typeof(action)<>'object' or jsonb_typeof(action->'task') is distinct from 'string' or jsonb_typeof(action->'evidence') is distinct from 'string' or jsonb_typeof(action->'due') is distinct from 'string' or length(action->>'task')>2000 or length(action->>'evidence')>2000 or length(action->>'due')>120 then raise exception 'Invalid action text';end if;
  if p_publish and length(trim(action->>'task'))=0 then raise exception 'Describe each next step before publishing';end if;
 end loop;
 if p_publish and jsonb_array_length(p_draft->'items')=0 then raise exception 'Add an observation before publishing';end if;
 insert into public.intake_teacher_reviews(intake_id) values(i.id) on conflict do nothing;
 select * into r from public.intake_teacher_reviews where intake_id=i.id for update;
 if p_version<>r.version then raise exception 'Review changed in another tab. Reload before saving';end if;
 -- Explicit allow-list: private notes and arbitrary draft keys never enter student feedback.
 if p_publish then
  select jsonb_build_object('status',p_draft->>'status','items',(select coalesce(jsonb_agg(jsonb_build_object('category',v->>'category','status',v->>'status','observation',v->>'observation','recommendation',v->>'recommendation','evidence',v->>'evidence')),'[]'::jsonb) from jsonb_array_elements(p_draft->'items') v),
  'actions',(select coalesce(jsonb_agg(jsonb_build_object('task',v->>'task','evidence',v->>'evidence','due',v->>'due')),'[]'::jsonb) from jsonb_array_elements(p_draft->'actions') v),
  'publishedAt',now(),'teacherName',coalesce((select display_name from public.teacher_profiles where user_id=auth.uid()),'Teacher'),
  'summaryRevision',i.summary_revision,'reviewVersion',r.version+1) into snapshot;
 end if;
 update public.intake_teacher_reviews set draft=p_draft,private_note=coalesce(p_private_note,''),version=r.version+1,updated_at=now(),updated_by=auth.uid(),published=case when p_publish then snapshot else published end where intake_id=i.id;
 return public.get_intake_teacher_review(i.id);
end $$;

create or replace function public.get_my_intake_teacher_feedback() returns jsonb
language plpgsql stable security definer set search_path='' as $$begin
 return (select coalesce(jsonb_agg(jsonb_build_object('intakeId',i.id,'sessionNumber',s.session_number,'sessionTitle',coalesce(s.curriculum_focus,s.title),'feedback',r.published) order by s.session_date desc,s.session_number desc),'[]'::jsonb)
 from public.student_session_intakes i join public.intake_teacher_reviews r on r.intake_id=i.id
 join public.studio_sessions s on s.id=i.session_id
 where i.auth_user_id=auth.uid() and r.published is not null
 and exists(select 1 from public.student_accounts a join public.student_roster roster on roster.student_id=a.student_id
 where a.auth_user_id=auth.uid() and a.student_id=i.student_id and a.status='activated' and roster.block_id=i.block_id));
end $$;
create or replace function public.get_teacher_intake_review_states(p_session_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$begin
 perform public.require_session_class(p_session_id);
 return (select coalesce(jsonb_agg(jsonb_build_object('intakeId',i.id,'published',r.published is not null,'hasDraft',r.published is null or r.version>coalesce((r.published->>'reviewVersion')::integer,0),'status',r.published->>'status','summaryRevision',(r.published->>'summaryRevision')::integer)),'[]'::jsonb)
 from public.student_session_intakes i join public.intake_teacher_reviews r on r.intake_id=i.id where i.session_id=p_session_id);
end $$;
revoke all on function public.get_teacher_intake_review_states(uuid) from public,anon,authenticated;
grant execute on function public.get_teacher_intake_review_states(uuid) to authenticated;
revoke all on function public.get_intake_teacher_review(uuid),public.save_intake_teacher_review(uuid,integer,integer,jsonb,text,boolean),public.get_my_intake_teacher_feedback() from public,anon,authenticated;
grant execute on function public.get_intake_teacher_review(uuid),public.save_intake_teacher_review(uuid,integer,integer,jsonb,text,boolean),public.get_my_intake_teacher_feedback() to authenticated;
notify pgrst,'reload schema';
commit;

-- Option-led teacher review. Retains all existing drafts and publications.
begin;
create or replace function public.save_intake_teacher_review(p_intake_id uuid,p_version integer,p_summary_revision integer,p_draft jsonb,p_private_note text,p_publish boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i public.student_session_intakes%rowtype; r public.intake_teacher_reviews%rowtype; item jsonb; action jsonb; snapshot jsonb;
begin
 -- Serialize with student corrections and other teacher saves. Reject stale editors.
 select * into i from public.student_session_intakes where id=p_intake_id for update;
 if not found then raise exception 'Intake not found';end if;
 perform public.require_teaching_class(i.block_id);
 if p_summary_revision is distinct from i.summary_revision then raise exception 'Student summary changed. Reload before reviewing';end if;
 if p_publish is null or p_version is null then raise exception 'Review version and publication choice required';end if;
 if p_publish and i.correction_opened_at is not null then raise exception 'Wait for the student to reconfirm the summary before publishing';end if;
 if p_draft is null or jsonb_typeof(p_draft)<>'object' or length(p_draft::text)>40000 or length(coalesce(p_private_note,''))>6000 then raise exception 'Review is missing or too large';end if;
 if (p_draft->>'status') is null or (p_draft->>'status') not in ('reviewed','follow_up') or jsonb_typeof(p_draft->'items') is distinct from 'array' or jsonb_typeof(p_draft->'actions') is distinct from 'array' then raise exception 'Invalid review structure';end if;
 if jsonb_array_length(p_draft->'items')>12 or jsonb_array_length(p_draft->'actions')>8 then raise exception 'Too many review items or actions';end if;
 for item in select value from jsonb_array_elements(p_draft->'items') loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'category','') not in ('Implementation','Code review','Testing','Documentation','Presentation','Other') or coalesce(item->>'status','') not in ('observed','follow_up','not_verified') then raise exception 'Invalid review item';end if;
  if jsonb_typeof(item->'observation') is distinct from 'string' or jsonb_typeof(item->'recommendation') is distinct from 'string' or jsonb_typeof(item->'evidence') is distinct from 'string' or length(item->>'observation')>3000 or length(item->>'recommendation')>3000 or length(item->>'evidence')>2000 then raise exception 'Invalid review item text';end if;
  if item ? 'completionPercent' and item->'completionPercent'<>'null'::jsonb then
   if jsonb_typeof(item->'completionPercent') is distinct from 'number' then raise exception 'Invalid completion percentage';end if;
   if (item->>'completionPercent')::numeric not in (0,25,50,75,90,100) then raise exception 'Invalid completion percentage';end if;
  end if;
  if item ? 'finding' then
   if jsonb_typeof(item->'finding') is distinct from 'string' or item->>'finding' not in ('','Works as demonstrated','Partially working','Not demonstrated yet','Needs clearer explanation','Needs stronger testing','Ready for the next stage') then raise exception 'Invalid feedback choice';end if;
  end if;
  if item ? 'notes' and (jsonb_typeof(item->'notes') is distinct from 'string' or length(item->>'notes')>3000) then raise exception 'Invalid review notes';end if;
  if p_publish and length(trim(item->>'observation'))=0 and coalesce(item->>'finding','')='' then raise exception 'Choose main feedback before publishing';end if;
 end loop;
 for action in select value from jsonb_array_elements(p_draft->'actions') loop
  if jsonb_typeof(action)<>'object' or jsonb_typeof(action->'task') is distinct from 'string' or jsonb_typeof(action->'evidence') is distinct from 'string' or jsonb_typeof(action->'due') is distinct from 'string' or length(action->>'task')>2000 or length(action->>'evidence')>2000 or length(action->>'due')>120 then raise exception 'Invalid action text';end if;
  if action ? 'notes' and (jsonb_typeof(action->'notes') is distinct from 'string' or length(action->>'notes')>3000) then raise exception 'Invalid next-step notes';end if;
  if p_publish and action->>'task'='Other agreed action' and length(trim(coalesce(action->>'notes','')))=0 then raise exception 'Add notes for the other agreed action';end if;
  if p_publish and length(trim(action->>'task'))=0 then raise exception 'Describe each next step before publishing';end if;
 end loop;
 if p_publish and jsonb_array_length(p_draft->'items')=0 then raise exception 'Add an observation before publishing';end if;
 insert into public.intake_teacher_reviews(intake_id) values(i.id) on conflict do nothing;
 select * into r from public.intake_teacher_reviews where intake_id=i.id for update;
 if p_version<>r.version then raise exception 'Review changed in another tab. Reload before saving';end if;
 -- Explicit allow-list: private notes and arbitrary draft keys never enter student feedback.
 if p_publish then
  select jsonb_build_object('status',p_draft->>'status','items',(select coalesce(jsonb_agg(jsonb_build_object('completionPercent',v->'completionPercent','finding',v->>'finding','notes',v->>'notes','category',v->>'category','status',v->>'status','observation',v->>'observation','recommendation',v->>'recommendation','evidence',v->>'evidence')),'[]'::jsonb) from jsonb_array_elements(p_draft->'items') v),
  'actions',(select coalesce(jsonb_agg(jsonb_build_object('notes',v->>'notes','task',v->>'task','evidence',v->>'evidence','due',v->>'due')),'[]'::jsonb) from jsonb_array_elements(p_draft->'actions') v),
  'publishedAt',now(),'teacherName',coalesce((select display_name from public.teacher_profiles where user_id=auth.uid()),'Teacher'),
  'summaryRevision',i.summary_revision,'reviewVersion',r.version+1) into snapshot;
 end if;
 update public.intake_teacher_reviews set draft=p_draft,private_note=coalesce(p_private_note,''),version=r.version+1,updated_at=now(),updated_by=auth.uid(),published=case when p_publish then snapshot else published end where intake_id=i.id;
 return public.get_intake_teacher_review(i.id);
end $$;

revoke all on function public.save_intake_teacher_review(uuid,integer,integer,jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.save_intake_teacher_review(uuid,integer,integer,jsonb,text,boolean) to authenticated;
notify pgrst,'reload schema';
commit;

-- Interview profiles and evidence criteria. No grades or automatic assessment; preserve existing records.
begin;
create or replace function public.save_intake_teacher_review(p_intake_id uuid,p_version integer,p_summary_revision integer,p_draft jsonb,p_private_note text,p_publish boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i public.student_session_intakes%rowtype; r public.intake_teacher_reviews%rowtype; item jsonb; action jsonb; snapshot jsonb;criterion jsonb;
begin
 -- Serialize with student corrections and other teacher saves. Reject stale editors.
 select * into i from public.student_session_intakes where id=p_intake_id for update;
 if not found then raise exception 'Intake not found';end if;
 perform public.require_teaching_class(i.block_id);
 if p_summary_revision is distinct from i.summary_revision then raise exception 'Student summary changed. Reload before reviewing';end if;
 if p_publish is null or p_version is null then raise exception 'Review version and publication choice required';end if;
 if p_publish and i.correction_opened_at is not null then raise exception 'Wait for the student to reconfirm the summary before publishing';end if;
 if p_draft is null or jsonb_typeof(p_draft)<>'object' or length(p_draft::text)>40000 or length(coalesce(p_private_note,''))>6000 then raise exception 'Review is missing or too large';end if;
 if (p_draft->>'status') is null or (p_draft->>'status') not in ('reviewed','follow_up') or jsonb_typeof(p_draft->'items') is distinct from 'array' or jsonb_typeof(p_draft->'actions') is distinct from 'array' then raise exception 'Invalid review structure';end if;
 if jsonb_array_length(p_draft->'items')>12 or jsonb_array_length(p_draft->'actions')>8 then raise exception 'Too many review items or actions';end if;
 if p_draft ? 'profile' then
  if jsonb_typeof(p_draft->'profile') is distinct from 'object' or coalesce(p_draft#>>'{profile,kind}','') not in ('general','web','mobile','data') or jsonb_typeof(p_draft#>'{profile,ai}') is distinct from 'boolean' then raise exception 'Invalid interview profile';end if;
 end if;
 if p_draft ? 'standardVersion' and p_draft->>'standardVersion' is distinct from 'interview-review.v1' then raise exception 'Invalid interview standard version';end if;
 for item in select value from jsonb_array_elements(p_draft->'items') loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'category','') not in ('Implementation','Code review','Testing','Documentation','Presentation','Other','Design & architecture','Implementation & code','Testing & evaluation','Security & privacy','Documentation & delivery','Presentation & demonstration') or coalesce(item->>'status','') not in ('observed','follow_up','not_verified') then raise exception 'Invalid review item';end if;
  if jsonb_typeof(item->'observation') is distinct from 'string' or jsonb_typeof(item->'recommendation') is distinct from 'string' or jsonb_typeof(item->'evidence') is distinct from 'string' or length(item->>'observation')>3000 or length(item->>'recommendation')>3000 or length(item->>'evidence')>2000 then raise exception 'Invalid review item text';end if;
  if item ? 'completionPercent' and item->'completionPercent'<>'null'::jsonb then
   if jsonb_typeof(item->'completionPercent') is distinct from 'number' then raise exception 'Invalid completion percentage';end if;
   if (item->>'completionPercent')::numeric not in (0,25,50,75,90,100) then raise exception 'Invalid completion percentage';end if;
  end if;
  if item ? 'finding' then
   if jsonb_typeof(item->'finding') is distinct from 'string' or item->>'finding' not in ('','Works as demonstrated','Partially working','Not demonstrated yet','Needs clearer explanation','Needs stronger testing','Ready for the next stage') then raise exception 'Invalid feedback choice';end if;
  end if;
  if item ? 'notes' and (jsonb_typeof(item->'notes') is distinct from 'string' or length(item->>'notes')>3000) then raise exception 'Invalid review notes';end if;
  if item ? 'criteria' then
   if jsonb_typeof(item->'criteria') is distinct from 'array' then raise exception 'Invalid interview criteria';end if;
   if jsonb_array_length(item->'criteria')>16 then raise exception 'Too many interview criteria';end if;
   if (select count(*) from jsonb_array_elements(item->'criteria'))<>(select count(distinct c->>'id') from jsonb_array_elements(item->'criteria') c) then raise exception 'Duplicate or missing criterion IDs';end if;
   for criterion in select value from jsonb_array_elements(item->'criteria') loop
    if jsonb_typeof(criterion)<>'object' or jsonb_typeof(criterion->'id') is distinct from 'string' or length(trim(criterion->>'id'))=0 or length(criterion->>'id')>80
     or jsonb_typeof(criterion->'label') is distinct from 'string' or length(trim(criterion->>'label'))=0 or length(criterion->>'label')>240
     or coalesce(criterion->>'state','') not in ('not_reviewed','not_demonstrated','partial','demonstrated','not_applicable')
     or jsonb_typeof(criterion->'measurement') is distinct from 'string' or length(criterion->>'measurement')>400 then raise exception 'Invalid interview criterion';end if;
   end loop;
  end if;
  if p_publish and length(trim(item->>'observation'))=0 and coalesce(item->>'finding','')='' and not exists(select 1 from jsonb_array_elements(coalesce(item->'criteria','[]'::jsonb)) c where c->>'state'<>'not_reviewed') then raise exception 'Record a criterion decision or choose main feedback before publishing';end if;
 end loop;
 for action in select value from jsonb_array_elements(p_draft->'actions') loop
  if jsonb_typeof(action)<>'object' or jsonb_typeof(action->'task') is distinct from 'string' or jsonb_typeof(action->'evidence') is distinct from 'string' or jsonb_typeof(action->'due') is distinct from 'string' or length(action->>'task')>2000 or length(action->>'evidence')>2000 or length(action->>'due')>120 then raise exception 'Invalid action text';end if;
  if action ? 'notes' and (jsonb_typeof(action->'notes') is distinct from 'string' or length(action->>'notes')>3000) then raise exception 'Invalid next-step notes';end if;
  if p_publish and action->>'task'='Other agreed action' and length(trim(coalesce(action->>'notes','')))=0 then raise exception 'Add notes for the other agreed action';end if;
  if p_publish and length(trim(action->>'task'))=0 then raise exception 'Describe each next step before publishing';end if;
 end loop;
 if p_publish and jsonb_array_length(p_draft->'items')=0 then raise exception 'Add an observation before publishing';end if;
 insert into public.intake_teacher_reviews(intake_id) values(i.id) on conflict do nothing;
 select * into r from public.intake_teacher_reviews where intake_id=i.id for update;
 if p_version<>r.version then raise exception 'Review changed in another tab. Reload before saving';end if;
 -- Explicit allow-list: private notes and arbitrary draft keys never enter student feedback.
 if p_publish then
  select jsonb_build_object('profile',case when p_draft ? 'profile' then jsonb_build_object('kind',p_draft#>>'{profile,kind}','ai',p_draft#>'{profile,ai}') else null end,'standardVersion',p_draft->>'standardVersion','status',p_draft->>'status','items',(select coalesce(jsonb_agg(jsonb_build_object('criteria',(select coalesce(jsonb_agg(jsonb_build_object('id',c->>'id','label',c->>'label','state',c->>'state','measurement',c->>'measurement')),'[]'::jsonb) from jsonb_array_elements(coalesce(v->'criteria','[]'::jsonb)) c),'completionPercent',v->'completionPercent','finding',v->>'finding','notes',v->>'notes','category',v->>'category','status',v->>'status','observation',v->>'observation','recommendation',v->>'recommendation','evidence',v->>'evidence')),'[]'::jsonb) from jsonb_array_elements(p_draft->'items') v),
  'actions',(select coalesce(jsonb_agg(jsonb_build_object('notes',v->>'notes','task',v->>'task','evidence',v->>'evidence','due',v->>'due')),'[]'::jsonb) from jsonb_array_elements(p_draft->'actions') v),
  'publishedAt',now(),'teacherName',coalesce((select display_name from public.teacher_profiles where user_id=auth.uid()),'Teacher'),
  'summaryRevision',i.summary_revision,'reviewVersion',r.version+1) into snapshot;
 end if;
 update public.intake_teacher_reviews set draft=p_draft,private_note=coalesce(p_private_note,''),version=r.version+1,updated_at=now(),updated_by=auth.uid(),published=case when p_publish then snapshot else published end where intake_id=i.id;
 return public.get_intake_teacher_review(i.id);
end $$;

revoke all on function public.save_intake_teacher_review(uuid,integer,integer,jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.save_intake_teacher_review(uuid,integer,integer,jsonb,text,boolean) to authenticated;
notify pgrst,'reload schema';
commit;

-- Interview guide v2: UI/UX and AI understanding. Preserve all earlier records and guide versions.
begin;
create or replace function public.save_intake_teacher_review(p_intake_id uuid,p_version integer,p_summary_revision integer,p_draft jsonb,p_private_note text,p_publish boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i public.student_session_intakes%rowtype; r public.intake_teacher_reviews%rowtype; item jsonb; action jsonb; snapshot jsonb;criterion jsonb;
begin
 -- Serialize with student corrections and other teacher saves. Reject stale editors.
 select * into i from public.student_session_intakes where id=p_intake_id for update;
 if not found then raise exception 'Intake not found';end if;
 perform public.require_teaching_class(i.block_id);
 if p_summary_revision is distinct from i.summary_revision then raise exception 'Student summary changed. Reload before reviewing';end if;
 if p_publish is null or p_version is null then raise exception 'Review version and publication choice required';end if;
 if p_publish and i.correction_opened_at is not null then raise exception 'Wait for the student to reconfirm the summary before publishing';end if;
 if p_draft is null or jsonb_typeof(p_draft)<>'object' or length(p_draft::text)>40000 or length(coalesce(p_private_note,''))>6000 then raise exception 'Review is missing or too large';end if;
 if (p_draft->>'status') is null or (p_draft->>'status') not in ('reviewed','follow_up') or jsonb_typeof(p_draft->'items') is distinct from 'array' or jsonb_typeof(p_draft->'actions') is distinct from 'array' then raise exception 'Invalid review structure';end if;
 if jsonb_array_length(p_draft->'items')>12 or jsonb_array_length(p_draft->'actions')>8 then raise exception 'Too many review items or actions';end if;
 if p_draft ? 'profile' then
  if jsonb_typeof(p_draft->'profile') is distinct from 'object' or coalesce(p_draft#>>'{profile,kind}','') not in ('general','web','mobile','data') or jsonb_typeof(p_draft#>'{profile,ai}') is distinct from 'boolean' then raise exception 'Invalid interview profile';end if;
 end if;
 if p_draft ? 'standardVersion' and coalesce(p_draft->>'standardVersion','') not in ('interview-review.v1','interview-review.v2') then raise exception 'Invalid interview standard version';end if;
 for item in select value from jsonb_array_elements(p_draft->'items') loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'category','') not in ('Implementation','Code review','Testing','Documentation','Presentation','Other','Design & architecture','UI/UX design','AI integration & understanding','Implementation & code','Testing & evaluation','Security & privacy','Documentation & delivery','Presentation & demonstration') or coalesce(item->>'status','') not in ('observed','follow_up','not_verified') then raise exception 'Invalid review item';end if;
  if jsonb_typeof(item->'observation') is distinct from 'string' or jsonb_typeof(item->'recommendation') is distinct from 'string' or jsonb_typeof(item->'evidence') is distinct from 'string' or length(item->>'observation')>3000 or length(item->>'recommendation')>3000 or length(item->>'evidence')>2000 then raise exception 'Invalid review item text';end if;
  if item ? 'completionPercent' and item->'completionPercent'<>'null'::jsonb then
   if jsonb_typeof(item->'completionPercent') is distinct from 'number' then raise exception 'Invalid completion percentage';end if;
   if (item->>'completionPercent')::numeric not in (0,25,50,75,90,100) then raise exception 'Invalid completion percentage';end if;
  end if;
  if item ? 'finding' then
   if jsonb_typeof(item->'finding') is distinct from 'string' or item->>'finding' not in ('','Works as demonstrated','Partially working','Not demonstrated yet','Needs clearer explanation','Needs stronger testing','Ready for the next stage') then raise exception 'Invalid feedback choice';end if;
  end if;
  if item ? 'notes' and (jsonb_typeof(item->'notes') is distinct from 'string' or length(item->>'notes')>3000) then raise exception 'Invalid review notes';end if;
  if item ? 'criteria' then
   if jsonb_typeof(item->'criteria') is distinct from 'array' then raise exception 'Invalid interview criteria';end if;
   if jsonb_array_length(item->'criteria')>16 then raise exception 'Too many interview criteria';end if;
   if (select count(*) from jsonb_array_elements(item->'criteria'))<>(select count(distinct c->>'id') from jsonb_array_elements(item->'criteria') c) then raise exception 'Duplicate or missing criterion IDs';end if;
   for criterion in select value from jsonb_array_elements(item->'criteria') loop
    if jsonb_typeof(criterion)<>'object' or jsonb_typeof(criterion->'id') is distinct from 'string' or length(trim(criterion->>'id'))=0 or length(criterion->>'id')>80
     or jsonb_typeof(criterion->'label') is distinct from 'string' or length(trim(criterion->>'label'))=0 or length(criterion->>'label')>240
     or coalesce(criterion->>'state','') not in ('not_reviewed','not_demonstrated','partial','demonstrated','not_applicable')
     or jsonb_typeof(criterion->'measurement') is distinct from 'string' or length(criterion->>'measurement')>400 then raise exception 'Invalid interview criterion';end if;
   end loop;
  end if;
  if p_publish and length(trim(item->>'observation'))=0 and coalesce(item->>'finding','')='' and not exists(select 1 from jsonb_array_elements(coalesce(item->'criteria','[]'::jsonb)) c where c->>'state'<>'not_reviewed') then raise exception 'Record a criterion decision or choose main feedback before publishing';end if;
 end loop;
 for action in select value from jsonb_array_elements(p_draft->'actions') loop
  if jsonb_typeof(action)<>'object' or jsonb_typeof(action->'task') is distinct from 'string' or jsonb_typeof(action->'evidence') is distinct from 'string' or jsonb_typeof(action->'due') is distinct from 'string' or length(action->>'task')>2000 or length(action->>'evidence')>2000 or length(action->>'due')>120 then raise exception 'Invalid action text';end if;
  if action ? 'notes' and (jsonb_typeof(action->'notes') is distinct from 'string' or length(action->>'notes')>3000) then raise exception 'Invalid next-step notes';end if;
  if p_publish and action->>'task'='Other agreed action' and length(trim(coalesce(action->>'notes','')))=0 then raise exception 'Add notes for the other agreed action';end if;
  if p_publish and length(trim(action->>'task'))=0 then raise exception 'Describe each next step before publishing';end if;
 end loop;
 if p_publish and jsonb_array_length(p_draft->'items')=0 then raise exception 'Add an observation before publishing';end if;
 insert into public.intake_teacher_reviews(intake_id) values(i.id) on conflict do nothing;
 select * into r from public.intake_teacher_reviews where intake_id=i.id for update;
 if p_version<>r.version then raise exception 'Review changed in another tab. Reload before saving';end if;
 -- Explicit allow-list: private notes and arbitrary draft keys never enter student feedback.
 if p_publish then
  select jsonb_build_object('profile',case when p_draft ? 'profile' then jsonb_build_object('kind',p_draft#>>'{profile,kind}','ai',p_draft#>'{profile,ai}') else null end,'standardVersion',p_draft->>'standardVersion','status',p_draft->>'status','items',(select coalesce(jsonb_agg(jsonb_build_object('criteria',(select coalesce(jsonb_agg(jsonb_build_object('id',c->>'id','label',c->>'label','state',c->>'state','measurement',c->>'measurement')),'[]'::jsonb) from jsonb_array_elements(coalesce(v->'criteria','[]'::jsonb)) c),'completionPercent',v->'completionPercent','finding',v->>'finding','notes',v->>'notes','category',v->>'category','status',v->>'status','observation',v->>'observation','recommendation',v->>'recommendation','evidence',v->>'evidence')),'[]'::jsonb) from jsonb_array_elements(p_draft->'items') v),
  'actions',(select coalesce(jsonb_agg(jsonb_build_object('notes',v->>'notes','task',v->>'task','evidence',v->>'evidence','due',v->>'due')),'[]'::jsonb) from jsonb_array_elements(p_draft->'actions') v),
  'publishedAt',now(),'teacherName',coalesce((select display_name from public.teacher_profiles where user_id=auth.uid()),'Teacher'),
  'summaryRevision',i.summary_revision,'reviewVersion',r.version+1) into snapshot;
 end if;
 update public.intake_teacher_reviews set draft=p_draft,private_note=coalesce(p_private_note,''),version=r.version+1,updated_at=now(),updated_by=auth.uid(),published=case when p_publish then snapshot else published end where intake_id=i.id;
 return public.get_intake_teacher_review(i.id);
end $$;

revoke all on function public.save_intake_teacher_review(uuid,integer,integer,jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.save_intake_teacher_review(uuid,integer,integer,jsonb,text,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
