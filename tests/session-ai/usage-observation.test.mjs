import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {db,A,block,sid,owner,request} from './fixture.mjs';
import {reserveUsage,finishUsage} from '../../.test-api/api/intakeUsage.js';
after(()=>db.close());
const admin={rpc:async(name,args)=>{try{await db.exec('set role service_role');const entries=Object.entries(args);const q='select public.'+name+'('+entries.map(([k],i)=>k+'=> $'+(i+1)).join(',')+') result';return {data:(await db.query(q,entries.map(([,v])=>v))).rows[0].result};}catch(e){return {error:{message:e.message}};}},from:()=>({insert:row=>({select:()=>({single:async()=>{try{const keys=Object.keys(row);const result=await db.query('insert into public.session_intake_ai_usage('+keys.join(',')+') values ('+keys.map((_,i)=>'$'+(i+1)).join(',')+') returning id',Object.values(row));return {data:result.rows[0]};}catch(e){return {error:{message:e.message}};}}})})})};
test('actual service-role ledger retains advisory attempt and settles with zero reference budget',async()=>{
 await owner();await db.query("update studio_sessions set intake_mode_override='ai',intake_access='open' where id=$1",[sid(7)]);
 await db.query('update teaching_blocks set intake_ai_budget_usd=0,intake_ai_attempt_limit=0 where id=$1',[block]);
 await db.exec(await readFile(new URL('../../supabase/migrations/20261015_sprint10_ai03_primary_model.sql',import.meta.url),'utf8'));
 const reservation=await reserveUsage(admin,A,sid(7),request(),0,'openai','gpt-5-mini',{version:'frozen',inputUsdPerMillion:.25,outputUsdPerMillion:2},1000,100,{blockId:block,studentId:'s1001'});
 assert.equal(reservation.warning,'financial_limit_observed_not_enforced');
 const settled=await finishUsage(admin,reservation.attemptId,{model:'opaque-future-label',usage:{input_tokens:100,output_tokens:50}},'openai');assert.equal(settled.status,'settled');assert.equal(settled.costUsd,.000125);
 const row=(await db.query('select * from public.session_intake_ai_usage where id=$1',[reservation.attemptId])).rows[0];
 assert.equal(row.auth_user_id,A);assert.equal(row.student_id,"s1001");assert.equal(row.block_id,block);assert.equal(row.input_tokens,100);assert.equal(row.output_tokens,50);assert.equal(row.reported_model,'opaque-future-label');assert.equal(Number(row.charged_usd),.000125);
 await db.exec('set role authenticated');await assert.rejects(db.query('select * from public.session_intake_ai_usage'),/permission denied/);
});
