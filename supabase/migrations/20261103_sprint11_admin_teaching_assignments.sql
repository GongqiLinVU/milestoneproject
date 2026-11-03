-- Existing administrators can teach without creating a second Auth identity.
create or replace function public.get_teacher_administration() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not public.is_superadmin() then raise exception using errcode='42501',message='Administrator access required';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object(
 'userId',u.id,'name',coalesce(nullif(p.display_name,''),u.email),'email',u.email,
 'isSuperadmin',a.user_id is not null,'active',case when a.user_id is not null then true else p.active end,
 'mustChangePassword',case when a.user_id is not null then false else p.must_change_password end,
 'classIds',(select coalesce(jsonb_agg(m.class_id),'[]'::jsonb) from public.teacher_class_memberships m where m.user_id=u.id)) order by coalesce(p.display_name,u.email)),'[]'::jsonb)
 from auth.users u left join public.teacher_profiles p on p.user_id=u.id
 left join public.platform_administrators a on a.user_id=u.id
 where p.user_id is not null or a.user_id is not null);
end $$;

-- Membership only: never changes roles, profiles, passwords or other classes.
create or replace function public.set_teacher_class_membership(p_user_id uuid,p_class_id uuid,p_assigned boolean) returns void language plpgsql security definer set search_path='' as $$begin
 if not public.is_superadmin() then raise exception using errcode='42501',message='Administrator access required';end if;
 if p_assigned is null then raise exception 'Assignment choice required';end if;
 if not exists(select 1 from public.teaching_blocks where id=p_class_id and status<>'archived') then raise exception 'Choose a current class';end if;
 if not exists(select 1 from public.platform_administrators where user_id=p_user_id) then
  if not exists(select 1 from public.teacher_profiles p join auth.users u on u.id=p.user_id where p.user_id=p_user_id and u.raw_app_meta_data->>'role'='teacher' and (not p_assigned or p.active)) then raise exception 'Enabled teacher account required';end if;
 end if;
 if p_assigned then
  insert into public.teacher_class_memberships(class_id,user_id) values(p_class_id,p_user_id) on conflict do nothing;
 else delete from public.teacher_class_memberships where class_id=p_class_id and user_id=p_user_id;
 end if;
end $$;
revoke all on function public.set_teacher_class_membership(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_teacher_class_membership(uuid,uuid,boolean) to authenticated,service_role;

-- Repair only the teaching association explicitly confirmed by Joseph.
-- Does not infer teaching assignments for other administrators or classes.
insert into public.teacher_class_memberships(class_id,user_id)
select b.id,a.user_id from public.platform_administrators a
join auth.users u on u.id=a.user_id
cross join public.teaching_blocks b
where lower(u.email)='gongqi.lin@vu.edu.au' and b.course_code='NIT3004'
and b.academic_year=2026 and b.block_code='2B4' and b.class_code='C1' and b.status='active'
on conflict do nothing;
