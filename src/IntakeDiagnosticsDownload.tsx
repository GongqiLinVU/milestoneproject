import {useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {collectIntakeDiagnostics} from './intakeDiagnostics';

export function IntakeDiagnosticsDownload({client,classId,sessions}:{client:SupabaseClient;classId:string;sessions:Array<{id:string;session_number:number|null;title:string}>}) {
 const [sessionId,setSessionId]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 async function download(){
  setBusy(true);setMessage('Preparing confirmed Intake diagnostics…');
  try{
   const payload=await collectIntakeDiagnostics(async(after,asOf)=>{
    const {data,error}=await client.rpc('export_intake_diagnostics',{p_class_id:classId,p_session_id:sessionId||null,p_after_id:after,p_as_of:asOf});
    if(error)throw Error('Diagnostics could not be downloaded. Check your administrator access and that the export SQL migration is installed.');
    return data;
   });
   if(!payload.recordCount){setMessage('No confirmed Intake records in this selection.');return;}
   const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
   const link=document.createElement('a');link.href=url;link.download=`intake-diagnostics-${classId}-${sessionId||'all-sessions'}-${new Date().toISOString().slice(0,10)}.json`;
   document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
   setMessage(`Download requested: ${payload.recordCount} confirmed Intake record(s). Check your browser downloads. No data was deleted.`);
  }catch(error){setMessage(error instanceof Error?error.message:'Diagnostics could not be downloaded.');}
  finally{setBusy(false);}
 }
 return <section className="session-global-settings" aria-label="Administrator Intake diagnostics"><div className="session-global-top"><div><h3>Intake diagnostics</h3><p>Administrator only · Download confirmed conversations, records and saved debug. Data stays in the platform.</p></div></div><label>Sessions<select value={sessionId} disabled={busy} onChange={event=>{setSessionId(event.target.value);setMessage('');}}><option value="">All Sessions in this class</option>{sessions.map(session=><option key={session.id} value={session.id}>S{session.session_number??'?'} · {session.title}</option>)}</select></label><button type="button" className="secondary" disabled={busy||!classId} onClick={()=>void download()}>{busy?'Preparing download…':'Download Intake diagnostics'}</button>{message&&<p role="status">{message}</p>}</section>;
}
