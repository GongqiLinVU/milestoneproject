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
