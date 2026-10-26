import {test} from 'node:test';
import assert from 'node:assert/strict';
import {intakeStart} from '../../../.test-build/intakeStart.js';

test('NIT3004 first question collects existing baseline and personal responsibility',()=>{
 const s=intakeStart(1);
 assert.equal(s.question,'Where is your project up to, and what part will you be responsible for in this unit?');
 assert.doesNotMatch(s.question,/S2|before|personally own|API/);
 assert.match(s.guideLead,/where your project stands/);
 assert.match(s.hint,/haven’t started building/);
 assert.match(s.hint,/role is still being decided/);
});
test('scaffolding is optional and carries no claim of implemented AI integration',()=>{
 const s=intakeStart(1);
 assert.equal(s.sentenceStarters.length,3);
 assert.match(s.sentenceStarters[2],/next class.*optional/);
 assert.match(s.example,/haven’t built/);
 assert.match(s.example,/sample response/);
});
test('first check-in shortcuts express not-started or help without inventing a role',()=>{
 const s=intakeStart(1);
 assert.equal(s.noProgressLabel,'I haven’t started yet');
 assert.equal(s.noProgressReply,'I haven’t started my part yet.');
 assert.equal(s.helpLabel,'I need help getting started');
 assert.equal(s.helpReply,'I need help getting started and deciding my part in the project.');
});
test('later sessions retain existing guidance, shortcuts and composer text',()=>{
 for(const n of [2,5,7,9]){
  const s=intakeStart(n);assert.equal(s.first,false);assert.equal(s.question,null);
  assert.equal(s.guideLead,'Share what changed and what’s next.');
  assert.equal(s.noProgressLabel,'No progress');assert.equal(s.noProgressReply,'I made no progress in this Session.');
  assert.equal(s.helpLabel,'I need Teacher help');assert.equal(s.helpReply,'I need my Teacher to help me decide the next step.');
  assert.equal(s.placeholder,'Reply to the Intake assistant…');
 }
});
