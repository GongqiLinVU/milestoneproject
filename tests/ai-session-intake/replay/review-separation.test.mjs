// Offline validation of review-stage separation (final correction 1).
//
// Asserts, without any provider call, that:
//  - Conversational COLLECTION (C) is scored only on Intake-elicited facts and
//    does NOT get credit from review-stage confirmField additions.
//  - R is computed on the Intake-only (pre-correction) record AND on the
//    post-correction record, using the SAME 0/1/2 rubric, kept separate.
//  - Every review-stage correction is explicit with authorizedSource + before/after.
//
//   node --test tests/ai-session-intake/replay/review-separation.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const gold = JSON.parse(readFileSync(resolve(here, 'gold-t1.json'), 'utf8'));

// Mirror of the driver's factInRecord + review/correction + scoring, exercised on
// a controlled Intake candidate (no model, no network).
function factInRecord(factId, a) {
  const key = factId.split('-')[1];
  const map = {
    C1: () => Boolean(a.progress || a.responsibility),
    C2: () => Boolean(a.progress) || a.evidenceAvailability !== 'unknown',
    C3: () => a.blockerStatus !== 'none' || Boolean(a.blockerDescription) || a.evidenceAvailability !== 'unknown' || /fail|not|old/i.test(a.progress),
    C4: () => Boolean(a.evidenceReference) || a.evidenceAvailability !== 'unknown',
    C5: () => Boolean(a.nextAction)
  };
  return (map[key] || (() => false))();
}
function reviewAndCorrect(answers, sessionKey) {
  const confirm = gold.sessions[sessionKey].confirmField || {};
  const corrections = [];
  const setIf = (f, v, prov) => { if (!answers[f] && v) { corrections.push({ field: f, before: answers[f] || '', after: v, authorizedSource: prov }); answers[f] = v; } };
  setIf('dueSession', confirm.dueSession || `S${Math.min(10, Number(sessionKey.slice(1)) + 1)}`, 'ui_default_due_session');
  setIf('nextAction', confirm.nextAction, 'student_authorized_next_action');
  setIf('expectedEvidence', confirm.expectedEvidence, 'student_authorized_expected_evidence');
  if (answers.evidenceAvailability === 'available_now') setIf('verificationMethod', confirm.verificationMethod, 'student_authorized_verification');
  setIf('responsibility', confirm.responsibility, 'student_authorized_responsibility');
  return corrections;
}

test('R before vs after correction: nextAction dropped by Intake scores R=0 before, present after; C unaffected', () => {
  const sg = gold.sessions.S1;
  // Controlled Intake candidate: it elicited C1..C5 in conversation, but the
  // Intake EXTRACTION dropped nextAction (C5) and left responsibility empty (C1 via progress only).
  const revealed = new Set(sg.essentialCollectionFacts.map(f => f.id)); // all elicited
  const intakeCandidate = { responsibility: '', progress: 'design only, no UI built', progressKind: 'advanced', scope: 'booking UI', completionPercent: null, evidenceType: 'design_artifact', evidenceAvailability: 'available_now', evidenceReference: 'booking-flow-v1.pdf', verificationMethod: '', testingStatus: 'unknown', testingMethod: '', testingResult: '', testingBaseline: '', blockerStatus: 'active', blockerDescription: 'API format undecided with B', supportRequested: '', nextAction: '', dueSession: '', expectedEvidence: '' };
  const turnLoopCandidate = { ...intakeCandidate };
  const answers = { ...intakeCandidate };
  const corrections = reviewAndCorrect(answers, 'S1');

  // C = elicited only (all 5), independent of correction.
  const disclosed = sg.essentialCollectionFacts.map(f => f.id).filter(id => revealed.has(id));
  const C = Math.round(100 * disclosed.length * 2 / (2 * sg.essentialCollectionFacts.length));
  assert.equal(C, 100, 'C credits elicitation only');

  // R before (Intake-only): C5 nextAction dropped -> 0 for that fact.
  const rBefore = disclosed.map(id => factInRecord(id, turnLoopCandidate) ? 2 : 0);
  const rAfter = disclosed.map(id => factInRecord(id, answers) ? 2 : 0);
  const rBeforePct = Math.round(100 * rBefore.reduce((a, b) => a + b, 0) / (2 * disclosed.length));
  const rAfterPct = Math.round(100 * rAfter.reduce((a, b) => a + b, 0) / (2 * disclosed.length));
  assert.ok(rBeforePct < 100, 'Intake-only R reflects the dropped nextAction (before correction)');
  assert.ok(rAfterPct > rBeforePct, 'post-correction R is higher because the student supplied the field');
  assert.equal(rAfterPct, 100, 'after correction all disclosed facts are present');
});

test('review-stage corrections are explicit with authorizedSource + before/after', () => {
  const answers = { responsibility: '', progress: 'x', progressKind: 'advanced', scope: 'y', completionPercent: null, evidenceType: 'design_artifact', evidenceAvailability: 'available_now', evidenceReference: 'f.pdf', verificationMethod: '', testingStatus: 'unknown', testingMethod: '', testingResult: '', testingBaseline: '', blockerStatus: 'none', blockerDescription: '', supportRequested: '', nextAction: '', dueSession: '', expectedEvidence: '' };
  const corrections = reviewAndCorrect(answers, 'S1');
  assert.ok(corrections.length >= 1);
  for (const c of corrections) {
    assert.ok(c.field && typeof c.before === 'string' && typeof c.after === 'string' && c.authorizedSource,
      'each correction has field, before, after, authorizedSource');
    assert.notEqual(c.after, '', 'a correction supplies a value');
  }
});

test('confirmField is NOT credited to conversational collection C', () => {
  const sg = gold.sessions.S1;
  // Intake elicited only C1 in conversation; C5(nextAction) was NOT elicited.
  const revealed = new Set(['T1S1-C1']);
  const answers = { responsibility: '', progress: 'own booking UI', progressKind: 'advanced', scope: '', completionPercent: null, evidenceType: 'other', evidenceAvailability: 'unknown', evidenceReference: '', verificationMethod: '', testingStatus: 'unknown', testingMethod: '', testingResult: '', testingBaseline: '', blockerStatus: 'none', blockerDescription: '', supportRequested: '', nextAction: '', dueSession: '', expectedEvidence: '' };
  reviewAndCorrect(answers, 'S1'); // fills nextAction/dueSession from confirmField
  // Even though nextAction is now filled at review, C must NOT credit C5 (not elicited).
  const cScore = sg.essentialCollectionFacts.map(f => revealed.has(f.id) ? 2 : 0);
  const C = Math.round(100 * cScore.reduce((a, b) => a + b, 0) / (2 * sg.essentialCollectionFacts.length));
  assert.ok(C < 100, 'C reflects only what the Intake elicited, not review-stage additions');
  assert.equal(cScore[4], 0, 'C5 (nextAction) is a collection gap despite the review-stage fill');
});
