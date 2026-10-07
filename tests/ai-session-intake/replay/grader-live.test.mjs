// Grader live-adapter (mocked HTTP) + evidence-distinction checks (B3 final items 1-2).
//   node --test tests/ai-session-intake/replay/grader-live.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradeWithLLM, validateGraderEvidence, buildGradingTasks } from './grader-harness.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const gold = JSON.parse(readFileSync(resolve(here, 'gold-t1.json'), 'utf8'));

const sampleGrades = { grades: [{ factId: 'T1S1-C1', c_score: 2, c_reason: 'ok', c_evidenceTurns: [1], c_quote: 'own the booking UI', r_score: 2, r_reason: 'ok', r_fieldPath: 'responsibility', r_value: 'Booking UI', uncertain: false }] };

function mockFetch(provider) {
  return async (url, opts) => {
    const u = String(url); const body = JSON.parse(opts.body);
    mockFetch.lastUrl = u; mockFetch.lastBody = body;
    if (provider === 'deepseek') {
      assert.ok(u.includes('deepseek.com/chat/completions'), 'deepseek hits chat/completions');
      assert.equal(body.model, 'deepseek-flash');
      assert.deepEqual(body.response_format, { type: 'json_object' });
      return { ok: true, status: 200, json: async () => ({ model: 'deepseek-flash', choices: [{ message: { content: JSON.stringify(sampleGrades) }, finish_reason: 'stop' }], usage: { prompt_tokens: 1500, completion_tokens: 800 } }) };
    }
    assert.ok(u.includes('api.openai.com/v1/responses'), 'openai hits responses');
    assert.equal(body.model, 'gpt-5-mini');
    return { ok: true, status: 200, json: async () => ({ model: 'gpt-5-mini', status: 'completed', output_text: JSON.stringify(sampleGrades), usage: { input_tokens: 1600, output_tokens: 800 } }) };
  };
}

test('real grader adapter path (mocked HTTP) — DeepSeek: correct transport, parse, usage/cost', async () => {
  const tasks = [{ factId: 'T1S1-C1', target: 't', anchors: {}, conversationEvidence: ['U1: x'], recordEvidence: {}, instruction: 'i' }];
  const res = await gradeWithLLM(tasks, { provider: 'deepseek', fetchImpl: mockFetch('deepseek') });
  assert.equal(res.provider, 'deepseek');
  assert.equal(res.grades.length, 1);
  assert.deepEqual(res.usage, { input_tokens: 1500, output_tokens: 800 });
  assert.ok(res.knownUsd > 0, 'cost computed from usage');
});

test('real grader adapter path (mocked HTTP) — OpenAI: correct transport, parse', async () => {
  const tasks = [{ factId: 'T1S1-C1', target: 't', anchors: {}, conversationEvidence: ['U1: x'], recordEvidence: {}, instruction: 'i' }];
  const res = await gradeWithLLM(tasks, { provider: 'openai', fetchImpl: mockFetch('openai') });
  assert.equal(res.provider, 'openai');
  assert.equal(res.grades[0].factId, 'T1S1-C1');
});

// --- Item 2: C/R evidence-distinction checks ---
const task = { factId: 'T1S1-C2', conversationEvidence: ['U1: I am drawing the flow; no UI is built yet.'], recordEvidence: { progress: 'Drawing the flow; no UI built', progressKind: 'advanced', scope: '' } };
const tbf = { 'T1S1-C2': task };

test('disclosed-but-unrecorded fact: C=2 with R=0 is VALID (no record content required)', () => {
  const emptyRecordTask = { factId: 'T1S1-C5', conversationEvidence: ['U1: Next I will build the screens.'], recordEvidence: { nextAction: '', dueSession: '', expectedEvidence: '' } };
  const g = [{ factId: 'T1S1-C5', c_score: 2, c_evidenceTurns: [1], c_quote: 'build the screens', r_score: 0, r_reason: 'omitted from record', uncertain: false }];
  const [v] = validateGraderEvidence(g, { 'T1S1-C5': emptyRecordTask });
  assert.deepEqual(v.evidenceIssues, [], 'R=0 omission with empty record raises NO issue');
  assert.equal(v.needsHumanReview, false);
  assert.equal(v.cEvidenceValid, true);
  assert.equal(v.rEvidenceValid, true);
});

test('C requires an exact quote present in a cited student turn', () => {
  const g = [{ factId: 'T1S1-C2', c_score: 2, c_evidenceTurns: [1], c_quote: 'built the full UI', r_score: 0, uncertain: false }];
  const [v] = validateGraderEvidence(g, tbf);
  assert.ok(v.evidenceIssues.includes('c_quote_not_in_cited_turn'), 'fabricated quote flagged');
  assert.equal(v.needsHumanReview, true);
});

test('C cited turn out of range is flagged', () => {
  const g = [{ factId: 'T1S1-C2', c_score: 2, c_evidenceTurns: [9], c_quote: 'drawing the flow', r_score: 0, uncertain: false }];
  const [v] = validateGraderEvidence(g, tbf);
  assert.ok(v.evidenceIssues.includes('c_cited_turn_out_of_range'));
});

test('R>=1 requires a real field path and a matching value in the record', () => {
  const gGoodPathWrongVal = [{ factId: 'T1S1-C2', c_score: 2, c_evidenceTurns: [1], c_quote: 'drawing the flow', r_score: 2, r_fieldPath: 'progress', r_value: 'TOTALLY DIFFERENT', uncertain: false }];
  const [v1] = validateGraderEvidence(gGoodPathWrongVal, tbf);
  assert.ok(v1.evidenceIssues.includes('r_value_mismatch_vs_record'), 'value must match record');
  const gBadPath = [{ factId: 'T1S1-C2', c_score: 2, c_evidenceTurns: [1], c_quote: 'drawing the flow', r_score: 2, r_fieldPath: 'nonexistent', r_value: 'x', uncertain: false }];
  const [v2] = validateGraderEvidence(gBadPath, tbf);
  assert.ok(v2.evidenceIssues.includes('r_field_path_not_in_record'));
});

test('R>=1 on an empty record field is flagged (retention claimed but field empty)', () => {
  const g = [{ factId: 'T1S1-C2', c_score: 2, c_evidenceTurns: [1], c_quote: 'drawing the flow', r_score: 2, r_fieldPath: 'scope', r_value: '', uncertain: false }];
  const [v] = validateGraderEvidence(g, tbf);
  assert.ok(v.evidenceIssues.includes('r_retention_claimed_but_record_field_empty') || v.evidenceIssues.includes('r_value_mismatch_vs_record'));
  assert.equal(v.needsHumanReview, true);
});

test('faithful C=2/R=2 with real quote + matching field passes with no issues', () => {
  const g = [{ factId: 'T1S1-C2', c_score: 2, c_evidenceTurns: [1], c_quote: 'drawing the flow', r_score: 2, r_fieldPath: 'progress', r_value: 'Drawing the flow; no UI built', uncertain: false }];
  const [v] = validateGraderEvidence(g, tbf);
  assert.deepEqual(v.evidenceIssues, []);
  assert.equal(v.needsHumanReview, false);
});
