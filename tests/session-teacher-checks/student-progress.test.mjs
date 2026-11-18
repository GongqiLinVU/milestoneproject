import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import React, { act } from 'react';
import { create } from 'react-test-renderer';
buildSync({entryPoints:['src/StudentSessionProgress.tsx','src/SessionAIReview.tsx'],bundle:true,platform:'node',format:'esm',outdir:'.test-build/student-progress',external:['react','react/jsx-runtime'],loader:{'.css':'empty'}});
const { StudentSessionProgress } = await import('../../.test-build/student-progress/StudentSessionProgress.js');
const { SessionAIPreparation, SessionAIReview } = await import('../../.test-build/student-progress/SessionAIReview.js');
const original = {fetch:global.fetch, window:global.window, document:global.document};
global.IS_REACT_ACT_ENVIRONMENT=true;
global.window={setInterval:()=>1,clearInterval(){}};
global.document={addEventListener(){},removeEventListener(){}};
after(()=>{Object.assign(global,original);delete global.IS_REACT_ACT_ENVIRONMENT;});
const record={responsibility:{current:'CampusGuide room search'},claims:[{claim_id:'C1',statement:'Tested classroom search',progress_kind:'advanced'}],evidence:[],testing:[],dependencies:[],blocker:{status:'unknown'},next_action:{action:'Check mobile layout',due_session:'S9'}};
const analysis={summary:'AI_INTERNAL_SUMMARY',attentionPoints:['AI_INTERNAL_ISSUE'],questions:['AI_INTERNAL_QUESTION']};
function clientFor(slot={status:'ready',result:analysis},check=null){
 const calls=[];
 return {calls,client:{auth:{getSession:async()=>({data:{session:{access_token:'fake-token'}}})},rpc:async(name,args)=>{
  calls.push({name,args});
  if(name==='get_session_ai_check')return {data:slot};
  if(name==='get_session_teacher_check')return {data:{version:check?1:0,summaryRevision:1,correctionOpen:false,check,history:[]}};
  throw Error('Unexpected RPC '+name);
 }}};
}
test('student sees confirmed progress and teacher feedback without AI analysis, questions or pending task',async()=>{
 const h=clientFor(undefined,{version:1,summaryRevision:1,current:true,level:'satisfactory',comment:'Please show the mobile test.',checkedAt:'2026-11-18T00:00:00Z',teacherName:'Joseph'});
 let tree;let requests=0;global.fetch=async()=>{requests++;throw Error('Unexpected generation');};
 await act(async()=>{tree=create(React.createElement(StudentSessionProgress,{client:h.client,intakeId:'i',record,confirmedAt:'2026-11-18T00:00:00Z'}));});
 const text=JSON.stringify(tree.toJSON());
 for(const visible of ['Progress saved','Tested classroom search','Checked by teacher','Satisfactory','Please show the mobile test.'])assert.ok(text.includes(visible),visible);
 assert.doesNotMatch(text,/AI_INTERNAL|AI progress check|Points to clarify|Questions to consider|Pending review/);
 assert.doesNotMatch(text,/Student account\.|Unknown details remain unknown|Summary v1/);
 assert.match(text,/Joseph/);
 assert.equal(requests,0);assert.ok(h.calls.every(c=>c.name.startsWith('get_')));
 await act(async()=>tree.unmount());
});
test('no teacher check means no check card or pending review requirement',async()=>{
 const h=clientFor();let tree;
 await act(async()=>{tree=create(React.createElement(StudentSessionProgress,{client:h.client,intakeId:'i',record,confirmedAt:'2026-11-18T00:00:00Z'}));});
 const text=JSON.stringify(tree.toJSON());assert.match(text,/Progress saved/);assert.doesNotMatch(text,/Checked by teacher|Pending review|AI_INTERNAL/);
 await act(async()=>tree.unmount());
});
test('nonvisual preparation still generates and saves one fresh analysis; rerender does not regenerate',async()=>{
 const h=clientFor({status:'empty'});let tree,calls=[];
 global.fetch=async(url,request)=>{calls.push(JSON.parse(request.body));return {ok:true,json:async()=>({state:'ready',result:analysis})};};
 const element=()=>React.createElement(SessionAIPreparation,{client:h.client,intakeId:'i'});
 await act(async()=>{tree=create(element());});
 assert.equal(tree.toJSON(),null);assert.equal(calls.length,1);assert.equal(calls[0].action,'session-check');assert.equal(calls[0].refresh,false);
 await act(async()=>tree.update(element()));assert.equal(calls.length,1);assert.equal(tree.toJSON(),null);
 await act(async()=>tree.unmount());
});
test('failed automatic preparation stays invisible and does not repeatedly retry a stored failure',async()=>{
 const h=clientFor({status:'empty'});let tree,calls=0;
 global.fetch=async()=>{calls++;throw Error('Provider unavailable');};
 await act(async()=>{tree=create(React.createElement(SessionAIPreparation,{client:h.client,intakeId:'i'}));});
 assert.equal(tree.toJSON(),null);assert.equal(calls,1);await act(async()=>tree.unmount());
 const failed=clientFor({status:'failed',error:'Provider unavailable',requestSourceChanged:false});
 await act(async()=>{tree=create(React.createElement(SessionAIPreparation,{client:failed.client,intakeId:'i'}));});
 assert.equal(tree.toJSON(),null);assert.equal(calls,1);await act(async()=>tree.unmount());
});
test('teacher still sees the saved analysis, attention points and questions',async()=>{
 const h=clientFor();let tree;
 await act(async()=>{tree=create(React.createElement(SessionAIReview,{client:h.client,intakeId:'i'}));});
 const text=JSON.stringify(tree.toJSON());assert.match(text,/AI progress check/);
 for(const value of Object.values(analysis).flat())assert.ok(text.includes(value));
 await act(async()=>tree.unmount());
});
