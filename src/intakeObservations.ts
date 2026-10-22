import {REVIEW_CONTRACT_VERSION} from './intakeReviewContract.js';
// Debug-only sidecar. Never feeds a routing, extraction, or save decision.
export const OBSERVATION_VERSION = 'intake-observation.v1.1';
type Obj = Record<string, any>;
type DebugEvent = {at:string;mode:string;request:Obj;response?:Obj;error?:string};
export function buildHarnessObservations(events:DebugEvent[]) {
  const observations:Obj[]=[];
  // These are observed runtime interventions, not actions performed by this sidecar.
  const interventions:Obj[]=[];
  const record=(index:number,kind:string,detail:Obj)=>interventions.push({eventIndex:index,kind,...detail});
  const add=(event:DebugEvent,index:number,kind:string,detail:Obj)=>{
    const conversation=Array.isArray(event.request.conversation)?event.request.conversation:[];
    observations.push({id:`event-${index+1}:${kind}:${observations.length+1}`,level:'O',kind,
      detectorVersion:OBSERVATION_VERSION,eventIndex:index,at:event.at,
      round:conversation.filter((t:Obj)=>t.actor==='student').length,
      evidence:{conversation:conversation.map((t:Obj,turnIndex:number)=>({turnIndex,actor:t.actor,text:t.text})),...detail},
      interpretation:'Recorded trace fact; not a verdict about the student.',
      warning:{displayed:false,audience:null},action:{executed:false}});
  };
  events.forEach((event,index)=>{
    const response=event.response;
    add(event,index,'turn_snapshot',{request:event.request,response:response??null,error:event.error??null});
    if(event.error)add(event,index,'request_failed',{error:event.error,cause:'Not established beyond the recorded error code.'});
    if(!response)return;
    if(Array.isArray(response.usageWarnings)&&response.usageWarnings.length)add(event,index,'usage_warning',{warnings:response.usageWarnings,audience:'developer',displayed:false});
    if(response.extractionPending||response.providerFailure)add(event,index,'extraction_pending',{extractionPending:response.extractionPending??null,providerFailure:response.providerFailure??null});
    if(response.routeDecision)add(event,index,'routing_comparison',{routeDecision:response.routeDecision,
      legacyIntervention:response.routeDecision.proposed!==response.routeDecision.final||response.rawCandidate?.assistantMessage!==response.result?.assistantMessage,
      proposedMessage:response.rawCandidate?.assistantMessage??null,deliveredMessage:response.result?.assistantMessage??null});
    if(response.routeDecision?.proposed && response.routeDecision?.final && response.routeDecision.proposed!==response.routeDecision.final)
      record(index,'route_override',{before:response.routeDecision.proposed,after:response.routeDecision.final,reason:response.routeDecision.reason});
    if(typeof response.rawCandidate?.assistantMessage==='string' && typeof response.result?.assistantMessage==='string' && response.rawCandidate.assistantMessage!==response.result.assistantMessage)
      record(index,'message_replacement',{before:response.rawCandidate.assistantMessage,after:response.result.assistantMessage,reason:response.routeDecision?.reason??'not_recorded'});
    const decisions=Array.isArray(response.fieldDecisions)?response.fieldDecisions:[];
    decisions.forEach((decision:Obj)=>{
      add(event,index,'field_decision',{decision});
      if(decision.observations?.length)add(event,index,'semantic_uncertainty',{field:decision.field,reasons:decision.observations,displayed:false,affectsAcceptance:false});
      if(decision.outcome==='rejected')record(index,'field_rejection',{field:decision.field,reason:decision.reason,before:decision.candidate,after:null});
      if(decision.outcome==='repaired')record(index,'source_relocation',{field:decision.field,before:decision.originalSourceTurn,after:decision.sourceTurn,reason:decision.reason});
      if(decision.transformations?.length)record(index,'field_rewrite',{field:decision.field,changedProperties:decision.transformations,before:decision.candidate,after:decision.appliedCandidate});
      if(decision.recordBefore && decision.recordAfter){
        const replaced=Object.keys(decision.recordBefore).filter(k=>{
          const before=decision.recordBefore[k],after=decision.recordAfter[k];
          return typeof before==='string' && Boolean(before.trim()) && before!==after;
        });
        if(replaced.length)record(index,'record_value_replacement',{field:decision.field,keys:replaced,before:decision.recordBefore,after:decision.recordAfter,interpretation:'Replacement observed; may be a valid correction or information loss. Not automatically an error.'});
      }
    });
    const coverage=decisions.some((d:Obj)=>d.appliedCandidate)?'detailed':'legacy_partial';
    if(event.mode==='turn')add(event,index,'intervention_coverage',{coverage,limitations:coverage==='legacy_partial'?['Field rewrites and intermediate record replacements were not recorded in this historical trace.']:[]});
    const result=response.result??response.rawCandidate;
    if(event.mode==='turn' && result && (result.readyForReview===true || result.route==='review')){
      add(event,index,'review_readiness',{reviewContractVersion:response.manifest?.reviewContractVersion??'legacy_unversioned',currentReviewContractVersion:REVIEW_CONTRACT_VERSION,
        information:result.assessment?.information??null,gap:result.assessment?.gap??null,uncertainties:result.uncertainties??[],
        routeReason:response.routeDecision?.reason??null,legacyStopReasonMeaning:'sufficient_information is a legacy save category for model review; not an independently verified completeness verdict',source:'model_self_report_not_verified',affectsConversation:false});
      if(result.assessment?.information==='sparse')add(event,index,'sparse_review_exit',{
        information:'sparse',gap:result.assessment?.gap??null,uncertainties:result.uncertainties??[],
        routeReason:response.routeDecision?.reason??null,interpretation:'Sparse information at review exit; may be a premature close or a valid bounded/support/refusal exit. Requires human review.',affectsConversation:false});
    }
    if(response.result?.consistencyObservations?.length)add(event,index,'record_consistency',{reasons:response.result.consistencyObservations,displayed:false,affectsConversation:false});
    if(Array.isArray(response.result?.uncertainties)&&response.result.uncertainties.length)add(event,index,'model_uncertainty',{uncertainties:response.result.uncertainties,source:'model_self_report_not_verified'});
  });
  return {schemaVersion:OBSERVATION_VERSION,mode:'observation_only',
    scope:'This sidecar does not intervene. Existing runtime controls are reported separately and are not disabled by this export.',
    levels:{O:'Record evidence without intervention',W:'Display a non-blocking warning',A:'Execute an explicitly enabled intervention'},
    enabledLevels:['O'],indexing:'eventIndex and turnIndex are zero-based; round counts student messages in that request.',
    summary:{events:events.length,observations:observations.length,warningsDisplayed:0,actionsExecuted:0,
      observerActionsExecuted:0,observedRuntimeInterventions:interventions.length},
    runtimeInterventions:{scope:'Observed existing controls across extraction, record projection, messages and routing. Separate from sidecar O/W/A counts.',
      items:interventions,coverage:'Only recorded decisions are counted; missing historical details are not treated as zero interventions.'},observations};
}
