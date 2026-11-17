-- Student-facing names for the published presentation order; no change to its order.
begin;
create or replace function public.presentation_team_member_names(p_block_id uuid,p_team_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(r.full_name order by lower(r.full_name),r.student_id),'[]'::jsonb)
 from public.student_roster r join public.teams t on t.block_id=r.block_id and t.team_number=r.team_number
 where r.block_id=p_block_id and t.id=p_team_id
$$;
revoke all on function public.presentation_team_member_names(uuid,uuid) from public,anon,authenticated;

create or replace function public.publish_presentation_order(p_block_id uuid,p_team_ids uuid[]) returns jsonb
language plpgsql security definer set search_path='' as $$
declare snapshot jsonb;
begin
 perform public.require_teaching_class(p_block_id);
 perform public.save_presentation_order_draft(p_block_id,p_team_ids);
 -- Names/counts belong to the publication, not a later roster edit.
 perform 1 from public.student_roster where block_id=p_block_id for share;
 select jsonb_agg(jsonb_build_object('position',ordered.ordinality,'teamId',t.id,'teamName',concat('Team ',t.team_number),'projectName',p.title,
 'members',public.presentation_team_member_names(p_block_id,t.id),'memberCount',jsonb_array_length(public.presentation_team_member_names(p_block_id,t.id))) order by ordered.ordinality)
 into snapshot
 from unnest(p_team_ids) with ordinality ordered(team_id,ordinality) join public.teams t on t.id=ordered.team_id and t.block_id=p_block_id
 left join public.team_project_assignments a on a.team_id=t.id left join public.projects p on p.id=a.project_id;
 update public.presentation_orders set published_snapshot=snapshot,published_at=now() where block_id=p_block_id;
 return coalesce(snapshot,'[]'::jsonb);
end $$;

create or replace function public.get_my_published_presentation_order() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare bid uuid;my_team integer;opened boolean;snapshot jsonb;entry jsonb;tid uuid;team_no integer;names jsonb;result jsonb:='[]';
begin
 select r.block_id,r.team_number into bid,my_team
 from public.student_accounts a join public.student_roster r on r.student_id=a.student_id join public.teaching_blocks b on b.id=r.block_id
 where a.auth_user_id=auth.uid() and a.status='activated' and b.status='active'
 order by b.starts_on desc nulls last,b.created_at desc,b.id limit 1;
 if bid is null then raise exception 'Active student block is not available';end if;
 select is_open into opened from public.weekly_activity_settings where block_id=bid and week_number=4;
 if not coalesce(opened,false) then return '[]'::jsonb;end if;
 select published_snapshot into snapshot from public.presentation_orders where block_id=bid and published_at is not null;
 if snapshot is null then return '[]'::jsonb;end if;
 if jsonb_typeof(snapshot) is distinct from 'array' then raise exception 'Published presentation order is invalid';end if;
 for entry in select value from jsonb_array_elements(snapshot) loop
  tid:=null;team_no:=null;
  if coalesce(entry->>'teamId','')~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
   select id,team_number into tid,team_no from public.teams where block_id=bid and id=(entry->>'teamId')::uuid;
  else
   select id,team_number into tid,team_no from public.teams where block_id=bid and concat('Team ',team_number)=entry->>'teamName';
  end if;
  if jsonb_typeof(entry->'members')='array' and not exists(select 1 from jsonb_array_elements(entry->'members') n where jsonb_typeof(n) is distinct from 'string' or length(trim(n#>>'{}')) not between 1 and 100) then
   names:=entry->'members';
  elsif tid is not null then
   -- Backward-compatible read enrichment; do not republish or rewrite legacy snapshots.
   names:=public.presentation_team_member_names(bid,tid);
  else names:='[]'::jsonb;end if;
  result:=result||jsonb_build_array(jsonb_build_object('position',entry->'position','teamName',entry->>'teamName','projectName',entry->>'projectName',
   'members',names,'memberCount',jsonb_array_length(names),'isMyTeam',coalesce(team_no=my_team,false)));
 end loop;
 return result;
end $$;
revoke all on function public.publish_presentation_order(uuid,uuid[]),public.get_my_published_presentation_order() from public,anon,authenticated;
grant execute on function public.publish_presentation_order(uuid,uuid[]),public.get_my_published_presentation_order() to authenticated;
notify pgrst,'reload schema';
commit;
