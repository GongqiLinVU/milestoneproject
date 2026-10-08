import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fallbackQuestion} from '../../../.test-build/intakeHarness.js';

// Regression for the crash surfaced by the integration harness: the turn-mode
// provider-failure fallback in api/session-intake-ai.ts calls
// fallbackQuestion(req.body.answers, ...). When the client omits `answers`
// (a first turn, or any request that only sends the conversation), that value
// is undefined. Before the fix, fallbackQuestion dereferenced answers.progress
// and threw a TypeError, crashing the function into a raw HTTP 500 instead of
// serving the deterministic 200 fallback the guardrails require.

test('fallbackQuestion does not throw when answers is undefined (provider-failure first turn)', () => {
  const conversation = [
    {actor: 'system', purpose: 'session starting point', text: 'What did you work on?'},
    {actor: 'student', purpose: 'student response', text: 'I updated the triage summary formatting.'},
  ];
  let q;
  assert.doesNotThrow(() => { q = fallbackQuestion(undefined, conversation); });
  assert.equal(typeof q, 'string');
  assert.ok(q.length > 0, 'fallback must return a usable question');
});

test('fallbackQuestion tolerates a partial answers object', () => {
  const conversation = [
    {actor: 'system', purpose: 'session starting point', text: 'q'},
    {actor: 'student', purpose: 'student response', text: 'a'},
  ];
  // Only `progress` present — later fields are absent; must not throw.
  const q = fallbackQuestion({progress: 'Fixed the spinner'}, conversation);
  assert.equal(typeof q, 'string');
  assert.ok(q.length > 0);
});

test('fallbackQuestion still returns the review prompt at the question ceiling', () => {
  // 8 system (non-review) questions interleaved with student answers.
  const conversation = [];
  for (let i = 0; i < 8; i += 1) {
    conversation.push({actor: 'system', purpose: 'clarification', text: `q${i}`});
    conversation.push({actor: 'student', purpose: 'student response', text: `a${i}`});
  }
  const q = fallbackQuestion(undefined, conversation);
  assert.match(q, /Review what you have told us/);
});
