-- Optional reading checks are not code verification, marks or formal teacher-node decisions.
begin;
create table if not exists public.session_teacher_checks(
 intake_id uuid primary key references public.student_session_intakes(id) on delete restrict,
 version integer not null check(version>0),summary_revision integer not null check(summary_revision>0),
 level text check(level in ('good','satisfactory','needs_attention')),
 comment text not null default '' check(length(comment)<=2000),
 checked_at timestamptz not null default now(),checked_by uuid not null references auth.users(id),teacher_name text not null
);
create table if not exists public.session_teacher_check_events(
 intake_id uuid not null references public.student_session_intakes(id) on delete restrict,
 version integer not null,summary_revision integer not null,
 level text check(level in ('good','satisfactory','needs_attention')),
 comment text not null check(length(comment)<=2000),checked_at timestamptz not null,checked_by uuid not null references auth.users(id),teacher_name text not null,
 primary key(intake_id,version)
);
alter table public.session_teacher_checks enable row level security;
alter table public.session_teacher_check_events enable row level security;
revoke all on public.session_teacher_checks,public.session_teacher_check_events from public,anon,authenticated;

create or replace function public.get_session_teacher_check(p_intake_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare i public.student_session_intakes%rowtype;c public.session_teacher_checks%rowtype;
begin
 select * into i from public.student_session_intakes where id=p_intake_id;
 if not found then raise exception 'Intake not found';end if;
 if i.auth_user_id is distinct from auth.uid() then perform public.require_teaching_class(i.block_id);end if;
 select * into c from public.session_teacher_checks where intake_id=i.id;
 return jsonb_build_object('version',coalesce(c.version,0),'summaryRevision',i.summary_revision,'correctionOpen',i.correction_opened_at is not null,
 'check',case when c.intake_id is null then null else jsonb_build_object('version',c.version,'summaryRevision',c.summary_revision,'level',c.level,'comment',c.comment,'checkedAt',c.checked_at,'teacherName',c.teacher_name,'current',c.summary_revision=i.summary_revision and i.correction_opened_at is null) end,
 'history',(select coalesce(jsonb_agg(jsonb_build_object('version',e.version,'summaryRevision',e.summary_revision,'level',e.level,'comment',e.comment,'checkedAt',e.checked_at,'teacherName',e.teacher_name) order by e.version desc),'[]'::jsonb) from (select * from public.session_teacher_check_events where intake_id=i.id order by version desc limit 20) e));
end $$;

create or replace function public.mark_session_teacher_check(p_intake_id uuid,p_version integer,p_summary_revision integer,p_level text default null,p_comment text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare i public.student_session_intakes%rowtype;c public.session_teacher_checks%rowtype;v integer;n text;checked timestamptz:=now();notes text:=trim(coalesce(p_comment,''));
begin
 -- Same lock order as summary correction: intake first, then its dependent teacher state.
 select * into i from public.student_session_intakes where id=p_intake_id for update;
 if not found then raise exception 'Intake not found';end if;perform public.require_teaching_class(i.block_id);
 if p_summary_revision is distinct from i.summary_revision then raise exception 'Student summary changed. Reload before checking this version';end if;
 if i.correction_opened_at is not null then raise exception 'Wait for the student to reconfirm their summary before checking';end if;
 if p_level is not null and p_level not in ('good','satisfactory','needs_attention') then raise exception 'Choose a supported feedback level';end if;
 if length(coalesce(p_comment,''))>2000 then raise exception 'Keep the optional comment within 2000 characters';end if;
 select * into c from public.session_teacher_checks where intake_id=i.id for update;
 if p_version is distinct from coalesce(c.version,0) then raise exception 'Teacher check changed in another window. Reload before saving';end if;
 v:=coalesce(c.version,0)+1;
 select coalesce(display_name,'Teacher') into n from public.teacher_profiles where user_id=auth.uid();n:=coalesce(n,'Teacher');
 insert into public.session_teacher_checks(intake_id,version,summary_revision,level,comment,checked_at,checked_by,teacher_name)
 values(i.id,v,i.summary_revision,p_level,notes,checked,auth.uid(),n)
 on conflict(intake_id) do update set version=excluded.version,summary_revision=excluded.summary_revision,level=excluded.level,comment=excluded.comment,checked_at=excluded.checked_at,checked_by=excluded.checked_by,teacher_name=excluded.teacher_name;
 insert into public.session_teacher_check_events(intake_id,version,summary_revision,level,comment,checked_at,checked_by,teacher_name)
 values(i.id,v,i.summary_revision,p_level,notes,checked,auth.uid(),n);
 return public.get_session_teacher_check(i.id);
end $$;

create or replace function public.get_teacher_session_progress_states(p_session_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform public.require_session_class(p_session_id);
 return (select coalesce(jsonb_agg(jsonb_build_object('intakeId',i.id,'summaryRevision',i.summary_revision,'correctionOpen',i.correction_opened_at is not null,
 'checkRevision',c.summary_revision,'checkCurrent',coalesce(c.summary_revision=i.summary_revision and i.correction_opened_at is null,false),'checkLevel',c.level,
 'aiStatus',case when i.correction_opened_at is not null then 'paused' when not coalesce((cfg.config->>'sessionAI')::boolean,true) then 'disabled'
 when g.kind is null then 'empty' when g.status='pending' and g.lease_until<now() then 'interrupted'
 when g.status='ready' and g.source_fingerprint is distinct from public.studio_review_ai_fingerprint(jsonb_build_object('studentRecord',i.student_record,'summaryRevision',i.summary_revision),'session_check') then 'stale'
 else g.status end) order by i.id),'[]'::jsonb)
 from public.student_session_intakes i left join public.session_teacher_checks c on c.intake_id=i.id
 left join public.studio_review_ai g on g.intake_id=i.id and g.kind='session_check'
 left join public.studio_review_settings cfg on cfg.block_id=i.block_id where i.session_id=p_session_id);
end $$;
revoke all on function public.get_session_teacher_check(uuid),public.mark_session_teacher_check(uuid,integer,integer,text,text),public.get_teacher_session_progress_states(uuid) from public,anon,authenticated;
grant execute on function public.get_session_teacher_check(uuid),public.mark_session_teacher_check(uuid,integer,integer,text,text),public.get_teacher_session_progress_states(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
