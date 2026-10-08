// Complete processing-trace capture, validated with OFFLINE MOCK provider
// responses (B3 part 3). No endpoint change, no paid calls, no reconstruction of
// historical responses. Proves every stage survives export.
//
// IMPORTANT provenance note:
//   In api/session-intake-ai.ts, `rawCandidate` (line ~304) = JSON.parse(outputText(provider))
//   i.e. the PARSED candidate object, NOT the raw provider HTTP body. The genuine
//   raw provider response is `provider` (await response.json()) and its output_text.
//   This harness captures BOTH, with correct labels, from the mock provider.
//
//   node tests/ai-session-intake/replay/trace-capture.mock.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const harness = await import(resolve(repoRoot, '.test-build/intakeHarness.js'));
const policy = await import(resolve(repoRoot, '.test-build/intakePolicy.js'));
const { decideTurn } = harness;
const { questionCount, MAX_INTAKE_QUESTIONS } = policy;
const MODEL_IN = 0.25 / 1e6, MODEL_OUT = 2.00 / 1e6;
const MAX_IN_PER_ATTEMPT = 21000, MAX_OUT_PER_ATTEMPT = 4000;
const MAX_COST_PER_ATTEMPT = MAX_IN_PER_ATTEMPT * MODEL_IN + MAX_OUT_PER_ATTEMPT * MODEL_OUT;

function emptyAnswers() { return { responsibility: '', progress: '', progressKind: 'no_progress', scope: '', completionPercent: null, evidenceType: 'other', evidenceAvailability: 'unknown', evidenceReference: '', verificationMethod: '', testingStatus: 'unknown', testingMethod: '', testingResult: '', testingBaseline: '', blockerStatus: 'none', blockerDescription: '', supportRequested: '', nextAction: '', dueSession: '', expectedEvidence: '' }; }

// --- MOCK provider: simulates OpenAI Responses API objects, incl. a retry and an
// incomplete case, so every captured stage is exercised offline. ---
function mockProvider(scenario) {
  // returns { attempts: [{ok, status, rawBody, outputText, usage}], finalParsed }
  if (scenario === 'success') {
    const parsed = { assistantMessage: 'Noted — booking UI design, no UI built yet. What is one next step before the next Session?', route: 'clarification',
      evidenceUpdates: [{ field: 'claim', value: 'Drawing the booking flow; no UI built', state: 'student_claim', sourceTurn: 1, evidenceType: null, progressKind: 'advanced', method: null, observedResult: null, expectedEvidence: null }],
      assessment: { information: 'focused', evidenceReadiness: 'missing', verificationReadiness: 'unclear', testingMaturity: 'unknown', actionability: 'needs_small_step', gap: 'next step', reason: 'design only', sourceTurns: [1] }, uncertainties: [], suggestedTeacherQuestions: [] };
    const outputText = JSON.stringify(parsed);
    return { attempts: [{ attempt: 0, ok: true, httpStatus: 200, providerStatus: 'completed', rawBody: { id: 'resp_mock_1', model: 'gpt-5-mini', status: 'completed', output_text: outputText, usage: { input_tokens: 1600, output_tokens: 1400 } }, outputText, usage: { input_tokens: 1600, output_tokens: 1400 } }], finalParsed: parsed };
  }
  if (scenario === 'retry_then_success') {
    const parsed = { assistantMessage: 'Got it. What evidence could the Teacher review?', route: 'clarification', evidenceUpdates: [], assessment: { information: 'sparse', evidenceReadiness: 'missing', verificationReadiness: 'unknown', testingMaturity: 'unknown', actionability: 'unknown', gap: 'evidence', reason: 'none yet', sourceTurns: [1] }, uncertainties: [], suggestedTeacherQuestions: [] };
    const outputText = JSON.stringify(parsed);
    return { attempts: [
      { attempt: 0, ok: false, httpStatus: 500, providerStatus: null, rawBody: { error: { type: 'server_error', message: 'transient' } }, outputText: null, usage: null },
      { attempt: 1, ok: true, httpStatus: 200, providerStatus: 'completed', rawBody: { id: 'resp_mock_2', model: 'gpt-5-mini', status: 'completed', output_text: outputText, usage: { input_tokens: 1700, output_tokens: 1500 } }, outputText, usage: { input_tokens: 1700, output_tokens: 1500 } },
    ], finalParsed: parsed };
  }
  // incomplete (reasoning-token style): a 200 with status incomplete -> endpoint throws provider_incomplete -> fallback
  const rawBody = { id: 'resp_mock_3', model: 'gpt-5-mini', status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output_text: '', usage: { input_tokens: 1800, output_tokens: 4000 } };
  return { attempts: [{ attempt: 0, ok: true, httpStatus: 200, providerStatus: 'incomplete', rawBody, outputText: '', usage: rawBody.usage }], finalParsed: null, incomplete: true };
}

// --- Capture one turn with full staging ---
const cost = { knownUsd: 0, unknownUsd: 0, unreportedRetryReserveUsd: 0, calls: 0, callsWithUsage: 0, callsMissingUsage: 0 };
function chargeUsage(attempts) {
  cost.calls++;
  // Final-attempt usage is what the endpoint would report; prior attempts' usage is "unreported" to the endpoint.
  const finalOk = attempts.find(a => a.ok);
  if (finalOk && finalOk.usage) { cost.callsWithUsage++; cost.knownUsd += finalOk.usage.input_tokens * MODEL_IN + finalOk.usage.output_tokens * MODEL_OUT; cost.unknownUsd += MAX_COST_PER_ATTEMPT; cost.unreportedRetryReserveUsd += MAX_COST_PER_ATTEMPT; }
  else { cost.callsMissingUsage++; cost.unknownUsd += 2 * MAX_COST_PER_ATTEMPT; }
}

function captureTurn(providerInput, conversation, answersBefore, scenario) {
  const mock = mockProvider(scenario);
  chargeUsage(mock.attempts);
  // Parsed candidate = JSON.parse(outputText) of the final OK attempt (this is what
  // api/session-intake-ai.ts calls `rawCandidate`). Mark provenance clearly.
  const finalOk = mock.attempts.find(a => a.ok && a.outputText);
  const parsedCandidate = mock.incomplete ? null : (finalOk ? JSON.parse(finalOk.outputText) : null);
  let decision = null, answersAfter = answersBefore, acceptedRejected = [];
  if (parsedCandidate) {
    decision = decideTurn(parsedCandidate, conversation, answersBefore);
    answersAfter = decision.answers;
    acceptedRejected = decision.decisions.map(d => ({ field: d.field, outcome: d.outcome, reason: d.reason, candidateValue: (d.candidate && d.candidate.value) || null, sourceTurn: d.sourceTurn ?? d.originalSourceTurn }));
  }
  return {
    providerInputPayload_DRIVER_SIDE: providerInput,   // CAPTURED (driver builds this)
    providerAttempts: mock.attempts.map(a => ({ attempt: a.attempt, ok: a.ok, httpStatus: a.httpStatus, providerStatus: a.providerStatus, usage: a.usage, rawProviderBody: a.rawBody, originalOutputText: a.outputText })), // CAPTURED (mock raw body + output_text)
    incompleteDetails: mock.incomplete ? mock.attempts[0].rawBody.incomplete_details : null,
    parsedCandidate_aka_endpoint_rawCandidate: parsedCandidate,  // LABEL: parsed, not raw body
    acceptedRejectedCandidates: acceptedRejected,       // CAPTURED each with value + reason
    route: decision ? decision.route : 'provider_fallback_continue',
    routeDecision: decision ? decision.routeDecision : { reason: 'provider_incomplete_fallback' },
    recordBefore: answersBefore,                        // CAPTURED record state before update
    recordAfter: answersAfter,                          // CAPTURED record state after update
    extractionPending: decision ? decision.extractionPending : true,
  };
}

// --- Drive a short 2-turn session exercising success + retry + incomplete ---
let answers = emptyAnswers();
const conversation = [{ actor: 'system', purpose: 'session starting point', text: 'This is S1. What did you work on?' }];
const turns = [];
const studentAnswers = ['I own the booking UI; drawing the flow, no UI built yet.', 'I have not recorded a repo path; it is in the report/demo.'];
const scenarios = ['success', 'retry_then_success', 'incomplete'];
for (let i = 0; i < scenarios.length; i++) {
  conversation.push({ actor: 'student', purpose: 'student response', text: studentAnswers[i % studentAnswers.length] });
  const providerInput = { model: 'gpt-5-mini', mode: 'turn', conversationLen: conversation.length, answersSnapshot: { ...answers }, note: 'credentials excluded; this is the driver-side payload shape' };
  const cap = captureTurn(providerInput, conversation, answers, scenarios[i]);
  cap.studentAnswer = conversation.at(-1).text;
  answers = cap.recordAfter;
  turns.push({ turn: i, scenario: scenarios[i], ...cap });
  if (i < scenarios.length - 1) conversation.push({ actor: 'system', purpose: 'clarification', text: 'next question (mock)' });
}

const trace = {
  schema: 'intake-complete-trace.v1',
  mode: 'OFFLINE_MOCK — validates stage survival; not a live run; no paid calls',
  rawCandidateProvenance: 'api/session-intake-ai.ts line ~304 sets rawCandidate = JSON.parse(outputText(provider)) = PARSED candidate object, NOT the raw provider HTTP body. The genuine raw body is captured here as providerAttempts[].rawProviderBody.',
  versions: { policyVersion: policy.INTAKE_POLICY_VERSION, promptVersion: policy.INTAKE_PROMPT_VERSION, parserVersion: harness.INTAKE_PARSER_VERSION, model: 'gpt-5-mini (mock)' },
  turns,
  cost: { knownUsd: Number(cost.knownUsd.toFixed(6)), unknownUsd: Number(cost.unknownUsd.toFixed(6)), unreportedRetryReserveUsd: Number(cost.unreportedRetryReserveUsd.toFixed(6)), calls: cost.calls, callsWithUsage: cost.callsWithUsage, callsMissingUsage: cost.callsMissingUsage, note: 'known = actual reported; unknown = conservative reserve for unreported retry attempts (success + failure) and missing usage. Reserved amounts are NOT actual spend.' },
  stagesPresent: ['providerInputPayload_DRIVER_SIDE', 'providerAttempts(incl retries)', 'rawProviderBody', 'originalOutputText', 'parsedCandidate', 'acceptedRejectedCandidates(value+reason)', 'recordBefore', 'recordAfter', 'routeDecision', 'incompleteDetails', 'usage', 'known-vs-unknown-cost'],
  limitation: 'The production endpoint does not currently RETURN the raw provider body/output_text to the client; this harness captures them from the mock. A live capture would need a gated, trace-only endpoint field (documented in the report, not applied here to preserve the stable comparison target).'
};

mkdirSync(resolve(here, 'out'), { recursive: true });
const outPath = resolve(here, 'out', 'complete-trace-sample.mock.json');
writeFileSync(outPath, JSON.stringify(trace, null, 2) + '\n');

// Validate every required stage survived export.
const required = ['providerInputPayload_DRIVER_SIDE', 'providerAttempts', 'parsedCandidate_aka_endpoint_rawCandidate', 'acceptedRejectedCandidates', 'recordBefore', 'recordAfter'];
const t0 = turns[0];
const missing = required.filter(k => !(k in t0));
const retryTurn = turns.find(t => t.providerAttempts.length > 1);
const incompleteTurn = turns.find(t => t.incompleteDetails);
console.log('[trace-capture] stages present on turn0:', missing.length === 0 ? 'ALL' : 'MISSING ' + missing.join(','));
console.log('[trace-capture] retry captured:', Boolean(retryTurn), '| incomplete captured:', Boolean(incompleteTurn));
console.log('[trace-capture] rawProviderBody present:', Boolean(t0.providerAttempts[0].rawProviderBody));
console.log('[trace-capture] cost known=$' + trace.cost.knownUsd, 'unknown=$' + trace.cost.unknownUsd);
console.log('[trace-capture] wrote', outPath);
const ok = missing.length === 0 && retryTurn && incompleteTurn && t0.providerAttempts[0].rawProviderBody;
process.exit(ok ? 0 : 1);
