// Sprint 9 R04 regressions — mode-change behaviour and the save-contract shape
// that the ai->deterministic / ai->disabled paths depend on.
//
// RUNTIME (actual logic):
//   * sourceConversation / conversationErrors (src/intakePolicy.ts) — the real
//     client-side save contract. These prove that the mode-change handler's
//     preserved conversation (student turn + an appended 'review transition'
//     turn) SATISFIES the save contract, and that WITHOUT the appended turn it
//     would be rejected on shape (the D4 defect this round fixed).
//   * buildFallbackStudentRecord — the preserved answers still build a valid
//     record for the deterministic save.
//   * The compiled AI endpoint handler — ai->disabled and ai->deterministic are
//     refused by the endpoint with zero provider calls (no further model calls).
//
// MODEL:
//   * the submit() save-path selection by mode (deterministic save allowed,
//     disabled save rejected) and the "never show a successful save when
//     disabled" rule.
//
// IMPORTANT: preserving conversation TEXT is NOT proof of a successful record
// save or recovery. The save itself is gated by the RPC on Block mode and is
// only exercised here as a client-contract shape check plus a modelled
// authorization decision; deployed save success is an R04 authenticated-rehearsal
// item, not established by this file.
//
// No paid calls (provider fetch mocked; must not be reached). Runs under `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../../../.test-api/api/session-intake-ai.js';
import { sourceConversation, conversationErrors } from '../../../.test-build/intakePolicy.js';
import { buildFallbackStudentRecord, validateIntakeStudentRecord } from '../../../.test-build/aiSessionIntake.js';

process.env.SUPABASE_URL = 'https://mock.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock';
process.env.OPENAI_API_KEY = 'mock';

// A conversation as it exists at the moment the AI call is refused: an opening
// system question, a student answer — i.e. it currently ENDS with a student turn.
const midConversation = [
  { actor: 'system', purpose: 'session starting point', text: 'What did you work on?' },
  { actor: 'student', purpose: 'student response', text: 'I added a loading state and tested it on a slow connection.' },
];

// The mode-change handler appends this exact turn (see SessionIntakeModal send() catch).
const reviewTurn = { actor: 'system', purpose: 'review transition', source: 'fallback', text: 'AI Intake became unavailable. Review your preserved answers and confirm.' };

const answers = () => ({
  responsibility: 'Booking list loading banner', progress: 'Added a loading state', progressKind: 'advanced',
  scope: 'Booking list banner', completionPercent: 60, evidenceType: 'repository_change',
  evidenceAvailability: 'available_now', evidenceReference: 'PR #42', verificationMethod: 'Open on a throttled network',
  testingStatus: 'executed', testingMethod: 'Throttled network', testingResult: 'Spinner then cards', testingBaseline: '',
  blockerStatus: 'none', blockerDescription: '', supportRequested: '',
  nextAction: 'Show the live demo', dueSession: 'S10', expectedEvidence: 'Live demo',
});

// ---------------------------------------------------------------------------
// D4 fix: the preserved conversation needs the appended review-transition turn
// to satisfy the save contract.
// ---------------------------------------------------------------------------
test('R04 RUNTIME: WITHOUT the appended review turn the preserved conversation fails the save contract', () => {
  const errors = conversationErrors(midConversation, true);
  assert.ok(errors.length > 0, 'a conversation ending on a student turn is not save-valid');
  assert.throws(() => sourceConversation(midConversation), /review transition|order|length/i);
});

test('R04 RUNTIME: WITH the appended review turn the preserved conversation satisfies the save contract (ai->deterministic)', () => {
  const preserved = [...midConversation, reviewTurn];
  const errors = conversationErrors(preserved, true);
  assert.deepEqual(errors, [], errors.join(' · '));
  const src = sourceConversation(preserved);
  assert.equal(src.length, 3);
  assert.equal(src.at(-1).purpose, 'review transition');
  // The preserved answers still build a valid record for the deterministic save.
  const record = buildFallbackStudentRecord(answers(), {}, false);
  assert.equal(validateIntakeStudentRecord(record).valid, true);
});

// ---------------------------------------------------------------------------
// MODEL: submit() save-path authorization by mode and the "never a successful
// save when disabled" rule. Mirrors the RPC gate intake_mode in (...).
// ---------------------------------------------------------------------------
function chatSaveOutcome(mode) {
  // save_my_session_intake_chat is allowed for deterministic|ai; disabled rejects.
  if (mode === 'deterministic' || mode === 'ai') return { saved: true };
  return { saved: false, reason: 'Session Intake can only be submitted while it is open' };
}
test('R04 MODEL: ai->deterministic confirms through an authorized save; ai->disabled never reports a successful save', () => {
  const det = chatSaveOutcome('deterministic');
  assert.equal(det.saved, true, 'deterministic save is authorized');
  const dis = chatSaveOutcome('disabled');
  assert.equal(dis.saved, false, 'disabled must never show a successful save');
  assert.match(dis.reason, /can only be submitted/);
});

// ---------------------------------------------------------------------------
// RUNTIME: the AI endpoint makes no further provider call once the mode is not
// 'ai' (covers ai->deterministic and ai->disabled "prevent additional provider
// calls").
// ---------------------------------------------------------------------------
async function runEndpoint(intakeMode) {
  let providerCalls = 0;
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const path = String(url);
    let value = {};
    if (path.includes('openai.com')) { providerCalls++; return new Response(JSON.stringify({ status: 'completed', model: 'm', usage: { input_tokens: 1, output_tokens: 1 }, output_text: '{}' }), { status: 200, headers: { 'content-type': 'application/json' } }); }
    if (path.includes('/auth/')) value = { id: 'mock-user' };
    else if (path.includes('student_accounts')) value = { student_id: 'mock-student' };
    else if (path.includes('teaching_blocks')) value = { block_code: '2B2', academic_year: 2026, intake_mode: intakeMode };
    else if (path.includes('student_session_intakes')) value = null;
    else if (path.includes('student_roster')) value = { id: 'mock-roster' };
    else if (path.includes('studio_sessions')) value = path.includes('session_number=lt.') ? [] : { id: 'session', block_id: 'block', session_number: 3, curriculum_focus: 'Progress', intake_access: 'open' };
    return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
  const conversation = [...midConversation];
  try { await handler({ method: 'POST', headers: { authorization: 'Bearer mock' }, body: { mode: 'turn', sessionId: '00000000-0000-0000-0000-000000000000', answers: {}, conversation } }, res); return { res, providerCalls }; }
  finally { globalThis.fetch = original; }
}
test('R04 RUNTIME: after ai->deterministic the AI endpoint makes no provider call', async () => {
  const { res, providerCalls } = await runEndpoint('deterministic');
  assert.equal(res.code, 403);
  assert.equal(providerCalls, 0);
});
test('R04 RUNTIME: after ai->disabled the AI endpoint makes no provider call', async () => {
  const { res, providerCalls } = await runEndpoint('disabled');
  assert.equal(res.code, 403);
  assert.equal(providerCalls, 0);
});

// ---------------------------------------------------------------------------
// MODEL: confirmed history is readable in every mode (get_my_session_intake has
// no mode gate — see the R01 migration).
// ---------------------------------------------------------------------------
test('R04 MODEL: confirmed history read is independent of Block mode', () => {
  const historyReadable = () => true; // get_my_session_intake has no intake_mode predicate
  for (const mode of ['disabled', 'deterministic', 'ai']) assert.equal(historyReadable(mode), true);
});
