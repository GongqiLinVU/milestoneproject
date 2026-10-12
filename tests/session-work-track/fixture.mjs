import { readFile } from 'node:fs/promises';
// Optional isolated PostgreSQL runtime; no production URLs or credentials.
const { PGlite } = await import(process.env.S10_PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
export { db };
const read = name => readFile(new URL(`../../supabase/migrations/${name}`,import.meta.url),'utf8');
const A='10000000-0000-0000-0000-000000000001', B='10000000-0000-0000-0000-000000000002';
const block='20000000-0000-0000-0000-000000000001', other='20000000-0000-0000-0000-000000000002';
const sid=n=>`30000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
export { A, B, block, sid };
await db.exec(`
create role authenticated; create role anon;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function public.is_teacher() returns boolean language sql stable as $$ select coalesce(current_setting('request.jwt.claim.role',true),'')='teacher' $$;
create table auth.users(id uuid primary key);
insert into auth.users values ('${A}'),('${B}');
create table public.teaching_blocks(id uuid primary key, status text, starts_on date, created_at timestamptz default now(), intake_mode text default 'disabled');
create table public.student_accounts(student_id text primary key, auth_user_id uuid, status text);
create table public.student_roster(student_id text, block_id uuid, full_name text, preferred_name text, team_number integer);
create table public.studio_sessions(id uuid primary key, block_id uuid, session_number integer, week_number integer, curriculum_focus text, title text, session_date date, status text, starts_at timestamptz, ends_at timestamptz, created_at timestamptz default now());
create table public.student_session_checkins(session_id uuid,student_id text,auth_user_id uuid,checked_in_at timestamptz);
create table public.student_platform_feedback(session_id uuid,auth_user_id uuid,submitted_at timestamptz);
insert into teaching_blocks(id,status,starts_on) values ('${block}','active','2026-10-01'),('${other}','active','2026-09-01');
insert into student_accounts values ('s1001','${A}','activated'),('s1002','${B}','activated');
insert into student_roster values ('s1001','${block}','Test One',null,1),('s1002','${other}','Test Two',null,2);
`);
await db.exec(await read('20260805_sprint6_phase2b_session_work_track.sql'));
await db.exec(await read('20260813_sprint7_phase1a_independent_work_track.sql'));
// Model existing explicit Supabase anon grants; PUBLIC revocation alone must not pass.
await db.exec('grant execute on function get_my_session_work_track(uuid),save_my_session_work_track(uuid,jsonb),get_my_session_journey() to anon');
await db.exec(await read('20261013_sprint10_s01_work_track.sql'));
await db.exec(await read('20261013_sprint10_s01_rpc_privileges.sql'));
for (const n of [1,2,6,7,8,9,10]) await db.query(`insert into studio_sessions(id,block_id,session_number,week_number,curriculum_focus,title,session_date,status,work_track_access) values ($1,$2,$3,1,'Progress','Session '||($3::integer)::text,'2026-10-13','open','open')`,[sid(n),block,n]);
await db.exec(`grant usage on schema public,auth to authenticated,anon;`);
export async function identity(user=A,role='student') {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",[user,role]);
  await db.exec('set role authenticated');
}
export async function rpc(name,n,payload) {
  const q=payload===undefined?`select public.${name}($1::uuid) result`:`select public.${name}($1::uuid,$2::jsonb) result`;
  const r=await db.query(q,payload===undefined?[sid(n)]:[sid(n),JSON.stringify(payload)]);
  return r.rows[0].result;
}
export const early={responsibility:'Implement booking API',progress:'No progress yet; investigated validation',nextAction:'Write one request validation test',evidence:'',support:'Need guidance'};
export const late={requirements:[
  {label:'Core functionality meets the primary user needs',score:75},
  {label:'Main workflow works end-to-end across integrated components',score:50},
  {label:'Critical features are tested or validated with evidence',score:25}
],integrationStatus:'Partial',unresolvedFunctionality:'Minor',endToEnd:'Partially',reportSections:{Introduction:'Draft'}};
