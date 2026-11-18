import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyTeamFeedback,parseTeamFeedback,parseTeamGuide,teamFeedbackInstructions} from '../../.test-build/teamReviewModel.js';
const point={confirmedProgress:['Showed implementation.'],mainIssues:[],nextSteps:[]};
test('parse allows shared facts without inferring any individual work',()=>{
 const v=parseTeamFeedback({...emptyTeamFeedback(),shared:point},['a','b']);assert.equal(v.members.length,0);
});
test('attribution rejects unknown/absent or duplicated members',()=>{
 for(const members of [[{...point,studentId:'absent'}],[{...point,studentId:'a'},{...point,studentId:'a'}]])assert.throws(()=>parseTeamFeedback({...emptyTeamFeedback(),members},['a','b']));
});
test('unresolved attribution stays separate, and output uses only defined fields',()=>{
 const v=parseTeamFeedback({...emptyTeamFeedback(),members:[{...point,studentId:'a',private:'secret'}],unresolved:['Who wrote tests?']},['a']);
 assert.equal(v.members[0].private,undefined);assert.deepEqual(v.unresolved,['Who wrote tests?']);assert.deepEqual(v.shared,emptyTeamFeedback().shared);
 assert.throws(()=>parseTeamGuide({questions:['One?']}));assert.equal(parseTeamGuide({questions:['One?','Two?','Three?']}).questions.length,3);
 assert.match(teamFeedbackInstructions,/does NOT mean/);assert.match(teamFeedbackInstructions,/teammate speaking/);
});
