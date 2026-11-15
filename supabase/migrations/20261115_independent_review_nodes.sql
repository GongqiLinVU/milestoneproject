-- Independent teacher decisions; session AI checks never count as teacher verification.
begin;
create or replace function public.default_studio_review_config() returns jsonb
language sql immutable set search_path='' as $$select '{"sessionAI":true,"previousBlockId":null,"nodes":[{"id":"r1","label":"Starting point","fromSession":1,"toSession":1,"suggestedSession":1,"includePreviousBlock":true},{"id":"r2","label":"Midpoint review","fromSession":1,"toSession":3,"suggestedSession":4,"includePreviousBlock":false},{"id":"r3","label":"Progress review","fromSession":4,"toSession":6,"suggestedSession":7,"includePreviousBlock":false},{"id":"r4","label":"Final review","fromSession":7,"toSession":9,"suggestedSession":10,"includePreviousBlock":false}]}'::jsonb$$;
create table if not exists public.studio_review_settings(
 block_id uuid primary key references public.teaching_blocks(id) on delete restrict,
 config jsonb not null, version integer not null default 0, updated_at timestamptz not null default now()
);
create table if not exists public.teacher_node_reviews(
 id uuid primary key default gen_random_uuid(),block_id uuid not null,student_id text not null,node_key text not null,
 node_snapshot jsonb not null,source_snapshot jsonb not null,source_version integer not null default 1,
 draft jsonb not null default '{"workflow":"core.v1","teacherObservation":"","coreSourceObservation":"","coreEdited":false,"coreReview":{"confirmedProgress":[],"mainIssues":[],"nextSteps":[]}}',
 private_note text not null default '',version integer not null default 0,published jsonb,
 updated_at timestamptz not null default now(),updated_by uuid references auth.users(id),
 unique(block_id,student_id,node_key),foreign key(block_id,student_id) references public.student_roster(block_id,student_id) on delete restrict deferrable initially immediate
);
create table if not exists public.teacher_node_review_publications(
 review_id uuid not null references public.teacher_node_reviews(id) on delete restrict,version integer not null,
 feedback jsonb not null,source_snapshot jsonb not null,created_at timestamptz not null default now(),primary key(review_id,version)
);
create table if not exists public.studio_review_ai(
 review_id uuid references public.teacher_node_reviews(id) on delete restrict,
 intake_id uuid references public.student_session_intakes(id) on delete restrict,
 kind text not null check(kind in ('node_preparation','node_feedback','session_check')),
 status text not null check(status in ('pending','ready','failed')),result jsonb,previous_result jsonb,
 source_fingerprint text,request_fingerprint text,lease uuid,lease_user uuid,lease_until timestamptz,error text,updated_at timestamptz not null default now(),
 check((kind='session_check' and intake_id is not null and review_id is null) or (kind<>'session_check' and review_id is not null and intake_id is null))
);
create unique index if not exists studio_review_ai_target_key on public.studio_review_ai(kind,coalesce(review_id,intake_id));
alter table public.studio_review_settings enable row level security;
alter table public.teacher_node_reviews enable row level security;
alter table public.teacher_node_review_publications enable row level security;
alter table public.studio_review_ai enable row level security;
revoke all on public.studio_review_settings,public.teacher_node_reviews,public.teacher_node_review_publications,public.studio_review_ai from public,anon,authenticated;

create or replace function public.get_studio_review_hub(p_block_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare cfg jsonb;v integer;
begin
 perform public.require_teaching_class(p_block_id);
 select config,version into cfg,v from public.studio_review_settings where block_id=p_block_id;
 return jsonb_build_object('config',coalesce(cfg,public.default_studio_review_config()),'version',coalesce(v,0),
 'students',(select coalesce(jsonb_agg(jsonb_build_object('studentId',r.student_id,'studentName',r.full_name,'teamNumber',r.team_number) order by r.team_number,r.full_name),'[]'::jsonb) from public.student_roster r where r.block_id=p_block_id),
 'reviews',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'studentId',r.student_id,'nodeKey',r.node_key,'node',r.node_snapshot,'version',r.version,'published',r.published,'draft',r.draft,'updatedAt',r.updated_at) order by r.updated_at desc),'[]'::jsonb) from public.teacher_node_reviews r where r.block_id=p_block_id),
 'sessionChecks',(select coalesce(jsonb_agg(jsonb_build_object('intakeId',i.id,'studentId',i.student_id,'sessionNumber',s.session_number,'status',g.status,'result',g.result,'updatedAt',g.updated_at,'sourceChanged',g.source_fingerprint is distinct from md5(jsonb_build_object('studentRecord',i.student_record,'summaryRevision',i.summary_revision)::text),'correctionOpen',i.correction_opened_at is not null) order by s.session_number desc),'[]'::jsonb) from public.studio_review_ai g join public.student_session_intakes i on i.id=g.intake_id join public.studio_sessions s on s.id=i.session_id where i.block_id=p_block_id and g.kind='session_check'),
 'legacy',(select coalesce(jsonb_agg(jsonb_build_object('intakeId',i.id,'studentId',i.student_id,'sessionNumber',s.session_number,'published',r.published) order by s.session_number),'[]'::jsonb) from public.intake_teacher_reviews r join public.student_session_intakes i on i.id=r.intake_id join public.studio_sessions s on s.id=i.session_id where i.block_id=p_block_id and r.published is not null));
end $$;

create or replace function public.save_studio_review_settings(p_block_id uuid,p_version integer,p_config jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.studio_review_settings%rowtype;n jsonb;previous uuid;
begin
 perform public.require_teaching_class(p_block_id);
 if p_config is null or length(p_config::text)>12000 or jsonb_typeof(p_config->'sessionAI') is distinct from 'boolean' or jsonb_typeof(p_config->'nodes') is distinct from 'array' then raise exception 'Invalid review settings';end if;
 if jsonb_array_length(p_config->'nodes') not between 1 and 12 then raise exception 'Use between one and twelve review nodes';end if;
 if (select count(*) from jsonb_array_elements(p_config->'nodes'))<>(select count(distinct x->>'id') from jsonb_array_elements(p_config->'nodes') x) then raise exception 'Node IDs must be unique';end if;
 for n in select value from jsonb_array_elements(p_config->'nodes') loop
  if coalesce(n->>'id','')!~'^[a-z][a-z0-9_-]{0,39}$' or jsonb_typeof(n->'label') is distinct from 'string' or length(trim(n->>'label')) not between 1 and 80 or jsonb_typeof(n->'includePreviousBlock') is distinct from 'boolean' then raise exception 'Invalid node identity';end if;
  if coalesce(n->>'fromSession','')!~'^[0-9]{1,2}$' or coalesce(n->>'toSession','')!~'^[0-9]{1,2}$' or coalesce(n->>'suggestedSession','')!~'^[0-9]{1,2}$' then raise exception 'Invalid session range';end if;
  if (n->>'fromSession')::int<1 or (n->>'toSession')::int<(n->>'fromSession')::int or (n->>'suggestedSession')::int<(n->>'toSession')::int then raise exception 'Meeting must be at or after the source window';end if;
 end loop;
 if p_config->>'previousBlockId' is not null then previous:=(p_config->>'previousBlockId')::uuid;if previous=p_block_id then raise exception 'Previous class must be different';end if;perform public.require_teaching_class(previous);end if;
 insert into public.studio_review_settings(block_id,config) values(p_block_id,public.default_studio_review_config()) on conflict do nothing;
 select * into c from public.studio_review_settings where block_id=p_block_id for update;
 if p_version is distinct from c.version then raise exception 'Settings changed. Reload before saving';end if;
 if exists(select 1 from public.teacher_node_reviews r where r.block_id=p_block_id and not exists(select 1 from jsonb_array_elements(p_config->'nodes') x where x->>'id'=r.node_key and x=r.node_snapshot-'previousBlockId')) then raise exception 'Started node definitions are locked; add a new node instead';end if;
 if exists(select 1 from public.teacher_node_reviews r where r.block_id=p_block_id and (r.node_snapshot->>'includePreviousBlock')::boolean) and p_config->'previousBlockId' is distinct from c.config->'previousBlockId' then raise exception 'Previous-class link is locked for started reviews';end if;
 update public.studio_review_settings set config=p_config,version=version+1,updated_at=now() where block_id=p_block_id;
 return public.get_studio_review_hub(p_block_id);
end $$;

create or replace function public.teacher_node_review_source(p_block_id uuid,p_student_id text,p_node jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare lo integer:=(p_node->>'fromSession')::int;hi integer:=(p_node->>'toSession')::int;updates jsonb;prior jsonb;previous jsonb:='[]';previous_id uuid;uid uuid;
begin
 perform public.require_teaching_class(p_block_id);
 if not exists(select 1 from public.student_roster where block_id=p_block_id and student_id=p_student_id) then raise exception 'Student is not in this class';end if;
 select auth_user_id into uid from public.student_accounts where student_id=p_student_id;
 select coalesce(jsonb_agg(jsonb_build_object('intakeId',i.id,'sessionNumber',s.session_number,'summaryRevision',i.summary_revision,'correctionOpen',i.correction_opened_at is not null,'studentRecord',i.student_record) order by s.session_number),'[]'::jsonb) into updates
 from public.student_session_intakes i join public.studio_sessions s on s.id=i.session_id where i.block_id=p_block_id and i.student_id=p_student_id and i.auth_user_id=uid and s.session_number between lo and hi;
 select jsonb_build_object('reviewId',r.id,'nodeKey',r.node_key,'feedback',r.published) into prior from public.teacher_node_reviews r
 where r.block_id=p_block_id and r.student_id=p_student_id and r.node_key<>p_node->>'id' and r.published is not null and (r.node_snapshot->>'suggestedSession')::int<(p_node->>'suggestedSession')::int
 order by (r.node_snapshot->>'suggestedSession')::int desc,r.node_key desc limit 1;
 if (p_node->>'includePreviousBlock')::boolean and p_node->>'previousBlockId' is not null then
  previous_id:=(p_node->>'previousBlockId')::uuid;perform public.require_teaching_class(previous_id);
  select coalesce(jsonb_agg(jsonb_build_object('sessionNumber',s.session_number,'summaryRevision',i.summary_revision,'correctionOpen',i.correction_opened_at is not null,'studentRecord',i.student_record) order by s.session_number),'[]'::jsonb) into previous
  from public.student_session_intakes i join public.studio_sessions s on s.id=i.session_id where i.block_id=previous_id and i.student_id=p_student_id and i.auth_user_id=uid;
 end if;
 return jsonb_build_object('node',p_node,'currentSession',hi,'baselineFeedback',prior->'feedback','baselineSession',(prior#>>'{feedback,node,toSession}')::integer,'updates',updates,'previousBlockRecords',previous,'previousBlockTeacherReviews',(select coalesce(jsonb_agg(r.published order by r.updated_at,r.id),'[]'::jsonb) from public.teacher_node_reviews r where r.block_id=previous_id and r.student_id=p_student_id and r.published is not null),
 'missingSessions',(select coalesce(jsonb_agg(n order by n),'[]'::jsonb) from generate_series(lo,hi) n where not exists(select 1 from jsonb_array_elements(updates) x where (x->>'sessionNumber')::int=n)),
 'legacyReviews',(select coalesce(jsonb_agg(jsonb_build_object('sessionNumber',s.session_number,'feedback',r.published) order by s.session_number),'[]'::jsonb) from public.intake_teacher_reviews r join public.student_session_intakes i on i.id=r.intake_id join public.studio_sessions s on s.id=i.session_id where i.block_id=p_block_id and i.student_id=p_student_id and i.auth_user_id=uid and s.session_number between lo and hi and r.published is not null));
end $$;

create or replace function public.open_teacher_node_review(p_block_id uuid,p_student_id text,p_node_key text) returns uuid
language plpgsql security definer set search_path='' as $$
declare c jsonb;n jsonb;rid uuid;
begin
 perform public.require_teaching_class(p_block_id);
 insert into public.studio_review_settings(block_id,config) values(p_block_id,public.default_studio_review_config()) on conflict do nothing;
 select config into c from public.studio_review_settings where block_id=p_block_id for update;
 select value into n from jsonb_array_elements(c->'nodes') where value->>'id'=p_node_key;
 if n is null then raise exception 'Review node not found';end if;
 n:=n||jsonb_build_object('previousBlockId',case when (n->>'includePreviousBlock')::boolean then c->'previousBlockId' else 'null'::jsonb end);
 insert into public.teacher_node_reviews(block_id,student_id,node_key,node_snapshot,source_snapshot,updated_by) values(p_block_id,p_student_id,p_node_key,n,public.teacher_node_review_source(p_block_id,p_student_id,n),auth.uid()) on conflict(block_id,student_id,node_key) do nothing;
 select id into rid from public.teacher_node_reviews where block_id=p_block_id and student_id=p_student_id and node_key=p_node_key;return rid;
end $$;

create or replace function public.studio_review_ai_source(p_target_id uuid,p_kind text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare r public.teacher_node_reviews%rowtype;i public.student_session_intakes%rowtype;cfg jsonb;n text;previous jsonb;
begin
 if p_kind='session_check' then
  select * into i from public.student_session_intakes where id=p_target_id;
  if not found then raise exception 'Intake not found';end if;
  if i.auth_user_id is distinct from auth.uid() then perform public.require_teaching_class(i.block_id);end if;
  select config into cfg from public.studio_review_settings where block_id=i.block_id;
  if not coalesce((cfg->>'sessionAI')::boolean,true) then raise exception 'Session AI checks are disabled';end if;
  if i.correction_opened_at is not null then raise exception 'Wait for the summary to be reconfirmed';end if;
  select jsonb_build_object('sessionNumber',s.session_number,'studentRecord',x.student_record) into previous from public.student_session_intakes x join public.studio_sessions s on s.id=x.session_id where x.block_id=i.block_id and x.auth_user_id=i.auth_user_id and s.session_number<(select session_number from public.studio_sessions where id=i.session_id) order by s.session_number desc limit 1;
  return jsonb_build_object('studentRecord',i.student_record,'summaryRevision',i.summary_revision,'previousUpdate',previous,'teacherBaseline',(select nr.published from public.teacher_node_reviews nr where nr.block_id=i.block_id and nr.student_id=i.student_id and nr.published is not null and (nr.node_snapshot->>'toSession')::int<(select session_number from public.studio_sessions where id=i.session_id) order by (nr.node_snapshot->>'toSession')::int desc,nr.node_key desc limit 1));
 end if;
 select * into r from public.teacher_node_reviews where id=p_target_id;
 if not found then raise exception 'Review not found';end if;
 perform public.require_teaching_class(r.block_id);
 if p_kind='node_preparation' then return r.source_snapshot;end if;
 if p_kind<>'node_feedback' then raise exception 'Invalid generation kind';end if;
 select full_name into n from public.student_roster where block_id=r.block_id and student_id=r.student_id;
 return jsonb_build_object('teacherObservation',r.draft->>'teacherObservation','studentName',n,'summaryRevision',r.source_version);
end $$;

create or replace function public.studio_review_ai_fingerprint(p_source jsonb,p_kind text) returns text
language sql immutable set search_path='' as $$select md5((case when p_kind='session_check' then jsonb_build_object('studentRecord',p_source->'studentRecord','summaryRevision',p_source->'summaryRevision') else p_source end)::text)$$;

create or replace function public.studio_review_ai_slot(p_target_id uuid,p_kind text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare src jsonb;g public.studio_review_ai%rowtype;
begin
 src:=public.studio_review_ai_source(p_target_id,p_kind);
 select * into g from public.studio_review_ai where kind=p_kind and coalesce(review_id,intake_id)=p_target_id;
 if not found then return jsonb_build_object('status','empty','result',null,'sourceChanged',false);end if;
 return jsonb_build_object('status',case when g.status='pending' and g.lease_until<now() then 'interrupted' else g.status end,'result',g.result,'sourceChanged',g.source_fingerprint is distinct from public.studio_review_ai_fingerprint(src,p_kind),'requestSourceChanged',g.request_fingerprint is distinct from public.studio_review_ai_fingerprint(src,p_kind),'error',g.error);
end $$;

create or replace function public.get_teacher_node_workspace(p_review_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare r public.teacher_node_reviews%rowtype;fresh jsonb;last_record jsonb;
begin
 select * into r from public.teacher_node_reviews where id=p_review_id;
 if not found then raise exception 'Review not found';end if;
 perform public.require_teaching_class(r.block_id);
 fresh:=public.teacher_node_review_source(r.block_id,r.student_id,r.node_snapshot);
 select x->'studentRecord' into last_record from jsonb_array_elements(r.source_snapshot->'updates') x order by (x->>'sessionNumber')::int desc limit 1;
 return jsonb_build_object('review',jsonb_build_object('version',r.version,'summaryRevision',r.source_version,'correctionOpen',exists(select 1 from jsonb_array_elements(fresh->'updates') x where (x->>'correctionOpen')::boolean),
 'draft',r.draft,'privateNote',r.private_note,'published',r.published,'studentRecord',last_record,'history',r.source_snapshot->'updates','node',r.node_snapshot,'sourceSnapshot',r.source_snapshot,'sourceChanged',fresh is distinct from r.source_snapshot,
 'publications',(select coalesce(jsonb_agg(jsonb_build_object('feedback',p.feedback,'sourceSnapshot',p.source_snapshot) order by p.version desc),'[]'::jsonb) from public.teacher_node_review_publications p where p.review_id=r.id)),
 'preparation',public.studio_review_ai_slot(r.id,'node_preparation'),'feedback',public.studio_review_ai_slot(r.id,'node_feedback'),'legacyDraft',null);
end $$;

create or replace function public.refresh_teacher_node_sources(p_review_id uuid,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.teacher_node_reviews%rowtype;
begin
 select * into r from public.teacher_node_reviews where id=p_review_id for update;
 if not found then raise exception 'Review not found';end if;perform public.require_teaching_class(r.block_id);
 if p_version is distinct from r.version then raise exception 'Review changed. Reload before refreshing';end if;
 update public.teacher_node_reviews set source_snapshot=public.teacher_node_review_source(r.block_id,r.student_id,r.node_snapshot),source_version=source_version+1,version=version+1,updated_at=now(),updated_by=auth.uid() where id=r.id;
 return public.get_teacher_node_workspace(r.id);
end $$;

create or replace function public.save_teacher_node_review(p_review_id uuid,p_version integer,p_summary_revision integer,p_draft jsonb,p_private_note text,p_publish boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.teacher_node_reviews%rowtype;points jsonb;pub jsonb;fresh jsonb;
begin
 select * into r from public.teacher_node_reviews where id=p_review_id for update;
 if not found then raise exception 'Review not found';end if;perform public.require_teaching_class(r.block_id);
 if p_version is distinct from r.version or p_summary_revision is distinct from r.source_version then raise exception 'Review or source snapshot changed. Reload before saving';end if;
 if p_publish is null or p_draft->>'workflow' is distinct from 'core.v1' or jsonb_typeof(p_draft->'teacherObservation') is distinct from 'string' or jsonb_typeof(p_draft->'coreSourceObservation') is distinct from 'string' or jsonb_typeof(p_draft->'coreEdited') is distinct from 'boolean' or length(p_draft->>'teacherObservation')>6000 or length(p_draft->>'coreSourceObservation')>6000 or length(coalesce(p_private_note,''))>6000 then raise exception 'Invalid core observation';end if;
 if p_draft ? 'meetingDate' then
  if jsonb_typeof(p_draft->'meetingDate') is distinct from 'string' then raise exception 'Invalid meeting date';end if;
  if coalesce(p_draft->>'meetingDate','')<>'' then perform (p_draft->>'meetingDate')::date;if p_draft->>'meetingDate' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid meeting date';end if;end if;
 end if;
 perform public.validate_core_review_points(p_draft->'coreReview');
 points:=jsonb_build_object('confirmedProgress',p_draft#>'{coreReview,confirmedProgress}','mainIssues',p_draft#>'{coreReview,mainIssues}','nextSteps',p_draft#>'{coreReview,nextSteps}');
 if p_publish then
  if jsonb_array_length(points->'confirmedProgress')+jsonb_array_length(points->'mainIssues')=0 then raise exception 'Record at least one core point';end if;
  if p_draft->>'teacherObservation' is distinct from p_draft->>'coreSourceObservation' then raise exception 'Update the core points against the latest observation';end if;
  perform 1 from public.student_session_intakes where student_id=r.student_id and (block_id=r.block_id or block_id=nullif(r.node_snapshot->>'previousBlockId','')::uuid) for share;
  fresh:=public.teacher_node_review_source(r.block_id,r.student_id,r.node_snapshot);
  if fresh is distinct from r.source_snapshot then raise exception 'Source records changed. Save your draft and refresh the source snapshot before completing';end if;
  if exists(select 1 from jsonb_array_elements(fresh->'updates') x where (x->>'correctionOpen')::boolean) then raise exception 'Wait for student corrections to be reconfirmed';end if;
  pub:=jsonb_build_object('workflow','core.v1','node',r.node_snapshot,'coreReview',points,'reviewVersion',r.version+1,'publishedAt',now(),'teacherName',coalesce((select display_name from public.teacher_profiles where user_id=auth.uid()),'Teacher'),'sourceVersion',r.source_version,'reviewedOn',nullif(p_draft->>'meetingDate',''));
  insert into public.teacher_node_review_publications(review_id,version,feedback,source_snapshot) values(r.id,r.version+1,pub,r.source_snapshot);
 end if;
 update public.teacher_node_reviews set draft=jsonb_build_object('workflow','core.v1','meetingDate',coalesce(p_draft->>'meetingDate',''),'teacherObservation',p_draft->>'teacherObservation','coreSourceObservation',p_draft->>'coreSourceObservation','coreEdited',p_draft->'coreEdited','coreReview',points),private_note=coalesce(p_private_note,''),version=version+1,published=case when p_publish then pub else published end,updated_at=now(),updated_by=auth.uid() where id=r.id;
 return (public.get_teacher_node_workspace(r.id))->'review';
end $$;

create or replace function public.claim_studio_review_ai(p_target_id uuid,p_kind text,p_refresh boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare src jsonb;fp text;g public.studio_review_ai%rowtype;token uuid;
begin
 if p_refresh is null then raise exception 'Refresh choice required';end if;
 src:=public.studio_review_ai_source(p_target_id,p_kind);fp:=public.studio_review_ai_fingerprint(src,p_kind);
 if length(src::text)>65000 then raise exception 'Review context is too large. Review the source manually';end if;
 if p_kind='node_feedback' and length(trim(src->>'teacherObservation'))=0 then raise exception 'Record a teacher observation first';end if;
 insert into public.studio_review_ai(review_id,intake_id,kind,status) values(case when p_kind<>'session_check' then p_target_id end,case when p_kind='session_check' then p_target_id end,p_kind,'failed') on conflict do nothing;
 select * into g from public.studio_review_ai where kind=p_kind and coalesce(review_id,intake_id)=p_target_id for update;
 if g.status='pending' and g.lease_until>=now() then return jsonb_build_object('state','pending');end if;
 if p_kind='session_check' and g.status='ready' and g.source_fingerprint=fp and not public.can_manage_teaching_class((select block_id from public.student_session_intakes where id=p_target_id)) then return jsonb_build_object('state','ready','result',g.result);end if;
 if not p_refresh then
  if g.status='ready' and (p_kind='node_preparation' or g.source_fingerprint=fp) then return jsonb_build_object('state','ready','result',g.result);end if;
  if g.status='pending' then return jsonb_build_object('state','interrupted');end if;
  if g.error is not null and (p_kind='node_preparation' or g.request_fingerprint=fp) then return jsonb_build_object('state','failed','error',g.error);end if;
 end if;
 token:=gen_random_uuid();update public.studio_review_ai set status='pending',lease=token,lease_user=auth.uid(),lease_until=now()+interval '90 seconds',request_fingerprint=fp,error=null,updated_at=now() where kind=p_kind and coalesce(review_id,intake_id)=p_target_id;
 return jsonb_build_object('state','claimed','lease',token,'source',src);
end $$;

create or replace function public.finish_studio_review_ai(p_target_id uuid,p_kind text,p_lease uuid,p_result jsonb default null,p_error text default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare g public.studio_review_ai%rowtype;q jsonb;
begin
 perform public.studio_review_ai_source(p_target_id,p_kind);
 select * into g from public.studio_review_ai where kind=p_kind and coalesce(review_id,intake_id)=p_target_id for update;
 if not found or g.status<>'pending' or g.lease is distinct from p_lease or g.lease_user is distinct from auth.uid() then return false;end if;
 if p_error is null then
  if p_result is null or length(p_result::text)>12000 then raise exception 'Invalid generated result';end if;
  if p_kind='node_feedback' then perform public.validate_core_review_points(p_result);
   if jsonb_typeof(p_result->'clarification') is distinct from 'string' or length(p_result->>'clarification')>300 then raise exception 'Invalid clarification';end if;
  elsif p_kind='node_preparation' then
   if jsonb_typeof(p_result->'progress') is distinct from 'string' or length(p_result->>'progress') not between 1 and 540 or jsonb_typeof(p_result->'feedback') is distinct from 'string' or length(p_result->>'feedback') not between 1 and 700 or jsonb_typeof(p_result->'questions') is distinct from 'array' then raise exception 'Invalid preparation';end if;
   if jsonb_array_length(p_result->'questions')<>3 then raise exception 'Generate exactly three questions';end if;
   for q in select value from jsonb_array_elements(p_result->'questions') loop if jsonb_typeof(q) is distinct from 'string' or length(q#>>'{}') not between 1 and 160 then raise exception 'Invalid question';end if;end loop;
  else
   if jsonb_typeof(p_result->'summary') is distinct from 'string' or length(p_result->>'summary') not between 1 and 700 then raise exception 'Invalid AI summary';end if;
   foreach q in array array[p_result->'attentionPoints',p_result->'questions'] loop
    if jsonb_typeof(q) is distinct from 'array' then raise exception 'Invalid AI points';end if;
    if jsonb_array_length(q)>3 then raise exception 'Too many AI points';end if;
    if exists(select 1 from jsonb_array_elements(q) x where jsonb_typeof(x) is distinct from 'string' or length(trim(x#>>'{}')) not between 1 and 300) then raise exception 'Invalid AI point';end if;
   end loop;
  end if;
  update public.studio_review_ai set status='ready',previous_result=result,result=p_result,source_fingerprint=request_fingerprint,lease=null,lease_user=null,lease_until=null,error=null,updated_at=now() where kind=p_kind and coalesce(review_id,intake_id)=p_target_id;
 else
  update public.studio_review_ai set status='failed',lease=null,lease_user=null,lease_until=null,error='AI check unavailable. Retry explicitly when needed.',updated_at=now() where kind=p_kind and coalesce(review_id,intake_id)=p_target_id;
 end if;return true;
end $$;

create or replace function public.get_session_ai_check(p_intake_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare i public.student_session_intakes%rowtype;cfg jsonb;
begin
 select * into i from public.student_session_intakes where id=p_intake_id;
 if not found then raise exception 'Intake not found';end if;
 if i.auth_user_id is distinct from auth.uid() then perform public.require_teaching_class(i.block_id);end if;
 select config into cfg from public.studio_review_settings where block_id=i.block_id;
 if i.correction_opened_at is not null then return jsonb_build_object('status','paused','result',null,'sourceChanged',false);end if;
 if not coalesce((cfg->>'sessionAI')::boolean,true) then return jsonb_build_object('status','disabled','result',null,'sourceChanged',false);end if;
 return public.studio_review_ai_slot(i.id,'session_check');
end $$;

create or replace function public.get_my_teacher_node_reviews() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'blockId',r.block_id,'classLabel',concat(b.course_code,' · ',b.academic_year,' · ',b.block_code,' · ',b.class_code),'feedback',r.published) order by r.updated_at desc),'[]'::jsonb)
 from public.teacher_node_reviews r join public.teaching_blocks b on b.id=r.block_id join public.student_accounts a on a.student_id=r.student_id
 where a.auth_user_id=auth.uid() and r.published is not null
$$;

revoke all on function public.default_studio_review_config(),public.teacher_node_review_source(uuid,text,jsonb),public.studio_review_ai_source(uuid,text),public.studio_review_ai_slot(uuid,text),public.studio_review_ai_fingerprint(jsonb,text) from public,anon,authenticated;
revoke all on function public.get_studio_review_hub(uuid),public.save_studio_review_settings(uuid,integer,jsonb),public.open_teacher_node_review(uuid,text,text),public.get_teacher_node_workspace(uuid),public.refresh_teacher_node_sources(uuid,integer),public.save_teacher_node_review(uuid,integer,integer,jsonb,text,boolean),public.claim_studio_review_ai(uuid,text,boolean),public.finish_studio_review_ai(uuid,text,uuid,jsonb,text),public.get_session_ai_check(uuid),public.get_my_teacher_node_reviews() from public,anon,authenticated;
grant execute on function public.get_studio_review_hub(uuid),public.save_studio_review_settings(uuid,integer,jsonb),public.open_teacher_node_review(uuid,text,text),public.get_teacher_node_workspace(uuid),public.refresh_teacher_node_sources(uuid,integer),public.save_teacher_node_review(uuid,integer,integer,jsonb,text,boolean),public.claim_studio_review_ai(uuid,text,boolean),public.finish_studio_review_ai(uuid,text,uuid,jsonb,text),public.get_session_ai_check(uuid),public.get_my_teacher_node_reviews() to authenticated;
create or replace function public.get_assessment_feedback_context(p_block_id uuid,p_roster_id uuid,p_item_id text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare student text;cfg jsonb;item jsonb;notes text;history jsonb;
begin
 perform public.require_teaching_class(p_block_id);
 select student_id into student from public.student_roster where id=p_roster_id and block_id=p_block_id;
 if not found then raise exception 'Student is not enrolled in this class';end if;
 select config into cfg from public.class_assessment_plans where block_id=p_block_id;
 select node into item from public.assessment_nodes(cfg) where node->>'id'=p_item_id and node->'commentEnabled'='true'::jsonb;
 if item is null then raise exception 'Comments are not enabled for this assessment';end if;
 select comments->p_item_id->>'notes' into notes from public.assessment_records where block_id=p_block_id and roster_id=p_roster_id;
 select coalesce(jsonb_agg(jsonb_build_object('session',s.session_number,'date',s.session_date,'studentClaim',i.student_record,
 'correctionOpen',i.correction_opened_at is not null,'teacherFeedback',case when (r.published->>'summaryRevision')::integer=i.summary_revision and i.correction_opened_at is null then r.published-'teacherName' else null end) order by s.session_number),'[]') into history
 from public.student_session_intakes i join public.studio_sessions s on s.id=i.session_id
 left join public.intake_teacher_reviews r on r.intake_id=i.id where i.block_id=p_block_id and i.student_id=student;
 return jsonb_build_object('assessment',item,'teacherMarkingNotes',coalesce(notes,''),'sessions',history,'teacherNodeReviews',(select coalesce(jsonb_agg(r.published-'teacherName' order by r.updated_at),'[]'::jsonb) from public.teacher_node_reviews r where r.block_id=p_block_id and r.student_id=student and r.published is not null));
end $$;
notify pgrst,'reload schema';
commit;
