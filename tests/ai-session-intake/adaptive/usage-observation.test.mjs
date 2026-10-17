import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reserveUsage} from '../../../.test-api/api/intakeUsage.js';
test('advisory ledger row retains trusted scope, configured rates and conservative provision',async()=>{
 let row;
 const admin={rpc:async()=>({error:{message:'Block AI budget reached'}}),from:table=>{assert.equal(table,'session_intake_ai_usage');return {insert:r=>{row=r;return {select:()=>({single:async()=>({data:{id:'ledger-id'}})})}}}}};
 const out=await reserveUsage(admin,'auth','session','request',1,'openai','gpt-5-mini',{version:'frozen',inputUsdPerMillion:.25,outputUsdPerMillion:2},1000,100,{blockId:'trusted-block',studentId:'trusted-student'});
 assert.equal(out.attemptId,'ledger-id');assert.equal(out.warning,'financial_limit_observed_not_enforced');
 assert.deepEqual(row,{block_id:'trusted-block',session_id:'session',auth_user_id:'auth',student_id:'trusted-student',request_id:'request',attempt:1,provider:'openai',model:'gpt-5-mini',pricing_version:'frozen',input_ceiling:1000,output_ceiling:100,input_rate:.25,output_rate:2,reserved_usd:.00045,charged_usd:.00045});
});
test('nonfinancial eligibility refusals never write an advisory row',async()=>{
 for(const message of ['Session AI access denied','Session AI is not open','Progress already recorded','AI request already reserved']){
 const admin={rpc:async()=>({error:{message}}),from:()=>{throw Error('must not insert')}};
 await assert.rejects(reserveUsage(admin,'a','s','r',0,'openai','model',{},10,10,{blockId:'b',studentId:'s'}),/usage_reservation_refused/);
 }
});
