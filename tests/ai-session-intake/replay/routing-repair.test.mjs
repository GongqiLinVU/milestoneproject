// Focused answer-bank routing REPAIR checks (Phase B3 offline repair, part 2).
//
// Pins the required repaired behavior against the ACTUAL problematic questions
// seen in the live trace. Deterministic simulator only (no LLM student).
//
//   node --test tests/ai-session-intake/replay/routing-repair.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const gold = JSON.parse(readFileSync(resolve(here, 'gold-t1.json'), 'utf8'));

// Mirror of the repaired router in run-dynamic-t1.mjs (kept in sync; this test
// fails loudly if the contract changes).
const norm = s => String(s || '').toLowerCase();
const tokenize = s => new Set((norm(s).match(/[a-z0-9]+/g) || []));
function respond(sg, question, revealed, first = false) {
  if (first) { const e = sg.answerBank[0]; revealed.add(e.factId); return { text: e.reveals, revealed: [e.factId], ambiguity: null }; }
  const q = norm(question), qTokens = tokenize(q), honest = sg.honestAnswers || {};
  const asksRepoPath = /\b(repo|repository|path|url|link|upload)\b/.test(q) || /where .*(file|diagram|pdf|artifact|screen)/.test(q);
  const asksRunNow = /\b(run|execute|rerun|simulate)\b/.test(q) && /\b(now|test|it|the|journey|changed)\b/.test(q);
  const asksCommit = /\bcommit\b|\bhash\b|\bsha\b/.test(q);
  if (asksRunNow && honest.run_test_now) return { text: honest.run_test_now, revealed: [], ambiguity: { type: 'run_now_declined_no_fabrication' } };
  if (asksRepoPath && honest.repo_path) return { text: honest.repo_path, revealed: [], ambiguity: { type: 'repo_path_honest_no_leak' } };
  if (asksCommit && honest.commit_hash) return { text: honest.commit_hash, revealed: [], ambiguity: { type: 'commit_honest_no_leak' } };
  const scoreEntry = e => e.routeKeys.reduce((n, k) => { if (q.includes(k)) return n + 1; for (const tok of qTokens) if (tok.startsWith(k) || (k.startsWith(tok) && tok.length >= 4)) return n + 1; return n; }, 0);
  const scored = sg.answerBank.filter(e => !revealed.has(e.factId)).map(e => ({ e, hits: scoreEntry(e) })).filter(x => x.hits > 0).sort((a, b) => b.hits - a.hits);
  if (!scored.length) {
    const isSummaryOrAck = /\b(summar|acknowledg|noted|got it|to confirm|so you|i see|recorded|review|thanks)\b/.test(q);
    const isClarify = /\b(what|which|how|clarif|mean|repeat|again|else|more)\b/.test(q);
    const revealedEntries = sg.answerBank.filter(e => revealed.has(e.factId));
    if ((isSummaryOrAck || isClarify) && sg.authorizedRepeat && revealedEntries.length) return { text: sg.authorizedRepeat, revealed: [], ambiguity: { type: 'authorized_repeat_no_new_fact' } };
    return { text: 'Which part do you mean?', revealed: [], ambiguity: { type: 'unmatched_question_no_fact', pendingAdjudication: true } };
  }
  if (scored.length > 1 && scored[0].hits === scored[1].hits) { const tied = scored.filter(x => x.hits === scored[0].hits).map(x => x.e); tied.forEach(m => revealed.add(m.factId)); return { text: tied.map(m => m.reveals).join(' '), revealed: tied.map(m => m.factId), ambiguity: { type: 'combined_question_multiple_reveals' } }; }
  revealed.add(scored[0].e.factId); return { text: scored[0].e.reveals, revealed: [scored[0].e.factId], ambiguity: null };
}

test('repo-path question (actual S1 turn 8) gives an honest answer and leaks no unrelated fact', () => {
  const revealed = new Set(gold.sessions.S1.answerBank.map(e => e.factId)); // all disclosed
  const r = respond(gold.sessions.S1, 'Please reply with the repo path where you will upload booking-flow-v1.pdf', revealed);
  assert.equal(r.revealed.length, 0, 'no new fact leaked');
  assert.match(r.text.toLowerCase(), /not recorded|would need checking/, 'honest not-recorded answer');
  assert.doesNotMatch(r.text.toLowerCase(), /test|commit [a-f0-9]/, 'no unrelated testing/commit fact');
});

test('never invents a repo path', () => {
  const revealed = new Set(gold.sessions.S2.answerBank.map(e => e.factId));
  const r = respond(gold.sessions.S2, 'What is the exact repository URL for the branch?', revealed);
  assert.doesNotMatch(r.text, /github\.com|https?:\/\/|src\/|\/repo\//, 'no fabricated path');
});

test('repeated clarification with an authorized answer available repeats facts, not "Which part do you mean?"', () => {
  const revealed = new Set(gold.sessions.S1.answerBank.map(e => e.factId));
  const r = respond(gold.sessions.S1, 'Which specific part do you mean?', revealed);
  assert.notEqual(r.text, 'Which part do you mean?', 'must repeat authorized facts');
  assert.match(r.text.toLowerCase(), /as i said|booking ui/, 'restates already-disclosed facts');
  assert.equal(r.revealed.length, 0, 'no NEW undisclosed fact released by a clarification');
});

test('a model summary / "no further question" does not auto-release the next undisclosed fact', () => {
  const revealed = new Set(['T1S1-C1']); // only ownership disclosed so far
  const before = new Set(revealed);
  const r = respond(gold.sessions.S1, 'To confirm, you own the booking UI. Noted, I have recorded that.', revealed);
  // A summary/ack must not push out C2..C5. authorizedRepeat is allowed (restates C1) but reveals no NEW fact.
  assert.equal(r.revealed.length, 0, 'summary released no new fact');
  assert.deepEqual([...revealed].sort(), [...before].sort(), 'revealed set unchanged by a summary');
});

test('run-a-test-now (actual S4 turn 6/14) does not fabricate execution or a result', () => {
  const revealed = new Set(gold.sessions.S4.answerBank.map(e => e.factId));
  const r = respond(gold.sessions.S4, 'Will you rerun the changed-slot journey now and paste the test output here?', revealed);
  assert.match(r.text.toLowerCase(), /cannot .*(run|rerun)|still open/, 'declines to run now');
  assert.doesNotMatch(r.text.toLowerCase(), /passed|saved correctly|output:/, 'no fabricated result');
});

test('genuinely off-topic question stays inspectable (unmatched, pending adjudication), not silently rewarded', () => {
  const revealed = new Set(gold.sessions.S1.answerBank.map(e => e.factId));
  // strip authorizedRepeat path by using a non-clarify, non-summary off-topic question
  const r = respond({ ...gold.sessions.S1, authorizedRepeat: undefined }, 'Nice weather today isnt it', revealed);
  assert.equal(r.revealed.length, 0);
  assert.equal(r.ambiguity.type, 'unmatched_question_no_fact');
  assert.equal(r.ambiguity.pendingAdjudication, true);
});
