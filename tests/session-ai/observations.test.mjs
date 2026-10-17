import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildHarnessObservations} from '../../.test-observations/intakeObservations.js';
test('exports linked evidence without mutating trace or interpreting failure as completion',()=>{
 const events=[{at:'2026-10-17',mode:'turn',request:{conversation:[{actor:'system',text:'Progress?'},{actor:'student',text:'Loading is done.'}]},error:'429:usage_control:usage_limit'}];
 const before=JSON.stringify(events), out=buildHarnessObservations(events);
 assert.equal(JSON.stringify(events),before);
 assert.equal(out.mode,'observation_only');assert.deepEqual(out.enabledLevels,['O']);
 assert.equal(out.observations[1].round,1);
 assert.equal(out.observations[1].evidence.conversation[1].text,'Loading is done.');
 assert.equal(out.summary.actionsExecuted,0);assert.equal(out.summary.warningsDisplayed,0);
 assert.ok(out.observations.every(o=>o.level==='O'&&!o.action.executed));
});
test('records existing intervention separately from observer actions and preserves model uncertainty',()=>{
 const out=buildHarnessObservations([{at:'now',mode:'turn',request:{conversation:[]},response:{routeDecision:{proposed:'continue',final:'review'},rawCandidate:{assistantMessage:'What remains?'},result:{assistantMessage:'Review now.',uncertainties:['Testing not discussed']},fieldDecisions:[{field:'testing',outcome:'rejected',reason:'source missing'}],extractionPending:true}}]);
 assert.equal(out.observations.find(o=>o.kind==='routing_comparison').evidence.legacyIntervention,true);
 assert.equal(out.observations.find(o=>o.kind==='field_decision').evidence.decision.reason,'source missing');
 assert.equal(out.observations.find(o=>o.kind==='model_uncertainty').evidence.source,'model_self_report_not_verified');
 assert.equal(out.summary.actionsExecuted,0);
 assert.equal(buildHarnessObservations([]).observations.length,0);
});
