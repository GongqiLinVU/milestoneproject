import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {intakeStart,intakePriorContext,intakeOpeningText} from '../../../.test-build/intakeStart.js';

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
test('all nine entry points have short distinct questions without Session-number jargon',()=>{
 const questions=Array.from({length:9},(_,i)=>intakeStart(i+1).question);
 assert.equal(new Set(questions).size,9);
 for(const q of questions){assert.equal((q.match(/\?/g)||[]).length,1);assert.ok(q.split(/\s+/).length<=25);assert.doesNotMatch(q,/\bS[1-9]\b|observable|confirmed Intake|personally own/);}
});
test('S2 starts from team agreement and permits unresolved allocation',()=>{
 const s=intakeStart(2);assert.match(s.question,/agreed with your team/);assert.match(s.question,/work on next/);assert.match(s.hint,/still being discussed/);
 assert.doesNotMatch(s.question,/result exists|completed|four.week/i);
});
test('middle Sessions invite updates without assuming feedback or completed work',()=>{
 assert.match(intakeStart(3).question,/worked on since/);
 assert.match(intakeStart(4).question,/show or explain/);assert.match(intakeStart(4).hint,/link or upload is not required/);
 assert.match(intakeStart(5).hint,/No progress/);
 assert.match(intakeStart(6).hint,/If you had/);assert.match(intakeStart(6).hint,/plan changed/);
});
test('late Sessions focus on report, checking and readiness without inventing completion',()=>{
 assert.match(intakeStart(7).question,/technical report/);assert.match(intakeStart(7).hint,/not started or not your responsibility/);
 assert.match(intakeStart(8).question,/checked/);assert.match(intakeStart(8).hint,/haven’t tested yet/);assert.match(intakeStart(8).hint,/sample-data.*end-to-end/);
 assert.match(intakeStart(9).question,/submission and presentation/);assert.match(intakeStart(9).hint,/don’t need to claim everything is ready/);
});
test('later sessions retain the global guide, shortcuts and composer text',()=>{
 for(const n of [2,5,7,9]){
  const s=intakeStart(n);assert.equal(s.first,false);
  assert.equal(s.guideLead,'Share what changed and what’s next.');
  assert.equal(s.noProgressLabel,'No progress');assert.equal(s.noProgressReply,'I made no progress in this Session.');
  assert.equal(s.helpLabel,'I need Teacher help');assert.equal(s.helpReply,'I need my Teacher to help me decide the next step.');
  assert.equal(s.placeholder,'Reply to the Intake assistant…');
 }
});
test('previous role/action are separate complete context, not rewritten opening instructions',()=>{
 const action='Discuss the approach with the team.\nImplement the agreed changes.\nRetest and update the report.';
 assert.deepEqual(intakePriorContext({responsibility:{current:'UI development'},next_action:{action}}),{role:'UI development',action});
 assert.deepEqual(intakePriorContext({responsibility:{current:' UI development '},next_action:{action:'  '}}),{role:'UI development',action:null});
 assert.deepEqual(intakePriorContext({next_action:{action:'Check access'}}),{role:null,action:'Check access'});
 assert.equal(intakePriorContext(null),null);assert.equal(intakePriorContext({}),null);
 assert.doesNotMatch(intakeStart(6).question,/Discuss the approach|UI development/);
});
test('historical context survives in the source opening, not in the displayed question',()=>{
 const previous={responsibility:{current:'Interface'},next_action:{action:'Check loading.\nCheck errors.'}};
 const text=intakeOpeningText(8,previous);
 assert.match(text,/not a current update/);assert.match(text,/Check loading\.\nCheck errors\./);
 assert.ok(text.endsWith(intakeStart(8).question));assert.doesNotMatch(text,/Our team has|An illustration|source link/);
 assert.equal(intakeOpeningText(2,null),intakeStart(2).question);
 assert.equal(intakeOpeningText(1,previous),intakeStart(1).question);
});
test('all eight frozen rehearsal openings become shorter without modifying the historical corpus',()=>{
 const fixture=JSON.parse(readFileSync(new URL('../fixtures/rehearsal-records.json',import.meta.url),'utf8'));
 assert.equal(fixture.cases.length,8);
 for(const c of fixture.cases){const n=Number(c.id.slice(1));assert.ok(intakeStart(n).question.length<c.conversation[0].text.length,c.id);}
});
