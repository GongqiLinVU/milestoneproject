import {test,after} from 'node:test';import assert from 'node:assert/strict';
import {db,admin,teacher1,teacher2,student1,student2,migration,identity,owner} from './fixture.mjs';
after(()=>db.close());
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
const original=(await db.query('select id from teaching_blocks limit 1')).rows[0].id;
await identity();
const c2=await scalar("insert into teaching_blocks(academic_year,block_code,class_code,status) values(2026,'2B1','C2','active') returning id");
const c3=await scalar("insert into teaching_blocks(academic_year,block_code,class_code,status) values(2026,'2B1','C3','active') returning id");
await owner();for(const [id,email,role] of [[teacher1,'one@example.invalid','teacher'],[teacher2,'two@example.invalid','teacher'],[student1,'s1@example.invalid','student'],[student2,'s2@example.invalid','student']])await db.query('insert into auth.users(id,email,raw_app_meta_data) values($1,$2,$3)',[id,email,JSON.stringify({role})]);
await identity();for(const [id,c,name] of [[teacher1,original,'Teacher One'],[teacher2,c2,'Teacher Two']])await db.query('select set_teacher_classes($1,$2,$3)',[id,[c],name]);
await owner();await db.exec('update teacher_profiles set must_change_password=false');
for(const [sid,id,c] of [['s1001',student1,original],['s1002',student2,c2]]){await db.query("insert into student_accounts(student_id,auth_user_id,status) values($1,$2,'activated')",[sid,id]);await db.query('insert into student_roster(block_id,student_id,full_name,team_number,vu_email) values($1,$2,$2,1,$3)',[c,sid,sid+'@example.invalid']);}
const team1=await scalar('insert into teams(block_id,team_number) values($1,1) on conflict(block_id,team_number) do update set team_number=excluded.team_number returning id',[original]);const team2=await scalar('insert into teams(block_id,team_number) values($1,1) on conflict(block_id,team_number) do update set team_number=excluded.team_number returning id',[c2]);
const s1=await scalar("insert into studio_sessions(block_id,title,session_date,session_number,status) values($1,'Class One Session',current_date,1,'scheduled') returning id",[original]);
const s2=await scalar("insert into studio_sessions(block_id,title,session_date,session_number,status) values($1,'Class Two Session',current_date,1,'scheduled') returning id",[c2]);

test('three independent active classes reuse block, team and session numbers; owner sees all',async()=>{await identity();assert.equal(Number(await scalar("select count(*) from teaching_blocks where status='active'")),3);assert.equal(await scalar('select is_superadmin()'),true);});
test('teacher reads only assigned class, roster, student accounts and sessions',async()=>{
 await identity(teacher1);assert.deepEqual((await db.query('select id from teaching_blocks')).rows.map(r=>r.id),[original]);assert.deepEqual((await db.query('select student_id from student_roster')).rows.map(r=>r.student_id),['s1001']);assert.deepEqual((await db.query('select student_id from student_accounts')).rows.map(r=>r.student_id),['s1001']);assert.equal(Number(await scalar('select count(*) from studio_sessions where block_id=$1',[c2])),0);
});
test('teacher can configure own intake but cannot mutate another class or create one',async()=>{
 await identity(teacher1);assert.equal((await db.query("update teaching_blocks set intake_mode='ai' where id=$1 returning id",[original])).rows.length,1);assert.equal((await db.query("update teaching_blocks set intake_mode='ai' where id=$1 returning id",[c2])).rows.length,0);
 await assert.rejects(db.query("insert into teaching_blocks(academic_year,block_code,class_code) values(2026,'2B4','C9')"),/row-level security/);
 await assert.rejects(db.query("update teaching_blocks set class_code='OTHER' where id=$1",[original]),/administrator/);
});
test('every externally callable teacher RPC checks the class before reading or writing',async()=>{
 await identity(teacher1);
 for(const [sql,args] of [
 ['select get_teacher_session_intakes($1)',[s2]],['select get_teacher_session_work_tracks($1)',[s2]],['select get_teacher_platform_feedback_status($1)',[s2]],['select verify_teacher_session_work_track($1,$2,50)',[s2,'s1002']],['select get_teacher_session_ai_usage($1)',[c2]],['select get_teacher_poster_gallery($1)',[c2]],['select publish_poster_gallery($1)',[c2]],['select hide_poster_gallery($1)',[c2]],['select remove_team_poster_draft($1)',[team2]],['select publish_presentation_order($1,$2)',[c2,[team2]]],['select save_presentation_order_draft($1,$2)',[c2,[team2]]],['select teacher_reset_week2_precheck($1)',[s2]],['select save_teacher_progress_review($1,$2)',[s2,{}]]])await assert.rejects(db.query(sql,args),/not assigned/);
 assert.equal((await scalar('select get_teacher_session_intakes($1)',[s1])).blockId,original);
});
test('only owner can create teacher assignments; revocation and disable take immediate effect',async()=>{
 await identity(teacher1);await assert.rejects(db.query('select set_teacher_classes($1,$2,$3)',[teacher1,[c2],'Teacher One']),/Administrator/);await assert.rejects(db.query('select get_teacher_administration()'),/Administrator/);await assert.rejects(db.query('insert into platform_administrators(user_id) values($1)',[teacher1]),/permission denied/);
 await identity();await db.query('select set_teacher_classes($1,$2,$3)',[teacher1,[],'Teacher One']);await identity(teacher1);assert.equal(Number(await scalar('select count(*) from teaching_blocks')),0);await assert.rejects(db.query('select get_teacher_session_intakes($1)',[s1]),/not assigned/);
 await identity();await db.query('select set_teacher_classes($1,$2,$3,false)',[teacher1,[original],'Teacher One']);await identity(teacher1);assert.equal(await scalar('select is_teacher()'),false);assert.equal(Number(await scalar('select count(*) from student_roster')),0);
 await identity();await db.query('select set_teacher_classes($1,$2,$3,true)',[teacher1,[original],'Teacher One']);
});
test('student context resolves their class while anonymous defaults fail closed with multiple active classes',async()=>{
 await identity(student2,'student');assert.equal(await scalar('select current_teaching_block_id()'),c2);const context=await scalar('select get_my_student_context()');assert.match(context.blockLabel,/NIT3004.*C2/);assert.equal(context.blockId,c2);assert.deepEqual((await db.query('select id from teaching_blocks')).rows.map(r=>r.id),[c2]);
 await owner();await db.exec("select set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','{}',false);set role anon");assert.equal(await scalar('select current_teaching_block_id()'),null);
});
test('ambiguous student enrolment is rejected and existing account history is not duplicated',async()=>{
 await identity();await assert.rejects(db.query("insert into student_roster(block_id,student_id,full_name,team_number) values($1,'s1001','Same Student',1)",[c2]),/another active class/);await owner();assert.equal(Number(await scalar("select count(*) from student_accounts where student_id='s1001'")),1);
});
test('password reset from an old class cannot affect a student now active elsewhere',async()=>{
 await identity();const planned=await scalar("insert into teaching_blocks(academic_year,block_code,class_code,status) values(2026,'2B4','C1','planned') returning id");await db.query("insert into student_roster(block_id,student_id,full_name,team_number) values($1,'s1001','Same Student',1)",[planned]);await db.query('select set_teacher_classes($1,$2,$3)',[teacher2,[c2,planned],'Teacher Two']);await identity(teacher2);assert.equal(await scalar('select can_manage_student_credentials($1,$2)',[planned,'s1001']),false);
});
test('cross-class parent links are rejected even when both record IDs are known',async()=>{
 await owner();const p=await scalar("insert into projects(block_id,title,problem,target_users,description) values($1,'Other project','Problem','Users','Description') returning id",[c2]);await identity(teacher1);await assert.rejects(db.query('insert into team_project_assignments(team_id,project_id) values($1,$2)',[team1,p]),/same class/);
});
test('shared student accounts and existing record ownership cannot be changed through direct teacher PATCH',async()=>{
 await identity(teacher2);assert.equal((await db.query("update student_accounts set status='disabled' where student_id='s1001' returning student_id")).rows.length,0);
 await identity();await db.query('select set_teacher_classes($1,$2,$3)',[teacher1,[original,c2],'Teacher One']);await identity(teacher1);await assert.rejects(db.query('update studio_sessions set block_id=$1 where id=$2',[c2,s1]),/cannot be moved/);
 await identity();await db.query('select set_teacher_classes($1,$2,$3)',[teacher1,[original],'Teacher One']);
});
test('bootstrap refuses multiple legacy teachers unless the owner UUID is explicitly selected',async()=>{
 const bootstrap=migration.match(/do \$\$declare v_id uuid;[\s\S]*?end \$\$;/)[0];await owner();await db.exec('begin;delete from platform_administrators');await assert.rejects(db.exec(bootstrap),/bootstrap_administrator/);await db.exec('rollback');
 await db.exec('begin;delete from platform_administrators');await db.query("select set_config('studio.bootstrap_administrator',$1,true)",[admin]);await db.exec(bootstrap);assert.equal((await db.query('select user_id from platform_administrators')).rows[0].user_id,admin);await db.exec('rollback');
});
test('migration is idempotent and preserves owner and existing class records',async()=>{
 await owner();await db.exec(migration);await identity();assert.equal(await scalar('select is_superadmin()'),true);await owner();assert.equal(Number(await scalar('select count(*) from platform_administrators')),1);await identity();assert.ok((await db.query('select id from studio_sessions where id=$1',[s1])).rows.length===1);
});
