import {readFile} from 'node:fs/promises';
import {db,A,B,block,sid,identity,rpc,early} from '../session-work-track/fixture.mjs';
import {buildFallbackStudentRecord,STUDENT_CONFIRMATION_ATTESTATION} from '../../.test-build/aiSessionIntake.js';

const read=n=>readFile(new URL('../../supabase/migrations/'+n,import.meta.url),'utf8');
const func=(s,n)=>{const a=s.indexOf('create or replace function public.'+n+'(');return s.slice(a,s.indexOf('\n$$;',a)+4)};
await db.exec(`create role service_role bypassrls;grant usage on schema public,auth to service_role;
alter table student_roster add column id uuid default gen_random_uuid();alter table student_roster add column project_name text;
alter table teaching_blocks add column block_code text default '2B2';alter table teaching_blocks add column academic_year integer default 2026;
alter table studio_sessions add column intake_access text not null default 'open';`);
const base=await read('20260903_sprint8_phase2a_intake_foundation.sql');const a=base.indexOf('create table if not exists public.student_session_intakes');
await db.exec(base.slice(a,base.indexOf('\n);',a)+4));
await db.exec(`alter table student_session_intakes drop constraint student_session_intakes_schema_version_check;
alter table student_session_intakes add check(schema_version in ('session-intake.v1.0.0','session-intake.v1.1.0'));`);
await db.exec(func(base,'validate_session_intake_student_record'));
await db.exec(func(await read('20260916_sprint8_adaptive_intake.sql'),'validate_session_intake_student_record_v11'));
await db.exec(await read('20261014_sprint10_ai01_session_controls.sql'));
await db.exec(`alter table studio_sessions enable row level security;alter table teaching_blocks enable row level security;grant select,update on studio_sessions,teaching_blocks to authenticated;create policy teacher_sessions on studio_sessions for all to authenticated using(is_teacher()) with check(is_teacher());create policy teacher_blocks on teaching_blocks for all to authenticated using(is_teacher()) with check(is_teacher());`);
const record=buildFallbackStudentRecord({responsibility:'Booking API',progress:'Added validation',progressKind:'advanced',scope:'Booking dates',completionPercent:null,evidenceType:'repository_change',evidenceAvailability:'available_now',evidenceReference:'PR #42',verificationMethod:'Run invalid-date test',testingStatus:'executed',testingMethod:'Unit test',testingResult:'Invalid date rejected',testingBaseline:'',blockerStatus:'none',blockerDescription:'',supportRequested:'',nextAction:'Test missing dates',dueSession:'S3',expectedEvidence:'Test result'},{});
const conversation=[{actor:'system',purpose:'starting question',text:'Progress?'},{actor:'student',purpose:'student answer',text:'Added validation'},{actor:'system',purpose:'review transition',text:'Review your claims.'}];
const confirm={status:'confirmed',attestation:STUDENT_CONFIRMATION_ATTESTATION,corrections:[]};
const saveForm=async(n)=>db.query('select save_my_session_intake_fallback($1,$2,$3,$4)',[sid(n),JSON.stringify(conversation),JSON.stringify(record),JSON.stringify(confirm)]);
const owner=()=>db.exec('reset role');
const reserve=async(n,request,attempt=0)=>{await db.exec('set role service_role');return (await db.query('select reserve_session_intake_ai_attempt($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) result',[A,sid(n),request,attempt,'openai','test-model','test.v1',1000,1000,1,1])).rows[0].result;};
let req=0;const request=()=>`40000000-0000-0000-0000-${String(++req).padStart(12,'0')}`;

export {db,A,B,block,sid,identity,rpc,early,saveForm,owner,reserve,request};
