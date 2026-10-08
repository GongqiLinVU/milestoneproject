// Grading runner (B3 final wiring). Grades a provider's Intake run PROVIDER-BLIND,
// validates grader evidence against the supplied conversation/record, and lets
// CODE compute C/R/S + Session-success. Separate output path per graded run.
//
//   INTAKE_GRADE_INPUT=out/dynamic-t1-live-openai.json \
//     node tests/ai-session-intake/replay/run-grader.mjs    (offline mock grader)
//
// Mock grader (default / unapproved): derives per-fact judgments heuristically from
// the record ONLY (provider-blind) to validate the pipeline with NO paid calls.
// Paid grader requires INTAKE_GRADER_APPROVED=1 + a grader runner wiring (gated).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, basename } from 'node:path';
import { buildGradingTasks, computeScores, validateGraderEvidence, gradeWithLLM, GRADER_PROVIDER, GRADER_PRICING } from './grader-harness.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const inputRel = process.env.INTAKE_GRADE_INPUT || 'out/dynamic-t1-live-openai.json';
const inputPath = resolve(here, inputRel);
const gold = JSON.parse(readFileSync(resolve(here, 'gold-t1.json'), 'utf8'));
const run = JSON.parse(readFileSync(inputPath, 'utf8'));
const PAID = process.env.INTAKE_GRADER_APPROVED === '1';
const USE_LEDGER = process.env.INTAKE_USE_LEDGER === '1';
const ledger = USE_LEDGER ? await import('./budget-ledger.mjs') : null;
const perCallReserve = GRADER_PRICING[GRADER_PROVIDER].in * 6000 + GRADER_PRICING[GRADER_PROVIDER].out * 2000;

// PROVIDER-BLIND: strip any provider identity before grading.
function blindSession(s) {
  const conv = s.conversation || [];
  const record = s.turnLoopCandidate || s.candidateConfirmedOutput || {};
  return { sessionKey: s.sessionKey, conversation: conv, turnLoopCandidate: record };
}

// Mock grader: provider-blind heuristic citing a REAL quote + field path so it
// passes evidence validation. (A real grader replaces this via gradeWithLLM; the
// pipeline/validation is identical.)
function mockGrade(sessionKey, tasks, blind) {
  const studentTurns = blind.conversation.filter(t => t.actor === 'student').map(t => t.text);
  const studentText = studentTurns.join(' | ').toLowerCase();
  return tasks.map((t) => {
    const sg = gold.sessions[sessionKey].answerBank.find(e => e.factId === t.factId);
    const matchKey = sg ? sg.routeKeys.find(k => studentText.includes(k)) : null;
    const turnIdx = matchKey ? studentTurns.findIndex(x => x.toLowerCase().includes(matchKey)) + 1 : 0;
    const quote = turnIdx ? (studentTurns[turnIdx - 1].match(new RegExp(`[^.|]*${matchKey}[^.|]*`, 'i')) || [studentTurns[turnIdx - 1]])[0].trim() : '';
    const recEntries = Object.entries(t.recordEvidence || {}).filter(([, v]) => v != null && String(v).trim() !== '');
    const rHas = recEntries.length > 0;
    return { factId: t.factId, c_score: matchKey ? 2 : 0, c_reason: matchKey ? 'route term in student text' : 'not mentioned', c_evidenceTurns: turnIdx ? [turnIdx] : [], c_quote: quote,
      r_score: rHas ? 2 : 0, r_reason: rHas ? 'record field populated' : 'omitted from record', r_fieldPath: rHas ? recEntries[0][0] : null, r_value: rHas ? recEntries[0][1] : null, uncertain: Boolean(matchKey) && !rHas };
  });
}

const sessionsOut = [];
let totalKnownUsd = 0;
for (const s of (run.sessions || [])) {
  if (!s.sessionKey || !s.conversation) continue;
  const blind = blindSession(s);
  const tasks = buildGradingTasks(blind, gold);
  const tasksByFact = Object.fromEntries(tasks.map(t => [t.factId, t]));
  let graded;
  if (PAID) {
    if (ledger) { const r = await ledger.reserve('grader', perCallReserve); if (!r.ok) { console.error('[grader] ledger blocked:', r.reason); process.exit(3); } }
    let res;
    try { res = await gradeWithLLM(tasks, { provider: GRADER_PROVIDER }); totalKnownUsd += res.knownUsd; }
    finally { if (ledger) await ledger.settle('grader', { perCallMaxUsd: perCallReserve, knownUsd: res ? res.knownUsd : 0, unknownUsd: res ? 0 : perCallReserve }); }
    graded = res.grades;
  } else {
    graded = mockGrade(s.sessionKey, tasks, blind);
  }
  const checked = validateGraderEvidence(graded, tasksByFact);
  const scores = computeScores(checked, { criticalError: false });
  sessionsOut.push({ sessionKey: s.sessionKey, grader: GRADER_PROVIDER, providerBlind: true,
    perFact: checked.map(c => ({ factId: c.factId, c_score: c.c_score, r_score: c.r_score, needsHumanReview: c.needsHumanReview, evidenceIssues: c.evidenceIssues })),
    C_percent: scores.C_percent, R_percent: scores.R_percent, sessionSuccess: scores.sessionSuccess, uncertainFacts: scores.uncertainFacts });
}

const report = {
  schema: 'intake-grading-result.v1',
  mode: PAID ? 'paid_live_grader' : 'offline_mock_grader',
  disclaimer: PAID ? 'Live LLM grade (provider-blind to the Intake).' : 'Mock grader validates the pipeline (provider-blind tasks, evidence validation, code-owned C/R/S). It is NOT a live LLM grade.',
  graderProvider: GRADER_PROVIDER,
  gradedInput: inputRel,
  intakeProviderHiddenFromGrader: true,
  codeOwnsScoring: true,
  knownUsd: Number(totalKnownUsd.toFixed(6)),
  sessions: sessionsOut,
};
mkdirSync(resolve(here, 'out'), { recursive: true });
const tag = basename(inputRel).replace(/\.json$/, '');
const outPath = resolve(here, 'out', `grading-${tag}.${PAID ? 'live' : 'mock'}.json`);
writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
console.log(`[grader] mode=${report.mode} grader=${GRADER_PROVIDER} graded=${inputRel} sessions=${sessionsOut.length} knownUsd=$${report.knownUsd}`);
sessionsOut.forEach(s => console.log(`  ${s.sessionKey}: C=${s.C_percent}% R=${s.R_percent} success=${s.sessionSuccess} review=${s.uncertainFacts.length}`));
console.log('[grader] wrote', outPath);
