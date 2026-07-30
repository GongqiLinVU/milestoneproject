import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@supabase/supabase-js";
import { CalendarPlus, FileUp, Pencil, Plus, Trash2, Users, X } from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "https://gwihaizxivclamzehupk.supabase.co",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_-RPm45eBd8_CVaNk4GbXhg_nxOkMrLr",
);
type Block = { id: string; academic_year: number; block_code: string; status: string; starts_on?: string | null; ends_on?: string | null };
type RosterRow = { id: string; block_id: string; student_id: string; full_name: string; preferred_name: string | null; vu_email: string | null; team_number: number; project_name: string | null };

export function FindMyTeam() {
  const [result, setResult] = useState<{ block: string; team: string; projectName: string | null; teammates: string[] } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setResult(null);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/find-my-team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId: values.student_id }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Your team could not be found.");
      setResult(body);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Your team could not be found."); }
    finally { setBusy(false); }
  }
  return <main className="find-team-page">
    <a className="brand" href="/">NIT3004 <span>Engineering Studio</span></a>
    <section className="find-team-card">
      <div className="eyebrow">Private roster lookup</div><h1>Find My Team</h1>
      <p>Enter your Student ID. We only show your matched team—never the class roster.</p>
      <form onSubmit={submit}>
        <label>Student ID<input name="student_id" autoComplete="off" required maxLength={40} /></label>
        
        <button disabled={busy}>{busy ? "Checking…" : "Find my team"}</button>
      </form>
      {message && <p className="find-team-message error" role="alert">{message}</p>}
      {result && <section className="team-match" aria-live="polite">
        <small>{result.block}</small><h2>{result.team}</h2>
        {result.projectName && <p><b>Project</b><span>{result.projectName}</span></p>}
        <div><b>Teammates</b>{result.teammates.length ? <ul>{result.teammates.map((name) => <li key={name}>{name}</li>)}</ul> : <span>No other team members have been added yet.</span>}</div>
        <a href="/">Continue to weekly activities</a>
      </section>}
      <small className="privacy-note">Five attempts are allowed every 15 minutes. If your Student ID is not found, ask your teacher to check the active-block roster.</small>
    </section>
  </main>;
}

export function RosterManager() {
  const [blocks,setBlocks]=useState<Block[]>([]),[blockId,setBlockId]=useState(""),[rows,setRows]=useState<RosterRow[]>([]);
  const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  const [studentModal,setStudentModal]=useState<RosterRow|"new"|null>(null),[blockModal,setBlockModal]=useState(false),[importModal,setImportModal]=useState(false);
  const [csv,setCsv]=useState(""),[preview,setPreview]=useState<Array<Omit<RosterRow,"id">&{line:number;error?:string}>>([]);
  const block=useMemo(()=>blocks.find(item=>item.id===blockId),[blocks,blockId]);
  useEffect(()=>{void loadBlocks();},[]); useEffect(()=>{if(blockId)void loadRoster(blockId);},[blockId]);
  async function loadBlocks(preferredId?:string){const{data,error}=await supabase.from("teaching_blocks").select("id, academic_year, block_code, status, starts_on, ends_on").order("academic_year",{ascending:false});if(error)return setMessage("Teaching blocks could not be loaded. Confirm the 3C-1 migration.");const next=(data??[])as Block[];setBlocks(next);setBlockId(current=>preferredId||current||next.find(item=>item.status==="active")?.id||next[0]?.id||"");}
  async function loadRoster(id=blockId){const{data,error}=await supabase.from("student_roster").select("*").eq("block_id",id).order("team_number").order("full_name");if(error)return setMessage("Roster could not be loaded. Run the 3C-2 migration first.");setRows((data??[])as RosterRow[]);}
  async function saveBlock(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setMessage("");const v=Object.fromEntries(new FormData(event.currentTarget));const{data,error}=await supabase.from("teaching_blocks").insert({academic_year:Number(v.academic_year),block_code:String(v.block_code),starts_on:String(v.starts_on)||null,ends_on:String(v.ends_on)||null,status:String(v.status)}).select("id").single();setBusy(false);if(error)return setMessage(error.code==="23505"?"That teaching block already exists.":"Teaching block could not be created.");setBlockModal(false);setMessage("Teaching block created.");await loadBlocks(data.id);}
  async function saveStudent(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setMessage("");const v=Object.fromEntries(new FormData(event.currentTarget));const payload={block_id:blockId,student_id:String(v.student_id).trim(),full_name:String(v.full_name).trim(),preferred_name:String(v.preferred_name||"").trim()||null,vu_email:String(v.vu_email||"").trim().toLowerCase()||null,team_number:Number(v.team_number),project_name:String(v.project_name||"").trim()||null};const{error}=await supabase.from("student_roster").upsert(payload,{onConflict:"block_id,student_id"});setBusy(false);if(error)return setMessage(error.code==="23505"?"That Student ID already exists in this block.":"Student could not be saved.");setStudentModal(null);setMessage("Student saved.");await loadRoster();}
  function parseCsv(){const lines=csv.trim().split(/\r?\n/).filter(Boolean),skip=/student.?id/i.test(lines[0]||"")?1:0;setPreview(lines.slice(skip).map((line,index)=>{const[student_id="",full_name="",preferred_name="",vu_email="",team="",project_name=""]=line.split(",").map(cell=>cell.trim().replace(/^"|"$/g,""));const team_number=Number(team.replace(/\D/g,""));let error="";if(!student_id||!full_name)error="Missing required details";else if(vu_email&&!/^\S+@\S+\.\S+$/.test(vu_email))error="Invalid email";else if(team_number<1||team_number>8)error="Team must be 1–8";return{line:index+skip+1,block_id:blockId,student_id,full_name,preferred_name:preferred_name||null,vu_email:vu_email.toLowerCase(),team_number,project_name:project_name||null,error:error||undefined};}));}
  async function confirmImport(){const valid=preview.filter(row=>!row.error).map(({line,error,...row})=>row);if(!valid.length)return;setBusy(true);const{error}=await supabase.from("student_roster").upsert(valid,{onConflict:"block_id,student_id"});setBusy(false);if(error)return setMessage("CSV import failed. Check Student IDs and roster values.");setImportModal(false);setCsv("");setPreview([]);setMessage(`${valid.length} students imported.`);await loadRoster();}
  async function remove(row:RosterRow){if(!confirm(`Remove ${row.full_name} from this block roster?`))return;const{error}=await supabase.from("student_roster").delete().eq("id",row.id);if(error)return setMessage("Student could not be removed.");setMessage("Student removed.");await loadRoster();}
  const validPreview=preview.filter(row=>!row.error).length;
  return <section className="roster-manager">
    <div className="roster-toolbar"><div><div className="eyebrow">Teaching block & team allocation</div><h2>Blocks & student roster</h2><p>Choose a block, then manage its private student and team list.</p></div><div className="roster-toolbar-actions"><button type="button" className="secondary" onClick={()=>setBlockModal(true)}><CalendarPlus size={17}/>New block</button><button type="button" onClick={()=>setStudentModal("new")} disabled={!blockId}><Plus size={17}/>Add student</button></div></div>
    <div className="block-switcher"><label><span>Teaching block</span><select value={blockId} onChange={e=>setBlockId(e.target.value)}>{blocks.map(item=><option key={item.id} value={item.id}>{item.academic_year} · {item.block_code}{item.status==="active"?" — Active":""}</option>)}</select></label>{block&&<div className="block-summary"><div><b>{block.academic_year} · {block.block_code}</b><span className={`block-status ${block.status}`}>{block.status}</span></div><small>{block.starts_on||"Start not set"} → {block.ends_on||"End not set"} · {rows.length} students</small></div>}</div>
    {message&&<p className="admin-alert" role="status">{message}</p>}
    <div className="roster-list-card"><div className="roster-list-heading"><div><Users/><span><b>Student list</b><small>{rows.length} students in this block</small></span></div><button type="button" className="secondary" onClick={()=>setImportModal(true)} disabled={!blockId}><FileUp size={17}/>Import CSV</button></div>
      {rows.length?<div className="admin-table-wrap"><table><thead><tr><th>Team</th><th>Student</th><th>Student ID</th><th>VU email</th><th>Project</th><th>Actions</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><span className="team-pill">Team {row.team_number}</span></td><td><b>{row.preferred_name||row.full_name}</b><small>{row.preferred_name?row.full_name:""}</small></td><td>{row.student_id}</td><td>{row.vu_email||"Not provided"}</td><td>{row.project_name||"Not set"}</td><td className="roster-row-actions"><button type="button" className="secondary compact" onClick={()=>setStudentModal(row)}><Pencil size={15}/>Edit</button><button type="button" className="danger compact" onClick={()=>void remove(row)}><Trash2 size={15}/>Remove</button></td></tr>)}</tbody></table></div>:<div className="roster-empty"><Users/><b>No students in this block yet</b><p>Add one student or preview and import a CSV roster.</p><button type="button" onClick={()=>setStudentModal("new")}><Plus size={17}/>Add first student</button></div>}
    </div>
    {studentModal&&<div className="modal" role="presentation"><div className="dialog roster-dialog" role="dialog" aria-modal="true"><button className="close" onClick={()=>setStudentModal(null)} aria-label="Close"><X size={18}/></button><div className="eyebrow">Selected block · {block?.academic_year} {block?.block_code}</div><h2>{studentModal==="new"?"Add student":"Edit student"}</h2><form onSubmit={saveStudent}><div className="roster-modal-grid"><label>Student ID<input name="student_id" required defaultValue={studentModal==="new"?"":studentModal.student_id} readOnly={studentModal!=="new"}/></label><label>Email <small>Optional</small><input name="vu_email" type="email" defaultValue={studentModal==="new"?"":studentModal.vu_email||""}/></label><label>Full name<input name="full_name" required defaultValue={studentModal==="new"?"":studentModal.full_name}/></label><label>Preferred name<input name="preferred_name" defaultValue={studentModal==="new"?"":studentModal.preferred_name||""}/></label><label>Team<select name="team_number" required defaultValue={studentModal==="new"?1:studentModal.team_number}>{Array.from({length:8},(_,i)=><option key={i+1} value={i+1}>Team {i+1}</option>)}</select></label><label>Project name<input name="project_name" defaultValue={studentModal==="new"?"":studentModal.project_name||""}/></label></div><div className="admin-dialog-actions"><button type="button" className="secondary" onClick={()=>setStudentModal(null)}>Cancel</button><button disabled={busy}>{busy?"Saving…":"Save student"}</button></div></form></div></div>}
    {blockModal&&<div className="modal" role="presentation"><div className="dialog roster-dialog small" role="dialog" aria-modal="true"><button className="close" onClick={()=>setBlockModal(false)} aria-label="Close"><X size={18}/></button><div className="eyebrow">Teaching setup</div><h2>Create new block</h2><form onSubmit={saveBlock}><div className="roster-modal-grid"><label>Academic year<input name="academic_year" type="number" min="2020" max="2100" defaultValue={new Date().getFullYear()} required/></label><label>Block<select name="block_code" required>{["1B1","1B4","2B1","2B4"].map(code=><option key={code}>{code}</option>)}</select></label><label>Start date<input name="starts_on" type="date"/></label><label>End date<input name="ends_on" type="date"/></label><label>Status<select name="status" defaultValue="planned"><option value="planned">Planned</option><option value="active">Active</option><option value="archived">Archived</option></select></label></div><div className="admin-dialog-actions"><button type="button" className="secondary" onClick={()=>setBlockModal(false)}>Cancel</button><button disabled={busy}>{busy?"Creating…":"Create block"}</button></div></form></div></div>}
    {importModal&&<div className="modal" role="presentation"><div className="dialog import-dialog" role="dialog" aria-modal="true"><button className="close" onClick={()=>setImportModal(false)} aria-label="Close"><X size={18}/></button><div className="eyebrow">Import into {block?.academic_year} · {block?.block_code}</div><h2>Preview CSV roster</h2><p>Paste six columns; email may be blank. Nothing is imported until you confirm the preview.</p><code>Student ID, Full name, Preferred name, VU email, Team, Project name</code><textarea rows={7} value={csv} onChange={e=>{setCsv(e.target.value);setPreview([]);}} placeholder={"s1234567,Alex Chen,Alex,s1234567@live.vu.edu.au,Team 3,Project Atlas"}/>
      {!preview.length?<div className="admin-dialog-actions"><button type="button" className="secondary" onClick={()=>setImportModal(false)}>Cancel</button><button type="button" onClick={parseCsv} disabled={!csv.trim()}>Preview rows</button></div>:<><div className="csv-preview-summary"><b>{validPreview} ready to import</b><span>{preview.length-validPreview} rows need attention</span></div><div className="csv-preview-table"><table><thead><tr><th>Line</th><th>Student</th><th>Email</th><th>Team</th><th>Status</th></tr></thead><tbody>{preview.map(row=><tr key={row.line} className={row.error?"invalid":""}><td>{row.line}</td><td>{row.full_name||"Missing"}<small>{row.student_id}</small></td><td>{row.vu_email||"Optional"}</td><td>{row.team_number?`Team ${row.team_number}`:"Missing"}</td><td>{row.error||"Ready"}</td></tr>)}</tbody></table></div><div className="admin-dialog-actions"><button type="button" className="secondary" onClick={()=>setPreview([])}>Back to edit</button><button type="button" onClick={()=>void confirmImport()} disabled={busy||!validPreview}>{busy?"Importing…":`Import ${validPreview} students`}</button></div></>}
    </div></div>}
  </section>;
}
