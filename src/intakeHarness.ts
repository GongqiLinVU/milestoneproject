import { applyEvidenceUpdates, questionCount, MAX_INTAKE_QUESTIONS, type ChatSource, type EvidenceUpdate } from './intakePolicy.js';
import type { DeterministicIntakeAnswers } from './aiSessionIntake.js';

export const INTAKE_PARSER_VERSION = 'intake-parser.v1.0.0';
export type CandidateManifest = { model: string; promptVersion: string; policyVersion: string; parserVersion: string; evidenceSchemaVersion: string; knowledgeVersion: string; cost: number | null; latencyMs: number; stopReason: string };
export type IntakeCase = { id: string; provenance: string; conversation: ChatSource[]; candidate?: unknown; expected?: Record<string, unknown> };
export type FieldDecision = { index: number; field: string; outcome: 'accepted'|'repaired'|'rejected'; reason: string; originalSourceTurn: unknown; sourceTurn?: number; candidate: unknown };
export type TrialTrace = { caseId: string; manifest: CandidateManifest; conversation: ChatSource[]; rawCandidate: unknown; decisions: FieldDecision[]; route: string; extractionPending: boolean };
export type GradeResult = { caseId: string; gate: string; passed: boolean; detail: string };

const fields = new Set(['responsibility','claim','scope','evidence','verification_method','testing','blocker','next_action']);
const states = new Set(['student_claim','available','missing','unknown','planned','executed','needs_teacher','not_applicable','none']);
const allowedStates: Record<string,string[]> = {responsibility:['student_claim'],claim:['student_claim'],scope:['student_claim'],evidence:['available','missing','unknown','planned'],verification_method:['student_claim','planned'],testing:['executed','planned','unknown','not_applicable'],blocker:['needs_teacher','none','unknown','student_claim'],next_action:['planned','student_claim']};
const significant = (s: string) => new Set((s.toLowerCase().match(/[a-z0-9]+/g) || []).filter(t => t.length >= 4 && !['that','this','with','from','have','will','next','session','about','done','added','test','tested','completed'].includes(t)));
function grounded(candidate: EvidenceUpdate, source: string) {
  const parts = [candidate.value,candidate.method,candidate.observedResult,candidate.expectedEvidence].filter((s):s is string=>Boolean(s));
  const tokens = significant(parts.join(' '));
  const sourceTokens = significant(source);
  if (!tokens.size) return false;
  const identifiers = parts.join(' ').match(/\b(?:[a-f0-9]{6,40}|[A-Z]+-\d+|\d{3,}|https?:\/\/\S+)\b/gi) || [];
  if (identifiers.some(id => !source.toLowerCase().includes(id.toLowerCase()))) return false;
  if (candidate.field === 'testing' && candidate.state === 'executed' && (!candidate.observedResult || ![...significant(candidate.observedResult)].some(t=>sourceTokens.has(t)))) return false;
  return [...tokens].some(t => sourceTokens.has(t));
}
function validShape(u: any): u is EvidenceUpdate {
  return u && fields.has(u.field) && states.has(u.state) && allowedStates[u.field].includes(u.state) && typeof u.value === 'string' && u.value.length <= 1000
    && (u.value.trim() || ['unknown','missing','none','not_applicable'].includes(u.state))
    && ['evidenceType','progressKind','method','observedResult','expectedEvidence'].every(k => u[k] == null || typeof u[k] === 'string');
}
export type ReplayOptions = { sourcePolicy?: 'repair_unique' | 'strict_pointer' };
export function validateCandidates(raw: unknown, conversation: ChatSource[], current: DeterministicIntakeAnswers, options: ReplayOptions = {}) {
  const decisions: FieldDecision[] = [];
  const accepted: EvidenceUpdate[] = [];
  let next = { ...current };
  const items = Array.isArray(raw) ? raw.slice(0, 8) : [];
  items.forEach((item, index) => {
    const u = item as EvidenceUpdate;
    const base = {index,field: String(u?.field ?? 'unknown'),originalSourceTurn:u?.sourceTurn,candidate:item};
    const reject = (reason: string) => decisions.push({...base,outcome:'rejected',reason});
    if (!fields.has(u?.field)) return reject('field_not_allowed');
    if (!states.has(u.state) || !allowedStates[u.field].includes(u.state)) return reject('state_not_allowed_for_field');
    if (!validShape(u)) return reject('invalid_value_or_shape');
    if (u.field === 'testing' && u.state === 'executed' && (!u.method?.trim() || !u.observedResult?.trim())) return reject('executed_test_needs_method_and_observation');
    if (u.field === 'testing' && u.state !== 'executed' && u.observedResult?.trim()) return reject('unexecuted_test_has_observation');
    if (u.field === 'evidence' && u.state === 'available' && !u.evidenceType) return reject('evidence_type_missing');
    let source = u.sourceTurn;
    let outcome: 'accepted'|'repaired' = 'accepted';
    if (!Number.isInteger(source) || conversation[source]?.actor !== 'student' || !grounded(u,conversation[source].text)) {
      if (options.sourcePolicy === 'strict_pointer') return reject('source_pointer_invalid_strict_policy');
      const matches = conversation.flatMap((turn,i) => turn.actor === 'student' && grounded(u,turn.text) ? [i] : []);
      if (matches.length !== 1) return reject('student_source_not_uniquely_grounded');
      source = matches[0]; outcome = 'repaired';
    }
    if ((u.field === 'next_action' || (u.field === 'testing' && u.state === 'planned')) && !/\b(will|plan|planning|intend|going to|next session|before (?:the )?next)\b/i.test(conversation[source].text)) return reject('future_action_not_student_accepted');
    const candidate = {...u,sourceTurn:source};
    try { next = applyEvidenceUpdates(next,[candidate],conversation); }
    catch { return reject('evidence_application_failed'); }
    accepted.push(candidate);
    decisions.push({...base,outcome,reason:outcome === 'repaired'?'source_relocated_to_unique_student_turn':'student_source_valid',sourceTurn:source});
  });
  return {answers:next,accepted,decisions,extractionPending:!accepted.length};
}

const safeMessage = (s: unknown) => typeof s === 'string' && s.trim().length > 0 && s.length <= 500
  && !/\b(mark(?:s|ing)?|grade|verified|teacher approved|you cheated)\b/i.test(s);
export function decideTurn(candidate: any, conversation: ChatSource[], current: DeterministicIntakeAnswers, options: ReplayOptions = {}) {
  const extracted = validateCandidates(candidate?.evidenceUpdates,conversation,current,options);
  const message = safeMessage(candidate?.assistantMessage) ? candidate.assistantMessage.trim() : null;
  const currentReply=conversation.at(-1)?.text || '';
  const action = extracted.accepted.some(u => u.field === 'next_action' && u.state === 'planned' && u.sourceTurn === conversation.length-1)
    || Boolean(current.nextAction && /\b(?:i\s+)?will do (?:it|that) next session\b/i.test(currentReply));
  const established = Boolean(extracted.answers.progress && extracted.answers.evidenceReference && extracted.answers.verificationMethod && extracted.answers.nextAction);
  const teacher = extracted.accepted.some(u => u.field === 'blocker' && u.state === 'needs_teacher') || /\bteacher\b.{0,30}\bhelp\b/i.test(conversation.at(-1)?.text || '');
  const limit = questionCount(conversation) >= MAX_INTAKE_QUESTIONS;
  const review = limit || teacher || (action && established);
  const route = review ? 'review' : candidate?.route === 'small_step' ? 'small_step' : 'continue';
  const routeReason = teacher ? 'student_requested_teacher_help' : limit ? 'question_limit_reached' : action && established ? 'accepted_next_action_and_evidence_ready' : candidate?.route === 'small_step' ? 'model_small_step_proposal' : 'continue_collecting';
  const assistantMessage = review
    ? teacher ? 'Review your request for Teacher help and the evidence captured so far before confirming.' : 'Review what you completed, what you observed, and what is planned for the next Session before confirming.'
    : message && /\?\s*$/.test(message) ? message : fallbackQuestion(extracted.answers,conversation);
  return {...extracted,route,routeDecision:{proposed:String(candidate?.route ?? 'unspecified'),final:route,reason:routeReason},readyForReview:review,assistantMessage,level:extracted.accepted.length ? extracted.decisions.some(d=>d.outcome==='rejected')?'L1':'L0' : message?'L2':'L3'};
}
export function fallbackQuestion(answers: DeterministicIntakeAnswers, conversation: ChatSource[]) {
  if (questionCount(conversation) >= MAX_INTAKE_QUESTIONS) return 'Review what you have told us and correct any missing details before confirming.';
  if (!answers.progress) return 'What is one specific thing you completed, tried, or discovered this Session?';
  if (!answers.evidenceReference) return 'What commit, demo, file, or observation could show that work?';
  if (!answers.nextAction) return 'What one feasible step will you take before the next Session?';
  return 'Is anything blocking that next step or requiring Teacher help?';
}
