-- Restore the Class Pulse concern field in an existing production database.
-- Run this migration before deploying the matching frontend change.

alter table public.week1_pulse
  add column if not exists concern text;

update public.week1_pulse
set concern = 'Not recorded (legacy)'
where concern is null;

alter table public.week1_pulse
  drop constraint if exists week1_pulse_concern_check;

alter table public.week1_pulse
  add constraint week1_pulse_concern_check
  check (
    concern in (
      'Working product',
      'Documentation',
      'Presentation',
      'Teamwork',
      'Testing',
      'Time',
      'Not recorded (legacy)'
    )
  );

alter table public.week1_pulse
  alter column concern set not null;

-- Security impact:
-- No grants or RLS policies change. Anonymous and authenticated clients retain
-- insert-only access, while teacher reads still require public.is_teacher().

-- Production verification:
-- select column_name, is_nullable
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'week1_pulse'
--   and column_name = 'concern';
--
-- select concern, count(*)
-- from public.week1_pulse
-- group by concern
-- order by concern;

-- Recovery:
-- Do not drop this column after new submissions use it. If deployment must be
-- rolled back before any new submission, it can be removed with:
-- alter table public.week1_pulse drop column if exists concern;
