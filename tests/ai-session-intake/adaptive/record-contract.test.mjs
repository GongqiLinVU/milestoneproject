import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decideTurn} from '../../../.test-build/intakeHarness.js';
import {evidenceUpdatesSchema,nextStepSchema} from '../../../.test-build/intakeContract.js';
const cases=JSON.parse(readFileSync(new URL('../fixtures/s7-real-output-cases.json',import.meta.url))).cases;
const replay=c=>{let a=c.events[0].request.answersSnapshot;return c.events.map(e=>{const d=decideTurn(e.rawCandidate,e.request.conversation,a);a=d.answers;return d;});};
test('frozen S7 no-progress trace remains no_progress and updates uncertainty into the accepted plan',()=>{
 const [first,last]=replay(cases[2]);assert.equal(first.answers.progressKind,'no_progress');assert.equal(first.answers.nextAction,'');
 assert.equal(last.answers.progressKind,'no_progress');assert.doesNotMatch(last.answers.nextAction,/Unsure/);
 assert.match(last.answers.nextAction,/Reopen frontend/);assert.equal(last.answers.testingStatus,'planned_not_executed');assert.equal(last.answers.testingResult,'');
 assert.equal(last.decisions.filter(x=>x.reason==='invalid_acceptance_context').length,0);
});
test('frozen short-answer trace recovers its claim and offered demo without adding a new task',()=>{
 const [first,last]=replay(cases[3]);assert.match(first.answers.progress,/filter spacing/);
 assert.equal(last.answers.verificationMethod,'Short demo showing the dashboard filter spacing in Chrome');assert.equal(last.answers.nextAction,'');
 assert.ok(last.decisions.some(d=>d.observations?.includes('source_relocated_using_context')));
});
test('frozen omitted next step is detected rather than filled with a hand-written answer',()=>{
 const [d]=replay(cases[0]);assert.equal(d.answers.nextAction,'');assert.ok(d.consistencyObservations.includes('actionable_assessment_without_structured_next_step'));
 assert.equal(d.assistantMessage,cases[0].events[0].rawCandidate.assistantMessage);assert.equal(d.route,'review');
});
test('legacy unspecified progress remains explicitly unknown, never the old advanced default',()=>{
 const [d]=replay(cases[1]);assert.equal(d.answers.progressKind,'unknown');assert.ok(d.decisions.some(x=>x.observations?.includes('progress_kind_unknown')));
 assert.ok(d.decisions.some(x=>x.observations?.includes('expected_evidence_wording_uncertain')));
});
test('field-specific schema has no cross-field state union and reserves a separate next-step snapshot',()=>{
 const variants=evidenceUpdatesSchema.items.anyOf;assert.equal(variants.find(v=>v.properties.field.enum[0]==='claim').properties.state.enum.includes('available'),false);
 assert.ok(variants.find(v=>v.properties.field.enum[0]==='claim').properties.progressKind.enum.includes('unknown'));
 assert.ok(!variants.some(v=>v.properties.field.enum[0]==='next_action'));assert.equal(nextStepSchema.anyOf[1].properties.action.type,'null');
});
test('synthetic new-contract output retains next step even with sixteen other updates',()=>{
 const e=cases[0].events[0],a=e.request.answersSnapshot;
 // Synthetic transport fixture, NOT an amended historical candidate or a live-model result.
 const candidate={...e.rawCandidate,evidenceUpdates:Array.from({length:16},()=>({field:'claim',state:'student_claim',value:e.rawCandidate.evidenceUpdates[0].value,progressKind:'completed',operation:'add',sourceTurn:1,contextTurn:null})),nextStep:{status:'planned',action:'Check keyboard navigation and focus visibility before S8',expectedEvidence:'Screenshots of any issues',sourceTurn:1,contextTurn:null}};
 const d=decideTurn(candidate,e.request.conversation,a);assert.match(d.answers.nextAction,/keyboard navigation/);assert.equal(d.accepted.length,17);
});
test('new-contract support request remains separate and tentative, unknown next step is not a task',()=>{
 const e=cases[1].events[0];const blocker=e.rawCandidate.evidenceUpdates.find(u=>u.field==='blocker');
 const candidate={...e.rawCandidate,evidenceUpdates:[{field:'blocker',state:blocker.state,value:blocker.value,operation:'add',sourceTurn:1,contextTurn:null,supportRequested:'May need the teacher’s advice on which approach is more usable.'}],nextStep:{status:'unknown',action:null,expectedEvidence:null,sourceTurn:1,contextTurn:null}};
 const d=decideTurn(candidate,e.request.conversation,e.request.answersSnapshot);assert.match(d.answers.supportRequested,/May need/);assert.equal(d.answers.nextAction,'');assert.equal(d.answers.nextActionStatus,'unknown');
});
test('frozen candidates are unchanged by chained replay',()=>{const s=JSON.stringify(cases);cases.forEach(replay);assert.equal(JSON.stringify(cases),s);assert.equal(cases.reduce((n,c)=>n+c.events.length,0),6);});
