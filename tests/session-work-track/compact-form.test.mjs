import assert from 'node:assert/strict';
import { test } from 'node:test';
import { earlyWorkTrackComplete, buildEarlyWorkTrack, confirmPreviousResponsibility } from '../../.test-work-track/workTrackForm.js';
const current={responsibility:'Booking API',workAreas:['Development'],progressState:'No progress',progress:'No project work completed today',nextAction:'Test one invalid request',helpKind:'No help needed'};
test('short/no-progress answer is valid; help and prior action need explicit choices',()=>{
 assert.equal(earlyWorkTrackComplete(current,false),true);
 assert.equal(earlyWorkTrackComplete(current,true),false);
 assert.equal(earlyWorkTrackComplete({...current,previousActionStatus:'Not completed'},true),true);
 assert.equal(earlyWorkTrackComplete({...current,helpKind:'Teacher guidance'},false),false);
 assert.equal(earlyWorkTrackComplete({...current,helpKind:'Teacher guidance',support:'How should I mock the API?'},false),true);
 assert.equal(earlyWorkTrackComplete({...current,workAreas:[]},false),false);
 assert.equal(earlyWorkTrackComplete({...current,progress:'  '},false),false);
});
test('confirming prior responsibility cannot copy prior progress into this Session',()=>{
 const previous={responsibility:'Login API',progress:'Completed login',nextAction:'Test login',evidence:'old commit'};
 const next=confirmPreviousResponsibility(current,previous);
 assert.equal(next.responsibility,'Login API');
 assert.equal(next.responsibilityCarriedForward,true);
 assert.equal(next.progress,current.progress);
 assert.equal(next.nextAction,current.nextAction);
 assert.equal(next.evidence,undefined);
});
test('payload clears hidden help and excludes late percentage / unrelated fields',()=>{
 const saved=buildEarlyWorkTrack({...current,support:'Old blocker',completionPercent:100,unrelated:'discard'});
 assert.equal(saved.support,'');
 assert.equal(saved.formVersion,'compact.v1');
 assert.deepEqual(saved.workAreas,['Development']);
 assert.equal(saved.completionPercent,undefined);
 assert.equal(saved.unrelated,undefined);
});
