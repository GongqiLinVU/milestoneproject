import {test,after} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {db,sid,identity,owner} from './fixture.mjs';
import {buildFallbackStudentRecord,validateIntakeStudentRecord,STUDENT_CONFIRMATION_ATTESTATION} from '../../.test-build/aiSessionIntake.js';
import {validateFocusedIntakeRecord} from '../../.test-focused/intakeReview.js';
after(()=>db.close());
test('unknown progress persists unchanged only through focused validation; migration is idempotent and private',async()=>{
 await owner();
 for(const name of ['20261015_sprint10_ai03_primary_model.sql','20261019_sprint10_focused_review.sql','20261019_sprint10_unknown_progress.sql','20261019_sprint10_unknown_progress.sql'])await db.exec(await readFile(new URL('../../supabase/migrations/'+name,import.meta.url),'utf8'));
 const record=buildFallbackStudentRecord({responsibility:'Dashboard frontend',scope:'Dashboard',progress:'Worked on the dashboard; specific outcome unclear',progressKind:'unknown',completionPercent:null,evidenceType:'other',evidenceAvailability:'unknown',evidenceReference:'',verificationMethod:'',testingStatus:'unknown',testingMethod:'',testingResult:'',testingBaseline:'',blockerStatus:'unknown',blockerDescription:'',supportRequested:'',nextAction:'',dueSession:'S2',expectedEvidence:''},{},false);
 assert.equal(validateFocusedIntakeRecord(record).valid,true);assert.equal(validateIntakeStudentRecord(record).valid,false);
 assert.deepEqual((await db.query('select validate_session_intake_student_record_v12($1) errors',[JSON.stringify(record)])).rows[0].errors,[]);
 assert.ok((await db.query('select validate_session_intake_student_record_v11($1) errors',[JSON.stringify(record)])).rows[0].errors.length);
 for(const kind of ['',null,'invented']){const bad=structuredClone(record);bad.claims[0].progress_kind=kind;assert.equal(validateFocusedIntakeRecord(bad).valid,false);assert.ok((await db.query('select validate_session_intake_student_record_v12($1) errors',[JSON.stringify(bad)])).rows[0].errors.length);}
 const bad=structuredClone(record);bad.claims[0].statement='';assert.ok((await db.query('select validate_session_intake_student_record_v12($1) errors',[JSON.stringify(bad)])).rows[0].errors.length);
 await db.query("update studio_sessions set intake_mode_override='ai',intake_access='open' where id=$1",[sid(1)]);await identity();
 const source=[{actor:'system',purpose:'question',text:'What progressed?'},{actor:'student',purpose:'answer',text:'Worked on the dashboard; specific outcome unclear.'},{actor:'system',purpose:'review transition',text:'Review your record.'}];
 await db.query('select save_my_session_intake_chat($1,$2,$3,$4,$5,$6)',[sid(1),JSON.stringify(source),JSON.stringify(record),JSON.stringify({status:'confirmed',attestation:STUDENT_CONFIRMATION_ATTESTATION,corrections:[]}),'session-intake-ai.v1.3.1',JSON.stringify({review_version:'focused-review.v1',debug_events:[],used:true,model:'synthetic',policy_version:'adaptive-intake.v1.1.0',follow_up_count:0,question_purposes:[],extraction_status:'completed',stop_reason:'sufficient_information',extracted_record:record,turn_results:[],turn_decisions:[]})]);
 assert.equal((await db.query('select get_my_session_intake($1) result',[sid(1)])).rows[0].result.confirmedRecord.studentRecord.claims[0].progress_kind,'unknown');
 await assert.rejects(db.query('select validate_session_intake_student_record_v12_known($1)',[JSON.stringify(record)]),/permission denied/);
});
