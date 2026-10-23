import {test,after} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {db,identity,owner,teacher1,student1} from './fixture.mjs';
after(()=>db.close());
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
const classId=await scalar('select id from teaching_blocks limit 1');
// Simulate a legacy roster without the synchronization trigger/team identity.
await db.exec('drop trigger ensure_roster_team on student_roster');
await db.query("insert into student_roster(block_id,student_id,full_name,team_number) values($1,'legacy-team','Existing Student',3)",[classId]);
const migration=fs.readFileSync('supabase/migrations/20261023_sprint10_unassigned_roster.sql','utf8');await db.exec(migration);
await db.query("insert into auth.users(id,raw_app_meta_data) values($1,'{\"role\":\"teacher\"}'),($2,'{}')",[teacher1,student1]);
await identity();await db.query('select set_teacher_classes($1,$2,$3)',[teacher1,[classId],'Teacher']);await owner();await db.query('update teacher_profiles set must_change_password=false where user_id=$1',[teacher1]);

test('migration backfills missing roster teams and preserves IDs on repeat',async()=>{
 await owner();const before=await scalar('select id from teams where block_id=$1 and team_number=3',[classId]);assert.ok(before);await db.exec(migration);assert.equal(await scalar('select id from teams where block_id=$1 and team_number=3',[classId]),before);assert.equal(await scalar("select team_number from student_roster where student_id='legacy-team'"),3);
});
test('unassigned roster creation is allowed without creating a team; explicit allocation syncs and unassignment retains history',async()=>{
 await identity(teacher1);await db.query("insert into student_roster(block_id,student_id,full_name) values($1,'new-student','New Student')",[classId]);assert.equal(await scalar("select team_number from student_roster where student_id='new-student'"),null);assert.equal(Number(await scalar('select count(*) from teams where block_id=$1',[classId])),1);
 await assert.rejects(db.query("update student_roster set team_number=0 where student_id='new-student'"),/check constraint/);
 await db.query("update student_roster set team_number=2 where student_id='new-student'");const team=await scalar('select id from teams where block_id=$1 and team_number=2',[classId]);assert.ok(team);
 const project=await scalar("insert into projects(block_id,title,problem,target_users,description,status) values($1,'Booking','Problem','Users','Description','published') returning id",[classId]);await db.query('insert into team_project_assignments(team_id,project_id) values($1,$2)',[team,project]);
 await owner();await db.query("insert into student_accounts(student_id,auth_user_id,status) values('new-student',$1,'ready')",[student1]);await identity(student1,'student');let context=await scalar('select get_my_student_context()');assert.equal(context.teamAssigned,true);assert.equal(context.projectName,'Booking');
 await identity(teacher1);await db.query("update student_roster set team_number=null where student_id='new-student'");assert.equal(await scalar('select id from teams where id=$1',[team]),team);assert.equal(await scalar('select project_id from team_project_assignments where team_id=$1',[team]),project);
 await identity(student1,'student');context=await scalar('select get_my_student_context()');assert.equal(context.teamAssigned,false);assert.equal(context.teamName,'Not assigned');assert.equal(context.projectName,null);assert.equal(context.projectSource,'none');await assert.rejects(db.query("select complete_student_activation('Build booking')"),/no team/);
 await identity(teacher1);await db.query("update student_roster set team_number=2 where student_id='new-student'");await identity(student1,'student');context=await scalar('select get_my_student_context()');assert.equal(context.teamAssigned,true);assert.equal(context.projectName,'Booking');
});
test('an unassigned student cannot inject a team through a check-in',async()=>{
 await identity(teacher1);await db.query("update student_roster set team_number=null where student_id='new-student'");await identity(student1,'student');await assert.rejects(db.query("insert into student_checkins(block_id,auth_user_id,student_id,student_name,team_name,goal) values($1,$2,'new-student','New Student','Team 3','Build booking')",[classId,student1]),/no team/);
});

test('unassigned students remain class-scoped and teacher review uses an accurate team label',async()=>{
 await identity();const other=await scalar("insert into teaching_blocks(academic_year,block_code,class_code,status) values(2026,'2B4','C9','planned') returning id");await identity(teacher1);await assert.rejects(db.query("insert into student_roster(block_id,student_id,full_name) values($1,'unauthorized','Other Student')",[other]),/row-level security/);
 const sessionId=await scalar("insert into studio_sessions(block_id,title,session_date,session_number,status) values($1,'Test Session',current_date,1,'scheduled') returning id",[classId]);const report=await scalar('select get_teacher_session_intakes($1)',[sessionId]);assert.match(JSON.stringify(report),/Not assigned/);assert.doesNotMatch(JSON.stringify(report),/"teamName":"Team "/);
});

test('password-only activation needs no goal and creates no synthetic check-in',async()=>{
 await owner();await db.exec(fs.readFileSync('supabase/migrations/20261023_sprint10_v2_password_activation.sql','utf8'));await db.exec(fs.readFileSync('supabase/migrations/20261023_sprint10_v2_password_activation.sql','utf8'));await db.query("update student_roster set team_number=2 where student_id='new-student'");await identity(student1,'student');assert.equal(Number(await scalar('select count(*) from student_checkins')),0);const result=await scalar('select complete_student_activation()');assert.equal(result.status,'activated');await owner();assert.equal(Number(await scalar('select count(*) from student_checkins')),0);await identity(student1,'student');await assert.rejects(db.query('select complete_student_activation()'),/not ready/);
});
test('reactivation links a genuine current-class legacy check-in without rewriting its goal',async()=>{
 await owner();await db.query("update student_accounts set status='ready' where auth_user_id=$1",[student1]);await db.query("insert into student_checkins(block_id,student_id,student_name,team_name,goal) values($1,'new-student','New Student','Team 2','Original student goal')",[classId]);await identity(student1,'student');const context=await scalar("select complete_student_activation('ignored legacy argument')");assert.equal(context.checkinRecognised,true);await owner();assert.equal(Number(await scalar('select count(*) from student_checkins')),1);assert.equal(await scalar('select goal from student_checkins'),'Original student goal');assert.equal(await scalar('select auth_user_id from student_checkins'),student1);
});
