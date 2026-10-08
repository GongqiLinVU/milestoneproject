// Focused simulator-repair checks (B3 part 2) using the ACTUAL stuck questions
// from the $0.65 trace. Deterministic; mirrors the repaired studentRespond.
//
//   node --test tests/ai-session-intake/replay/routing-repair-v2.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const gold = JSON.parse(readFileSync(resolve(here, 'gold-t1.json'), 'utf8'));
const norm = s => String(s || '').toLowerCase();
const tokenize = s => new Set((norm(s).match(/[a-z0-9]+/g) || []));

// Mirror of the repaired router (kept in sync with run-live-t1.mjs).
function studentRespond(sg, question, revealed, first, askHistory) {
  if (first) { const e = sg.answerBank[0]; revealed.add(e.factId); return { text: e.reveals, revealed: [e.factId], ambiguity: null }; }
  const q = norm(question), qTokens = tokenize(q), honest = sg.honestAnswers || {};
  const scoreEntry = e => e.routeKeys.reduce((n, k) => { if (q.includes(k)) return n + 1; for (const tok of qTokens) if (tok.startsWith(k) || (k.startsWith(tok) && tok.length >= 4)) return n + 1; return n; }, 0);
  const scored = sg.answerBank.filter(e => !revealed.has(e.factId)).map(e => ({ e, hits: scoreEntry(e) })).filter(x => x.hits > 0).sort((a, b) => b.hits - a.hits);
  if (scored.length) {
    if (scored.length > 1 && scored[0].hits === scored[1].hits) { const tied = scored.filter(x => x.hits === scored[0].hits).map(x => x.e); tied.forEach(m => revealed.add(m.factId)); return { text: tied.map(m => m.reveals).join(' '), revealed: tied.map(m => m.factId), ambiguity: { type: 'combined_question_multiple_reveals' } }; }
    revealed.add(scored[0].e.factId); return { text: scored[0].e.reveals, revealed: [scored[0].e.factId], ambiguity: null };
  }
  const asksRepoPath = /\b(repo|repository|url|link|upload)\b/.test(q) || /where .*(file|diagram|pdf|artifact|screen)/.test(q);
  const asksRunNow = /\b(run|execute|rerun|simulate)\b/.test(q) && /\b(now|right now|immediately)\b/.test(q);
  const already = t => askHistory && askHistory.has(t);
  const emitHonest = (t, text, type) => { if (already(t)) { if (sg.authorizedRepeat) return { text: sg.authorizedRepeat, revealed: [], ambiguity: { type: 'authorized_repeat_after_repeat_topic' } }; return { text, revealed: [], ambiguity: { type } }; } if (askHistory) askHistory.add(t); return { text, revealed: [], ambiguity: { type } }; };
  if (asksRunNow && honest.run_test_now) return emitHonest('run_now', honest.run_test_now, 'run_now_declined_no_fabrication');
  if (asksRepoPath && honest.repo_path) return emitHonest('repo_path', honest.repo_path, 'repo_path_honest_no_leak');
  const isSummaryOrAck = /\b(summar|acknowledg|noted|got it|to confirm|so you|i see|recorded|review|thanks)\b/.test(q);
  const isClarify = /\b(what|which|how|clarif|mean|repeat|again|else|more)\b/.test(q);
  if ((isSummaryOrAck || isClarify) && sg.authorizedRepeat && sg.answerBank.some(e => revealed.has(e.factId))) return { text: sg.authorizedRepeat, revealed: [], ambiguity: { type: 'authorized_repeat_no_new_fact' } };
  return { text: 'Which part do you mean?', revealed: [], ambiguity: { type: 'unmatched_question_no_fact', pendingAdjudication: true } };
}

test('fact routing beats the repo-path keyword rule: an evidence question routes to the filename fact, not the honest non-answer', () => {
  const sg = gold.sessions.S1, revealed = new Set(['T1S1-C1']), hist = new Set();
  // "What evidence could the Teacher review?" should hit C4 (evidence route), not repo_path honest.
  const r = studentRespond(sg, 'What evidence could the Teacher review for the design?', revealed, false, hist);
  assert.ok(r.revealed.includes('T1S1-C4'), 'routes to the evidence fact');
  assert.match(r.text.toLowerCase(), /booking-flow-v1\.pdf/, 'gives the filename route');
  assert.doesNotMatch(r.text.toLowerCase(), /not recorded a repo path/, 'does NOT fire the repo-path non-answer');
});

test('repeated repo-path questions do NOT loop: second one yields authorized repeat, not the same stuck line', () => {
  const sg = gold.sessions.S1, revealed = new Set(sg.answerBank.map(e => e.factId)), hist = new Set();
  const q = 'Please reply with the repo path where you will upload booking-flow-v1.pdf';
  const r1 = studentRespond(sg, q, revealed, false, hist);
  assert.match(r1.text.toLowerCase(), /not recorded/, 'first time: honest not-recorded');
  const r2 = studentRespond(sg, q, revealed, false, hist);
  assert.notEqual(r2.text, r1.text, 'second time does not repeat the identical stuck line');
  assert.match(r2.text.toLowerCase(), /as i said|booking ui/, 'instead repeats authorized facts');
});

test('run-now only fires on genuine immediacy, and never fabricates a result', () => {
  const sg = gold.sessions.S4, revealed = new Set(sg.answerBank.map(e => e.factId)), hist = new Set();
  const r = studentRespond(sg, 'Will you rerun the changed-slot journey right now and paste output?', revealed, false, hist);
  assert.match(r.text.toLowerCase(), /cannot .*(run|rerun)|still open/, 'declines to run now');
  assert.doesNotMatch(r.text.toLowerCase(), /passed|saved correctly|output:/, 'no fabricated result');
});

test('combined "A or B?" question answers the feasible alternatives it hits', () => {
  const sg = gold.sessions.S3, revealed = new Set(['T1S3-C1']), hist = new Set();
  const r = studentRespond(sg, 'Did the changed-slot path fail, and what is the root cause — UI or API?', revealed, false, hist);
  assert.ok(r.revealed.length >= 1, 'answers at least one alternative');
});

test('never invents a URL for a filename/report evidence route', () => {
  const sg = gold.sessions.S4, revealed = new Set(['T1S4-C1']), hist = new Set();
  const r = studentRespond(sg, 'Where is the evidence for the retest?', revealed, false, hist);
  assert.doesNotMatch(r.text, /https?:\/\/|github\.com/, 'no invented URL');
});
