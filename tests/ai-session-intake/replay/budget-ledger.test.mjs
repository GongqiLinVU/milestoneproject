// Budget-ledger validation (B3 final wiring). No network.
//   node --test tests/ai-session-intake/replay/budget-ledger.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { initLedger, reserve, settle, snapshot } from './budget-ledger.mjs';

const here = dirname(fileURLToPath(import.meta.url));
function clean() { try { rmSync(resolve(here, 'out', 'ledger'), { recursive: true, force: true }); } catch {} }

test('component cap blocks over-reservation', async () => {
  clean();
  await initLedger({ overallCapUsd: 10, components: { a: 0.05 }, reset: true });
  assert.equal((await reserve('a', 0.03)).ok, true);
  assert.equal((await reserve('a', 0.03)).ok, false, 'second reserve exceeds component cap');
  clean();
});

test('overall guard blocks even when components have room', async () => {
  clean();
  await initLedger({ overallCapUsd: 0.05, components: { a: 1, b: 1 }, reset: true });
  assert.equal((await reserve('a', 0.03)).ok, true);
  const r = await reserve('b', 0.03);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'overall_guard_reached');
  clean();
});

test('settle releases the reservation and records known vs unknown', async () => {
  clean();
  await initLedger({ overallCapUsd: 10, components: { a: 1 }, reset: true });
  await reserve('a', 0.0265);
  await settle('a', { perCallMaxUsd: 0.0265, knownUsd: 0.006, unknownUsd: 0.0132 });
  const l = await snapshot();
  assert.equal(l.components.a.reservedUsd, 0, 'reservation released');
  assert.ok(Math.abs(l.components.a.knownUsd - 0.006) < 1e-9);
  assert.ok(Math.abs(l.components.a.unknownUsd - 0.0132) < 1e-9);
  assert.equal(l.components.a.calls, 1);
  clean();
});

test('parallel reservations cannot jointly breach the overall guard (atomic lock)', async () => {
  clean();
  await initLedger({ overallCapUsd: 0.05, components: { a: 1, b: 1 }, reset: true });
  // Fire two reservations "in parallel"; the atomic file lock serializes them, so
  // at most one that fits (0.03) succeeds; a second 0.03 would total 0.06 > 0.05.
  const [r1, r2] = await Promise.all([reserve('a', 0.03), reserve('b', 0.03)]);
  const oks = [r1.ok, r2.ok].filter(Boolean).length;
  assert.equal(oks, 1, 'exactly one parallel reservation fits under the overall guard');
  clean();
});
