import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {db,owner,identity,student1} from '../classes/fixture.mjs';
after(()=>db.close());
const value=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
const classId=await value('select id from teaching_blocks limit 1');
await db.query("insert into student_roster(block_id,student_id,full_name,team_number) values($1,'old-team','Original Student',2)",[classId]);
const before=(await db.query('select * from teams order by id')).rows;
const policies=(await db.query("select * from pg_policies where schemaname='public' order by tablename,policyname")).rows;
const migration=fs.readFileSync('supabase/migrations/20261102_sprint11_team_numbers.sql','utf8');
await db.exec(migration);await db.exec(migration);
test('migration is repeatable and preserves team IDs, roster and RLS except obsolete label validation',async()=>{
 assert.deepEqual((await db.query('select * from teams order by id')).rows,before);
 assert.equal(await value("select team_number from student_roster where student_id='old-team'"),2);
 const normalize=rows=>rows.map(row=>({...row,qual:row.qual?.replace(/[()\s]/g,""),with_check:row.with_check?.replace(/[()\s]/g,"")}));
 assert.deepEqual(normalize((await db.query("select * from pg_policies where schemaname='public' order by tablename,policyname")).rows),normalize(JSON.parse(JSON.stringify(policies).replaceAll('^Team [1-8]$','^Team [1-9][0-9]*$'))));
});
test('teams above eight are created from roster, shared within a class and independent across classes',async()=>{
 for(const [id,n] of [['team-nine',9],['team-twelve',12],['team-twelve-b',12],['max-team',32767]])await db.query('insert into student_roster(block_id,student_id,full_name,team_number) values($1,$2,$2,$3)',[classId,id,n]);
 assert.equal(Number(await value('select count(*) from teams where block_id=$1 and team_number=12',[classId])),1);
 const other=await value("insert into teaching_blocks(academic_year,block_code,class_code,status) values(2026,'2B4','C9','planned') returning id");
 await db.query("insert into student_roster(block_id,student_id,full_name,team_number) values($1,'other-class','Other',12)",[other]);
 assert.equal(Number(await value('select count(*) from teams where team_number=12')),2);
 await db.query("update student_roster set team_number=15 where student_id='team-nine'");
 assert.equal(Number(await value('select count(*) from teams where block_id=$1 and team_number=15',[classId])),1);
});
test('blank teams remain allowed and zero, negative, fraction and overflow are rejected',async()=>{
 await db.query("insert into student_roster(block_id,student_id,full_name) values($1,'unassigned','Unassigned')",[classId]);
 assert.equal(await value("select team_number from student_roster where student_id='unassigned'"),null);
 for(const n of ['0','-1','1.5','32768']){
  await assert.rejects(db.query('insert into student_roster(block_id,student_id,full_name,team_number) values($1,$2,$2,$3)',[classId,'invalid-'+n,n]));
  await assert.rejects(db.query('insert into teams(block_id,team_number) values($1,$2)',[classId,n]));
 }
});
test('Team 12 supports project assignment, student context and legacy check-in',async()=>{
 const project=await value("insert into projects(block_id,title,problem,target_users,description,status) values($1,'Large class project','Problem','Learners','Description','published') returning id",[classId]);
 const team=await value('select id from teams where block_id=$1 and team_number=12',[classId]);
 await db.query('insert into team_project_assignments(team_id,project_id) values($1,$2)',[team,project]);
 await db.query("insert into auth.users(id,email,raw_app_meta_data) values($1,'student12@example.invalid','{}')",[student1]);
 await db.query("insert into student_accounts(student_id,auth_user_id,status) values('team-twelve',$1,'ready')",[student1]);
 await identity(student1,'student');
 const context=await value("select complete_student_activation('Continue implementing and testing our project')");
 assert.equal(context.teamName,'Team 12');assert.equal(context.projectName,'Large class project');
 await db.query("insert into student_checkins(student_id,student_name,team_name,goal,block_id,auth_user_id) values('team-twelve','Team Twelve Student','Team 12','Continue implementing and testing',$1,$2)",[classId,student1]);
 await owner();assert.equal(await value("select team_name from student_checkins where student_id='team-twelve'"),'Team 12');
});
test('all legacy activity label constraints accept Team 12 and still reject invalid labels',async()=>{
 const checks=(await db.query("select pg_get_constraintdef(oid) as definition from pg_constraint where contype='c' and connamespace='public'::regnamespace")).rows;
 assert.ok(checks.some(c=>c.definition.includes('^Team [1-9][0-9]*$')));
 assert.ok(checks.every(c=>!c.definition.includes('^Team [1-8]$')));
 for(const label of ['Team 9','Team 12','Team 100'])assert.equal(await value("select $1::text ~ '^Team [1-9][0-9]*$'",[label]),true);
 for(const label of ['Team 0','Team -1','Team 1.5','Team 01'])assert.equal(await value("select $1::text ~ '^Team [1-9][0-9]*$'",[label]),false);
});
