import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import handler from '../../.test-api/api/team-review.js';
const previous=global.fetch;after(()=>global.fetch=previous);
process.env.SUPABASE_URL='https://database.example.invalid';process.env.SUPABASE_PUBLISHABLE_KEY='fake';process.env.OPENAI_API_KEY='fake';
const id='10000000-0000-0000-0000-000000000001',lease='20000000-0000-0000-0000-000000000001';
const source={teacherObservation:'Amal explained her code.',participants:[{studentId:'a',studentName:'Amal'}]};
const points={shared:{confirmedProgress:[],mainIssues:[],nextSteps:[]},members:[{studentId:'a',confirmedProgress:['Explained her code.'],mainIssues:[],nextSteps:[]}],unresolved:[]};
async function invoke(body={meetingId:id,kind:'feedback'},method='POST',authorization='Bearer teacher-token'){
 const res={code:200,setHeader(){},status(n){this.code=n;return this;},json(v){this.body=v;return this;}};
 await handler({method,headers:{authorization},body},res);return res;
}
const json=v=>new Response(JSON.stringify(v),{status:200,headers:{'Content-Type':'application/json'}});
test('cached guide/feedback and pending/failed jobs never call provider',async()=>{
 for(const state of ['ready','pending','failed','interrupted']){let calls=0;global.fetch=async(url,init)=>{calls++;assert.ok(String(url).includes('claim_team_meeting_ai'));assert.equal(init.headers.get('Authorization'),'Bearer teacher-token');return json({state,result:state==='ready'?points:null});};assert.equal((await invoke()).code,state==='pending'?202:200);assert.equal(calls,1);}
});
test('API uses server-authorized meeting data, validates results and stores before returning',async()=>{
 const called=[];global.fetch=async(url,init)=>{called.push(String(url));const body=JSON.parse(init.body);if(String(url).includes('claim_'))return json({state:'claimed',lease,source});if(String(url).includes('api.openai.com')){assert.deepEqual(JSON.parse(body.input),source);assert.equal(body.store,false);assert.ok(body.text.format.strict);return json({output_text:JSON.stringify(points)});}assert.ok(String(url).includes('finish_team_meeting_ai'));assert.equal(body.p_lease,lease);assert.deepEqual(body.p_result,points);return json(true);};
 const res=await invoke({meetingId:id,kind:'feedback',source:{teacherObservation:'Injected'}});assert.equal(res.code,200);assert.deepEqual(res.body.result,points);assert.equal(called.length,3);
});
test('out-of-participant result never becomes a saved/published success',async()=>{
 let failed=false;global.fetch=async(url,init)=>{const body=JSON.parse(init.body);if(String(url).includes('claim_'))return json({state:'claimed',lease,source});if(String(url).includes('api.openai.com'))return json({output_text:JSON.stringify({...points,members:[{...points.members[0],studentId:'absent'}]})});assert.equal(body.p_result,null);assert.ok(body.p_error);failed=true;return json(true);};
 assert.equal((await invoke()).code,503);assert.equal(failed,true);
});
test('access denial and invalid requests never call model',async()=>{
 let calls=0;global.fetch=async()=>{calls++;return new Response(JSON.stringify({message:'denied'}),{status:403});};
 assert.equal((await invoke()).code,403);assert.equal(calls,1);
 assert.equal((await invoke({meetingId:id,kind:'invalid'})).code,400);
 assert.equal((await invoke(undefined,'GET')).code,405);assert.equal((await invoke(undefined,'POST','')).code,403);assert.equal(calls,1);
});
