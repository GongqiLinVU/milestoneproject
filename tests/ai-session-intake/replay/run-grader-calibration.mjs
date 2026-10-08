// Grader calibration runner (B3 final). Calibrates the LLM grader against the
// MANUAL T1 adjudication references — but the grader INPUT excludes those
// reference scores/reasons (item 3): the grader receives only rubric +
// conversation + record (the standard grading tasks). Human labels are compared
// ONLY after the grader returns.
//
// Modes:
//   paid: INTAKE_GRADER_APPROVED=1 + grader key -> real grader call (ledger-charged).
//   offline mock (default / unapproved): a deterministic mock grader validates the
//     MECHANISM only (NOT live LLM calibration).
//
//   node tests/ai-session-intake/replay/run-grader-calibration.mjs            (mock)
//   INTAKE_GRADER_APPROVED=1 node tests/ai-session-intake/replay/run-grader-calibration.mjs   (paid)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadCalibration, calibrate, buildGradingTasks, validateGraderEvidence, gradeWithLLM, GRADER_PROVIDER, GRADER_PRICING } from './grader-harness.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const PAID = process.env.INTAKE_GRADER_APPROVED === '1';
const USE_LEDGER = process.env.INTAKE_USE_LEDGER === '1';
const ledger = USE_LEDGER ? await import('./budget-ledger.mjs') : null;
const calibration = loadCalibration();
const gold = JSON.parse(readFileSync(resolve(here, 'gold-t1.json'), 'utf8'));
// Calibration conversation + record come from the preserved first run (real
// conversation/record), NOT from the reference scores.
const srcPath = resolve(here, 'out', process.env.INTAKE_CALIB_SOURCE || 'dynamic-t1-live.PRE-065-RUN.json');
const src = JSON.parse(readFileSync(srcPath, 'utf8'));
const sessionsByKey = Object.fromEntries((src.sessions || []).map(s => [s.sessionKey, s]));

// Deterministic MOCK grader (mechanism test only). Judges C by route-term presence
// in the student text and R by whether the record slice holds content — using the
// conversation+record ONLY, never the reference scores. Cites a real quote/field.
function mockGrade(sessionKey, tasks) {
  const s = sessionsByKey[sessionKey];
  const studentTurns = (s.conversation || []).filter(t => t.actor === 'student').map(t => t.text);
  const studentText = studentTurns.join(' | ').toLowerCase();
  return tasks.map(t => {
    const sg = gold.sessions[sessionKey].answerBank.find(e => e.factId === t.factId);
    const matchKey = sg ? sg.routeKeys.find(k => studentText.includes(k)) : null;
    const turnIdx = matchKey ? studentTurns.findIndex(x => x.toLowerCase().includes(matchKey)) + 1 : 0;
    const quote = turnIdx ? (studentTurns[turnIdx - 1].match(new RegExp(`[^.]*${matchKey}[^.]*`, 'i')) || [studentTurns[turnIdx - 1]])[0].trim() : '';
    const recEntries = Object.entries(t.recordEvidence || {}).filter(([, v]) => v != null && String(v).trim() !== '');
    const rHas = recEntries.length > 0;
    return { factId: t.factId, c_score: matchKey ? 2 : 0, c_reason: matchKey ? 'route term in student text' : 'not mentioned', c_evidenceTurns: turnIdx ? [turnIdx] : [], c_quote: quote,
      r_score: rHas ? 2 : 0, r_reason: rHas ? 'record field populated' : 'omitted from record', r_fieldPath: rHas ? recEntries[0][0] : null, r_value: rHas ? recEntries[0][1] : null, uncertain: Boolean(matchKey) && !rHas };
  });
}

if (!PAID && process.env.INTAKE_GRADER_MOCK !== '1' && process.env.INTAKE_GRADER_APPROVED !== '1') {
  // default to mock in offline work
}

const graderOutputBySession = {};
const evidenceReview = {};
const rawBySession = {};          // paid: exact request + raw response per Session (credential-free)
const parsedGradesBySession = {}; // the full per-fact grades the grader returned
let totalKnownUsd = 0;
const perCallReserve = (GRADER_PRICING[GRADER_PROVIDER].in * 6000 + GRADER_PRICING[GRADER_PROVIDER].out * 2000);

let runFailure = null;
for (const sessionKey of Object.keys(calibration.sessions)) {
  const s = sessionsByKey[sessionKey];
  if (!s) continue;
  const blind = { sessionKey, conversation: s.conversation, turnLoopCandidate: s.turnLoopCandidate || s.candidateConfirmedOutput || {} };
  const tasks = buildGradingTasks(blind, gold);           // rubric + conversation + record (NO reference scores)
  const tasksByFact = Object.fromEntries(tasks.map(t => [t.factId, t]));
  let graded;
  if (PAID) {
    if (ledger) { const r = await ledger.reserve('grader', perCallReserve); if (!r.ok) { console.error('[grader-calibration] ledger blocked:', r.reason); process.exit(3); } }
    let res;
    try { res = await gradeWithLLM(tasks, { provider: GRADER_PROVIDER }); totalKnownUsd += res.knownUsd; }
    catch (e) {
      // Preserve the exact request + raw response AND the billable usage/cost of the
      // failed attempt, then STOP (do not continue, do not rerun). The failed call
      // may still be billable (e.g. a reasoning model that spent the whole token
      // budget on reasoning and returned empty content), so charge the ACTUAL known
      // cost from the attempt's usage — not $0 — and keep a conservative unknown of 0
      // (there was no retry; retries are disabled for this calibration).
      const failKnownUsd = Number(e.knownUsd || 0);
      totalKnownUsd += failKnownUsd;
      rawBySession[sessionKey] = { rawRequest: e.rawRequest || null, rawResponse: e.rawResponse || null, usage: e.usage || null, knownUsd: failKnownUsd, error: e.message, status: 'failed' };
      if (ledger) await ledger.settle('grader', { perCallMaxUsd: perCallReserve, knownUsd: failKnownUsd, unknownUsd: 0 });
      runFailure = { sessionKey, error: e.message, knownUsd: failKnownUsd, finishReason: e.rawResponse?.body?.choices?.[0]?.finish_reason ?? null };
      console.error(`[grader-calibration] grader call FAILED on ${sessionKey}: ${e.message} (raw request/response + usage preserved; actual knownUsd=$${failKnownUsd.toFixed(6)}); STOPPING with partial results`);
      break;        // fail-stop: write the partial report below, no rerun
    }
    finally { if (res) { if (ledger) await ledger.settle('grader', { perCallMaxUsd: perCallReserve, knownUsd: res.knownUsd, unknownUsd: 0 }); } }
    graded = res.grades;
    // Preserve the exact request (credential-redacted) and the raw response verbatim.
    rawBySession[sessionKey] = { rawRequest: res.rawRequest, rawResponse: res.rawResponse, usage: res.usage, knownUsd: res.knownUsd, parseError: res.parseError, status: 'ok' };
  } else {
    graded = mockGrade(sessionKey, tasks);
    rawBySession[sessionKey] = { note: 'offline mock — no provider request/response (deterministic mock grader)' };
  }
  graderOutputBySession[sessionKey] = graded;
  parsedGradesBySession[sessionKey] = graded;             // full per-fact parsed grades
  // Full evidence-validation objects (code-owned), not just the summary flags.
  evidenceReview[sessionKey] = validateGraderEvidence(graded, tasksByFact).map(x => ({
    factId: x.factId, c_score: x.c_score, r_score: x.r_score, uncertain: x.uncertain,
    cEvidenceValid: x.cEvidenceValid, rEvidenceValid: x.rEvidenceValid,
    needsHumanReview: x.needsHumanReview, evidenceIssues: x.evidenceIssues,
    c_evidenceTurns: x.c_evidenceTurns, c_quote: x.c_quote, r_fieldPath: x.r_fieldPath, r_value: x.r_value,
  }));
}

// Compare to human labels ONLY now (after the grader call).
const cal = calibrate(graderOutputBySession, calibration);
// Agreement COUNTS + DENOMINATORS (code owns the denominators): the percentage
// alone hides the sample size, so persist judged/agreed counts explicitly.
const cRows = cal.rows.filter(r => r.c_match !== null);
const rRows = cal.rows.filter(r => r.r_match !== null);
const agreementCounts = {
  C: { agreed: cRows.filter(r => r.c_match).length, judged: cRows.length },
  R: { agreed: rRows.filter(r => r.r_match).length, judged: rRows.length },
  invalidEvidenceFacts: Object.values(evidenceReview).flat().filter(x => x.cEvidenceValid === false || x.rEvidenceValid === false).map(x => x.factId),
  uncertainFacts: Object.values(evidenceReview).flat().filter(x => x.uncertain).map(x => x.factId),
  humanReviewFacts: Object.values(evidenceReview).flat().filter(x => x.needsHumanReview).map(x => x.factId),
};
const completedSessions = Object.keys(parsedGradesBySession);
const report = {
  schema: 'intake-grader-calibration.v3',
  mode: PAID ? 'paid_live_grader' : 'offline_mock_mechanism_test',
  status: runFailure ? 'partial_failed' : 'complete',
  failure: runFailure,                                     // {sessionKey,error,knownUsd,finishReason} or null
  disclaimer: PAID ? 'Live grader calibration against manual references.' : 'MOCK mechanism test only — NOT live LLM calibration; a real grader will differ.',
  graderProvider: GRADER_PROVIDER,
  calibrationSource: `out/${process.env.INTAKE_CALIB_SOURCE || 'dynamic-t1-live.PRE-065-RUN.json'}`,
  calibratedSessions: Object.keys(calibration.sessions),   // adjudication Sessions targeted (S1,S3,S4; no S2)
  completedSessions,                                       // Sessions that produced parsed grades
  attemptedSessions: Object.keys(rawBySession),            // Sessions a grader call was issued for
  graderInputExcludedReferenceScores: true,
  cAgreement: cal.cAgreement, rAgreement: cal.rAgreement,
  agreementCounts,                                         // explicit counts + denominators
  disagreements: cal.disagreements,
  allComparisonRows: cal.rows,                             // every grader-vs-reference row
  parsedGrades: parsedGradesBySession,                     // full per-fact grades returned
  evidenceReview,                                          // code-owned evidence validation
  raw: rawBySession,                                       // exact request + raw response + usage (credential-free; paid only)
  knownUsd: Number(totalKnownUsd.toFixed(6)),
};
mkdirSync(resolve(here, 'out'), { recursive: true });
const outPath = resolve(here, 'out', PAID ? 'grader-calibration.live.json' : 'grader-calibration.mock.json');
writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
console.log(`[grader-calibration] mode=${report.mode} status=${report.status} grader=${GRADER_PROVIDER} completed=${completedSessions.length}/${report.calibratedSessions.length} cAgreement=${cal.cAgreement}% (${agreementCounts.C.agreed}/${agreementCounts.C.judged}) rAgreement=${cal.rAgreement}% (${agreementCounts.R.agreed}/${agreementCounts.R.judged}) disagreements=${cal.disagreements.length} humanReview=${agreementCounts.humanReviewFacts.length} knownUsd=$${report.knownUsd}`);
console.log('[grader-calibration] grader input excluded reference scores/reasons: true');
if (!PAID) console.log('[grader-calibration] NOTE: mock mechanism test, not live LLM calibration');
console.log('[grader-calibration] wrote', outPath);
if (runFailure) { console.error(`[grader-calibration] STOPPED on ${runFailure.sessionKey} (${runFailure.error}); partial results written; NO rerun.`); process.exit(2); }
