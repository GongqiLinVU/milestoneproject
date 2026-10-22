import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {decideTurn,validateCandidates} from '../../../.test-build/intakeHarness.js';
import {applyEvidenceUpdates} from '../../../.test-build/intakePolicy.js';
import {buildHarnessObservations} from '../../../.test-build/intakeObservations.js';
import {nextStepSchema} from '../../../.test-build/intakeContract.js';
const f=JSON.parse(fs.readFileSync(new URL('../fixtures/s7-demo-retry.json',import.meta.url),'utf8'));
test('frozen out-of-range demo pointer recovers uniquely stated student plan without changing the dialogue decision',()=>{
 const e=f.events[1],raw=JSON.stringify(e);const d=decideTurn(e.response.rawCandidate,e.request.conversation,e.request.answersSnapshot);
 assert.equal(d.readyForReview,false);assert.match(d.answers.nextAction,/demo next week/);
 assert.ok(d.decisions.some(x=>x.field==='next_action'&&x.observations?.includes('invalid_context_recovered_from_unique_student_source')));
 assert.equal(JSON.stringify(e),raw);
});
test('mechanical repeated lines do not accumulate, rephrases remain for observation',()=>{
 const turns=[{actor:'student',text:'UI work almost complete. One booking API error remains.'}];
 const u=(value)=>({field:'claim',value,state:'student_claim',sourceTurn:0,operation:'add'});
 const a=applyEvidenceUpdates({progress:'UI work almost complete.\nOne booking API error remains.'},[u('UI work almost complete\nOne booking API error remains.')],turns);
 assert.equal(a.progress,'UI work almost complete.\nOne booking API error remains.');
 const b=applyEvidenceUpdates(a,[u('Booking confirmation error is still unresolved')],turns);
 assert.ok(b.progress.includes('Booking confirmation error is still unresolved'));
});
test('new-schema snapshot retains report and demo with separate student sources and context agreement',()=>{
 const e=f.events[4],c=structuredClone(e.response.rawCandidate);
 // Synthetic new-schema candidate; this is NOT what the historical model returned.
 c.nextStep.additionalActions=[{status:'planned',action:'Show booking attempt and any error messages or logs in the Wednesday demo',expectedEvidence:null,sourceTurn:7,contextTurn:6}];
 const d=decideTurn(c,e.request.conversation,e.request.answersSnapshot);
 assert.match(d.answers.nextAction,/Start final report soon/);assert.match(d.answers.nextAction,/Wednesday demo/);
 assert.equal(d.readyForReview,true);
});
test('wrong valid student pointer cannot be replaced by a previous plan or unrelated yes',()=>{
 const conversation=[{actor:'system',text:'What next?'},{actor:'student',text:'I can show screenshots.'},{actor:'system',text:'Anything else?'},{actor:'student',text:'No, I cannot do that now.'}];
 const d=validateCandidates([{field:'next_action',state:'planned',value:'Show screenshots',sourceTurn:3,contextTurn:99}],conversation,{});
 assert.equal(d.accepted.length,0);
});
test('old-source restatements are observed without semantic deletion or forced stop',()=>{
 const e=f.events[2],d=decideTurn(e.response.rawCandidate,e.request.conversation,e.request.answersSnapshot);
 const observations=buildHarnessObservations([{...e,response:{...e.response,fieldDecisions:d.decisions}}]);
 assert.ok(observations.observations.some(o=>o.kind==='semantic_uncertainty'&&o.evidence.reasons.includes('claim_reemitted_from_earlier_turn')));
 assert.equal(observations.summary.observerActionsExecuted,0);assert.equal(d.readyForReview,false);
});
test('additional actions are bounded and separately sourced in the provider contract',()=>{
 for(const variant of nextStepSchema.anyOf)assert.ok(variant.required.includes('additionalActions'));
 const extra=nextStepSchema.anyOf[0].properties.additionalActions;assert.equal(extra.maxItems,3);assert.ok(extra.items.required.includes('sourceTurn'));
});
