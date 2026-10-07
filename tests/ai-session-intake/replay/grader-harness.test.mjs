// Offline grader-harness validation (B3 part 3). Mock grader only; no paid calls.
//   node --test tests/ai-session-intake/replay/grader-harness.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildGradingTasks, computeScores, calibrate, loadCalibration } from './grader-harness.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const gold = JSON.parse(readFileSync(resolve(here, 'gold-t1.json'), 'utf8'));
const live = JSON.parse(readFileSync(resolve(here, 'out/dynamic-t1-live.json'), 'utf8'));
const calibration = loadCalibration();

test('grading tasks are provider-blind and carry conversation + record evidence + anchors', () => {
  const s1 = live.sessions.find(s => s.sessionKey === 'S1');
  const tasks = buildGradingTasks(s1, gold);
  assert.ok(tasks.length >= 1);
  for (const t of tasks) {
    assert.equal(t.providerBlind, true);
    assert.ok(Array.isArray(t.conversationEvidence) && t.conversationEvidence.length, 'has conversation evidence');
    assert.ok(t.recordEvidence && typeof t.recordEvidence === 'object', 'has record evidence');
    assert.ok(t.anchors && t.anchors['2'], 'has 0/1/2 anchors');
    // No provider name anywhere in the task
    assert.doesNotMatch(JSON.stringify(t).toLowerCase(), /openai|deepseek|gpt-5|gpt5|flash/, 'no provider identity leaked to grader');
  }
});

test('CODE computes C/R/S + Session-success from grader per-fact scores (grader does not)', () => {
  const graded = [
    { factId: 'T1S1-C1', c_score: 2, r_score: 2, uncertain: false },
    { factId: 'T1S1-C2', c_score: 2, r_score: 1, uncertain: false },
    { factId: 'T1S1-C3', c_score: 0, r_score: 0, uncertain: false },
    { factId: 'T1S1-C4', c_score: 1, r_score: 1, uncertain: false },
    { factId: 'T1S1-C5', c_score: 0, r_score: 0, uncertain: false },
  ];
  const s = computeScores(graded);
  // C = (2+2+0+1+0)/(2*5)=50%; disclosed = c>=1 -> C1,C2,C4 ; R=(2+1+1)/(2*3)=67%
  assert.equal(s.C_percent, 50);
  assert.equal(s.disclosedCount, 3);
  assert.equal(s.R_percent, 67);
  assert.equal(s.sessionSuccess, false, 'not all C=2 -> fail (code decides)');
});

test('uncertainty blocks an automatic pass and is surfaced for human review', () => {
  const graded = [
    { factId: 'A', c_score: 2, r_score: 2, uncertain: false },
    { factId: 'B', c_score: 2, r_score: 2, uncertain: true },
  ];
  const s = computeScores(graded);
  assert.equal(s.sessionSuccess, 'needs_human_review');
  assert.deepEqual(s.uncertainFacts, ['B']);
});

test('calibration: a mock grader matching the manual adjudication reports high agreement', () => {
  // Build a mock grader output from the calibration references themselves (perfect match).
  const graderOutputBySession = {};
  for (const [sk, data] of Object.entries(calibration.sessions)) {
    const byFact = {};
    for (const f of data.facts) {
      byFact[f.id] = byFact[f.id] || { factId: f.id, c_score: null, r_score: null, uncertain: false };
      if (f.metric === 'C') byFact[f.id].c_score = f.score;
      if (f.metric === 'R' || f.metric === 'R_pre') byFact[f.id].r_score = f.score;
    }
    graderOutputBySession[sk] = Object.values(byFact).map(g => ({ ...g, c_score: g.c_score ?? 0, r_score: g.r_score ?? 0 }));
  }
  const cal = calibrate(graderOutputBySession, calibration);
  assert.equal(cal.cAgreement, 100, 'C agreement with references');
  assert.equal(cal.rAgreement, 100, 'R agreement with references');
  assert.equal(cal.disagreements.length, 0);
});

test('calibration detects disagreement when the grader diverges', () => {
  const graderOutputBySession = { S1: [{ factId: 'T1S1-C2', c_score: 2, r_score: 2, uncertain: false }] }; // ref R=1
  const cal = calibrate(graderOutputBySession, calibration);
  assert.ok(cal.disagreements.length >= 1, 'disagreement flagged');
});
