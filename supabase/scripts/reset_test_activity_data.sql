-- ONE-OFF TEST DATA RESET
--
-- Run manually in the Supabase SQL Editor only while the portal contains
-- disposable test submissions. This file is intentionally not a migration.
-- It removes all student activity responses but preserves tables, policies,
-- teacher accounts and portal configuration.

begin;

truncate table
  public.poster_reviews,
  public.student_promises,
  public.team_conversations,
  public.week1_pulse,
  public.student_checkins;

commit;
