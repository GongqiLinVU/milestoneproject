-- Sprint 2 Phase 3: allow authenticated teachers to correct or remove
-- identified activity records. Class Pulse remains anonymous and read-only.
-- This migration is idempotent and does not modify existing rows.

grant update, delete on
  public.student_checkins,
  public.team_conversations,
  public.student_promises,
  public.poster_reviews
to authenticated;

drop policy if exists "Teachers can update check-ins" on public.student_checkins;
create policy "Teachers can update check-ins"
on public.student_checkins for update to authenticated
using (public.is_teacher()) with check (public.is_teacher());

drop policy if exists "Teachers can delete check-ins" on public.student_checkins;
create policy "Teachers can delete check-ins"
on public.student_checkins for delete to authenticated
using (public.is_teacher());

drop policy if exists "Teachers can update conversations" on public.team_conversations;
create policy "Teachers can update conversations"
on public.team_conversations for update to authenticated
using (public.is_teacher()) with check (public.is_teacher());

drop policy if exists "Teachers can delete conversations" on public.team_conversations;
create policy "Teachers can delete conversations"
on public.team_conversations for delete to authenticated
using (public.is_teacher());

drop policy if exists "Teachers can update promises" on public.student_promises;
create policy "Teachers can update promises"
on public.student_promises for update to authenticated
using (public.is_teacher()) with check (public.is_teacher());

drop policy if exists "Teachers can delete promises" on public.student_promises;
create policy "Teachers can delete promises"
on public.student_promises for delete to authenticated
using (public.is_teacher());

drop policy if exists "Teachers can update poster reviews" on public.poster_reviews;
create policy "Teachers can update poster reviews"
on public.poster_reviews for update to authenticated
using (public.is_teacher()) with check (public.is_teacher());

drop policy if exists "Teachers can delete poster reviews" on public.poster_reviews;
create policy "Teachers can delete poster reviews"
on public.poster_reviews for delete to authenticated
using (public.is_teacher());

-- Verification:
-- 1. As anon and an authenticated non-teacher, UPDATE and DELETE return no
--    changed rows because no matching RLS policy is available.
-- 2. As a teacher, update one test row and confirm updated_at changes.
-- 3. As a teacher, delete one disposable test row and confirm only that row is
--    removed.
-- 4. Confirm week1_pulse has no UPDATE or DELETE grant/policy.
--
-- select schemaname, tablename, policyname, cmd, roles
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in (
--     'student_checkins', 'week1_pulse', 'team_conversations',
--     'student_promises', 'poster_reviews'
--   )
-- order by tablename, cmd, policyname;

-- Rollback:
-- revoke update, delete on
--   public.student_checkins, public.team_conversations,
--   public.student_promises, public.poster_reviews
-- from authenticated;
-- Then drop each "Teachers can update ..." and "Teachers can delete ..."
-- policy created above. Existing SELECT and INSERT behaviour is unaffected.
