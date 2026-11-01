import {useEffect,useRef,useState,type FormEvent} from 'react';
import {createClient} from '@supabase/supabase-js';
import {Search} from 'lucide-react';
const supabase=createClient(import.meta.env.VITE_SUPABASE_URL||'https://gwihaizxivclamzehupk.supabase.co',import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_-RPm45eBd8_CVaNk4GbXhg_nxOkMrLr');
type Candidate={rosterId:string;fullName:string;preferredName:string|null;email:string|null;sourceClass:string;classStatus:string};
type Lookup={status:'found'|'not_found'|'already_enrolled'|'active_class_conflict';studentId:string;accountStatus:string|null;candidates:Candidate[]};
export function StudentEnrolment({classId,className,onClose,onEnrolled}:{classId:string;className:string;onClose:()=>void;onEnrolled:(message:string)=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [studentId,setStudentId]=useState(''),[result,setResult]=useState<Lookup|null>(null),[selected,setSelected]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{dialog.current?.showModal();},[]);
 async function search(event:FormEvent){
  event.preventDefault();setBusy(true);setMessage('');setResult(null);setSelected('');
  try{const {data,error}=await supabase.rpc('lookup_student_for_enrolment',{p_class_id:classId,p_student_id:studentId});if(error)throw error;
   const next=data as Lookup;setResult(next);if(next.candidates.length===1)setSelected(next.candidates[0].rosterId);
  }catch{setMessage('Student lookup could not be completed. Check your class access and ask the administrator to confirm the enrolment migration is applied.');}finally{setBusy(false);}
 }
 async function enrol(){
  if(!result||!selected)return;setBusy(true);setMessage('');
  try{const {data,error}=await supabase.rpc('enrol_existing_student',{p_class_id:classId,p_student_id:result.studentId,p_source_roster_id:selected});if(error)throw error;
   if(data.status==='active_class_conflict'){setResult({...result,status:'active_class_conflict'});return;}
   onEnrolled(data.status==='already_enrolled'?'This student is already enrolled in this class.':`Student enrolled. ${data.accountStatus==='disabled'?'Their account remains disabled; ask an administrator for help.':data.accountStatus?'Their existing login and password are unchanged.':'Use Prepare account when ready.'} Assign their team separately.`);
  }catch{setMessage('Enrolment could not be completed. Search again to check the student record and active class, or ask your administrator.');}finally{setBusy(false);}
 }
 async function create(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(result?.status!=='not_found')return;const values=Object.fromEntries(new FormData(event.currentTarget));setBusy(true);setMessage('');
  try{
   // Recheck before manual creation, avoiding accidental duplication of a newly
   // discovered student and preserving the explicit confirmation step.
   const check=await supabase.rpc('lookup_student_for_enrolment',{p_class_id:classId,p_student_id:result.studentId});if(check.error)throw check.error;
   if(check.data.status!=='not_found'){setResult(check.data as Lookup);setSelected('');setMessage('The student record changed. Review the search result before continuing.');return;}
   const {error}=await supabase.from('student_roster').insert({block_id:classId,student_id:result.studentId,full_name:String(values.full_name).trim(),preferred_name:String(values.preferred_name||'').trim()||null,vu_email:String(values.vu_email||'').trim().toLowerCase()||null,team_number:null,project_name:null});if(error)throw error;
   onEnrolled(`Student added without a team. ${result.accountStatus?'Their existing account is unchanged.':'Use Prepare account when ready.'}`);
  }catch{setMessage('Student could not be added. Search again for an existing enrolment or another active class, then retry.');}finally{setBusy(false);}
 }
 return <dialog ref={dialog} className="student-enrolment-dialog" aria-labelledby="enrolment-title" onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
  <div className="student-enrolment-body"><div className="eyebrow">{className}</div><h2 id="enrolment-title">Add or enrol a student</h2><p>Search by complete Student ID to reuse an existing student’s details and login.</p>
   <form onSubmit={search} className="student-enrolment-search"><label>Student ID<input required minLength={3} maxLength={40} value={studentId} disabled={busy} autoFocus onChange={event=>{setStudentId(event.target.value);setResult(null);setSelected('');setMessage('');}}/></label><button className="primary" disabled={busy}><Search size={16}/>{busy?'Working…':'Find student'}</button></form>
   {message&&<p className="admin-alert" role="alert">{message}</p>}
   {result?.status==='already_enrolled'&&<p className="form-note" role="status">This student is already enrolled in this class. Use their roster row to edit details or assign a team.</p>}
   {result?.status==='active_class_conflict'&&<p className="form-note" role="status">This student still belongs to another active class. The platform supports one active class per student. Ask the responsible teacher or administrator to resolve the earlier enrolment before adding them here; no records have been moved.</p>}
   {result?.accountStatus==='disabled'&&<p className="form-note">This student’s account is disabled. Enrolment does not reactivate it or change their password. Ask an administrator for help.</p>}
   {result?.status==='found'&&<div className="student-enrolment-result"><h3>Confirm the existing student</h3><p>{result.candidates.length>1?'Select the previous record whose details should be copied.':'Review the details below before enrolling.'} Team, project and historical submissions will stay with the original class.</p><fieldset disabled={busy}><legend>Previous enrolment</legend>{result.candidates.map(candidate=><label className="enrolment-candidate" key={candidate.rosterId}><input type="radio" name="source_enrolment" value={candidate.rosterId} checked={selected===candidate.rosterId} onChange={()=>setSelected(candidate.rosterId)}/><span><b>{candidate.fullName}{candidate.preferredName?` (${candidate.preferredName})`:''}</b><span>{candidate.email||'No email recorded'}</span><small>{candidate.sourceClass} · {candidate.classStatus}</small></span></label>)}</fieldset><p>{result.accountStatus==='disabled'?'The account will remain disabled; no login changes are made.':result.accountStatus?'The existing account and password will be reused.':'No account is prepared yet. Enrol first, then use Prepare account.'}</p><button type="button" className="primary" disabled={busy||!selected} onClick={()=>void enrol()}>Enrol in this class</button></div>}
   {result?.status==='not_found'&&<form onSubmit={create} className="student-enrolment-create"><h3>{result.accountStatus?'Existing account, no roster details':'No existing student found'}</h3><p>{result.accountStatus?'Enter the student’s details to enrol them using their existing account.':'Enter the details below to add a new student.'} Their team can be assigned later.</p><label>Full name<input name="full_name" required maxLength={100} disabled={busy}/></label><label>Preferred name <small>Optional</small><input name="preferred_name" maxLength={100} disabled={busy}/></label><label>Email <small>Optional</small><input name="vu_email" type="email" disabled={busy}/></label><button className="primary" disabled={busy}>Add student</button></form>}
   <div className="admin-dialog-actions"><button type="button" className="secondary" disabled={busy} onClick={onClose}>Close</button></div>
  </div>
 </dialog>;
}
