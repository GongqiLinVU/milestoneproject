-- Keep account-ID foreign keys checked, but allow an atomic identity correction.
do $$
declare c record;
begin
 for c in select conrelid::regclass rel,conname from pg_constraint where contype='f' and confrelid='public.student_accounts'::regclass
 loop execute format('alter table %s alter constraint %I deferrable initially immediate',c.rel,c.conname); end loop;
end $$;

create table if not exists public.student_id_corrections(
 id uuid primary key default gen_random_uuid(),
 old_student_id text not null,new_student_id text not null,
 changed_by uuid not null,changed_at timestamptz not null default now(),
 reason text not null,auth_user_id uuid
);
alter table public.student_id_corrections enable row level security;
revoke all on public.student_id_corrections from anon,authenticated;

create or replace function public.correct_student_id(p_old_id text,p_new_id text,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 old_id text:=lower(trim(coalesce(p_old_id,'')));
 new_id text:=lower(trim(coalesce(p_new_id,'')));
 linked_user uuid; c record; found_target boolean;
begin
 if not public.is_superadmin() then raise exception 'Administrator access required'; end if;
 if old_id !~ '^[a-z0-9_-]{3,40}$' or new_id !~ '^[a-z0-9_-]{3,40}$' or old_id=new_id then raise exception 'Enter different valid Student IDs'; end if;
 if char_length(trim(coalesce(p_reason,''))) not between 5 and 500 then raise exception 'A correction reason (5–500 characters) is required'; end if;
 -- Serialize corrections and prevent enrolment/provisioning writes during validation.
 lock table public.student_accounts,public.student_roster in share row exclusive mode;
 if not exists(select 1 from public.student_roster where student_id=old_id) then raise exception 'Original Student ID was not found'; end if;
 -- Check every live textual identity column, including legacy submissions.
 for c in select table_name,column_name from information_schema.columns
   where table_schema='public' and (column_name='student_id' or column_name like '%\_student_id' escape '\')
    and data_type in ('text','character varying') and table_name<>'student_id_corrections'
    and table_name in(select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE')
 loop
  execute format('select exists(select 1 from public.%I where lower(trim(%I))=$1)',c.table_name,c.column_name) into found_target using new_id;
  if found_target then raise exception 'Correct Student ID already exists. Review duplicate records before proceeding'; end if;
 end loop;
 if exists(select 1 from auth.users where lower(trim(raw_user_meta_data->>'student_id'))=new_id) then
  raise exception 'Correct Student ID already exists in an Auth account'; end if;
 select auth_user_id into linked_user from public.student_accounts where student_id=old_id;
 set constraints all deferred;
 for c in select table_name,column_name from information_schema.columns
   where table_schema='public' and (column_name='student_id' or column_name like '%\_student_id' escape '\')
    and data_type in ('text','character varying') and table_name<>'student_id_corrections'
    and table_name in(select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE')
 loop
  execute format('update public.%I set %I=$1 where %I=$2',c.table_name,c.column_name,c.column_name) using new_id,old_id;
 end loop;
 if linked_user is not null then
  update auth.users set raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb)||jsonb_build_object('student_id',new_id)
   where id=linked_user;
 end if;
 insert into public.student_id_corrections(old_student_id,new_student_id,changed_by,reason,auth_user_id)
 values(old_id,new_id,auth.uid(),trim(p_reason),linked_user);
 set constraints all immediate;
 return jsonb_build_object('studentId',new_id,'accountPreserved',linked_user is not null);
end $$;
revoke all on function public.correct_student_id(text,text,text) from public,anon;
grant execute on function public.correct_student_id(text,text,text) to authenticated;
