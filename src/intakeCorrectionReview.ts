import type {DeterministicIntakeAnswers,IntakeStudentRecord} from './aiSessionIntake.js';
export type ReviewSelection={claim:number;evidence:number;testing:number};
export const firstReviewSelection:ReviewSelection={claim:0,evidence:0,testing:0};
export function correctionReviewAnswers(record:IntakeStudentRecord,s=firstReviewSelection):DeterministicIntakeAnswers {
 const c=record.claims[s.claim],e=record.evidence[s.evidence],t=record.testing[s.testing];
 return {responsibility:record.responsibility.current,progress:c?.statement||'',progressKind:c?.progress_kind||'unknown',scope:c?.scope||'',completionPercent:c?.completion_percent??null,
 evidenceType:e?.type||'other',evidenceAvailability:e?.availability||'unknown',evidenceReference:e?.reference||'',verificationMethod:e?.verification_method||'',
 testingStatus:t?.execution_status||'unknown',testingMethod:t?.method||'',testingResult:t?.observed_result||'',testingBaseline:t?.baseline_or_expected||'',
 blockerStatus:record.blocker.status,blockerDescription:record.blocker.description||'',supportRequested:record.blocker.support_requested||'',
 nextAction:record.next_action.action,dueSession:record.next_action.due_session,expectedEvidence:record.next_action.expected_evidence};
}
// Patch the saved record directly. Never rebuild it from the flat review form:
// that would discard additional claims, IDs, percentages and other untouched facts.
export function updateCorrectionReview(record:IntakeStudentRecord,field:keyof DeterministicIntakeAnswers,value:string,s=firstReviewSelection):IntakeStudentRecord {
 const copy=structuredClone(record);
 const paths:Partial<Record<keyof DeterministicIntakeAnswers,string[]>>={responsibility:['responsibility','current'],progress:['claims',String(s.claim),'statement'],progressKind:['claims',String(s.claim),'progress_kind'],scope:['claims',String(s.claim),'scope'],
 evidenceReference:['evidence',String(s.evidence),'reference'],verificationMethod:['evidence',String(s.evidence),'verification_method'],
 testingStatus:['testing',String(s.testing),'execution_status'],testingMethod:['testing',String(s.testing),'method'],testingResult:['testing',String(s.testing),'observed_result'],testingBaseline:['testing',String(s.testing),'baseline_or_expected'],
 blockerDescription:['blocker','description'],supportRequested:['blocker','support_requested'],nextAction:['next_action','action'],dueSession:['next_action','due_session'],expectedEvidence:['next_action','expected_evidence']};
 const path=paths[field];if(!path)return copy;
 let target:any=copy;for(const key of path.slice(0,-1)){if(target?.[key]==null)throw Error('This saved summary has no matching item to edit.');target=target[key];}
 target[path[path.length-1]]=value===''&&['evidenceReference','verificationMethod','testingMethod','testingResult','testingBaseline','supportRequested'].includes(field)?null:value;
 return copy;
}
