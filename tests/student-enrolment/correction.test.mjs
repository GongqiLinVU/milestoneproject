import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {db,identity,owner,teacher1,student1} from '../classes/fixture.mjs';
after(()=>db.close());
const value=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
await owner();
await db.exec("alter table auth.users add column if not exists raw_user_meta_data jsonb default '{}'::jsonb");
const block=await value('select id from teaching_blocks limit 1');
await db.query("insert into auth.users(id,email,raw_app_meta_data) values($1,'correct@example.invalid','{}'),($2,'teacher-correct@example.invalid','{}')",[student1,teacher1]);
await db.query("insert into student_accounts(student_id,auth_user_id,status) values('s8019622',$1,'ready')",[student1]);
await db.query("insert into student_roster(block_id,student_id,full_name,vu_email,team_number) values($1,'s8019622','Example','correct@example.invalid',1)",[block]);
await db.exec("create table public.correction_fixture(id uuid primary key default gen_random_uuid(),student_id text references public.student_accounts(student_id), notes text);insert into public.correction_fixture(student_id,notes) values('s8019622','Preserve this evidence');");
const migration=fs.readFileSync('supabase/migrations/20261111_sprint11_student_id_correction.sql','utf8');
await db.exec(migration);await db.exec(migration);
const correct=(next='s8019633')=>value("select correct_student_id('s8019622',$1,'Student ID was entered incorrectly')",[next]);
test('teachers and students cannot correct identity',async()=>{
 await identity(teacher1);await assert.rejects(correct(),/Administrator access/);
 await identity(student1,'student');await assert.rejects(correct(),/Administrator access/);
});
test('collision rolls back without changing the account',async()=>{
 await owner();await db.query("insert into student_roster(block_id,student_id,full_name) values($1,'occupied','Other')",[block]);
 await identity();await assert.rejects(correct('occupied'),/already exists/);
 await owner();assert.equal(await value("select student_id from student_accounts where auth_user_id=$1",[student1]),'s8019622');
});
test('constraint failure rolls back all relational changes',async()=>{
 await owner();await db.exec("alter table correction_fixture add constraint test_reject_new check(student_id<>'rejected')");
 await identity();await assert.rejects(correct('rejected'),/test_reject_new/);
 await owner();assert.equal(await value("select student_id from student_accounts where auth_user_id=$1",[student1]),'s8019622');
 assert.equal(await value("select count(*)::int from student_id_corrections"),0);
});
test('prepared identity changes atomically and preserves UUID, evidence and activation',async()=>{
 await identity();await correct();
 await owner();
 assert.equal(await value("select student_id from student_accounts where auth_user_id=$1 and status='ready'",[student1]),'s8019633');
 assert.equal(await value("select student_id from correction_fixture where notes='Preserve this evidence'"),'s8019633');
 assert.equal(await value("select raw_user_meta_data->>'student_id' from auth.users where id=$1",[student1]),'s8019633');
 assert.equal(await value("select count(*)::int from student_id_corrections where old_student_id='s8019622' and new_student_id='s8019633'"),1);
 assert.equal(await value("select count(*)::int from student_roster where student_id='s8019622'"),0);
});
