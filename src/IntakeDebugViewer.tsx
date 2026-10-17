import { useEffect, useId, useRef } from 'react';

export function IntakeDebugViewer({payload,onClose,onDownload}:{payload:unknown;onClose:()=>void;onDownload:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null);
  const title=useId();
  useEffect(()=>{
    const dialog=ref.current;
    if(dialog&&!dialog.open)dialog.showModal();
    return()=>{if(dialog?.open)dialog.close();};
  },[]);
  return <dialog ref={ref} className="intake-debug-dialog" aria-labelledby={title} onCancel={onClose}>
    <header><div><small>Current student Session · read-only</small><h2 id={title}>Intake debug</h2></div><div><button type="button" className="secondary compact" onClick={onDownload}>Download debug JSON</button><button type="button" className="secondary compact" onClick={onClose}>Close</button></div></header>
    <p>Full conversation, model responses and O/W/A observations. Contains this student’s answers; review identifying content before sharing.</p>
    <pre tabIndex={0} aria-label="Intake debug JSON">{JSON.stringify(payload,null,2)}</pre>
  </dialog>;
}
