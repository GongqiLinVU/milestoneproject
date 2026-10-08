// Offline provider-adapter tests (B3 part 4). No network, no keys.
//   node --test tests/ai-session-intake/replay/provider-adapter.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDeepSeek, normalizeOpenAIResponses, buildDeepSeekRequest, providerStatus, deepseekConfigured, PROVIDER_CONFIG } from './provider-adapter.mjs';

const candidate = { assistantMessage: 'What is your next step?', route: 'clarification', evidenceUpdates: [], assessment: {}, uncertainties: [], suggestedTeacherQuestions: [] };

test('DeepSeek Chat Completions body normalizes to the common parsed-candidate shape', () => {
  const body = { id: 'x', model: 'deepseek-flash', choices: [{ message: { content: JSON.stringify(candidate) }, finish_reason: 'stop' }], usage: { prompt_tokens: 1500, completion_tokens: 1200 } };
  const n = normalizeDeepSeek(body);
  assert.equal(n.provider, 'deepseek');
  assert.equal(n.providerStatus, 'completed');
  assert.deepEqual(n.parsedCandidate.route, 'clarification');
  assert.deepEqual(n.usage, { input_tokens: 1500, output_tokens: 1200 });
  assert.equal(n.outputText, JSON.stringify(candidate));
});

test('DeepSeek finish_reason length maps to incomplete', () => {
  const body = { choices: [{ message: { content: '' }, finish_reason: 'length' }], usage: { prompt_tokens: 1000, completion_tokens: 4000 } };
  assert.equal(normalizeDeepSeek(body).providerStatus, 'incomplete');
});

test('OpenAI Responses body normalizes to the SAME common shape', () => {
  const body = { model: 'gpt-5-mini', status: 'completed', output_text: JSON.stringify(candidate), usage: { input_tokens: 1600, output_tokens: 1400 } };
  const n = normalizeOpenAIResponses(body);
  assert.equal(n.provider, 'openai');
  assert.deepEqual(n.parsedCandidate.route, 'clarification');
  assert.deepEqual(n.usage, { input_tokens: 1600, output_tokens: 1400 });
});

test('both providers produce identical parsed-candidate structure from the same candidate JSON', () => {
  const ds = normalizeDeepSeek({ choices: [{ message: { content: JSON.stringify(candidate) }, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 1 } });
  const oa = normalizeOpenAIResponses({ status: 'completed', output_text: JSON.stringify(candidate), usage: { input_tokens: 1, output_tokens: 1 } });
  assert.deepEqual(ds.parsedCandidate, oa.parsedCandidate, 'shared schema: identical parsed candidate across providers');
});

test('buildDeepSeekRequest uses SHARED instructions and OpenAI-compatible params (no prompt tuning)', () => {
  const req = buildDeepSeekRequest({ instructions: 'SHARED HARNESS RULES', inputJson: '{"conversation":[]}', maxTokens: 4000 });
  assert.equal(req.model, 'deepseek-flash');
  assert.equal(req.messages[0].content, 'SHARED HARNESS RULES', 'uses the shared instructions verbatim');
  assert.equal(req.max_tokens, 4000);
  assert.deepEqual(req.response_format, { type: 'json_object' });
});

test('offline-safe: DeepSeek reported not configured when key absent', () => {
  const was = process.env.DEEPSEEK_API_KEY; delete process.env.DEEPSEEK_API_KEY;
  assert.equal(deepseekConfigured(), false);
  const st = providerStatus();
  assert.equal(st.deepseek.configured, false);
  assert.match(st.deepseek.missing, /DEEPSEEK_API_KEY/);
  assert.equal(st.openai.configured, true);
  if (was !== undefined) process.env.DEEPSEEK_API_KEY = was;
});

test('config records verified DeepSeek endpoint/model and the API difference', () => {
  assert.equal(PROVIDER_CONFIG.deepseek.baseUrl, 'https://api.deepseek.com');
  assert.equal(PROVIDER_CONFIG.deepseek.endpoint, '/chat/completions');
  assert.equal(PROVIDER_CONFIG.deepseek.api, 'chat_completions');
  assert.equal(PROVIDER_CONFIG.openai.api, 'responses');
});
