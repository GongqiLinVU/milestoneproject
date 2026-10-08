import type { DeterministicIntakeAnswers, FallbackTurn } from './aiSessionIntake.js';

export const INTAKE_POLICY_VERSION = 'adaptive-intake.v1.1.0';
export const INTAKE_PROMPT_VERSION = 'session-intake-ai.v1.3.0';
export const MAX_INTAKE_QUESTIONS = 8; // Three core directions plus at most five follow-ups.
export const MAX_INTAKE_TURNS = 17; // Eight question/answer pairs and final review message.
export type ChatSource = { actor: 'system' | 'student'; purpose: string; text: string };
export function questionCount(turns: ChatSource[]) {
  return turns.filter(t => t?.actor === 'system' && t.purpose !== 'review transition').length;
}
export function conversationErrors(turns: ChatSource[], forSave = false): string[] {
  if (!Array.isArray(turns) || turns.length < 2 || turns.length > MAX_INTAKE_TURNS) return ['Conversation length is invalid'];
  const errors: string[] = [];
  if (forSave && (turns.length % 2 !== 1 || turns.at(-1)?.purpose !== 'review transition')) errors.push('Final review transition is required');
  turns.forEach((t, i) => {
    if (!t || typeof t !== 'object') { errors.push('Conversation content is invalid'); return; }
    const review = forSave && i === turns.length - 1 && t.purpose === 'review transition';
    if (t.actor !== (i % 2 ? 'student' : 'system') || (t.purpose === 'review transition' && !review)) errors.push('Conversation order is invalid');
    if (typeof t.text !== 'string' || !t.text.trim() || t.text.length > 2000 || typeof t.purpose !== 'string' || t.purpose.length < 3 || t.purpose.length > 80) errors.push('Conversation content is invalid');
  });
  if (!forSave && turns.at(-1)?.actor !== 'student') errors.push('Current student answer is required');
  if (questionCount(turns) > MAX_INTAKE_QUESTIONS) errors.push('Question budget exceeded');
  return [...new Set(errors)];
}
export function sourceConversation(turns: ChatSource[]): FallbackTurn[] {
  const errors = conversationErrors(turns, true);
  if (errors.length) throw new Error(errors.join('; '));
  return turns.map(({actor, purpose, text}) => ({actor, purpose, text}));
}
export type EvidenceUpdate = {
  field: 'responsibility'|'claim'|'scope'|'evidence'|'verification_method'|'testing'|'blocker'|'next_action';
  value: string;
  state: 'student_claim'|'available'|'missing'|'unknown'|'planned'|'executed'|'needs_teacher'|'not_applicable'|'none';
  sourceTurn: number;
  evidenceType: DeterministicIntakeAnswers['evidenceType'] | null;
  progressKind: DeterministicIntakeAnswers['progressKind'] | null;
  method: string | null;
  observedResult: string | null;
  expectedEvidence: string | null;
};
export function shouldReviewAcceptedAction(assessment: Record<string, unknown>, updates: EvidenceUpdate[], turns: ChatSource[]) {
  const lastStudent = turns.length - 1;
  return assessment.evidenceReadiness === 'identified' && assessment.verificationReadiness === 'clear'
    && assessment.actionability === 'clear'
    && updates.some(u => u.field === 'next_action' && u.state === 'planned' && u.sourceTurn === lastStudent && Boolean(u.value.trim()));
}
// Single authoritative review decision for the UI (Phase C, Failure 3).
//
// The backend decideTurn() is the ONE authority on whether a turn moves to
// review: it already folds in the question-budget limit, an explicit
// teacher-help request, and the "accepted next action AND evidence established"
// rule, using the VALIDATED evidence (not the model's self-reported assessment).
// The UI previously recomputed its own verdict from the model's assessment via
// shouldReviewAcceptedAction() and could override continue -> review
// (accepted_action_ui_override), so backend and UI disagreed on the same turn.
//
// The UI now DEFERS to the backend decision. We still surface the budget limit
// explicitly for the transition message, but the limit is already part of the
// backend's review verdict, so this never diverges from it.
export type IntakeReviewDecision = {
  readonly review: boolean;
  readonly reason: string;
  readonly source: 'backend';
};
export function uiReviewDecision(
  backend: { readyForReview: boolean; route: string; routeDecision?: { reason?: string } },
  turns: ChatSource[],
): IntakeReviewDecision {
  const review = backend.readyForReview || backend.route === 'review';
  const reason = questionCount(turns) >= MAX_INTAKE_QUESTIONS
    ? 'question_limit_reached'
    : backend.routeDecision?.reason || (review ? 'server_review_decision' : 'continue_collecting');
  return { review, reason, source: 'backend' };
}
export function changedEvidenceFields(current: DeterministicIntakeAnswers, next: DeterministicIntakeAnswers, updates: EvidenceUpdate[]) {
  const keys: Record<EvidenceUpdate['field'], (keyof DeterministicIntakeAnswers)[]> = {
    responsibility:['responsibility'], claim:['progress','progressKind'], scope:['scope'],
    evidence:['evidenceType','evidenceAvailability','evidenceReference'], verification_method:['verificationMethod'],
    testing:['testingStatus','testingMethod','testingResult'], blocker:['blockerStatus','blockerDescription','supportRequested'],
    next_action:['nextAction','expectedEvidence']
  };
  return [...new Set(updates.map(u=>u.field))].filter(field=>keys[field].some(key=>current[key]!==next[key]));
}
export function applyEvidenceUpdates(current: DeterministicIntakeAnswers, updates: EvidenceUpdate[], turns: ChatSource[]) {
  const next = {...current};
  for (const u of updates) {
    if (!Number.isInteger(u.sourceTurn) || turns[u.sourceTurn]?.actor !== 'student') throw new Error('Evidence source must identify a student answer');
    const value = u.value.trim();
    if (u.field === 'responsibility' && value) next.responsibility = value;
    if (u.field === 'claim' && value) { next.progress = value; if(u.progressKind) next.progressKind=u.progressKind; }
    if (u.field === 'scope' && value) next.scope=value;
    if (u.field === 'evidence') {
      next.evidenceType=u.evidenceType || 'other';
      next.evidenceAvailability=u.state==='available'?'available_now':u.state==='planned'?'expected_later':u.state==='missing'?'not_produced':'unknown';
      next.evidenceReference=value;
    }
    if (u.field === 'verification_method') next.verificationMethod=value;
    if (u.field === 'testing') {
      // Phase C, Failure 1: a student-disclosed UNTESTED path (state 'missing',
      // e.g. "I still have not tested what happens when the API returns an error")
      // must be preserved WITHOUT replacing an executed test and WITHOUT inventing
      // an observed result. The intake carries a single testingStatus scalar, so
      // the untested path is recorded as an explicit coverage limitation on the
      // test entry (baseline_or_expected) rather than collapsing all testing to
      // one untested state. If no executed test exists yet, it degrades to
      // 'unknown' (we never fabricate an executed/not_applicable claim).
      if (u.state === 'missing') {
        const note = `Not tested by student: ${value || 'disclosed untested path'}`;
        if (next.testingStatus === 'executed') {
          next.testingBaseline = next.testingBaseline ? `${next.testingBaseline}; ${note}` : note;
        } else {
          next.testingStatus = 'unknown';
          next.testingBaseline = next.testingBaseline ? `${next.testingBaseline}; ${note}` : note;
        }
        continue;
      }
      // A future test is a next action; it cannot erase a test already performed this Session.
      if (next.testingStatus === 'executed' && u.state !== 'executed') continue;
      next.testingStatus=u.state==='executed'?'executed':u.state==='planned'?'planned_not_executed':u.state==='not_applicable'?'not_applicable':'unknown';
      next.testingMethod=u.method || '';
      next.testingResult=u.state==='executed' ? u.observedResult || '' : '';
    }
    if (u.field === 'blocker') {
      next.blockerStatus=u.state==='none'?'none':u.state==='unknown'?'unknown':'active';
      next.blockerDescription=value;
      next.supportRequested=u.state==='needs_teacher'?value:next.supportRequested;
    }
    if (u.field === 'next_action') {next.nextAction=value;next.expectedEvidence=u.expectedEvidence || '';}
  }
  return next;
}
