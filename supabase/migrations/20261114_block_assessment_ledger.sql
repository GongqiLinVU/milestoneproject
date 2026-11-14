-- Configurable, teacher-only marks ledger. No automated assessment or student publication.
begin;
create table if not exists public.assessment_templates(
 id text primary key,version integer not null,title text not null,config jsonb not null
);
insert into public.assessment_templates(id,version,title,config) values('nit3004.v1',1,'NIT3004 Assessment','{"version": 1, "name": "NIT3004 Assessment", "items": [{"id": "progress_report", "label": "Progress report", "maxScore": 10}, {"id": "final_report", "label": "Final report", "commentEnabled": true, "children": [{"id": "code", "label": "Code", "maxScore": 25}, {"id": "technical_document", "label": "Technical document", "maxScore": 30}, {"id": "user_manual", "label": "User manual", "maxScore": 5}, {"id": "peer_review", "label": "Peer Review", "maxScore": 5}, {"id": "poster", "label": "Poster", "maxScore": 5}]}, {"id": "presentation", "label": "Presentation", "maxScore": 20}]}'::jsonb) on conflict(id) do nothing;
create table if not exists public.class_assessment_plans(
 block_id uuid primary key references public.teaching_blocks(id) on delete restrict,
 config jsonb not null,version integer not null default 1,updated_at timestamptz not null default now(),updated_by uuid not null
);
create table if not exists public.assessment_records(
 id uuid primary key default gen_random_uuid(),block_id uuid not null references public.class_assessment_plans(block_id) on delete restrict,
 roster_id uuid not null references public.student_roster(id) on delete restrict,
 version integer not null default 0,comments jsonb not null default '{}',updated_at timestamptz not null default now(),updated_by uuid not null,
 unique(block_id,roster_id)
);
create table if not exists public.assessment_marks(
 record_id uuid not null references public.assessment_records(id) on delete restrict,item_id text not null,score numeric(12,2),primary key(record_id,item_id)
);
create table if not exists public.assessment_audit(
 id uuid primary key default gen_random_uuid(),block_id uuid not null references public.teaching_blocks(id),record_id uuid references public.assessment_records(id),
 changed_at timestamptz not null default now(),changed_by uuid not null,before_value jsonb,after_value jsonb not null
);
alter table public.assessment_templates enable row level security;
alter table public.class_assessment_plans enable row level security;
alter table public.assessment_records enable row level security;
alter table public.assessment_marks enable row level security;
alter table public.assessment_audit enable row level security;
revoke all on public.assessment_templates,public.class_assessment_plans,public.assessment_records,public.assessment_marks,public.assessment_audit from public,anon,authenticated;

create or replace function public.assessment_nodes(p_config jsonb) returns table(node jsonb,parent_id text,depth integer)
language sql immutable set search_path='' as $$
 with recursive nodes(node,parent_id,depth) as (
 select v,null::text,1 from jsonb_array_elements(p_config->'items') v
 union all
 select v,n.node->>'id',n.depth+1 from nodes n cross join lateral jsonb_array_elements(n.node->'children') v where n.depth<4
 ) select * from nodes;
$$;
create or replace function public.validate_assessment_plan(p_config jsonb) returns void
language plpgsql immutable set search_path='' as $$
declare n record;ids text[]:=array[]::text[];total numeric:=0;cnt integer:=0;
begin
 if jsonb_typeof(p_config) is distinct from 'object' or jsonb_typeof(p_config->'items') is distinct from 'array' or length(p_config::text)>20000
 or jsonb_typeof(p_config->'name') is distinct from 'string' or length(trim(p_config->>'name')) not between 1 and 120
 or jsonb_typeof(p_config->'version') is distinct from 'number' or (p_config->>'version')::numeric<1 or (p_config->>'version')::numeric<>trunc((p_config->>'version')::numeric)
 then raise exception 'Invalid assessment structure';end if;
 if jsonb_array_length(p_config->'items') not between 1 and 20 then raise exception 'Assessment needs 1 to 20 groups';end if;
 for n in select * from public.assessment_nodes(p_config) loop
  cnt:=cnt+1;
  if cnt>60 or jsonb_typeof(n.node) is distinct from 'object' or coalesce(n.node->>'id','')!~'^[a-z][a-z0-9_]{0,59}$' or n.node->>'id'=any(ids)
   or jsonb_typeof(n.node->'label') is distinct from 'string' or length(trim(n.node->>'label')) not between 1 and 120 then raise exception 'Invalid or duplicate assessment item';end if;
  ids:=array_append(ids,n.node->>'id');
  if n.node ? 'commentEnabled' and jsonb_typeof(n.node->'commentEnabled') is distinct from 'boolean' then raise exception 'Invalid comment setting';end if;
  if n.node ? 'children' then
   if n.depth>=3 or jsonb_typeof(n.node->'children') is distinct from 'array' or jsonb_array_length(n.node->'children') not between 1 and 20 or n.node ? 'maxScore' then raise exception 'Invalid assessment group';end if;
  else
   if jsonb_typeof(n.node->'maxScore') is distinct from 'number' then raise exception 'Leaf item needs a maximum';end if;
   if (n.node->>'maxScore')::numeric<=0 or (n.node->>'maxScore')::numeric>1000 or scale((n.node->>'maxScore')::numeric)>2 then raise exception 'Invalid assessment maximum';end if;
   total:=total+(n.node->>'maxScore')::numeric;
  end if;
 end loop;
 if total<=0 or total>10000 then raise exception 'Invalid total maximum';end if;
end $$;

create or replace function public.get_assessment_ledger(p_block_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform public.require_teaching_class(p_block_id);
 return jsonb_build_object('plan',(select config from public.class_assessment_plans where block_id=p_block_id),
 'planVersion',coalesce((select version from public.class_assessment_plans where block_id=p_block_id),0),
 'locked',exists(select 1 from public.assessment_records where block_id=p_block_id),
 'templates',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'config',config)),'[]') from public.assessment_templates),
 'rows',(select coalesce(jsonb_agg(jsonb_build_object('rosterId',r.id,'studentId',r.student_id,'name',r.full_name,'team',r.team_number,
 'version',coalesce(a.version,0),'comments',coalesce(a.comments,'{}'),
 'scores',coalesce((select jsonb_object_agg(m.item_id,m.score) from public.assessment_marks m where m.record_id=a.id),'{}')) order by r.team_number nulls last,r.full_name),'[]')
 from public.student_roster r left join public.assessment_records a on a.roster_id=r.id and a.block_id=r.block_id where r.block_id=p_block_id));
end $$;

create or replace function public.set_assessment_plan(p_block_id uuid,p_expected_version integer,p_config jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare old public.class_assessment_plans%rowtype;
begin
 perform public.require_teaching_class(p_block_id);
 -- Serialize configuration changes against first grade creation.
 perform 1 from public.teaching_blocks where id=p_block_id for update;
 select * into old from public.class_assessment_plans where block_id=p_block_id for update;
 if p_expected_version is distinct from coalesce(old.version,0) then raise exception 'Assessment structure changed. Reload before editing';end if;
 if exists(select 1 from public.assessment_records where block_id=p_block_id) then raise exception 'Assessment structure is locked after marking begins. Use a new version in a later class';end if;
 perform public.validate_assessment_plan(p_config);
 insert into public.class_assessment_plans(block_id,config,updated_by) values(p_block_id,p_config,auth.uid())
 on conflict(block_id) do update set config=excluded.config,version=class_assessment_plans.version+1,updated_at=now(),updated_by=auth.uid();
 insert into public.assessment_audit(block_id,changed_by,before_value,after_value) values(p_block_id,auth.uid(),old.config,p_config);
 return public.get_assessment_ledger(p_block_id);
end $$;

create or replace function public.save_assessment_record(p_block_id uuid,p_roster_id uuid,p_expected_version integer,p_scores jsonb,p_comments jsonb default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cfg jsonb;a public.assessment_records%rowtype;entry record;maximum numeric;comment jsonb;old_scores jsonb;next_comments jsonb;old_comments jsonb;
begin
 perform public.require_teaching_class(p_block_id);
 perform 1 from public.teaching_blocks where id=p_block_id for update;
 if not exists(select 1 from public.student_roster where id=p_roster_id and block_id=p_block_id) then raise exception 'Student is not enrolled in this class';end if;
 select config into cfg from public.class_assessment_plans where block_id=p_block_id;
 if cfg is null then raise exception 'Configure assessment before entering marks';end if;
 if jsonb_typeof(p_scores) is distinct from 'object' or length(p_scores::text)>20000 then raise exception 'Invalid marks';end if;
 for entry in select * from jsonb_each(p_scores) loop
  select (node->>'maxScore')::numeric into maximum from public.assessment_nodes(cfg) where node->>'id'=entry.key and not(node ? 'children');
  if maximum is null then raise exception 'Unknown or grouped assessment item: %',entry.key;end if;
  if entry.value<>'null'::jsonb then
   if jsonb_typeof(entry.value)<>'number' then raise exception 'Score must be numeric or blank';end if;
   if entry.value::text::numeric<0 or entry.value::text::numeric>maximum or scale(entry.value::text::numeric)>2 then raise exception 'Score outside allowed range or precision';end if;
  end if;
 end loop;
 if p_comments is not null then
  if jsonb_typeof(p_comments) is distinct from 'object' or length(p_comments::text)>80000 then raise exception 'Invalid comments';end if;
  for entry in select * from jsonb_each(p_comments) loop
   if not exists(select 1 from public.assessment_nodes(cfg) where node->>'id'=entry.key and node->'commentEnabled'='true'::jsonb) then raise exception 'Comments are not enabled for this item';end if;
   comment:=entry.value;
   if jsonb_typeof(comment) is distinct from 'object' or jsonb_typeof(comment->'notes') is distinct from 'string' or length(comment->>'notes')>6000
   or jsonb_typeof(comment->'feedback') is distinct from 'string' or length(comment->>'feedback')>6000
   or jsonb_typeof(comment->'aiDraft') is distinct from 'string' or length(comment->>'aiDraft')>6000
   or jsonb_typeof(comment->'confirmed') is distinct from 'boolean' then raise exception 'Invalid comment fields';end if;
   if comment->'confirmed'='true'::jsonb and length(trim(comment->>'feedback'))=0 then raise exception 'Write feedback before confirming';end if;
  end loop;
 end if;
 select * into a from public.assessment_records where block_id=p_block_id and roster_id=p_roster_id for update;
 if p_expected_version is distinct from coalesce(a.version,0) then raise exception 'Marks changed in another window. Your edits are preserved; reload and reconcile';end if;
 old_comments:=coalesce(a.comments,'{}'::jsonb);
 old_scores:=coalesce((select jsonb_object_agg(item_id,score) from public.assessment_marks where record_id=a.id),'{}'::jsonb);
 if p_comments is null then next_comments:=coalesce(a.comments,'{}');else
  select coalesce(jsonb_object_agg(key,jsonb_build_object('notes',value->>'notes','feedback',value->>'feedback','aiDraft',value->>'aiDraft','confirmed',value->'confirmed')),'{}') into next_comments from jsonb_each(p_comments);
 end if;
 if a.id is null then
  insert into public.assessment_records(block_id,roster_id,updated_by) values(p_block_id,p_roster_id,auth.uid()) returning * into a;
 end if;
 for entry in select * from jsonb_each(p_scores) loop
  insert into public.assessment_marks(record_id,item_id,score) values(a.id,entry.key,case when entry.value='null'::jsonb then null else entry.value::text::numeric end)
  on conflict(record_id,item_id) do update set score=excluded.score;
 end loop;
 update public.assessment_records set comments=next_comments,version=version+1,updated_by=auth.uid(),updated_at=now() where id=a.id returning * into a;
 insert into public.assessment_audit(block_id,record_id,changed_by,before_value,after_value) values(p_block_id,a.id,auth.uid(),
 jsonb_build_object('version',a.version-1,'scores',old_scores,'comments',old_comments),
 jsonb_build_object('version',a.version,'scores',old_scores||p_scores,'comments',next_comments));
 return jsonb_build_object('version',a.version,'updatedAt',a.updated_at);
end $$;

create or replace function public.get_assessment_history(p_block_id uuid,p_roster_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform public.require_teaching_class(p_block_id);
 return (select coalesce(jsonb_agg(to_jsonb(x) order by x.changed_at desc),'[]') from (
 select h.changed_at,h.changed_by,h.before_value,h.after_value from public.assessment_audit h join public.assessment_records a on a.id=h.record_id
 where h.block_id=p_block_id and a.roster_id=p_roster_id order by h.changed_at desc limit 50) x);
end $$;

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
 return jsonb_build_object('assessment',item,'teacherMarkingNotes',coalesce(notes,''),'sessions',history);
end $$;
-- All access goes through class-authorized RPCs. No table SELECTs granted to students.
revoke all on function public.assessment_nodes(jsonb),public.validate_assessment_plan(jsonb) from public,anon,authenticated;
revoke all on function public.get_assessment_ledger(uuid),public.set_assessment_plan(uuid,integer,jsonb),public.save_assessment_record(uuid,uuid,integer,jsonb,jsonb),public.get_assessment_history(uuid,uuid),public.get_assessment_feedback_context(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.get_assessment_ledger(uuid),public.set_assessment_plan(uuid,integer,jsonb),public.save_assessment_record(uuid,uuid,integer,jsonb,jsonb),public.get_assessment_history(uuid,uuid),public.get_assessment_feedback_context(uuid,uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
