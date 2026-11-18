import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sessionProgressStatus as status} from '../../.test-build/sessionProgress.js';
const base={intakeId:'i',summaryRevision:2,checkRevision:null,checkCurrent:false,correctionOpen:false,aiStatus:'ready'};
test('roster never implies a teacher review is mandatory',()=>{
 assert.equal(status(false),'missing');assert.equal(status(true,undefined,false),'loading');assert.equal(status(true),'unknown');
 for(const [aiStatus,expected] of [['ready','ai'],['pending','reviewing'],['empty','awaiting'],['stale','awaiting'],['failed','unavailable'],['interrupted','unavailable'],['disabled','off']])assert.equal(status(true,{...base,aiStatus}),expected);
 assert.equal(status(true,{...base,checkCurrent:true,checkRevision:2}),'checked');
 assert.equal(status(true,{...base,checkRevision:1}),'updated');
 assert.equal(status(true,{...base,correctionOpen:true,checkCurrent:true}),'correction');
});
