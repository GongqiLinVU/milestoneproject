import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decideTurn,validateCandidates} from '../../../.test-build/intakeHarness.js';
import {applyEvidenceUpdates} from '../../../.test-build/intakePolicy.js';
const turns=[{actor:'system',purpose:'question',text:'What changed?'},{actor:'student',purpose:'answer',text:'I checked at 375px and 768px. I fixed spacing. I can show screenshots. The table still overflows; the team is discussing cards.'}];
const empty=()=>({responsibility:'Frontend',progress:'',progressKind:'advanced',scope:'Dashboard',completionPercent:null,evidenceType:'other',evidenceAvailability:'unknown',evidenceReference:'',verificationMethod:'',testingStatus:'unknown',testingMethod:'',testingResult:'',testingBaseline:'',blockerStatus:'unknown',blockerDescription:'',supportRequested:'',nextAction:'',dueSession:'S7',expectedEvidence:''});
const u=(field,value,rest={})=>({field,value,state:'student_claim',sourceTurn:1,evidenceType:null,progressKind:null,method:null,observedResult:null,expectedEvidence:null,...rest});
test('partial progress retains both facts, methods and tentative next step without forcing another round',()=>{
 const d=decideTurn({route:'review',readyForReview:true,assistantMessage:'Review the spacing fix, mobile checks and open team decision.',evidenceUpdates:[u('claim','Checked at 375px and 768px',{progressKind:'investigated'}),u('claim','Fixed spacing',{progressKind:'completed'}),u('testing','Checked widths',{state:'executed',method:'manual viewport inspection',observedResult:'The table still overflows'}),u('next_action','Can show screenshots'),u('blocker','Team is discussing cards')]},turns,empty());
 assert.match(d.answers.progress,/375px/);assert.match(d.answers.progress,/Fixed spacing/);
 assert.equal(d.answers.progressKind,'advanced');assert.equal(d.answers.testingMethod,'manual viewport inspection');
 assert.equal(d.answers.nextAction,'Can show screenshots');assert.equal(d.route,'review');
 assert.equal(d.assistantMessage,'Review the spacing fix, mobile checks and open team decision.');
});
test('new evidence and executed tests accumulate instead of erasing prior observations',()=>{
 const first=applyEvidenceUpdates(empty(),[u('evidence','Loading screenshots',{state:'available',evidenceType:'design_artifact'}),u('testing','Loading',{state:'executed',method:'375px viewport',observedResult:'Loading visible'})],turns);
 const next=applyEvidenceUpdates(first,[u('evidence','Empty screenshots',{state:'available',evidenceType:'design_artifact'}),u('testing','Empty',{state:'executed',method:'768px viewport',observedResult:'Empty visible'})],turns);
 assert.equal(next.evidenceReference,'Loading screenshots\nEmpty screenshots');
 assert.equal(next.testingMethod,'375px viewport\n768px viewport');
 assert.equal(next.testingResult,'Loading visible\nEmpty visible');
});
test('explicit replacements support student corrections and retraction of an executed test',()=>{
 let a=applyEvidenceUpdates(empty(),[u('claim','Fixed spacing'),u('testing','Checked widths',{state:'executed',method:'manual',observedResult:'Fixed spacing'})],turns);
 a=applyEvidenceUpdates(a,[u('claim','Only checked spacing; no fix yet',{operation:'replace',progressKind:'investigated'}),u('testing','Did not run the check',{state:'missing',operation:'replace'})],turns);
 assert.equal(a.progress,'Only checked spacing; no fix yet');assert.equal(a.progressKind,'investigated');
 assert.equal(a.testingStatus,'unknown');assert.equal(a.testingResult,'');assert.equal(a.testingMethod,'');
});
test('identical repeated claims do not duplicate content or change a mixed progress classification',()=>{
 const updates=[u('claim','Checked widths',{progressKind:'investigated'}),u('claim','Fixed spacing',{progressKind:'completed'})];
 const first=applyEvidenceUpdates(empty(),updates,turns);
 const next=applyEvidenceUpdates(first,[updates[1]],turns);
 assert.deepEqual(next,first);
});
test('field capacity failure is explicit and never silently overwrites prior text',()=>{
 const a={...empty(),progress:'Checked '+ 'x'.repeat(980)};
 const d=validateCandidates([u('claim','Checked spacing at both viewport widths')],turns,a);
 assert.equal(d.decisions[0].reason,'record_capacity_exceeded');assert.equal(d.answers.progress,a.progress);
});
test('help and established fields do not force an early stop against model continue',()=>{
 const a={...empty(),progress:'Fixed spacing',evidenceReference:'screenshots',verificationMethod:'Teacher review',nextAction:'Show screenshots'};
 const d=decideTurn({route:'teacher_help',readyForReview:false,assistantMessage:'What decision would help your team?',evidenceUpdates:[u('blocker','Team discussing cards',{state:'needs_teacher'})]},turns,a);
 assert.equal(d.readyForReview,false);assert.equal(d.route,'teacher_help');assert.match(d.answers.supportRequested,/cards/);
});
test('contextual agreement can cite the preceding question without requiring English commitment keywords',()=>{
 const conversation=[{actor:'system',purpose:'question',text:'Can you show the screenshots next session?'},{actor:'student',purpose:'answer',text:'Yes, that works.'}];
 const d=validateCandidates([u('next_action','Show the screenshots next session',{state:'planned',contextTurn:0})],conversation,empty());
 assert.equal(d.accepted.length,1);assert.equal(d.accepted[0].sourceTurn,1);
 assert.ok(d.decisions[0].observations.includes('contextual_acceptance_model_inferred'));
});
test('contextual acceptance cannot cite another student turn or a nonadjacent assistant proposal',()=>{
 const conversation=[...turns,{actor:'system',purpose:'question',text:'What next?'},{actor:'student',purpose:'answer',text:'Yes.'}];
 for(const contextTurn of [0,1,99]){
 const d=validateCandidates([u('next_action','Show screenshots',{state:'planned',sourceTurn:3,contextTurn})],conversation,empty());
 assert.equal(d.decisions[0].reason,'invalid_acceptance_context');
 }
});
