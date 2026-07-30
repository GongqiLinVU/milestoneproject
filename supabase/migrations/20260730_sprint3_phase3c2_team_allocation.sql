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
