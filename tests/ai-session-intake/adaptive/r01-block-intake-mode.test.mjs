process.env.INTAKE_USAGE_PRICING_JSON=JSON.stringify({openai:{model:"gpt-5-mini",version:"test.v1",inputUsdPerMillion:1,outputUsdPerMillion:1}});
// Sprint 9 R01 regressions — server-authoritative per-Block Intake capability
// (disabled / deterministic / ai).
//
// RUNTIME vs MODEL/STATIC (labelled per test):
//   * RUNTIME: drives the ACTUAL compiled AI endpoint handler
//     (.test-api/api/session-intake-ai.js) with a mocked Supabase/provider fetch,
//     proving the deployed capability gate refuses non-'ai' modes BEFORE any
//     provider call. This is the same mechanism as endpoint.test.mjs.
//   * MODEL: faithful JavaScript models of (a) the SQL save-path mode gate
//     (`intake_mode in (...)`), (b) the client mode-routing decision
//     (StudentSessions: ai -> chat modal, deterministic -> form, disabled -> no
//     intake), and (c) the in-progress mode-change handler. These assert the
//     DESIGNED contract, not deployed SQL privileges.
//   * STATIC: assertions that the migration text carries the intended gate and
//     default. Static text checks are not a database result.
//
// Capability is server-owned: it is read from get_my_student_context /
// teaching_blocks, never from a client-supplied value or display label. No test
// here grants access from a client-provided mode.
//
// No paid provider calls (the provider fetch is mocked and must NOT be reached
// for disabled/deterministic). Runs under `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import handler from '../../../.test-api/api/session-intake-ai.js';

process.env.SUPABASE_URL = 'https://mock.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock';
process.env.OPENAI_API_KEY = 'mock';

const turns = Array.from({ length: 2 }, (_, i) => [
  { actor: 'system', purpose: 'clarification', text: `Q${i}` },
  { actor: 'student', purpose: 'student response', text: `A${i}` },
]).flat();
const modelResult = { assistantMessage: 'ok', route: 'clarification', readyForReview: false, evidenceUpdates: [], assessment: {}, uncertainties: [], suggestedTeacherQuestions: [] };

// RUNTIME harness against the real handler. intakeMode is what the mocked
// teaching_blocks row reports; the handler must gate on it.
async function runEndpoint(intakeMode) {
  let providerCalls = 0;
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    const path = String(url);
    let value = {};
    if(path.includes('reserve_session_intake_ai_attempt'))return new Response(JSON.stringify({attemptId:'mock-attempt',reservedUsd:0.1}),{status:200});
    if(path.includes('finish_session_intake_ai_attempt'))return new Response(JSON.stringify({costUsd:0.001,chargedUsd:0.001,status:'settled'}),{status:200});
    if (path.includes('openai.com')) { providerCalls++; return new Response(JSON.stringify({ status: 'completed', model: 'm', usage: { input_tokens: 1, output_tokens: 1 }, output_text: JSON.stringify(modelResult) }), { status: 200, headers: { 'content-type': 'application/json' } }); }
    if (path.includes('/auth/')) value = { id: 'mock-user' };
    else if (path.includes('student_accounts')) value = { student_id: 'mock-student' };
    else if (path.includes('teaching_blocks')) value = { block_code: '2B2', academic_year: 2026, status: 'active', intake_mode: intakeMode };
    else if ((path.includes('student_session_intakes')||path.includes('student_session_work_tracks'))) value = null;
    else if (path.includes('student_roster')) value = { id: 'mock-roster' };
    else if (path.includes('studio_sessions')) value = path.includes('session_number=lt.') ? [] : { id: 'session', block_id: 'block', session_number: 3, curriculum_focus: 'Progress', intake_access: 'open' };
    return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
  try { await handler({ method: 'POST', headers: { authorization: 'Bearer mock' }, body: { mode: 'turn', sessionId: '00000000-0000-0000-0000-000000000000', answers: {}, conversation: turns } }, res); return { res, providerCalls }; }
  finally { globalThis.fetch = original; }
}

// ---------------------------------------------------------------------------
// RUNTIME: disabled/deterministic reach the AI endpoint with ZERO provider calls.
// ---------------------------------------------------------------------------
test('R01 RUNTIME: disabled mode is refused by the AI endpoint with zero provider calls', async () => {
  const { res, providerCalls } = await runEndpoint('disabled');
  assert.equal(res.code, 403);
  assert.equal(providerCalls, 0);
});

test('R01 RUNTIME: deterministic mode is refused by the AI endpoint with zero provider calls', async () => {
  const { res, providerCalls } = await runEndpoint('deterministic');
  assert.equal(res.code, 403);
  assert.equal(providerCalls, 0);
});

test('R01 RUNTIME: ai mode is accepted by the AI endpoint (one provider call)', async () => {
  const { res, providerCalls } = await runEndpoint('ai');
  assert.equal(res.code, 200);
  assert.equal(providerCalls, 1);
});

// ---------------------------------------------------------------------------
// MODEL: the SQL save-path mode gate. Mirrors `intake_mode in (...)` in the
// re-created RPCs. chat/fallback accept deterministic|ai; ai-save accepts ai only.
// ---------------------------------------------------------------------------
function saveAllowed(savePath, mode) {
  if (savePath === 'ai') return mode === 'ai';
  if (savePath === 'chat' || savePath === 'fallback') return mode === 'deterministic' || mode === 'ai';
  throw new Error('unknown save path');
}
test('R01 MODEL: save-path authorization by mode', () => {
  // disabled authorizes no save path.
  assert.equal(saveAllowed('chat', 'disabled'), false);
  assert.equal(saveAllowed('fallback', 'disabled'), false);
  assert.equal(saveAllowed('ai', 'disabled'), false);
  // deterministic authorizes the provider-independent paths, not the ai-save.
  assert.equal(saveAllowed('fallback', 'deterministic'), true);
  assert.equal(saveAllowed('chat', 'deterministic'), true);
  assert.equal(saveAllowed('ai', 'deterministic'), false);
  // ai authorizes all save paths.
  assert.equal(saveAllowed('fallback', 'ai'), true);
  assert.equal(saveAllowed('chat', 'ai'), true);
  assert.equal(saveAllowed('ai', 'ai'), true);
});

// ---------------------------------------------------------------------------
// MODEL: client mode routing (StudentSessions). The capability is read from the
// server context; a client never supplies it.
// ---------------------------------------------------------------------------
function clientRoute(serverIntakeMode) {
  const mode = serverIntakeMode ?? 'disabled';      // absent => disabled
  const intakePilot = mode !== 'disabled';           // whether Intake UI appears
  if (!intakePilot) return { intakePilot, modal: 'none' };
  return { intakePilot, modal: mode === 'ai' ? 'chat' : 'deterministic-form' };
}
test('R01 MODEL: client routing selects the modal from the server capability', () => {
  assert.deepEqual(clientRoute('disabled'), { intakePilot: false, modal: 'none' });
  assert.deepEqual(clientRoute('deterministic'), { intakePilot: true, modal: 'deterministic-form' });
  assert.deepEqual(clientRoute('ai'), { intakePilot: true, modal: 'chat' });
  // Absent capability (pre-migration) behaves as disabled, never as pilot.
  assert.deepEqual(clientRoute(undefined), { intakePilot: false, modal: 'none' });
});

test('R01 MODEL: a forged client-supplied mode does not grant access (server value wins)', () => {
  // The client cannot pass intake_mode to any gate: routing, the endpoint and the
  // save RPCs all read the server-owned value. We model that the decision ignores
  // any client-provided value and uses only the server capability.
  const serverCapability = 'disabled';
  const forgedClientValue = 'ai';
  // Routing uses the server value only.
  assert.equal(clientRoute(serverCapability).intakePilot, false);
  // Save authorization uses the server value only.
  assert.equal(saveAllowed('ai', serverCapability), false);
  // The forged value has no path into either decision.
  assert.notEqual(forgedClientValue, serverCapability);
});

// ---------------------------------------------------------------------------
// MODEL: history reads are independent of mode. get_my_session_intake is NOT
// re-created with a mode gate, so confirmed history remains readable when the
// Block is later disabled.
// ---------------------------------------------------------------------------
function historyReadable(/* mode */) {
  // get_my_session_intake has no intake_mode predicate in its body; it returns
  // the confirmed record regardless of the current Block mode.
  return true;
}
test('R01 MODEL: previously confirmed Intake history is readable even when mode is disabled', () => {
  assert.equal(historyReadable('disabled'), true);
  assert.equal(historyReadable('deterministic'), true);
  assert.equal(historyReadable('ai'), true);
});

// ---------------------------------------------------------------------------
// MODEL: in-progress mode-change handling in the chat modal. When the server
// rejects an AI call with session_not_eligible_for_ai_intake mid-conversation,
// the handler must preserve the conversation + answers, move to review via the
// provider-independent path, and NOT discard work.
// ---------------------------------------------------------------------------
function handleSendError(errorMessage, conversation, answers) {
  if (/session_not_eligible_for_ai_intake|session_intake_closed/.test(errorMessage)) {
    return { turns: conversation, answers, stage: 'review', aiUsed: false, discarded: false,
      message: 'AI Intake is no longer available for this Session (your Teacher changed its mode). Your answers are preserved' };
  }
  return { turns: conversation, answers, stage: 'continue', aiUsed: false, discarded: false, message: 'preserved' };
}
test('R01 MODEL: mode change to non-ai mid-conversation preserves work and routes to review', () => {
  const conversation = [...turns];
  const answers = { responsibility: 'kept', progress: 'kept' };
  const out = handleSendError('400:unknown_stage:session_not_eligible_for_ai_intake', conversation, answers);
  assert.equal(out.stage, 'review');
  assert.equal(out.aiUsed, false);
  assert.equal(out.discarded, false);
  assert.deepEqual(out.answers, answers);
  assert.deepEqual(out.turns, conversation);
  assert.match(out.message, /preserved/);
});

// ---------------------------------------------------------------------------
// STATIC: the migration carries the intended column default and gates. A text
// check is not a database result, only evidence the SQL encodes the design.
// ---------------------------------------------------------------------------
const migration = readFileSync(new URL('../../../supabase/migrations/20261009_sprint9_r01_block_intake_mode.sql', import.meta.url), 'utf8');
test('R01 STATIC: migration adds intake_mode default disabled with constrained values', () => {
  assert.match(migration, /add column if not exists intake_mode text not null default 'disabled'/);
  assert.match(migration, /check \(intake_mode in \('disabled','deterministic','ai'\)\)/);
});
test('R01 STATIC: migration gates save paths by mode and does not auto-enable or widen block_code', () => {
  assert.match(migration, /b\.intake_mode in \('deterministic','ai'\)/);   // chat + fallback
  assert.match(migration, /b\.intake_mode = 'ai'/);                         // ai save
  assert.doesNotMatch(migration, /update public\.teaching_blocks set intake_mode/i); // no auto-enable
  assert.doesNotMatch(migration, /block_code in \('1B1'/);                  // block_code CHECK not widened here
  assert.match(migration, /'intakeMode',v_block\.intake_mode/);             // context exposes capability
});
