import type {ReviewCriterion} from './intakeReviewStandards';

type ReviewedArea={criteria?:ReviewCriterion[];notes?:string};
const actions:Record<string,string>={
 'ai-token-context':'Demonstrate how you keep conversation history and output within the model’s limits.',
 'ai-exception-recovery':'Test an API failure and show how the application recovers or falls back safely.',
 'ai-workflow-controls':'Walk through the checks before and after the model call, and demonstrate the relevant controls.',
 'ai-request-data':'Show the model request with sensitive values removed, and explain what each part contains.',
 'ai-evaluation':'Run representative test cases and bring the results, including any incorrect answers.',
 'ai-unsupported':'Record examples of incorrect or unsupported outputs and explain what you will change.',
 'ai-purpose-model':'Explain why this feature uses the selected model and where its limitations matter.',
 'ai-security-boundary':'Show how keys and sensitive data are protected and how untrusted input is handled.',
 'web-responsive':'Demonstrate that the affected pages are readable and usable on the required screens.',
 'failure-cases':'Test the relevant failure or boundary cases and bring the results.',
};
export function suggestFollowUps(items:ReviewedArea[],excluded:Set<string>,limit:number){
 const candidates=items.flatMap(item=>(item.criteria||[]).filter(c=>c.state==='partial'||c.state==='not_demonstrated').map(c=>({c,notes:item.notes}))).sort((a,b)=>Number(b.c.state==='not_demonstrated')-Number(a.c.state==='not_demonstrated'));
 const seen=new Set(excluded);const suggestions=[];
 for(const {c,notes} of candidates){
  if(suggestions.length>=Math.max(0,Math.min(limit,2)))break;
  if(seen.has(c.id))continue;seen.add(c.id);
  suggestions.push({id:c.id,label:c.label,task:Object.hasOwn(actions,c.id)?actions[c.id]:`Address and demonstrate this review point: ${c.label}`,context:[c.measurement,notes].filter(Boolean).join(' · ')});
 }
 return suggestions;
}
