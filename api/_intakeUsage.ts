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
export async function reserveUsage(admin:any,authUserId:string,sessionId:string,requestId:string,attempt:number,provider:string,model:string,pricing:any,inputCeiling:number,outputCeiling:number,scope?:{blockId:string;studentId:string}){
 const {data,error}=await admin.rpc('reserve_session_intake_ai_attempt',{p_auth_user_id:authUserId,p_session_id:sessionId,p_request_id:requestId,p_attempt:attempt,p_provider:provider,p_model:model,p_pricing_version:pricing.version,p_input_ceiling:inputCeiling,p_output_ceiling:outputCeiling,p_input_rate:pricing.inputUsdPerMillion,p_output_rate:pricing.outputUsdPerMillion});
 if(!error&&data?.attemptId)return data;
 // The legacy RPC still provides atomic eligibility and duplicate-request checks.
 // Only its four known financial refusals are advisory. Never bypass other refusals.
 const advisory=['AI trial budget not configured','AI usage needs reconciliation','Session AI attempt limit reached','Block AI budget reached'];
 if(!error||!advisory.includes(error.message)||!scope){
  const eligibility=['Session AI access denied','Session AI is not open','Progress already recorded','AI request already reserved'];
  throw Error(error&&eligibility.includes(error.message)?'usage_reservation_refused':'usage_accounting_unavailable');
 }
 const cost=Math.ceil((inputCeiling*pricing.inputUsdPerMillion+outputCeiling*pricing.outputUsdPerMillion)/1000000*100000000)/100000000;
 const inserted=await admin.from('session_intake_ai_usage').insert({block_id:scope.blockId,session_id:sessionId,auth_user_id:authUserId,student_id:scope.studentId,request_id:requestId,attempt,provider,model,pricing_version:pricing.version,input_ceiling:inputCeiling,output_ceiling:outputCeiling,input_rate:pricing.inputUsdPerMillion,output_rate:pricing.outputUsdPerMillion,reserved_usd:cost,charged_usd:cost}).select('id').single();
 if(inserted.error||!inserted.data?.id)throw Error('usage_accounting_unavailable');
 return {attemptId:inserted.data.id,reservedUsd:cost,pricingVersion:pricing.version,warning:'financial_limit_observed_not_enforced'};
}
export async function finishUsage(admin:any,id:string,body:any,provider:string) {
 const u=body?.usage;const input=provider==='deepseek'?u?.prompt_tokens:u?.input_tokens;const output=provider==='deepseek'?u?.completion_tokens:u?.output_tokens;
 const valid=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
 const {data,error}=await admin.rpc('finish_session_intake_ai_attempt',{p_attempt_id:id,p_input_tokens:valid(input)?input:null,p_output_tokens:valid(output)?output:null,p_reported_model:reportedModelLabel(body?.model)});
 if(error||!data)throw Error('usage_settlement_unavailable');return data;
}
