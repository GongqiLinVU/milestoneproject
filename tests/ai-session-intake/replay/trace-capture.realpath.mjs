// Real-path gated trace capture (B3 live-readiness part 1), validated OFFLINE by
// stubbing the provider fetch. Drives the REAL compiled endpoint handler
// (api/session-intake-ai.ts) with REAL local Supabase auth + context resolution
// (not paid), while global.fetch is stubbed so the PROVIDER call returns a mock
// body for both 'openai' (Responses shape) and 'deepseek' (Chat Completions shape).
// This exercises the real transport switch, extractOutput, decideTurn, validation,
// routing and the gated debugTrace — with ZERO paid calls.
//
// Build endpoint + modules first:
//   npx tsc --outDir .test-api --target ES2022 --module nodenext --moduleResolution nodenext --skipLibCheck api/session-intake-ai.ts
// Then: node tests/ai-session-intake/replay/trace-capture.realpath.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { getStudentToken } from './live-auth.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');

// Load local env (SUPABASE_URL / SERVICE_ROLE / OPENAI_API_KEY) so the endpoint's
// authenticatedStudent/resolvePreviousRecord work against the local stack.
const status = JSON.parse(execSync('supabase status -o json', { encoding: 'utf8' }));
process.env.SUPABASE_URL = status.API_URL;
process.env.VITE_SUPABASE_URL = status.API_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = status.SERVICE_ROLE_KEY;
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'local-stub-not-used'; // real call is stubbed
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'local-stub-not-used';
process.env.INTAKE_DEBUG_TOKEN = 'local-benchmark-debug'; // gate token for trace

const handlerMod = await import(resolve(repoRoot, '.test-api/api/session-intake-ai.js'));
const handler = handlerMod.default;

const token = await getStudentToken();
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: roster } = await admin.from('student_roster').select('block_id').eq('student_id', 't1bench01').maybeSingle();
const { data: sess } = await admin.from('studio_sessions').select('id,session_number').eq('block_id', roster.block_id).in('session_number', [1]).maybeSingle();
const sessionId = sess.id;
await admin.from('student_session_intakes').delete().eq('student_id', 't1bench01'); // keep S1 unconfirmed

// --- Mock provider bodies (NO network). ---
const candidate = { assistantMessage: 'Noted — booking UI design, no UI built. What is one next step before the next Session?', route: 'clarification', readyForReview: false, assessment: { information: 'focused', evidenceReadiness: 'missing', verificationReadiness: 'unclear', testingMaturity: 'unknown', actionability: 'needs_small_step', gap: 'next step', reason: 'design only', sourceTurns: [1] }, evidenceUpdates: [{ field: 'claim', value: 'Drawing the booking flow; no UI built', state: 'student_claim', sourceTurn: 1, evidenceType: null, progressKind: 'advanced', method: null, observedResult: null, expectedEvidence: null }], uncertainties: [], suggestedTeacherQuestions: [] };
const candidateText = JSON.stringify(candidate);
function mockFetch(provider, realFetch) {
  return async (url, opts) => {
    const u = String(url);
    // Only intercept the PROVIDER call; everything else (Supabase auth/REST) is real.
    if (u.includes('api.openai.com') || u.includes('deepseek.com')) {
      if (u.includes('deepseek.com')) {
        return { ok: true, status: 200, headers: { get: () => 'mock-ds-req' }, json: async () => ({ id: 'ds1', model: 'deepseek-flash', choices: [{ message: { content: candidateText }, finish_reason: 'stop' }], usage: { prompt_tokens: 1500, completion_tokens: 1200 } }) };
      }
      return { ok: true, status: 200, headers: { get: () => 'mock-oa-req' }, json: async () => ({ id: 'oa1', model: 'gpt-5-mini', status: 'completed', output_text: candidateText, usage: { input_tokens: 1600, output_tokens: 1400 } }) };
    }
    return realFetch(url, opts);
  };
}

function makeRes() {
  const r = { statusCode: 0, body: null, headers: {} };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = c => { r.statusCode = c; return r; };
  r.json = b => { r.body = b; return r; };
  return r;
}

const conversation = [
  { actor: 'system', purpose: 'session starting point', text: 'This is S1. What did you work on?' },
  { actor: 'student', purpose: 'student response', text: 'I own the booking UI; drawing the flow, no UI built yet. booking-flow-v1.pdf has the design.' },
];
const reqBase = { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: { mode: 'turn', sessionId, conversation, answers: {}, capturedFields: [] } };

const out = {};
for (const provider of ['openai', 'deepseek']) {
  const origFetch = globalThis.fetch;
  globalThis.fetch = mockFetch(provider, origFetch);
  try {
    const req = { ...reqBase, headers: { ...reqBase.headers, 'x-intake-debug-token': 'local-benchmark-debug', 'x-intake-provider': provider, 'x-intake-debug': '1' } };
    const res = makeRes();
    await handler(req, res);
    out[provider] = { httpStatus: res.statusCode, provider: res.body?.provider, usage: res.body?.usage, model: res.body?.model, route: res.body?.result?.route, acceptedEvidence: res.body?.result?.evidenceUpdates, fieldDecisions: res.body?.fieldDecisions, debugTrace: res.body?.debugTrace };
  } finally { globalThis.fetch = origFetch; }
}

// Validate stage presence + parity on the REAL path.
const stages = ['providerInputPayload', 'attempts', 'rawProviderBody', 'originalOutputText', 'recordBefore', 'recordAfter'];
const oaT = out.openai.debugTrace, dsT = out.deepseek.debugTrace;
const stagesOk = oaT && dsT && stages.every(s => s in oaT) && stages.every(s => s in dsT);
// parity: same shared instructions + same input content + identical accepted evidence from identical candidate
const sameInstr = oaT.providerInputPayload.instructions === dsT.providerInputPayload.instructions;
const sameAccepted = JSON.stringify(out.openai.acceptedEvidence) === JSON.stringify(out.deepseek.acceptedEvidence);

const sample = {
  schema: 'intake-realpath-trace.v1',
  mode: 'REAL endpoint handler path; provider fetch STUBBED (no paid calls)',
  parity: { sameSharedInstructions: sameInstr, sameParsedCandidateAccepted: sameAccepted, note: 'Both providers run the SAME instructions/context/decideTurn/validation/routing; only transport differs.' },
  transportDifferences: { openai: oaT.providerInputPayload.transport, deepseek: dsT.providerInputPayload.transport },
  openai: out.openai,
  deepseek: out.deepseek,
  stagesPresent: stages,
};
mkdirSync(resolve(here, 'out'), { recursive: true });
const outPath = resolve(here, 'out', 'realpath-trace-sample.mock.json');
writeFileSync(outPath, JSON.stringify(sample, null, 2) + '\n');
await admin.from('student_session_intakes').delete().eq('student_id', 't1bench01');

console.log('[realpath] stagesOk:', stagesOk, '| sameInstructions:', sameInstr, '| sameAcceptedEvidence:', sameAccepted);
console.log('[realpath] openai usage:', JSON.stringify(out.openai.usage), '| deepseek usage:', JSON.stringify(out.deepseek.usage));
console.log('[realpath] wrote', outPath);
process.exit(stagesOk && sameInstr && sameAccepted ? 0 : 1);
