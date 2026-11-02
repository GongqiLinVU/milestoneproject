import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {SupabaseClient} from '@supabase/supabase-js';
import {STUDENT_CONFIRMATION_ATTESTATION,type IntakeStudentRecord} from './aiSessionIntake';
import {validateFocusedIntakeRecord} from './intakeReviewSupport';
import {registerUnsavedBlocker,confirmExitIfBlocked} from './intakeExitGuard';
import {IntakeReview} from './IntakeReview';
import {correctionReviewAnswers,updateCorrectionReview,firstReviewSelection,type ReviewSelection} from './intakeCorrectionReview';
export type SummaryCorrectionState={summaryRevision?:number;correctionOpenedAt?:string|null;correctionHistory?:Array<{revision:number;openedAt:string;openedByName:string|null;reconfirmedAt:string|null;beforeRecord:IntakeStudentRecord;afterRecord:IntakeStudentRecord|null}>};
export function IntakeSummaryCorrection({client,intake,onClose,onSaved}:{client:SupabaseClient;intake:SummaryCorrectionState&{intakeId:string;studentRecord:IntakeStudentRecord};onClose:()=>void;onSaved:()=>void}){
 const [record,setRecord]=useState(()=>structuredClone(intake.studentRecord));const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const dirty=useRef(false);const currentDirty=JSON.stringify(record)!==JSON.stringify(intake.studentRecord)||confirmed;dirty.current=currentDirty||busy;
 useEffect(()=>registerUnsavedBlocker(`summary-correction-${intake.intakeId}`,()=>dirty.current),[intake.intakeId]);
 const [selection,setSelection]=useState<ReviewSelection>(firstReviewSelection);
 const answers=correctionReviewAnswers(record,selection);
 const select=(field:keyof ReviewSelection,value:string)=>{setSelection(current=>({...current,[field]:Number(value)}));setConfirmed(false);};
 async function save(){
  if(!confirmed||busy)return;const result=validateFocusedIntakeRecord(record);if(!result.valid){setMessage(result.errors.join(' · '));return;}
  setBusy(true);setMessage('');const {error}=await client.rpc('reconfirm_my_intake_summary',{p_intake_id:intake.intakeId,p_revision:intake.summaryRevision??1,p_student_record:record,p_attestation:STUDENT_CONFIRMATION_ATTESTATION});
  setBusy(false);if(error){setMessage(error.message||'Correction could not be saved. Your changes are still here.');return;}dirty.current=false;onSaved();
 }
 return createPortal(<div className="chat-intake-page"><header className="chat-intake-header"><button type="button" className="secondary compact" disabled={busy} onClick={()=>{if(confirmExitIfBlocked())onClose();}}>← Sessions</button><div><span>Your progress check-in</span><h2>Review your summary</h2></div></header>
 <main className="chat-intake-shell"><section className="chat-thread" aria-label="Correct your saved summary"><div className="chat-messages">
 <p className="review-hint" role="status">Your teacher has reopened this summary. Review each step and edit anything inaccurate, then confirm again.</p>
 {(record.claims.length>1||record.evidence.length>1||record.testing.length>1)&&<div className="focused-review" aria-label="Select saved items to review">{record.claims.length>1&&<label>Progress item<select disabled={busy} value={selection.claim} onChange={e=>select('claim',e.target.value)}>{record.claims.map((c,i)=><option key={c.claim_id} value={i}>Progress {i+1}</option>)}</select></label>}{record.evidence.length>1&&<label>Evidence item<select disabled={busy} value={selection.evidence} onChange={e=>select('evidence',e.target.value)}>{record.evidence.map((e,i)=><option key={e.evidence_id} value={i}>Evidence {i+1}</option>)}</select></label>}{record.testing.length>1&&<label>Testing item<select disabled={busy} value={selection.testing} onChange={e=>select('testing',e.target.value)}>{record.testing.map((t,i)=><option key={t.test_id} value={i}>Testing {i+1}</option>)}</select></label>}</div>}
 <IntakeReview answers={answers} onChange={(field,value)=>{setRecord(current=>updateCorrectionReview(current,field,value,selection));setConfirmed(false);setMessage('');}} confirmed={confirmed} onConfirm={setConfirmed} onSave={()=>void save()} busy={busy}/>
 {message&&<p className="admin-alert" role="alert">{message}</p>}
 </div></section></main></div>,document.body);
}
