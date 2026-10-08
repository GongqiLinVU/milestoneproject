// Negative-control tests for the replay baseline.
//
// These prove the R scoring + critical-error detection actually DISCRIMINATE:
// they run the REAL compiled validateCandidates/decideTurn/applyEvidenceUpdates
// on deliberately faulty candidates and assert the scored state degrades. This
// is the guard against "the runner just echoes the fixture back to itself".
//
// Build first (see run-replay.mjs header), then:
//   node --test tests/ai-session-intake/replay/replay-negative-control.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const harness = await import(resolve(repoRoot, '.test-build/intakeHarness.js'));
const { decideTurn } = harness;

const emptyAnswers = () => ({
  responsibility: '', progress: '', progressKind: 'no_progress', scope: '', completionPercent: null,
  evidenceType: 'other', evidenceAvailability: 'unknown', evidenceReference: '', verificationMethod: '',
  testingStatus: 'unknown', testingMethod: '', testingResult: '', testingBaseline: '',
  blockerStatus: 'none', blockerDescription: '', supportRequested: '', nextAction: '', dueSession: '', expectedEvidence: ''
});

const gold = JSON.parse(readFileSync(resolve(here, 'gold-s9.json'), 'utf8'));
const casesFile = JSON.parse(readFileSync(
  resolve(repoRoot, 'tests/ai-session-intake/adaptive/recorded-cases-v2.json'), 'utf8'));
const theCase = casesFile.cases.find(c => c.id === gold.caseId);
const turn1 = theCase.turns[0];

test('faithful turn-1 candidate: claim + evidence accepted (baseline discriminates upward)', () => {
  const decision = decideTurn(turn1.candidate, turn1.conversation, emptyAnswers());
  const fields = decision.accepted.map(u => u.field).sort();
  assert.deepEqual(fields, ['claim', 'evidence']);
  assert.equal(decision.answers.evidenceAvailability, 'available_now');
  assert.equal(decision.answers.testingStatus, 'unknown'); // API-error path NOT executed
});

test('mutated candidate marking the API-error path executed is REJECTED (not silently accepted)', () => {
  // A fabricated executed test whose observation is not grounded in the student turn.
  const mutated = {
    ...turn1.candidate,
    evidenceUpdates: [
      ...turn1.candidate.evidenceUpdates,
      { field: 'testing', value: 'API error path tested', state: 'executed', sourceTurn: 1,
        evidenceType: null, progressKind: null, method: 'simulated API 500',
        observedResult: 'error UI shown correctly', expectedEvidence: null }
    ]
  };
  const decision = decideTurn(mutated, turn1.conversation, emptyAnswers());
  // The real validator must reject the ungrounded executed test; testingStatus stays unknown.
  assert.equal(decision.answers.testingStatus, 'unknown',
    'ungrounded executed API-error test must not be applied');
  const rejected = decision.decisions.filter(d => d.outcome === 'rejected');
  assert.ok(rejected.length >= 1, 'the fabricated executed test must be rejected');
});

test('dropping the evidence update lowers recorded evidence state (R would drop)', () => {
  const mutated = {
    ...turn1.candidate,
    evidenceUpdates: turn1.candidate.evidenceUpdates.filter(u => u.field !== 'evidence')
  };
  const decision = decideTurn(mutated, turn1.conversation, emptyAnswers());
  // Without the evidence update the executed slow-network observation is NOT preserved.
  assert.notEqual(decision.answers.evidenceAvailability, 'available_now',
    'dropping evidence must degrade the recorded state — proving R is not trivially 100%');
});
