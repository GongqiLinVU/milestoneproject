import {test} from 'node:test';import assert from 'node:assert/strict';
import {correctionReviewAnswers,updateCorrectionReview} from '../../.test-build/intakeCorrectionReview.js';
import {reviewRecord} from './review-fixture.mjs';
test('saved summary populates original review fields without changing the record',()=>{
 const before=structuredClone(reviewRecord);const answers=correctionReviewAnswers(reviewRecord);
 assert.equal(answers.responsibility,reviewRecord.responsibility.current);assert.equal(answers.progress,reviewRecord.claims[0].statement);assert.equal(answers.completionPercent,85);assert.equal(answers.nextAction,reviewRecord.next_action.action);assert.equal(answers.testingBaseline,reviewRecord.testing[0].baseline_or_expected);assert.deepEqual(reviewRecord,before);
});
test('editing a role or next step preserves scope, percentage, IDs and all other saved detail',()=>{
 const next=updateCorrectionReview(reviewRecord,'responsibility','Backend workflow');const final=updateCorrectionReview(next,'nextAction','Run question tests');
 const expected=structuredClone(reviewRecord);expected.responsibility.current='Backend workflow';expected.next_action.action='Run question tests';assert.deepEqual(final,expected);assert.notEqual(final,reviewRecord);
});
test('editing a selected item never flattens or loses other claims, evidence or tests',()=>{
 const record=structuredClone(reviewRecord);record.claims.push({...record.claims[0],claim_id:'C2',statement:'Additional work'});record.evidence.push({...record.evidence[0],evidence_id:'E2'});record.testing.push({...record.testing[0],test_id:'T2'});
 const updated=updateCorrectionReview(record,'progress','Corrected additional work',{claim:1,evidence:0,testing:0});assert.equal(updated.claims[1].statement,'Corrected additional work');assert.deepEqual(updated.claims[0],record.claims[0]);assert.deepEqual(updated.evidence,record.evidence);assert.deepEqual(updated.testing,record.testing);assert.equal(correctionReviewAnswers(updated,{claim:1,evidence:0,testing:0}).progress,'Corrected additional work');
});
test('clearing optional evidence keeps nullable storage semantics and leaves other evidence intact',()=>{
 const updated=updateCorrectionReview(reviewRecord,'evidenceReference','');assert.equal(updated.evidence[0].reference,null);assert.equal(updated.evidence[0].verification_method,reviewRecord.evidence[0].verification_method);
});
