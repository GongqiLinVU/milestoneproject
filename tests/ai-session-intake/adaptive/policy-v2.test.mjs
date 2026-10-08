import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decideTurn} from '../../../.test-build/intakeHarness.js';

const defaults={responsibility:'',progress:'',progressKind:'advanced',scope:'',completionPercent:null,evidenceType:'other',evidenceAvailability:'unknown',evidenceReference:'',verificationMethod:'',testingStatus:'unknown',testingMethod:'',testingResult:'',testingBaseline:'',blockerStatus:'unknown',blockerDescription:'',supportRequested:'',nextAction:'',dueSession:'S10',expectedEvidence:''};
const cases=JSON.parse(readFileSync(new URL('./recorded-cases-v2.json',import.meta.url),'utf8')).cases;
const byId=id=>cases.find(c=>c.id===id);

// Runs every turn of a multi-turn case in sequence, feeding each turn's
// `decideTurn(...).answers` forward as the next turn's `current` snapshot —
// the same chaining the real chat UI performs turn over turn (src/main.tsx).
function replay(c) {
  let current = defaults;
  const results = [];
  for (const turn of c.turns) {
    const d = decideTurn(turn.candidate, turn.conversation, current);
    results.push(d);
    current = d.answers;
  }
  return results;
}

test('continuing chat that ends in a provider failure preserves prior evidence and falls back cleanly', () => {
  const c = byId('s9-continuing-chat-provider-fallback');
  const results = replay(c);
  assert.equal(results.length, 3);
  // Turn 2 accepted the blocker claim recorded against the student's own turn.
  assert.equal(results[1].answers.blockerStatus, 'active');
  // Turn 3 has no candidate (provider failed) — decideTurn still returns a
  // deterministic fallback question and never claims a route condition fired.
  const final = results[2];
  assert.equal(final.route, 'continue');
  assert.equal(final.extractionPending, true);
  // Prior turns' captured evidence (the slow-connection observation) survives
  // into the fallback turn's answers rather than being reset.
  assert.equal(final.answers.evidenceReference, 'Manual load over a slow connection showed the spinner until cards loaded');
  assert.equal(final.answers.blockerStatus, 'active');
});

test('quick accepted-close reaches review via accepted_next_action_and_evidence_ready well under budget', () => {
  const c = byId('quick-accepted-close');
  const results = replay(c);
  assert.equal(results[0].route, c.expected.turn1Route);
  const final = results.at(-1);
  assert.equal(final.route, c.expected.finalRoute);
  assert.equal(final.routeDecision.reason, c.expected.finalReason);
  assert.equal(final.answers.evidenceReference, 'commit def456');
  assert.equal(final.answers.nextAction, 'Add a regression test for the pagination fix');
});

test('a mid-conversation Teacher-help request closes to review even with evidence still missing', () => {
  const c = byId('teacher-help-escalation-mid-conversation');
  const results = replay(c);
  assert.equal(results[0].route, c.expected.turn1Route);
  const final = results.at(-1);
  assert.equal(final.route, c.expected.finalRoute);
  assert.equal(final.routeDecision.reason, c.expected.finalReason);
  // Evidence/verification/next-action were never established, yet Teacher-help
  // still forces review on its own.
  assert.equal(final.answers.evidenceReference, '');
  assert.equal(final.answers.nextAction, '');
});

test('eight ungrounded question/answer pairs exhaust the budget and force review without any acceptance condition', () => {
  const c = byId('budget-exhausted-no-clear-evidence');
  const results = replay(c);
  const final = results.at(-1);
  assert.equal(final.route, c.expected.finalRoute);
  assert.equal(final.routeDecision.reason, c.expected.finalReason);
  // review=true uses decideTurn's own review copy, not the deterministic fallbackQuestion.
  assert.match(final.assistantMessage, /Review what you completed/);
});
