import {test} from 'node:test';import assert from 'node:assert/strict';
import {validateCandidates} from '../../../.test-build/intakeHarness.js';
const turns=[{actor:'system',text:'What changed?'},{actor:'student',text:'I will focus on the final report.'},{actor:'system',text:'Where is the work?'},{actor:'student',text:'All code is in GitHub; I can invite the teacher.'}];
const update=extra=>({field:'next_action',state:'planned',value:'Focus on the final report',sourceTurn:0,contextTurn:null,operation:'add',...extra});
test('action source repair is independent of expected evidence in another turn',()=>{
 const d=validateCandidates([update({expectedEvidence:'GitHub repository'})],turns,{});
 assert.equal(d.accepted.length,1);assert.equal(d.accepted[0].sourceTurn,1);assert.match(d.answers.nextAction,/final report/);
 assert.ok(d.decisions[0].observations.includes('expected_evidence_wording_uncertain'));
});
test('unsupported artifact metadata is omitted explicitly without erasing a supported action',()=>{
 const d=validateCandidates([update({sourceTurn:3,value:'Invite the teacher to GitHub',expectedEvidence:'A screenshot of the invitation'})],turns,{});
 assert.equal(d.accepted.length,1);assert.match(d.answers.nextAction,/Invite/);assert.equal(d.accepted[0].expectedEvidence,null);
 assert.ok(d.decisions[0].observations.includes('unsupported_expected_evidence_omitted'));assert.ok(d.decisions[0].transformations.includes('expectedEvidence'));
});
test('unsupported artifacts in the action itself remain rejected',()=>{
 const d=validateCandidates([update({sourceTurn:3,value:'Invite teacher and upload a screenshot'})],turns,{});
 assert.equal(d.accepted.length,0);assert.equal(d.decisions[0].reason,'student_source_not_semantically_supported');
});
