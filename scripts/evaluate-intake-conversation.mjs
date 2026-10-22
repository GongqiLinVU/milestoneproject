// Run after npm run test:build. Historical mode makes NO model calls.
import fs from 'node:fs';
import {CONVERSATION_INSTRUCTIONS,conversationSchema,parseConversationReply} from '../.test-api/src/intakeConversation.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../tests/ai-session-intake/fixtures/conversation-acceptance.json',import.meta.url),'utf8'));
export function gradeReply(testCase,reply){
 const words=reply.assistantMessage.trim().split(/\s+/).length;
 return {id:testCase.id,expectedReadyForReview:testCase.expectedReadyForReview,actualReadyForReview:reply.readyForReview,words,pass:reply.readyForReview===testCase.expectedReadyForReview&&words<=fixture.maxWords};
}
const live=process.argv.includes('--live');
if(live && (process.env.INTAKE_CONVERSATION_EVAL_APPROVED!=='1'||!process.env.OPENAI_API_KEY))throw new Error('Live eval requires INTAKE_CONVERSATION_EVAL_APPROVED=1 and OPENAI_API_KEY in the environment; never paste keys into chat.');
const model=process.env.OPENAI_INTAKE_MODEL||'gpt-5-mini';const results=[];
for(const c of fixture.cases.slice(0,7)){
 if(!live){if(c.historicalReply)results.push({...gradeReply(c,c.historicalReply),source:'historical combined-task reply; NOT new model output'});continue;}
 const started=Date.now();
 const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',signal:AbortSignal.timeout(45000),headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model,store:false,max_output_tokens:2500,...(model==='gpt-5-mini'?{reasoning:{effort:'low'}}:{}),instructions:CONVERSATION_INSTRUCTIONS,input:JSON.stringify({session:{sessionNumber:7,focus:'Application Progress + Technical Implementation Report'},priorRole:'UI design and frontend implementation',priorNextAction:null,conversation:c.conversation.map((t,turnIndex)=>({actor:t.actor==='student'?'student':'assistant',text:t.text,turnIndex}))}),text:{format:{type:'json_schema',name:'intake_conversation',strict:true,schema:conversationSchema}}})});
 const body=await response.json();const output=body.output_text??body.output?.flatMap(i=>i.content??[]).find(p=>p.type==='output_text')?.text;
 if(!response.ok||body.status==='incomplete'){results.push({id:c.id,pass:false,error:body.status==='incomplete'?'provider_incomplete':`http_${response.status}`,incompleteReason:body.incomplete_details?.reason??null,usage:body.usage,latencyMs:Date.now()-started});continue;}
 try{const reply=parseConversationReply(JSON.parse(output));results.push({...gradeReply(c,reply),reply,usage:body.usage,latencyMs:Date.now()-started});}catch{results.push({id:c.id,pass:false,error:'invalid_conversation_reply',usage:body.usage});}
}
const report={mode:live?'live':'historical_baseline',model:live?model:null,actualModelCalls:live?results.length:0,maxCalls:7,outputTokenLimitPerCall:2500,pass:results.filter(x=>x.pass).length,total:results.length,results};
console.log(JSON.stringify(report,null,2));if(live&&results.some(x=>!x.pass))process.exitCode=1;
