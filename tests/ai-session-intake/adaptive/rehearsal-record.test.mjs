import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decideTurn} from '../../../.test-build/intakeHarness.js';
import {applyEvidenceUpdates} from '../../../.test-build/intakePolicy.js';
import {finalRecordSchema,intakeRecordSchema} from '../../../.test-api/src/intakeRecordSchema.js';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/rehearsal-records.json',import.meta.url)));
const get=id=>fixture.cases.find(c=>c.id===id);
const replay=(c,raw=c.rawCandidate)=>decideTurn(raw,c.conversation,c.answersBefore,{recordMode:true});
const update=(field,value,extra={})=>({field,value,state:'student_claim',sourceTurn:1,contextTurn:null,operation:'add',...extra});
const step=(action,extra={})=>({status:'planned',action,sourceTurn:1,contextTurn:null,expectedEvidence:null,additionalActions:[],...extra});
const candidate=(updates,nextStep={status:'unknown',action:null,sourceTurn:1,contextTurn:null,expectedEvidence:null,additionalActions:[]})=>({assistantMessage:'Check your summary.',readyForReview:true,route:'review',evidenceUpdates:updates,nextStep});

test('all eight frozen provider outputs replay without mutation; new record contract is distinct from legacy',()=>{
 const frozen=JSON.stringify(fixture);for(const c of fixture.cases)replay(c);assert.equal(fixture.cases.length,8);assert.equal(JSON.stringify(fixture),frozen);
 const fields=s=>s.properties.evidenceUpdates.items.anyOf.map(v=>v.properties.field.enum[0]);
 assert.ok(fields(intakeRecordSchema).includes('scope'));assert.ok(!fields(finalRecordSchema).includes('scope'));
});
test('frozen S3 and S5 technical expansions cannot become student commitments',()=>{
 for(const id of ['S3','S5']){const d=replay(get(id));assert.equal(d.answers.nextAction,'');assert.ok(d.decisions.some(x=>x.field==='next_action'&&x.reason==='record_value_not_source_excerpt'));}
});
test('S3 explicit role correction synchronises scope in both API projection and client update replay',()=>{
 const c=get('S3'),d=replay(c);assert.equal(d.answers.responsibility,'UI design and frontend implementation');assert.equal(d.answers.scope,d.answers.responsibility);
 const client=applyEvidenceUpdates(c.answersBefore,d.accepted,c.conversation);assert.equal(client.scope,client.responsibility);assert.ok(d.decisions.some(x=>x.reason==='scope_derived_from_responsibility'));
});
test('conforming S3 candidate keeps collaboration and stated results, without invented methods',()=>{
 // Synthetic contract-compliant extractor output from the frozen student text.
 const c=get('S3'),action='I still need to investigate that with our backend teammate.';
 const d=replay(c,candidate([update('responsibility','UI design and frontend implementation'),update('claim','I connected the React booking form to the booking API and checked valid bookings and missing required fields.',{progressKind:'advanced'}),update('claim','Valid bookings worked, but the confirmation message didn’t always appear after submission.',{progressKind:'investigated'})],step(action)));
 assert.equal(d.answers.nextAction,action);assert.equal(d.answers.testingStatus,'unknown');assert.match(d.answers.progress,/didn’t always appear/);assert.equal(d.answers.scope,d.answers.responsibility);
});
test('conforming S1 preserves a tentative first result without inventing existing evidence or tests',()=>{
 const c=get('S1'),d=replay(c,candidate([update('responsibility','UI design and frontend implementation of our booking system'),update('claim','I’ll start with the booking form, where users choose a date and time and enter their details.',{progressKind:'unknown'})],step('By S2, I hope to have a basic version working with sample data.',{status:'tentative'})));
 assert.equal(d.answers.nextActionStatus,'tentative');assert.equal(d.answers.evidenceAvailability,'unknown');assert.equal(d.answers.testingStatus,'unknown');assert.equal(d.answers.verificationMethod,'');assert.equal(d.answers.expectedEvidence,'');
});
test('unsupported auxiliary evidence is omitted without discarding a sourced plan',()=>{
 const c=get('S5'),action='I’ll work with our backend teammate on preventing duplicate submissions.';
 const d=replay(c,candidate([],step(action,{expectedEvidence:'Backend idempotency implementation and successful retests'})));
 assert.equal(d.answers.nextAction,action);assert.equal(d.answers.expectedEvidence,'');assert.ok(d.decisions.some(x=>x.observations?.includes('non_excerpt_expectedEvidence_omitted')));
});
test('conforming S6 retains uncertainty and does not assign the teammate’s unfinished work to the student',()=>{
 const c=get('S6'),action='I’ll agree on that behavior with them and retest once the backend change is ready.';
 const d=replay(c,candidate([update('claim','I disabled the Submit button while a booking request is running and tested rapid double-clicks in Chrome.',{progressKind:'advanced'}),update('blocker','Our backend teammate hasn’t finished the server-side protection yet, so I can’t say duplicate bookings are fully prevented.')],step(action)));
 assert.equal(d.answers.nextAction,action);assert.match(d.answers.blockerDescription,/can’t say/);assert.equal(d.answers.supportRequested,'');assert.equal(d.answers.completionPercent,null);
});
test('S9 report progress cannot overwrite scope; source-overlapping actions deduplicate but distinct actions survive',()=>{
 const c=get('S9'),action='I’ll connect the status check when the endpoint is ready, test it with our backend teammate, and update the report with the actual results.';
 const d=replay(c,candidate([update('claim','I also drafted the frontend section of our final report.',{progressKind:'advanced'}),update('scope','I also drafted the frontend section of our final report.')],step(action,{additionalActions:[step('update the report with the actual results.')] })));
 assert.equal(d.answers.progress,'I also drafted the frontend section of our final report.');assert.equal(d.answers.scope,c.answersBefore.responsibility);assert.equal(d.answers.nextAction,action);assert.ok(d.decisions.some(x=>x.reason==='duplicate_source_excerpt'));assert.ok(d.decisions.some(x=>x.reason==='scope_is_derived_from_responsibility'));
 const separate=replay(c,candidate([],step('I’ll connect the status check when the endpoint is ready',{additionalActions:[step('test it with our backend teammate'),step('update the report with the actual results.')] })));
 assert.equal(separate.accepted.filter(u=>u.field==='next_action').length,3);
});
test('excerpt provenance is topic and language independent, and never strips student numbers',()=>{
 const c={...get('S3'),conversation:[{actor:'system',text:'What changed?'},{actor:'student',text:'我完成了第42次传感器实验，结果仍不确定。下一步和队友讨论。'}]};
 const d=replay(c,candidate([update('claim','我完成了第42次传感器实验，结果仍不确定。',{progressKind:'investigated'})],step('下一步和队友讨论。')));
 assert.equal(d.answers.progress,c.conversation[1].text.split('下一步')[0]);assert.equal(d.answers.nextAction,'下一步和队友讨论。');
});
test('only an explicit brief acceptance imports the adjacent assistant proposal',()=>{
 for(const reply of ['yes','Will do.','No, I do not want that.','I finished the visual changes instead.']){
  const c={...get('S3'),conversation:[{actor:'system',text:'Will you show a demo?'},{actor:'student',text:reply}]};
  const d=replay(c,candidate([],step('show a demo',{contextTurn:0})));
  assert.equal(d.answers.nextAction,['yes','Will do.'].includes(reply)?'show a demo':'');
 }
});
test('quoted words never excuse fabricated observations or a wrong student pointer',()=>{
 const c=get('S3');const d=replay(c,candidate([update('testing','checked valid bookings and missing required fields',{state:'executed',method:'checked valid bookings and missing required fields',observedResult:'Required-field validation passed'})]));
 assert.equal(d.answers.testingStatus,'unknown');assert.ok(d.decisions.some(x=>x.reason==='executed_test_needs_sourced_method_and_observation'));
 const wrong=replay(c,candidate([update('claim','Valid bookings worked',{sourceTurn:0,progressKind:'completed'})]));assert.equal(wrong.answers.progress,'');assert.ok(wrong.decisions.some(x=>x.reason==='invalid_excerpt_source'));
});
