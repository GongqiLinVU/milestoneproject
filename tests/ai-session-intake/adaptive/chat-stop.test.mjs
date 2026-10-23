import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chatStopDecision,chatStopSaveReason} from '../../../.test-api/src/intakeChatStop.js';
import {questionBudget,signQuestion} from '../../../.test-api/api/intakeQuestionMeta.js';
import {buildHarnessObservations} from '../../../.test-build/intakeObservations.js';
import {sourceConversation} from '../../../.test-build/intakePolicy.js';
const empty={clarificationsUsed:0,usedTargets:[],unverifiedQuestions:0};
const p={assistantMessage:'What remains?',readyForReview:false,reason:'Current work unclear',target:'work',effect:'Identify current work'};
const start=[{actor:'system',purpose:'opening',text:'What changed?'},{actor:'student',purpose:'response',text:'Some work'}];
const secret='test-only-signing-secret',binding='student/session';
function ask(c,target,text='What remains?'){
 const out=[...structuredClone(c),{actor:'system',purpose:'clarification',text}];
 out.at(-1).questionMeta=signQuestion(secret,binding,out,out.length-1,target);
 return [...out,{actor:'student',purpose:'response',text:'Still working'}];
}
test('model can end immediately and no minimum rounds or reply-length gate is imposed',()=>{
 assert.equal(chatStopDecision(empty,{...p,readyForReview:true,target:'none'}).reason,'model_ready');
 assert.equal(chatStopDecision(empty,{...p,readyForReview:true,target:'none'}).intervened,false);
 assert.equal(chatStopDecision(empty,p).readyForReview,false);
});
test('finite targets and global cap close regardless of proposal wording',()=>{
 for(const target of ['none','conflict','garbage',undefined])assert.equal(chatStopDecision(empty,{...p,target}).reason,'invalid_or_no_target');
 assert.equal(chatStopDecision({...empty,usedTargets:['work']},p).reason,'target_exhausted');
 assert.equal(chatStopDecision({...empty,clarificationsUsed:2},p).reason,'clarification_budget_exhausted');
 assert.equal(chatStopDecision(empty,{...p,effect:null}).reason,'invalid_chat_format');
 assert.equal(chatStopDecision(empty,null).reason,'invalid_chat_format');
});
test('receipts bind user/session, question, target, index and transcript prefix',()=>{
 const c=ask(start,'work');assert.deepEqual(questionBudget(secret,binding,c),{clarificationsUsed:1,usedTargets:['work'],unverifiedQuestions:0});
 for(const mutate of [c=>delete c[2].questionMeta,c=>c[2].questionMeta.target='next',c=>c[2].text='Replaced',c=>c[1].text='Replaced',c=>c[2].questionMeta.sig='bad']){
  const bad=structuredClone(c);mutate(bad);assert.equal(questionBudget(secret,binding,bad).clarificationsUsed,1);assert.deepEqual(questionBudget(secret,binding,bad).usedTargets,[]);
 }
 assert.deepEqual(questionBudget(secret,'another/session',c).usedTargets,[]);
 assert.deepEqual(questionBudget('another-key',binding,c).usedTargets,[]);
 assert.equal(chatStopDecision(questionBudget(secret,binding,c),p).reason,'target_exhausted');
 assert.deepEqual(questionBudget(secret,binding,c),questionBudget(secret,binding,c)); // retry does not consume quota
});
test('missing/forged metadata cannot evade the global cap or use purpose to exclude questions',()=>{
 const c=ask(ask(start,'work'),'next');
 for(const t of c)if(t.actor==='system'){t.purpose='review transition';delete t.questionMeta;}
 assert.equal(questionBudget(secret,binding,c).clarificationsUsed,2);
 assert.equal(chatStopDecision(questionBudget(secret,binding,c),p).readyForReview,true);
});
test('actual S7-7 proposals always stop before a third clarification even with distinct/missing labels',()=>{
 const f=JSON.parse(fs.readFileSync(new URL('../fixtures/s7-7-structural-stop.json',import.meta.url),'utf8'));
 for(const labels of [['work','work','work'],['work','next','support'],[null,null,null]]){
  for(let i=0;i<3;i++){
   const c=structuredClone(f.conversation.slice(0,2+2*i));
   for(let n=0;n<i;n++)if(labels[n])c[2+2*n].questionMeta=signQuestion(secret,binding,c,2+2*n,labels[n]);
   const d=chatStopDecision(questionBudget(secret,binding,c),{...f.proposals[i],target:labels[i],effect:''});
   if(i===2)assert.equal(d.readyForReview,true);
   if(i===1&&labels[0]===labels[1])assert.equal(d.readyForReview,true);
  }
 }
});
test('runtime A stops are explicit; clarification/continue alias is not an intervention',()=>{
 const event={at:'now',mode:'chat',request:{conversation:start},response:{rawCandidate:p,result:{...p,route:'continue'},routeDecision:{proposed:'clarification',final:'continue'}}};
 const normal=buildHarnessObservations([event]);assert.equal(normal.runtimeInterventions.items.length,0);assert.equal(normal.observations.find(o=>o.kind==='routing_comparison').evidence.legacyIntervention,false);
 const controlled=structuredClone(event);controlled.response.chatControl={intervened:true,reason:'target_exhausted',proposal:p,budget:{...empty,usedTargets:['work']},final:{route:'review'}};controlled.response.result.readyForReview=true;
 const r=buildHarnessObservations([controlled]);assert.deepEqual(r.enabledLevels,['O','A']);assert.equal(r.summary.actionsExecuted,1);assert.equal(r.summary.observerActionsExecuted,0);assert.equal(r.observations.find(o=>o.kind==='chat_stop_intervention').action.actor,'chat_runtime');
});
test('save projection strips signatures and retains every student answer',()=>{
 const c=[...ask(start,'work'),{actor:'system',purpose:'review transition',text:'Check your summary'}];
 const source=sourceConversation(c);assert.equal(source.length,c.length);assert.equal(source[3].text,'Still working');assert.equal(source[2].questionMeta,undefined);
});

test('detailed stop reasons map to existing SQL categories without a migration',()=>{
 assert.equal(chatStopSaveReason('model_ready'),'sufficient_information');
 assert.equal(chatStopSaveReason('invalid_chat_format'),'provider_failure');
 for(const reason of ['clarification_budget_exhausted','target_exhausted','invalid_or_no_target'])assert.equal(chatStopSaveReason(reason),'budget_exhausted');
});
