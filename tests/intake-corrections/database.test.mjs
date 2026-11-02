import {test,after} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {db,owner,identity,teacher1,teacher2,student1,student2} from '../classes/fixture.mjs';
after(()=>db.close());const value=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
await identity();await owner();const classId=await value('select id from teaching_blocks limit 1');
await db.query("insert into auth.users(id,raw_app_meta_data) values($1,'{\"role\":\"teacher\"}'),($2,'{\"role\":\"teacher\"}'),($3,'{}'),($4,'{}')",[teacher1,teacher2,student1,student2]);
await identity();await db.query('select set_teacher_classes($1,$2,$3)',[teacher1,[classId],'Assigned teacher']);await owner();await db.query('update teacher_profiles set must_change_password=false where user_id=$1',[teacher1]);
const session=await value("insert into studio_sessions(block_id,title,session_date,session_number,status,intake_access) values($1,'Closed Session',current_date,1,'closed','closed') returning id",[classId]);
for(const [sid,uid] of [['correction-one',student1],['correction-two',student2]]){await db.query('insert into student_roster(block_id,student_id,full_name,team_number) values($1,$2,$2,1)',[classId,sid]);await db.query("insert into student_accounts(student_id,auth_user_id,status) values($1,$2,'activated')",[sid,uid]);}
const record={responsibility:{current:'Front-end development',change_from_previous:'initial'},claims:[{claim_id:'C1',statement:'Prepared the interface design',scope:'Interface design',progress_kind:'advanced',completion_percent:null}],evidence:[{evidence_id:'E1',claim_ids:['C1'],type:'other',availability:'unknown',reference:null,verification_method:null,not_required_reason:null}],testing:[{test_id:'T1',claim_ids:['C1'],execution_status:'unknown',method:null,observed_result:null,baseline_or_expected:null}],dependencies:[],blocker:{status:'unknown',description:'',support_requested:null},next_action:{action:'Implement interface',due_session:'S2',expected_evidence:''}};
const attestation='This summary reflects what I am claiming and the evidence I have identified. Teacher verification is separate.';
const intake=await value("insert into student_session_intakes(session_id,block_id,student_id,auth_user_id,schema_version,source_mode,source_conversation,student_record,ai_assistance,student_confirmation,confirmed_payload_hash) values($1,$2,'correction-one',$3,'session-intake.v1.2.0','ai_assisted','[{\"actor\":\"student\",\"text\":\"Original conversation\"}]',$4::jsonb,'{\"debug_events\":[{\"mode\":\"chat\"}]}',$5::jsonb,'original-hash') returning id",[session,classId,student1,JSON.stringify(record),JSON.stringify({status:'confirmed',attestation,corrections:[]})]);
const original=await value('select to_jsonb(i) from student_session_intakes i where id=$1',[intake]);
await db.exec(fs.readFileSync('supabase/migrations/20261102_sprint11_intake_diagnostics_export.sql','utf8'));
const migration=fs.readFileSync('supabase/migrations/20261102_sprint11_intake_summary_corrections.sql','utf8');await db.exec(migration);await db.exec(migration);
const reopen=()=>value('select reopen_intake_summary($1)',[intake]);
const reconfirm=(r=record,revision=1,attest=attestation)=>value('select reconfirm_my_intake_summary($1,$2,$3,$4)',[intake,revision,r,attest]);
let opened;
test('assigned teacher only can reopen; summary cannot be overwritten before reopening',async()=>{
 await identity(student1,'student');await assert.rejects(reopen(),/not assigned/);await assert.rejects(reconfirm(),/locked/);
 await identity(teacher2);await assert.rejects(reopen(),/not assigned/);await owner();await db.exec('set role anon');await assert.rejects(reopen(),/permission denied/);
 await identity(teacher1);opened=await reopen();assert.ok(opened.correctionOpenedAt);assert.equal(opened.summaryRevision,1);assert.equal(opened.correctionHistory.length,1);assert.deepEqual(opened.correctionHistory[0].beforeRecord,record);assert.equal(opened.correctionHistory[0].openedByName,'Assigned teacher');
 assert.deepEqual(await reopen(),opened);
});
test('authorized readers see pending correction even for closed Session; others cannot read audit',async()=>{
 const teacher=await value('select get_teacher_session_intakes($1)',[session]);assert.equal(teacher.intakes.find(r=>r.intakeId===intake).correctionOpenedAt,opened.correctionOpenedAt);
 await identity(student1,'student');const own=await value('select get_my_session_intake($1)',[session]);assert.equal(own.isOpen,false);assert.ok(own.confirmedRecord.correctionOpenedAt);
 await assert.rejects(db.query('select * from intake_summary_corrections'),/permission denied/);await assert.rejects(value('select intake_summary_correction_info($1)',[intake]),/permission denied/);await assert.rejects(value('select get_my_session_intake_before_corrections($1)',[session]),/permission denied/);
 await identity(student2,'student');assert.equal((await value('select get_my_session_intake($1)',[session])).confirmedRecord,null);await assert.rejects(reconfirm(),/not available/);
});
test('invalid content, missing attestation and stale revisions cannot close the correction',async()=>{
 await identity(student1,'student');await assert.rejects(reconfirm(record,0),/locked/);await assert.rejects(reconfirm(record,1,''),/confirmation/);await assert.rejects(reconfirm({}),/Invalid summary/);
 assert.ok((await value('select get_my_session_intake($1)',[session])).confirmedRecord.correctionOpenedAt);
});
test('own student reconfirms in a closed Session; originals, conversation and debug are retained',async()=>{
 const revised=structuredClone(record);revised.responsibility.current='Backend development';revised.next_action.action='Implement the backend API';
 const result=await reconfirm(revised);assert.equal(result.summaryRevision,2);assert.equal(result.correctionOpenedAt,null);assert.deepEqual(result.correctionHistory[0].beforeRecord,record);assert.deepEqual(result.correctionHistory[0].afterRecord,revised);assert.ok(result.correctionHistory[0].reconfirmedAt);
 await assert.rejects(reconfirm(revised),/locked/);await owner();const latest=await value('select to_jsonb(i) from student_session_intakes i where id=$1',[intake]);assert.deepEqual(latest.source_conversation,original.source_conversation);assert.deepEqual(latest.ai_assistance,original.ai_assistance);assert.equal(latest.id,original.id);assert.equal(latest.student_confirmation.status,'confirmed');assert.notEqual(latest.confirmed_payload_hash,original.confirmed_payload_hash);
 await identity();const exported=await value('select export_intake_diagnostics($1,$2)',[classId,session]);assert.equal(exported.records[0].summaryCorrection.summaryRevision,2);assert.deepEqual(exported.records[0].summaryCorrection.correctionHistory[0].beforeRecord,record);await owner();
 assert.equal(await value('select status from studio_sessions where id=$1',[session]),'closed');assert.equal(await value('select count(*)::integer from student_session_intakes'),1);
});
test('repeat correction cycles append history and reject stale tabs',async()=>{
 await identity(teacher1);const second=await reopen();assert.equal(second.summaryRevision,2);assert.equal(second.correctionHistory.length,2);
 await identity(student1,'student');await assert.rejects(reconfirm(record,1),/locked/);const third=await reconfirm(record,2);assert.equal(third.summaryRevision,3);assert.equal(third.correctionHistory.length,2);
});
test('enrolment/account checks prevent reconfirm after access is withdrawn',async()=>{
 await identity(teacher1);await reopen();await owner();await db.query("update student_accounts set status='disabled' where student_id='correction-one'");await identity(student1,'student');await assert.rejects(reconfirm(record,3),/not available/);
 await owner();await db.query("update student_accounts set status='activated' where student_id='correction-one'");await db.query("delete from student_roster where student_id='correction-one'");await identity(student1,'student');await assert.rejects(reconfirm(record,3),/not available/);
});
