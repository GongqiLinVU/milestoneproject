-- Expand team numbering without changing IDs, allocations or access rules.
-- Apply before deploying the new roster UI. Keep the existing smallint storage
-- (1..32767); NULL still means Unassigned in student_roster.
begin;
alter table public.student_roster drop constraint if exists student_roster_team_number_check;
alter table public.student_roster add constraint student_roster_team_number_check check (team_number >= 1);
alter table public.teams drop constraint if exists teams_team_number_check;
alter table public.teams add constraint teams_team_number_check check (team_number >= 1);

-- Old activity tables also validate the display label. Preserve each complete
-- constraint and replace only the obsolete Team 1..8 expression.
do $$
declare item record; definition text;
begin
 for item in
  select c.conrelid::regclass as relation,c.conname,pg_get_constraintdef(c.oid) as definition
  from pg_constraint c join pg_namespace n on n.oid=c.connamespace
  where n.nspname='public' and c.contype='c'
    and position('^Team [1-8]$' in pg_get_constraintdef(c.oid))>0
 loop
  definition:=replace(item.definition,'^Team [1-8]$','^Team [1-9][0-9]*$');
  execute format('alter table %s drop constraint %I',item.relation,item.conname);
  execute format('alter table %s add constraint %I %s',item.relation,item.conname,definition);
 end loop;
 -- Preserve roles, command, USING and WITH CHECK; change only label validation.
 for item in select * from pg_policies where schemaname='public'
  and (position('^Team [1-8]$' in coalesce(qual,''))>0 or position('^Team [1-8]$' in coalesce(with_check,''))>0)
 loop
  definition:=format('alter policy %I on %I.%I',item.policyname,item.schemaname,item.tablename);
  if item.qual is not null then definition:=definition||' using ('||replace(item.qual,'^Team [1-8]$','^Team [1-9][0-9]*$')||')';end if;
  if item.with_check is not null then definition:=definition||' with check ('||replace(item.with_check,'^Team [1-8]$','^Team [1-9][0-9]*$')||')';end if;
  execute definition;
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
