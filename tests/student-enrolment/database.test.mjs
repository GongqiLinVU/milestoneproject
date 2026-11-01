import {test,after} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {db,identity,owner,teacher1,teacher2,student1} from '../classes/fixture.mjs';
after(()=>db.close());
const value=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
const oldClass=await value('select id from teaching_blocks limit 1');await db.query("update teaching_blocks set course_code='NIT3003',status='archived' where id=$1",[oldClass]);
const target=await value("insert into teaching_blocks(course_code,academic_year,block_code,class_code,status) values('NIT3004',2026,'2B4','C2','active') returning id");
const alternate=await value("insert into teaching_blocks(course_code,academic_year,block_code,class_code,status) values('NIT3003',2025,'2B4','C3','archived') returning id");
await db.query("insert into auth.users(id,email,raw_app_meta_data) values($1,'teacher@example.invalid','{\"role\":\"teacher\"}'),($2,'other@example.invalid','{\"role\":\"teacher\"}'),($3,'student@example.invalid','{}')",[teacher1,teacher2,student1]);
await identity();await db.query('select set_teacher_classes($1,$2,$3)',[teacher1,[target],'Target teacher']);await db.query('select set_teacher_classes($1,$2,$3)',[teacher2,[oldClass],'Other teacher']);await owner();await db.query('update teacher_profiles set must_change_password=false where user_id in ($1,$2)',[teacher1,teacher2]);
const source=await value("insert into student_roster(block_id,student_id,full_name,preferred_name,vu_email,team_number,project_name) values($1,'s12345','Original Name','Alex','original@example.invalid',2,'Original project') returning id",[oldClass]);
const second=await value("insert into student_roster(block_id,student_id,full_name,vu_email,team_number) values($1,'s12345','Alternative Name','alternative@example.invalid',1) returning id",[alternate]);
await db.query("insert into student_accounts(student_id,auth_user_id,status) values('s12345',$1,'activated')",[student1]);
const accountBefore=await value("select to_jsonb(a) from student_accounts a where student_id='s12345'");const sourceBefore=await value('select to_jsonb(r) from student_roster r where id=$1',[source]);
const migration=fs.readFileSync('supabase/migrations/20261101_sprint11_student_id_enrolment.sql','utf8');await db.exec(migration);await db.exec(migration);
const lookup=(id='s12345',classId=target)=>value('select lookup_student_for_enrolment($1,$2)',[classId,id]);
const enrol=(id='s12345',sourceId=source,classId=target)=>value('select enrol_existing_student($1,$2,$3)',[classId,id,sourceId]);

test('exact normalized ID lookup returns minimal profiles for confirmation, including multiple histories',async()=>{
 await identity(teacher1);const result=await lookup(' S12345 ');assert.equal(result.status,'found');assert.equal(result.accountStatus,'activated');assert.equal(result.candidates.length,2);assert.ok(result.candidates.some(c=>c.rosterId===source&&c.fullName==='Original Name'));assert.ok(result.candidates.some(c=>c.rosterId===second&&c.fullName==='Alternative Name'));
 const text=JSON.stringify(result);assert.ok(!text.includes(student1));assert.ok(!text.includes('Original project'));assert.ok(!text.includes('password'));assert.equal((await lookup('s123')).status,'not_found');assert.equal((await lookup('s123%')).status,'not_found');
});
test('target-class authorization blocks unassigned teachers, students and anonymous RPC callers',async()=>{
 await identity(teacher2);await assert.rejects(lookup(),/not assigned/);await assert.rejects(enrol(),/not assigned/);await identity(student1,'student');await assert.rejects(lookup(),/not assigned/);await assert.rejects(enrol(),/not assigned/);await owner();await db.exec('set role anon');await assert.rejects(lookup(),/permission denied/);await assert.rejects(enrol(),/permission denied/);
});
test('enrol copies only the chosen profile, starts unassigned, and preserves account and original history',async()=>{
 await identity(teacher1);const result=await enrol();assert.equal(result.status,'enrolled');assert.equal(result.accountStatus,'activated');const row=await value("select to_jsonb(r) from student_roster r where block_id=$1 and student_id='s12345'",[target]);assert.equal(row.full_name,'Original Name');assert.equal(row.vu_email,'original@example.invalid');assert.equal(row.team_number,null);assert.equal(row.project_name,null);
 await owner();assert.deepEqual(await value('select to_jsonb(r) from student_roster r where id=$1',[source]),sourceBefore);assert.deepEqual(await value("select to_jsonb(a) from student_accounts a where student_id='s12345'"),accountBefore);
});
test('repeat enrol is idempotent and never overwrites the target profile',async()=>{
 await identity(teacher1);await db.query("update student_roster set full_name='Reviewed Name' where block_id=$1 and student_id='s12345'",[target]);assert.equal((await lookup()).status,'already_enrolled');assert.equal((await enrol('s12345',second)).status,'already_enrolled');assert.equal(await value("select full_name from student_roster where block_id=$1 and student_id='s12345'",[target]),'Reviewed Name');assert.equal(Number(await value("select count(*) from student_roster where block_id=$1 and student_id='s12345'",[target])),1);
});
test('source spoofing and missing records cannot enrol another student under this ID',async()=>{
 await identity(teacher1);await assert.rejects(enrol('other-id',source),/no longer available/);await assert.rejects(enrol('missing-id','99999999-9999-9999-9999-999999999999'),/no longer available/);await assert.rejects(lookup('x'),/complete Student ID/);
});
test('an active old class blocks both lookup and enrol until its lifecycle is resolved',async()=>{
 await owner();const conflicting=await value("insert into teaching_blocks(course_code,academic_year,block_code,class_code,status) values('NIT3003',2026,'2B3','C8','planned') returning id");const id=await value("insert into student_roster(block_id,student_id,full_name,team_number) values($1,'s-active','Active Student',1) returning id",[conflicting]);await identity(teacher1);assert.equal((await lookup('s-active')).status,'found');await owner();await db.query("update teaching_blocks set status='active' where id=$1",[conflicting]);await identity(teacher1);assert.equal((await lookup('s-active')).status,'active_class_conflict');assert.equal((await enrol('s-active',id)).status,'active_class_conflict');assert.equal(Number(await value("select count(*) from student_roster where block_id=$1 and student_id='s-active'",[target])),0);
 await owner();await db.query("update teaching_blocks set status='archived' where id=$1",[conflicting]);await identity(teacher1);assert.equal((await enrol('s-active',id)).status,'enrolled');
});
test('accountless histories enrol without creating credentials; new profiles remain available through ordinary creation',async()=>{
 await owner();const id=await value("insert into student_roster(block_id,student_id,full_name,team_number) values($1,'s-no-account','No Account',1) returning id",[oldClass]);await identity(teacher1);assert.equal((await lookup('s-no-account')).accountStatus,null);assert.equal((await enrol('s-no-account',id)).status,'enrolled');await owner();assert.equal(Number(await value("select count(*) from student_accounts where student_id='s-no-account'")),0);await identity(teacher1);assert.equal((await lookup('brand-new')).status,'not_found');await db.query("insert into student_roster(block_id,student_id,full_name) values($1,'brand-new','New Student')",[target]);assert.equal(await value("select team_number from student_roster where block_id=$1 and student_id='brand-new'",[target]),null);
});
test('disabled accounts remain disabled and archived targets reject writes',async()=>{
 await owner();await db.query("delete from student_roster where block_id=$1 and student_id='s12345'",[target]);await db.query("update student_accounts set status='disabled' where student_id='s12345'");await identity(teacher1);assert.equal((await lookup()).accountStatus,'disabled');await enrol();await owner();assert.equal(await value("select status from student_accounts where student_id='s12345'"),'disabled');await db.query("update teaching_blocks set status='archived' where id=$1",[target]);await identity(teacher1);await assert.rejects(lookup(),/archived class/);await assert.rejects(enrol(),/archived class/);
});
