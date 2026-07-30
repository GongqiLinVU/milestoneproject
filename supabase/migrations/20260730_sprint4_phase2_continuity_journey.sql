-- Sprint 4 Phase 2: NIT3004 continuity and week-specific engagement journey.
-- Keeps legacy Week 1-3 rows readable while new submissions use a short
-- common pulse and week-specific selection fields. Week 4 adds final delivery.

alter table public.weekly_engagement_checkouts
  add column if not exists weekly_status text,
  add column if not exists support_need text,
  add column if not exists project_access text,
  add column if not exists team_continuity text,
  add column if not exists remaining_work_clarity text,
  add column if not exists implementation_progress text,
  add column if not exists evidence_readiness text,
  add column if not exists demo_readiness text,
  add column if not exists product_readiness text,
  add column if not exists testing_readiness text,
  add column if not exists report_readiness text,
  add column if not exists presentation_readiness text,
  add column if not exists demo_backup_readiness text,
  add column if not exists speaking_role_readiness text,
  add column if not exists final_submission_status text;

-- Legacy generic answers remain populated on historical rows but are no longer
-- required for the new week-specific form.
alter table public.weekly_engagement_checkouts
  alter column time_invested drop not null,
  alter column contribution_areas drop not null,
  alter column task_completion drop not null,
  alter column evidence_status drop not null,
  alter column team_communication drop not null,
  alter column participation_balance drop not null,
  alter column next_task_clarity drop not null,
  alter column work_status drop not null,
  alter column discussion_focus drop not null;

do $$
declare
  constraint_name text;
begin
  select con.conname
  into constraint_name
  from pg_constraint con
  where con.conrelid = 'public.weekly_engagement_checkouts'::regclass
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%week_number%'
  limit 1;

  if constraint_name is not null then
    execute format(
      'alter table public.weekly_engagement_checkouts drop constraint %I',
      constraint_name
    );
  end if;
end $$;

alter table public.weekly_engagement_checkouts
  drop constraint if exists weekly_engagement_week_number_check,
  add constraint weekly_engagement_week_number_check
    check (week_number between 1 and 4),
  drop constraint if exists weekly_engagement_new_journey_check,
  add constraint weekly_engagement_new_journey_check check (
    -- Historical rows are valid without rewriting their submitted evidence.
    (weekly_status is null and time_invested is not null)
    or
    (
      week_number between 1 and 3
      and weekly_status is not null
      and support_need is not null
      and case week_number
        when 1 then project_access is not null
          and team_continuity is not null
          and remaining_work_clarity is not null
        when 2 then implementation_progress is not null
          and evidence_readiness is not null
          and demo_readiness is not null
        when 3 then product_readiness is not null
          and testing_readiness is not null
          and report_readiness is not null
          and presentation_readiness is not null
        else false
      end
    )
    or
    (
      week_number = 4
      and presentation_readiness is not null
      and demo_backup_readiness is not null
      and speaking_role_readiness is not null
      and final_submission_status is not null
    )
  );

-- Existing grants, RLS policies, block-scoped uniqueness and the roster team
-- assignment trigger remain unchanged.

-- Verification:
-- 1. Confirm week_number accepts 1-4 and rejects 0 or 5.
-- 2. Confirm existing Week 1-3 legacy rows still select successfully.
-- 3. Insert one new row for each week using only the common/week-specific
--    fields; confirm the roster trigger assigns team_name.
-- 4. Confirm a second block_id + student_id + week_number insert is rejected.
-- 5. Confirm an unmatched Student ID is rejected by the roster trigger.
-- 6. Confirm anon can INSERT but cannot SELECT/UPDATE/DELETE.
-- 7. Confirm authenticated non-teachers cannot read or mutate rows.
-- 8. Confirm teachers can read and manage all four weeks in the selected block.
--
-- Rollback guidance:
-- Do not drop the new columns after Week 4 production submissions exist.
-- Before production use, remove weekly_engagement_new_journey_check, restore
-- the week_number 1-3 check and restore NOT NULL only after confirming every
-- legacy generic column is populated.
