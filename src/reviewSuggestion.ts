export type ReviewSuggestion={progress:string;feedback:string;questions:string[];currentSession:number;baselineSession:number|null;generatedAt:string};
export function parseReviewSuggestion(value:unknown):Pick<ReviewSuggestion,'progress'|'feedback'|'questions'>{
 const v=value as Record<string,unknown>;
 if(!v||typeof v.progress!=='string'||!v.progress.trim()||v.progress.length>1500||typeof v.feedback!=='string'||!v.feedback.trim()||v.feedback.length>2500||!Array.isArray(v.questions)||v.questions.length>3||v.questions.some(q=>typeof q!=='string'||!q.trim()||q.length>400))throw Error('Suggestion could not be read. Please try again.');
 return {progress:v.progress,feedback:v.feedback,questions:v.questions as string[]};
}

// Compact preview for previously saved suggestions; the full original stays available.
export function progressPreview(text:string):string[]{
 return text.split(/\n+|(?<=\.)\s+(?=S\d)/).map(s=>s.replace(/^[-•]\s*/, '').trim()).filter(Boolean).slice(0,3).map(s=>s.length>180?s.slice(0,177)+'…':s);
}
export function isCompactSuggestion(s:Pick<ReviewSuggestion,'progress'|'feedback'|'questions'>){
 return s.progress.length<=540&&s.feedback.length<=700&&s.questions.every(q=>q.length<=160)&&!/(?:\b(?:C|E|T)\d+\b|available_now|execution_status|claim_id)/.test([s.progress,s.feedback,...s.questions].join(' '));
}
