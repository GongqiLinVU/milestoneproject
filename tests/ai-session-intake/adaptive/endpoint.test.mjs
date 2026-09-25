import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import handler from '../../../.test-api/api/session-intake-ai.js';
process.env.SUPABASE_URL='https://mock.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='mock';process.env.OPENAI_API_KEY='mock';
const turns=Array.from({length:8},(_,i)=>[{actor:'system',purpose:'clarification',text:`Question ${i}`},{actor:'student',purpose:'student response',text:`Answer ${i}`}]).flat();
const result={assistantMessage:'What else?',route:'clarification',readyForReview:false,evidenceUpdates:[],assessment:{sourceTurns:[15]},uncertainties:[],suggestedTeacherQuestions:[]};
const recorded=JSON.parse(readFileSync(new URL('./recorded-cases.json',import.meta.url),'utf8')).cases;
async function run(conversation,modelResult=result,failed=false,blockCode='2B2'){
 let sent;let providerCalls=0;const original=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
  const path=String(url);
  let value={};
  if(path.includes('openai.com')){providerCalls++;sent=JSON.parse(options.body);if(failed)throw Error('offline');return new Response(JSON.stringify({status:'completed',model:'actual-model',usage:{input_tokens:100,output_tokens:50},output_text:JSON.stringify(modelResult)}),{status:200,headers:{'content-type':'application/json'}})}
  if(path.includes('/auth/'))value={id:'mock-user'};
  else if(path.includes('student_accounts'))value={student_id:'mock-student'};
  else if(path.includes('teaching_blocks'))value={block_code:blockCode,academic_year:2026};
  else if(path.includes('student_session_intakes'))value=null;
  else if(path.includes('student_roster'))value={id:'mock-roster'};
  else if(path.includes('studio_sessions'))value=path.includes('session_number=lt.')?[]:{id:'session',block_id:'block',session_number:3,curriculum_focus:'Progress',intake_access:'open'};
  return new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json'}});
 };
 const res={setHeader(){},status(code){this.code=code;return this},json(value){this.body=value;return this}};
 try{await handler({method:'POST',headers:{authorization:'Bearer mock'},body:{mode:'turn',sessionId:'00000000-0000-0000-0000-000000000000',answers:{},conversation}},res);return {res,sent,providerCalls}}finally{globalThis.fetch=original}
}
test('endpoint sends scoped complete 16-message context and forces review at budget',async()=>{const {res,sent}=await run(turns);assert.equal(res.code,200);const context=JSON.parse(sent.input);assert.equal(context.conversation.length,16);assert.equal(context.conversation[0].text,'Question 0');assert.equal(context.conversation.at(-1).text,'Answer 7');assert.equal(context.sessionContext.scope.academicYear,2026);assert.deepEqual(context.retrievedKnowledge,[]);assert.equal(res.body.result.readyForReview,true);assert.equal(res.body.model,'actual-model');assert.equal(res.body.usage.input_tokens,100)});
test('recorded first-answer source error is repaired without losing valid fields or dialogue',async()=>{const c=recorded[0];const {res}=await run(c.conversation,c.candidate);assert.equal(res.code,200);assert.equal(res.body.result.assistantMessage,c.candidate.assistantMessage);assert.equal(res.body.result.evidenceUpdates.length,3);assert.equal(res.body.fieldDecisions[1].outcome,'repaired');assert.equal(res.body.fieldDecisions[1].sourceTurn,1)});
test('unlocatable source rejects one field while retaining the other and the conversation',async()=>{const c=recorded[0];const broken={...c.candidate,evidenceUpdates:[c.candidate.evidenceUpdates[0],{...c.candidate.evidenceUpdates[1],value:'unmentioned document XYZ-999',sourceTurn:0}]};const {res}=await run(c.conversation,broken);assert.equal(res.code,200);assert.equal(res.body.result.evidenceUpdates.length,1);assert.equal(res.body.fieldDecisions[1].outcome,'rejected');assert.equal(res.body.acceptanceLevel,'L1')});
test('dialogue-only response retains conversation with extraction pending',async()=>{const {res}=await run(turns.slice(0,2),{...result,evidenceUpdates:[{field:'teacher_marks',value:'A',sourceTurn:1}]});assert.equal(res.code,200);assert.equal(res.body.extractionPending,true);assert.equal(res.body.result.readyForReview,false)});
test('endpoint rejects over-budget transcript before provider call',async()=>{const {res,sent}=await run([...turns,...turns.slice(0,2)]);assert.equal(res.code,400);assert.equal(sent,undefined)});
test('endpoint retries provider once, then continues without adding a question',async()=>{const {res,providerCalls}=await run(turns.slice(0,2),result,true);assert.equal(res.code,200);assert.equal(res.body.result.route,'provider_fallback_continue');assert.equal(res.body.result.readyForReview,false);assert.equal(res.body.retryCount,1);assert.equal(providerCalls,2)});
test('2B1 is refused before any model call',async()=>{const {res,providerCalls}=await run(turns.slice(0,2),result,false,'2B1');assert.equal(res.code,403);assert.equal(providerCalls,0)});
