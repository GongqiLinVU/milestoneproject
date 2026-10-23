begin;
-- Initialize old trial references only on first installation, never on rerun.
do $$begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='teaching_blocks' and column_name='intake_ai_budget_ceiling_usd') then
  alter table public.teaching_blocks add column intake_ai_budget_ceiling_usd numeric(12,6) not null default 25 check(intake_ai_budget_ceiling_usd between 0 and 1000);
  update public.teaching_blocks b set intake_ai_budget_usd=10
  where b.intake_ai_budget_usd in (0,1) and not exists(select 1 from public.session_intake_ai_usage u where u.block_id=b.id);
  update public.teaching_blocks set intake_ai_budget_ceiling_usd=greatest(intake_ai_budget_ceiling_usd,intake_ai_budget_usd);
 end if;
end $$;
alter table public.teaching_blocks alter column intake_ai_budget_usd set default 10;
create or replace function public.guard_class_ai_budget() returns trigger language plpgsql set search_path='' as $$begin
 if current_user not in ('postgres','service_role') and not public.is_superadmin() then
  if tg_op='INSERT' then
   if new.intake_ai_budget_ceiling_usd<>25 then raise exception using errcode='42501',message='Only a super administrator can change the AI budget ceiling';end if;
  elsif new.intake_ai_budget_ceiling_usd is distinct from old.intake_ai_budget_ceiling_usd then raise exception using errcode='42501',message='Only a super administrator can change the AI budget ceiling';end if;
 end if;
 if new.intake_ai_budget_usd>new.intake_ai_budget_ceiling_usd then raise exception using errcode='23514',message='Budget exceeds the administrator ceiling';end if;
 return new;
end $$;
revoke all on function public.guard_class_ai_budget() from public,anon,authenticated;
drop trigger if exists guard_class_ai_budget on public.teaching_blocks;
create trigger guard_class_ai_budget before insert or update on public.teaching_blocks for each row execute function public.guard_class_ai_budget();
create or replace function public.get_teacher_session_ai_usage(p_block_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare b public.teaching_blocks%rowtype; v_summary jsonb;
begin
  perform public.require_teaching_class(p_block_id);
 if not public.is_teacher() then raise exception 'Teacher access required'; end if;
 select * into b from public.teaching_blocks where id=p_block_id;
 if b.id is null then raise exception 'Unknown Block'; end if;
 select jsonb_build_object('attempts',count(*),'reportedUsd',coalesce(sum(observed_usd),0),
 'chargedUsd',coalesce(sum(charged_usd),0),'unresolvedAttempts',count(*) filter(where status<>'settled'),
 'reconciliationRequired',coalesce(bool_or(reconciliation_required),false)) into v_summary
 from public.session_intake_ai_usage where block_id=b.id;
 return v_summary||jsonb_build_object('budgetUsd',b.intake_ai_budget_usd,'attemptLimit',b.intake_ai_attempt_limit,'budgetCeilingUsd',b.intake_ai_budget_ceiling_usd,'canManageBudgetCeiling',public.is_superadmin(),'rosterSize',(select count(*) from public.student_roster where block_id=b.id));
end; $$;

commit;
