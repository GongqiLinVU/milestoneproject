process.env.INTAKE_USAGE_PRICING_JSON=JSON.stringify({openai:{model:"gpt-5-mini",version:"test.v1",inputUsdPerMillion:1,outputUsdPerMillion:1}});
// Sprint 9 R05 (mock-boundary slice): focused boundary tests for the provider
// transport mock gate in api/session-intake-ai.ts.
//
// The gate must be POSITIVELY restricted to an explicit isolated-local test
// runtime, read ONLY from trusted server configuration, and must FAIL CLOSED
// (never a silent real provider call) when the flag is present but the runtime
// is not a trusted isolated-local one.
//
// Two layers are exercised:
//   (A) resolveMockGate() unit boundary over success/fail modes, production,
//       Preview, unset/unknown VERCEL_ENV, missing opt-in, and non-local
//       Supabase targets.
//   (B) handler-level fail-closed proof: a present-but-invalid mock config is
//       refused BEFORE any outbound fetch (no auth, no Supabase read, no
//       provider call), and a valid local-isolated success mock performs the
//       full turn with ZERO calls to api.openai.com.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler, { resolveMockGate } from '../../../.test-api/api/session-intake-ai.js';

const LOCAL = 'http://127.0.0.1:54321';
const base = (over = {}) => ({
  INTAKE_MOCK_PROVIDER: '1',
  INTAKE_MOCK_ALLOW: 'local-isolated',
  VERCEL_ENV: undefined,
  SUPABASE_URL: LOCAL,
  ...over,
});

// ---------------------------------------------------------------------------
// (A) resolveMockGate() boundary
// ---------------------------------------------------------------------------

test('flag absent => off (real provider path)', () => {
  assert.deepEqual(resolveMockGate(base({ INTAKE_MOCK_PROVIDER: undefined })), { mode: 'off' });
  assert.deepEqual(resolveMockGate(base({ INTAKE_MOCK_PROVIDER: '' })), { mode: 'off' });
  assert.deepEqual(resolveMockGate(base({ INTAKE_MOCK_PROVIDER: 'true' })), { mode: 'off' });
});

test('success mock authorized in isolated local runtime (unset VERCEL_ENV)', () => {
  assert.deepEqual(resolveMockGate(base()), { mode: 'success' });
});

test('success mock authorized when VERCEL_ENV=development', () => {
  assert.deepEqual(resolveMockGate(base({ VERCEL_ENV: 'development' })), { mode: 'success' });
});

test('fail mock authorized in isolated local runtime', () => {
  assert.deepEqual(resolveMockGate(base({ INTAKE_MOCK_PROVIDER: 'fail' })), { mode: 'fail' });
});

test('localhost target is accepted as a local Supabase target', () => {
  assert.deepEqual(resolveMockGate(base({ SUPABASE_URL: 'http://localhost:54321' })), { mode: 'success' });
});

test('falls back to VITE_SUPABASE_URL when SUPABASE_URL is unset', () => {
  assert.deepEqual(
    resolveMockGate(base({ SUPABASE_URL: undefined, VITE_SUPABASE_URL: LOCAL })),
    { mode: 'success' },
  );
});

test('production is refused even with the flag and opt-in set (fail closed)', () => {
  const g = resolveMockGate(base({ VERCEL_ENV: 'production' }));
  assert.equal(g.mode, 'invalid');
  assert.equal(g.reason, 'mock_forbidden_in_production');
});

test('Preview is refused even with the flag and opt-in set (fail closed)', () => {
  const g = resolveMockGate(base({ VERCEL_ENV: 'preview' }));
  assert.equal(g.mode, 'invalid');
  assert.equal(g.reason, 'mock_forbidden_in_preview');
});

test('an unknown VERCEL_ENV value is refused (positive allowlist)', () => {
  const g = resolveMockGate(base({ VERCEL_ENV: 'staging' }));
  assert.equal(g.mode, 'invalid');
  assert.equal(g.reason, 'mock_requires_development_or_unset_vercel_env');
});

test('missing local-isolated opt-in marker is refused', () => {
  assert.equal(resolveMockGate(base({ INTAKE_MOCK_ALLOW: undefined })).reason, 'mock_requires_local_isolated_opt_in');
  assert.equal(resolveMockGate(base({ INTAKE_MOCK_ALLOW: 'yes' })).reason, 'mock_requires_local_isolated_opt_in');
});

test('a non-local Supabase target is refused even with flag+opt-in (fail closed)', () => {
  const g = resolveMockGate(base({ SUPABASE_URL: 'https://realproject.supabase.co' }));
  assert.equal(g.mode, 'invalid');
  assert.equal(g.reason, 'mock_requires_local_supabase_target');
});

test('an unset Supabase target is refused', () => {
  const g = resolveMockGate(base({ SUPABASE_URL: undefined, VITE_SUPABASE_URL: undefined }));
  assert.equal(g.mode, 'invalid');
  assert.equal(g.reason, 'mock_requires_local_supabase_target');
});

test('a hostname that merely starts with localhost/127.0.0.1 but is a different host is refused', () => {
  // Guards against `http://localhost.evil.com` / `http://127.0.0.1.evil.com`.
  assert.equal(resolveMockGate(base({ SUPABASE_URL: 'http://localhost.evil.com' })).mode, 'invalid');
  assert.equal(resolveMockGate(base({ SUPABASE_URL: 'http://127.0.0.1.evil.com' })).mode, 'invalid');
});

test('https loopback (non-http scheme) is refused — the local stack is http', () => {
  assert.equal(resolveMockGate(base({ SUPABASE_URL: 'https://127.0.0.1:54321' })).mode, 'invalid');
});

// ---------------------------------------------------------------------------
// (B) handler-level fail-closed proof
// ---------------------------------------------------------------------------

const turns = [
  { actor: 'system', purpose: 'clarification', text: 'Question 0' },
  { actor: 'student', purpose: 'student response', text: 'Answer 0' },
];
const makeRes = () => ({ setHeader() {}, status(code) { this.code = code; return this; }, json(v) { this.body = v; return this; } });

function withEnv(over, fn) {
  const keys = ['INTAKE_MOCK_PROVIDER', 'INTAKE_MOCK_ALLOW', 'VERCEL_ENV', 'SUPABASE_URL', 'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY'];
  const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  for (const k of keys) delete process.env[k];
  Object.assign(process.env, over);
  return Promise.resolve(fn()).finally(() => {
    for (const k of keys) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  });
}

test('handler: a present-but-invalid mock config (Preview) is refused before ANY outbound fetch', async () => {
  await withEnv({
    INTAKE_MOCK_PROVIDER: '1', INTAKE_MOCK_ALLOW: 'local-isolated', VERCEL_ENV: 'preview',
    SUPABASE_URL: LOCAL, SUPABASE_SERVICE_ROLE_KEY: 'mock', OPENAI_API_KEY: 'mock',
  }, async () => {
    const original = globalThis.fetch; let calls = 0;
    globalThis.fetch = async () => { calls++; return new Response('{}', { status: 200 }); };
    const res = makeRes();
    try {
      await handler({ method: 'POST', headers: { authorization: 'Bearer mock' }, body: { mode: 'turn', sessionId: '00000000-0000-0000-0000-000000000000', answers: {}, conversation: turns } }, res);
    } finally { globalThis.fetch = original; }
    assert.equal(res.code, 503);
    assert.equal(res.body.code, 'mock_forbidden_in_preview');
    assert.equal(res.body.stage, 'provider_mock_gate');
    assert.equal(calls, 0, 'an invalid mock config must not make any outbound call');
  });
});

test('handler: an invalid mock config (non-local Supabase) is refused before any fetch', async () => {
  await withEnv({
    INTAKE_MOCK_PROVIDER: '1', INTAKE_MOCK_ALLOW: 'local-isolated', VERCEL_ENV: 'development',
    SUPABASE_URL: 'https://realproject.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'mock', OPENAI_API_KEY: 'mock',
  }, async () => {
    const original = globalThis.fetch; let calls = 0;
    globalThis.fetch = async () => { calls++; return new Response('{}', { status: 200 }); };
    const res = makeRes();
    try {
      await handler({ method: 'POST', headers: { authorization: 'Bearer mock' }, body: { mode: 'turn', sessionId: '00000000-0000-0000-0000-000000000000', answers: {}, conversation: turns } }, res);
    } finally { globalThis.fetch = original; }
    assert.equal(res.code, 503);
    assert.equal(res.body.code, 'mock_requires_local_supabase_target');
    assert.equal(calls, 0, 'a non-local target must not make any outbound call');
  });
});

test('handler: a valid local-isolated success mock completes the turn with ZERO openai calls', async () => {
  await withEnv({
    INTAKE_MOCK_PROVIDER: '1', INTAKE_MOCK_ALLOW: 'local-isolated', VERCEL_ENV: 'development',
    SUPABASE_URL: LOCAL, SUPABASE_SERVICE_ROLE_KEY: 'mock', OPENAI_API_KEY: 'mock',
  }, async () => {
    const original = globalThis.fetch; let providerCalls = 0;
    globalThis.fetch = async (url) => {
      const path = String(url);
      if (path.includes('openai.com') || path.includes('deepseek.com')) { providerCalls++; return new Response('{}', { status: 500 }); }
      let value = {};
      if (path.includes('/auth/')) value = { id: 'mock-user' };
      else if (path.includes('student_accounts')) value = { student_id: 'mock-student' };
      else if (path.includes('teaching_blocks')) value = { block_code: '2B2', academic_year: 2026, intake_mode: 'ai' };
      else if ((path.includes('student_session_intakes')||path.includes('student_session_work_tracks'))) value = null;
      else if (path.includes('student_roster')) value = { id: 'mock-roster' };
      else if (path.includes('studio_sessions')) value = path.includes('session_number=lt.') ? [] : { id: 'session', block_id: 'block', session_number: 3, curriculum_focus: 'Progress', intake_access: 'open' };
      return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } });
    };
    const res = makeRes();
    try {
      await handler({ method: 'POST', headers: { authorization: 'Bearer mock' }, body: { mode: 'turn', sessionId: '00000000-0000-0000-0000-000000000000', answers: {}, conversation: turns } }, res);
    } finally { globalThis.fetch = original; }
    assert.equal(res.code, 200);
    // The decision layer may route to review or to one more question depending on
    // the transcript; the safety-relevant invariant is that the canned mock turn
    // was consumed WITHOUT any real provider call.
    assert.ok(res.body.result, 'the success mock produced a turn result');
    assert.equal(providerCalls, 0, 'the success mock must not touch a real provider');
  });
});

test('handler: a fail mock exercises the deterministic fallback with ZERO openai calls', async () => {
  await withEnv({
    INTAKE_MOCK_PROVIDER: 'fail', INTAKE_MOCK_ALLOW: 'local-isolated', VERCEL_ENV: 'development',
    SUPABASE_URL: LOCAL, SUPABASE_SERVICE_ROLE_KEY: 'mock', OPENAI_API_KEY: 'mock',
  }, async () => {
    const original = globalThis.fetch; let providerCalls = 0;
    globalThis.fetch = async (url) => {
      const path = String(url);
      if (path.includes('openai.com') || path.includes('deepseek.com')) { providerCalls++; return new Response('{}', { status: 500 }); }
      let value = {};
      if (path.includes('/auth/')) value = { id: 'mock-user' };
      else if (path.includes('student_accounts')) value = { student_id: 'mock-student' };
      else if (path.includes('teaching_blocks')) value = { block_code: '2B2', academic_year: 2026, intake_mode: 'ai' };
      else if ((path.includes('student_session_intakes')||path.includes('student_session_work_tracks'))) value = null;
      else if (path.includes('student_roster')) value = { id: 'mock-roster' };
      else if (path.includes('studio_sessions')) value = path.includes('session_number=lt.') ? [] : { id: 'session', block_id: 'block', session_number: 3, curriculum_focus: 'Progress', intake_access: 'open' };
      return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } });
    };
    const res = makeRes();
    try {
      await handler({ method: 'POST', headers: { authorization: 'Bearer mock' }, body: { mode: 'turn', sessionId: '00000000-0000-0000-0000-000000000000', answers: {}, conversation: turns } }, res);
    } finally { globalThis.fetch = original; }
    assert.equal(res.code, 200);
    assert.equal(res.body.result.route, 'provider_fallback_continue');
    assert.equal(res.body.providerFailure, 'provider_http_503');
    assert.equal(res.body.extractionPending, true);
    assert.equal(providerCalls, 0, 'the fail mock must not touch a real provider either');
  });
});
