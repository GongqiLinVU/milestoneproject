import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {db,identity,owner,admin,teacher1,teacher2,student1,student2} from '../classes/fixture.mjs';
after(()=>db.close());
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
const migration=fs.readFileSync('supabase/migrations/20261101_sprint11_shared_project_library.sql','utf8');
const classA=await scalar('select id from teaching_blocks limit 1');
const legacy=await scalar("insert into projects(block_id,title,problem,target_users,description,status) values($1,'Shared legacy','Problem','Users','Description','published') returning id",[classA]);
const draft=await scalar("insert into projects(block_id,title,problem,target_users,description,status) values($1,'Hidden draft','Problem','Users','Description','draft') returning id",[classA]);
const sourceClass=await scalar("insert into teaching_blocks(course_code,academic_year,block_code,class_code,status) values('NIT3003',2026,'2B3','C2','archived') returning id");
const classB=await scalar("insert into teaching_blocks(course_code,academic_year,block_code,class_code,status,project_setup_mode) values('NIT3004',2026,'2B4','C2','active','student_selection') returning id");
const sourceTeam=await scalar("insert into teams(block_id,team_number) values($1,1) returning id",[sourceClass]);
const targetTeam=await scalar("insert into teams(block_id,team_number) values($1,1) returning id",[classB]);
const otherTeam=await scalar("insert into teams(block_id,team_number) values($1,2) returning id",[classB]);
const oldTeam=await scalar("insert into teams(block_id,team_number) values($1,1) on conflict(block_id,team_number) do update set team_number=excluded.team_number returning id",[classA]);
const originalAssignment=await scalar('insert into team_project_assignments(team_id,project_id) values($1,$2) returning id',[oldTeam,legacy]);
await db.query("insert into student_roster(block_id,student_id,full_name,team_number) values($1,'library-student','Library Student',1)",[classB]);
await db.query("insert into auth.users(id,raw_app_meta_data) values($1,'{\"role\":\"teacher\"}'),($2,'{\"role\":\"teacher\"}'),($3,'{}'),($4,'{}')",[teacher1,teacher2,student1,student2]);
await identity();await db.query('select set_teacher_classes($1,$2,$3)',[teacher1,[classA,sourceClass],'Library creator']);await db.query('select set_teacher_classes($1,$2,$3)',[teacher2,[classB],'Target teacher']);
await owner();await db.query('update teacher_profiles set must_change_password=false where user_id in ($1,$2)',[teacher1,teacher2]);await db.query("insert into student_accounts(student_id,auth_user_id,status) values('library-student',$1,'activated')",[student1]);
const oldSession=await scalar("insert into studio_sessions(block_id,title,session_date,session_number,status) values($1,'Historical',current_date,1,'closed') returning id",[classA]);
await db.query("insert into student_roster(block_id,student_id,full_name,team_number) values($1,'historical-student','Historical Student',1)",[classA]);
await db.query("insert into student_accounts(student_id,auth_user_id,status) values('historical-student',$1,'activated')",[student2]);
const oldEvidence=await scalar("insert into student_session_work_tracks(session_id,student_id,auth_user_id,block_id,response) values($1,'historical-student',$2,$3,$4::jsonb) returning id",[oldSession,student2,classA,JSON.stringify({note:'Keep this historical record'})]);
const oldSnapshot=await scalar('select to_jsonb(t) from student_session_work_tracks t where id=$1',[oldEvidence]);
await db.exec(migration);
let created,sourceAssignment;

test('migration preserves IDs and origin, maps draft safely, and is repeatable',async()=>{
 await owner();assert.equal(await scalar('select project_id from team_project_assignments where id=$1',[originalAssignment]),legacy);assert.equal(await scalar('select legacy_block_id from projects where id=$1',[legacy]),classA);assert.equal(await scalar('select status from projects where id=$1',[legacy]),'active');assert.equal(await scalar('select status from projects where id=$1',[draft]),'archived');assert.equal(await scalar('select legacy_status from projects where id=$1',[draft]),'draft');assert.equal(await scalar('select created_by from projects where id=$1',[legacy]),null);await db.exec(migration);assert.equal(await scalar('select id from projects where id=$1',[legacy]),legacy);assert.deepEqual(await scalar('select to_jsonb(t) from student_session_work_tracks t where id=$1',[oldEvidence]),oldSnapshot);
});
test('teachers share library visibility but only author/admin maintain it',async()=>{
 await identity(teacher1);created=await scalar("insert into projects(title,problem,target_users,description) values('Reusable','Problem','Users','Description') returning id");assert.equal(await scalar('select created_by from projects where id=$1',[created]),teacher1);
 await identity(teacher2);assert.equal(await scalar('select count(*) from projects where id=$1',[created]),1);assert.equal((await db.query("update projects set title='Stolen' where id=$1 returning id",[created])).rows.length,0);assert.equal((await db.query("update projects set status='archived' where id=$1 returning id",[legacy])).rows.length,0);
 await assert.rejects(db.query('delete from projects where id=$1',[created]),/permission denied/);
 await identity(teacher1);await db.query("update projects set description='Updated description' where id=$1",[created]);await identity();await db.query("update projects set description='Admin maintained' where id=$1",[legacy]);
});
test('2B4 can assign a library project from another class without moving historical assignments',async()=>{
 await identity(teacher2);await db.query('insert into team_project_assignments(team_id,project_id) values($1,$2)',[targetTeam,legacy]);await assert.rejects(db.query('update team_project_assignments set project_id=$1 where id=$2',[created,originalAssignment]).then(r=>{if(!r.rowCount)throw Error('RLS denied');}),/RLS denied|row-level security/);
 await owner();assert.equal(await scalar('select project_id from team_project_assignments where id=$1',[originalAssignment]),legacy);
});
test('archive retains current assignment/context, blocks new assignments, restore reopens use',async()=>{
 await identity();await db.query("update projects set status='archived' where id=$1",[legacy]);await identity(teacher2);await db.query("update team_project_assignments set confirmed_at=now() where team_id=$1",[targetTeam]);await assert.rejects(db.query('insert into team_project_assignments(team_id,project_id) values($1,$2)',[otherTeam,legacy]),/Only active/);
 await identity(student1,'student');const context=await scalar('select get_my_student_context()');assert.equal(context.projectName,'Shared legacy');const choice=await scalar("select get_project_checkin_context('library-student')");assert.equal(choice.project.id,legacy);assert.ok(!choice.availableProjects.some(p=>p.id===legacy));
 await identity();await db.query("update projects set status='active' where id=$1",[legacy]);await identity(teacher2);await db.query('insert into team_project_assignments(team_id,project_id) values($1,$2)',[otherTeam,legacy]);
});
test('student project selection is authenticated, class-bound, active-only; no raw library access',async()=>{
 await identity(student1,'student');assert.equal((await db.query('select * from projects')).rows.length,0);await assert.rejects(db.query("select get_project_checkin_context('someone-else')"),/Activated student/);await assert.rejects(db.query("select select_team_project('library-student',$1)",[draft]),/not active/);
 await identity(student2,'student');await assert.rejects(db.query("select get_project_checkin_context('library-student')"),/Activated student/);
 await owner();await db.exec('set role anon');await assert.rejects(db.query("select get_project_checkin_context('library-student')"),/permission denied/);await assert.rejects(db.query('select * from projects'),/permission denied/);
});
test('explicit NIT3003 to NIT3004 continuation checks both class permissions and project identity',async()=>{
 await identity(teacher1);sourceAssignment=await scalar("insert into team_project_assignments(team_id,project_id,origin_unit) values($1,$2,'NIT3003') returning id",[sourceTeam,created]);
 await identity(teacher2);await assert.rejects(db.query('update team_project_assignments set project_id=$1,predecessor_assignment_id=$2 where team_id=$3',[created,sourceAssignment,targetTeam]),/class is not assigned/);
 await identity();await db.query('update team_project_assignments set project_id=$1,predecessor_assignment_id=$2 where team_id=$3',[created,sourceAssignment,targetTeam]);assert.equal(await scalar('select continued_from_previous_unit from team_project_assignments where team_id=$1',[targetTeam]),true);assert.equal(await scalar('select origin_unit from team_project_assignments where team_id=$1',[targetTeam]),'NIT3003');
 await assert.rejects(db.query('update team_project_assignments set project_id=$1 where id=$2',[legacy,sourceAssignment]),/referenced by a continuing/);await assert.rejects(db.query('delete from team_project_assignments where id=$1',[sourceAssignment]),/foreign key/);
 await assert.rejects(db.query('update team_project_assignments set predecessor_assignment_id=$1 where team_id=$2',[originalAssignment,otherTeam]),/NIT3003 to NIT3004/);
});
test('student gets active catalogue across blocks and can choose without altering other teams',async()=>{
 await identity();await db.query('update team_project_assignments set predecessor_assignment_id=null where team_id=$1',[targetTeam]);await db.query('delete from team_project_assignments where team_id=$1',[targetTeam]);
 await identity(student1,'student');const context=await scalar("select get_project_checkin_context('library-student')");assert.ok(context.availableProjects.some(p=>p.id===created));await scalar("select select_team_project('library-student',$1)",[created]);await owner();assert.equal(await scalar('select project_id from team_project_assignments where team_id=$1',[targetTeam]),created);assert.equal(await scalar('select project_id from team_project_assignments where id=$1',[originalAssignment]),legacy);
});
test('inactive teachers and unrelated accounts cannot read the shared library',async()=>{
 await owner();await db.query("update teacher_profiles set active=false where user_id=$1",[teacher2]);await identity(teacher2);assert.equal(await scalar('select count(*) from projects'),0);await assert.rejects(db.query("insert into projects(title,problem,target_users,description) values('Forbidden','Problem','Users','Description')"),/row-level security/);
});

test('shared projects do not relax non-project class links or evidence access',async()=>{
 await owner();await assert.rejects(db.query("insert into student_session_work_tracks(session_id,student_id,auth_user_id,block_id,response) values($1,'library-student',$2,$3,'{}')",[oldSession,student1,classB]),/same class/);
 await identity(teacher1);assert.deepEqual(await scalar('select to_jsonb(t) from student_session_work_tracks t where id=$1',[oldEvidence]),oldSnapshot);
 await identity(student1,'student');assert.equal((await db.query('select id from student_session_work_tracks where id=$1',[oldEvidence])).rows.length,0);
});
