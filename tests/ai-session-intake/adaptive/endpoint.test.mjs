process.env.INTAKE_USAGE_PRICING_JSON=JSON.stringify({openai:{model:"gpt-5-mini",version:"test.v1",inputUsdPerMillion:1,outputUsdPerMillion:1}});
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import handler from '../../../.test-api/api/session-intake-ai.js';
process.env.SUPABASE_URL='https://mock.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='mock';process.env.OPENAI_API_KEY='mock';
const turns=Array.from({length:8},(_,i)=>[{actor:'system',purpose:'clarification',text:`Question ${i}`},{actor:'student',purpose:'student response',text:`Answer ${i}`}]).flat();
const result={assistantMessage:'What else?',route:'clarification',readyForReview:false,evidenceUpdates:[],assessment:{sourceTurns:[15]},uncertainties:[],suggestedTeacherQuestions:[]};
const recorded=JSON.parse(readFileSync(new URL('./recorded-cases.json',import.meta.url),'utf8')).cases;
async function run(conversation,modelResult=result,failed=false,blockCode='2B2',intakeMode='ai',override=null,usageState=null,reportedLabel='actual-model',mode='turn',providerStatus='completed'){
 let sent;let settlementRequest;let providerCalls=0;const original=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
  const path=String(url);
  let value={};
  if(path.includes('reserve_session_intake_ai_attempt')){if(usageState&&usageState.calls>=usageState.limit)return new Response(JSON.stringify({message:usageState.reason||'Session AI attempt limit reached',code:'P0001'}),{status:400});if(usageState)usageState.calls++;value={attemptId:'mock-attempt',reservedUsd:0.1};}
  else if(path.includes('/session_intake_ai_usage')){if(usageState?.insertFailed)return new Response(JSON.stringify({message:'offline'}),{status:503});if(usageState)usageState.inserts=(usageState.inserts||0)+1;value={id:'advisory-attempt'};}
  else if(path.includes('finish_session_intake_ai_attempt')){if(usageState?.settlementFailed)return new Response(JSON.stringify({message:'offline'}),{status:503});settlementRequest=JSON.parse(options.body);value=usageState?.reconciliationRequired?{costUsd:null,chargedUsd:0.1,status:'uncertain',reconciliationRequired:true}:{costUsd:0.001,chargedUsd:0.001,status:'settled'};}
  else if(path.includes('openai.com')){providerCalls++;sent=JSON.parse(options.body);if(failed)throw Error('offline');return new Response(JSON.stringify({status:providerStatus,incomplete_details:providerStatus==='incomplete'?{reason:'max_output_tokens'}:null,model:reportedLabel,usage:{input_tokens:100,output_tokens:50},output_text:JSON.stringify(modelResult)}),{status:200,headers:{'content-type':'application/json'}})}
  if(path.includes('/auth/'))value={id:'mock-user'};
  else if(path.includes('student_accounts'))value={student_id:'mock-student'};
  else if(path.includes('teaching_blocks'))value={block_code:blockCode,academic_year:2026,status:'active',intake_mode:intakeMode};
  else if(path.includes('student_session_intakes')||path.includes('student_session_work_tracks'))value=null;
  else if(path.includes('student_roster'))value={id:'mock-roster'};
  else if(path.includes('studio_sessions'))value=path.includes('session_number=lt.')?[]:{id:'session',block_id:'block',session_number:3,curriculum_focus:'Progress',intake_access:'open',intake_mode_override:override};
  return new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json'}});
 };
 const res={setHeader(){},status(code){this.code=code;return this},json(value){this.body=value;return this}};
 try{await handler({method:'POST',headers:{authorization:'Bearer mock'},body:{mode,sessionId:'00000000-0000-0000-0000-000000000000',answers:{},conversation}},res);return {res,sent,providerCalls,settlementRequest}}finally{globalThis.fetch=original}
}
test('endpoint sends scoped complete 16-message context and forces review at budget',async()=>{const {res,sent}=await run(turns);assert.equal(res.code,200);const context=JSON.parse(sent.input);assert.equal(context.conversation.length,16);assert.equal(context.conversation[0].text,'Question 0');assert.equal(context.conversation.at(-1).text,'Answer 7');assert.equal(context.sessionContext.scope.academicYear,2026);assert.deepEqual(context.retrievedKnowledge,[]);assert.equal(res.body.result.readyForReview,true);assert.equal(res.body.model,'gpt-5-mini');assert.equal(res.body.reportedModel,'actual-model');assert.equal(res.body.manifest.costBasis,'configured_model_rates');assert.equal(res.body.usage.input_tokens,100)});
test('recorded first-answer source error is repaired without losing valid fields or dialogue',async()=>{const c=recorded[0];const {res}=await run(c.conversation,c.candidate);assert.equal(res.code,200);assert.equal(res.body.result.assistantMessage,c.candidate.assistantMessage);assert.equal(res.body.result.evidenceUpdates.length,3);assert.equal(res.body.fieldDecisions[1].outcome,'repaired');assert.equal(res.body.fieldDecisions[1].sourceTurn,1)});
test('unlocatable source rejects one field while retaining the other and the conversation',async()=>{const c=recorded[0];const broken={...c.candidate,evidenceUpdates:[c.candidate.evidenceUpdates[0],{...c.candidate.evidenceUpdates[1],value:'unmentioned document XYZ-999',sourceTurn:0}]};const {res}=await run(c.conversation,broken);assert.equal(res.code,200);assert.equal(res.body.result.evidenceUpdates.length,1);assert.equal(res.body.fieldDecisions[1].outcome,'rejected');assert.equal(res.body.acceptanceLevel,'L1')});
test('dialogue-only response retains conversation with extraction pending',async()=>{const {res}=await run(turns.slice(0,2),{...result,evidenceUpdates:[{field:'teacher_marks',value:'A',sourceTurn:1}]});assert.equal(res.code,200);assert.equal(res.body.extractionPending,true);assert.equal(res.body.result.readyForReview,false)});
test('endpoint rejects over-budget transcript before provider call',async()=>{const {res,sent}=await run([...turns,...turns.slice(0,2)]);assert.equal(res.code,400);assert.equal(sent,undefined)});
test('provider outage returns a retryable error without a fabricated fallback question',async()=>{const {res,providerCalls}=await run(turns.slice(0,2),result,true);assert.equal(res.code,502);assert.equal(res.body.result,undefined);assert.equal(res.body.retryCount,1);assert.equal(providerCalls,2)});
test('a non-ai Block capability (disabled) is refused before any model call',async()=>{const {res,providerCalls}=await run(turns.slice(0,2),result,false,'2B1','disabled');assert.equal(res.code,403);assert.equal(providerCalls,0)});
test('deterministic Block capability is refused by the AI endpoint before any model call',async()=>{const {res,providerCalls}=await run(turns.slice(0,2),result,false,'2B2','deterministic');assert.equal(res.code,403);assert.equal(providerCalls,0)});

// M14 (API auth): the missing-token 403 must fire BEFORE any network call —
// no auth lookup, no student-context read, and no model call. The catalog's
// existing `access control` integration scenario uses a VALID token with a bad
// session id, so it exercises the context path, not the no-token path; it does
// not protect the M14 branch. This test drives the real handler with no
// Authorization header and asserts the request is refused with zero outbound
// fetches of any kind (auth, Supabase table read, or provider).
test('M14: an unauthenticated request (no token) is refused before any auth, student-context, or model call',async()=>{
  const original=globalThis.fetch;
  const calls={auth:0,supabase:0,provider:0};
  globalThis.fetch=async(url)=>{
    const path=String(url);
    if(path.includes('openai.com'))calls.provider++;
    else if(path.includes('/auth/'))calls.auth++;
    else calls.supabase++;
    return new Response(JSON.stringify({}),{status:200,headers:{'content-type':'application/json'}});
  };
  const res={setHeader(){},status(code){this.code=code;return this},json(value){this.body=value;return this}};
  try{
    // No `authorization` header at all — the deployed browser path always sends
    // `Bearer <token>`; its absence must be rejected, not treated as anonymous access.
    await handler({method:'POST',headers:{},body:{mode:'turn',sessionId:'00000000-0000-0000-0000-000000000000',answers:{},conversation:turns.slice(0,2)}},res);
  }finally{globalThis.fetch=original}
  assert.equal(res.code,403,`expected 403 for a missing token, got ${res.code}`);
  assert.equal(res.body.code,'authentication_failed');
  assert.equal(res.body.stage,'authentication');
  assert.equal(calls.provider,0,'no model call may occur for an unauthenticated request');
  assert.equal(calls.auth,0,'no auth lookup should occur when the token is absent');
  assert.equal(calls.supabase,0,'no student-context read may occur for an unauthenticated request');
});

test('Session AI override works while the Block defaults to classroom forms',async()=>{const {res,providerCalls}=await run(turns.slice(0,2),result,false,'2B2','disabled','ai');assert.equal(res.code,200);assert.equal(providerCalls,1)});
test('Session classroom override refuses AI even when the Block defaults to AI',async()=>{const {res,providerCalls}=await run(turns.slice(0,2),result,false,'2B2','ai','disabled');assert.equal(res.code,403);assert.equal(providerCalls,0)});
test('all four financial limits are advisory and each actual call still gets a ledger row',async()=>{
 for(const reason of ['AI trial budget not configured','AI usage needs reconciliation','Session AI attempt limit reached','Block AI budget reached']){
 const state={calls:0,limit:0,reason};const {res,providerCalls}=await run(turns.slice(0,2),result,false,'2B2','ai',null,state);
 assert.equal(providerCalls,1);assert.equal(res.code,200);assert.equal(state.inserts,1);assert.ok(res.body.usageWarnings.includes('financial_limit_observed_not_enforced'));assert.equal(res.body.usageAttempts[0].status,'settled');}
});
test('missing pricing permits dialogue and explicitly reports unknown cost',async()=>{const saved=process.env.INTAKE_USAGE_PRICING_JSON;delete process.env.INTAKE_USAGE_PRICING_JSON;try{const {res,providerCalls}=await run(turns.slice(0,2));assert.equal(res.code,200);assert.equal(providerCalls,1);assert.ok(res.body.usageWarnings.includes('pricing_not_configured'));assert.equal(res.body.manifest.cost,null);assert.equal(res.body.manifest.costComplete,false);assert.equal(res.body.usageAttempts[0].inputTokens,100)}finally{process.env.INTAKE_USAGE_PRICING_JSON=saved}});
test('reconciliation and settlement outages never discard a valid model reply',async()=>{for(const extra of [{reconciliationRequired:true},{settlementFailed:true}]){const state={calls:0,limit:10,...extra};const {res,providerCalls}=await run(turns.slice(0,2),result,false,'2B2','ai',null,state);assert.equal(providerCalls,1);assert.equal(res.code,200);assert.equal(res.body.result.assistantMessage,result.assistantMessage);assert.ok(res.body.usageWarnings.length>0)}});
test('failed advisory ledger write preserves dialogue and reports unrecorded token usage',async()=>{const {res,providerCalls}=await run(turns.slice(0,2),result,false,'2B2','ai',null,{calls:0,limit:0,insertFailed:true});assert.equal(res.code,200);assert.equal(providerCalls,1);assert.equal(res.body.usageAttempts[0].persisted,false);assert.equal(res.body.usageAttempts[0].inputTokens,100);assert.ok(res.body.usageWarnings.includes('usage_accounting_unavailable'))});
test('eligibility and duplicate reservation refusals still stop the provider',async()=>{for(const reason of ['Session AI access denied','Session AI is not open','Progress already recorded','AI request already reserved']){const state={calls:0,limit:0,reason};const {res,providerCalls}=await run(turns.slice(0,2),result,false,'2B2','ai',null,state);assert.equal(providerCalls,0);assert.equal(res.code,403);assert.equal(state.inserts,undefined)}});

test('primary model is fixed by the request; opaque, missing and non-string returned labels are audit-only',async()=>{for(const label of ['provider://new-release+canary',null,{deployment:'unknown'},'📦'.repeat(220),'\ud800-new']){const {res,sent,settlementRequest,providerCalls}=await run(turns.slice(0,2),result,false,'2B2','ai',null,null,label);const expected=typeof label==='string'?Array.from(Buffer.from(label,'utf8').toString('utf8')).slice(0,200).join(''):null;assert.equal(res.code,200);assert.equal(providerCalls,1);assert.equal(sent.model,'gpt-5-mini');assert.equal(res.body.model,'gpt-5-mini');assert.equal(res.body.reportedModel,expected);assert.equal(res.body.manifest.model,'gpt-5-mini');assert.equal(settlementRequest.p_reported_model,expected)}});

test('provider receives the shared review contract and exports its version',async()=>{const {res,sent}=await run(turns.slice(0,2));assert.equal(res.code,200);assert.equal(res.body.manifest.reviewContractVersion,'intake-review.v2');assert.equal(res.body.manifest.dialogueRevision,'intake-dialogue.v1.5');for(const label of ['Work and progress','Checks and evidence','Difficulties and support','Next step'])assert.ok(sent.instructions.includes(label));assert.ok(sent.instructions.includes('An initial sparse answer should lead to clarification'));});

test('malformed model output retains bounded diagnostic reason and settled usage',async()=>{const {res}=await run(turns.slice(0,2),null);assert.equal(res.code,502);assert.equal(res.body.reason,'turn_schema');assert.equal(res.body.diagnostics.failureStage,'turn_validation');assert.equal(res.body.diagnostics.providerStatus,'completed');assert.ok(res.body.diagnostics.outputCharacters>0);assert.equal(res.body.result,undefined);assert.ok(!JSON.stringify(res.body).includes('OPENAI_API_KEY'));});

const runSplit=(mode,candidate,status='completed')=>run(turns.slice(0,2),candidate,false,'2B2','ai',null,null,'actual-model',mode,status);
test('lightweight conversation sends only dialogue context and a three-field output schema',async()=>{
 const {res,sent}=await runSplit('chat',{assistantMessage:'Which feature still needs work?',readyForReview:false,reason:'Concrete work is missing'});
 assert.equal(res.code,200);assert.equal(res.body.manifest.task,'conversation');assert.deepEqual(sent.text.format.schema.required,['assistantMessage','readyForReview','reason']);assert.ok(sent.instructions.length<3000);assert.equal(sent.reasoning.effort,'low');assert.equal(JSON.parse(sent.input).answers,undefined);assert.equal(JSON.parse(sent.input).conversation[1].turnIndex,1);assert.deepEqual(res.body.result.evidenceUpdates,[]);assert.equal(res.body.extractionPending,false);assert.equal(res.body.result.readyForReview,false);
});
test('specific conversation answer may close without extracting or filling fields',async()=>{
 const {res}=await runSplit('chat',{assistantMessage:'You can now check and confirm your summary.',readyForReview:true,reason:'Work and next direction are clear'});assert.equal(res.code,200);assert.equal(res.body.result.readyForReview,true);assert.equal(res.body.result.route,'review');assert.deepEqual(res.body.result.evidenceUpdates,[]);
});
test('final record request uses a separate task and does not require prefilled form answers',async()=>{
 const c={assistantMessage:'Check your summary.',readyForReview:true,route:'review',evidenceUpdates:[{field:'claim',state:'student_claim',value:'Answer 0',progressKind:'unknown',sourceTurn:1,operation:'add',contextTurn:null}],nextStep:{status:'unknown',action:null,expectedEvidence:null,sourceTurn:1,contextTurn:null,additionalActions:[]}};
 const {res,sent}=await runSplit('record',c);assert.equal(res.code,200);assert.equal(res.body.manifest.task,'record');assert.equal(res.body.result.evidenceUpdates[0].value,'Answer 0');assert.equal(JSON.parse(sent.input).conversation[1].turnIndex,1);assert.ok(sent.instructions.includes('not the interviewer'));assert.equal(sent.text.format.name,'intake_record');
});
test('incomplete split-task response exposes the actual limit cause without partial record or extra model retry',async()=>{
 const {res,providerCalls}=await runSplit('record',null,'incomplete');assert.equal(res.code,502);assert.equal(providerCalls,1);assert.equal(res.body.reason,'provider_incomplete');assert.equal(res.body.diagnostics.incompleteReason,'max_output_tokens');assert.equal(res.body.diagnostics.task,'record');assert.equal(res.body.diagnostics.maxOutputTokens,6000);assert.equal(res.body.result,undefined);
});
test('malformed conversation is a retryable chat error, not a forced review',async()=>{
 const {res}=await runSplit('chat',{assistantMessage:'Hello',reason:'missing ready flag'});assert.equal(res.code,502);assert.equal(res.body.reason,'conversation_schema');assert.equal(res.body.result,undefined);
});

test('split conversation still respects the existing maximum round ceiling',async()=>{const {res}=await run(turns,{assistantMessage:'One more detail?',readyForReview:false,reason:'Another gap'},false,'2B2','ai',null,null,'actual-model','chat');assert.equal(res.code,200);assert.equal(res.body.result.readyForReview,true);assert.equal(res.body.routeDecision.reason,'question_limit_reached');});
