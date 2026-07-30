-- Sprint 3 Phase 3C-2 follow-up: Student ID-only team lookup
-- Email remains available as optional teacher contact information.

alter table public.student_roster
  alter column vu_email drop not null;

alter table public.student_roster
  drop constraint if exists student_roster_block_id_vu_email_key;

create or replace function public.normalise_roster_identity()
returns trigger language plpgsql set search_path = public as $$
begin
  new.student_id := lower(trim(new.student_id));
  new.vu_email := nullif(lower(trim(new.vu_email)), '');
  new.full_name := trim(new.full_name);
  new.preferred_name := nullif(trim(new.preferred_name), '');
  new.project_name := nullif(trim(new.project_name), '');
  return new;
end;
$$;

-- Verification:
-- 1. A teacher can save a roster row with vu_email = null.
-- 2. Multiple students in one block may have null email values.
-- 3. Find My Team matches only (active block, student_id).
-- 4. Existing email values remain unchanged.
