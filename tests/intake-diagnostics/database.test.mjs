import {test,after} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {db,owner,identity,teacher1,student1} from '../classes/fixture.mjs';
after(()=>db.close());
const value=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
await identity();await owner();
const classId=await value('select id from teaching_blocks limit 1');
const other=await value("insert into teaching_blocks(academic_year,block_code,class_code,status) values(2026,'2B4','C8','planned') returning id");
const session=await value("insert into studio_sessions(block_id,title,session_date,session_number,status) values($1,'Export Session',current_date,1,'closed') returning id",[classId]);
const otherSession=await value("insert into studio_sessions(block_id,title,session_date,session_number,status) values($1,'Other Session',current_date,1,'closed') returning id",[other]);
await db.query("insert into auth.users(id,raw_app_meta_data) values($1,'{\"role\":\"teacher\"}'),($2,'{}')",[teacher1,student1]);
await identity();await db.query('select set_teacher_classes($1,$2,$3)',[teacher1,[classId],'Assigned teacher']);await owner();
for(let n=0;n<29;n++){
 const user=await value("insert into auth.users(id) values(gen_random_uuid()) returning id");
 const sid=`export-${n}`;await db.query("insert into student_accounts(student_id,auth_user_id,status) values($1,$2,'activated')",[sid,user]);
 await db.query("insert into student_session_intakes(session_id,block_id,student_id,auth_user_id,schema_version,source_mode,source_conversation,student_record,ai_assistance,student_confirmation,confirmed_payload_hash,confirmed_at,created_at) values($1,$2,$3,$4,'session-intake.v1.0.0','ai_assisted','[{\"actor\":\"student\",\"text\":\"My progress\"}]','{}',$5::jsonb,$6::jsonb,'fixture',now()+$7::interval,now()+$7::interval)",[session,classId,sid,user,JSON.stringify(n===0?{debug_events:[{mode:'chat',request:{capturedEventCount:1},response:{model:'test'}}]}:{}),JSON.stringify({status:n===27?'draft':'confirmed',corrections:[]}),n===28?'1 day':'0 seconds']);
}
const before=await value('select jsonb_agg(to_jsonb(i) order by id) from student_session_intakes i');
const migration=fs.readFileSync('supabase/migrations/20261102_sprint11_intake_diagnostics_export.sql','utf8');await db.exec(migration);await db.exec(migration);
const page=(c=classId,s=session,after=null,asOf=null)=>value('select export_intake_diagnostics($1,$2,$3,$4)',[c,s,after,asOf]);
test('only superadmin may export, including when a teacher manages this class',async()=>{
 await identity(teacher1);await assert.rejects(page(),/Only a platform administrator/);await identity(student1,'student');await assert.rejects(page(),/Only a platform administrator/);
 await owner();await db.exec('set role anon');await assert.rejects(page(),/permission denied/);await identity();
});
test('class/session validation rejects mismatches and future cutoffs',async()=>{
 await assert.rejects(page(null),/Class not found/);await assert.rejects(page(classId,otherSession),/does not belong/);await assert.rejects(page(classId,session,null,'2099-01-01'),/future/);
});
test('paginated export includes confirmed diagnostics, excludes draft/future rows and credentials',async()=>{
 const first=await page();assert.equal(first.records.length,25);assert.ok(first.nextCursor);const next=await page(classId,session,first.nextCursor,first.asOf);assert.equal(next.records.length,2);assert.equal(next.nextCursor,null);assert.equal(next.asOf,first.asOf);
 const rows=[...first.records,...next.records];assert.equal(new Set(rows.map(r=>r.intakeId)).size,27);assert.ok(rows.every(r=>r.studentConfirmation.status==='confirmed'));assert.ok(rows.some(r=>r.aiAssistance.debug_events?.length===1));assert.ok(rows.every(r=>r.conversation[0].text==='My progress'));assert.ok(rows.every(r=>r.currentTeamNumber===null));
 const text=JSON.stringify(rows);assert.ok(!text.includes('auth_user_id'));assert.ok(!text.includes('confirmed_payload_hash'));assert.ok(!text.includes('export-27'));assert.ok(!text.includes('export-28'));
 assert.equal((await page(other,otherSession)).records.length,0);assert.equal((await page(classId,null)).records.length,25);
});
test('export leaves all submitted records unchanged',async()=>{
 await owner();assert.deepEqual(await value('select jsonb_agg(to_jsonb(i) order by id) from student_session_intakes i'),before);
});
