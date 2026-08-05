-- Sprint 6 Phase 1: private, block-scoped Poster Gallery.
-- Originals live in a private Storage bucket. Immutable poster_versions keep
-- replacement history while team_posters separates draft from published state.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'poster-gallery',
  'poster-gallery',
  false,
  5242880,
  array['application/pdf','image/png','image/jpeg']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.poster_gallery_settings (
  block_id uuid primary key references public.teaching_blocks(id) on delete cascade,
  is_published boolean not null default false,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.poster_versions (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.teaching_blocks(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  storage_path text not null unique,
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  mime_type text not null check (mime_type in ('application/pdf','image/png','image/jpeg')),
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  uploader_auth_user_id uuid not null references auth.users(id) on delete restrict,
  uploader_role text not null check (uploader_role in ('student','teacher')),
  status text not null default 'ready' check (status in ('ready','removed')),
  removed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists poster_versions_block_team_created_idx
  on public.poster_versions (block_id, team_id, created_at desc);

create table if not exists public.team_posters (
  block_id uuid not null references public.teaching_blocks(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  draft_version_id uuid references public.poster_versions(id) on delete restrict,
  published_version_id uuid references public.poster_versions(id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key (block_id, team_id),
  unique (team_id)
);

insert into public.poster_gallery_settings (block_id)
select id from public.teaching_blocks
on conflict (block_id) do nothing;

create or replace function public.prepare_poster_gallery_settings()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.poster_gallery_settings (block_id) values (new.id)
  on conflict (block_id) do nothing;
  return new;
end;
$$;
revoke all on function public.prepare_poster_gallery_settings() from public;
drop trigger if exists prepare_poster_gallery_settings on public.teaching_blocks;
create trigger prepare_poster_gallery_settings after insert on public.teaching_blocks
for each row execute function public.prepare_poster_gallery_settings();

drop trigger if exists set_poster_gallery_settings_updated_at on public.poster_gallery_settings;
create trigger set_poster_gallery_settings_updated_at before update on public.poster_gallery_settings
for each row execute function public.set_updated_at();
drop trigger if exists set_team_posters_updated_at on public.team_posters;
create trigger set_team_posters_updated_at before update on public.team_posters
for each row execute function public.set_updated_at();

alter table public.poster_gallery_settings enable row level security;
alter table public.poster_versions enable row level security;
alter table public.team_posters enable row level security;
revoke all on public.poster_gallery_settings, public.poster_versions, public.team_posters from anon, authenticated;
grant select, insert, update on public.poster_gallery_settings, public.poster_versions, public.team_posters to authenticated;

drop policy if exists "teachers manage poster gallery settings" on public.poster_gallery_settings;
create policy "teachers manage poster gallery settings" on public.poster_gallery_settings
for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
drop policy if exists "teachers read poster versions" on public.poster_versions;
create policy "teachers read poster versions" on public.poster_versions
for select to authenticated using (public.is_teacher());
drop policy if exists "teachers read team posters" on public.team_posters;
create policy "teachers read team posters" on public.team_posters
for select to authenticated using (public.is_teacher());

-- Student reads use narrow security-definer RPCs. Browser roles cannot list the
-- Storage bucket or the underlying poster tables.
create or replace function public.get_my_poster_upload_status()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_block_id uuid; v_team_id uuid; v_team_number smallint; v_version public.poster_versions;
begin
  select roster.block_id, team.id, team.team_number
    into v_block_id, v_team_id, v_team_number
  from public.student_accounts account
  join public.student_roster roster on roster.student_id = account.student_id
  join public.teaching_blocks block on block.id = roster.block_id
  join public.teams team on team.block_id = roster.block_id and team.team_number = roster.team_number
  where account.auth_user_id = auth.uid() and account.status = 'activated' and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc limit 1;
  if v_team_id is null then
    raise exception using errcode='P0001', message='Active student team is not available';
  end if;
  select version.* into v_version
  from public.team_posters poster
  join public.poster_versions version on version.id = poster.draft_version_id
  where poster.block_id = v_block_id and poster.team_id = v_team_id and version.status = 'ready';
  return jsonb_build_object(
    'blockId', v_block_id, 'teamId', v_team_id, 'teamName', concat('Team ', v_team_number),
    'draft', case when v_version.id is null then null else jsonb_build_object(
      'versionId',v_version.id,'originalFilename',v_version.original_filename,
      'mimeType',v_version.mime_type,'sizeBytes',v_version.size_bytes,'createdAt',v_version.created_at) end
  );
end;
$$;
revoke all on function public.get_my_poster_upload_status() from public;
grant execute on function public.get_my_poster_upload_status() to authenticated;

create or replace function public.get_my_poster_gallery()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_student_id text; v_block_id uuid; v_team_number smallint; v_published boolean;
begin
  select account.student_id, roster.block_id, roster.team_number
    into v_student_id, v_block_id, v_team_number
  from public.student_accounts account
  join public.student_roster roster on roster.student_id = account.student_id
  join public.teaching_blocks block on block.id = roster.block_id
  where account.auth_user_id = auth.uid() and account.status = 'activated' and block.status = 'active'
  order by block.starts_on desc nulls last, block.created_at desc limit 1;
  if v_block_id is null then
    raise exception using errcode='P0001', message='Active student block is not available';
  end if;
  select is_published into v_published from public.poster_gallery_settings where block_id = v_block_id;
  return jsonb_build_object(
    'isPublished', coalesce(v_published,false),
    'posters', case when coalesce(v_published,false) then coalesce((
      select jsonb_agg(jsonb_build_object(
        'teamId',team.id,'teamName',concat('Team ',team.team_number),
        'projectName',project.title,'versionId',version.id,
        'originalFilename',version.original_filename,'mimeType',version.mime_type,
        'isOwnTeam',team.team_number = v_team_number,
        'feedbackCompleted',exists(select 1 from public.poster_reviews review
          where review.block_id = v_block_id and lower(trim(review.reviewer_student_id)) = v_student_id
            and lower(trim(review.reviewed_team)) = lower(concat('Team ',team.team_number)))
      ) order by team.team_number)
      from public.teams team
      left join public.team_project_assignments assignment on assignment.team_id = team.id
      left join public.projects project on project.id = assignment.project_id
      left join public.team_posters poster on poster.block_id = v_block_id and poster.team_id = team.id
      left join public.poster_versions version on version.id = poster.published_version_id and version.status = 'ready'
      where team.block_id = v_block_id
    ),'[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;
revoke all on function public.get_my_poster_gallery() from public;
grant execute on function public.get_my_poster_gallery() to authenticated;

create or replace function public.get_teacher_poster_gallery(p_block_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_published boolean; v_published_at timestamptz;
begin
  if not public.is_teacher() then raise exception using errcode='42501', message='Teacher access required'; end if;
  select is_published,published_at into v_published,v_published_at from public.poster_gallery_settings where block_id=p_block_id;
  return jsonb_build_object(
    'isPublished',coalesce(v_published,false),'publishedAt',v_published_at,
    'teams',coalesce((select jsonb_agg(jsonb_build_object(
      'teamId',team.id,'teamName',concat('Team ',team.team_number),'projectName',project.title,
      'draft',case when draft.id is null then null else jsonb_build_object('versionId',draft.id,'originalFilename',draft.original_filename,'mimeType',draft.mime_type,'sizeBytes',draft.size_bytes,'createdAt',draft.created_at) end,
      'publishedVersionId',published.id
    ) order by team.team_number)
    from public.teams team
    left join public.team_project_assignments assignment on assignment.team_id=team.id
    left join public.projects project on project.id=assignment.project_id
    left join public.team_posters poster on poster.block_id=p_block_id and poster.team_id=team.id
    left join public.poster_versions draft on draft.id=poster.draft_version_id and draft.status='ready'
    left join public.poster_versions published on published.id=poster.published_version_id and published.status='ready'
    where team.block_id=p_block_id),'[]'::jsonb)
  );
end;
$$;
revoke all on function public.get_teacher_poster_gallery(uuid) from public;
grant execute on function public.get_teacher_poster_gallery(uuid) to authenticated;

create or replace function public.publish_poster_gallery(p_block_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_teacher() then raise exception using errcode='42501', message='Teacher access required'; end if;
  update public.team_posters set published_version_id=draft_version_id
  where block_id=p_block_id;
  insert into public.poster_gallery_settings(block_id,is_published,published_at)
  values(p_block_id,true,now())
  on conflict(block_id) do update set is_published=true,published_at=now();
end;
$$;
revoke all on function public.publish_poster_gallery(uuid) from public;
grant execute on function public.publish_poster_gallery(uuid) to authenticated;

create or replace function public.hide_poster_gallery(p_block_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_teacher() then raise exception using errcode='42501', message='Teacher access required'; end if;
  update public.poster_gallery_settings set is_published=false where block_id=p_block_id;
end;
$$;
revoke all on function public.hide_poster_gallery(uuid) from public;
grant execute on function public.hide_poster_gallery(uuid) to authenticated;

create or replace function public.remove_team_poster_draft(p_team_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_version_id uuid;
begin
  if not public.is_teacher() then raise exception using errcode='42501', message='Teacher access required'; end if;
  select draft_version_id into v_version_id from public.team_posters where team_id=p_team_id;
  update public.team_posters set draft_version_id=null where team_id=p_team_id;
  if v_version_id is not null then
    update public.poster_versions set status='removed',removed_at=now() where id=v_version_id;
  end if;
end;
$$;
revoke all on function public.remove_team_poster_draft(uuid) from public;
grant execute on function public.remove_team_poster_draft(uuid) to authenticated;

-- Gallery publication is the authoritative Peer Feedback gate for the direct
-- Poster -> feedback flow. It is intentionally independent from Week 3's broad
-- activity activation switch.
create or replace function public.student_can_review_poster_gallery(p_block_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.student_accounts account
    join public.student_roster roster on roster.student_id=account.student_id and roster.block_id=p_block_id
    join public.poster_gallery_settings gallery on gallery.block_id=roster.block_id and gallery.is_published
    where account.auth_user_id=auth.uid() and account.status='activated'
  );
$$;
revoke all on function public.student_can_review_poster_gallery(uuid) from public;
grant execute on function public.student_can_review_poster_gallery(uuid) to authenticated;

drop policy if exists "Students can submit poster reviews" on public.poster_reviews;
create policy "Students can submit poster reviews" on public.poster_reviews for insert to authenticated
with check (
  public.student_can_review_poster_gallery(block_id)
  and lower(trim(reviewer_team)) <> lower(trim(reviewed_team))
  and exists (
    select 1 from public.teams team
    join public.team_posters poster on poster.team_id=team.id and poster.block_id=team.block_id
    join public.poster_versions version on version.id=poster.published_version_id and version.status='ready'
    where team.block_id=poster_reviews.block_id
      and lower(concat('Team ',team.team_number))=lower(trim(poster_reviews.reviewed_team))
  )
  and problem_clarity between 1 and 5 and working_product between 1 and 5
  and evidence_testing between 1 and 5 and document_readiness between 1 and 5
  and presentation_quality between 1 and 5
);

-- Storage stays private and service-managed. No browser SELECT/LIST policy is
-- created on storage.objects; uploads and reads use short-lived signed tokens.

-- Verification:
-- 1. bucket is private, 5 MB, PDF/PNG/JPEG only; browser roles cannot list it.
-- 2. student RPCs resolve only the authenticated active Block/Team.
-- 3. publish copies each Team's draft pointer into an immutable published snapshot.
-- 4. replacement changes only draft_version_id until Publish is called again.
-- 5. Hide preserves versions, published pointers and existing feedback.
