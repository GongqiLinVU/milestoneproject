// LLM-assisted grading harness (B3 part 3), prepared and OFFLINE-validated.
//
// Design guarantees (per task):
//  - The LLM grader ONLY emits per-fact 0/1/2 judgments WITH cited conversation +
//    record evidence and an uncertainty flag. It does NOT compute C/R/S or
//    Session-success and does NOT see provider identity.
//  - CODE retains the schema checks, the C/R/S formulas and the Session-success
//    decision (computeScores below), using the grader's per-fact scores as input.
//  - The manually adjudicated T1 examples (out/dynamic-t1-live-adjudicated-v2.json)
//    are the CALIBRATION references.
//  - The student simulator is NOT replaced by an LLM (that is out of scope here).
//
// This module is pure/offline: buildGradingTasks() + computeScores() have no
// network. A gradeWithLLM() stub documents the paid path but refuses unless
// explicitly approved. Validated by grader-harness.test.mjs with a MOCK grader.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

export function loadCalibration() {
  return JSON.parse(readFileSync(resolve(here, 'out/dynamic-t1-live-adjudicated-v2.json'), 'utf8'));
}

// Build provider-BLIND grading tasks: one per essential fact, carrying the
// conversation and the recorded value as evidence. No provider name is included.
export function buildGradingTasks(session, gold) {
  const sg = gold.sessions[session.sessionKey];
  const studentTurns = session.conversation.filter(t => t.actor === 'student').map((t, i) => `U${i + 1}: ${t.text}`);
  const record = session.turnLoopCandidate || session.candidateConfirmedOutput;
  return sg.essentialCollectionFacts.map(f => ({
    factId: f.id,
    target: f.target,
    anchors: f.anchors,                       // 0/1/2 anchor definitions
    conversationEvidence: studentTurns,       // what the student actually said (U1..Un)
    recordEvidence: recordSliceForFact(f.id, record), // the record field paths + values
    instruction: [
      'Judge COLLECTION (C) and RECORDING (R) SEPARATELY against the anchors.',
      'C = was the fact established in the STUDENT CONVERSATION? Cite c_evidenceTurns (1-based indices into conversationEvidence) and c_quote (an EXACT substring copied from one cited student turn). Use ONLY the conversation for C.',
      'R = was the disclosed fact FAITHFULLY retained in the RECORD? Cite r_fieldPath (a key present in recordEvidence) and r_value (the exact value at that path), or set r_score:0 with r_reason explaining the omission. A fact clearly disclosed in the conversation but NOT in the record is C=2 and R=0 (an omission). R=0 needs NO record content.',
      'A keyword alone is not a 2. Evidence existence is not semantic correctness. If genuinely unsure, set uncertain:true.',
      'Return {factId, c_score:0|1|2, c_reason, c_evidenceTurns:[], c_quote, r_score:0|1|2, r_reason, r_fieldPath, r_value, uncertain:boolean}.',
    ].join(' '),
    providerBlind: true,
  }));
}

function recordSliceForFact(factId, a) {
  const key = factId.split('-')[1];
  const map = {
    C1: { responsibility: a.responsibility, progress: a.progress, progressKind: a.progressKind },
    C2: { progress: a.progress, progressKind: a.progressKind, scope: a.scope },
    C3: { blockerStatus: a.blockerStatus, blockerDescription: a.blockerDescription, evidenceAvailability: a.evidenceAvailability },
    C4: { evidenceReference: a.evidenceReference, evidenceAvailability: a.evidenceAvailability, verificationMethod: a.verificationMethod, evidenceType: a.evidenceType },
    C5: { nextAction: a.nextAction, dueSession: a.dueSession, expectedEvidence: a.expectedEvidence },
  };
  return map[key] || {};
}

// CODE owns the formulas (C/R/S v1.1) and Session-success. The grader's per-fact
// scores are the ONLY LLM-derived input. Uncertain facts are flagged, not hidden.
export function computeScores(gradedFacts, options = {}) {
  const cScores = gradedFacts.map(g => ({ factId: g.factId, score: g.c_score, uncertain: g.uncertain, reason: g.c_reason }));
  const disclosed = gradedFacts.filter(g => g.c_score >= 1);   // elicited (>=1) are "disclosed" for R denominator
  const rScores = disclosed.map(g => ({ factId: g.factId, score: g.r_score, uncertain: g.uncertain, reason: g.r_reason }));
  const C = Math.round(100 * cScores.reduce((a, s) => a + s.score, 0) / (2 * cScores.length));
  const d = rScores.length;
  const R = d ? Math.round(100 * rScores.reduce((a, s) => a + s.score, 0) / (2 * d)) : 'N/A';
  const anyUncertain = gradedFacts.some(g => g.uncertain);
  // Session success (schema + formula owned by code): all essential C=2, all
  // disclosed R=2, no critical error, valid record. Uncertainty blocks an
  // automatic pass -> flag for human review instead of silently passing/failing.
  const success = cScores.every(s => s.score === 2) && d > 0 && rScores.every(s => s.score === 2) && !options.criticalError;
  return {
    C_percent: C, R_percent: R, disclosedCount: d,
    sessionSuccess: anyUncertain ? 'needs_human_review' : success,
    uncertainFacts: gradedFacts.filter(g => g.uncertain).map(g => g.factId),
    perFactC: cScores, perFactR: rScores,
  };
}

// Calibration: compare grader scores to the manual adjudication references.
export function calibrate(graderOutputBySession, calibration) {
  const rows = [];
  for (const [sessionKey, graded] of Object.entries(graderOutputBySession)) {
    const ref = calibration.sessions[sessionKey]?.facts || [];
    for (const g of graded) {
      const refC = ref.find(r => r.id === g.factId && r.metric === 'C');
      const refR = ref.find(r => r.id === g.factId && (r.metric === 'R' || r.metric === 'R_pre'));
      rows.push({ sessionKey, factId: g.factId,
        c_grader: g.c_score, c_ref: refC ? refC.score : null, c_match: refC ? g.c_score === refC.score : null,
        r_grader: g.r_score, r_ref: refR ? refR.score : null, r_match: refR ? g.r_score === refR.score : null,
        uncertain: g.uncertain });
    }
  }
  const cJudged = rows.filter(r => r.c_match !== null);
  const rJudged = rows.filter(r => r.r_match !== null);
  return {
    rows,
    cAgreement: cJudged.length ? Math.round(100 * cJudged.filter(r => r.c_match).length / cJudged.length) : 'N/A',
    rAgreement: rJudged.length ? Math.round(100 * rJudged.filter(r => r.r_match).length / rJudged.length) : 'N/A',
    disagreements: rows.filter(r => r.c_match === false || r.r_match === false),
  };
}

// Real paid grader call — FULLY IMPLEMENTED and gated. It is not EXECUTED without
// INTAKE_GRADER_APPROVED=1 and a key, but the adapter path is complete and is
// validated offline with a mocked fetch (grader-live.test.mjs). Grader is
// provider-blind to the Intake and SEPARATE from the Intake endpoint.
//
// Returns per-fact graded objects (same shape the mock graders emit).
export async function gradeWithLLM(tasks, opts = {}) {
  const provider = opts.provider || GRADER_PROVIDER;
  const approved = process.env.INTAKE_GRADER_APPROVED === '1';
  const doFetch = opts.fetchImpl || globalThis.fetch;
  if (!opts.fetchImpl && !approved) {
    throw new Error('LLM grading not approved: set INTAKE_GRADER_APPROVED=1 after Joseph approves the grader budget (or pass opts.fetchImpl for an offline mock)');
  }
  const px = GRADER_PRICING[provider];
  if (!px) throw new Error(`unknown grader provider: ${provider}`);
  const key = provider === 'deepseek' ? process.env.DEEPSEEK_API_KEY : process.env.OPENAI_API_KEY;
  if (!opts.fetchImpl && !key) throw new Error(`grader ${provider} key missing in local env`);

  // Provider-blind rubric prompt. The tasks carry conversation + record + anchors
  // only (no Intake-provider identity). SAME rubric to both providers (no tuning).
  const rubric = 'You are a strict grader for an engineering-studio Session Intake benchmark. For EACH task, judge Collection (C) and Recording (R) separately against the anchors and the task instruction. Use ONLY the supplied conversation for C and ONLY the supplied record for R. Return a JSON object {"grades":[ ... ]} where each element is {factId, c_score, c_reason, c_evidenceTurns, c_quote, r_score, r_reason, r_fieldPath, r_value, uncertain}.';
  const userPayload = JSON.stringify({ tasks: tasks.map(t => ({ factId: t.factId, target: t.target, anchors: t.anchors, conversationEvidence: t.conversationEvidence, recordEvidence: t.recordEvidence, instruction: t.instruction })) });

  let url, body, headers = { 'Content-Type': 'application/json' };
  if (provider === 'deepseek') {
    url = `${process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'}/chat/completions`;
    headers.Authorization = `Bearer ${key}`;
    body = { model: px.model, messages: [{ role: 'system', content: rubric }, { role: 'user', content: userPayload }], max_tokens: 2000, response_format: { type: 'json_object' }, stream: false };
  } else {
    url = 'https://api.openai.com/v1/responses';
    headers.Authorization = `Bearer ${key}`;
    body = { model: px.model, store: false, max_output_tokens: 2000, instructions: rubric, input: userPayload, text: { format: { type: 'json_object' } } };
  }

  // Preserve the EXACT request we send (URL + headers + body), with the
  // Authorization header REDACTED so no credential is ever written to disk. This
  // is the verbatim request payload the grader receives (rubric + provider-blind
  // tasks); only the bearer token is masked.
  const rawRequest = {
    provider, model: px.model, url, method: 'POST',
    headers: { ...headers, ...(headers.Authorization ? { Authorization: 'Bearer [REDACTED]' } : {}) },
    body,                        // parsed body object (rubric + tasks), credential-free
    rubric, userPayload,         // the exact system rubric and user payload strings
  };

  const resp = await doFetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const json = await resp.json();
  // Normalize output text + usage across providers.
  let outputText = '';
  if (provider === 'deepseek') outputText = json?.choices?.[0]?.message?.content || '';
  else { outputText = typeof json?.output_text === 'string' ? json.output_text : ''; if (!outputText) for (const it of json?.output ?? []) for (const p of it?.content ?? []) if (p?.type === 'output_text') outputText = p.text; }
  const u = json?.usage || null;
  const usage = u ? { input_tokens: u.input_tokens ?? u.prompt_tokens ?? 0, output_tokens: u.output_tokens ?? u.completion_tokens ?? 0 } : null;
  const knownUsd = usage ? usage.input_tokens * px.in + usage.output_tokens * px.out : 0;
  // Preserve the raw provider response verbatim (parsed JSON body + extracted
  // output text + HTTP status) BEFORE any JSON.parse of the grades, so a parse
  // failure still leaves the raw response on record for human review.
  const rawResponse = { status: resp.status ?? null, body: json, outputText };
  let grades = [];
  let parseError = null;
  try { grades = JSON.parse(outputText).grades || []; }
  catch (e) { parseError = 'grader_output_parse'; if (!opts.preserveRawOnParseError) { const err = new Error('grader_output_parse'); err.rawRequest = rawRequest; err.rawResponse = rawResponse; err.usage = usage; err.knownUsd = knownUsd; throw err; } }
  return { provider, model: px.model, grades, usage, knownUsd, rawRequest, rawResponse, parseError };
}

// Configurable grader provider. Joseph's first candidate is DeepSeek. The grader
// is SEPARATE from the Intake and is blind to which provider produced the record.
export const GRADER_PROVIDER = process.env.INTAKE_GRADER_PROVIDER || 'deepseek';
export const GRADER_PRICING = {
  deepseek: { model: process.env.DEEPSEEK_MODEL || 'deepseek-flash', in: 0.30 / 1e6, out: 1.20 / 1e6 }, // peak, verified 2026-10-04
  openai: { model: process.env.OPENAI_INTAKE_MODEL || 'gpt-5-mini', in: 0.25 / 1e6, out: 2.00 / 1e6 },
};

// Separate C and R evidence validation (B3 item 2).
//  - C evidence is checked ONLY against the student conversation: the cited turn
//    indices are in range AND c_quote is an EXACT substring of a cited student turn.
//  - R evidence is checked ONLY against the record: when r_score>=1 the cited
//    r_fieldPath must exist in recordEvidence and r_value must equal that field's
//    value. When r_score==0 (an omission) NO record content is required — a
//    disclosed-but-unrecorded fact is a valid C=2 / R=0.
//  - Evidence existence is NOT equated with semantic correctness: a quote/field
//    that exists but does not support the claimed score is still a reviewable issue
//    (the code only confirms the citation is real; the human/grader owns meaning).
//  - Any invalid citation or grader uncertainty => needsHumanReview.
export function validateGraderEvidence(gradedFacts, tasksByFact) {
  return gradedFacts.map(g => {
    const task = tasksByFact[g.factId];
    const turns = (task && task.conversationEvidence) || [];
    const record = (task && task.recordEvidence) || {};
    const issues = [];

    // --- C: conversation evidence only ---
    const citedTurns = Array.isArray(g.c_evidenceTurns) ? g.c_evidenceTurns : [];
    const turnsInRange = citedTurns.every(t => Number.isInteger(t) && t >= 1 && t <= turns.length);
    if (!turnsInRange) issues.push('c_cited_turn_out_of_range');
    if (g.c_score >= 1) {
      if (!citedTurns.length) issues.push('c_missing_turn_citation');
      // Exact-quote check: c_quote must be a verbatim substring of a cited turn.
      const quote = typeof g.c_quote === 'string' ? g.c_quote.trim() : '';
      const quoteFound = quote && citedTurns.some(t => turnsInRange && String(turns[t - 1] || '').includes(quote));
      if (!quote) issues.push('c_missing_quote');
      else if (!quoteFound) issues.push('c_quote_not_in_cited_turn');
    }

    // --- R: record evidence only; R=0 omission needs no record content ---
    if (g.r_score >= 1) {
      const path = typeof g.r_fieldPath === 'string' ? g.r_fieldPath : '';
      const hasPath = path && Object.prototype.hasOwnProperty.call(record, path);
      if (!path) issues.push('r_missing_field_path');
      else if (!hasPath) issues.push('r_field_path_not_in_record');
      else {
        const actual = record[path];
        const cited = g.r_value;
        const valueMatches = actual != null && cited != null && String(actual).trim() === String(cited).trim();
        if (!valueMatches) issues.push('r_value_mismatch_vs_record');
        if (actual == null || String(actual).trim() === '') issues.push('r_retention_claimed_but_record_field_empty');
      }
    }
    // r_score==0: valid omission regardless of record content (no issue added).

    const needsHumanReview = Boolean(g.uncertain) || issues.length > 0;
    return { ...g, cEvidenceValid: !issues.some(i => i.startsWith('c_')), rEvidenceValid: !issues.some(i => i.startsWith('r_')),
      needsHumanReview, evidenceIssues: [...issues, ...(g.uncertain ? ['grader_uncertain'] : [])] };
  });
}
