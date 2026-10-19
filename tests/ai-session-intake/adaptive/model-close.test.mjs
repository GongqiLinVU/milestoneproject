import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decideTurn} from '../../../.test-build/intakeHarness.js';
const newIntakeAnswers=()=>({responsibility:'',progress:'',progressKind:'advanced',scope:'',completionPercent:null,evidenceType:'other',evidenceAvailability:'unknown',evidenceReference:'',verificationMethod:'',testingStatus:'unknown',testingMethod:'',testingResult:'',testingBaseline:'',blockerStatus:'unknown',blockerDescription:'',supportRequested:'',nextAction:'',dueSession:'S6',expectedEvidence:''});
const conversation=[{actor:'system',purpose:'starting question',text:'What progressed?'},{actor:'student',purpose:'answer',text:'Loading is done. API errors remain in progress.'},{actor:'system',purpose:'question',text:'How can you show it, and what is next?'},{actor:'student',purpose:'answer',text:'I can give my Teacher a demo. I will try to finish error handling next session.'}];
const candidate={assistantMessage:'Review your loading progress and your plan for the error state.',route:'evidence',readyForReview:true,evidenceUpdates:[]};
test('model close recommendation is respected even when extraction fields are incomplete',()=>{
 const d=decideTurn(candidate,conversation,newIntakeAnswers(5));assert.equal(d.readyForReview,true);assert.equal(d.route,'review');assert.equal(d.routeDecision.reason,'model_ready_for_review');assert.equal(d.answers.verificationMethod,'');
});
test('short acknowledgements do not themselves become keyword-based stop rules',()=>{
 for(const text of ['Sure, will do','I will do it, but I need help choosing which API to call']){
 const turns=[...conversation,{actor:'system',purpose:'question',text:'Is that next step workable?'},{actor:'student',purpose:'answer',text}];
 assert.equal(decideTurn({...candidate,readyForReview:false,route:'continue'},turns,newIntakeAnswers(5)).readyForReview,false);
 assert.equal(decideTurn(candidate,turns,newIntakeAnswers(5)).readyForReview,true);
 }
});
