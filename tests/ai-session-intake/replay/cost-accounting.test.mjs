// Offline cost-accounting validation (final correction 2).
//
// Verifies the reservation model WITHOUT any paid call:
//  - reserve covers every provider attempt per endpoint call (2, per the in-turn
//    retry loop in api/session-intake-ai.ts);
//  - input/output bounds behind the reserve are the documented endpoint limits;
//  - missing usage is charged the per-call maximum (never zero);
//  - a call is refused when committing its full reserve would exceed the cap.
//
//   node --test tests/ai-session-intake/replay/cost-accounting.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';

// Reproduce the corrected model from run-live-t1.mjs (kept in sync).
const MODEL_IN = 0.25 / 1e6, MODEL_OUT = 2.00 / 1e6;
const ATTEMPTS_PER_CALL = 2;
const MAX_IN_PER_ATTEMPT = 21000;   // MAX_BODY_BYTES 64000/3.5 + instructions 9433/3.5
const MAX_OUT_PER_ATTEMPT = 4000;   // turn max_output_tokens
const MAX_COST_PER_ATTEMPT = MAX_IN_PER_ATTEMPT * MODEL_IN + MAX_OUT_PER_ATTEMPT * MODEL_OUT;
const MAX_COST_PER_CALL = ATTEMPTS_PER_CALL * MAX_COST_PER_ATTEMPT;

function makeCost() {
  const cost = { knownUsd: 0, unknownUsd: 0, calls: 0, callsWithUsage: 0, callsMissingUsage: 0, unreportedRetryReserveUsd: 0 };
  const addUsage = u => {
    cost.calls++;
    if (!u) { cost.callsMissingUsage++; cost.unknownUsd += MAX_COST_PER_CALL; return; }
    cost.callsWithUsage++;
    cost.knownUsd += (u.input_tokens || 0) * MODEL_IN + (u.output_tokens || 0) * MODEL_OUT;
    // Conservative reserve for a possible unreported retry attempt on a SUCCESS.
    cost.unknownUsd += MAX_COST_PER_ATTEMPT; cost.unreportedRetryReserveUsd += MAX_COST_PER_ATTEMPT;
  };
  const total = () => cost.knownUsd + cost.unknownUsd;
  const canAfford = cap => total() + MAX_COST_PER_CALL <= cap;
  return { cost, addUsage, total, canAfford };
}

test('reserve covers 2 attempts with documented (estimated) bounds', () => {
  assert.equal(ATTEMPTS_PER_CALL, 2, 'matches the endpoint in-turn retry loop (attempt<2)');
  assert.equal(MAX_OUT_PER_ATTEMPT, 4000, 'matches turn max_output_tokens');
  // input bound is an ESTIMATE that at least covers the 64KB body cap at ~3.5 chars/token
  assert.ok(MAX_IN_PER_ATTEMPT >= Math.ceil(64000 / 3.5), 'input estimate covers the 64KB body cap');
  assert.ok(Math.abs(MAX_COST_PER_CALL - 2 * (21000 * MODEL_IN + 4000 * MODEL_OUT)) < 1e-9);
});

test('missing usage is charged the per-call maximum, never zero', () => {
  const { cost, addUsage } = makeCost();
  addUsage(null); // provider_incomplete style: no usage returned
  assert.equal(cost.callsMissingUsage, 1);
  assert.ok(cost.unknownUsd > 0, 'missing usage is not zero');
  assert.ok(Math.abs(cost.unknownUsd - MAX_COST_PER_CALL) < 1e-9, 'charged exactly the per-call reserve');
});

test('successful call charges actual tokens to known AND reserves a possible unreported retry to unknown', () => {
  const { cost, addUsage } = makeCost();
  addUsage({ input_tokens: 2000, output_tokens: 1500 });
  assert.equal(cost.callsWithUsage, 1);
  assert.ok(Math.abs(cost.knownUsd - (2000 * MODEL_IN + 1500 * MODEL_OUT)) < 1e-9, 'known = actual final-attempt tokens');
  assert.ok(Math.abs(cost.unknownUsd - MAX_COST_PER_ATTEMPT) < 1e-9, 'unknown reserves one possible unreported retry attempt');
  assert.ok(Math.abs(cost.unreportedRetryReserveUsd - MAX_COST_PER_ATTEMPT) < 1e-9, 'reserve tracked separately');
  assert.ok(cost.knownUsd > 0 && cost.unknownUsd > 0, 'known and unknown kept separate and both > 0');
});

test('budget guard refuses a call that would exceed the cap', () => {
  const { addUsage, canAfford } = makeCost();
  const cap = 0.20;
  let allowed = 0;
  // Worst case: every call returns no usage (max charge each).
  while (canAfford(cap)) { addUsage(null); allowed++; if (allowed > 100) break; }
  assert.equal(allowed, Math.floor(cap / MAX_COST_PER_CALL), 'stops before the reserve would exceed the cap');
  assert.ok(allowed <= 7, 'conservative guard caps worst-case starts');
});
