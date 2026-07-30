-- Sprint 3 Phase 3C-2 follow-up: authoritative roster team assignment
--
-- Student activities no longer accept a self-selected team. Before each
-- identified activity is inserted, the database resolves the student's team
-- from the private roster using block_id + Student ID.

create or replace function public.assign_activity_team_from_roster()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id text;
  v_team_name text;
  v_team_column text;
begin
  v_student_id := lower(trim(
    case
      when tg_table_name = 'poster_reviews'
        then to_jsonb(new) ->> 'reviewer_student_id'
      else to_jsonb(new) ->> 'student_id'
    end
  ));

  select concat('Team ', roster.team_number)
  into v_team_name
  from public.student_roster roster
  where roster.block_id = new.block_id
    and roster.student_id = v_student_id
  limit 1;

  if v_team_name is null then
    raise exception using
      errcode = 'P0001',
      message = 'Student ID is not present in the selected teaching block roster';
  end if;

  v_team_column := case
    when tg_table_name = 'poster_reviews' then 'reviewer_team'
    else 'team_name'
  end;

  new := jsonb_populate_record(
    new,
    jsonb_build_object(v_team_column, v_team_name)
  );
  return new;
end;
$$;

revoke all on function public.assign_activity_team_from_roster() from public;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'student_checkins',
    'team_health_checks',
    'weekly_engagement_checkouts',
    'week2_progress_reviews',
    'poster_reviews'
  ]
  loop
    execute format(
      'drop trigger if exists assign_activity_team_from_roster on public.%I',
      table_name
    );
    execute format(
      'create trigger assign_activity_team_from_roster
       before insert on public.%I
       for each row execute function public.assign_activity_team_from_roster()',
      table_name
    );
  end loop;
end $$;

comment on function public.assign_activity_team_from_roster() is
'Assigns team_name/reviewer_team from the private block roster before identified student activity inserts.';

-- Verification:
-- 1. A rostered Student ID can submit without team_name/reviewer_team.
-- 2. The stored team matches student_roster for the submitted block.
-- 3. An unknown Student ID fails without creating an activity row.
-- 4. A poster reviewer cannot review the team assigned by the roster.
-- 5. Browser roles still cannot read student_roster directly.
