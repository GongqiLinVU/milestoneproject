import type { DeterministicIntakeAnswers, FallbackTurn } from './aiSessionIntake.js';

export const INTAKE_POLICY_VERSION = 'adaptive-intake.v1.1.0';
export const INTAKE_PROMPT_VERSION = 'session-intake-ai.v1.3.1';
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
  operation?: 'add'|'replace';
  contextTurn?: number|null;
  supportRequested?: string|null;
  nextActionStatus?: 'planned'|'tentative'|'unknown'|'none';
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
// The backend is the single review authority: the model decides when enough
// has been collected, bounded by the agreed round limit. The UI must not add
// field-completeness or teacher-keyword stop rules.
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
    testing:['testingStatus','testingMethod','testingResult','testingBaseline'], blocker:['blockerStatus','blockerDescription','supportRequested'],
    next_action:['nextAction','expectedEvidence']
  };
  return [...new Set(updates.map(u=>u.field))].filter(field=>keys[field].some(key=>current[key]!==next[key]));
}
export function applyEvidenceUpdates(current: DeterministicIntakeAnswers, updates: EvidenceUpdate[], turns: ChatSource[]) {
  const next = {...current};
  const merge=(before:string|undefined,value:string,replace=false,max=1000)=>{
    if(value.length>max)throw new Error('record_capacity_exceeded');
    if(replace||!before?.trim())return value;
    // Mechanical whitespace/sentence-period equality only; no synonym/fuzzy matching.
    const key=(text:string)=>text.trim().replace(/\s+/g,' ').replace(/([a-zA-Z])\.$/,'$1');
    const lines=before.split('\n'),incoming=value.split('\n').filter(line=>line.trim());
    const unique=incoming.filter((line,i)=>!lines.some(prior=>key(prior)===key(line))&&!incoming.slice(0,i).some(prior=>key(prior)===key(line)));
    if(!unique.length)return before;
    value=unique.join('\n');
    const combined=`${before}\n${value}`;
    if(combined.length>max)throw new Error('record_capacity_exceeded');
    return combined;
  };
  for (const u of updates) {
    if (!Number.isInteger(u.sourceTurn) || turns[u.sourceTurn]?.actor !== 'student') throw new Error('Evidence source must identify a student answer');
    const value = u.value.trim();
    if (u.field === 'responsibility' && value) next.responsibility = value;
    if (u.field === 'claim' && value) {
      const previous=next.progress;
      next.progress=merge(previous,value,u.operation==='replace');
      if(u.progressKind&&(u.operation==='replace'||next.progress!==previous))next.progressKind=previous&&previous!==value&&u.operation!=='replace'&&next.progressKind!==u.progressKind?(next.progressKind==='unknown'||u.progressKind==='unknown'?'unknown':'advanced'):u.progressKind;
    }
    if (u.field === 'scope' && value) next.scope=value;
    if (u.field === 'evidence') {
      const hasOther=Boolean(next.evidenceReference && next.evidenceReference!==value && u.operation!=='replace');
      const availability=u.state==='available'?'available_now':u.state==='planned'?'expected_later':u.state==='missing'?'not_produced':'unknown';
      next.evidenceType=hasOther&&next.evidenceType!==u.evidenceType?'other':u.evidenceType || 'other';
      next.evidenceAvailability=hasOther&&next.evidenceAvailability!==availability?'unknown':availability;
      next.evidenceReference=merge(next.evidenceReference,value,u.operation==='replace');
    }
    if (u.field === 'verification_method') next.verificationMethod=merge(next.verificationMethod,value,u.operation==='replace');
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
        if(u.operation==='replace'){next.testingStatus='unknown';next.testingMethod='';next.testingResult='';next.testingBaseline=note;}
        else if (next.testingStatus === 'executed') {
          next.testingBaseline = merge(next.testingBaseline,note); 
        } else {
          next.testingStatus = 'unknown';
          next.testingBaseline = merge(next.testingBaseline,note); 
        }
        continue;
      }
      // A future test is a next action; it cannot erase a test already performed this Session.
      if (next.testingStatus === 'executed' && u.state !== 'executed' && u.operation!=='replace') {
        if(u.state==='planned')next.testingBaseline=merge(next.testingBaseline,`Planned, not executed: ${value}`);
        continue;
      }
      if(u.operation==='replace')next.testingBaseline='';
      if(u.state==='unknown'&&value)next.testingBaseline=merge(next.testingBaseline,value,u.operation==='replace');
      const keep=next.testingStatus==='executed' && u.state==='executed' && u.operation!=='replace';
      next.testingStatus=u.state==='executed'?'executed':u.state==='planned'?'planned_not_executed':u.state==='not_applicable'?'not_applicable':'unknown';
      next.testingMethod=merge(keep?next.testingMethod:'',u.method || '');
      next.testingResult=u.state==='executed' ? merge(keep?next.testingResult:'',u.observedResult || '') : ''; 
    }
    if (u.field === 'blocker') {
      next.blockerStatus=u.state==='none'?'none':u.state==='unknown'?'unknown':'active';
      next.blockerDescription=merge(next.blockerDescription,value,u.operation==='replace'||u.state==='none');
      next.supportRequested=u.supportRequested!=null?u.supportRequested:u.state==='needs_teacher'?merge(next.supportRequested,value,u.operation==='replace',500):u.state==='none'||u.operation==='replace'?'':next.supportRequested;
    }
    if (u.field === 'next_action') {next.nextActionStatus=u.nextActionStatus||'planned';next.nextAction=merge(next.nextAction,value,u.operation==='replace');next.expectedEvidence=merge(next.expectedEvidence,u.expectedEvidence || '',u.operation==='replace');}
  }
  return next;
}
