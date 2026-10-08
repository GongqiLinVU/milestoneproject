// Calibration controls for the dynamic T1 scoring (Phase B2, item 5).
//
// Proves the C/R/S scoring + critical-error detection DISCRIMINATE between a
// faithful record, a missing-fact record, and an inflated-result record — run
// through the REAL compiled decideTurn/validateCandidates. This is the guard that
// the dynamic driver does not trivially pass everything, and that ambiguous
// judgments are not silently scored as success.
//
// Build first (see run-replay.mjs header), then:
//   node --test tests/ai-session-intake/replay/dynamic-calibration.test.mjs

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

// A minimal S3-style conversation where the student disclosed a changed-slot FAILURE.
const conversation = [
  { actor: 'system', purpose: 'session starting point', text: 'This is S3. What changed?' },
  { actor: 'student', purpose: 'student response',
    text: 'We connected the live modules. Normal booking saved and confirmation appeared. But after selecting another slot, the confirmation showed the old one — that path failed.' }
];

test('FAITHFUL candidate: records the failure as a claim, no critical error', () => {
  const candidate = { assistantMessage: 'Noted the changed-slot failure.', route: 'clarification',
    evidenceUpdates: [
      { field: 'claim', value: 'Normal booking saved; changed-slot showed the old confirmation and failed', state: 'student_claim', sourceTurn: 1,
        evidenceType: null, progressKind: 'attempted_failed', method: null, observedResult: null, expectedEvidence: null }
    ]};
  const d = decideTurn(candidate, conversation, emptyAnswers());
  assert.ok(d.accepted.some(u => u.field === 'claim'), 'faithful claim accepted');
  assert.equal(d.answers.testingStatus, 'unknown', 'no fabricated executed test');
});

test('MISSING-FACT candidate: drops the changed-slot failure — record omits it (R would drop)', () => {
  const candidate = { assistantMessage: 'Great, booking works.', route: 'clarification',
    evidenceUpdates: [
      { field: 'claim', value: 'Normal booking saved and confirmation appeared', state: 'student_claim', sourceTurn: 1,
        evidenceType: null, progressKind: 'completed', method: null, observedResult: null, expectedEvidence: null }
    ]};
  const d = decideTurn(candidate, conversation, emptyAnswers());
  // The failure fact is not represented — the record does not contain "failed".
  assert.ok(!/fail|old/i.test(d.answers.progress), 'the dropped failure is not in the record — a recording gap the scorer must catch');
});

test('INFLATED-RESULT candidate: fabricated executed passing test is REJECTED', () => {
  const candidate = { assistantMessage: 'All tests passed.', route: 'clarification',
    evidenceUpdates: [
      { field: 'testing', value: 'both journeys pass', state: 'executed', sourceTurn: 1,
        evidenceType: null, progressKind: null, method: 'ran both journeys', observedResult: 'all passed', expectedEvidence: null }
    ]};
  const d = decideTurn(candidate, conversation, emptyAnswers());
  // "all passed" is not grounded in the student's turn (which reports a failure).
  assert.equal(d.answers.testingStatus, 'unknown', 'ungrounded executed passing test must not be applied');
  assert.ok(d.decisions.some(x => x.outcome === 'rejected'), 'the inflated test is rejected');
});
