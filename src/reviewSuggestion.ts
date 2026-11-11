export type ReviewSuggestion={progress:string;feedback:string;questions:string[];currentSession:number;baselineSession:number|null;generatedAt:string};
export function parseReviewSuggestion(value:unknown):Pick<ReviewSuggestion,'progress'|'feedback'|'questions'>{
 const v=value as Record<string,unknown>;
 if(!v||typeof v.progress!=='string'||!v.progress.trim()||v.progress.length>1500||typeof v.feedback!=='string'||!v.feedback.trim()||v.feedback.length>2500||!Array.isArray(v.questions)||v.questions.length>3||v.questions.some(q=>typeof q!=='string'||!q.trim()||q.length>400))throw Error('Suggestion could not be read. Please try again.');
 return {progress:v.progress,feedback:v.feedback,questions:v.questions as string[]};
}
