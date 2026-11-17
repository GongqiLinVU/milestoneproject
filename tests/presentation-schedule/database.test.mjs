import {test,after} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {db,identity,owner,teacher1,teacher2,student1,student2} from '../classes/fixture.mjs';
after(()=>db.close());const value=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
await owner();const classId=await value('select id from teaching_blocks limit 1');
await db.query("insert into auth.users(id,raw_app_meta_data) values($1,'{\"role\":\"teacher\"}'),($2,'{\"role\":\"teacher\"}'),($3,'{}'),($4,'{}')",[teacher1,teacher2,student1,student2]);
await identity();await db.query('select set_teacher_classes($1,$2,$3)',[teacher1,[classId],'Presentation teacher']);await owner();await db.query('update teacher_profiles set must_change_password=false where user_id=$1',[teacher1]);
for(const [sid,name,team] of [['schedule-alex','Alex',2],['schedule-drew','Drew',2],['schedule-blair','Blair',2],['schedule-casey','Casey',2],['schedule-finley','Finley',5],['schedule-gray','Gray',5],['schedule-emery','Emery',5]])await db.query('insert into student_roster(block_id,student_id,full_name,team_number) values($1,$2,$3,$4)',[classId,sid,name,team]);
await db.query("insert into student_accounts(student_id,auth_user_id,status) values('schedule-alex',$1,'activated'),('schedule-finley',$2,'activated')",[student1,student2]);
await db.query('insert into weekly_activity_settings(block_id,week_number,is_open) values($1,4,true) on conflict(block_id,week_number) do update set is_open=true',[classId]);
const teams=(await db.query('select id,team_number from teams where block_id=$1 order by case team_number when 2 then 0 when 5 then 1 else 2 end,team_number',[classId])).rows;const ids=teams.map(t=>t.id);
await identity(teacher1);await value('select publish_presentation_order($1,$2)',[classId,ids]);
await owner();const original=await value('select to_jsonb(p) from presentation_orders p where block_id=$1',[classId]);
const migration=fs.readFileSync('supabase/migrations/20261118_presentation_schedule.sql','utf8');await db.exec(migration);await db.exec(migration);
const read=()=>value('select get_my_published_presentation_order()');
test('repeatable migration enriches legacy publications without republishing or moving their order',async()=>{
 await owner();const after=await value('select to_jsonb(p) from presentation_orders p where block_id=$1',[classId]);assert.deepEqual(after,original);await identity(student1,'student');const result=await read();assert.deepEqual(result.map(r=>r.teamName),original.published_snapshot.map(r=>r.teamName));assert.equal(result[0].teamName,'Team 2');assert.equal(result[0].memberCount,4);assert.deepEqual(result[0].members,['Alex','Blair','Casey','Drew']);assert.equal(result[0].isMyTeam,true);assert.equal(result[1].isMyTeam,false);assert.equal(JSON.stringify(result).includes('schedule-alex'),false);assert.equal(result[0].teamId,undefined);
});
test('another student gets the same class roster and their own team highlighted',async()=>{
 await identity(student2,'student');const r=await read();assert.equal(r[0].isMyTeam,false);assert.equal(r[1].teamName,'Team 5');assert.equal(r[1].isMyTeam,true);assert.deepEqual(r[1].members,['Emery','Finley','Gray']);assert.equal(r.filter(x=>x.isMyTeam).length,1);
});
test('foreign-class members, drafts, direct table access and private helper calls remain isolated',async()=>{
 await owner();const other=await value("insert into teaching_blocks(academic_year,block_code,class_code,status) values(2026,'2B4','OTHER','planned') returning id");await db.query("insert into student_roster(block_id,student_id,full_name,team_number) values($1,'foreign-student','OTHER CLASS PRIVATE NAME',2)",[other]);const foreignTeam=await value('select id from teams where block_id=$1 and team_number=2',[other]);
 await identity(student1,'student');assert.equal(JSON.stringify(await read()).includes('OTHER CLASS PRIVATE NAME'),false);assert.equal((await db.query('select * from presentation_orders')).rows.length,0);await assert.rejects(value('select presentation_team_member_names($1,$2)',[other,foreignTeam]),/permission denied/);await assert.rejects(value('select publish_presentation_order($1,$2)',[classId,ids]),/not assigned/);
 await identity(teacher2);await assert.rejects(value('select publish_presentation_order($1,$2)',[classId,ids]),/not assigned/);await owner();await db.exec('set role anon');await assert.rejects(read(),/permission denied/);await db.exec('reset role');
});
test('closed Week 4 and missing publication do not expose schedule names',async()=>{
 await owner();await db.query('update weekly_activity_settings set is_open=false where block_id=$1 and week_number=4',[classId]);await identity(student1,'student');assert.deepEqual(await read(),[]);await owner();await db.query('update weekly_activity_settings set is_open=true where block_id=$1 and week_number=4',[classId]);await db.query('update presentation_orders set published_at=null where block_id=$1',[classId]);await identity(student1,'student');assert.deepEqual(await read(),[]);await owner();await db.query('update presentation_orders set published_at=$2 where block_id=$1',[classId,original.published_at]);
});
test('saving a later draft cannot change the student-visible published sequence',async()=>{
 await identity(teacher1);await value('select save_presentation_order_draft($1,$2)',[classId,[...ids].reverse()]);await identity(student1,'student');assert.deepEqual((await read()).map(r=>r.teamName),original.published_snapshot.map(r=>r.teamName));
});
test('future publication snapshots include member names/counts and remain fixed until republished',async()=>{
 await identity(teacher1);const published=await value('select publish_presentation_order($1,$2)',[classId,ids]);assert.equal(published[0].memberCount,4);assert.equal(published[0].teamId,ids[0]);await owner();await db.query("update student_roster set full_name='Renamed after publication' where student_id='schedule-alex'");await identity(student1,'student');assert.ok((await read())[0].members.includes('Alex'));assert.equal((await read())[0].members.includes('Renamed after publication'),false);await identity(teacher1);await value('select publish_presentation_order($1,$2)',[classId,ids]);await identity(student1,'student');assert.ok((await read())[0].members.includes('Renamed after publication'));
});
