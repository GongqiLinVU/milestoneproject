begin;
create table if not exists public.teacher_review_meetings(
 id uuid primary key default gen_random_uuid(),block_id uuid not null references public.teaching_blocks(id),team_number integer not null,
 node_key text not null,node_snapshot jsonb not null,roster_snapshot jsonb not null,sources jsonb not null,
 participants text[] not null default '{}',observation text not null default '',meeting_date date not null default ((now() at time zone 'Australia/Melbourne')::date),
 feedback jsonb not null default '{"shared":{"confirmedProgress":[],"mainIssues":[],"nextSteps":[]},"members":[],"unresolved":[]}',
 feedback_observation text not null default '',feedback_participants text[] not null default '{}',feedback_edited boolean not null default false,
 version integer not null default 0,confirmed jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),updated_by uuid references auth.users(id)
);
create table if not exists public.teacher_meeting_ai(
 meeting_id uuid not null references public.teacher_review_meetings(id),kind text not null check(kind in ('guide','feedback')),
 status text not null check(status in ('pending','ready','failed')),result jsonb,source_fingerprint text,request_fingerprint text,
 lease uuid,lease_user uuid,lease_until timestamptz,error text,primary key(meeting_id,kind)
);
alter table public.teacher_review_meetings enable row level security;
alter table public.teacher_meeting_ai enable row level security;
revoke all on public.teacher_review_meetings,public.teacher_meeting_ai from public,anon,authenticated;

create or replace function public.validate_team_feedback(p_feedback jsonb,p_participants text[]) returns void
language plpgsql set search_path='' as $$declare m jsonb;begin
 if p_feedback is null or jsonb_typeof(p_feedback) is distinct from 'object' or jsonb_typeof(p_feedback->'members') is distinct from 'array' or jsonb_typeof(p_feedback->'unresolved') is distinct from 'array' then raise exception 'Invalid team feedback';end if;
 perform public.validate_core_review_points(p_feedback->'shared');
 if jsonb_array_length(p_feedback->'members')>cardinality(p_participants) or (select count(*) from jsonb_array_elements(p_feedback->'members'))<>(select count(distinct x->>'studentId') from jsonb_array_elements(p_feedback->'members') x) then raise exception 'Duplicate or unexpected members';end if;
 for m in select value from jsonb_array_elements(p_feedback->'members') loop
  if m->>'studentId' is null or not (m->>'studentId'=any(p_participants)) then raise exception 'Personal feedback requires a participating student';end if;
  perform public.validate_core_review_points(m);
 end loop;
 if jsonb_array_length(p_feedback->'unresolved')>5 or exists(select 1 from jsonb_array_elements(p_feedback->'unresolved') x where jsonb_typeof(x) is distinct from 'string' or length(trim(x#>>'{}')) not between 1 and 500) then raise exception 'Invalid unresolved attribution';end if;
 -- Strict keys avoid accidental private data being stored inside publishable sections.
 if exists(select 1 from jsonb_object_keys(p_feedback) k where k not in ('shared','members','unresolved')) or exists(select 1 from jsonb_object_keys(p_feedback->'shared') k where k not in ('confirmedProgress','mainIssues','nextSteps')) then raise exception 'Unexpected feedback field';end if;
 for m in select value from jsonb_array_elements(p_feedback->'members') loop
  if exists(select 1 from jsonb_object_keys(m) k where k not in ('studentId','confirmedProgress','mainIssues','nextSteps')) then raise exception 'Unexpected member field';end if;
 end loop;
end $$;

create or replace function public.team_meeting_ai_source(p_meeting_id uuid,p_kind text) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare m public.teacher_review_meetings%rowtype;begin
 select * into m from public.teacher_review_meetings where id=p_meeting_id;if not found then raise exception 'Meeting not found';end if;
 perform public.require_teaching_class(m.block_id);
 if (m.node_snapshot->>'includePreviousBlock')::boolean and m.node_snapshot->>'previousBlockId' is not null then perform public.require_teaching_class((m.node_snapshot->>'previousBlockId')::uuid);end if;
 if p_kind='guide' then return jsonb_build_object('node',m.node_snapshot,'members',m.roster_snapshot,'sources',m.sources);end if;
 if p_kind<>'feedback' then raise exception 'Invalid generation kind';end if;
 return jsonb_build_object('teacherObservation',m.observation,'participants',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(m.roster_snapshot) x where x->>'studentId'=any(m.participants)));
end $$;

create or replace function public.get_teacher_team_meeting(p_meeting_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare m public.teacher_review_meetings%rowtype;begin
 select * into m from public.teacher_review_meetings where id=p_meeting_id;if not found then raise exception 'Meeting not found';end if;
 perform public.require_teaching_class(m.block_id);
 return jsonb_build_object('id',m.id,'blockId',m.block_id,'teamNumber',m.team_number,'node',m.node_snapshot,'members',m.roster_snapshot,'sources',m.sources,
 'participants',m.participants,'observation',m.observation,'meetingDate',m.meeting_date,'feedback',m.feedback,'feedbackObservation',m.feedback_observation,'feedbackParticipants',m.feedback_participants,'feedbackEdited',m.feedback_edited,'version',m.version,'confirmed',m.confirmed,
 'targets',(select coalesce(jsonb_agg(jsonb_build_object('studentId',s->>'studentId','id',r.id,'version',coalesce(r.version,0),'exists',r.id is not null,'hasWork',r.published is not null or length(coalesce(r.draft->>'teacherObservation',''))>0,'currentMember',exists(select 1 from public.student_roster z where z.block_id=m.block_id and z.student_id=s->>'studentId' and z.team_number=m.team_number),'changed',case when exists(select 1 from public.student_roster z where z.block_id=m.block_id and z.student_id=s->>'studentId') then public.teacher_node_review_source(m.block_id,s->>'studentId',m.node_snapshot) is distinct from m.sources->(s->>'studentId') else true end) order by s->>'studentId'),'[]') from jsonb_array_elements(m.roster_snapshot) s left join public.teacher_node_reviews r on r.block_id=m.block_id and r.student_id=s->>'studentId' and r.node_key=m.node_key),
 'jobs',(select coalesce(jsonb_object_agg(g.kind,jsonb_build_object('status',case when g.status='pending' and g.lease_until<now() then 'interrupted' else g.status end,'result',g.result,'current',g.source_fingerprint=md5(public.team_meeting_ai_source(m.id,g.kind)::text),'error',g.error)),'{}') from public.teacher_meeting_ai g where g.meeting_id=m.id));
end $$;

create or replace function public.list_teacher_team_meetings(p_block_id uuid,p_team_number integer default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$begin
 perform public.require_teaching_class(p_block_id);
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'teamNumber',team_number,'nodeKey',node_key,'meetingDate',meeting_date,'version',version,'participants',participants,'confirmed',confirmed) order by created_at desc),'[]') from public.teacher_review_meetings where block_id=p_block_id and (p_team_number is null or team_number=p_team_number));
end $$;

create or replace function public.open_teacher_team_meeting(p_block_id uuid,p_team_number integer,p_node_key text,p_new boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$declare cfg jsonb;n jsonb;members jsonb;src jsonb:='{}';s jsonb;mid uuid;begin
 perform public.require_teaching_class(p_block_id);
 insert into public.studio_review_settings(block_id,config) values(p_block_id,public.default_studio_review_config()) on conflict do nothing;
 select config into cfg from public.studio_review_settings where block_id=p_block_id for update;
 if not p_new then select id into mid from public.teacher_review_meetings where block_id=p_block_id and team_number=p_team_number and node_key=p_node_key order by created_at desc limit 1;if mid is not null then return public.get_teacher_team_meeting(mid);end if;end if;
 select value into n from jsonb_array_elements(cfg->'nodes') where value->>'id'=p_node_key;if n is null then raise exception 'Review node not found';end if;
 n:=n||jsonb_build_object('previousBlockId',case when (n->>'includePreviousBlock')::boolean then cfg->'previousBlockId' else 'null'::jsonb end);
 select jsonb_agg(jsonb_build_object('studentId',student_id,'studentName',full_name) order by full_name,student_id) into members from public.student_roster where block_id=p_block_id and team_number=p_team_number;
 if members is null or jsonb_array_length(members)>20 then raise exception 'Choose a team with between one and twenty members';end if;
 for s in select value from jsonb_array_elements(members) loop src:=src||jsonb_build_object(s->>'studentId',public.teacher_node_review_source(p_block_id,s->>'studentId',n));end loop;
 insert into public.teacher_review_meetings(block_id,team_number,node_key,node_snapshot,roster_snapshot,sources,updated_by) values(p_block_id,p_team_number,p_node_key,n,members,src,auth.uid()) returning id into mid;
 return public.get_teacher_team_meeting(mid);
end $$;

create or replace function public.save_teacher_team_meeting(p_meeting_id uuid,p_version integer,p_draft jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$declare m public.teacher_review_meetings%rowtype;ps text[];fps text[];begin
 select * into m from public.teacher_review_meetings where id=p_meeting_id for update;if not found then raise exception 'Meeting not found';end if;perform public.require_teaching_class(m.block_id);
 if p_version is distinct from m.version then raise exception 'Meeting changed in another window. Reload before saving';end if;
 if p_draft is null or length(p_draft::text)>65000 or jsonb_typeof(p_draft->'participants') is distinct from 'array' or jsonb_typeof(p_draft->'feedbackParticipants') is distinct from 'array' or jsonb_typeof(p_draft->'observation') is distinct from 'string' or length(p_draft->>'observation')>6000 or jsonb_typeof(p_draft->'feedbackObservation') is distinct from 'string' or length(p_draft->>'feedbackObservation')>6000 or jsonb_typeof(p_draft->'feedbackEdited') is distinct from 'boolean' then raise exception 'Invalid meeting draft';end if;
 if p_draft->>'meetingDate' is null or p_draft->>'meetingDate' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Meeting date required';end if;
 select coalesce(array_agg(x#>>'{}'),'{}') into ps from jsonb_array_elements(p_draft->'participants') x;
 select coalesce(array_agg(x#>>'{}'),'{}') into fps from jsonb_array_elements(p_draft->'feedbackParticipants') x;
 if cardinality(ps)<>(select count(distinct x) from unnest(ps) x) or exists(select 1 from unnest(ps||fps) x where not exists(select 1 from jsonb_array_elements(m.roster_snapshot) s where s->>'studentId'=x)) then raise exception 'Invalid participant selection';end if;
 if exists(select 1 from public.student_roster r where r.block_id=m.block_id and r.student_id=any(ps) and r.team_number is distinct from m.team_number) or exists(select 1 from unnest(ps) x where not exists(select 1 from public.student_roster r where r.block_id=m.block_id and r.student_id=x)) then raise exception 'Team membership changed. Start a new meeting';end if;
 perform public.validate_team_feedback(p_draft->'feedback',ps);
 update public.teacher_review_meetings set participants=ps,observation=p_draft->>'observation',meeting_date=(p_draft->>'meetingDate')::date,feedback=p_draft->'feedback',feedback_observation=p_draft->>'feedbackObservation',feedback_participants=fps,feedback_edited=(p_draft->>'feedbackEdited')::boolean,version=version+1,updated_at=now(),updated_by=auth.uid() where id=m.id;
 return public.get_teacher_team_meeting(m.id);
end $$;

create or replace function public.refresh_teacher_team_sources(p_meeting_id uuid,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$declare m public.teacher_review_meetings%rowtype;s jsonb;src jsonb:='{}';begin
 select * into m from public.teacher_review_meetings where id=p_meeting_id for update;if not found then raise exception 'Meeting not found';end if;perform public.require_teaching_class(m.block_id);
 if p_version is distinct from m.version then raise exception 'Meeting changed. Reload before refreshing';end if;
 for s in select value from jsonb_array_elements(m.roster_snapshot) loop src:=src||jsonb_build_object(s->>'studentId',public.teacher_node_review_source(m.block_id,s->>'studentId',m.node_snapshot));end loop;
 update public.teacher_review_meetings set sources=src,version=version+1,updated_at=now(),updated_by=auth.uid() where id=m.id;
 return public.get_teacher_team_meeting(m.id);
end $$;

create or replace function public.claim_team_meeting_ai(p_meeting_id uuid,p_kind text,p_refresh boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$declare m public.teacher_review_meetings%rowtype;g public.teacher_meeting_ai%rowtype;src jsonb;fp text;token uuid;begin
 select * into m from public.teacher_review_meetings where id=p_meeting_id for update;if not found then raise exception 'Meeting not found';end if;perform public.require_teaching_class(m.block_id);
 src:=public.team_meeting_ai_source(m.id,p_kind);fp:=md5(src::text);
 if length(src::text)>65000 then raise exception 'Context is too large; write feedback manually';end if;
 if p_kind='feedback' and (length(trim(m.observation))=0 or cardinality(m.participants)=0) then raise exception 'Select participants and record an observation first';end if;
 insert into public.teacher_meeting_ai(meeting_id,kind,status) values(m.id,p_kind,'failed') on conflict do nothing;
 select * into g from public.teacher_meeting_ai where meeting_id=m.id and kind=p_kind for update;
 if g.status='pending' and g.lease_until>=now() then return jsonb_build_object('state','pending');end if;
 if not coalesce(p_refresh,false) and g.request_fingerprint=fp then
  if g.status='ready' and g.source_fingerprint=fp then return jsonb_build_object('state','ready','result',g.result);end if;
  return jsonb_build_object('state',case when g.status='pending' then 'interrupted' else 'failed' end,'error',g.error);
 end if;
 token:=gen_random_uuid();update public.teacher_meeting_ai set status='pending',request_fingerprint=fp,lease=token,lease_user=auth.uid(),lease_until=now()+interval '90 seconds',error=null where meeting_id=m.id and kind=p_kind;
 return jsonb_build_object('state','claimed','source',src,'lease',token);
end $$;

create or replace function public.finish_team_meeting_ai(p_meeting_id uuid,p_kind text,p_lease uuid,p_result jsonb,p_error text default null) returns boolean
language plpgsql security definer set search_path='' as $$declare m public.teacher_review_meetings%rowtype;g public.teacher_meeting_ai%rowtype;begin
 select * into m from public.teacher_review_meetings where id=p_meeting_id for update;if not found then return false;end if;perform public.require_teaching_class(m.block_id);
 select * into g from public.teacher_meeting_ai where meeting_id=m.id and kind=p_kind for update;
 if not found or g.status<>'pending' or g.lease is distinct from p_lease or g.lease_user is distinct from auth.uid() or g.lease_until<now() then return false;end if;
 if g.request_fingerprint is distinct from md5(public.team_meeting_ai_source(m.id,p_kind)::text) then
  update public.teacher_meeting_ai set status='failed',error='Meeting changed during generation. Organise the latest observation again.',lease=null,lease_user=null,lease_until=null where meeting_id=m.id and kind=p_kind;return false;
 end if;
 if p_error is null then
  if p_kind='feedback' then perform public.validate_team_feedback(p_result,m.participants);
  elsif p_result is null or jsonb_typeof(p_result->'questions') is distinct from 'array' or jsonb_array_length(p_result->'questions')<>3 or exists(select 1 from jsonb_array_elements(p_result->'questions') x where jsonb_typeof(x) is distinct from 'string' or length(trim(x#>>'{}')) not between 1 and 200) then raise exception 'Invalid meeting guide';end if;
 end if;
 update public.teacher_meeting_ai set status=case when p_error is null then 'ready' else 'failed' end,result=case when p_error is null then p_result else result end,source_fingerprint=case when p_error is null then request_fingerprint else source_fingerprint end,error=case when p_error is null then null else 'AI unavailable. Retry explicitly or edit the feedback manually.' end,lease=null,lease_user=null,lease_until=null where meeting_id=m.id and kind=p_kind;
 return true;
end $$;

create or replace function public.publish_teacher_team_members(p_meeting_id uuid,p_version integer,p_targets jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m public.teacher_review_meetings%rowtype;t jsonb;sid text;r public.teacher_node_reviews%rowtype;points jsonb;pub jsonb;src jsonb;personal text;rid uuid;
begin
 select * into m from public.teacher_review_meetings where id=p_meeting_id for update;if not found then raise exception 'Meeting not found';end if;perform public.require_teaching_class(m.block_id);
 if p_version is distinct from m.version then raise exception 'Meeting changed. Reload before confirming';end if;
 if m.feedback_observation is distinct from m.observation or m.feedback_participants is distinct from m.participants then raise exception 'Organise or edit feedback against the latest observation and participants';end if;
 if jsonb_typeof(p_targets) is distinct from 'array' or jsonb_array_length(p_targets) not between 1 and 20 or (select count(*) from jsonb_array_elements(p_targets))<>(select count(distinct x->>'studentId') from jsonb_array_elements(p_targets) x) then raise exception 'Select individual members to confirm';end if;
 for t in select value from jsonb_array_elements(p_targets) order by value->>'studentId' loop
  sid:=t->>'studentId';
  if sid is null or not(sid=any(m.participants)) then raise exception 'Only participating students can be confirmed';end if;
  perform 1 from public.student_roster where block_id=m.block_id and student_id=sid and team_number=m.team_number for share;if not found then raise exception 'Team membership changed';end if;
  select value into points from jsonb_array_elements(m.feedback->'members') where value->>'studentId'=sid;
  if points is null or jsonb_array_length(points->'confirmedProgress')+jsonb_array_length(points->'mainIssues')=0 then raise exception 'Personal observations required; shared work does not confirm individual contribution';end if;
  perform 1 from public.student_session_intakes where student_id=sid and (block_id=m.block_id or block_id=nullif(m.node_snapshot->>'previousBlockId','')::uuid) for share;
  src:=public.teacher_node_review_source(m.block_id,sid,m.node_snapshot);
  if src is distinct from m.sources->sid then raise exception 'Student source changed. Refresh the meeting source snapshot before confirming';end if;
  if exists(select 1 from jsonb_array_elements(coalesce(src->'updates','[]')||coalesce(src->'previousBlockRecords','[]')) x where (x->>'correctionOpen')::boolean) then raise exception 'Wait for student corrections to be reconfirmed';end if;
  rid:=public.open_teacher_node_review(m.block_id,sid,m.node_key);
  select * into r from public.teacher_node_reviews where id=rid for update;
  if r.version is distinct from (t->>'version')::int then raise exception 'Individual review changed. Reload before confirming';end if;
  if (r.published is not null or length(coalesce(r.draft->>'teacherObservation',''))>0) and not coalesce((t->>'replace')::boolean,false) then raise exception 'Confirm replacement of the existing individual review first';end if;
  if r.node_snapshot is distinct from m.node_snapshot then raise exception 'Review node definition differs from this meeting';end if;
  points:=jsonb_build_object('confirmedProgress',points->'confirmedProgress','mainIssues',points->'mainIssues','nextSteps',points->'nextSteps');
  personal:=array_to_string(array(select jsonb_array_elements_text(points->'confirmedProgress') union all select jsonb_array_elements_text(points->'mainIssues') union all select jsonb_array_elements_text(points->'nextSteps')),E'\n');
  pub:=jsonb_build_object('workflow','core.v1','node',m.node_snapshot,'coreReview',points,'teamFeedback',m.feedback->'shared','meetingId',m.id,'teamNumber',m.team_number,'reviewVersion',r.version+1,'publishedAt',now(),'teacherName',coalesce((select display_name from public.teacher_profiles where user_id=auth.uid()),'Teacher'),'sourceVersion',r.source_version+1,'reviewedOn',m.meeting_date);
  insert into public.teacher_node_review_publications(review_id,version,feedback,source_snapshot) values(r.id,r.version+1,pub,src);
  update public.teacher_node_reviews set source_snapshot=src,source_version=source_version+1,draft=jsonb_build_object('workflow','core.v1','meetingDate',m.meeting_date,'teacherObservation',personal,'coreSourceObservation',personal,'coreEdited',true,'coreReview',points),version=version+1,published=pub,updated_at=now(),updated_by=auth.uid() where id=r.id;
  update public.teacher_review_meetings set confirmed=confirmed||jsonb_build_object(sid,jsonb_build_object('reviewId',r.id,'reviewVersion',r.version+1,'meetingVersion',m.version,'publishedAt',now())) where id=m.id;
 end loop;
 update public.teacher_review_meetings set version=version+1,updated_at=now(),updated_by=auth.uid() where id=m.id;
 return public.get_teacher_team_meeting(m.id);
end $$;

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
 'teamMeetings',(select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'teamNumber',m.team_number,'nodeKey',m.node_key,'meetingDate',m.meeting_date,'participants',m.participants,'members',m.roster_snapshot,'confirmed',m.confirmed,'observation',m.observation,'feedback',m.feedback) order by m.created_at desc),'[]') from public.teacher_review_meetings m where m.block_id=p_block_id),
 'legacy',(select coalesce(jsonb_agg(jsonb_build_object('intakeId',i.id,'studentId',i.student_id,'sessionNumber',s.session_number,'published',r.published) order by s.session_number),'[]'::jsonb) from public.intake_teacher_reviews r join public.student_session_intakes i on i.id=r.intake_id join public.studio_sessions s on s.id=i.session_id where i.block_id=p_block_id and r.published is not null));
end $$;


-- Freeze definitions for team meetings as well as existing individual reviews.
create or replace function public.guard_team_meeting_settings() returns trigger language plpgsql set search_path='' as $$begin
 if exists(select 1 from public.teacher_review_meetings m where m.block_id=old.block_id and not exists(select 1 from jsonb_array_elements(new.config->'nodes') n where n->>'id'=m.node_key and n=m.node_snapshot-'previousBlockId')) then raise exception 'Started team review definitions are locked; add a new node instead';end if;
 if exists(select 1 from public.teacher_review_meetings m where m.block_id=old.block_id and (m.node_snapshot->>'includePreviousBlock')::boolean) and new.config->'previousBlockId' is distinct from old.config->'previousBlockId' then raise exception 'Previous-class link is locked for started team meetings';end if;
 return new;
end $$;
drop trigger if exists guard_team_meeting_settings on public.studio_review_settings;
create trigger guard_team_meeting_settings before update on public.studio_review_settings for each row execute function public.guard_team_meeting_settings();

revoke all on function public.validate_team_feedback(jsonb,text[]),public.team_meeting_ai_source(uuid,text),public.guard_team_meeting_settings() from public,anon,authenticated;
revoke all on function public.get_teacher_team_meeting(uuid),public.list_teacher_team_meetings(uuid,integer),public.open_teacher_team_meeting(uuid,integer,text,boolean),public.save_teacher_team_meeting(uuid,integer,jsonb),public.refresh_teacher_team_sources(uuid,integer),public.claim_team_meeting_ai(uuid,text,boolean),public.finish_team_meeting_ai(uuid,text,uuid,jsonb,text),public.publish_teacher_team_members(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.get_teacher_team_meeting(uuid),public.list_teacher_team_meetings(uuid,integer),public.open_teacher_team_meeting(uuid,integer,text,boolean),public.save_teacher_team_meeting(uuid,integer,jsonb),public.refresh_teacher_team_sources(uuid,integer),public.claim_team_meeting_ai(uuid,text,boolean),public.finish_team_meeting_ai(uuid,text,uuid,jsonb,text),public.publish_teacher_team_members(uuid,integer,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
