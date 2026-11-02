export function debugAvailability(ai:Record<string,any>|null|undefined) {
 const events=Array.isArray(ai?.debug_events)?ai.debug_events:[];
 if(!events.length)return {status:'no_saved_debug',savedEventCount:0,capturedEventCount:null};
 const captured=events[0]?.request?.capturedEventCount;
 const known=Number.isInteger(captured)&&captured>=events.length;
 const partial=events.some((event:any)=>event?.response?.traceDetailOmitted===true)||(known&&captured>events.length);
 return {status:partial?'saved_partial':known?'saved_within_capture_limit':'saved_extent_unknown',savedEventCount:events.length,capturedEventCount:known?captured:null};
}
export async function collectIntakeDiagnostics(fetchPage:(after:string|null,asOf:string|null)=>Promise<any>) {
 const records:any[]=[];const seen=new Set<string>();let after:string|null=null,asOf:string|null=null,first:any;
 do {
  const page=await fetchPage(after,asOf);
  if(!page||page.formatVersion!=='intake-diagnostics.v1'||!Array.isArray(page.records)||typeof page.asOf!=='string')throw Error('Invalid diagnostics response.');
  if(asOf&&page.asOf!==asOf)throw Error('Export snapshot changed. Please retry.');
  if(!first)first=page;asOf=page.asOf;
  for(const record of page.records){if(typeof record.intakeId!=='string'||seen.has(record.intakeId))throw Error('Duplicate or invalid Intake in export.');seen.add(record.intakeId);records.push({...record,debugAvailability:debugAvailability(record.aiAssistance)});}
  const next=page.nextCursor;
  if(next!==null&&(typeof next!=='string'||next===after||!page.records.length))throw Error('Invalid diagnostics page cursor.');
  after=next;
 }while(after);
 return {formatVersion:first.formatVersion,exportedAt:new Date().toISOString(),asOf,class:first.class,sessionId:first.sessionId,recordCount:records.length,rosterMetadata:'Student names and team numbers are current at export, not historical submission snapshots.',debugNote:'Saved diagnostics only. Requests may be compacted; unsaved conversations are not included. No data has been deleted.',records};
}
