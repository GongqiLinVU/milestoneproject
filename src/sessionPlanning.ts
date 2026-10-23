export const DEFAULT_CLASS_AI_BUDGET_USD=10;
export const DEFAULT_CLASS_AI_CEILING_USD=25;
// Planning assumptions, not a quote or a token reservation. S10 is feedback.
export function intakePlanningEstimate(students:number){
 const count=Math.max(0,Math.floor(Number.isFinite(students)?students:0));
 return {students:count,intakes:count*9,lowUsd:count*9*.01,highUsd:count*9*.03};
}
type PlannedSession={session_number:number|null;session_date:string};
export function selectCurrentSession<T extends PlannedSession>(sessions:T[],status:(session:T)=>string):T|undefined{
 const ordered=[...sessions].sort((a,b)=>(a.session_number??Infinity)-(b.session_number??Infinity)||a.session_date.localeCompare(b.session_date));
 return ordered.find(item=>status(item)==='open')??ordered.find(item=>status(item)!=='closed')??ordered.at(-1);
}
