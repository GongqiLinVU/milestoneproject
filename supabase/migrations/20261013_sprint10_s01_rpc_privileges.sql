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
