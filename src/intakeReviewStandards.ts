export const STANDARD_VERSION='interview-review.v1';
export type ReviewProfile={kind:'general'|'web'|'mobile'|'data';ai:boolean};
export type CriterionState='not_reviewed'|'not_demonstrated'|'partial'|'demonstrated'|'not_applicable';
export type ReviewCriterion={id:string;label:string;state:CriterionState;measurement:string};
export const profileLabels={general:'General software project',web:'Web application',mobile:'Mobile application',data:'Data analytics'};
export const criterionStates:Record<CriterionState,string>={not_reviewed:'Not reviewed',not_demonstrated:'Not demonstrated',partial:'Partially demonstrated',demonstrated:'Demonstrated',not_applicable:'Not applicable'};
export const reviewAreas=['Design & architecture','Implementation & code','Testing & evaluation','Security & privacy','Documentation & delivery','Presentation & demonstration','Other'];
export function canonicalArea(area:string){return ({Implementation:'Implementation & code','Code review':'Implementation & code',Testing:'Testing & evaluation',Documentation:'Documentation & delivery',Presentation:'Presentation & demonstration'} as Record<string,string>)[area]||area;}
type Check=[string,string];
const core:Record<string,Check[]>={
 'Design & architecture':[['requirements','Requirements and success criteria are clear'],['architecture','Architecture and data flow are explained'],['decisions','Design decisions and trade-offs are justified']],
 'Implementation & code':[['core-features','Core features work in a live demonstration'],['integration','Components and data are integrated'],['code-understanding','Student explains the code and their contribution']],
 'Testing & evaluation':[['test-plan','Tests cover agreed requirements'],['test-results','Recorded results and limitations are explained'],['failure-cases','Failure and boundary cases are tested']],
 'Security & privacy':[['access','Authentication and permissions are demonstrated'],['sensitive-data','Sensitive data and secrets are protected'],['data-handling','Data collection, retention and deletion are explained']],
 'Documentation & delivery':[['technical-report','Technical report explains design and implementation'],['setup-guide','Setup and user instructions can be followed'],['handover','Deployment and handover materials are prepared']],
 'Presentation & demonstration':[['project-story','Problem, users and project value are clear'],['demo','A representative end-to-end demonstration is prepared'],['questions','Student explains decisions and limitations in discussion']],
 Other:[['agreed-check','The agreed interview topic is explained or demonstrated']],
};
const extensions:Record<string,Record<string,Check[]>>={
 web:{'Design & architecture':[['web-api-design','API and data-model design support the user journeys']], 'Implementation & code':[['web-workflow','Web user journeys and form validation work'],['web-responsive','Layout works on the intended screen sizes']], 'Testing & evaluation':[['web-api-tests','API integration and invalid input are tested']], 'Security & privacy':[['web-permissions','Protected routes and cross-user access are checked']]},
 mobile:{'Design & architecture':[['mobile-navigation','Navigation and device constraints inform the design']], 'Implementation & code':[['mobile-device','Features work on the intended devices'],['mobile-connectivity','Connectivity changes are handled']], 'Testing & evaluation':[['mobile-tests','Target devices, permissions and connection failures are tested']], 'Security & privacy':[['mobile-permissions','Device permissions and local sensitive data are handled appropriately']]},
 data:{'Design & architecture':[['data-method','Analysis method fits the question and data']], 'Implementation & code':[['data-quality','Data cleaning and quality checks are explained'],['data-reproducible','Processing and analysis can be reproduced']], 'Testing & evaluation':[['data-validation','Results are validated against an appropriate baseline'],['data-interpretation','Interpretation addresses uncertainty and limitations']], 'Security & privacy':[['data-source','Data sources, permitted use and de-identification are explained']]},
};
const ai:Record<string,Check[]>={
 'Design & architecture':[['ai-design','Model choice, grounding and fallback approach are explained']],
 'Implementation & code':[['ai-integration','AI integration and unsupported requests are handled']],
 'Testing & evaluation':[['ai-evaluation','AI outputs are checked against representative examples'],['ai-unsupported','Incorrect or unsupported outputs are recorded'],['ai-cost-latency','Response time and usage cost are measured where relevant']],
 'Security & privacy':[['ai-data','Information sent to AI providers is understood and controlled']],
 'Documentation & delivery':[['ai-limitations','AI limitations and evaluation approach are documented']],
};
export function criteriaFor(profile:ReviewProfile,area:string):ReviewCriterion[]{const key=canonicalArea(area);return [...(core[key]||[]),...(extensions[profile.kind]?.[key]||[]),...(profile.ai?ai[key]||[]:[])].map(([id,label])=>({id,label,state:'not_reviewed',measurement:''}));}
// Changing profile does not erase observed evidence. Keep substantive historical checks.
export function mergeCriteria(existing:ReviewCriterion[],available:ReviewCriterion[]):ReviewCriterion[]{const ids=new Set(available.map(c=>c.id));return [...available.map(c=>existing.find(old=>old.id===c.id)||c),...existing.filter(c=>!ids.has(c.id)&&(c.state!=='not_reviewed'||Boolean(c.measurement)))];}
export function criterionReviewStatus(criteria:ReviewCriterion[]):'observed'|'follow_up'|'not_verified'{return criteria.some(c=>c.state==='partial'||c.state==='not_demonstrated')?'follow_up':criteria.some(c=>c.state==='demonstrated'||c.state==='not_applicable')?'observed':'not_verified';}
export function hasCriterionDecision(criteria?:ReviewCriterion[]){return Boolean(criteria?.some(c=>c.state!=='not_reviewed'));}
