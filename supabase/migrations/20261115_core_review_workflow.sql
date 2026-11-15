-- Concise teacher review and durable, caller-authorized AI preparation.
begin;
alter table public.intake_teacher_reviews add column if not exists core_legacy_draft jsonb;
create table if not exists public.intake_review_generation (
 intake_id uuid not null references public.student_session_intakes(id) on delete restrict,
 kind text not null check(kind in ('preparation','feedback')),
 status text not null check(status in ('pending','ready','failed')),
 result jsonb, previous_result jsonb, source_fingerprint text, request_fingerprint text,
 lease uuid, lease_user uuid, lease_until timestamptz, error text,
 updated_at timestamptz not null default now(),primary key(intake_id,kind)
);
alter table public.intake_review_generation enable row level security;
revoke all on public.intake_review_generation from public,anon,authenticated;

create or replace function public.core_review_generation_source(p_intake_id uuid,p_kind text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare i public.student_session_intakes%rowtype;notes text;student_name text;
begin
 select * into i from public.student_session_intakes where id=p_intake_id;
 if not found then raise exception 'Intake not found';end if;
 perform public.require_teaching_class(i.block_id);
 if p_kind='preparation' then return public.get_review_suggestion_context(p_intake_id);end if;
 if p_kind<>'feedback' then raise exception 'Invalid generation kind';end if;
 select draft->>'teacherObservation' into notes from public.intake_teacher_reviews where intake_id=i.id and draft->>'workflow'='core.v1';
 select full_name into student_name from public.student_roster where block_id=i.block_id and student_id=i.student_id;
 return jsonb_build_object('teacherObservation',coalesce(notes,''),'studentName',student_name,'summaryRevision',i.summary_revision);
end $$;

create or replace function public.get_core_review_workspace(p_intake_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c jsonb;slots jsonb:='{}';k text;g public.intake_review_generation%rowtype;src jsonb;legacy jsonb;
begin
 c:=public.get_intake_teacher_review(p_intake_id);
 select core_legacy_draft into legacy from public.intake_teacher_reviews where intake_id=p_intake_id;
 if legacy is null and coalesce(c#>>'{draft,workflow}','')<>'core.v1' then legacy:=c->'draft';end if;
 foreach k in array array['preparation','feedback'] loop
  src:=public.core_review_generation_source(p_intake_id,k);
  select * into g from public.intake_review_generation where intake_id=p_intake_id and kind=k;
  if g.intake_id is not null then
   slots:=slots||jsonb_build_object(k,jsonb_build_object('status',case when g.status='pending' and g.lease_until<now() then 'interrupted' else g.status end,
    'result',g.result,'sourceChanged',g.source_fingerprint is distinct from md5(src::text),'requestSourceChanged',g.request_fingerprint is distinct from md5(src::text),'updatedAt',g.updated_at,'error',g.error));
  elsif k='preparation' and jsonb_typeof(legacy#>'{suggestion,progress}')='string' and jsonb_typeof(legacy#>'{suggestion,feedback}')='string' and jsonb_typeof(legacy#>'{suggestion,questions}')='array' then
   slots:=slots||jsonb_build_object(k,jsonb_build_object('status','ready','result',legacy->'suggestion','sourceChanged',true,'legacy',true));
  else slots:=slots||jsonb_build_object(k,jsonb_build_object('status','empty','result',null,'sourceChanged',false));end if;
 end loop;
 return jsonb_build_object('review',c,'preparation',slots->'preparation','feedback',slots->'feedback','legacyDraft',legacy);
end $$;

create or replace function public.claim_core_review_generation(p_intake_id uuid,p_kind text,p_refresh boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare src jsonb;fp text;g public.intake_review_generation%rowtype;legacy jsonb;token uuid;
begin
 if p_refresh is null then raise exception 'Refresh choice required';end if;
 src:=public.core_review_generation_source(p_intake_id,p_kind);fp:=md5(src::text);
 if p_kind='feedback' and length(trim(src->>'teacherObservation'))=0 then raise exception 'Record a teacher observation first';end if;
 if length(src::text)>65000 then raise exception 'Review context is too large. Write the core points manually';end if;
 insert into public.intake_review_generation(intake_id,kind,status) values(p_intake_id,p_kind,'failed') on conflict do nothing;
 select * into g from public.intake_review_generation where intake_id=p_intake_id and kind=p_kind for update;
 if p_kind='preparation' and g.result is null then
  select coalesce(draft->'suggestion',core_legacy_draft->'suggestion') into legacy from public.intake_teacher_reviews where intake_id=p_intake_id;
  if jsonb_typeof(legacy->'progress')='string' and jsonb_typeof(legacy->'feedback')='string' and jsonb_typeof(legacy->'questions')='array' then
   update public.intake_review_generation set status='ready',result=legacy where intake_id=p_intake_id and kind=p_kind returning * into g;
  end if;
 end if;
 -- A live lease always wins, including explicit refreshes from another window.
 if g.status='pending' and g.lease_until>=now() then return jsonb_build_object('state','pending');end if;
 if not p_refresh then
  if g.status='ready' and (p_kind='preparation' or g.source_fingerprint=fp) then return jsonb_build_object('state','ready','result',g.result);end if;
  if g.status='pending' then return jsonb_build_object('state','interrupted');end if;
  if g.error is not null and (p_kind='preparation' or g.request_fingerprint=fp) then return jsonb_build_object('state','failed','error',g.error);end if;
 end if;
 token:=gen_random_uuid();
 update public.intake_review_generation set status='pending',lease=token,lease_user=auth.uid(),lease_until=now()+interval '90 seconds',request_fingerprint=fp,error=null,updated_at=now()
 where intake_id=p_intake_id and kind=p_kind;
 return jsonb_build_object('state','claimed','lease',token,'source',src);
end $$;

create or replace function public.validate_core_review_points(p_points jsonb) returns void
language plpgsql immutable set search_path='' as $$
declare k text;v jsonb;limit_count integer;
begin
 if jsonb_typeof(p_points) is distinct from 'object' then raise exception 'Invalid core feedback';end if;
 foreach k in array array['confirmedProgress','mainIssues','nextSteps'] loop
  limit_count:=case when k='nextSteps' then 2 else 3 end;
  if jsonb_typeof(p_points->k) is distinct from 'array' then raise exception 'Invalid core feedback points';end if;
  if jsonb_array_length(p_points->k)>limit_count then raise exception 'Too many core feedback points';end if;
  for v in select value from jsonb_array_elements(p_points->k) loop
   if jsonb_typeof(v) is distinct from 'string' or length(trim(v#>>'{}')) not between 1 and 800 then raise exception 'Invalid core feedback point';end if;
  end loop;
 end loop;
end $$;

create or replace function public.finish_core_review_generation(p_intake_id uuid,p_kind text,p_lease uuid,p_result jsonb default null,p_error text default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare g public.intake_review_generation%rowtype;q jsonb;
begin
 perform public.core_review_generation_source(p_intake_id,p_kind);
 select * into g from public.intake_review_generation where intake_id=p_intake_id and kind=p_kind for update;
 if not found or g.status<>'pending' or p_lease is distinct from g.lease or g.lease_user is distinct from auth.uid() then return false;end if;
 if p_error is null then
  if p_result is null or length(p_result::text)>12000 then raise exception 'Invalid generated result';end if;
  if p_kind='preparation' then
   if jsonb_typeof(p_result->'progress') is distinct from 'string' or length(trim(p_result->>'progress')) not between 1 and 540
    or jsonb_typeof(p_result->'feedback') is distinct from 'string' or length(trim(p_result->>'feedback')) not between 1 and 700
    or jsonb_typeof(p_result->'questions') is distinct from 'array' then raise exception 'Invalid conversation guide';end if;
   if jsonb_array_length(p_result->'questions')<>3 then raise exception 'Generate exactly three questions';end if;
   for q in select value from jsonb_array_elements(p_result->'questions') loop
    if jsonb_typeof(q)<>'string' or length(trim(q#>>'{}')) not between 1 and 160 then raise exception 'Invalid question';end if;
   end loop;
  else
   perform public.validate_core_review_points(p_result);
   if jsonb_typeof(p_result->'clarification') is distinct from 'string' or length(p_result->>'clarification')>300 then raise exception 'Invalid clarification';end if;
  end if;
  update public.intake_review_generation set previous_result=result,result=p_result,status='ready',source_fingerprint=request_fingerprint,lease=null,lease_user=null,lease_until=null,error=null,updated_at=now() where intake_id=p_intake_id and kind=p_kind;
 else
  update public.intake_review_generation set status='failed',lease=null,lease_user=null,lease_until=null,error='AI preparation unavailable. Retry explicitly or write feedback manually.',updated_at=now() where intake_id=p_intake_id and kind=p_kind;
 end if;
 return true;
end $$;

create or replace function public.save_core_teacher_review(p_intake_id uuid,p_version integer,p_summary_revision integer,p_draft jsonb,p_private_note text,p_publish boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i public.student_session_intakes%rowtype;r public.intake_teacher_reviews%rowtype;points jsonb;clean jsonb;entries jsonb:='[]';steps jsonb:='[]';v jsonb;result jsonb;notes text;source_notes text;
begin
 select * into i from public.student_session_intakes where id=p_intake_id for update;
 if not found then raise exception 'Intake not found';end if;
 perform public.require_teaching_class(i.block_id);
 if p_draft->>'workflow' is distinct from 'core.v1' or jsonb_typeof(p_draft->'teacherObservation') is distinct from 'string'
  or length(p_draft->>'teacherObservation')>6000 or jsonb_typeof(p_draft->'coreSourceObservation') is distinct from 'string'
  or length(p_draft->>'coreSourceObservation')>6000 or jsonb_typeof(p_draft->'coreEdited') is distinct from 'boolean' then raise exception 'Invalid teacher observation';end if;
 points:=p_draft->'coreReview';perform public.validate_core_review_points(points);
 points:=jsonb_build_object('confirmedProgress',points->'confirmedProgress','mainIssues',points->'mainIssues','nextSteps',points->'nextSteps');
 notes:=p_draft->>'teacherObservation';source_notes:=p_draft->>'coreSourceObservation';
 if p_publish then
  if jsonb_array_length(points->'confirmedProgress')+jsonb_array_length(points->'mainIssues')=0 then raise exception 'Record at least one core feedback point before completing';end if;
  if source_notes is distinct from notes then raise exception 'Teacher observation changed. Update the core points before completing';end if;
 end if;
 if jsonb_array_length(points->'confirmedProgress')>0 then entries:=entries||jsonb_build_array(jsonb_build_object('category','Implementation','status','observed','observation',(select string_agg(value,E'\n') from jsonb_array_elements_text(points->'confirmedProgress')),'recommendation','','evidence',''));end if;
 if jsonb_array_length(points->'mainIssues')>0 then entries:=entries||jsonb_build_array(jsonb_build_object('category','Other','status','not_verified','observation',(select string_agg(value,E'\n') from jsonb_array_elements_text(points->'mainIssues')),'recommendation','','evidence',''));end if;
 for v in select value from jsonb_array_elements(points->'nextSteps') loop steps:=steps||jsonb_build_array(jsonb_build_object('task',v#>>'{}','evidence','','due',''));end loop;
 clean:=jsonb_build_object('workflow','core.v1','mode','detailed','teacherObservation',notes,'coreSourceObservation',source_notes,'coreEdited',p_draft->'coreEdited','coreReview',points,
  'status',case when jsonb_array_length(points->'mainIssues')>0 then 'follow_up' else 'reviewed' end,'items',entries,'actions',steps);
 select * into r from public.intake_teacher_reviews where intake_id=i.id;
 -- Preserve the full pre-conversion draft outside the student-facing payload.
 if r.intake_id is not null and coalesce(r.draft->>'workflow','')<>'core.v1' and r.core_legacy_draft is null then
  update public.intake_teacher_reviews set core_legacy_draft=draft where intake_id=i.id;
 end if;
 result:=public.save_intake_teacher_review(i.id,p_version,p_summary_revision,clean,p_private_note,p_publish);
 if p_publish then
  update public.intake_teacher_reviews set published=published||jsonb_build_object('workflow','core.v1','coreReview',points) where intake_id=i.id;
 end if;
 return public.get_intake_teacher_review(i.id);
end $$;

revoke all on function public.core_review_generation_source(uuid,text),public.validate_core_review_points(jsonb) from public,anon,authenticated;
revoke all on function public.get_core_review_workspace(uuid),public.claim_core_review_generation(uuid,text,boolean),public.finish_core_review_generation(uuid,text,uuid,jsonb,text),public.save_core_teacher_review(uuid,integer,integer,jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.get_core_review_workspace(uuid),public.claim_core_review_generation(uuid,text,boolean),public.finish_core_review_generation(uuid,text,uuid,jsonb,text),public.save_core_teacher_review(uuid,integer,integer,jsonb,text,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
