-- Sprint 2 Phase 4: teacher-controlled Poster Peer Review window.
-- Apply this migration before deploying the matching frontend.

create table if not exists public.activity_settings (
  setting_key text primary key
    check (setting_key = 'poster_peer_review'),
  is_open boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.activity_settings (setting_key, is_open)
values ('poster_peer_review', false)
on conflict (setting_key) do nothing;

drop trigger if exists set_activity_settings_updated_at
on public.activity_settings;
create trigger set_activity_settings_updated_at
before update on public.activity_settings
for each row execute function public.set_updated_at();

alter table public.activity_settings enable row level security;

drop policy if exists "Public can read peer review state"
on public.activity_settings;
create policy "Public can read peer review state"
on public.activity_settings
for select
to anon, authenticated
using (setting_key = 'poster_peer_review');

drop policy if exists "Teachers can update peer review state"
on public.activity_settings;
create policy "Teachers can update peer review state"
on public.activity_settings
for update
to authenticated
using (
  setting_key = 'poster_peer_review'
  and public.is_teacher()
)
with check (
  setting_key = 'poster_peer_review'
  and public.is_teacher()
);

grant select on public.activity_settings to anon, authenticated;
revoke insert, delete on public.activity_settings from anon, authenticated;
revoke update on public.activity_settings from anon;
grant update on public.activity_settings to authenticated;

drop policy if exists "Students can submit poster reviews"
on public.poster_reviews;
create policy "Students can submit poster reviews"
on public.poster_reviews
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.activity_settings
    where setting_key = 'poster_peer_review'
      and is_open
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

-- Verification after applying:
-- 1. SELECT is_open FROM public.activity_settings
--    WHERE setting_key = 'poster_peer_review'; -- false on first install
-- 2. Confirm anon can SELECT this row but cannot UPDATE it.
-- 3. Confirm a teacher can toggle is_open.
-- 4. Confirm anon poster_reviews INSERT is rejected while false, accepted
--    when true, and rejected again after closing.
--
-- Recovery:
-- Set is_open = false as a teacher. This immediately blocks new reviews
-- without deleting the setting or any existing poster_reviews.
