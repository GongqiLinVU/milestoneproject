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

await db.exec(fs.readFileSync('supabase/migrations/20261105_sprint11_intake_teacher_reviews.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20261105_sprint11_intake_teacher_reviews.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20261105_sprint11_quick_review_choices.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20261105_sprint11_quick_review_choices.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20261105_sprint11_review_standards.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20261105_sprint11_review_standards.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20261105_sprint11_review_standards_v2.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20261105_sprint11_review_teacher_feedback_receipts.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20261111_sprint11_review_modes.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20261111_sprint11_review_modes.sql','utf8'));

await db.exec(fs.readFileSync('supabase/migrations/20261112_review_suggestion_context.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20261112_review_suggestion_context.sql','utf8'));
const ids={1:intake};
await owner();
for(const n of [2,3,4,5,6]){
 const sid=await value("insert into studio_sessions(block_id,title,session_date,session_number,status) values($1,$2,current_date,$3,'closed') returning id",[classId,'Session '+n,n]);
 ids[n]=await value("insert into student_session_intakes(session_id,block_id,student_id,auth_user_id,schema_version,source_mode,source_conversation,student_record,student_confirmation,confirmed_payload_hash) select $1,block_id,student_id,auth_user_id,schema_version,source_mode,source_conversation,student_record,student_confirmation,confirmed_payload_hash from student_session_intakes where id=$2 returning id",[sid,intake]);
}
const ctx=()=>value('select get_review_suggestion_context($1)',[ids[5]]);
const publish=async(n,draft,yes=true,version=0)=>value("select save_intake_teacher_review($1,$2,1,$3,'', $4)",[ids[n],version,draft,yes]);
const prose={mode:'detailed',quickNotes:'Student reports progress. Verify API integration next.',status:'follow_up',items:[],actions:[]};
test('context authorizes caller and includes only this student through selected session',async()=>{
 await identity(teacher2);await assert.rejects(ctx(),/not assigned/);
 await identity(student1,'student');await assert.rejects(ctx(),/not assigned/);
 await identity(teacher1);const c=await ctx();assert.equal(c.baselineSession,null);assert.deepEqual(c.updates.map(x=>x.sessionNumber),[1,2,3,4,5]);
});
test('narrative detailed review publishes; AI suggestion and private metadata stay teacher-only',async()=>{
 await identity(teacher1);const saved=await publish(3,{...prose,suggestion:{feedback:'Unconfirmed suggestion'}});
 assert.equal(saved.published.quickNotes,prose.quickNotes);assert.equal(saved.published.suggestion,undefined);
 const c=await ctx();assert.equal(c.baselineSession,3);assert.deepEqual(c.updates.map(x=>x.sessionNumber),[4,5]);
});
test('prior draft does not move baseline and suggestion-only cannot publish',async()=>{
 await identity(teacher1);await publish(4,{...prose,quickNotes:'Draft only'},false);
 assert.equal((await ctx()).baselineSession,3);
 await assert.rejects(publish(5,{...prose,quickNotes:'',suggestion:{feedback:'Only AI'}}),/observation/);
});
test('regenerating current suggestion preserves prose and earlier publication',async()=>{
 await identity(teacher1);await publish(5,{...prose,suggestion:{feedback:'First AI'}},false);
 await publish(5,{...prose,suggestion:{feedback:'Second AI'}},false,1);
 const c=await value('select get_intake_teacher_review($1)',[ids[5]]);assert.equal(c.draft.quickNotes,prose.quickNotes);assert.equal(c.draft.suggestion.feedback,'Second AI');assert.equal(c.published,null);
 const old=await value('select get_intake_teacher_review($1)',[ids[3]]);assert.equal(old.published.quickNotes,prose.quickNotes);
});
test('corrected or reopened baseline is not treated as completed current verification',async()=>{
 await owner();await db.query('update student_session_intakes set summary_revision=2 where id=$1',[ids[3]]);
 await identity(teacher1);assert.equal((await ctx()).baselineSession,null);
});
