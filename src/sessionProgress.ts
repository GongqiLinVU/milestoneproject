export type CheckLevel = 'good' | 'satisfactory' | 'needs_attention';
export const checkLevelLabels: Record<CheckLevel,string> = {
  good: 'Good progress', satisfactory: 'Satisfactory', needs_attention: 'Needs attention',
};
export type TeacherSessionCheck = {
  version:number;summaryRevision:number;level:CheckLevel|null;comment:string;
  checkedAt:string;teacherName:string;current?:boolean;
};
export type SessionCheckContext = {
  version:number;summaryRevision:number;correctionOpen:boolean;
  check:TeacherSessionCheck|null;history:TeacherSessionCheck[];
};
export type SessionProgressState = {
  intakeId:string;summaryRevision:number;correctionOpen:boolean;
  checkRevision:number|null;checkCurrent:boolean;checkLevel:CheckLevel|null;
  aiStatus:'empty'|'pending'|'ready'|'failed'|'interrupted'|'disabled'|'paused'|'stale';
};
export const progressStatusLabels = {
  missing:'Missing intake',loading:'Loading status',unknown:'Status unavailable',
  awaiting:'Awaiting AI review',reviewing:'AI reviewing',ai:'AI reviewed',
  unavailable:'AI review unavailable',off:'AI review off',correction:'Awaiting correction',
  checked:'Checked',updated:'Updated since check',
};
export function sessionProgressStatus(submitted:boolean,state?:SessionProgressState,loaded=true):keyof typeof progressStatusLabels {
  if(!submitted)return 'missing';
  if(!state)return loaded?'unknown':'loading';
  if(state.correctionOpen)return 'correction';
  if(state.checkRevision!==null&&state.checkRevision!==state.summaryRevision)return 'updated';
  if(state.checkCurrent)return 'checked';
  switch(state.aiStatus){
    case 'ready':return 'ai';case 'pending':return 'reviewing';
    case 'failed':case 'interrupted':return 'unavailable';
    case 'disabled':return 'off';case 'paused':return 'correction';
    case 'empty':case 'stale':return 'awaiting';default:return 'unknown';
  }
}
