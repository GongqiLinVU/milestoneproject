-- Sprint 6 Phase 3 storage and RPC privilege hardening.
-- Keep Poster objects private and constrain new uploads/replacements to one-page
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
