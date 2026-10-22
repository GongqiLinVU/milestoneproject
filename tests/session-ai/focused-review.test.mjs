import {test,after} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {db,A,B,sid,identity,owner} from './fixture.mjs';
import {buildFallbackStudentRecord,STUDENT_CONFIRMATION_ATTESTATION,validateIntakeStudentRecord} from '../../.test-build/aiSessionIntake.js';
import {buildFocusedStudentRecord,validateFocusedIntakeRecord,packReviewDebug,restoreReviewDebug} from '../../.test-focused/intakeReviewSupport.js';
after(()=>db.close());
const answers={responsibility:'Dashboard frontend',progress:'Completed loading, empty and API-error states',progressKind:'completed',scope:'Dashboard',completionPercent:null,evidenceType:'live_demonstration',evidenceAvailability:'available_now',evidenceReference:'Live demo of the three states',verificationMethod:'',testingStatus:'executed',testingMethod:'Slow connection and API response simulation',testingResult:'All three states displayed correctly',testingBaseline:'',blockerStatus:'unknown',blockerDescription:'',supportRequested:'',nextAction:'',dueSession:'S2',expectedEvidence:''};
const record=buildFallbackStudentRecord(answers,{},false);
const source=[{actor:'system',purpose:'starting question',text:'What progressed?'},{actor:'student',purpose:'answer',text:'I completed and tested all three states and can show a live demo.'},{actor:'system',purpose:'review transition',text:'Review your progress.'}];
const trace=[{at:'2026-10-19T00:00:00Z',mode:'turn',request:{conversation:source.slice(0,2),answersSnapshot:answers},response:{result:{readyForReview:true},usageWarnings:[]}}];
const metadata={used:true,model:'gpt-5-mini',policy_version:'adaptive-intake.v1.1.0',follow_up_count:0,question_purposes:[],extraction_status:'completed',stop_reason:'sufficient_information',extracted_record:record,turn_results:[],turn_decisions:[],review_version:'focused-review.v1',debug_events:packReviewDebug(trace)};
const confirmation={status:'confirmed',attestation:STUDENT_CONFIRMATION_ATTESTATION,corrections:[]};
const save=(n,r=record,m=metadata)=>db.query('select save_my_session_intake_chat($1,$2,$3,$4,$5,$6) result',[sid(n),JSON.stringify(source),JSON.stringify(r),JSON.stringify(confirmation),'session-intake-ai.v1.3.1',JSON.stringify(m)]);
test('focused review permits unknown optional facts without changing the legacy validator',async()=>{
 assert.equal(buildFocusedStudentRecord({...answers,evidenceAvailability:'unknown'},false).evidence[0].reference,answers.evidenceReference);
 assert.equal(validateFocusedIntakeRecord(record).valid,true);assert.equal(validateIntakeStudentRecord(record).valid,false);
 await owner();await db.query("update studio_sessions set intake_mode_override='ai',intake_access='open' where session_number in (1,2,6,7)");
 const sql=await readFile(new URL('../../supabase/migrations/20261019_sprint10_focused_review.sql',import.meta.url),'utf8');await db.exec(await readFile(new URL('../../supabase/migrations/20261015_sprint10_ai03_primary_model.sql',import.meta.url),'utf8'));await db.exec(sql);await db.exec(sql);
 assert.deepEqual((await db.query('select validate_session_intake_student_record_v12($1) errors',[JSON.stringify(record)])).rows[0].errors,[]);
 await identity();const legacy={...metadata};delete legacy.review_version;delete legacy.debug_events;await assert.rejects(save(1,record,legacy),e=>/incomplete/.test(e.message)&&/reference|expected evidence/.test(e.detail||''));
 const saved=(await save(1)).rows[0].result;assert.equal(saved.schemaVersion,'session-intake.v1.2.0');
 const data=(await db.query('select get_my_session_intake($1) result',[sid(1)])).rows[0].result.confirmedRecord;
 assert.equal(data.studentRecord.evidence[0].verification_method,null);assert.equal(data.studentRecord.next_action.action,'');assert.equal(data.studentRecord.testing[0].baseline_or_expected,null);
 assert.deepEqual(restoreReviewDebug(data.aiAssistance.debug_events,data.sourceConversation)[0].request.conversation,source.slice(0,2));
 const complete=structuredClone(record);complete.evidence[0].verification_method='Teacher can request the demo';complete.next_action={action:'Check mobile layout',due_session:'S8',expected_evidence:'Mobile screenshots'};assert.equal((await save(7,complete,legacy)).rows[0].result.schemaVersion,'session-intake.v1.1.0');
 await assert.rejects(save(1),/already/);await identity(B);await assert.rejects(db.query('select get_my_session_intake($1)',[sid(1)]),/not available/);
 await db.exec('set role anon');await assert.rejects(db.query('select get_my_session_intake($1)',[sid(1)]),/permission denied/);
});
test('optional omissions do not relax structure, source pointers, confirmation or window checks',async()=>{
 await identity();
 for(const malformed of [{...record,next_action:{action:42,due_session:'S2',expected_evidence:''}},{...record,evidence:[{...record.evidence[0],verification_method:42}]},{...record,claims:[{...record.claims[0],statement:''}]}]){
 assert.equal(validateFocusedIntakeRecord(malformed).valid,false);await assert.rejects(save(2,malformed),e=>/incomplete/.test(e.message)&&/invalid/.test(e.detail||''));
 }
 const badSource={...metadata,turn_results:[{evidenceUpdates:[{field:'claim',value:'x',sourceTurn:0}]}]};await assert.rejects(save(2,record,badSource),/source is invalid/);
 await assert.rejects(save(2,record,{...metadata,debug_events:Array(33).fill({})}),/debug metadata/);
 await owner();await db.query("update studio_sessions set intake_access='closed' where id=$1",[sid(6)]);await identity();await assert.rejects(save(6),/open/);
});
test('debug packing is bounded and flags omitted detail',()=>{
 const events=Array.from({length:40},(_,i)=>({at:String(i),mode:'turn',request:{conversation:source.slice(0,2)},response:{rawCandidate:'x'.repeat(20000),result:{readyForReview:true}}}));
 const before=JSON.stringify(events);const packed=packReviewDebug(events);assert.equal(JSON.stringify(events),before);assert.ok(packed.length<=32);assert.ok(JSON.stringify(packed).length<170000);assert.equal(packed[0].request.capturedEventCount,40);assert.equal(packed[0].response.traceDetailOmitted,true);
});
