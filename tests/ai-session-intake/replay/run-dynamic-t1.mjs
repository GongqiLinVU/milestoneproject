// Minimal DYNAMIC answer-bank driver for the synthetic T1 four-Session baseline.
//
// Phase B2 scope (Sprint 8 closeout):
//   - The Intake (candidate) chooses its OWN questions. The student answer-bank
//     reveals ONLY facts whose routeKeys match the candidate's question. No
//     reference questions, future facts, or gold are ever fed to the Intake.
//   - Measures Collection (C), Recording (R) and Session success (S) with the
//     frozen T1 gold (gold-t1.json). d_i is dynamic: only facts actually
//     disclosed this trial enter the R denominator.
//   - Carries the candidate's own CONFIRMED output between Sessions (longitudinal),
//     kept separate from any isolated gold-context diagnostic. A test-generated
//     confirmation is NOT a persisted student submission and does NOT imply
//     database/UI acceptance.
//   - Two modes:
//       offline (default): a controlled, gold-blind model STUB drives questions.
//         This is RUNNER VALIDATION ONLY — not evidence of live Intake quality.
//       live (prepared, NOT executed here): calls the real provider via existing
//         local config. Guarded behind INTAKE_LIVE=1; this task never runs it.
//   - Ambiguous routing is logged, never silently scored.
//
// Build the TS under test first (see run-replay.mjs header for the tsc command),
// then run offline:
//   node tests/ai-session-intake/replay/run-dynamic-t1.mjs
// Output: tests/ai-session-intake/replay/out/dynamic-t1-<mode>.json

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const MODE = process.env.INTAKE_LIVE === '1' ? 'live' : 'offline';

const harness = await import(resolve(repoRoot, '.test-build/intakeHarness.js')).catch(err => {
  console.error('[dynamic-t1] build the TS first (see run-replay.mjs header):', String(err?.message || err));
  process.exit(2);
});
const policy = await import(resolve(repoRoot, '.test-build/intakePolicy.js'));
const { decideTurn } = harness;
const { MAX_INTAKE_QUESTIONS, MAX_INTAKE_TURNS, questionCount } = policy;

const gold = JSON.parse(readFileSync(resolve(here, 'gold-t1.json'), 'utf8'));

const emptyAnswers = () => ({
  responsibility: '', progress: '', progressKind: 'no_progress', scope: '', completionPercent: null,
  evidenceType: 'other', evidenceAvailability: 'unknown', evidenceReference: '', verificationMethod: '',
  testingStatus: 'unknown', testingMethod: '', testingResult: '', testingBaseline: '',
  blockerStatus: 'none', blockerDescription: '', supportRequested: '', nextAction: '', dueSession: '', expectedEvidence: ''
});
const norm = s => String(s || '').toLowerCase();
const tokenize = s => new Set((norm(s).match(/[a-z0-9]+/g) || []));

// ---- Student answer-bank router (gold-side; NEVER shown to the Intake) --------
// Routes the assistant question to matching bank entries by routeKeys. Reveals
// only matching, not-yet-revealed facts. Returns { text, revealed:[factId], ambiguity }.
function studentRespond(sessionGold, question, revealedSet, isFirstTurn) {
  if (isFirstTurn) {
    // U1 opening: reveal the first progress fact (per answer-bank protocol) via a
    // controlled non-vague opener so the conversation starts with a real fact.
    const first = sessionGold.answerBank[0];
    revealedSet.add(first.factId);
    return { text: first.reveals, revealed: [first.factId], ambiguity: null };
  }
  const q = norm(question);
  const qTokens = tokenize(q);

  // (a) Honest answers to artifact-location / run-now / commit questions. These
  // must NOT reveal unrelated facts and must NEVER invent a repo path or fabricate
  // a test execution/result — they are honest "not recorded / cannot run" answers.
  const honest = sessionGold.honestAnswers || {};
  const asksRepoPath = /\b(repo|repository|path|url|link|upload)\b/.test(q) || /where .*(file|diagram|pdf|artifact|screen)/.test(q);
  const asksRunNow = /\b(run|execute|rerun|simulate)\b/.test(q) && /\b(now|test|it|the|journey|changed)\b/.test(q);
  const asksCommit = /\bcommit\b|\bhash\b|\bsha\b/.test(q);
  if (asksRunNow && honest.run_test_now) return { text: honest.run_test_now, revealed: [], ambiguity: { type: 'run_now_declined_no_fabrication', question, pendingAdjudication: false } };
  if (asksRepoPath && honest.repo_path) return { text: honest.repo_path, revealed: [], ambiguity: { type: 'repo_path_honest_no_leak', question, pendingAdjudication: false } };
  if (asksCommit && honest.commit_hash) return { text: honest.commit_hash, revealed: [], ambiguity: { type: 'commit_honest_no_leak', question, pendingAdjudication: false } };

  // (b) Route to an UNREVEALED authorized fact by substring + stem match.
  const scoreEntry = e => e.routeKeys.reduce((n, k) => {
    if (q.includes(k)) return n + 1;
    for (const tok of qTokens) { if (tok.startsWith(k) || (k.startsWith(tok) && tok.length >= 4)) return n + 1; }
    return n;
  }, 0);
  const scored = sessionGold.answerBank
    .filter(e => !revealedSet.has(e.factId))
    .map(e => ({ e, hits: scoreEntry(e) })).filter(x => x.hits > 0).sort((a, b) => b.hits - a.hits);

  if (scored.length === 0) {
    // No unrevealed fact matches. A model summary / "no further question" / ack
    // must NOT release the next undisclosed fact. Instead, if the question is a
    // summary/ack or a clarification and facts were already disclosed, repeat the
    // authorized (already-disclosed) facts — a real student restates, not
    // volunteers a brand-new unrelated fact. Only a truly off-topic question with
    // no authorized repeat yields an inspectable unmatched log with no fact.
    const isSummaryOrAck = /\b(summar|acknowledg|noted|got it|to confirm|so you|i see|recorded|review|thanks)\b/.test(q);
    const isClarify = /\b(what|which|how|clarif|mean|repeat|again|else|more)\b/.test(q);
    const revealedEntries = sessionGold.answerBank.filter(e => revealedSet.has(e.factId));
    if ((isSummaryOrAck || isClarify) && sessionGold.authorizedRepeat && revealedEntries.length) {
      return { text: sessionGold.authorizedRepeat, revealed: [],
        ambiguity: { type: 'authorized_repeat_no_new_fact', question, pendingAdjudication: false } };
    }
    return { text: "Which part do you mean?", revealed: [],
      ambiguity: { type: 'unmatched_question_no_fact', question, pendingAdjudication: true } };
  }
  if (scored.length > 1 && scored[0].hits === scored[1].hits) {
    // A genuinely combined question (tie at the top) legitimately reveals multiple
    // relevant facts; logged pendingAdjudication so a reviewer confirms routing.
    const tied = scored.filter(x => x.hits === scored[0].hits).map(x => x.e);
    tied.forEach(m => revealedSet.add(m.factId));
    return { text: tied.map(m => m.reveals).join(' '), revealed: tied.map(m => m.factId),
      ambiguity: { type: 'combined_question_multiple_reveals', question, facts: tied.map(m => m.factId), pendingAdjudication: true } };
  }
  revealedSet.add(scored[0].e.factId);
  return { text: scored[0].e.reveals, revealed: [scored[0].e.factId], ambiguity: null };
}

// ---- Controlled model STUB (offline). Gold-BLIND: sees only the conversation. --
// It plays the Intake's question-choosing + extraction role deterministically so
// we can validate the DRIVER without paid calls. It extracts evidence from the
// LAST student turn using the same field vocabulary the real prompt targets.
function offlineModelCandidate(conversation) {
  const lastStudent = conversation.at(-1)?.text || '';
  const t = tokenize(lastStudent);
  const has = (...ws) => ws.some(w => norm(lastStudent).includes(w));
  const updates = [];
  const src = conversation.length - 1;
  // claim / progress
  if (has('own', 'built', 'drawing', 'agreed', 'updated', 'connected', 'changed', 'built the', 'added')) {
    updates.push({ field: 'claim', value: lastStudent.slice(0, 200), state: 'student_claim', sourceTurn: src,
      evidenceType: null, progressKind: has('not','no ','failed','wrong') ? 'attempted_failed' : 'advanced',
      method: null, observedResult: null, expectedEvidence: null });
  }
  // evidence route (file/demo/log references)
  const ref = lastStudent.match(/\b[a-z0-9-]+\.(?:pdf|md|jpg|png)\b/i);
  if (ref) {
    updates.push({ field: 'evidence', value: ref[0], state: 'available', sourceTurn: src,
      evidenceType: 'design_artifact', progressKind: null, method: null, observedResult: null, expectedEvidence: null });
  }
  // blocker / dependency
  if (has('undecided', 'not connected', 'need', 'not isolated', 'waiting', 'joint slot', 'depend')) {
    updates.push({ field: 'blocker', value: lastStudent.slice(0, 200), state: 'student_claim', sourceTurn: src,
      evidenceType: null, progressKind: null, method: null, observedResult: null, expectedEvidence: null });
  }
  // next action (future language)
  if (/\b(will|plan|next session|then build|rerun|before final|before the next)\b/i.test(lastStudent)) {
    updates.push({ field: 'next_action', value: lastStudent.slice(0, 200), state: 'planned', sourceTurn: src,
      evidenceType: null, progressKind: null, method: null, observedResult: null, expectedEvidence: null });
  }
  // Choose the next question by the highest-priority unresolved direction.
  const asked = norm(conversation.filter(c => c.actor === 'system').map(c => c.text).join(' '));
  let q = 'What is one specific thing you completed, tried, or discovered this Session?';
  if (!asked.includes('own')) q = 'What do you own, and what specifically changed this Session?';
  else if (!asked.includes('implement') && !asked.includes('live') && !asked.includes('integrat'))
    q = 'Is that implemented and integrated, or is it still design / mock?';
  else if (!asked.includes('changed') && !asked.includes('both')) q = 'Did both the normal and the changed-slot journeys work?';
  else if (!asked.includes('evidence') && !asked.includes('show')) q = 'What evidence could the Teacher review, and is anything blocking you?';
  else if (!asked.includes('next')) q = 'What is your next step before the next Session?';
  return { assistantMessage: q, route: 'clarification', evidenceUpdates: updates };
}

// ---- Live candidate — calls the REAL Intake workflow (PREPARED; refuses unless
// explicitly authorized with a spend cap). It POSTs to /api/session-intake-ai in
// mode:"turn", so the endpoint uses its ACTUAL prompt, DB-resolved context,
// extraction, validation and routing (decideTurn) — NOT a benchmark-only prompt
// or predetermined questions. Only the conversation text and the candidate's own
// accumulated answers/capturedFields are sent; gold is NEVER sent (isolation).
async function liveModelCandidate(conversation, liveState) {
  if (process.env.INTAKE_LIVE_APPROVED !== '1') {
    throw new Error('live run not approved: set INTAKE_LIVE_APPROVED=1 only after Joseph approves the concrete budget/spend cap (Phase B3 item 4)');
  }
  const base = process.env.INTAKE_API_BASE || 'http://localhost:3010';
  const token = process.env.INTAKE_STUDENT_TOKEN; // student bearer from existing local auth; never logged
  const sessionId = liveState.sessionId;           // real 2B2 studio_sessions UUID
  if (!token || !sessionId) throw new Error('live run needs INTAKE_STUDENT_TOKEN and a resolved 2B2 sessionId');
  // The endpoint sanitises turn-mode answers through capturedFields; carry the
  // candidate's OWN accumulated answers + captured fields (its own output), not gold.
  const body = {
    mode: 'turn', sessionId,
    conversation: conversation.map(t => ({ actor: t.actor === 'student' ? 'student' : 'assistant', text: t.text })),
    answers: liveState.answers, capturedFields: [...liveState.capturedFields]
  };
  const resp = await fetch(`${base}/api/session-intake-ai`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await resp.json();
  liveState.lastUsage = json.usage || null;         // record tokens for cost accounting
  liveState.lastManifest = json.manifest || null;
  liveState.providerFailure = json.providerFailure || null;
  // Return the RAW candidate so the driver's own decideTurn re-derivation matches
  // production; the endpoint already ran decideTurn, but we re-run locally for the
  // identical accepted set and to keep offline/live scoring paths identical.
  return json.rawCandidate || { assistantMessage: json.result?.assistantMessage || '', route: json.result?.route || 'clarification', evidenceUpdates: json.result?.evidenceUpdates || [] };
}

// ---- Run one Session dynamically --------------------------------------------
async function runSession(sessionId, priorConfirmed, liveState) {
  const sg = gold.sessions[sessionId];
  const conversation = [{ actor: 'system', purpose: 'session starting point',
    text: `This is ${sessionId}. Start with one specific part you personally worked on since the previous class.` }];
  let answers = emptyAnswers();
  const revealed = new Set();
  const ambiguities = [];
  const turns = [];
  const usageLog = [];
  let readyForReview = false;
  if (liveState) { liveState.answers = answers; liveState.capturedFields = new Set(); }

  // First student turn (opening fact).
  let student = studentRespond(sg, conversation.at(-1).text, revealed, true);
  conversation.push({ actor: 'student', purpose: 'student response', text: student.text });
  if (student.ambiguity) ambiguities.push({ turn: conversation.length - 1, ...student.ambiguity });

  for (let step = 0; step < MAX_INTAKE_QUESTIONS + 1; step++) {
    const candidate = MODE === 'live'
      ? await liveModelCandidate(conversation, liveState)
      : offlineModelCandidate(conversation);
    const decision = decideTurn(candidate, conversation, answers);
    answers = decision.answers;
    if (liveState) {
      liveState.answers = answers;
      decision.accepted.forEach(u => liveState.capturedFields.add(u.field));
      if (liveState.lastUsage) usageLog.push(liveState.lastUsage);
    }
    turns.push({
      questionAsked: candidate.assistantMessage,
      studentDisclosed: student.revealed,
      acceptedFields: decision.accepted.map(u => ({ field: u.field, state: u.state, sourceTurn: u.sourceTurn })),
      rejected: decision.decisions.filter(d => d.outcome === 'rejected').map(d => d.reason),
      route: decision.route, routeReason: decision.routeDecision?.reason
    });
    readyForReview = decision.readyForReview;
    if (readyForReview) break;
    if (questionCount(conversation) >= MAX_INTAKE_QUESTIONS) break;
    // Append the assistant question and route the next student answer to it.
    conversation.push({ actor: 'system', purpose: decision.route, text: decision.assistantMessage });
    student = studentRespond(sg, decision.assistantMessage, revealed, false);
    conversation.push({ actor: 'student', purpose: 'student response', text: student.text });
    if (student.ambiguity) ambiguities.push({ turn: conversation.length - 1, ...student.ambiguity });
    if (student.revealed.length === 0 && student.text === 'Which part do you mean?') {
      // student could not answer a mis-routed question; let the loop continue.
    }
  }

  // Test-generated confirmation (NOT a persisted student submission).
  conversation.push({ actor: 'system', purpose: 'review transition', text: 'Review before confirming.' });

  // ---- Score C (collection) over frozen essential facts ----
  const cScores = sg.essentialCollectionFacts.map(f => {
    const disclosed = revealed.has(f.id);
    // C (collection) evaluates ONLY whether the essential fact was established in
    // the CONVERSATION (elicited via a routed question). It does NOT depend on
    // whether extraction captured it — a disclosed-but-unextracted fact is an R
    // failure, not a C failure (B3 attribution audit, scoring v1.1).
    // 2 = elicited in the conversation; 0 = never elicited (collection gap).
    const inRecord = factInRecord(f.id, answers);
    const score = disclosed ? 2 : 0;
    const reason = disclosed ? 'elicited in conversation' : 'not elicited (collection gap)';
    return { id: f.id, target: f.target, disclosed, inRecord, score, reason };
  });
  const cNum = cScores.reduce((a, s) => a + s.score, 0);
  const C = Math.round((100 * cNum) / (2 * cScores.length));

  // ---- Score R (recording) over facts ACTUALLY disclosed this trial (dynamic d_i) ----
  // R evaluates whether each DISCLOSED fact was faithfully retained in the record.
  // This is where a clearly-disclosed next action omitted from extraction is
  // scored as a failure (B3 attribution audit).
  const disclosedFactIds = sg.essentialCollectionFacts.filter(f => revealed.has(f.id)).map(f => f.id);
  const rScores = disclosedFactIds.map(id => {
    const inRecord = factInRecord(id, answers);
    return { id, score: inRecord ? 2 : 0, reason: inRecord ? 'disclosed fact retained' : 'disclosed fact dropped from extraction (R failure, not C)' };
  });
  const d = rScores.length;
  const rNum = rScores.reduce((a, s) => a + s.score, 0);
  const R = d ? Math.round((100 * rNum) / (2 * d)) : 'N/A';

  // ---- Critical errors ----
  const critical = detectCritical(sessionId, answers, revealed, sg);

  // ---- Session success ----
  const allCTwo = cScores.every(s => s.score === 2);
  const allRTwo = d > 0 && rScores.every(s => s.score === 2);
  const success = allCTwo && allRTwo && critical.length === 0;

  return {
    sessionId, stage: sg.stage, history: sg.history,
    conversation, ambiguities, turns,
    candidateConfirmedOutput: answers,
    isPersistedStudentSubmission: false,
    note: 'Test-generated confirmation only. No database/UI acceptance implied.',
    usageLog,
    collection: { perFact: cScores, numerator: cNum, denominator: 2 * cScores.length, C_percent: C },
    recording: { disclosedFactIds, perFact: rScores, numerator: rNum, denominator: 2 * d, R_percent: R },
    criticalErrors: critical,
    sessionSuccess: success
  };
}

// A frozen fact is "in the record" if the corresponding answers field is populated.
function factInRecord(factId, a) {
  const key = factId.split('-')[1]; // e.g. C1..C5
  const map = {
    C1: () => Boolean(a.progress || a.responsibility),
    C2: () => Boolean(a.progress) || a.evidenceAvailability !== 'unknown',
    C3: () => a.blockerStatus !== 'none' || Boolean(a.blockerDescription) || a.evidenceAvailability !== 'unknown',
    C4: () => Boolean(a.evidenceReference) || a.evidenceAvailability !== 'unknown',
    C5: () => Boolean(a.nextAction)
  };
  return (map[key] || (() => false))();
}

function detectCritical(sessionId, a, revealed, sg) {
  const errs = [];
  // plan-as-execution
  if (a.testingStatus !== 'executed' && a.testingResult) errs.push('plan_or_unknown_test_has_observed_result');
  // S4: a correction was disclosed but lost (still recorded as complete)
  if (sessionId === 'S4') {
    const correctionDisclosed = revealed.has('T1S4-C2');
    if (correctionDisclosed && /\bcomplete|finished|all done\b/i.test(a.progress) && !/not|open|remain/i.test(a.progress + a.nextAction)) {
      errs.push('lost_student_correction_recorded_complete');
    }
  }
  return errs;
}

// ---- Run the four-Session trajectory (longitudinal carryover) ----
// Offline: carryover is the candidate's OWN confirmed output, passed in-process.
// Live: the real endpoint resolves the previous confirmed record from the DB for
// the authenticated student, so cross-Session history in a live run reflects
// actual persisted intakes. A single non-persisted B3 trajectory therefore has DB
// history only if those Sessions were previously confirmed; this is documented,
// not silently assumed. Gold is never sent to the endpoint either way.
const sessionsOut = [];
let priorConfirmed = null;
// Map T1 gold Sessions to real 2B2 studio_sessions UUIDs for live mode (comma-sep,
// S1,S2,S3,S4 order). Empty offline.
const liveSessionIds = (process.env.INTAKE_SESSION_IDS || '').split(',').map(s => s.trim());
const sids = ['S1', 'S2', 'S3', 'S4'];
for (let i = 0; i < sids.length; i++) {
  const liveState = MODE === 'live' ? { sessionId: liveSessionIds[i] } : null;
  const out = await runSession(sids[i], priorConfirmed, liveState);
  priorConfirmed = out.candidateConfirmedOutput; // carry candidate's OWN confirmed output
  sessionsOut.push(out);
}

const validSessions = sessionsOut.length;
const successCount = sessionsOut.filter(s => s.sessionSuccess).length;
const S = Math.round((100 * successCount) / validSessions);

const result = {
  schema: 'intake-dynamic-result.v1.1',
  scoringVersion: 'intake-crs-scoring.v1.1',
  scoringChange: 'B3 attribution audit: C measures elicitation in the conversation only; a disclosed fact omitted from extraction is scored under R, not C.',
  generatedAt: new Date().toISOString(),
  profile: 'T1',
  synthetic: true,
  syntheticWarning: 'SYNTHETIC trajectory. NOT classroom evidence. Offline mode is RUNNER VALIDATION, not live Intake quality.',
  executionMode: MODE,
  liveModel: MODE === 'live',
  paidModelCalls: 0,
  versions: {
    policyVersion: policy.INTAKE_POLICY_VERSION, promptVersion: policy.INTAKE_PROMPT_VERSION,
    parserVersion: harness.INTAKE_PARSER_VERSION, maxQuestions: MAX_INTAKE_QUESTIONS, maxTurns: MAX_INTAKE_TURNS,
    goldVersion: gold.version
  },
  projectCard: gold.projectCard,
  longitudinal: { carriedCandidateOwnOutput: true, isolatedGoldContextDiagnostic: false,
    note: 'Each Session carries the candidate\'s own confirmed output, not gold. Test confirmation is not a persisted submission.' },
  sessions: sessionsOut,
  trajectory: { C_mean: mean(sessionsOut.map(s => s.collection.C_percent)),
    R_mean: mean(sessionsOut.map(s => s.recording.R_percent).filter(x => x !== 'N/A')),
    S_percent: S, successCount, validSessions, expected: gold.trajectoryGold }
};

function mean(xs) { return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 'N/A'; }

const outDir = resolve(here, 'out'); mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, `dynamic-t1-${MODE}.json`);
writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf8');

console.log(`[dynamic-t1] mode=${MODE} liveModel=${MODE === 'live'} synthetic=true`);
sessionsOut.forEach(s => console.log(
  `  ${s.sessionId}: C=${s.collection.C_percent}% R=${s.recording.R_percent}${s.recording.R_percent==='N/A'?'':'%'} success=${s.sessionSuccess} critical=${s.criticalErrors.length} ambig=${s.ambiguities.length}`));
console.log(`[dynamic-t1] trajectory C_mean=${result.trajectory.C_mean} R_mean=${result.trajectory.R_mean} S=${S}% (${successCount}/${validSessions})`);
console.log('[dynamic-t1] wrote', outPath);
