import { randomUUID } from 'node:crypto';
export function usagePricing(provider:string,model:string,env:Record<string,string|undefined>=process.env) {
 let map:any;try{map=JSON.parse(env.INTAKE_USAGE_PRICING_JSON||'');}catch{throw Error('pricing_not_configured');}
 const p=map?.[provider];
 if(!p||p.model!==model||typeof p.version!=='string'||!p.version.trim()||!Number.isFinite(p.inputUsdPerMillion)||!Number.isFinite(p.outputUsdPerMillion)
 ||p.inputUsdPerMillion<0||p.outputUsdPerMillion<0||p.inputUsdPerMillion+p.outputUsdPerMillion<=0)throw Error('pricing_not_configured');
 return p;
}
// Returned labels are optional provenance; never parse them into a model identity.
export function reportedModelLabel(value:unknown):string|null {return typeof value==='string'?Array.from(Buffer.from(value,'utf8').toString('utf8')).slice(0,200).join(''):null;}
export function requestIdentity(value:unknown) {return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)?value:randomUUID();}
export async function reserveUsage(admin:any,authUserId:string,sessionId:string,requestId:string,attempt:number,provider:string,model:string,pricing:any,inputCeiling:number,outputCeiling:number){
 const {data,error}=await admin.rpc('reserve_session_intake_ai_attempt',{p_auth_user_id:authUserId,p_session_id:sessionId,p_request_id:requestId,p_attempt:attempt,p_provider:provider,p_model:model,p_pricing_version:pricing.version,p_input_ceiling:inputCeiling,p_output_ceiling:outputCeiling,p_input_rate:pricing.inputUsdPerMillion,p_output_rate:pricing.outputUsdPerMillion});
 if(error||!data?.attemptId)throw Error('usage_reservation_refused');return data;
}
export async function finishUsage(admin:any,id:string,body:any,provider:string) {
 const u=body?.usage;const input=provider==='deepseek'?u?.prompt_tokens:u?.input_tokens;const output=provider==='deepseek'?u?.completion_tokens:u?.output_tokens;
 const valid=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
 const {data,error}=await admin.rpc('finish_session_intake_ai_attempt',{p_attempt_id:id,p_input_tokens:valid(input)?input:null,p_output_tokens:valid(output)?output:null,p_reported_model:reportedModelLabel(body?.model)});
 if(error||!data)throw Error('usage_settlement_unavailable');return data;
}
