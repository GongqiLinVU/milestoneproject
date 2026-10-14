-- REVIEW BEFORE EXECUTION. Applies only after the AI02 identity migration.
-- Evidence: session-intake-debug-S5-2.json, event 2026-10-14T21:34:16.735Z,
-- provider request req_160ef7ed21d94cbdb1b00eb7b620bbee.
-- No prompts/student answers are copied here. Keep this evidence for the audit.
-- Do not run for a different incident or broaden predicates when it refuses.
-- Preflight (read only): review the single candidate, its attempt, rates and cost.
select u.id,u.created_at,u.status,u.model,u.input_tokens,u.output_tokens,
 u.input_rate,u.output_rate,u.reserved_usd,u.charged_usd,u.reconciliation_required
from public.session_intake_ai_usage u
join public.studio_sessions s on s.id=u.session_id
join public.teaching_blocks b on b.id=u.block_id
where b.academic_year=2026 and b.block_code='2B2' and s.session_number=5
 and u.created_at between '2026-10-14 21:33:00+00' and '2026-10-14 21:34:17+00'
 and u.provider='openai' and u.model='gpt-5-mini'
 and u.pricing_version='openai-pricing-2026-10-15'
 and u.input_tokens=1737 and u.output_tokens=2245
 and u.input_rate=0.25 and u.output_rate=2 and u.reserved_usd=0.01231775;

-- Run this transaction only after reviewing the candidate against the debug.
-- Refuses zero/multiple matches; preserves attempts, history and other alerts.
begin;
do $$
declare v_ids uuid[]; v_result jsonb;
begin
 select array_agg(u.id) into v_ids
 from public.session_intake_ai_usage u
 join public.studio_sessions s on s.id=u.session_id
 join public.teaching_blocks b on b.id=u.block_id
 where b.academic_year=2026 and b.block_code='2B2' and s.session_number=5
 and u.created_at between '2026-10-14 21:33:00+00' and '2026-10-14 21:34:17+00'
 and u.provider='openai' and u.model='gpt-5-mini'
 and u.pricing_version='openai-pricing-2026-10-15'
 and u.input_tokens=1737 and u.output_tokens=2245
 and u.input_rate=0.25 and u.output_rate=2 and u.reserved_usd=0.01231775;
 if coalesce(array_length(v_ids,1),0)<>1 then raise exception 'Expected exactly one reviewed S5 reservation; stop and inspect'; end if;
 v_result:=public.reconcile_session_intake_ai_alias(v_ids[1],1737,2245,'gpt-5-mini-2025-08-07',
 'Reviewed session-intake-debug-S5-2.json / 2026-10-14T21:34:16.735Z / req_160ef7ed21d94cbdb1b00eb7b620bbee; approved alias-only model identity correction');
 raise notice 'Alias reconciliation result: %',v_result;
end; $$;
commit;
-- Expected estimate: USD 0.00492425; reserved USD 0.01231775 retained for audit.
-- If the Block remains paused, inspect other alerts; do not reset usage/budget.
