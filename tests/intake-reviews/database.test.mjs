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
const draft={status:'follow_up',items:[{category:'Code review',status:'follow_up',observation:'Loading never stops on API failure',recommendation:'Handle errors and allow retry',evidence:'Demonstrate an API failure',privateNote:'do not leak nested extras'}],actions:[{task:'Add error handling',evidence:'Test report',due:'S5',privateNote:'secret'}],privateNote:'do not leak top-level extras'};
const load=()=>value('select get_intake_teacher_review($1)',[intake]);
const save=(version,publish=false,summaryRevision=1,content=draft)=>value('select save_intake_teacher_review($1,$2,$3,$4,$5,$6)',[intake,version,summaryRevision,content,'Private teacher note',publish]);
const feedback=()=>value('select get_my_intake_teacher_feedback()');
test('only authorized teachers read and save review drafts; students cannot access private table',async()=>{
 await identity(teacher2);await assert.rejects(load(),/not assigned/);await assert.rejects(save(0),/not assigned/);
 await identity(student1,'student');await assert.rejects(load(),/not assigned/);await assert.rejects(save(0),/not assigned/);await assert.rejects(value('select count(*) from intake_teacher_reviews'),/permission denied/);
 await owner();await db.exec('set role anon');await assert.rejects(feedback(),/permission denied/);
 await identity(teacher1);const initial=await load();assert.equal(initial.version,0);assert.deepEqual(initial.studentRecord,record);
 const saved=await save(0);assert.equal(saved.version,1);assert.equal(saved.privateNote,'Private teacher note');assert.equal(saved.published,null);
 await owner();const prior=await value('select to_jsonb(r) from intake_teacher_reviews r where intake_id=$1',[intake]);await db.exec(fs.readFileSync('supabase/migrations/20261105_sprint11_quick_review_choices.sql','utf8'));assert.deepEqual(await value('select to_jsonb(r) from intake_teacher_reviews r where intake_id=$1',[intake]),prior);await db.exec(fs.readFileSync('supabase/migrations/20261105_sprint11_review_standards.sql','utf8'));assert.deepEqual(await value('select to_jsonb(r) from intake_teacher_reviews r where intake_id=$1',[intake]),prior);
 await owner();await db.exec(fs.readFileSync('supabase/migrations/20261105_sprint11_review_standards_v2.sql','utf8'));
 await identity(student1,'student');assert.deepEqual(await feedback(),[]);
});
test('publication exposes only allow-listed feedback to its student; draft updates preserve last publication',async()=>{
 await identity(teacher1);const published=await save(1,true);assert.equal(published.version,2);assert.equal(published.published.summaryRevision,1);
 await identity(student1,'student');let rows=await feedback();assert.equal(rows.length,1);assert.equal(rows[0].feedback.items[0].observation,draft.items[0].observation);assert.equal(JSON.stringify(rows).includes('Private teacher note'),false);assert.equal(JSON.stringify(rows).includes('do not leak'),false);assert.equal(JSON.stringify(rows).includes('secret'),false);
 await identity(student2,'student');assert.deepEqual(await feedback(),[]);
 await identity(teacher1);const changed=structuredClone(draft);changed.items[0].observation='New draft only';await save(2,false,1,changed);
 await identity(student1,'student');rows=await feedback();assert.equal(rows[0].feedback.items[0].observation,draft.items[0].observation);
 await identity(teacher1);const states=await value('select get_teacher_intake_review_states($1)',[session]);assert.equal(states[0].hasDraft,true);
 await owner();assert.deepEqual(await value('select student_record from student_session_intakes where id=$1',[intake]),record);
});
test('stale tabs, invalid publication and student summary changes cannot overwrite reviews',async()=>{
 await identity(teacher1);await assert.rejects(save(1),/another tab/);
 await assert.rejects(save(3,true,1,{status:'reviewed',items:[],actions:[]}),/observation/);
 await assert.rejects(save(3,true,1,{...draft,items:[{...draft.items[0],observation:''}]}),/feedback/);
 await assert.rejects(save(3,false,1,{...draft,items:'invalid'}),/structure/);
 await value('select reopen_intake_summary($1)',[intake]);await assert.rejects(save(3,true),/reconfirm/);await save(3);
 await identity(student1,'student');await value('select reconfirm_my_intake_summary($1,1,$2,$3)',[intake,record,attestation]);
 await identity(teacher1);await assert.rejects(save(4,true),/summary changed/);await save(4,true,2);
 const states=await value('select get_teacher_intake_review_states($1)',[session]);assert.equal(states[0].summaryRevision,2);assert.equal(states[0].hasDraft,false);
});
test('option-only review publishes percentages, choices and optional notes; invalid metadata cannot be saved',async()=>{
 await identity(teacher1);
 const quick={status:'follow_up',items:[{category:'Code review',status:'follow_up',observation:'',recommendation:'',evidence:'',completionPercent:75,finding:'Needs stronger testing',notes:'Student explained the implementation; error-path testing is still pending.',privateNote:'hidden item extra'}],actions:[{task:'Run tests and record the results',evidence:'Test results',due:'Session 5',notes:'Include an API timeout case.'}]};
 await assert.rejects(save(5,true,2,{...quick,items:[{...quick.items[0],completionPercent:101}]}),/percentage/);
 await assert.rejects(save(5,true,2,{...quick,items:[{...quick.items[0],completionPercent:'75'}]}),/percentage/);
 await assert.rejects(save(5,true,2,{...quick,items:[{...quick.items[0],finding:'Fabricated choice'}]}),/feedback choice/);
 await assert.rejects(save(5,true,2,{...quick,actions:[{task:'Other agreed action',evidence:'',due:'',notes:''}]}),/notes/);
 const published=await save(5,true,2,quick);assert.equal(published.published.items[0].completionPercent,75);assert.equal(published.published.items[0].finding,'Needs stronger testing');
 await identity(student1,'student');const visible=(await feedback())[0].feedback;assert.equal(visible.items[0].notes,quick.items[0].notes);assert.equal(visible.actions[0].notes,quick.actions[0].notes);assert.equal(JSON.stringify(visible).includes('hidden item extra'),false);
 await identity(teacher1);await save(6,true,2,{...quick,items:[{...quick.items[0],completionPercent:null,finding:'Not demonstrated yet',status:'not_verified',notes:''}]});
});
test('interview criteria publish without a grade and keep measurements while filtering private extras',async()=>{
 await identity(teacher1);const version=(await load()).version;
 const interview={profile:{kind:'web',ai:true,privateNote:'profile secret'},standardVersion:'interview-review.v1',status:'follow_up',items:[{category:'Testing & evaluation',status:'follow_up',observation:'',recommendation:'',evidence:'',criteria:[{id:'ai-evaluation',label:'AI outputs are checked against representative examples',state:'partial',measurement:'16/20 representative questions answered correctly; unsupported answers still need review.',privateNote:'criterion secret'}]}],actions:[]};
 await assert.rejects(save(version,true,2,{...interview,profile:{kind:'unknown',ai:true}}),/profile/);
 await assert.rejects(save(version,true,2,{...interview,profile:{kind:'web',ai:'true'}}),/profile/);
 await assert.rejects(save(version,true,2,{...interview,items:[{...interview.items[0],criteria:[{...interview.items[0].criteria[0],state:'pass'}]}]}),/criterion/);
 await assert.rejects(save(version,true,2,{...interview,items:[{...interview.items[0],criteria:[...interview.items[0].criteria,...interview.items[0].criteria]}]}),/Duplicate/);
 await assert.rejects(save(version,true,2,{...interview,items:[{...interview.items[0],criteria:[{...interview.items[0].criteria[0],state:'not_reviewed'}]}]}),/criterion decision/);
 const result=await save(version,true,2,interview);assert.equal(result.published.items[0].criteria[0].state,'partial');assert.equal(result.published.standardVersion,'interview-review.v1');
 await identity(student1,'student');const published=(await feedback())[0].feedback;assert.deepEqual(published.profile,{kind:'web',ai:true});assert.equal(published.items[0].criteria[0].measurement,interview.items[0].criteria[0].measurement);assert.equal(JSON.stringify(published).includes('secret'),false);assert.equal(published.totalScore,undefined);
});
test('v2 AI and UI/UX areas publish while older guide versions remain supported',async()=>{
 await identity(teacher1);let version=(await load()).version;
 for(const category of ['AI integration & understanding','UI/UX design']){
 const interview={profile:{kind:'web',ai:true},standardVersion:'interview-review.v2',status:'follow_up',items:[{category,status:'follow_up',observation:'',recommendation:'',evidence:'',criteria:[{id:category.startsWith('AI')?'ai-token-context':'web-responsive',label:category.startsWith('AI')?'Token and context handling':'Required screen usability',state:'partial',measurement:'Student demonstrated the normal case; long-input/failure cases need follow-up.'}]}],actions:[]};
 const result=await save(version,true,2,interview);assert.equal(result.published.standardVersion,'interview-review.v2');assert.equal(result.published.items[0].category,category);version=result.version;
 }
});
test('student acknowledgement is private, idempotent and tied to the current publication',async()=>{
 await identity(teacher1);const start=await load(),version=start.published.reviewVersion;
 const ack=(v=version)=>value('select acknowledge_intake_teacher_feedback($1,$2)',[intake,v]);
 await assert.rejects(ack(),/not available/);await identity(student2,'student');await assert.rejects(ack(),/not available/);
 await identity(student1,'student');assert.equal((await feedback())[0].acknowledgedAt,null);await assert.rejects(ack(version-1),/updated/);
 const at=await ack();assert.ok(at);assert.equal(+new Date(await ack()),+new Date(at));assert.equal(+new Date((await feedback())[0].acknowledgedAt),+new Date(at));await assert.rejects(value('select count(*) from intake_teacher_feedback_receipts'),/permission denied/);
 await identity(teacher1);assert.equal(+new Date((await load()).publishedAcknowledgedAt),+new Date(at));const drafted=await save(start.version,false,2,start.draft);assert.equal(+new Date(drafted.publishedAcknowledgedAt),+new Date(at));
 const republished=await save(drafted.version,true,2,start.draft);assert.equal(republished.publishedAcknowledgedAt,null);await identity(student1,'student');assert.equal((await feedback())[0].acknowledgedAt,null);await assert.rejects(ack(),/updated/);assert.ok(await ack(republished.published.reviewVersion));
});
test('history exposes earlier student claims and published feedback, never private notes',async()=>{
 await owner();const later=await value("insert into studio_sessions(block_id,title,session_date,session_number,status) values($1,'Later',current_date,2,'closed') returning id",[classId]);
 const second=await value("insert into student_session_intakes(session_id,block_id,student_id,auth_user_id,schema_version,source_mode,source_conversation,student_record,ai_assistance,student_confirmation,confirmed_payload_hash) select $1,block_id,student_id,auth_user_id,schema_version,source_mode,source_conversation,student_record,ai_assistance,student_confirmation,'second-hash' from student_session_intakes where id=$2 returning id",[later,intake]);
 await identity(teacher1);const context=await value('select get_intake_teacher_review($1)',[second]);assert.equal(context.history.length,1);assert.equal(context.history[0].sessionNumber,1);assert.ok(context.history[0].feedback);assert.equal(JSON.stringify(context.history).includes('Private teacher note'),false);
 await owner();await db.query("update student_accounts set status='disabled' where auth_user_id=$1",[student1]);await identity(student1,'student');assert.deepEqual(await feedback(),[]);
 await owner();await db.query('delete from teacher_class_memberships where user_id=$1',[teacher1]);await identity(teacher1);await assert.rejects(load(),/not assigned/);await assert.rejects(save(5),/not assigned/);
});
