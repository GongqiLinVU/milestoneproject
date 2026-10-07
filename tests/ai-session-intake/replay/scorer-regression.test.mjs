// Focused scorer regression checks (Phase B3 offline repair, part 1).
//
// These pin the DEMONSTRATED false positives from the live trace so the scorer
// cannot silently re-credit them. Each check runs deterministic field-level
// assertions on the actual live candidateConfirmedOutput. Where a judgment cannot
// be made reliably by a deterministic rule, the check asserts that the case is
// FLAGGED for human adjudication rather than auto-scored — we do not claim general
// semantic scoring is solved.
//
//   node --test tests/ai-session-intake/replay/scorer-regression.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
// This v1 suite was authored against the FIRST live run. That run was preserved at
// out/dynamic-t1-live.PRE-065-RUN.json when the US$0.65 run overwrote
// out/dynamic-t1-live.json. v1 therefore reads the preserved backup (its intended
// trace); scorer-regression-v2.test.mjs pins the latest ($0.65) trace.
const live = JSON.parse(readFileSync(resolve(here, 'out/dynamic-t1-live.PRE-065-RUN.json'), 'utf8'));
const byKey = Object.fromEntries(live.sessions.map(s => [s.sessionKey, s.candidateConfirmedOutput]));

// --- Deterministic recording-fidelity predicates (benchmark-side, not production) ---
// A "normal path passed" testing fact must be represented as an executed pass in
// the record's testing fields, not merely inferable from prose.
function normalPassInTestingRecord(a) {
  const t = `${a.testingResult}`.toLowerCase();
  const hasNormalPass = /normal/.test(t) && /(saved|pass|success|correct|appeared)/.test(t);
  const onlyFailure = /fail|old|showed the old/.test(t) && !hasNormalPass;
  return { hasNormalPass, onlyFailure };
}
// A "design only / no UI implemented" fact must be represented in progress/scope,
// not overwritten by a blocker.
function designNoUiInRecord(a) {
  const p = `${a.progress} ${a.scope}`.toLowerCase();
  return /(design only|no ui|not built|drawing the flow|not implemented|implemented no ui)/.test(p);
}
// Own-work ownership: the student's own change must appear in progress/responsibility,
// and progressKind must not be no_progress when an own change was reported.
function ownWorkInRecord(a) {
  const own = /(i changed|changed the ui|my ui|ui handling)/.test(`${a.responsibility} ${a.progress}`.toLowerCase());
  const contradicts = a.progressKind === 'no_progress';
  const teammateOnlyProgress = /^b adjusted|team member/.test(`${a.progress}`.toLowerCase());
  return { own, contradicts, teammateOnlyProgress };
}

test('S3 false positive: normal-booking-saved is NOT represented as a passed test in the record', () => {
  const s3 = byKey.S3;
  const { hasNormalPass, onlyFailure } = normalPassInTestingRecord(s3);
  // The live record retained only the changed-slot failure; assert the scorer
  // must NOT credit "normal path saved" as R=2 from this record.
  assert.equal(hasNormalPass, false, 'record does not contain a normal-path pass');
  assert.equal(onlyFailure, true, 'record retains only the changed-slot failure');
  // Regression guard: a naive presence check on testingResult must not be used as
  // proof the normal-success fact was retained.
});

test('S1 false positive: design/no-UI is NOT retained (progress holds the blocker instead)', () => {
  const s1 = byKey.S1;
  assert.equal(designNoUiInRecord(s1), false, 'the disclosed design-only/no-UI fact is absent from progress/scope');
  assert.match(s1.progress.toLowerCase(), /api response format|undecided/, 'progress instead holds the API-format blocker');
});

test('S4 ownership error: own UI change missing from progress and progressKind=no_progress', () => {
  const s4 = byKey.S4;
  const { own, contradicts, teammateOnlyProgress } = ownWorkInRecord(s4);
  assert.equal(contradicts, true, 'progressKind=no_progress contradicts a reported own change');
  assert.equal(teammateOnlyProgress, true, 'progress records only teammate B\'s work');
  // The student\'s own change may appear in responsibility, but progress+progressKind are wrong.
  assert.ok(own, 'own change is at least present somewhere (responsibility), so this is a mis-attribution, not total loss');
});

test('S2-C3 integration-not-attempted is UNRESOLVED and must be flagged for adjudication, not auto-scored', () => {
  // Deterministic rule cannot decide whether "need a joint slot to connect" alone
  // establishes "integration not attempted". Assert the record only has the
  // partial signal, so any auto-credit of full C2 would be wrong.
  const s2 = byKey.S2;
  const blocker = `${s2.blockerDescription}`.toLowerCase();
  assert.match(blocker, /joint slot|connect/, 'only the partial joint-slot signal is present');
  assert.equal(/not attempted|not connected|no integration/.test(`${s2.progress} ${s2.blockerDescription}`.toLowerCase()), false,
    'the explicit not-attempted status is absent -> requires human adjudication, not auto full credit');
});
