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


-- Submit through one authoritative server path. Reviewer identity and Block are
-- derived from auth.uid(); the browser supplies only the review target/content.
create or replace function public.submit_poster_review(
  p_reviewed_team text,
  p_problem_clarity integer,
  p_working_product integer,
  p_evidence_testing integer,
  p_document_readiness integer,
  p_presentation_quality integer,
  p_strongest_part text,
  p_highest_priority text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.student_accounts%rowtype;
  v_roster public.student_roster%rowtype;
  v_target_team public.teams%rowtype;
  v_review_id uuid;
begin
  select * into v_account
  from public.student_accounts
  where auth_user_id = auth.uid()
    and status = 'activated';

  if v_account.student_id is null then
    raise exception using errcode = '42501', message = 'Activated student account is not available';
  end if;

  select roster.* into v_roster
  from public.student_roster roster
  join public.teaching_blocks block
    on block.id = roster.block_id
   and block.status = 'active'
  where lower(trim(roster.student_id)) = lower(trim(v_account.student_id))
  order by block.starts_on desc nulls last, block.created_at desc
  limit 1;

  if v_roster.id is null then
    raise exception using errcode = '42501', message = 'Active class roster is not available';
  end if;

  if not exists (
    select 1
    from public.poster_gallery_settings gallery
    where gallery.block_id = v_roster.block_id
      and gallery.is_published
  ) then
    raise exception using errcode = '42501', message = 'Poster Gallery is not published';
  end if;

  select team.* into v_target_team
  from public.teams team
  where team.block_id = v_roster.block_id
    and lower(trim(concat('Team ', team.team_number))) = lower(trim(p_reviewed_team))
  limit 1;

  if v_target_team.id is null or not exists (
    select 1
    from public.team_posters poster
    join public.poster_versions version
      on version.id = poster.published_version_id
     and version.status = 'ready'
    where poster.block_id = v_roster.block_id
      and poster.team_id = v_target_team.id
  ) then
    raise exception using errcode = '42501', message = 'The published Poster is not available';
  end if;

  if v_target_team.team_number = v_roster.team_number then
    raise exception using errcode = '42501', message = 'Your Team cannot review its own Poster';
  end if;

  if p_problem_clarity not between 1 and 5
    or p_working_product not between 1 and 5
    or p_evidence_testing not between 1 and 5
    or p_document_readiness not between 1 and 5
    or p_presentation_quality not between 1 and 5 then
    raise exception using errcode = '22023', message = 'Complete every Poster rating';
  end if;

  if char_length(trim(coalesce(p_strongest_part, ''))) < 1
    or char_length(trim(coalesce(p_highest_priority, ''))) < 1 then
    raise exception using errcode = '22023', message = 'Complete the strongest area and next priority';
  end if;

  insert into public.poster_reviews (
    reviewer_name,
    reviewer_student_id,
    reviewer_team,
    reviewed_team,
    problem_clarity,
    working_product,
    evidence_testing,
    document_readiness,
    presentation_quality,
    strongest_part,
    highest_priority,
    block_id
  ) values (
    coalesce(v_roster.preferred_name, v_roster.full_name),
    v_account.student_id,
    concat('Team ', v_roster.team_number),
    concat('Team ', v_target_team.team_number),
    p_problem_clarity,
    p_working_product,
    p_evidence_testing,
    p_document_readiness,
    p_presentation_quality,
    trim(p_strongest_part),
    trim(p_highest_priority),
    v_roster.block_id
  )
  returning id into v_review_id;

  return v_review_id;
end;
$$;

revoke all on function public.submit_poster_review(text, integer, integer, integer, integer, integer, text, text) from public;
grant execute on function public.submit_poster_review(text, integer, integer, integer, integer, integer, text, text) to authenticated;
