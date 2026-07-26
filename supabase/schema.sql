-- NIT3004 Engineering Studio Portal
create extension if not exists pgcrypto;

create table if not exists public.portal_health (
  id smallint primary key default 1 check (id = 1),
  status text not null default 'ok'
);
insert into public.portal_health (id, status) values (1, 'ok') on conflict (id) do nothing;

create table if not exists public.student_checkins (
  id uuid primary key default gen_random_uuid(),
  student_name text not null check (char_length(student_name) between 1 and 100),
  student_id text not null check (char_length(student_id) between 2 and 30),
  team_name text not null check (team_name ~ '^Team [1-8]$'),
  goal text not null check (char_length(goal) between 1 and 800),
  submitted_at timestamptz not null default now(),
  unique (student_id)
);

create table if not exists public.week1_pulse (
  id uuid primary key default gen_random_uuid(),
  confidence smallint not null check (confidence between 1 and 5),
  concern text not null check (concern in ('Working product','Documentation','Presentation','Teamwork','Testing','Time')),
  ai_usage text not null check (ai_usage in ('Rarely','Weekly','Daily','It is part of almost every task')),
  submitted_at timestamptz not null default now()
);

create table if not exists public.team_conversations (
  id uuid primary key default gen_random_uuid(),
  team_name text not null check (team_name ~ '^Team [1-8]$'),
  proud_of text not null check (char_length(proud_of) between 1 and 1200),
  delivery_risk text not null check (char_length(delivery_risk) between 1 and 1200),
  support_needed text not null check (char_length(support_needed) between 1 and 1200),
  submitted_at timestamptz not null default now(),
  unique (team_name)
);

create table if not exists public.student_promises (
  id uuid primary key default gen_random_uuid(),
  student_name text not null check (char_length(student_name) between 1 and 100),
  student_id text not null check (char_length(student_id) between 2 and 30),
  team_name text not null check (team_name ~ '^Team [1-8]$'),
  promise text not null check (char_length(promise) between 1 and 1000),
  submitted_at timestamptz not null default now(),
  unique (student_id)
);

create table if not exists public.poster_reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_name text not null check (char_length(reviewer_name) between 1 and 100),
  reviewer_student_id text not null check (char_length(reviewer_student_id) between 2 and 30),
  reviewer_team text not null check (reviewer_team ~ '^Team [1-8]$'),
  reviewed_team text not null check (reviewed_team ~ '^Team [1-8]$'),
  problem_clarity smallint not null check (problem_clarity between 1 and 5),
  working_product smallint not null check (working_product between 1 and 5),
  evidence_testing smallint not null check (evidence_testing between 1 and 5),
  document_readiness smallint not null check (document_readiness between 1 and 5),
  explanation_quality smallint not null check (explanation_quality between 1 and 5),
  strongest_part text not null check (char_length(strongest_part) between 1 and 1000),
  priority_before_demo text not null check (char_length(priority_before_demo) between 1 and 1000),
  submitted_at timestamptz not null default now(),
  check (reviewer_team <> reviewed_team),
  unique (reviewer_student_id, reviewed_team)
);

create or replace function public.normalise_student_id_column() returns trigger language plpgsql as $$
begin new.student_id := lower(trim(new.student_id)); return new; end; $$;
create or replace function public.normalise_reviewer_student_id_column() returns trigger language plpgsql as $$
begin new.reviewer_student_id := lower(trim(new.reviewer_student_id)); return new; end; $$;

drop trigger if exists normalise_checkin_student_id on public.student_checkins;
create trigger normalise_checkin_student_id before insert or update on public.student_checkins for each row execute function public.normalise_student_id_column();
drop trigger if exists normalise_promise_student_id on public.student_promises;
create trigger normalise_promise_student_id before insert or update on public.student_promises for each row execute function public.normalise_student_id_column();
drop trigger if exists normalise_review_student_id on public.poster_reviews;
create trigger normalise_review_student_id before insert or update on public.poster_reviews for each row execute function public.normalise_reviewer_student_id_column();

alter table public.portal_health enable row level security;
alter table public.student_checkins enable row level security;
alter table public.week1_pulse enable row level security;
alter table public.team_conversations enable row level security;
alter table public.student_promises enable row level security;
alter table public.poster_reviews enable row level security;

create policy "public can read portal health" on public.portal_health for select to anon, authenticated using (true);
create policy "public can submit checkins" on public.student_checkins for insert to anon, authenticated with check (true);
create policy "public can submit pulse" on public.week1_pulse for insert to anon, authenticated with check (true);
create policy "public can submit team conversation" on public.team_conversations for insert to anon, authenticated with check (true);
create policy "public can submit promises" on public.student_promises for insert to anon, authenticated with check (true);
create policy "public can submit reviews" on public.poster_reviews for insert to anon, authenticated with check (reviewer_team <> reviewed_team);

create or replace function public.is_teacher() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher', false);
$$;
create policy "teachers read checkins" on public.student_checkins for select to authenticated using (public.is_teacher());
create policy "teachers read pulse" on public.week1_pulse for select to authenticated using (public.is_teacher());
create policy "teachers read team conversations" on public.team_conversations for select to authenticated using (public.is_teacher());
create policy "teachers read promises" on public.student_promises for select to authenticated using (public.is_teacher());
create policy "teachers read reviews" on public.poster_reviews for select to authenticated using (public.is_teacher());

grant select on public.portal_health to anon, authenticated;
grant insert on public.student_checkins, public.week1_pulse, public.team_conversations, public.student_promises, public.poster_reviews to anon, authenticated;
grant select on public.student_checkins, public.week1_pulse, public.team_conversations, public.student_promises, public.poster_reviews to authenticated;
