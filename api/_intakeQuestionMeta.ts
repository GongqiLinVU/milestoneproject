import {createHmac,timingSafeEqual} from 'node:crypto';
import {clarificationIndexes,type ChatBudget,type ChatTarget,type QuestionMeta,CHAT_TARGETS} from '../src/intakeChatStop.js';
const domain='engineering-studio/intake-question/v1';
// Reuse the existing server-only secret with domain separation. Never send it
// or use a public/anon key. Rotation invalidates receipts, not saved records.
const digest=(secret:string,binding:string,conversation:any[],index:number,target:string)=>createHmac('sha256',secret).update(JSON.stringify([domain,binding,index,target,conversation.slice(0,index+1).map(t=>[t.actor,t.text])])).digest('hex');
export function signQuestion(secret:string,binding:string,conversation:any[],index:number,target:ChatTarget):QuestionMeta{
  if(!secret)throw new Error('question_signing_unavailable');
  return {target,sig:digest(secret,binding,conversation,index,target)};
}
export function questionBudget(secret:string,binding:string,conversation:any[]):ChatBudget{
  const indexes=clarificationIndexes(conversation);const usedTargets:ChatTarget[]=[];let unverifiedQuestions=0;
  for(const i of indexes){
    const m=conversation[i].questionMeta;
    if(!secret||!m||!CHAT_TARGETS.includes(m.target)||typeof m.sig!=='string'||!/^[a-f0-9]{64}$/.test(m.sig)||!timingSafeEqual(Buffer.from(m.sig,'hex'),Buffer.from(digest(secret,binding,conversation,i,m.target),'hex'))){unverifiedQuestions++;continue;}
    if(!usedTargets.includes(m.target))usedTargets.push(m.target);
  }
  return {clarificationsUsed:indexes.length,usedTargets,unverifiedQuestions};
}
