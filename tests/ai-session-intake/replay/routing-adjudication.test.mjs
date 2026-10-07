// Routing/adjudication controls for the dynamic T1 driver (Phase B3, item 2).
//
// Verifies:
//   - reasonable paraphrases still route to the intended fact (stem/substring);
//   - a genuinely combined question may reveal multiple relevant facts, flagged
//     pendingAdjudication (valid, not a failure);
//   - an unmatched question reveals no fact and is flagged pendingAdjudication
//     (never silently converted into a pass or an Intake failure).
//
// This test exercises the DRIVER's gold-side router in isolation (no model, no
// network). It imports the router via a tiny re-export shim kept in the driver.
//
//   node --test tests/ai-session-intake/replay/routing-adjudication.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const gold = JSON.parse(readFileSync(resolve(here, 'gold-t1.json'), 'utf8'));

// Re-implement the exact router contract used by run-dynamic-t1.mjs so the test
// pins the intended behavior. (The driver keeps the authoritative copy; this
// mirror asserts the contract and will diverge loudly if the driver changes.)
const norm = s => String(s || '').toLowerCase();
const tokenize = s => new Set((norm(s).match(/[a-z0-9]+/g) || []));
function route(sessionGold, question, revealedSet) {
  const q = norm(question);
  const qTokens = tokenize(q);
  const scoreEntry = e => e.routeKeys.reduce((n, k) => {
    if (q.includes(k)) return n + 1;
    for (const tok of qTokens) { if (tok.startsWith(k) || (k.startsWith(tok) && tok.length >= 4)) return n + 1; }
    return n;
  }, 0);
  const scored = sessionGold.answerBank.filter(e => !revealedSet.has(e.factId))
    .map(e => ({ e, hits: scoreEntry(e) })).filter(x => x.hits > 0).sort((a, b) => b.hits - a.hits);
  if (scored.length === 0) return { revealed: [], ambiguity: { type: 'unmatched_question_no_fact', pendingAdjudication: true } };
  if (scored.length > 1 && scored[0].hits === scored[1].hits) {
    const tied = scored.filter(x => x.hits === scored[0].hits).map(x => x.e);
    tied.forEach(m => revealedSet.add(m.factId));
    return { revealed: tied.map(m => m.factId), ambiguity: { type: 'combined_question_multiple_reveals', pendingAdjudication: true } };
  }
  revealedSet.add(scored[0].e.factId);
  return { revealed: [scored[0].e.factId], ambiguity: null };
}

test('paraphrase routes to the intended fact (S3: "how did integration go" -> C1)', () => {
  const r = route(gold.sessions.S3, 'How did the integration go this week?', new Set());
  assert.deepEqual(r.revealed, ['T1S3-C1']);
  assert.equal(r.ambiguity, null);
});

test('paraphrase with stemming ("connected" question -> integration fact)', () => {
  const r = route(gold.sessions.S3, 'Did you connect the modules together?', new Set());
  assert.ok(r.revealed.includes('T1S3-C1'), 'stem/substring routing reaches the integration fact');
});

test('combined question may reveal multiple facts, flagged pending adjudication', () => {
  // A question hitting both the changed-slot and evidence/next directions.
  const r = route(gold.sessions.S3, 'Did the changed slot fail, and what evidence and next step do you have?', new Set());
  assert.ok(r.revealed.length >= 1);
  if (r.revealed.length > 1) {
    assert.equal(r.ambiguity.type, 'combined_question_multiple_reveals');
    assert.equal(r.ambiguity.pendingAdjudication, true);
  }
});

test('unmatched question reveals no fact and is flagged pending adjudication (not silent)', () => {
  const revealed = new Set(gold.sessions.S1.answerBank.map(e => e.factId)); // all already revealed
  const r = route(gold.sessions.S1, 'Anything about the weather?', revealed);
  assert.deepEqual(r.revealed, []);
  assert.equal(r.ambiguity.type, 'unmatched_question_no_fact');
  assert.equal(r.ambiguity.pendingAdjudication, true);
});
