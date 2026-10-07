// Focused scorer regression checks for the latest ($0.65) T1 live trace.
// Pins the adjudicated R failures so a scorer cannot silently re-credit them.
// Deterministic field assertions on the actual pre-review record (turnLoopCandidate).
//
//   node --test tests/ai-session-intake/replay/scorer-regression-v2.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const live = JSON.parse(readFileSync(resolve(here, 'out/dynamic-t1-live.json'), 'utf8'));
const pre = Object.fromEntries(live.sessions.map(s => [s.sessionKey, s.turnLoopCandidate]));
const conv = Object.fromEntries(live.sessions.map(s => [s.sessionKey, s.conversation.filter(t => t.actor === 'student').map(t => t.text).join(' | ')]));

test('S3: integration-connected fact disclosed in U1 is LOST from the pre-review progress', () => {
  assert.match(conv.S3.toLowerCase(), /connected the live modules/, 'student disclosed integration in the conversation');
  assert.doesNotMatch(`${pre.S3.progress}`.toLowerCase(), /connected|live modules|integrat/, 'but the record progress does NOT retain it');
});

test('S3: changed-slot FAILURE disclosed in U2 is LOST from the testing record', () => {
  assert.match(conv.S3.toLowerCase(), /showed the old one|that path failed/, 'student disclosed the failure');
  assert.equal(pre.S3.testingStatus, 'unknown', 'testing status not set from the disclosed failure');
  assert.equal(`${pre.S3.testingResult}`.trim(), '', 'no testing result retained for the failure');
});

test('S4: testing contradiction — executed normal pass + unexecuted changed-slot disclosed, but record marks not_applicable', () => {
  assert.match(conv.S4.toLowerCase(), /saved correctly on rerun/, 'student reported an executed normal retest pass');
  assert.match(conv.S4.toLowerCase(), /has not been rerun|not been rerun after the fix/, 'and an unexecuted changed-slot retest');
  assert.equal(pre.S4.testingStatus, 'not_applicable', 'record contradicts by marking testing not_applicable');
  assert.equal(`${pre.S4.testingResult}`.trim(), '', 'the executed normal pass result is not retained');
});

test('S1: progressKind contradicts the disclosed design work', () => {
  assert.match(conv.S1.toLowerCase(), /drawing the flow/, 'student is actively drawing the flow (design in progress)');
  assert.equal(pre.S1.progressKind, 'no_progress', 'but progressKind is no_progress — a contradiction to flag');
});

test('a bare accepted-field / keyword must NOT earn R=2 (guard against presence-only scoring)', () => {
  // S3 progress is non-empty but holds the WRONG fact; presence-only scoring would
  // wrongly credit it. Assert the retained progress does not represent the key facts.
  assert.ok(`${pre.S3.progress}`.length > 0, 'progress field is populated');
  assert.doesNotMatch(`${pre.S3.progress}`.toLowerCase(), /connected|normal booking|failed/, 'yet it represents none of the key integration/outcome facts');
});
