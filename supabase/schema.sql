-- NIT3004 Engineering Studio Portal
create extension if not exists pgcrypto;

create table if not exists public.portal_health (
  id smallint primary key default 1 check (id = 1),
  status text not null default 'ok'
);
insert into public.portal_health (id, status) values (1, 'ok') on conflict (id) do nothing;

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

alter table public.portal_health enable row level security;
alter table public.student_checkins enable row level security;
alter table public.week1_pulse enable row level security;
alter table public.team_conversations enable row level security;
alter table public.student_promises enable row level security;
alter table public.poster_reviews enable row level security;

create policy "public can read portal health" on public.portal_health for select to anon, authenticated using (true);
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

create or replace function public.is_teacher() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher', false);
$$;
create policy "Teachers can read check-ins" on public.student_checkins for select to authenticated using (public.is_teacher());
create policy "Teachers can read class pulse" on public.week1_pulse for select to authenticated using (public.is_teacher());
create policy "Teachers can read conversations" on public.team_conversations for select to authenticated using (public.is_teacher());
create policy "Teachers can read promises" on public.student_promises for select to authenticated using (public.is_teacher());
create policy "Teachers can read poster reviews" on public.poster_reviews for select to authenticated using (public.is_teacher());

grant select on public.portal_health to anon, authenticated;
revoke all privileges on public.student_checkins, public.week1_pulse, public.team_conversations, public.student_promises, public.poster_reviews from anon, authenticated;
grant insert on public.student_checkins, public.week1_pulse, public.team_conversations, public.student_promises, public.poster_reviews to anon, authenticated;
grant select on public.student_checkins, public.week1_pulse, public.team_conversations, public.student_promises, public.poster_reviews to authenticated;
