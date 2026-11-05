-- Acknowledgement applies only to the published version actually read.
begin;
create table if not exists public.intake_teacher_feedback_receipts (
 intake_id uuid not null references public.intake_teacher_reviews(intake_id) on delete cascade,
 review_version integer not null check (review_version>0),
 acknowledged_at timestamptz not null default now(),
 primary key (intake_id, review_version)
);
alter table public.intake_teacher_feedback_receipts enable row level security;
revoke all on public.intake_teacher_feedback_receipts from public,anon,authenticated;

create or replace function public.acknowledge_intake_teacher_feedback(p_intake_id uuid,p_review_version integer) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare published_version integer; receipt timestamptz;
begin
 select (r.published->>'reviewVersion')::integer into published_version
 from public.intake_teacher_reviews r join public.student_session_intakes i on i.id=r.intake_id
 where i.id=p_intake_id and i.auth_user_id=auth.uid() and r.published is not null
 and exists(select 1 from public.student_accounts a join public.student_roster roster on roster.student_id=a.student_id
 where a.auth_user_id=auth.uid() and a.student_id=i.student_id and a.status='activated' and roster.block_id=i.block_id)
 for share of r;
 if not found then raise exception using errcode='42501', message='Published feedback is not available';end if;
 if p_review_version is distinct from published_version then raise exception 'Feedback was updated. Refresh it before acknowledging.';end if;
 insert into public.intake_teacher_feedback_receipts(intake_id,review_version) values(p_intake_id,p_review_version) on conflict do nothing;
 select acknowledged_at into receipt from public.intake_teacher_feedback_receipts where intake_id=p_intake_id and review_version=p_review_version;
 return receipt;
end $$;
revoke all on function public.acknowledge_intake_teacher_feedback(uuid,integer) from public,anon,authenticated;
grant execute on function public.acknowledge_intake_teacher_feedback(uuid,integer) to authenticated;

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
 'privateNote',coalesce(r.private_note,''),'published',r.published,'publishedAcknowledgedAt',(select a.acknowledged_at from public.intake_teacher_feedback_receipts a where a.intake_id=i.id and a.review_version=(r.published->>'reviewVersion')::integer),'updatedAt',r.updated_at,'history',history);
end $$;

create or replace function public.get_my_intake_teacher_feedback() returns jsonb
language plpgsql stable security definer set search_path='' as $$begin
 return (select coalesce(jsonb_agg(jsonb_build_object('intakeId',i.id,'sessionNumber',s.session_number,'sessionTitle',coalesce(s.curriculum_focus,s.title),'feedback',r.published,'acknowledgedAt',(select a.acknowledged_at from public.intake_teacher_feedback_receipts a where a.intake_id=i.id and a.review_version=(r.published->>'reviewVersion')::integer)) order by s.session_date desc,s.session_number desc),'[]'::jsonb)
 from public.student_session_intakes i join public.intake_teacher_reviews r on r.intake_id=i.id
 join public.studio_sessions s on s.id=i.session_id
 where i.auth_user_id=auth.uid() and r.published is not null
 and exists(select 1 from public.student_accounts a join public.student_roster roster on roster.student_id=a.student_id
 where a.auth_user_id=auth.uid() and a.student_id=i.student_id and a.status='activated' and roster.block_id=i.block_id));
end $$;
revoke all on function public.get_intake_teacher_review(uuid),public.get_my_intake_teacher_feedback() from public,anon,authenticated;
grant execute on function public.get_intake_teacher_review(uuid),public.get_my_intake_teacher_feedback() to authenticated;
notify pgrst,'reload schema';
commit;
