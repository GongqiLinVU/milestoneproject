// Debug-only sidecar. Never feeds a routing, extraction, or save decision.
export const OBSERVATION_VERSION = 'intake-observation.v1';
type Obj = Record<string, any>;
type DebugEvent = {at:string;mode:string;request:Obj;response?:Obj;error?:string};
export function buildHarnessObservations(events:DebugEvent[]) {
  const observations:Obj[]=[];
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
    if(Array.isArray(response.fieldDecisions))response.fieldDecisions.forEach((decision:Obj)=>add(event,index,'field_decision',{decision}));
    if(Array.isArray(response.result?.uncertainties)&&response.result.uncertainties.length)add(event,index,'model_uncertainty',{uncertainties:response.result.uncertainties,source:'model_self_report_not_verified'});
  });
  return {schemaVersion:OBSERVATION_VERSION,mode:'observation_only',
    scope:'This sidecar does not intervene. Existing runtime controls are reported separately and are not disabled by this export.',
    levels:{O:'Record evidence without intervention',W:'Display a non-blocking warning',A:'Execute an explicitly enabled intervention'},
    enabledLevels:['O'],indexing:'eventIndex and turnIndex are zero-based; round counts student messages in that request.',
    summary:{events:events.length,observations:observations.length,warningsDisplayed:0,actionsExecuted:0},observations};
}
