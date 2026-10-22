import { applyEvidenceUpdates, questionCount, MAX_INTAKE_QUESTIONS, type ChatSource, type EvidenceUpdate } from './intakePolicy.js';
import {MAX_EVIDENCE_UPDATES} from './intakeContract.js';
import type { DeterministicIntakeAnswers } from './aiSessionIntake.js';

export const INTAKE_PARSER_VERSION = 'intake-parser.v1.4.2';
export type CandidateManifest = { model: string; promptVersion: string; policyVersion: string; parserVersion: string; evidenceSchemaVersion: string; knowledgeVersion: string; cost: number | null; latencyMs: number; stopReason: string };
export type IntakeCase = { id: string; provenance: string; conversation: ChatSource[]; candidate?: unknown; expected?: Record<string, unknown> };
export type FieldDecision = { index: number; field: string; outcome: 'accepted'|'repaired'|'rejected'; reason: string; originalSourceTurn: unknown; sourceTurn?: number; candidate: unknown; observations?: string[]; appliedCandidate?: EvidenceUpdate; transformations?: string[]; recordBefore?: Record<string,unknown>; recordAfter?: Record<string,unknown> };
export type TrialTrace = { caseId: string; manifest: CandidateManifest; conversation: ChatSource[]; rawCandidate: unknown; decisions: FieldDecision[]; route: string; extractionPending: boolean };
export type GradeResult = { caseId: string; gate: string; passed: boolean; detail: string };

const fields = new Set(['responsibility','claim','scope','evidence','verification_method','testing','blocker','next_action']);
const states = new Set(['student_claim','available','missing','unknown','planned','executed','needs_teacher','not_applicable','none']);
const allowedStates: Record<string,string[]> = {responsibility:['student_claim'],claim:['student_claim'],scope:['student_claim'],evidence:['available','missing','unknown','planned'],verification_method:['student_claim','planned'],testing:['executed','planned','unknown','not_applicable','missing'],blocker:['needs_teacher','none','unknown','student_claim'],next_action:['planned','student_claim','unknown']};
const significant = (s: string) => new Set((s.toLowerCase().match(/[a-z0-9]+/g) || []).filter(t => t.length >= 4 && !['that','this','with','from','have','will','next','session','about','done','added','test','tested','completed'].includes(t)));
// Phase C, Failure 2: verification artifacts a student must explicitly name to
// be recorded as THEIR commitment. The assistant frequently PROPOSES one of
// these ("...or provide the commit SHA", "upload a screenshot", "attach a log");
// a sourceTurn that merely points at a student turn does not make the artifact
// student-supported. If a next_action / verification_method / evidence candidate
// names an artifact the student never used in the sourced turn, the candidate
// imported an assistant proposal and is not semantically supported.
const artifactTerms: Array<[RegExp, RegExp]> = [
  [/\bcommit\b/i, /\bcommit\b/i],
  [/\bsha\b/i, /\bsha\b/i],
  [/\bscreenshot\b/i, /\bscreenshot\b/i],
  [/\bupload(?:ed|s)?\b/i, /\bupload(?:ed|s)?\b/i],
  [/\b(?:console\s+)?log(?:s|ged)?\b/i, /\b(?:console\s+)?log(?:s|ged)?\b/i],
];
// Returns an unsupported artifact term when the candidate names it but the
// sourced student turn does not; null when the candidate is clean.
function unsupportedArtifact(candidate: EvidenceUpdate, source: string): string | null {
  if (!['next_action','verification_method','evidence'].includes(candidate.field)) return null;
  const text = [candidate.value, candidate.expectedEvidence].filter((s): s is string => Boolean(s)).join(' ');
  for (const [inCandidate, inSource] of artifactTerms) {
    if (inCandidate.test(text) && !inSource.test(source)) return inCandidate.source;
  }
  return null;
}

// Retained legacy numeric-decoration guard. Other semantic wording is observed,
// not stripped token by token; student confirmation remains the review boundary.
const tidy = (s: string) => s.replace(/\s+/g, ' ').replace(/\(\s*\)/g, '').replace(/\s+([.,;:)])/g, '$1').replace(/\(\s+/g, '(').trim();
// Remove an unsupported BARE, free-standing number the student did not state,
// plus any now-empty "(e.g., N)" / "(N)" wrapper or dangling "e.g." fragment.
//
// "Bare" is deliberate: a digit run that is part of a structured token — a
// version ("v2.1.0"), date ("2026-10-08"), filename ("report_2.csv"), path,
// hex/identifier ("abc123") or a unit ("500ms") — must NOT be stripped, because
// the digits there carry a fact (possibly disclosed in an earlier student turn)
// rather than illustrative decoration. We therefore only match a digit run with
// no adjacent letter, digit, or `.`/`-`/`/`/`:` on either side.
function stripUnsupportedNumbers(text: string, source: string): string {
  const low = source.toLowerCase();
  const SENT = '\u0000';
  // (?<![\w./:\-]) / (?![\w./:\-]) keep structured tokens intact.
  let out = text.replace(/(?<![\w./:\-])\d+(?![\w./:\-])/g, n => low.includes(n.toLowerCase()) ? n : SENT);
  out = out.replace(new RegExp(`\\(\\s*(?:e\\.?g\\.?,?\\s*)?${SENT}\\s*\\)`, 'gi'), '');
  out = out.replace(new RegExp(`\\be\\.?g\\.?,?\\s*${SENT}`, 'gi'), '');
  out = out.replace(new RegExp(SENT, 'g'), '');
  return tidy(out);
}
// Numeric decoration is still removed as an explicitly traced legacy action.
// Method wording is retained; semantic paraphrase is not judged by token deletion.
function sanitiseAgainstSource(candidate: EvidenceUpdate, source: string): EvidenceUpdate {
  const numClean = (v: string | null | undefined) =>
    typeof v === 'string' && v.trim() ? stripUnsupportedNumbers(v, source) : v ?? null;
  const out: EvidenceUpdate = {
    ...candidate,
    value: typeof candidate.value === 'string' ? (numClean(candidate.value) || candidate.value) : candidate.value,
    observedResult: numClean(candidate.observedResult),
    expectedEvidence: numClean(candidate.expectedEvidence),
    method: numClean(candidate.method),
  };

  return out;
}
function grounded(candidate: EvidenceUpdate, source: string) {
  const parts = (candidate.field==='next_action'?[candidate.value]:[candidate.value,candidate.method,candidate.observedResult,candidate.expectedEvidence]).filter((s):s is string=>Boolean(s));
  const tokens = significant(parts.join(' '));
  const sourceTokens = significant(source);
  if (!tokens.size) return false;
  // A student-disclosed UNTESTED path (testing + 'missing') is an ABSENCE, not a
  // cited artifact: it cannot carry a verification reference, and the model often
  // decorates it with an illustrative status code the student never said (e.g.
  // "API error (e.g., 500) not tested"). For this state only, do not treat a bare
  // numeric like an HTTP status as an identifier that must appear in the source;
  // hashes, ticket ids and URLs are still rejected if unsupported.
  const untestedDisclosure = candidate.field === 'testing' && candidate.state === 'missing';
  const identifierPattern = untestedDisclosure
    ? /\b(?:[a-f0-9]{6,40}|[A-Z]+-\d+|https?:\/\/\S+)\b/gi
    : /\b(?:[a-f0-9]{6,40}|[A-Z]+-\d+|\d{3,}|https?:\/\/\S+)\b/gi;
  const identifiers = parts.join(' ').match(identifierPattern) || [];
  if (identifiers.some(id => !source.toLowerCase().includes(id.toLowerCase()))) return false;
  if (candidate.field === 'testing' && candidate.state === 'executed' && (!candidate.observedResult || ![...significant(candidate.observedResult)].some(t=>sourceTokens.has(t)))) return false;
  return [...tokens].some(t => sourceTokens.has(t));
}
// Resolve only competing lexical matches with at least two action anchors
// exclusive to one student turn. Shared words such as "code" cannot decide.
// This locates a source; it does not verify the meaning or truth of a claim.
function uniqueActionSource(u: EvidenceUpdate, matches: number[], conversation: ChatSource[]): number | null {
  if(u.field!=='next_action'||matches.length<2)return null;
  const actionTokens=significant(u.value);
  const anchors=matches.map(i=>({i,tokens:[...significant(conversation[i].text)].filter(t=>actionTokens.has(t))}));
  const owners=new Map<string,number>();
  for(const a of anchors)for(const t of a.tokens)owners.set(t,(owners.get(t)||0)+1);
  const distinctive=anchors.filter(a=>a.tokens.filter(t=>owners.get(t)===1).length>=2);
  return distinctive.length===1?distinctive[0].i:null;
}
function validShape(u: any): u is EvidenceUpdate {
  return u && fields.has(u.field) && states.has(u.state) && allowedStates[u.field].includes(u.state) && typeof u.value === 'string' && u.value.length <= 1000
    && (u.operation == null || ['add','replace'].includes(u.operation))
    && (u.value.trim() || ['unknown','missing','none','not_applicable'].includes(u.state))
    && ['evidenceType','progressKind','method','observedResult','expectedEvidence'].every(k => u[k] == null || typeof u[k] === 'string'&&u[k].length<=1000)
    && (u.supportRequested==null||typeof u.supportRequested==='string'&&u.supportRequested.length<=500);
}
export type MessagePolicy = 'current' | 'legacy_v1' | 'none';
export type ReplayOptions = { sourcePolicy?: 'repair_unique' | 'strict_pointer'; messagePolicy?: MessagePolicy };
export function validateCandidates(raw: unknown, conversation: ChatSource[], current: DeterministicIntakeAnswers, options: ReplayOptions = {}) {
  const decisions: FieldDecision[] = [];
  const accepted: EvidenceUpdate[] = [];
  let next = { ...current };
  const items = Array.isArray(raw) ? raw.slice(0, MAX_EVIDENCE_UPDATES+4) : [];
  items.forEach((item, index) => {
    let u = item as EvidenceUpdate;
    const repairs:string[]=[];
    if(u?.field==='claim' && u.state==='available'){u={...u,state:'student_claim'};repairs.push('claim_state_normalized');}
    if(u?.field==='verification_method' && u.state==='available'){u={...u,state:'student_claim'};repairs.push('verification_state_normalized');}
    if(u?.field==='testing' && u.state==='student_claim' && !u.observedResult){u={...u,state:'unknown'};repairs.push('testing_state_unknown');}
    if(u?.field==='claim' && u.progressKind==null){
      const kinds=[...new Set(items.filter((x:any)=>x?.sourceTurn===u.sourceTurn && x?.progressKind!=null).map((x:any)=>x.progressKind))];
      const kind=kinds.length===1&&kinds[0]==='no_progress'?'no_progress':'unknown';
      u={...u,progressKind:kind};repairs.push(kind==='unknown'?'progress_kind_unknown':'misplaced_progress_kind_recovered');
    }
    const base = {index,field: String(u?.field ?? 'unknown'),originalSourceTurn:u?.sourceTurn,candidate:item};
    const reject = (reason: string) => decisions.push({...base,outcome:'rejected',reason});
    if (!fields.has(u?.field)) return reject('field_not_allowed');
    if (!states.has(u.state) || !allowedStates[u.field].includes(u.state)) return reject('state_not_allowed_for_field');
    if (!validShape(u)) return reject('invalid_value_or_shape');
    if (u.field === 'testing' && u.state === 'executed' && (!u.method?.trim() || !u.observedResult?.trim())) return reject('executed_test_needs_method_and_observation');
    if (u.field === 'testing' && u.state !== 'executed' && u.observedResult?.trim()) return reject('unexecuted_test_has_observation');
    if (u.field === 'evidence' && u.state === 'available' && !u.evidenceType) return reject('evidence_type_missing');
    let source = u.sourceTurn;
    let contextual=u.contextTurn!=null;
    if(contextual){
      const proposed=u.contextTurn!+1;
      if(Number.isInteger(u.contextTurn)&&conversation[u.contextTurn!]?.actor==='system'&&conversation[proposed]?.actor==='student'&&(source===proposed||u.contextTurn===conversation.length-2)&&(grounded(u,conversation[proposed].text)||source===proposed&&grounded(u,conversation[u.contextTurn!].text))){
        if(source!==proposed){source=proposed;repairs.push('source_relocated_using_context');}
        if(!['next_action','verification_method','evidence','testing'].includes(u.field)||u.field==='testing'&&u.state==='executed'){
          contextual=false;repairs.push('unneeded_context_ignored');
        }
      }else if(Number.isInteger(source)&&conversation[source]?.actor==='student'&&grounded(u,conversation[source].text)){
        contextual=false;repairs.push('unneeded_context_ignored');
      }else {
        const matches=conversation.flatMap((turn,i)=>turn.actor==='student'&&grounded(u,turn.text)?[i]:[]);
        if(options.sourcePolicy==='strict_pointer'||Number.isInteger(source)&&conversation[source]?.actor==='student'||matches.length!==1)return reject('invalid_acceptance_context');
        source=matches[0];contextual=false;repairs.push('invalid_context_recovered_from_unique_student_source');
      }
    }
    const sourceText=(i:number)=>conversation[i].text+(contextual?' '+conversation[u.contextTurn!].text:'');
    let outcome: 'accepted'|'repaired' = repairs.some(r=>r==='invalid_context_recovered_from_unique_student_source'||r==='source_relocated_using_context')?'repaired':'accepted';
    if (!Number.isInteger(source) || conversation[source]?.actor !== 'student' || !(u.field==='next_action'&&u.state==='unknown')&&!grounded(u,sourceText(source))) {
      if (options.sourcePolicy === 'strict_pointer') return reject('source_pointer_invalid_strict_policy');
      const matches = conversation.flatMap((turn,i) => turn.actor === 'student' && grounded(u,turn.text) ? [i] : []);
      const anchored=uniqueActionSource(u,matches,conversation);
      if (matches.length !== 1 && anchored==null) return reject('student_source_not_uniquely_grounded');
      source = anchored??matches[0]; outcome = 'repaired';
      if(anchored!=null)repairs.push('source_relocated_using_distinct_action_anchors');
    }
    const observations:string[]=[...repairs];
    if(u.field==='claim' && source<conversation.length-1)observations.push('claim_reemitted_from_earlier_turn');
    if(contextual)observations.push('contextual_acceptance_model_inferred');
    if(u.field==='testing' && u.method){
      const sourceTokens=significant(conversation[source].text);
      if([...significant(u.method)].some(t=>!sourceTokens.has(t)))observations.push('method_wording_differs_from_source');
    }
    if ((u.field === 'next_action' || (u.field === 'testing' && u.state === 'planned')) && !/\b(will|plan|planning|intend|going to|next session|before (?:the )?next)\b/i.test(conversation[source].text)) observations.push('future_action_commitment_uncertain');
    if(u.expectedEvidence){const sourceTokens=significant(sourceText(source));if([...significant(u.expectedEvidence)].some(t=>!sourceTokens.has(t)))observations.push('expected_evidence_wording_uncertain');}
    // Auxiliary evidence must not change which student turn grounds an action,
    // nor erase that action because the model decorated its expected artifact.
    if(u.field==='next_action' && u.expectedEvidence && unsupportedArtifact({...u,value:u.expectedEvidence,expectedEvidence:null},sourceText(source))){
      u={...u,expectedEvidence:null};observations.push('unsupported_expected_evidence_omitted');
    }
    const unsupported = unsupportedArtifact(u, sourceText(source));
    if (unsupported) return reject('student_source_not_semantically_supported');
    // Strip unsupported specificity (illustrative numbers, model method
    // paraphrase) from the record-bound text while preserving supported content.
    const candidate = sanitiseAgainstSource({...u,contextTurn:contextual?u.contextTurn:u.contextTurn==null?u.contextTurn:null,sourceTurn:source}, sourceText(source));
    const keys: Record<string,string[]> = {
      responsibility:['responsibility'],claim:['progress','progressKind'],scope:['scope'],
      evidence:['evidenceType','evidenceAvailability','evidenceReference'],verification_method:['verificationMethod'],
      testing:['testingStatus','testingMethod','testingResult','testingBaseline'],
      blocker:['blockerStatus','blockerDescription','supportRequested'],next_action:['nextAction','expectedEvidence','nextActionStatus']
    };
    const snapshot = (a: DeterministicIntakeAnswers) => Object.fromEntries(keys[u.field].map(k=>[k,(a as any)[k]]));
    const recordBefore=snapshot(next);
    const transformations=['state','progressKind','contextTurn','value','method','observedResult','expectedEvidence'].filter(k=>(item as any)[k] !== (candidate as any)[k]);
    try { next = applyEvidenceUpdates(next,[candidate],conversation); }
    catch(error) { return reject(error instanceof Error&&error.message==='record_capacity_exceeded'?'record_capacity_exceeded':'evidence_application_failed'); }
    accepted.push(candidate);
    decisions.push({...base,outcome,reason:outcome === 'repaired'?'source_relocated_to_unique_student_turn':'student_source_valid',sourceTurn:source,observations,appliedCandidate:candidate,transformations,recordBefore,recordAfter:snapshot(next)});
  });
  return {answers:next,accepted,decisions,extractionPending:!accepted.length};
}

// Blocks the model from asserting its OWN authority over the student (grading,
// verifying, accusing) — not any mention of these words in a benign, first-person
// student-attributed sentence. A bare word match (the previous check) rejected
// safe messages like "...and verified by loading the page..." (describing what
// the STUDENT did), which silently produced the same fallback question twice.
const unsafeMessagePatterns = [
  /\b(you|your work|this)\s+(?:has been|is|was)\s+(?:mark(?:ed)?|grad(?:ed)?|verified|teacher[- ]approved)\b/i,
  /\bi\s+(?:mark|grade|verify|have verified)\b/i,
  /\byou\s+cheated\b/i,
];
const safeMessage = (s: unknown) => typeof s === 'string' && s.trim().length > 0 && s.length <= 500
  && !unsafeMessagePatterns.some(pattern => pattern.test(s));
// Reconstructed pre-fix guardrail (see commit 63b1754) — kept ONLY for harness
// replay so the three fixed regressions stay visible/comparable in the tool;
// never used for live traffic. Represents the final pre-fix state: a bare
// word-blocklist plus a "message contains ? anywhere" shape check (the
// widened-but-still-broken form the fix commit removed entirely).
const legacyUnsafeWords = /\b(mark(?:s|ing)?|grade|verified|teacher approved|you cheated)\b/i;
const legacyQuestionShape = /\?/;
function messageAccepted(raw: unknown, policy: MessagePolicy): string | null {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > 500) return null;
  const trimmed = raw.trim();
  if (policy === 'none') return trimmed; // no guardrail at all — baseline for "how much would slip through"
  if (policy === 'legacy_v1') return !legacyUnsafeWords.test(trimmed) && legacyQuestionShape.test(trimmed) ? trimmed : null;
  return safeMessage(trimmed) ? trimmed : null; // 'current' (default) — must match deployed behavior exactly
}
export function decideTurn(candidate: any, conversation: ChatSource[], current: DeterministicIntakeAnswers, options: ReplayOptions = {}) {
  let updates=Array.isArray(candidate?.evidenceUpdates)?[...candidate.evidenceUpdates]:[];
  const consistencyObservations:string[]=[];
  if(candidate?.nextStep){
    const step=candidate.nextStep;
    if(step.status==='unknown'&&candidate?.assessment?.actionability==='clear')consistencyObservations.push('actionable_assessment_without_structured_next_step');
    if(['planned','tentative'].includes(step.status)&&typeof step.action==='string'&&step.action.trim())updates.push({field:'next_action',value:step.action,state:'planned',operation:'replace',sourceTurn:step.sourceTurn,contextTurn:step.contextTurn,nextActionStatus:step.status,expectedEvidence:step.expectedEvidence,evidenceType:null,progressKind:null,method:null,observedResult:null});
    else if(['unknown','none'].includes(step.status)&&step.action==null&&(!current?.nextAction||Number.isInteger(step.sourceTurn)))updates.push({field:'next_action',value:'',state:'unknown',operation:'replace',sourceTurn:step.sourceTurn??conversation.length-1,contextTurn:null,nextActionStatus:step.status,expectedEvidence:'',evidenceType:null,progressKind:null,method:null,observedResult:null});
  }else{
    updates=updates.map((u:any)=>u.field==='next_action'&&u.state==='student_claim'&&['needs_small_step','unknown'].includes(candidate?.assessment?.actionability)?{...u,value:'',state:'unknown',nextActionStatus:'unknown',operation:'replace'}:u);
    if(!updates.some((u:any)=>u.field==='next_action')&&candidate?.assessment?.actionability==='clear')consistencyObservations.push('actionable_assessment_without_structured_next_step');
    if(current?.nextActionStatus==='unknown'){let replaced=false;updates=updates.map((u:any)=>{if(u.field!=='next_action'||u.state!=='planned')return u;const operation=replaced?'add':'replace';replaced=true;return {...u,operation};});}
  }
  if(candidate?.nextStep && ['planned','tentative'].includes(candidate.nextStep.status) && Array.isArray(candidate.nextStep.additionalActions)){
    for(const step of candidate.nextStep.additionalActions.slice(0,3))if(step && ['planned','tentative'].includes(step.status) && typeof step.action==='string' && step.action.trim())updates.push({field:'next_action',value:step.action,state:'planned',operation:'add',sourceTurn:step.sourceTurn,contextTurn:step.contextTurn,nextActionStatus:step.status,expectedEvidence:step.expectedEvidence,evidenceType:null,progressKind:null,method:null,observedResult:null});
  }
  const extracted = validateCandidates(updates,conversation,current,options);
  if(candidate?.nextStep&&['planned','tentative'].includes(candidate.nextStep.status)&&!extracted.accepted.some(u=>u.field==='next_action'))consistencyObservations.push('structured_next_step_not_applied');
  if(candidate?.nextStep?.additionalActions?.length && extracted.decisions.some(d=>d.field==='next_action'&&d.outcome==='rejected'))consistencyObservations.push('some_structured_steps_not_applied');
  const message = messageAccepted(candidate?.assistantMessage, options.messagePolicy ?? 'current');
  const limit = questionCount(conversation) >= MAX_INTAKE_QUESTIONS;
  const modelReview = candidate?.readyForReview === true || candidate?.route === "review";
  const review = limit || modelReview;
  const route = review ? 'review' : candidate?.route === 'small_step' ? 'small_step' : candidate?.route === 'teacher_help' ? 'teacher_help' : 'continue';
  const routeReason = limit ? 'question_limit_reached' : modelReview ? 'model_ready_for_review' : candidate?.route === 'teacher_help' ? 'model_teacher_help' : candidate?.route === 'small_step' ? 'model_small_step_proposal' : 'continue_collecting';
  // safeMessage() already rejects the actually dangerous content (the model
  // claiming to grade/verify/accuse the student), so a punctuation shape
  // check on top of that (must contain "?") is redundant and too strict: a
  // legitimate closing/summary statement like "Noted — I'll check commit
  // abc123 and the follow-up fix." has no "?" at all and was still being
  // discarded for the same static fallback question. Any safe, non-empty
  // message from the model is used as-is.
  const assistantMessage = limit
    ? 'We have reached the check-in round limit. Review what you shared; you can correct or leave optional details blank before saving.'
    : message || (review ? 'Review what you shared before confirming.' : fallbackQuestion(extracted.answers,conversation));
  return {...extracted,consistencyObservations,route,routeDecision:{proposed:String(candidate?.route ?? 'unspecified'),final:route,reason:routeReason},readyForReview:review,assistantMessage,level:extracted.accepted.length ? extracted.decisions.some(d=>d.outcome==='rejected')?'L1':'L0' : message?'L2':'L3'};
}
export function fallbackQuestion(answers: DeterministicIntakeAnswers, conversation: ChatSource[]) {
  if (questionCount(conversation) >= MAX_INTAKE_QUESTIONS) return 'Review what you have told us and correct any missing details before confirming.';
  // answers may be absent (e.g. a first turn, or a client that only sends the
  // conversation). The deterministic fallback must never throw — a provider
  // failure has to still return a usable question so answers are preserved.
  const a = answers ?? ({} as Partial<DeterministicIntakeAnswers>);
  if (!a.progress) return 'What is one specific thing you completed, tried, or discovered this Session?';
  if (!a.evidenceReference) return 'What commit, demo, file, or observation could show that work?';
  if (!a.nextAction) return 'What one feasible step will you take before the next Session?';
  return 'Is anything blocking that next step or requiring Teacher help?';
}
