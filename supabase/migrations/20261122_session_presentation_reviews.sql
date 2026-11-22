begin;

create table public.session_presentation_reviews (
  session_id uuid not null references public.studio_sessions(id) on delete cascade,
  roster_id uuid not null references public.student_roster(id) on delete cascade,
  content jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid not null,
  primary key (session_id, roster_id)
);

alter table public.session_presentation_reviews enable row level security;
revoke all on public.session_presentation_reviews from public, anon, authenticated;

create function public.get_session_presentation_review(p_session_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  class_id uuid;
  ledger jsonb;
  maximum numeric;
begin
  select block_id into class_id from public.studio_sessions
    where id = p_session_id and session_number = 10;
  if not found then raise exception 'Presentation review requires Session 10'; end if;
  ledger := public.get_assessment_ledger(class_id);
  select (node->>'maxScore')::numeric into maximum
    from public.assessment_nodes(ledger->'plan')
    where node->>'id' = 'presentation' and not (node ? 'children');

  return jsonb_build_object('maximum', maximum, 'rows', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'rosterId', row.value->'rosterId',
      'name', row.value->'name',
      'team', row.value->'team',
      'markVersion', row.value->'version',
      'score', row.value->'scores'->'presentation',
      'version', coalesce(review.version, 0),
      'content', review.content
    ) order by row.ordinality), '[]'::jsonb)
    from jsonb_array_elements(ledger->'rows') with ordinality as row(value, ordinality)
    left join public.session_presentation_reviews review
      on review.session_id = p_session_id and review.roster_id = (row.value->>'rosterId')::uuid
  ));
end $$;

create function public.save_session_presentation_review(
  p_session_id uuid, p_roster_id uuid, p_version integer, p_content jsonb,
  p_mark_version integer, p_score numeric, p_save_score boolean
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  class_id uuid;
  review_version integer;
  mark_version integer := p_mark_version;
  field text;
begin
  select block_id into class_id from public.studio_sessions
    where id = p_session_id and session_number = 10;
  if not found then raise exception 'Presentation review requires Session 10'; end if;
  perform public.require_teaching_class(class_id);

  -- Match the marks ledger lock order and serialize initial review inserts.
  perform 1 from public.teaching_blocks where id = class_id for update;
  perform 1 from public.student_roster where id = p_roster_id and block_id = class_id for share;
  if not found then raise exception 'Student is not enrolled in this class'; end if;

  select version into review_version from public.session_presentation_reviews
    where session_id = p_session_id and roster_id = p_roster_id;
  review_version := coalesce(review_version, 0);

  if p_content is not null then
    if p_version is distinct from review_version then
      raise exception 'Presentation review changed in another window. Reload and reconcile';
    end if;
    if jsonb_typeof(p_content) is distinct from 'object' then
      raise exception 'Invalid presentation review';
    end if;
    foreach field in array array['question', 'followUp', 'basis', 'listenFor', 'notes'] loop
      if jsonb_typeof(p_content->field) is distinct from 'string'
        or length(p_content->>field) > (case when field = 'notes' then 6000 else 2000 end) then
        raise exception 'Invalid presentation review field: %', field;
      end if;
    end loop;
    insert into public.session_presentation_reviews(session_id, roster_id, content, updated_by)
    values (p_session_id, p_roster_id, jsonb_build_object(
      'question', p_content->'question', 'followUp', p_content->'followUp',
      'basis', p_content->'basis', 'listenFor', p_content->'listenFor', 'notes', p_content->'notes'
    ), auth.uid())
    on conflict (session_id, roster_id) do update
      set content = excluded.content, updated_by = excluded.updated_by,
          updated_at = now(), version = session_presentation_reviews.version + 1
    returning version into review_version;
  end if;

  if p_save_score then
    select (public.save_assessment_record(
      class_id, p_roster_id, p_mark_version, jsonb_build_object('presentation', p_score), null
    )->>'version')::integer into mark_version;
  end if;

  return jsonb_build_object('version', review_version, 'markVersion', mark_version);
end $$;

revoke all on function public.get_session_presentation_review(uuid) from public, anon;
revoke all on function public.save_session_presentation_review(uuid, uuid, integer, jsonb, integer, numeric, boolean) from public, anon;
grant execute on function public.get_session_presentation_review(uuid) to authenticated;
grant execute on function public.save_session_presentation_review(uuid, uuid, integer, jsonb, integer, numeric, boolean) to authenticated;

notify pgrst, 'reload schema';
commit;
