// Replays existing model candidates. No provider, credentials or database needed.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {validateCandidates} from '../.test-build/intakeHarness.js';
const path=process.argv[2];
if(!path)throw new Error('Usage: node scripts/replay-intake-evaluation.mjs <evaluation.json>');
const original=fs.readFileSync(path);
const report=JSON.parse(original.toString('utf8'));
const fixture=JSON.parse(fs.readFileSync(new URL('../tests/ai-session-intake/fixtures/conversation-acceptance.json',import.meta.url),'utf8'));
const record=report.results?.find(r=>r.id==='S7-final-record');
if(!Array.isArray(record?.fieldDecisions))throw new Error('Missing saved field decisions/candidates');
// The original 361e78f evaluator used this exact frozen conversation. Later
// reports embed their conversation; never substitute another case silently.
if(!record.conversation&&createHash('sha256').update(original).digest('hex')!=='8d57b8125ad25035686976a0326e55878992fd9106c84e9ec6efb245c143cd6c')throw new Error('Unknown report without source conversation; refusing to guess its source');
const conversation=record.conversation??fixture.cases.find(c=>c.id==='S7-6-unknown-cause').conversation;
const replay=validateCandidates(record.fieldDecisions.map(d=>d.candidate),conversation,record.answersBefore??{});
const checks={reportPlan:/report/i.test(replay.answers.nextAction??''),demoPlan:/demo/i.test(replay.answers.nextAction??''),invitePlan:/invit/i.test(replay.answers.nextAction??'')};
console.log(JSON.stringify({mode:'offline_candidate_replay',actualModelCalls:0,checks,
 limitation:'Reuses saved candidates; does not test revised extraction or conversation prompts. Missing model actions are not synthesized.',
 answers:replay.answers,fieldDecisions:replay.decisions},null,2));
if(!Object.values(checks).every(Boolean))process.exitCode=1;
