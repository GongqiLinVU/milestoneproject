-- Interview profiles and evidence criteria. No grades or automatic assessment; preserve existing records.
begin;
create or replace function public.save_intake_teacher_review(p_intake_id uuid,p_version integer,p_summary_revision integer,p_draft jsonb,p_private_note text,p_publish boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i public.student_session_intakes%rowtype; r public.intake_teacher_reviews%rowtype; item jsonb; action jsonb; snapshot jsonb;criterion jsonb;
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
 if p_draft ? 'profile' then
  if jsonb_typeof(p_draft->'profile') is distinct from 'object' or coalesce(p_draft#>>'{profile,kind}','') not in ('general','web','mobile','data') or jsonb_typeof(p_draft#>'{profile,ai}') is distinct from 'boolean' then raise exception 'Invalid interview profile';end if;
 end if;
 if p_draft ? 'standardVersion' and p_draft->>'standardVersion' is distinct from 'interview-review.v1' then raise exception 'Invalid interview standard version';end if;
 for item in select value from jsonb_array_elements(p_draft->'items') loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'category','') not in ('Implementation','Code review','Testing','Documentation','Presentation','Other','Design & architecture','Implementation & code','Testing & evaluation','Security & privacy','Documentation & delivery','Presentation & demonstration') or coalesce(item->>'status','') not in ('observed','follow_up','not_verified') then raise exception 'Invalid review item';end if;
  if jsonb_typeof(item->'observation') is distinct from 'string' or jsonb_typeof(item->'recommendation') is distinct from 'string' or jsonb_typeof(item->'evidence') is distinct from 'string' or length(item->>'observation')>3000 or length(item->>'recommendation')>3000 or length(item->>'evidence')>2000 then raise exception 'Invalid review item text';end if;
  if item ? 'completionPercent' and item->'completionPercent'<>'null'::jsonb then
   if jsonb_typeof(item->'completionPercent') is distinct from 'number' then raise exception 'Invalid completion percentage';end if;
   if (item->>'completionPercent')::numeric not in (0,25,50,75,90,100) then raise exception 'Invalid completion percentage';end if;
  end if;
  if item ? 'finding' then
   if jsonb_typeof(item->'finding') is distinct from 'string' or item->>'finding' not in ('','Works as demonstrated','Partially working','Not demonstrated yet','Needs clearer explanation','Needs stronger testing','Ready for the next stage') then raise exception 'Invalid feedback choice';end if;
  end if;
  if item ? 'notes' and (jsonb_typeof(item->'notes') is distinct from 'string' or length(item->>'notes')>3000) then raise exception 'Invalid review notes';end if;
  if item ? 'criteria' then
   if jsonb_typeof(item->'criteria') is distinct from 'array' then raise exception 'Invalid interview criteria';end if;
   if jsonb_array_length(item->'criteria')>16 then raise exception 'Too many interview criteria';end if;
   if (select count(*) from jsonb_array_elements(item->'criteria'))<>(select count(distinct c->>'id') from jsonb_array_elements(item->'criteria') c) then raise exception 'Duplicate or missing criterion IDs';end if;
   for criterion in select value from jsonb_array_elements(item->'criteria') loop
    if jsonb_typeof(criterion)<>'object' or jsonb_typeof(criterion->'id') is distinct from 'string' or length(trim(criterion->>'id'))=0 or length(criterion->>'id')>80
     or jsonb_typeof(criterion->'label') is distinct from 'string' or length(trim(criterion->>'label'))=0 or length(criterion->>'label')>240
     or coalesce(criterion->>'state','') not in ('not_reviewed','not_demonstrated','partial','demonstrated','not_applicable')
     or jsonb_typeof(criterion->'measurement') is distinct from 'string' or length(criterion->>'measurement')>400 then raise exception 'Invalid interview criterion';end if;
   end loop;
  end if;
  if p_publish and length(trim(item->>'observation'))=0 and coalesce(item->>'finding','')='' and not exists(select 1 from jsonb_array_elements(coalesce(item->'criteria','[]'::jsonb)) c where c->>'state'<>'not_reviewed') then raise exception 'Record a criterion decision or choose main feedback before publishing';end if;
 end loop;
 for action in select value from jsonb_array_elements(p_draft->'actions') loop
  if jsonb_typeof(action)<>'object' or jsonb_typeof(action->'task') is distinct from 'string' or jsonb_typeof(action->'evidence') is distinct from 'string' or jsonb_typeof(action->'due') is distinct from 'string' or length(action->>'task')>2000 or length(action->>'evidence')>2000 or length(action->>'due')>120 then raise exception 'Invalid action text';end if;
  if action ? 'notes' and (jsonb_typeof(action->'notes') is distinct from 'string' or length(action->>'notes')>3000) then raise exception 'Invalid next-step notes';end if;
  if p_publish and action->>'task'='Other agreed action' and length(trim(coalesce(action->>'notes','')))=0 then raise exception 'Add notes for the other agreed action';end if;
  if p_publish and length(trim(action->>'task'))=0 then raise exception 'Describe each next step before publishing';end if;
 end loop;
 if p_publish and jsonb_array_length(p_draft->'items')=0 then raise exception 'Add an observation before publishing';end if;
 insert into public.intake_teacher_reviews(intake_id) values(i.id) on conflict do nothing;
 select * into r from public.intake_teacher_reviews where intake_id=i.id for update;
 if p_version<>r.version then raise exception 'Review changed in another tab. Reload before saving';end if;
 -- Explicit allow-list: private notes and arbitrary draft keys never enter student feedback.
 if p_publish then
  select jsonb_build_object('profile',case when p_draft ? 'profile' then jsonb_build_object('kind',p_draft#>>'{profile,kind}','ai',p_draft#>'{profile,ai}') else null end,'standardVersion',p_draft->>'standardVersion','status',p_draft->>'status','items',(select coalesce(jsonb_agg(jsonb_build_object('criteria',(select coalesce(jsonb_agg(jsonb_build_object('id',c->>'id','label',c->>'label','state',c->>'state','measurement',c->>'measurement')),'[]'::jsonb) from jsonb_array_elements(coalesce(v->'criteria','[]'::jsonb)) c),'completionPercent',v->'completionPercent','finding',v->>'finding','notes',v->>'notes','category',v->>'category','status',v->>'status','observation',v->>'observation','recommendation',v->>'recommendation','evidence',v->>'evidence')),'[]'::jsonb) from jsonb_array_elements(p_draft->'items') v),
  'actions',(select coalesce(jsonb_agg(jsonb_build_object('notes',v->>'notes','task',v->>'task','evidence',v->>'evidence','due',v->>'due')),'[]'::jsonb) from jsonb_array_elements(p_draft->'actions') v),
  'publishedAt',now(),'teacherName',coalesce((select display_name from public.teacher_profiles where user_id=auth.uid()),'Teacher'),
  'summaryRevision',i.summary_revision,'reviewVersion',r.version+1) into snapshot;
 end if;
 update public.intake_teacher_reviews set draft=p_draft,private_note=coalesce(p_private_note,''),version=r.version+1,updated_at=now(),updated_by=auth.uid(),published=case when p_publish then snapshot else published end where intake_id=i.id;
 return public.get_intake_teacher_review(i.id);
end $$;

revoke all on function public.save_intake_teacher_review(uuid,integer,integer,jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.save_intake_teacher_review(uuid,integer,integer,jsonb,text,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
