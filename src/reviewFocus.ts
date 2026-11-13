// Shared vocabulary for teacher, student and AI. Never infer a grade from a focus.
export const REVIEW_FOCUS_VERSION='review-focus.v1';
export const reviewFocus={
 Delivery:'Remaining work, scope and delivery dates.',
 Implementation:'Functionality, integration and failure handling.',
 Understanding:'Explanation of code, design decisions and system behaviour.',
 Testing:'Test methods, coverage, results and limitations.',
 Evidence:'Traceable demonstrations, code and records supporting a claim.',
 Contribution:'The student’s individual part in shared team work.',
 Documentation:'Reports, technical explanations and user documentation.',
 Communication:'Clarity of posters, demonstrations and project explanations.',
} as const;
export type ReviewFocus=keyof typeof reviewFocus;
export const feedbackKinds={issue:'Current issues',clarification:'Clarification needed',recommendation:'Recommended next steps'} as const;
export type FeedbackPoint={focus:ReviewFocus;kind:keyof typeof feedbackKinds;text:string};
export function parseFeedbackPoints(value:unknown):FeedbackPoint[]{
 if(!Array.isArray(value)||value.length>8)throw Error('Invalid feedback points.');
 return value.map(p=>{
  if(!p||!Object.hasOwn(reviewFocus,p.focus)||!Object.hasOwn(feedbackKinds,p.kind)||typeof p.text!=='string'||!p.text.trim()||p.text.length>280)throw Error('Invalid feedback category or point.');
  return {focus:p.focus,kind:p.kind,text:p.text.trim()};
 });
}
export function feedbackText(points:FeedbackPoint[]):string{
 return Object.entries(feedbackKinds).map(([kind,label])=>{const rows=points.filter(p=>p.kind===kind);return rows.length?label+'\n'+rows.map(p=>'• ['+p.focus+'] '+p.text).join('\n'):'';}).filter(Boolean).join('\n\n');
}
