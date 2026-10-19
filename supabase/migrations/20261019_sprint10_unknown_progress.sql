-- Allow explicit unknown progress in focused review; preserve legacy validation.
-- Apply after 20261019_sprint10_focused_review.sql. No row updates or permission expansion.
begin;
create or replace function public.validate_session_intake_student_record_v12_known(p_record jsonb)
returns text[] language plpgsql immutable set search_path='' as $$
declare v_errors text[]; v_item jsonb; v_key text;
begin
 v_errors:=public.validate_session_intake_student_record_v11(p_record);
 select coalesce(array_agg(e),'{}'::text[]) into v_errors from unnest(v_errors) e
 where e not in ('available evidence needs a reference and verification method','expected evidence needs a verification method','not-required evidence needs a reason','executed testing needs method and observed result','active or resolved blocker needs a description','next action, due Session and expected evidence are required');
 if jsonb_typeof(p_record->'next_action') is distinct from 'object'
 or jsonb_typeof(p_record#>'{next_action,action}') is distinct from 'string'
 or length(p_record#>>'{next_action,action}')>1000
 or jsonb_typeof(p_record#>'{next_action,expected_evidence}') is distinct from 'string'
 or length(p_record#>>'{next_action,expected_evidence}')>1000
 or coalesce(p_record#>>'{next_action,due_session}','') !~ '^S([1-9]|10)$' then
 v_errors:=array_append(v_errors,'Next-step structure is invalid');end if;
 if jsonb_typeof(p_record->'evidence')='array' then
 for v_item in select * from jsonb_array_elements(p_record->'evidence') loop
 foreach v_key in array array['reference','verification_method','not_required_reason'] loop
 if v_item ? v_key and v_item->v_key <> 'null'::jsonb and (jsonb_typeof(v_item->v_key)<>'string' or length(v_item->>v_key)>case when v_key='not_required_reason' then 500 else 1000 end) then v_errors:=array_append(v_errors,'Evidence text is invalid');end if;
 end loop;end loop;end if;
 if jsonb_typeof(p_record->'testing')='array' then
 for v_item in select * from jsonb_array_elements(p_record->'testing') loop
 foreach v_key in array array['method','observed_result','baseline_or_expected'] loop
 if v_item ? v_key and v_item->v_key <> 'null'::jsonb and (jsonb_typeof(v_item->v_key)<>'string' or length(v_item->>v_key)>1000) then v_errors:=array_append(v_errors,'Testing text is invalid');end if;
 end loop;end loop;end if;
 foreach v_key in array array['description','support_requested'] loop
 if (p_record->'blocker') ? v_key and p_record#>array['blocker',v_key] <> 'null'::jsonb and (jsonb_typeof(p_record#>array['blocker',v_key])<>'string' or length(p_record#>>array['blocker',v_key])>case when v_key='support_requested' then 500 else 1000 end) then v_errors:=array_append(v_errors,'Help text is invalid');end if;
 end loop;
 return v_errors;
end; $$;
revoke all on function public.validate_session_intake_student_record_v12_known(jsonb) from public,anon,authenticated;
create or replace function public.validate_session_intake_student_record_v12(p_record jsonb)
returns text[] language plpgsql immutable set search_path='' as $$
declare v_check jsonb:=p_record; v_i integer;
begin
 if jsonb_typeof(p_record->'claims')='array' and jsonb_array_length(p_record->'claims')>0 then
  for v_i in 0..jsonb_array_length(p_record->'claims')-1 loop
   if p_record#>>array['claims',v_i::text,'progress_kind']='unknown' then
    v_check:=jsonb_set(v_check,array['claims',v_i::text,'progress_kind'],'"advanced"'::jsonb,false);
   end if;
  end loop;
 end if;
 -- Substitute only for validation; the original record is stored unchanged as unknown.
 return public.validate_session_intake_student_record_v12_known(v_check);
end; $$;
revoke all on function public.validate_session_intake_student_record_v12(jsonb) from public,anon,authenticated;
commit;
