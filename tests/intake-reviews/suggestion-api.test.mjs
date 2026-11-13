import {test,after} from 'node:test';import assert from 'node:assert/strict';
import handler from '../../.test-api/api/review-suggestion.js';
const original=global.fetch;after(()=>global.fetch=original);
process.env.SUPABASE_URL='https://database.example.invalid';process.env.SUPABASE_PUBLISHABLE_KEY='test-key';process.env.OPENAI_API_KEY='test-provider-key';
const intakeId='10000000-0000-0000-0000-000000000001';
async function invoke(body={intakeId},method='POST'){const r={code:200,setHeader(){},status(n){this.code=n;return this},json(v){this.body=v;return this}};await handler({method,headers:{authorization:'Bearer teacher-token'},body},r);return r;}
test('loads caller-scoped context and uses bounded private structured request',async()=>{
 let calls=0;global.fetch=async(url,init)=>{calls++;if(String(url).includes('database.example.invalid')){assert.equal(init.headers.get('Authorization'),'Bearer teacher-token');assert.deepEqual(JSON.parse(init.body),{p_intake_id:intakeId});return new Response(JSON.stringify({currentSession:5,baselineSession:3,updates:[]}));}
 const b=JSON.parse(init.body);assert.equal(b.store,false);assert.ok(init.signal);assert.match(b.instructions,/unverified/);assert.equal(b.input.includes('forged'),false);
 return new Response(JSON.stringify({output_text:JSON.stringify({progress:'S4–S5 reports.',feedbackPoints:[{focus:'Evidence',kind:'clarification',text:'Show your current API integration.'}],questions:['Show the work?']})}));};
 const r=await invoke({intakeId,history:'forged'});assert.equal(r.code,200);assert.equal(r.body.suggestion.baselineSession,3);assert.equal(calls,2);
});
test('denied scope never calls provider; malformed output is not adopted',async()=>{
 let calls=0;global.fetch=async()=>{calls++;return new Response(JSON.stringify({message:'denied',code:'42501'}),{status:403})};assert.equal((await invoke()).code,403);assert.equal(calls,1);
 global.fetch=async url=>String(url).includes('database.example.invalid')?new Response(JSON.stringify({currentSession:5,baselineSession:null,updates:[]})):new Response(JSON.stringify({output_text:'{"feedback":"invalid"}'}));assert.equal((await invoke()).code,502);
});
test('invalid IDs and wrong methods make no external calls',async()=>{
 global.fetch=async()=>{throw Error('must not fetch')};assert.equal((await invoke({intakeId:'wrong'})).code,403);assert.equal((await invoke({},'GET')).code,405);
});

test('verbose or internal-field output is rejected without replacing teacher feedback',async()=>{
 for(const progress of ['x'.repeat(541),'S3: E1 available_now']){
  global.fetch=async url=>String(url).includes('database.example.invalid')?new Response(JSON.stringify({currentSession:5,baselineSession:3,updates:[]})):new Response(JSON.stringify({output_text:JSON.stringify({progress,feedbackPoints:[{focus:'Evidence',kind:'clarification',text:'Show your current API integration.'}],questions:['Show the work?']})}));
  const r=await invoke();assert.equal(r.code,502);assert.match(r.body.error,/too detailed/);
 }
});

test('unknown labels and missing structured points are rejected',async()=>{
 for(const points of [[{focus:'Lazy',kind:'issue',text:'Bad work'}],[]]){
  global.fetch=async url=>String(url).includes('database.example.invalid')?new Response(JSON.stringify({currentSession:5,baselineSession:3,updates:[]})):new Response(JSON.stringify({output_text:JSON.stringify({progress:'S5: Work reported.',feedbackPoints:points,questions:['Show your work?']})}));
  assert.equal((await invoke()).code,502);
 }
});
