// Dedicated LIVE T1 four-Session baseline runner (Phase B3 live).
//
// - Drives the REAL /api/session-intake-ai endpoint (real prompt/context/
//   extraction/validation/routing, gpt-5-mini). Student questions come from the
//   model; the student answer-bank (gold) reveals only routed facts. Gold is
//   never sent to the endpoint.
// - Enforces a HARD total spend cap (default US$0.20) across ALL calls, retries
//   and extraction/confirmation calls. Stops at the cap and reports partial.
// - Persists each confirmed Session into the ISOLATED fixture student's history
//   via save_my_session_intake_chat, then verifies the next Session's endpoint
//   context actually receives it (previousRecord carryover). If persistence
//   fails, it reports the specific failure and switches to independent-Session
//   labeling — never substitutes gold history or mislabels independent as
//   longitudinal.
// - Offline stub results are NOT touched or mixed in.
//
// Run (after fixture + API server are up):
//   node tests/ai-session-intake/replay/run-live-t1.mjs
// Requires: INTAKE_LIVE_APPROVED=1 (authorization already granted for this run).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';
import { getStudentToken } from './live-auth.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const API_BASE = process.env.INTAKE_API_BASE || 'http://localhost:3010';
const CAP_USD = Number(process.env.INTAKE_COST_CAP_USD || '0.20');
// Provider selection (B3 final wiring). openai (default) | deepseek. The endpoint
// routes transport by the gated x-intake-provider header; the chain is identical.
const PROVIDER = (process.env.INTAKE_PROVIDER === 'deepseek') ? 'deepseek' : 'openai';
const DEBUG_TOKEN = process.env.INTAKE_DEBUG_TOKEN || '';
const CAPTURE_TRACE = process.env.INTAKE_CAPTURE_TRACE === '1';
// Verified pricing (2026-10-04): gpt-5-mini $0.25/$2.00; deepseek-flash peak $0.30/$1.20.
const PRICING = { openai: { in: 0.25 / 1e6, out: 2.00 / 1e6 }, deepseek: { in: 0.30 / 1e6, out: 1.20 / 1e6 } };
const MODEL_IN = PRICING[PROVIDER].in, MODEL_OUT = PRICING[PROVIDER].out;
// Separate mock student + output path PER PROVIDER so parallel runs never share
// history or overwrite artifacts. Override via INTAKE_STUDENT_ID if needed.
const STUDENT_BY_PROVIDER = { openai: 't1bench01', deepseek: 't1bench02' };
const LEDGER_COMPONENT = process.env.INTAKE_LEDGER_COMPONENT || `intake_${PROVIDER}`;
const USE_LEDGER = process.env.INTAKE_USE_LEDGER === '1';

if (process.env.INTAKE_LIVE_APPROVED !== '1') {
  console.error('live run not approved: INTAKE_LIVE_APPROVED=1 required'); process.exit(2);
}

const harness = await import(resolve(repoRoot, '.test-build/intakeHarness.js'));
const policy = await import(resolve(repoRoot, '.test-build/intakePolicy.js'));
const aiMod = await import(resolve(repoRoot, '.test-build/aiSessionIntake.js'));
const ledger = USE_LEDGER ? await import('./budget-ledger.mjs') : null;
const { MAX_INTAKE_QUESTIONS, questionCount } = policy;
const { buildFallbackStudentRecord, STUDENT_CONFIRMATION_ATTESTATION } = aiMod;

const gold = JSON.parse(readFileSync(resolve(here, 'gold-t1.json'), 'utf8'));
const status = JSON.parse(execSync('supabase status -o json', { encoding: 'utf8' }));
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const STUDENT_ID = process.env.INTAKE_STUDENT_ID || STUDENT_BY_PROVIDER[PROVIDER];
const norm = s => String(s || '').toLowerCase();

// ---- Resolve the four Session UUIDs for the fixture student's block ----
async function resolveSessionIds() {
  const { data: roster } = await admin.from('student_roster').select('block_id').eq('student_id', STUDENT_ID).maybeSingle();
  const { data: sessions } = await admin.from('studio_sessions').select('id,session_number')
    .eq('block_id', roster.block_id).in('session_number', [1, 2, 3, 4]).order('session_number');
  return sessions.map(s => s.id);
}

// ---- Student answer-bank router (gold-side; never sent to the endpoint) ----
// Repaired (B3 part 2): fact routing takes PRIORITY over keyword honest-answers,
// so a changed question is answered on its merits and the simulator never gets
// stuck repeating one honest line. Honest "not recorded / cannot run" answers fire
// only when NO unrevealed authorized fact matches AND the question is genuinely
// about that topic. Filename/report/demo evidence routes are accepted without
// inventing URLs. Combined-question alternatives are answered. Authorized facts
// are repeated when appropriate. No future facts or gold expectations are released.
function studentRespond(sg, question, revealed, first, askHistory) {
  if (first) { const e = sg.answerBank[0]; revealed.add(e.factId); return { text: e.reveals, revealed: [e.factId], ambiguity: null }; }
  const q = norm(question), qTokens = new Set((q.match(/[a-z0-9]+/g) || []));
  const honest = sg.honestAnswers || {};

  // (1) FACT ROUTING FIRST — match an unrevealed authorized fact by substring/stem.
  const scoreEntry = e => e.routeKeys.reduce((n, k) => { if (q.includes(k)) return n + 1; for (const tok of qTokens) if (tok.startsWith(k) || (k.startsWith(tok) && tok.length >= 4)) return n + 1; return n; }, 0);
  const scored = sg.answerBank.filter(e => !revealed.has(e.factId)).map(e => ({ e, hits: scoreEntry(e) })).filter(x => x.hits > 0).sort((a, b) => b.hits - a.hits);
  if (scored.length) {
    if (scored.length > 1 && scored[0].hits === scored[1].hits) {
      // Combined / "A or B?" question: answer the feasible alternatives it hits.
      const tied = scored.filter(x => x.hits === scored[0].hits).map(x => x.e); tied.forEach(m => revealed.add(m.factId));
      return { text: tied.map(m => m.reveals).join(' '), revealed: tied.map(m => m.factId), ambiguity: { type: 'combined_question_multiple_reveals', question, facts: tied.map(m => m.factId), pendingAdjudication: true } };
    }
    revealed.add(scored[0].e.factId);
    return { text: scored[0].e.reveals, revealed: [scored[0].e.factId], ambiguity: null };
  }

  // (2) No unrevealed fact matches. Honest answers for genuinely on-topic artifact/
  // run-now/commit questions — but only ONCE for the same topic; a repeat of the
  // same topic becomes an authorized repeat so the simulator never loops.
  const asksRepoPath = /\b(repo|repository|url|link|upload)\b/.test(q) || /where .*(file|diagram|pdf|artifact|screen)/.test(q);
  const asksRunNow = /\b(run|execute|rerun|simulate)\b/.test(q) && /\b(now|right now|immediately)\b/.test(q);
  const asksCommit = /\bcommit\b|\bhash\b|\bsha\b/.test(q);
  const already = topic => (askHistory && askHistory.has(topic));
  const emitHonest = (topic, text, type) => {
    if (already(topic)) {
      if (sg.authorizedRepeat) return { text: sg.authorizedRepeat, revealed: [], ambiguity: { type: 'authorized_repeat_after_repeat_topic', question, pendingAdjudication: false } };
      return { text, revealed: [], ambiguity: { type, question, pendingAdjudication: false } };
    }
    if (askHistory) askHistory.add(topic);
    return { text, revealed: [], ambiguity: { type, question, pendingAdjudication: false } };
  };
  if (asksRunNow && honest.run_test_now) return emitHonest('run_now', honest.run_test_now, 'run_now_declined_no_fabrication');
  if (asksRepoPath && honest.repo_path) return emitHonest('repo_path', honest.repo_path, 'repo_path_honest_no_leak');
  if (asksCommit && honest.commit_hash) return emitHonest('commit', honest.commit_hash, 'commit_honest_no_leak');

  // (3) Summary / ack / clarification with facts already disclosed -> repeat them.
  const isSummaryOrAck = /\b(summar|acknowledg|noted|got it|to confirm|so you|i see|recorded|review|thanks)\b/.test(q);
  const isClarify = /\b(what|which|how|clarif|mean|repeat|again|else|more)\b/.test(q);
  const revealedEntries = sg.answerBank.filter(e => revealed.has(e.factId));
  if ((isSummaryOrAck || isClarify) && sg.authorizedRepeat && revealedEntries.length) return { text: sg.authorizedRepeat, revealed: [], ambiguity: { type: 'authorized_repeat_no_new_fact', question, pendingAdjudication: false } };
  return { text: 'Which part do you mean?', revealed: [], ambiguity: { type: 'unmatched_question_no_fact', question, pendingAdjudication: true } };
}

// Cost accounting (B3 repair, corrected). Missing usage is NOT treated as zero.
//
// Reservation must cover EVERY provider attempt an endpoint call can make:
//   - The endpoint retries once inside a single turn: `for (attempt=0; attempt<2)`
//     in api/session-intake-ai.ts -> up to 2 provider attempts per endpoint call,
//     each with the mode's max_output_tokens.
//   - Input bound per attempt is bounded by the request body cap
//     (MAX_BODY_BYTES=64000 bytes) plus the server-side turn `instructions`
//     (~9,433 chars). Converting at a conservative ~3.5 chars/token:
//       body   <= 64000/3.5  ~= 18,286 tokens
//       prompt  = 9433/3.5   ~=  2,696 tokens
//     -> MAX_IN_PER_ATTEMPT = 21,000 (rounded up) covers both.
//   - Output per attempt is the endpoint cap: 4000 (turn) / 850 (extract) / 700 (questions).
//     The chat/turn flow used here has NO separate extraction/model call at save
//     (save_my_session_intake_chat is deterministic), so the turn reserve stands;
//     if a `questions`/`extract` model call were ever added it must add its own
//     reserve (documented, not silently assumed).
const ATTEMPTS_PER_CALL = 2;         // endpoint's in-turn retry loop
const MAX_IN_PER_ATTEMPT = 21000;    // ESTIMATE: MAX_BODY_BYTES(64000B/3.5) + server instructions(9433/3.5); not a proven token bound
const MAX_OUT_PER_ATTEMPT = 4000;    // endpoint max_output_tokens (turn mode)
const MAX_COST_PER_ATTEMPT = MAX_IN_PER_ATTEMPT * MODEL_IN + MAX_OUT_PER_ATTEMPT * MODEL_OUT;
const MAX_COST_PER_CALL = ATTEMPTS_PER_CALL * MAX_COST_PER_ATTEMPT; // conservative guard for both attempts
const cost = { knownUsd: 0, unknownUsd: 0, calls: 0, callsWithUsage: 0, callsMissingUsage: 0, inTok: 0, outTok: 0, unreportedRetryReserveUsd: 0 };
function addUsage(u) {
  cost.calls++;
  if (!u) {
    // No usage at all (e.g. provider_incomplete / fallback): charge the
    // conservative per-CALL maximum (both attempts) to unknownUsd, never zero.
    cost.callsMissingUsage++; cost.unknownUsd += MAX_COST_PER_CALL; return;
  }
  // Successful (usage-bearing) call: returned usage reflects ONLY the final
  // attempt (api/session-intake-ai.ts reads provider.usage from the last
  // response). A silent retry's first attempt is therefore unreported even on a
  // SUCCESS. Charge actual tokens to knownUsd AND conservatively reserve one
  // possible unreported extra attempt to unknownUsd — kept separate from known.
  const i = u.input_tokens || u.prompt_tokens || 0, o = u.output_tokens || u.completion_tokens || 0;
  cost.callsWithUsage++; cost.inTok += i; cost.outTok += o; cost.knownUsd += i * MODEL_IN + o * MODEL_OUT;
  cost.unknownUsd += MAX_COST_PER_ATTEMPT; cost.unreportedRetryReserveUsd += MAX_COST_PER_ATTEMPT;
}
const totalSpent = () => cost.knownUsd + cost.unknownUsd;
// Conservative budget GUARD before issuing: proceed only if committing the full
// 2-attempt conservative maximum stays within the cap. This is a guard based on
// an ESTIMATED token bound, NOT a provable hard guarantee (see report §10.3).
const canAffordAnotherCall = () => totalSpent() + MAX_COST_PER_CALL <= CAP_USD;
const capReached = () => !canAffordAnotherCall();

async function callTurn(token, sessionId, conversation, answers, capturedFields) {
  // conversationErrors (run on the raw body) requires strict system/student
  // alternation and a 3–80 char purpose on every turn. Send that exact shape.
  const body = { mode: 'turn', sessionId,
    conversation: conversation.map(t => ({ actor: t.actor === 'student' ? 'student' : 'system', purpose: t.purpose || (t.actor === 'student' ? 'student response' : 'clarification'), text: t.text })),
    answers, capturedFields: [...capturedFields] };
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  // Gated provider switch + trace capture (endpoint ignores these unless the
  // debug token matches INTAKE_DEBUG_TOKEN on the server).
  if (DEBUG_TOKEN) {
    headers['x-intake-debug-token'] = DEBUG_TOKEN;
    headers['x-intake-provider'] = PROVIDER;
    if (CAPTURE_TRACE) headers['x-intake-debug'] = '1';
  }
  // Reserve the conservative per-call maximum in the SHARED ledger before issuing,
  // so parallel provider/grader runs cannot jointly breach a cap or the overall guard.
  if (ledger) {
    const r = await ledger.reserve(LEDGER_COMPONENT, MAX_COST_PER_CALL);
    if (!r.ok) return { ledgerBlocked: r };
  }
  let json;
  try {
    const resp = await fetch(`${API_BASE}/api/session-intake-ai`, { method: 'POST', headers, body: JSON.stringify(body) });
    json = await resp.json().catch(() => ({}));
  } finally {
    const u = json && json.usage;
    const known = u ? ((u.input_tokens || u.prompt_tokens || 0) * MODEL_IN + (u.output_tokens || u.completion_tokens || 0) * MODEL_OUT) : 0;
    const unknown = u ? MAX_COST_PER_ATTEMPT : MAX_COST_PER_CALL;
    if (ledger) await ledger.settle(LEDGER_COMPONENT, { perCallMaxUsd: MAX_COST_PER_CALL, knownUsd: known, unknownUsd: unknown });
  }
  addUsage(json.usage);
  return json;
}

function factInRecord(factId, a) {
  const key = factId.split('-')[1];
  const map = { C1: () => Boolean(a.progress || a.responsibility), C2: () => Boolean(a.progress) || a.evidenceAvailability !== 'unknown',
    C3: () => a.blockerStatus !== 'none' || Boolean(a.blockerDescription) || a.evidenceAvailability !== 'unknown' || /fail|not|old/i.test(a.progress),
    C4: () => Boolean(a.evidenceReference) || a.evidenceAvailability !== 'unknown', C5: () => Boolean(a.nextAction) };
  return (map[key] || (() => false))();
}

async function runSession(sessionId, sessionKey, token, priorPersisted) {
  const sg = gold.sessions[sessionKey];
  const conversation = [{ actor: 'system', purpose: 'session starting point', text: `This is ${sessionKey}. What did you personally work on since the previous class, and what changed?` }];
  let answers = { ...emptyAnswers() };
  const capturedFields = new Set();
  const revealed = new Set(), ambiguities = [], turns = [], askHistory = new Set();
  let readyForReview = false, lastResult = null, providerFailure = null;

  let student = studentRespond(sg, conversation.at(-1).text, revealed, true, askHistory);
  conversation.push({ actor: 'student', purpose: 'student response', text: student.text });
  if (student.ambiguity) ambiguities.push({ turn: conversation.length - 1, ...student.ambiguity });

  for (let step = 0; step < MAX_INTAKE_QUESTIONS + 1; step++) {
    if (capReached()) { turns.push({ stoppedAtCap: true }); break; }
    const json = await callTurn(token, sessionId, conversation, answers, capturedFields);
    if (json.ledgerBlocked) { providerFailure = json.ledgerBlocked.reason; turns.push({ ledgerBlocked: json.ledgerBlocked }); break; }
    if (json.error && !json.result) { providerFailure = json.code || json.error; turns.push({ endpointError: json.code || json.error, stage: json.stage }); break; }
    lastResult = json;
    const accepted = json.result?.evidenceUpdates || [];
    // Re-derive answers via the same decideTurn the endpoint used, to keep our
    // record identical to production's accepted set.
    const decision = harness.decideTurn(json.rawCandidate || json.result, conversation, answers);
    answers = decision.answers; decision.accepted.forEach(u => capturedFields.add(u.field));
    providerFailure = json.providerFailure || providerFailure;
    turns.push({ questionAsked: json.result?.assistantMessage, studentDisclosed: student.revealed,
      provider: json.provider || PROVIDER,
      route: json.result?.route, routeReason: json.routeDecision?.reason, readyForReview: json.result?.readyForReview,
      acceptedFields: decision.accepted.map(u => ({ field: u.field, state: u.state, sourceTurn: u.sourceTurn })),
      rejected: (json.fieldDecisions || []).filter(d => d.outcome === 'rejected').map(d => d.reason),
      fieldDecisions: json.fieldDecisions || null,
      rawCandidate: json.rawCandidate || null,
      debugTrace: json.debugTrace || null,  // full raw trace (gated): input, attempts, raw body, output text, record before/after
      usage: json.usage || null, providerFailure: json.providerFailure || null });
    readyForReview = Boolean(json.result?.readyForReview);
    if (readyForReview) break;
    if (questionCount(conversation) >= MAX_INTAKE_QUESTIONS) break;
    conversation.push({ actor: 'system', purpose: json.result?.route || 'clarification', text: json.result?.assistantMessage || 'Continue.' });
    student = studentRespond(sg, conversation.at(-1).text, revealed, false, askHistory);
    conversation.push({ actor: 'student', purpose: 'student response', text: student.text });
    if (student.ambiguity) ambiguities.push({ turn: conversation.length - 1, ...student.ambiguity });
  }

  // Close the conversation for saving (must end in a 'review transition').
  conversation.push({ actor: 'system', purpose: 'review transition', text: 'Review what you reported before confirming.' });

  // ---- Persist into the isolated student's history via the real save RPC. ----
  // The RPC is security definer and uses auth.uid(), so it MUST be called as the
  // student (JWT), not the service-role admin client.
  let persistence = { attempted: false, ok: false, error: null };

  // --- Review & correction step (mirrors production main.tsx stage-4 correct()). ---
  // Distinguish: turn-loop candidate (answers) -> final extracted record ->
  // student-confirmed record (after this correction) -> persisted submission.
  // The synthetic student fills ONLY missing REQUIRED record fields, and ONLY from
  // its OWN authorized Session facts (gold.sessions[key].confirmField), exactly as
  // a real student would type them at review. No gold SCORING targets are used and
  // nothing is invented: if a fact is not authorized for this Session, it is left
  // unknown/empty and the correction is recorded as "student left unknown".
  const turnLoopCandidate = { ...answers };
  const corrections = [];
  const confirm = sg.confirmField || {};
  const setIf = (field, value, provenance) => {
    if (!answers[field] && value) { corrections.push({ field, before: answers[field] || '', after: value, provenance }); answers[field] = value; }
  };
  // required scope (claim.scope must be 2-500 chars; empty scope was the S1-S3
  // persistence blocker). The student supplies it from their own authorized module
  // scope, exactly as the real UI exposes a scope field at review.
  setIf('scope', confirm.scope, 'student_authorized_scope');
  // due_session is a real UI default (a <select>); the production UI defaults it to
  // a Session option. We use the Session's own next Session as the documented default.
  setIf('dueSession', confirm.dueSession || `S${Math.min(10, Number(sessionKey.slice(1)) + 1)}`, 'ui_default_due_session (production main.tsx uses a Session <select> default)');
  setIf('nextAction', confirm.nextAction, 'student_authorized_next_action');
  setIf('expectedEvidence', confirm.expectedEvidence, 'student_authorized_expected_evidence');
  // available_now evidence needs a verification method; the student supplies it from
  // their own authorized route if evidence was marked available.
  if (answers.evidenceAvailability === 'available_now') setIf('verificationMethod', confirm.verificationMethod, 'student_authorized_verification');
  setIf('responsibility', confirm.responsibility, 'student_authorized_responsibility');

  // Make every review-stage correction EXPLICIT in the student trace: one entry per
  // correction with the authorized source (provenance) and before/after values.
  for (const c of corrections) {
    turns.push({ reviewStageCorrection: true, field: c.field, before: c.before, after: c.after,
      authorizedSource: c.provenance, note: 'Added at student review, NOT elicited by the Intake conversation.' });
  }

  const record = buildFallbackStudentRecord(answers, {}, Boolean(priorPersisted));
  const finalValidation = aiMod.validateIntakeStudentRecord ? aiMod.validateIntakeStudentRecord(record) : { valid: true };
  if (!capReached()) {
    persistence.attempted = true;
    // Build a schema-valid p_ai_assistance. The RPC requires:
    //   follow_up_count === greatest(0, (convLen-1)/2 - 3)
    //   question_purposes.length === same
    //   turn_results[].evidenceUpdates[].sourceTurn must index a student turn.
    const savedConv = conversation.map(t => ({ actor: t.actor === 'student' ? 'student' : 'system', purpose: t.purpose, text: t.text }));
    const questionsAsked = Math.floor((savedConv.length - 1) / 2);
    const followUpCount = Math.max(0, questionsAsked - 3);
    const questionPurposes = savedConv.filter((t, i) => t.actor === 'system' && t.purpose !== 'review transition' && i > 0).slice(0, followUpCount).map(t => t.purpose.slice(0, 60));
    while (questionPurposes.length < followUpCount) questionPurposes.push('clarification');
    const stopReason = providerFailure ? 'provider_failure' : (questionsAsked >= MAX_INTAKE_QUESTIONS ? 'budget_exhausted' : (answers.supportRequested ? 'teacher_help' : 'sufficient_information'));
    const extractionStatus = providerFailure ? 'fallback' : 'completed';
    const aiAssistance = {
      used: true, model: lastResult?.model || 'gpt-5-mini', policy_version: policy.INTAKE_POLICY_VERSION,
      follow_up_count: followUpCount, question_purposes: questionPurposes,
      extraction_status: extractionStatus, stop_reason: stopReason,
      extracted_record: record, turn_results: []
    };
    persistence.recordValid = finalValidation.valid;
    persistence.recordErrors = finalValidation.valid ? [] : finalValidation.errors;
    persistence.corrections = corrections;
    try {
      const studentClient = createClient(status.API_URL, status.ANON_KEY, {
        auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } }
      });
      const { data, error } = await studentClient.rpc('save_my_session_intake_chat', {
        p_session_id: sessionId,
        p_source_conversation: savedConv,
        p_student_record: record,
        p_student_confirmation: { status: 'confirmed', attestation: STUDENT_CONFIRMATION_ATTESTATION, corrections: [] },
        p_prompt_version: policy.INTAKE_PROMPT_VERSION,
        p_ai_assistance: aiAssistance
      });
      if (error) throw error;
      persistence.ok = true; persistence.saved = data;
    } catch (e) { persistence.error = e.message || String(e); }
  }

  // ---- C/R/S scoring (v1.1 attribution). ----
  // Conversational COLLECTION (C) is scored ONLY on what the Intake elicited in the
  // conversation — it never credits review-stage confirmField additions.
  const cScores = sg.essentialCollectionFacts.map(f => ({ id: f.id, target: f.target, disclosed: revealed.has(f.id), score: revealed.has(f.id) ? 2 : 0, reason: revealed.has(f.id) ? 'elicited in conversation' : 'not elicited (collection gap)' }));
  const cNum = cScores.reduce((a, s) => a + s.score, 0), C = Math.round(100 * cNum / (2 * cScores.length));
  const disclosedIds = cScores.filter(s => s.disclosed).map(s => s.id);

  // R is reported TWICE with the same rubric, kept visibly separate:
  //  - R_intake_only: recording fidelity of the Intake's OWN extraction, scored on
  //    the turn-loop candidate BEFORE any student review correction.
  //  - R_after_correction: recording fidelity of the student-confirmed record AFTER
  //    the review-stage corrections. confirmField additions are NOT credited to the
  //    Intake; they only affect this post-correction figure.
  const rBefore = disclosedIds.map(id => ({ id, score: factInRecord(id, turnLoopCandidate) ? 2 : 0, reason: factInRecord(id, turnLoopCandidate) ? 'retained by Intake extraction' : 'dropped by Intake extraction (R failure before correction)' }));
  const rAfter = disclosedIds.map(id => ({ id, score: factInRecord(id, answers) ? 2 : 0, reason: factInRecord(id, answers) ? 'present after student correction' : 'still missing after correction' }));
  const d = disclosedIds.length;
  const rBeforePct = d ? Math.round(100 * rBefore.reduce((a, s) => a + s.score, 0) / (2 * d)) : 'N/A';
  const rAfterPct = d ? Math.round(100 * rAfter.reduce((a, s) => a + s.score, 0) / (2 * d)) : 'N/A';

  const critical = [];
  if (answers.testingStatus !== 'executed' && answers.testingResult) critical.push('plan_or_unknown_test_has_observed_result');
  // Session success uses the Intake-only recording (before correction) so that
  // review-stage supplementation cannot inflate the Intake's success.
  const success = cScores.every(s => s.score === 2) && d > 0 && rBefore.every(s => s.score === 2) && critical.length === 0 && !providerFailure;

  return { sessionKey, sessionId, conversation, ambiguities, turns,
    turnLoopCandidate,                       // Intake-only extraction (pre-correction)
    reviewStageCorrections: corrections,     // explicit: field, before, after, provenance
    candidateConfirmedOutput: answers,       // student-confirmed record (post-correction)
    recordValid: finalValidation.valid, recordErrors: finalValidation.valid ? [] : finalValidation.errors,
    persistence, providerFailure,
    collection: { perFact: cScores, C_percent: C, note: 'conversational collection only; excludes review-stage additions' },
    recording: {
      disclosedIds,
      intakeOnly: { perFact: rBefore, R_percent: rBeforePct, note: 'Intake extraction fidelity BEFORE student correction; confirmField NOT credited' },
      afterCorrection: { perFact: rAfter, R_percent: rAfterPct, note: 'student-confirmed record AFTER review-stage correction' }
    },
    criticalErrors: critical, sessionSuccess: success, isPersistedStudentSubmission: persistence.ok };
}

function emptyAnswers() { return { responsibility: '', progress: '', progressKind: 'no_progress', scope: '', completionPercent: null, evidenceType: 'other', evidenceAvailability: 'unknown', evidenceReference: '', verificationMethod: '', testingStatus: 'unknown', testingMethod: '', testingResult: '', testingBaseline: '', blockerStatus: 'none', blockerDescription: '', supportRequested: '', nextAction: '', dueSession: '', expectedEvidence: '' }; }

// ---- Main ----
const token = await getStudentToken(STUDENT_ID);
const sessionIds = await resolveSessionIds();
const sessionsOut = [];
let priorPersisted = null;
const carryoverEvidence = [];
for (let i = 0; i < 4; i++) {
  if (capReached()) { sessionsOut.push({ sessionKey: `S${i + 1}`, skippedAtCap: true }); continue; }
  // Verify carryover BEFORE running S2+: read what previousRecord the DB now holds.
  if (i > 0) {
    const { data: prevIntakes } = await admin.from('student_session_intakes').select('session_id,student_record').eq('student_id', STUDENT_ID);
    carryoverEvidence.push({ beforeSession: `S${i + 1}`, priorPersistedCount: (prevIntakes || []).length, priorSessions: (prevIntakes || []).map(p => p.session_id) });
  }
  const out = await runSession(sessionIds[i], `S${i + 1}`, token, priorPersisted);
  if (out.persistence?.ok) priorPersisted = out.candidateConfirmedOutput;
  sessionsOut.push(out);
}

const ran = sessionsOut.filter(s => !s.skippedAtCap && !s.turns?.[0]?.stoppedAtCap);
const anyPersistFail = sessionsOut.some(s => s.persistence && s.persistence.attempted && !s.persistence.ok);
const longitudinal = sessionsOut.filter(s => s.isPersistedStudentSubmission).length >= 2 && !anyPersistFail;
const validSessions = ran.length;
const successCount = ran.filter(s => s.sessionSuccess).length;

const result = {
  schema: 'intake-live-result.v1', scoringVersion: 'intake-crs-scoring.v1.1',
  generatedAt: new Date().toISOString(), profile: 'T1', synthetic: true,
  executionMode: 'live', liveModel: true, provider: PROVIDER, model: PROVIDER === 'deepseek' ? (process.env.DEEPSEEK_MODEL || 'deepseek-flash') : 'gpt-5-mini',
  runLabel: longitudinal ? 'longitudinal_baseline' : 'independent_session_diagnostics',
  runLabelReason: longitudinal ? 'candidate confirmed output persisted and carried across Sessions' : (anyPersistFail ? 'persistence failed; not labeled longitudinal' : 'insufficient persisted Sessions for longitudinal'),
  cap: { capUsd: CAP_USD, knownUsd: Number(cost.knownUsd.toFixed(6)), unknownUsd: Number(cost.unknownUsd.toFixed(6)), unreportedRetryReserveUsd: Number(cost.unreportedRetryReserveUsd.toFixed(6)), totalSpentUsd: Number(totalSpent().toFixed(6)), calls: cost.calls, callsWithUsage: cost.callsWithUsage, callsMissingUsage: cost.callsMissingUsage, inputTokens: cost.inTok, outputTokens: cost.outTok, attemptsPerCall: ATTEMPTS_PER_CALL, maxInPerAttempt: MAX_IN_PER_ATTEMPT, maxOutPerAttempt: MAX_OUT_PER_ATTEMPT, maxCostPerAttempt: Number(MAX_COST_PER_ATTEMPT.toFixed(6)), maxCostPerCallReserve: Number(MAX_COST_PER_CALL.toFixed(6)), capReached: capReached(), note: 'Conservative budget guard (NOT a provable hard cap): the 21000-token input bound is an estimate, not a proven ceiling. knownUsd = actual reported usage. unknownUsd = conservative reserve for missing usage AND for a possible unreported retry attempt on EVERY successful call (returned usage reflects only the final attempt). Review/save is a deterministic RPC (no model call).' },
  versions: { policyVersion: policy.INTAKE_POLICY_VERSION, promptVersion: policy.INTAKE_PROMPT_VERSION, parserVersion: harness.INTAKE_PARSER_VERSION },
  resolvedContext: { student: STUDENT_ID, block_code: '2B2', project_name: 'Booking portal', sessionIds },
  ledgerComponent: LEDGER_COMPONENT,
  ledgerSnapshot: ledger ? await ledger.snapshot() : null,
  carryoverEvidence,
  sessions: sessionsOut,
  trajectory: validSessions ? { C_mean: Math.round(ran.reduce((a, s) => a + (s.collection?.C_percent || 0), 0) / validSessions), R_intakeOnly_values: ran.map(s => s.recording?.intakeOnly?.R_percent), R_afterCorrection_values: ran.map(s => s.recording?.afterCorrection?.R_percent), S_percent: Math.round(100 * successCount / validSessions), successCount, validSessions, note: 'S uses Intake-only recording (before correction), so review-stage supplementation cannot inflate Intake success.' } : { note: 'no Sessions completed within cap' },
  aggregateQualification: 'C/R/S are reported per-Session; a trajectory aggregate is shown only if no material scoring item is unresolved. Pending adjudications and any persistence failure are listed and qualify the aggregate.',
};

mkdirSync(resolve(here, 'out'), { recursive: true });
const outPath = resolve(here, 'out', `dynamic-t1-live-${PROVIDER}.json`);
writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(`[live-t1] model=gpt-5-mini calls=${cost.calls} (usage=${cost.callsWithUsage}, missing=${cost.callsMissingUsage}) known=$${cost.knownUsd.toFixed(4)} unknown=$${cost.unknownUsd.toFixed(4)} (incl. unreported-retry reserve $${cost.unreportedRetryReserveUsd.toFixed(4)}) total=$${totalSpent().toFixed(4)}/${CAP_USD} capReached=${capReached()}`);
sessionsOut.forEach(s => console.log(`  ${s.sessionKey}: ${s.skippedAtCap ? 'SKIPPED(cap)' : `C=${s.collection?.C_percent}% R_intake=${s.recording?.intakeOnly?.R_percent} R_afterCorrection=${s.recording?.afterCorrection?.R_percent} corrections=${s.reviewStageCorrections?.length || 0} success=${s.sessionSuccess} persist=${s.persistence?.ok} pf=${s.providerFailure || 'none'}`}`));
console.log(`[live-t1] runLabel=${result.runLabel} wrote ${outPath}`);
