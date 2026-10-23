// Conversation control only; no project vocabulary or per-turn record extraction.
export const CHAT_STOP_VERSION='intake-chat-stop.v1';
export const MAX_CHAT_CLARIFICATIONS=2;
export const CHAT_TARGETS=['work','next','support'] as const;
export type ChatTarget=typeof CHAT_TARGETS[number];
export type QuestionMeta={target:ChatTarget;sig:string};
export type ChatBudget={clarificationsUsed:number;usedTargets:ChatTarget[];unverifiedQuestions:number};
export const REVIEW_INVITATION='You can now check and confirm your summary.';
export function clarificationIndexes(conversation:Array<{actor:string}>){
  // API validates alternating messages. Opening is index 0. Do not trust purpose.
  return conversation.flatMap((t,i)=>i>0&&t.actor==='system'?[i]:[]);
}
export function chatStopDecision(budget:ChatBudget,proposal:any){
  const end=(reason:string,intervened=true)=>({readyForReview:true,reason,intervened,assistantMessage:REVIEW_INVITATION,target:'none' as const});
  if(budget.clarificationsUsed>=MAX_CHAT_CLARIFICATIONS)return end('clarification_budget_exhausted');
  if(!proposal||typeof proposal.assistantMessage!=='string'||!proposal.assistantMessage.trim()||proposal.assistantMessage.length>240||typeof proposal.readyForReview!=='boolean'||typeof proposal.reason!=='string'||proposal.reason.length>160||typeof proposal.effect!=='string'||proposal.effect.length>160)return end('invalid_chat_format');
  if(![...CHAT_TARGETS,'none'].includes(proposal.target))return end('invalid_or_no_target');
  if(proposal.readyForReview)return end('model_ready',false);
  if(proposal.target==='none')return end('invalid_or_no_target');
  if(budget.usedTargets.includes(proposal.target))return end('target_exhausted');
  return {readyForReview:false,reason:'continue_collecting',intervened:false,assistantMessage:proposal.assistantMessage.trim(),target:proposal.target as ChatTarget};
}

// Existing SQL accepts four legacy stop categories. Detailed controller reasons
// remain in chatControl/debug; do not widen the database contract.
export function chatStopSaveReason(reason:string):'sufficient_information'|'budget_exhausted'|'provider_failure'{
  if(reason==='model_ready')return 'sufficient_information';
  if(reason==='invalid_chat_format')return 'provider_failure';
  return 'budget_exhausted';
}
