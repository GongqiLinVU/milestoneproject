import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decideTurn} from '../../../.test-build/intakeHarness.js';
import {buildHarnessObservations} from '../../../.test-build/intakeObservations.js';
const conversation=[{actor:'system',purpose:'opening',text:'What changed?'},{actor:'student',purpose:'answer',text:'I checked the dashboard at 375px and 768px and fixed cramped spacing. I can show screenshots.'}];
const update=(field,value,extra={})=>({field,value,state:'student_claim',sourceTurn:1,evidenceType:null,progressKind:null,method:null,observedResult:null,expectedEvidence:null,...extra});
test('records current accumulated values and semantic uncertainty without old interventions',()=>{
 const raw={assistantMessage:'Thanks, review your progress.',route:'review',readyForReview:true,evidenceUpdates:[update('claim','Checked dashboard at 375px and 768px'),update('claim','Fixed cramped spacing'),update('testing','Checked dashboard',{state:'executed',method:'manual viewport inspection',observedResult:'Checked dashboard'}),update('next_action','Show screenshots')]};
 const current={progress:'',progressKind:'advanced',testingStatus:'unknown'};
 const before=JSON.stringify({raw,current,conversation});
 const result=decideTurn(raw,conversation,current);
 assert.equal(JSON.stringify({raw,current,conversation}),before);
 assert.equal(result.answers.progress,'Checked dashboard at 375px and 768px\nFixed cramped spacing');
 assert.equal(result.answers.testingMethod,'manual viewport inspection');
 assert.ok(result.decisions.at(-1).observations.includes('future_action_commitment_uncertain'));
 const out=buildHarnessObservations([{at:'now',mode:'turn',request:{conversation},response:{rawCandidate:raw,result,routeDecision:result.routeDecision,fieldDecisions:result.decisions}}]);
 const items=out.runtimeInterventions.items;
 assert.ok(!items.some(i=>i.kind==='field_rewrite'&&i.field==='testing'));
 assert.ok(items.some(i=>i.kind==='record_value_replacement'&&i.before.progress==='Checked dashboard at 375px and 768px'));
 assert.ok(!items.some(i=>i.kind==='field_rejection'));
 assert.ok(!items.some(i=>i.kind==='message_replacement'));
 assert.equal(out.summary.observerActionsExecuted,0);
 assert.equal(out.summary.observedRuntimeInterventions,items.length);
});
test('old traces explicitly report incomplete coverage instead of claiming no rewrites',()=>{
 const out=buildHarnessObservations([{at:'now',mode:'turn',request:{},response:{fieldDecisions:[{field:'claim',outcome:'accepted'}]}}]);
 assert.equal(out.observations.find(o=>o.kind==='intervention_coverage').evidence.coverage,'legacy_partial');
});
test('forced route and source repair are separate from observation actions',()=>{
 const out=buildHarnessObservations([{at:'now',mode:'turn',request:{},response:{routeDecision:{proposed:'continue',final:'review',reason:'question_limit_reached'},fieldDecisions:[{field:'claim',outcome:'repaired',originalSourceTurn:0,sourceTurn:1}]}}]);
 assert.deepEqual(out.runtimeInterventions.items.map(i=>i.kind),['route_override','source_relocation']);
 assert.equal(out.summary.actionsExecuted,0);
});
