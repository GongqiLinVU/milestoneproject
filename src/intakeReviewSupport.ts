import {buildFallbackStudentRecord,validateIntakeStudentRecord,type DeterministicIntakeAnswers,type IntakeStudentRecord,type IntakeValidationResult} from './aiSessionIntake.js';
export const FOCUSED_REVIEW_VERSION='focused-review.v1';
export function buildFocusedStudentRecord(answers:DeterministicIntakeAnswers,hasPrevious:boolean){
 const record=buildFallbackStudentRecord({...answers,scope:answers.scope||answers.responsibility},{},hasPrevious);
 record.evidence[0].reference=answers.evidenceReference.trim()||null;return record;
}
const completeness=new Set(['available evidence needs a reference and verification method','expected evidence needs a verification method','not-required evidence needs a reason','executed testing needs method and observed result','active or resolved blocker needs a description','next action, due Session and expected evidence are required']);
// Keep structural/source rules. Missing optional facts are not a submission gate.
export function validateFocusedIntakeRecord(value:IntakeStudentRecord):IntakeValidationResult {
 const validationCopy=Array.isArray(value?.claims)?{...value,claims:value.claims.map(c=>c.progress_kind==='unknown'?{...c,progress_kind:'advanced' as const}:c)}:value;
 const strict=validateIntakeStudentRecord(validationCopy),errors:string[]='errors' in strict?strict.errors.filter(e=>!completeness.has(e)):[];
 const optional=(v:unknown,max:number)=>v==null||typeof v==='string'&&v.length<=max;
 if(!value?.next_action||typeof value.next_action.action!=='string'||value.next_action.action.length>1000||typeof value.next_action.expected_evidence!=='string'||value.next_action.expected_evidence.length>1000||!/^S([1-9]|10)$/.test(value.next_action.due_session))errors.push('Next-step structure is invalid');
 for(const e of Array.isArray(value?.evidence)?value.evidence:[])if(!optional(e.reference,1000)||!optional(e.verification_method,1000)||!optional(e.not_required_reason,500))errors.push('Evidence text is invalid');
 for(const t of Array.isArray(value?.testing)?value.testing:[])if(!optional(t.method,1000)||!optional(t.observed_result,1000)||!optional(t.baseline_or_expected,1000))errors.push('Testing text is invalid');
 if(value?.blocker&&(!optional(value.blocker.description,1000)||!optional(value.blocker.support_requested,500)))errors.push('Help text is invalid');
 return errors.length?{valid:false,errors:[...new Set(errors)]}:{valid:true,value};
}
export type ReviewDebugEvent={at:string;mode:string;request:Record<string,unknown>;response?:Record<string,unknown>;error?:string};
export function packReviewDebug(events:ReviewDebugEvent[]) {
 let packed:ReviewDebugEvent[]=events.slice(-32).map(e=>({...e,request:{...e.request,conversation:undefined,currentEvidence:undefined,conversationLength:Array.isArray(e.request.conversation)?e.request.conversation.length:undefined}}));
 if(JSON.stringify(packed).length>160000)packed=packed.map(e=>({...e,response:e.response?{model:e.response.model,reportedModel:e.response.reportedModel,manifest:e.response.manifest,usage:e.response.usage,usageWarnings:e.response.usageWarnings,result:e.response.result,diagnostics:e.response.diagnostics,reason:e.response.reason,providerRequestId:e.response.providerRequestId,traceDetailOmitted:true}:undefined,request:{conversationLength:e.request.conversationLength}}));
 // A diagnostic must never make the underlying check-in unsaveable.
 while(JSON.stringify(packed).length>160000&&packed.length)packed.shift();
 if(packed.length)packed[0].request={...packed[0].request,capturedEventCount:events.length,savedEventCount:packed.length};
 return packed;
}
export function restoreReviewDebug(events:unknown,conversation:unknown[]):ReviewDebugEvent[] {
 if(!Array.isArray(events))return [];
 return events.filter(e=>e&&typeof e.at==='string'&&typeof e.mode==='string').map(e=>({...e,request:{...e.request,conversation:conversation.slice(0,Number(e.request?.conversationLength)||0)}}));
}
