import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateCandidates,decideTurn} from '../../../.test-build/intakeHarness.js';
const read=name=>JSON.parse(fs.readFileSync(new URL(`../fixtures/${name}`,import.meta.url),'utf8'));
const report=read('pr88-live-eval-361e78f.json');
const conversation=read('conversation-acceptance.json').cases.find(c=>c.id==='S7-6-unknown-cause').conversation;
const record=report.results.find(r=>r.id==='S7-final-record');
const candidates=record.fieldDecisions.map(d=>d.candidate);
test('actual paid output: prefix-2 passed; only prefix-5 and final record failed',()=>{
 assert.deepEqual(report.results.filter(r=>!r.pass).map(r=>r.id),['S7-6-prefix-5','S7-final-record']);
 assert.equal(report.results.find(r=>r.id==='S7-6-prefix-2').actualReadyForReview,true);
});
test('actual record replay retains invitation with explicit anchor repair; does not invent missing report action',()=>{
 const r=validateCandidates(candidates,conversation,{});
 const invite=r.decisions.find(d=>d.index===10);
 assert.equal(invite.outcome,'repaired');assert.equal(invite.sourceTurn,5);
 assert.ok(invite.observations.includes('source_relocated_using_distinct_action_anchors'));
 assert.match(r.answers.nextAction,/Invite/);assert.match(r.answers.nextAction,/demo/);
 // The original model never emitted a report action. Parser repair cannot fix that.
 assert.doesNotMatch(r.answers.nextAction,/report/i);
 assert.equal(r.answers.testingStatus,'planned_not_executed');
 assert.equal(r.accepted.find(u=>u.field==='next_action'&&/debugging/.test(u.value)).expectedEvidence,null);
});
test('missing confirmation context can be supplied by extractor without changing student words',()=>{
 const action=candidates[10];
 const r=validateCandidates([{...action,contextTurn:6}],conversation,{});
 assert.equal(r.accepted[0].sourceTurn,7);assert.equal(r.accepted[0].contextTurn,6);
});
test('shared generic words and competing action anchors never pick an arbitrary student turn',()=>{
 const action=candidates[10];
 for(const texts of [
  ['The code is almost finished','The code needs work'],
  ['I can invite teacher to GitHub','I can invite teacher to GitHub'],
  ['I will invite the teacher','I will share the GitHub code'],
 ]){
  const c=texts.map(text=>({actor:'student',text}));
  const r=validateCandidates([{...action,sourceTurn:99}],c,{});
  assert.equal(r.accepted.length,0);assert.equal(r.decisions[0].reason,'student_source_not_uniquely_grounded');
 }
});
test('review contract preserves all source-backed actions when extractor supplies them (gold, not model output)',()=>{
 const step=(action,sourceTurn,contextTurn=null)=>({action,sourceTurn,contextTurn,status:'planned',expectedEvidence:null});
 const gold={assistantMessage:'Check your summary.',readyForReview:true,route:'review',evidenceUpdates:[],
  nextStep:{...step('Focus on the final report',1),additionalActions:[step('Show a live demo next Wednesday',3),step('Invite teacher to team GitHub',7,6)]}};
 const r=decideTurn(gold,conversation,{});
 for(const word of ['report','demo','Invite'])assert.ok(r.answers.nextAction.includes(word));
 assert.equal(r.decisions.filter(d=>d.field==='next_action'&&d.outcome==='rejected').length,0);
 assert.notEqual(r.answers.testingStatus,'executed');assert.equal(r.answers.completionPercent==null,true);
});
