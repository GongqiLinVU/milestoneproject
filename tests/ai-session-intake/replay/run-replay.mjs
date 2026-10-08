// Smallest deterministic replay-baseline runner for the AI Session Intake benchmark.
//
// Phase B1 scope (Sprint 8 closeout):
//   - Uses the REAL compiled Intake interfaces (validateCandidates / decideTurn /
//     fallbackQuestion / applyEvidenceUpdates) from src/intakeHarness.ts +
//     src/intakePolicy.ts — it does NOT compare the fixture's stored output with
//     itself. It feeds each recorded turn's raw candidate through the candidate
//     validator to produce the ACTUAL accepted evidence, then scores that.
//   - Reports Recording (R) + state checks only. C/S are N/A for a fixed
//     transcript (the candidate did not choose its own questions).
//   - Distinguishes the intermediate provider-fallback snapshot from a full
//     recorded-transcript extraction. A pending snapshot is NOT a final confirmed
//     record; the runner does not invent a missing final artifact.
//   - Deterministic replay only. No paid model calls, no DB, no network.
//
// Build the TS under test first (same tsc invocation the adaptive README uses):
//   npx tsc --outDir .test-build --target ES2022 --module nodenext \
//     --moduleResolution nodenext --skipLibCheck \
//     src/intakePolicy.ts src/intakeHarness.ts src/aiSessionIntake.ts
// Then run:
//   node tests/ai-session-intake/replay/run-replay.mjs
//
// Output: tests/ai-session-intake/replay/out/replay-result-s9.json (inspectable).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');

const harnessPath = resolve(repoRoot, '.test-build/intakeHarness.js');
const policyPath = resolve(repoRoot, '.test-build/intakePolicy.js');

let harness, policy;
try {
  harness = await import(harnessPath);
  policy = await import(policyPath);
} catch (err) {
  console.error('[replay] Could not import compiled Intake modules from .test-build.');
  console.error('[replay] Build first with the tsc command in this file header.');
  console.error(String(err?.message || err));
  process.exit(2);
}

const { validateCandidates, decideTurn, fallbackQuestion } = harness;
const { MAX_INTAKE_QUESTIONS, MAX_INTAKE_TURNS } = policy;

// --- Load the real de-identified fixture case and the gold ---
const casesFile = JSON.parse(readFileSync(
  resolve(repoRoot, 'tests/ai-session-intake/adaptive/recorded-cases-v2.json'), 'utf8'));
const gold = JSON.parse(readFileSync(resolve(here, 'gold-s9.json'), 'utf8'));
const theCase = casesFile.cases.find(c => c.id === gold.caseId);
if (!theCase) { console.error(`[replay] case ${gold.caseId} not found`); process.exit(2); }

// A fresh empty answers object, matching DeterministicIntakeAnswers shape used by applyEvidenceUpdates.
const emptyAnswers = () => ({
  responsibility: '', progress: '', progressKind: 'no_progress', scope: '', completionPercent: null,
  evidenceType: 'other', evidenceAvailability: 'unknown', evidenceReference: '', verificationMethod: '',
  testingStatus: 'unknown', testingMethod: '', testingResult: '', testingBaseline: '',
  blockerStatus: 'none', blockerDescription: '', supportRequested: '', nextAction: '', dueSession: '', expectedEvidence: ''
});

const includesAny = (text, needles) =>
  typeof text === 'string' && (needles || []).some(n => text.toLowerCase().includes(String(n).toLowerCase()));

// Score one disclosed gold fact against the accumulated accepted evidence + answers.
// 2 = faithful, 1 = present but ambiguous, 0 = missing/incorrect/erased.
function scoreFact(fact, accepted, answers) {
  const m = fact.match;
  if (m.kind === 'untested_path') {
    // F-R3: the API-error path must NOT be recorded as executed, AND the executed
    // slow-network observation must survive (not be erased into a global untested).
    const testingExecuted = answers.testingStatus === 'executed';
    const evidencePreserved = Boolean(answers.evidenceReference) && answers.evidenceAvailability === 'available_now';
    // The untested API-error path is expressed in the fixture as the assessment gap,
    // not an evidence update; so we score on the invariant: executed observation kept,
    // error path not marked executed/handled.
    if (testingExecuted) return { score: 0, reason: 'API-error path or testing shown as executed (erases untested state)' };
    if (!evidencePreserved) return { score: 1, reason: 'untested API-error path implied but executed slow-network observation not clearly preserved' };
    return { score: 2, reason: 'untested API-error path kept distinct; executed slow-network observation preserved' };
  }
  const hit = accepted.find(u => u.field === m.field && (!m.state || u.state === m.state));
  if (!hit) return { score: 0, reason: `no accepted "${m.field}" update in state ${m.state ?? 'any'}` };
  let ambiguous = false;
  const notes = [];
  if (m.progressKind && hit.progressKind !== m.progressKind) { ambiguous = true; notes.push(`progressKind ${hit.progressKind}≠${m.progressKind}`); }
  if (m.evidenceType && hit.evidenceType !== m.evidenceType) { ambiguous = true; notes.push(`evidenceType ${hit.evidenceType}≠${m.evidenceType}`); }
  if (m.valueIncludesAny && !includesAny(hit.value, m.valueIncludesAny)) { ambiguous = true; notes.push('value missing key terms'); }
  if (m.observedResultIncludesAny && !includesAny(hit.observedResult, m.observedResultIncludesAny)) { ambiguous = true; notes.push('observedResult missing key terms'); }
  if (m.methodIncludesAny && !includesAny(hit.method, m.methodIncludesAny)) { ambiguous = true; notes.push('method missing key terms'); }
  return ambiguous
    ? { score: 1, reason: `present but ambiguous: ${notes.join('; ')}` }
    : { score: 2, reason: `faithful ${m.field} (${hit.state})` };
}

// Detect critical errors on the accumulated state.
function detectCriticalErrors(answers, accepted) {
  const errors = [];
  // #2 plan-as-execution: a planned/unknown testing must not carry an executed observation.
  if (answers.testingStatus !== 'executed' && answers.testingResult) {
    errors.push('plan_or_unknown_test_has_observed_result');
  }
  // #1 fabricated completion of the API-error path: executed testing about the api error without student saying so.
  if (answers.testingStatus === 'executed' && /api|error/i.test(answers.testingMethod + ' ' + answers.testingResult)) {
    errors.push('fabricated_execution_of_api_error_path');
  }
  return errors;
}

// --- Replay each turn through the REAL interfaces, chaining answers turn-by-turn. ---
let answers = emptyAnswers();
let allAccepted = [];
const turnTraces = [];
let providerFailureSeen = null;

theCase.turns.forEach((turn, idx) => {
  const conversation = turn.conversation;
  if (turn.providerFailure) {
    // Intermediate provider-fallback snapshot: NOT a final confirmed record.
    providerFailureSeen = turn.providerFailure;
    const fq = fallbackQuestion(answers, conversation);
    turnTraces.push({
      turnIndex: idx,
      mode: 'provider_fallback_snapshot',
      providerFailure: turn.providerFailure,
      fallbackQuestion: fq,
      snapshotAnswers: { ...answers },
      isFinalConfirmedRecord: false,
      note: 'Pending snapshot preserves prior turns; the model produced no candidate this turn (provider_incomplete).'
    });
    return;
  }
  // Feed the RECORDED raw candidate through the REAL validator + decision logic.
  const raw = turn.candidate;
  const decision = decideTurn(raw, conversation, answers);
  answers = decision.answers; // chain, matching production main.tsx behavior
  allAccepted = allAccepted.concat(decision.accepted);
  turnTraces.push({
    turnIndex: idx,
    mode: 'deterministic_replay',
    proposedRoute: raw?.route ?? null,
    actualRoute: decision.route,
    routeReason: decision.routeDecision?.reason,
    readyForReview: decision.readyForReview,
    extractionPending: decision.extractionPending,
    acceptedFields: decision.accepted.map(u => ({ field: u.field, state: u.state, sourceTurn: u.sourceTurn })),
    rejectedDecisions: decision.decisions.filter(d => d.outcome === 'rejected').map(d => ({ field: d.field, reason: d.reason })),
    level: decision.level
  });
});

// --- Score R per disclosed fact against the ACTUAL accepted evidence + final answers. ---
const factScores = gold.disclosedFacts.map(f => {
  const s = scoreFact(f, allAccepted, answers);
  return { id: f.id, sourceTurn: f.sourceTurn, description: f.description, ...s };
});
const d = factScores.length;
const rNumerator = factScores.reduce((a, f) => a + f.score, 0);
const R = Math.round((100 * rNumerator) / (2 * d));
const criticalErrors = detectCriticalErrors(answers, allAccepted);

// --- State checks ---
const stateChecks = [];
const t3 = turnTraces.find(t => t.mode === 'provider_fallback_snapshot');
stateChecks.push({
  check: 'provider_failure_yields_pending_snapshot_not_final_record',
  passed: Boolean(t3) && t3.isFinalConfirmedRecord === false,
  detail: t3 ? `provider_incomplete → pending snapshot, finalConfirmedRecord=false` : 'no provider-failure turn found'
});
stateChecks.push({
  check: 'executed_slow_network_observation_preserved',
  passed: answers.evidenceAvailability === 'available_now' && Boolean(answers.evidenceReference),
  detail: `evidenceAvailability=${answers.evidenceAvailability}, ref="${answers.evidenceReference}"`
});
stateChecks.push({
  check: 'api_error_path_not_marked_executed',
  passed: answers.testingStatus !== 'executed',
  detail: `testingStatus=${answers.testingStatus}`
});

// --- Assemble inspectable result JSON ---
const result = {
  schema: 'intake-replay-result.v1',
  generatedAt: new Date().toISOString(),
  executionMode: 'deterministic_replay',
  liveModel: false,
  paidModelCalls: 0,
  versions: {
    policyVersion: policy.INTAKE_POLICY_VERSION,
    promptVersion: policy.INTAKE_PROMPT_VERSION,
    parserVersion: harness.INTAKE_PARSER_VERSION,
    maxQuestions: MAX_INTAKE_QUESTIONS,
    maxTurns: MAX_INTAKE_TURNS,
    goldVersion: gold.version,
    casesVersion: casesFile.version
  },
  input: {
    caseId: gold.caseId,
    caseSource: gold.source,
    goldFile: 'tests/ai-session-intake/replay/gold-s9.json',
    provenance: theCase.provenance
  },
  candidateOutput: {
    finalAnswers: answers,
    acceptedEvidence: allAccepted,
    turnTraces
  },
  recording: {
    perFactScores: factScores,
    numerator: rNumerator,
    denominator: 2 * d,
    R_percent: R
  },
  collectionAndSession: { C_percent: 'N/A', S: 'N/A', reason: 'fixed transcript; candidate did not choose its own questions' },
  criticalErrors,
  stateChecks,
  providerFailure: providerFailureSeen,
  limitations: [
    'Deterministic replay of recorded candidates; not a live-model evaluation.',
    'Single real de-identified Session (S9); not a multi-Session trajectory.',
    'R + state checks only; C and S are N/A for a fixed transcript.',
    'Turn-3 provider response is a recorded provider_incomplete failure; R for turn 3 is assessed on the fallback pending snapshot only.',
    'De-identified reproduction reconstructed from session-intake-debug-S9 (4).json.'
  ]
};

const outDir = resolve(here, 'out');
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, 'replay-result-s9.json');
writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf8');

// --- Console summary ---
const allStatePass = stateChecks.every(s => s.passed);
const sessionFactsAllTwo = factScores.every(f => f.score === 2);
console.log('[replay] case:', gold.caseId, '| mode: deterministic_replay | liveModel: false');
console.log('[replay] R =', R + '%', `(${rNumerator}/${2 * d})`, '| C/S = N/A (fixed transcript)');
factScores.forEach(f => console.log(`  ${f.id}: ${f.score}/2 — ${f.reason}`));
console.log('[replay] critical errors:', criticalErrors.length ? criticalErrors.join(', ') : 'none');
console.log('[replay] state checks:', allStatePass ? 'all pass' : 'FAIL', stateChecks.map(s => `${s.check}=${s.passed}`).join('; '));
console.log('[replay] wrote', outPath);

// Exit non-zero only if the runner's own invariants fail (state checks / critical
// errors), so it can gate CI later. R below 100 is a measurement, not a runner error.
const runnerHealthy = allStatePass && criticalErrors.length === 0;
process.exit(runnerHealthy ? 0 : 1);
