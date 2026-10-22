import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildHarnessObservations} from '../../../.test-build/intakeObservations.js';
import {decideTurn} from '../../../.test-build/intakeHarness.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/s7-sparse-review.json',import.meta.url),'utf8'));
test('real sparse one-turn close is observable without altering the route or losing next action',()=>{
 const event=fixture.event,original=JSON.stringify(event);
 const output=buildHarnessObservations([event]);
 const observation=output.observations.find(o=>o.kind==='sparse_review_exit');
 assert.ok(observation);
 assert.equal(observation.level,'O');
 assert.equal(observation.evidence.affectsConversation,false);
 assert.equal(output.summary.actionsExecuted,0);
 assert.equal(JSON.stringify(event),original);
 const decision=decideTurn(event.response.rawCandidate,event.request.conversation,event.request.answersSnapshot);
 assert.equal(decision.readyForReview,true);
 assert.equal(decision.answers.nextAction,'start my word document for final report');
 assert.ok(decision.answers.progress.includes('almost done'));
});
test('specific review exit is recorded without a sparse flag',()=>{
 const out=buildHarnessObservations([{at:'now',mode:'turn',request:{conversation:[]},response:{manifest:{reviewContractVersion:'intake-review.v2'},result:{route:'review',readyForReview:true,assessment:{information:'focused',gap:'none'},uncertainties:[]}}}]);
 assert.equal(out.observations.filter(o=>o.kind==='review_readiness').length,1);
 assert.equal(out.observations.filter(o=>o.kind==='sparse_review_exit').length,0);
 assert.equal(out.observations.find(o=>o.kind==='review_readiness').evidence.reviewContractVersion,'intake-review.v2');
});
test('sparse continuing reply and missing legacy assessments are not declared premature exits',()=>{
 for(const result of [{route:'clarification',readyForReview:false,assessment:{information:'sparse'}},{route:'review',readyForReview:true}]){
  const out=buildHarnessObservations([{at:'now',mode:'turn',request:{},response:{result}}]);
  assert.ok(!out.observations.some(o=>o.kind==='sparse_review_exit'));
 }
});
test('bounded sparse exits remain allowed and retain their reason',()=>{
 const out=buildHarnessObservations([{at:'now',mode:'turn',request:{},response:{routeDecision:{reason:'question_limit_reached'},result:{readyForReview:true,assessment:{information:'sparse',gap:'Student could not clarify'}}}}]);
 const o=out.observations.find(o=>o.kind==='sparse_review_exit');
 assert.equal(o.evidence.routeReason,'question_limit_reached');
 assert.equal(o.action.executed,false);
});
