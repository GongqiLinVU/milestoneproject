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
