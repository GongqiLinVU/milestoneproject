-- Teacher-authored feedback; student claims remain unchanged. No automatic assessment.
begin;
create table if not exists public.intake_teacher_reviews (
 intake_id uuid primary key references public.student_session_intakes(id) on delete restrict,
 version integer not null default 0,
 draft jsonb not null default '{"status":"reviewed","items":[],"actions":[]}',
 private_note text not null default '',
 published jsonb,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete restrict
);
alter table public.intake_teacher_reviews enable row level security;
revoke all on public.intake_teacher_reviews from public,anon,authenticated;

create or replace function public.get_intake_teacher_review(p_intake_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare i public.student_session_intakes%rowtype; r public.intake_teacher_reviews%rowtype; history jsonb;
begin
 select * into i from public.student_session_intakes where id=p_intake_id;
 if not found then raise exception 'Intake not found';end if;
 perform public.require_teaching_class(i.block_id);
 select * into r from public.intake_teacher_reviews where intake_id=i.id;
 select coalesce(jsonb_agg(x.payload order by x.n desc),'[]'::jsonb) into history from (
  select s.session_number n,jsonb_build_object('sessionNumber',s.session_number,'studentRecord',past.student_record,'feedback',review.published) payload
  from public.student_session_intakes past join public.studio_sessions s on s.id=past.session_id
  left join public.intake_teacher_reviews review on review.intake_id=past.id
  where past.block_id=i.block_id and past.auth_user_id=i.auth_user_id and past.id<>i.id
  and s.session_number<(select session_number from public.studio_sessions where id=i.session_id)
  order by s.session_number desc limit 5
 ) x;
 return jsonb_build_object('version',coalesce(r.version,0),'summaryRevision',i.summary_revision,
 'studentRecord',i.student_record,'correctionOpen',i.correction_opened_at is not null,'draft',coalesce(r.draft,'{"status":"reviewed","items":[],"actions":[]}'::jsonb),
 'privateNote',coalesce(r.private_note,''),'published',r.published,'updatedAt',r.updated_at,'history',history);
end $$;

create or replace function public.save_intake_teacher_review(p_intake_id uuid,p_version integer,p_summary_revision integer,p_draft jsonb,p_private_note text,p_publish boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i public.student_session_intakes%rowtype; r public.intake_teacher_reviews%rowtype; item jsonb; action jsonb; snapshot jsonb;
begin
 -- Serialize with student corrections and other teacher saves. Reject stale editors.
 select * into i from public.student_session_intakes where id=p_intake_id for update;
 if not found then raise exception 'Intake not found';end if;
 perform public.require_teaching_class(i.block_id);
 if p_summary_revision is distinct from i.summary_revision then raise exception 'Student summary changed. Reload before reviewing';end if;
 if p_publish is null or p_version is null then raise exception 'Review version and publication choice required';end if;
 if p_publish and i.correction_opened_at is not null then raise exception 'Wait for the student to reconfirm the summary before publishing';end if;
 if p_draft is null or jsonb_typeof(p_draft)<>'object' or length(p_draft::text)>40000 or length(coalesce(p_private_note,''))>6000 then raise exception 'Review is missing or too large';end if;
 if (p_draft->>'status') is null or (p_draft->>'status') not in ('reviewed','follow_up') or jsonb_typeof(p_draft->'items') is distinct from 'array' or jsonb_typeof(p_draft->'actions') is distinct from 'array' then raise exception 'Invalid review structure';end if;
 if jsonb_array_length(p_draft->'items')>12 or jsonb_array_length(p_draft->'actions')>8 then raise exception 'Too many review items or actions';end if;
 for item in select value from jsonb_array_elements(p_draft->'items') loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'category','') not in ('Implementation','Code review','Testing','Documentation','Presentation','Other') or coalesce(item->>'status','') not in ('observed','follow_up','not_verified') then raise exception 'Invalid review item';end if;
  if jsonb_typeof(item->'observation') is distinct from 'string' or jsonb_typeof(item->'recommendation') is distinct from 'string' or jsonb_typeof(item->'evidence') is distinct from 'string' or length(item->>'observation')>3000 or length(item->>'recommendation')>3000 or length(item->>'evidence')>2000 then raise exception 'Invalid review item text';end if;
  if p_publish and length(trim(item->>'observation'))=0 then raise exception 'Describe each observation before publishing';end if;
 end loop;
 for action in select value from jsonb_array_elements(p_draft->'actions') loop
  if jsonb_typeof(action)<>'object' or jsonb_typeof(action->'task') is distinct from 'string' or jsonb_typeof(action->'evidence') is distinct from 'string' or jsonb_typeof(action->'due') is distinct from 'string' or length(action->>'task')>2000 or length(action->>'evidence')>2000 or length(action->>'due')>120 then raise exception 'Invalid action text';end if;
  if p_publish and length(trim(action->>'task'))=0 then raise exception 'Describe each next step before publishing';end if;
 end loop;
 if p_publish and jsonb_array_length(p_draft->'items')=0 then raise exception 'Add an observation before publishing';end if;
 insert into public.intake_teacher_reviews(intake_id) values(i.id) on conflict do nothing;
 select * into r from public.intake_teacher_reviews where intake_id=i.id for update;
 if p_version<>r.version then raise exception 'Review changed in another tab. Reload before saving';end if;
 -- Explicit allow-list: private notes and arbitrary draft keys never enter student feedback.
 if p_publish then
  select jsonb_build_object('status',p_draft->>'status','items',(select coalesce(jsonb_agg(jsonb_build_object('category',v->>'category','status',v->>'status','observation',v->>'observation','recommendation',v->>'recommendation','evidence',v->>'evidence')),'[]'::jsonb) from jsonb_array_elements(p_draft->'items') v),
  'actions',(select coalesce(jsonb_agg(jsonb_build_object('task',v->>'task','evidence',v->>'evidence','due',v->>'due')),'[]'::jsonb) from jsonb_array_elements(p_draft->'actions') v),
  'publishedAt',now(),'teacherName',coalesce((select display_name from public.teacher_profiles where user_id=auth.uid()),'Teacher'),
  'summaryRevision',i.summary_revision,'reviewVersion',r.version+1) into snapshot;
 end if;
 update public.intake_teacher_reviews set draft=p_draft,private_note=coalesce(p_private_note,''),version=r.version+1,updated_at=now(),updated_by=auth.uid(),published=case when p_publish then snapshot else published end where intake_id=i.id;
 return public.get_intake_teacher_review(i.id);
end $$;

create or replace function public.get_my_intake_teacher_feedback() returns jsonb
language plpgsql stable security definer set search_path='' as $$begin
 return (select coalesce(jsonb_agg(jsonb_build_object('intakeId',i.id,'sessionNumber',s.session_number,'sessionTitle',coalesce(s.curriculum_focus,s.title),'feedback',r.published) order by s.session_date desc,s.session_number desc),'[]'::jsonb)
 from public.student_session_intakes i join public.intake_teacher_reviews r on r.intake_id=i.id
 join public.studio_sessions s on s.id=i.session_id
 where i.auth_user_id=auth.uid() and r.published is not null
 and exists(select 1 from public.student_accounts a join public.student_roster roster on roster.student_id=a.student_id
 where a.auth_user_id=auth.uid() and a.student_id=i.student_id and a.status='activated' and roster.block_id=i.block_id));
end $$;
create or replace function public.get_teacher_intake_review_states(p_session_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$begin
 perform public.require_session_class(p_session_id);
 return (select coalesce(jsonb_agg(jsonb_build_object('intakeId',i.id,'published',r.published is not null,'hasDraft',r.published is null or r.version>coalesce((r.published->>'reviewVersion')::integer,0),'status',r.published->>'status','summaryRevision',(r.published->>'summaryRevision')::integer)),'[]'::jsonb)
 from public.student_session_intakes i join public.intake_teacher_reviews r on r.intake_id=i.id where i.session_id=p_session_id);
end $$;
revoke all on function public.get_teacher_intake_review_states(uuid) from public,anon,authenticated;
grant execute on function public.get_teacher_intake_review_states(uuid) to authenticated;
revoke all on function public.get_intake_teacher_review(uuid),public.save_intake_teacher_review(uuid,integer,integer,jsonb,text,boolean),public.get_my_intake_teacher_feedback() from public,anon,authenticated;
grant execute on function public.get_intake_teacher_review(uuid),public.save_intake_teacher_review(uuid,integer,integer,jsonb,text,boolean),public.get_my_intake_teacher_feedback() to authenticated;
notify pgrst,'reload schema';
commit;
