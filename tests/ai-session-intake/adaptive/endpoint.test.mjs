import {test} from 'node:test';
import assert from 'node:assert/strict';
import handler from '../../../.test-api/api/session-intake-ai.js';
process.env.SUPABASE_URL='https://mock.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='mock';process.env.OPENAI_API_KEY='mock';
const turns=Array.from({length:8},(_,i)=>[{actor:'system',purpose:'clarification',text:`Question ${i}`},{actor:'student',purpose:'student response',text:`Answer ${i}`}]).flat();
const result={assistantMessage:'What else?',route:'clarification',readyForReview:false,evidenceUpdates:[],assessment:{sourceTurns:[15]},uncertainties:[],suggestedTeacherQuestions:[]};
async function run(conversation,modelResult=result,failed=false){
 let sent;const original=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
  const path=String(url);
  let value={};
  if(path.includes('openai.com')){sent=JSON.parse(options.body);if(failed)throw Error('offline');return new Response(JSON.stringify({status:'completed',model:'actual-model',usage:{input_tokens:100,output_tokens:50},output_text:JSON.stringify(modelResult)}),{status:200,headers:{'content-type':'application/json'}})}
  if(path.includes('/auth/'))value={id:'mock-user'};
  else if(path.includes('student_accounts'))value={student_id:'mock-student'};
  else if(path.includes('teaching_blocks'))value={block_code:'2B2'};
  else if(path.includes('student_session_intakes'))value=null;
  else if(path.includes('student_roster'))value={id:'mock-roster'};
  else if(path.includes('studio_sessions'))value=path.includes('session_number=lt.')?[]:{id:'session',block_id:'block',session_number:3,curriculum_focus:'Progress',intake_access:'open'};
  return new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json'}});
 };
 const res={setHeader(){},status(code){this.code=code;return this},json(value){this.body=value;return this}};
 try{await handler({method:'POST',headers:{authorization:'Bearer mock'},body:{mode:'turn',sessionId:'00000000-0000-0000-0000-000000000000',answers:{},conversation}},res);return {res,sent}}finally{globalThis.fetch=original}
}
test('endpoint sends complete 16-message context and forces review at budget',async()=>{const {res,sent}=await run(turns);assert.equal(res.code,200);const context=JSON.parse(sent.input);assert.equal(context.conversation.length,16);assert.equal(context.conversation[0].text,'Question 0');assert.equal(context.conversation.at(-1).text,'Answer 7');assert.equal(res.body.result.readyForReview,true);assert.equal(res.body.model,'actual-model');assert.equal(res.body.usage.input_tokens,100)});
test('endpoint rejects assistant-linked extraction',async()=>{const {res}=await run(turns,{...result,evidenceUpdates:[{field:'claim',value:'Completed',state:'student_claim',sourceTurn:0}]});assert.equal(res.code,502);assert.equal(res.body.code,'invalid_provider_response')});
test('endpoint rejects over-budget transcript before provider call',async()=>{const {res,sent}=await run([...turns,...turns.slice(0,2)]);assert.equal(res.code,400);assert.equal(sent,undefined)});
test('endpoint reports network failure for fallback',async()=>{const {res}=await run(turns,result,true);assert.equal(res.code,502);assert.equal(res.body.code,'provider_network')});
