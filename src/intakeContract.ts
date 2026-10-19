// Field-specific output contracts prevent impossible field/state combinations.
const str=(max=1000)=>({type:'string',maxLength:max});
const nullable=(max=1000)=>({type:['string','null'],maxLength:max});
const obj=(properties:Record<string,unknown>)=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
const progress=['completed','advanced','investigated','attempted_failed','no_progress','unknown'];
const evidence=[null,'repository_change','deployed_feature','live_demonstration','test_result','experiment_result','data_analysis','design_artifact','documentation','meeting_or_decision_record','external_system_record','other'];
export const MAX_EVIDENCE_UPDATES=16;
const stepBase={sourceTurn:{type:['integer','null'],minimum:0,maximum:15},contextTurn:{type:['integer','null'],minimum:0,maximum:14}};
export const nextStepSchema={anyOf:[obj({...stepBase,sourceTurn:{type:'integer',minimum:0,maximum:15},status:{type:'string',enum:['planned','tentative']},action:{...str(),minLength:3},expectedEvidence:nullable()}),obj({...stepBase,status:{type:'string',enum:['unknown','none']},action:{type:'null'},expectedEvidence:{type:'null'}})]};
export const evidenceUpdatesSchema={type:'array',maxItems:MAX_EVIDENCE_UPDATES,items:{anyOf:Object.entries({responsibility:['student_claim'],claim:['student_claim'],scope:['student_claim'],evidence:['available','missing','unknown','planned'],verification_method:['student_claim','planned'],testing:['executed','planned','unknown','not_applicable','missing'],blocker:['needs_teacher','none','unknown','student_claim']}).map(([field,states])=>obj({
 field:{type:'string',enum:[field]},state:{type:'string',enum:states},value:str(),
 operation:{type:'string',enum:['add','replace']},sourceTurn:{type:'integer',minimum:0,maximum:15},contextTurn:{type:['integer','null'],minimum:0,maximum:14},
 ...(field==='claim'?{progressKind:{type:'string',enum:progress}}:{}),
 ...(field==='evidence'?{evidenceType:{type:'string',enum:evidence.filter(v=>v!==null)}}:{}),
 ...(field==='testing'?{method:nullable(),observedResult:nullable()}:{}),
 ...(field==='blocker'?{supportRequested:nullable(500)}:{})
}))}};
