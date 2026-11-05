// Teacher-selected classroom completion estimates; not formal assessment marks.
export const completionChoices=[0,25,50,75,90,100] as const;
export const reviewFindings=[
 'Works as demonstrated','Partially working','Not demonstrated yet',
 'Needs clearer explanation','Needs stronger testing','Ready for the next stage',
] as const;
export const nextStepChoices=[
 'Complete the core functionality','Fix the demonstrated issues','Improve error handling or security',
 'Review and explain the code','Run tests and record the results','Prepare the implementation report',
 'Prepare the user guide','Prepare slides and a demonstration','Continue to the next checkpoint','Other agreed action',
] as const;
export const evidenceChoices=['Live demonstration','Repository changes','Test results','Updated document','Slides or video','No additional evidence agreed'] as const;
export const followUpChoices=['Next session','Next week',...Array.from({length:10},(_,i)=>`Session ${i+1}`),'Before final submission','Agreed separately'];
export function findingStatus(finding:string):'observed'|'follow_up'|'not_verified'{return finding==='Not demonstrated yet'?'not_verified':['Works as demonstrated','Ready for the next stage'].includes(finding)?'observed':'follow_up';}
