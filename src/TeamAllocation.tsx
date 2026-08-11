import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@supabase/supabase-js";
import { BookOpen, CalendarPlus, Check, ChevronLeft, ChevronRight, Download, FileUp, KeyRound, Pencil, Plus, Save, Trash2, Users, X } from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "https://gwihaizxivclamzehupk.supabase.co",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_-RPm45eBd8_CVaNk4GbXhg_nxOkMrLr",
);
type Block = { id: string; academic_year: number; block_code: string; status: string; starts_on?: string | null; ends_on?: string | null };
type RosterRow = { id: string; block_id: string; student_id: string; full_name: string; preferred_name: string | null; vu_email: string | null; team_number: number; project_name: string | null; account_status?: string; password_reset_at?: string | null };
type Project = { id: string; block_id: string; title: string; problem: string; target_users: string; description: string; expected_outcomes: string | null; category: string; difficulty: string; status: string };
type TeamProjectRow = { id: string; team_number: number; assignment?: { id: string; project_id: string; selection_status: string } | null };
type Proposal = { id: string; title: string; problem: string; target_users: string; proposed_solution: string; category: string; status: string; teacher_note: string | null; team: { team_number: number } | null };

function Pagination({ total, page, pageSize, onPageChange, onPageSizeChange }: { total: number; page: number; pageSize: number; onPageChange: (page: number) => void; onPageSizeChange: (pageSize: number) => void }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = total ? (safePage - 1) * pageSize + 1 : 0;
  const end = Math.min(safePage * pageSize, total);
  return <div className="table-pagination">
    <span>{start}–{end} of {total}</span>
    <label>Rows per page<select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>{[10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
    <div>
      <button type="button" className="secondary compact" aria-label="Previous page" disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)}><ChevronLeft size={16}/></button>
      <span>Page {safePage} of {pageCount}</span>
      <button type="button" className="secondary compact" aria-label="Next page" disabled={safePage >= pageCount} onClick={() => onPageChange(safePage + 1)}><ChevronRight size={16}/></button>
    </div>
  </div>;
}

export function RosterManager() {
  const [blocks,setBlocks]=useState<Block[]>([]),[blockId,setBlockId]=useState(""),[rows,setRows]=useState<RosterRow[]>([]);
  const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  const [studentModal,setStudentModal]=useState<RosterRow|"new"|null>(null),[blockModal,setBlockModal]=useState(false),[importModal,setImportModal]=useState(false);
  const [csv,setCsv]=useState(""),[preview,setPreview]=useState<Array<Omit<RosterRow,"id">&{line:number;error?:string}>>([]);
  const [page,setPage]=useState(1),[pageSize,setPageSize]=useState(10);
  const [credentials,setCredentials]=useState<Array<{studentId:string;name:string;initialPassword:string}>>([]);
  const block=useMemo(()=>blocks.find(item=>item.id===blockId),[blocks,blockId]);
  const visibleRows=useMemo(()=>rows.slice((page-1)*pageSize,page*pageSize),[rows,page,pageSize]);
  useEffect(()=>{void loadBlocks();},[]); useEffect(()=>{if(blockId)void loadRoster(blockId);},[blockId]);
  useEffect(()=>{setPage(1);},[blockId,pageSize]);
  useEffect(()=>{const last=Math.max(1,Math.ceil(rows.length/pageSize));if(page>last)setPage(last);},[rows.length,page,pageSize]);
  async function loadBlocks(preferredId?:string){const{data,error}=await supabase.from("teaching_blocks").select("id, academic_year, block_code, status, starts_on, ends_on").order("academic_year",{ascending:false});if(error)return setMessage("Teaching blocks could not be loaded. Confirm the 3C-1 migration.");const next=(data??[])as Block[];setBlocks(next);setBlockId(current=>preferredId||current||next.find(item=>item.status==="active")?.id||next[0]?.id||"");}
  async function loadRoster(id=blockId){const [{data,error},{data:accounts}]=await Promise.all([supabase.from("student_roster").select("*").eq("block_id",id).order("team_number").order("full_name"),supabase.from("student_accounts").select("student_id,status,password_reset_at")]);if(error)return setMessage("Roster could not be loaded. Run the 3C-2 migration first.");const accountDetails=new Map((accounts??[]).map(item=>[item.student_id,item]));setRows(((data??[])as RosterRow[]).map(row=>{const account=accountDetails.get(row.student_id);return{...row,account_status:account?.status,password_reset_at:account?.password_reset_at??null};}));}
  async function manageAccount(action:"prepare"|"reset",studentId?:string){if(action==="reset"&&!confirm("Reset this student's password? Their current password will stop working and they must activate again. Existing check-ins and activities will be kept."))return;setBusy(true);setMessage("");setCredentials([]);const{data:{session}}=await supabase.auth.getSession();const response=await fetch("/api/student-accounts",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session?.access_token||""}`},body:JSON.stringify({blockId,action,studentId})});const result=await response.json();setBusy(false);setCredentials(result.credentials||[]);if(!response.ok){setMessage(`${result.error||"Student account action could not be completed."}${result.credentials?.length?" Download the credentials already created before retrying.":""}`);await loadRoster();return;}if(result.action==="reset")setMessage("Password reset. Download the new temporary credential now; the previous password no longer works.");else setMessage(result.credentials?.length?`${result.credentials.length} student account${result.credentials.length===1?"":"s"} prepared. Download the new credentials now; they cannot be shown again.`:(studentId?"This student account is already prepared.":"All roster students already have accounts."));await loadRoster();}
  function downloadCredentials(){const lines=["Student ID,Student name,Initial password",...credentials.map(item=>[item.studentId,item.name,item.initialPassword].map(value=>`"${String(value).replace(/"/g,'""')}"`).join(","))];const url=URL.createObjectURL(new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download="student-activation-credentials.csv";link.click();URL.revokeObjectURL(url);}
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
    <div className="account-preparation"><div><b>Student accounts</b><p>Prepare missing accounts in bulk, or use a student's row to prepare or reset only that account.</p></div><button type="button" disabled={busy||!rows.filter(row=>!row.account_status).length} onClick={()=>void manageAccount("prepare")}><KeyRound size={16}/>{busy?"Working…":`Prepare ${rows.filter(row=>!row.account_status).length} student accounts`}</button>{credentials.length>0&&<button type="button" className="secondary" onClick={downloadCredentials}><Download size={16}/>Download temporary credentials</button>}</div>
    <div className="roster-list-card"><div className="roster-list-heading"><div><Users/><span><b>Student list</b><small>{rows.length} students in this block</small></span></div><button type="button" className="secondary" onClick={()=>setImportModal(true)} disabled={!blockId}><FileUp size={17}/>Import CSV</button></div>
      {rows.length?<><div className="admin-table-wrap"><table><thead><tr><th>Team</th><th>Student</th><th>Student ID</th><th>VU email</th><th>Account</th><th>Actions</th></tr></thead><tbody>{visibleRows.map(row=><tr key={row.id}><td><span className="team-pill">Team {row.team_number}</span></td><td><b>{row.preferred_name||row.full_name}</b><small>{row.preferred_name?row.full_name:""}</small></td><td>{row.student_id}</td><td>{row.vu_email||"Not provided"}</td><td><span className="team-pill">{row.account_status==="activated"?"Activated":row.account_status==="ready"&&row.password_reset_at?"Password reset":row.account_status==="ready"?"Ready to activate":"Not prepared"}</span>{row.account_status==="ready"&&row.password_reset_at&&<small>Reset {new Date(row.password_reset_at).toLocaleString()}</small>}</td><td className="roster-row-actions">{!row.account_status?<button type="button" className="secondary compact" disabled={busy} onClick={()=>void manageAccount("prepare",row.student_id)}><KeyRound size={15}/>Prepare account</button>:<button type="button" className="secondary compact" disabled={busy} onClick={()=>void manageAccount("reset",row.student_id)}><KeyRound size={15}/>Reset password</button>}<button type="button" className="secondary compact" onClick={()=>setStudentModal(row)}><Pencil size={15}/>Edit</button><button type="button" className="danger compact" onClick={()=>void remove(row)}><Trash2 size={15}/>Remove</button></td></tr>)}</tbody></table></div><Pagination total={rows.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize}/></>:<div className="roster-empty"><Users/><b>No students in this block yet</b><p>Add one student or preview and import a CSV roster.</p><button type="button" onClick={()=>setStudentModal("new")}><Plus size={17}/>Add first student</button></div>}
    </div>
    {studentModal&&<div className="modal" role="presentation"><div className="dialog roster-dialog" role="dialog" aria-modal="true"><button className="close" onClick={()=>setStudentModal(null)} aria-label="Close"><X size={18}/></button><div className="eyebrow">Selected block · {block?.academic_year} {block?.block_code}</div><h2>{studentModal==="new"?"Add student":"Edit student"}</h2><form onSubmit={saveStudent}><div className="roster-modal-grid"><label>Student ID<input name="student_id" required defaultValue={studentModal==="new"?"":studentModal.student_id} readOnly={studentModal!=="new"}/></label><label>Email <small>Optional</small><input name="vu_email" type="email" defaultValue={studentModal==="new"?"":studentModal.vu_email||""}/></label><label>Full name<input name="full_name" required defaultValue={studentModal==="new"?"":studentModal.full_name}/></label><label>Preferred name<input name="preferred_name" defaultValue={studentModal==="new"?"":studentModal.preferred_name||""}/></label><label>Team<select name="team_number" required defaultValue={studentModal==="new"?1:studentModal.team_number}>{Array.from({length:8},(_,i)=><option key={i+1} value={i+1}>Team {i+1}</option>)}</select></label></div><p className="form-note">Projects are assigned once per team in Project setup, not on individual roster rows.</p><div className="admin-dialog-actions"><button type="button" className="secondary" onClick={()=>setStudentModal(null)}>Cancel</button><button disabled={busy}>{busy?"Saving…":"Save student"}</button></div></form></div></div>}
    {blockModal&&<div className="modal" role="presentation"><div className="dialog roster-dialog small" role="dialog" aria-modal="true"><button className="close" onClick={()=>setBlockModal(false)} aria-label="Close"><X size={18}/></button><div className="eyebrow">Teaching setup</div><h2>Create new block</h2><form onSubmit={saveBlock}><div className="roster-modal-grid"><label>Academic year<input name="academic_year" type="number" min="2020" max="2100" defaultValue={new Date().getFullYear()} required/></label><label>Block<select name="block_code" required>{["1B1","1B4","2B1","2B4"].map(code=><option key={code}>{code}</option>)}</select></label><label>Start date<input name="starts_on" type="date"/></label><label>End date<input name="ends_on" type="date"/></label><label>Status<select name="status" defaultValue="planned"><option value="planned">Planned</option><option value="active">Active</option><option value="archived">Archived</option></select></label></div><div className="admin-dialog-actions"><button type="button" className="secondary" onClick={()=>setBlockModal(false)}>Cancel</button><button disabled={busy}>{busy?"Creating…":"Create block"}</button></div></form></div></div>}
    {importModal&&<div className="modal" role="presentation"><div className="dialog import-dialog" role="dialog" aria-modal="true"><button className="close" onClick={()=>setImportModal(false)} aria-label="Close"><X size={18}/></button><div className="eyebrow">Import into {block?.academic_year} · {block?.block_code}</div><h2>Preview CSV roster</h2><p>Paste six columns; email may be blank. Nothing is imported until you confirm the preview.</p><code>Student ID, Full name, Preferred name, VU email, Team, Project name</code><textarea rows={7} value={csv} onChange={e=>{setCsv(e.target.value);setPreview([]);}} placeholder={"s1234567,Alex Chen,Alex,s1234567@live.vu.edu.au,Team 3,Project Atlas"}/>
      {!preview.length?<div className="admin-dialog-actions"><button type="button" className="secondary" onClick={()=>setImportModal(false)}>Cancel</button><button type="button" onClick={parseCsv} disabled={!csv.trim()}>Preview rows</button></div>:<><div className="csv-preview-summary"><b>{validPreview} ready to import</b><span>{preview.length-validPreview} rows need attention</span></div><div className="csv-preview-table"><table><thead><tr><th>Line</th><th>Student</th><th>Email</th><th>Team</th><th>Status</th></tr></thead><tbody>{preview.map(row=><tr key={row.line} className={row.error?"invalid":""}><td>{row.line}</td><td>{row.full_name||"Missing"}<small>{row.student_id}</small></td><td>{row.vu_email||"Optional"}</td><td>{row.team_number?`Team ${row.team_number}`:"Missing"}</td><td>{row.error||"Ready"}</td></tr>)}</tbody></table></div><div className="admin-dialog-actions"><button type="button" className="secondary" onClick={()=>setPreview([])}>Back to edit</button><button type="button" onClick={()=>void confirmImport()} disabled={busy||!validPreview}>{busy?"Importing…":`Import ${validPreview} students`}</button></div></>}
    </div></div>}
  </section>;
}

export function ProjectManager() {
  const [blocks, setBlocks] = useState<Array<Block & { project_setup_mode: string }>>([]);
  const [blockId, setBlockId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<TeamProjectRow[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [projectModal, setProjectModal] = useState<Project | "new" | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string>>({});
  const [projectPage, setProjectPage] = useState(1);
  const [projectPageSize, setProjectPageSize] = useState(10);
  const block = blocks.find((item) => item.id === blockId);
  const visibleProjects = useMemo(() => projects.slice((projectPage - 1) * projectPageSize, projectPage * projectPageSize), [projects, projectPage, projectPageSize]);
  const assignmentsChanged = teams.some((team) => (assignmentDrafts[team.id] ?? team.assignment?.project_id ?? "") !== (team.assignment?.project_id ?? ""));

  useEffect(() => {
    void loadBlocks();
  }, []);
  useEffect(() => {
    if (blockId) void loadFoundation();
  }, [blockId]);
  useEffect(() => {
    setProjectPage(1);
  }, [blockId, projectPageSize]);
  useEffect(() => {
    const last = Math.max(1, Math.ceil(projects.length / projectPageSize));
    if (projectPage > last) setProjectPage(last);
  }, [projects.length, projectPage, projectPageSize]);

  async function loadBlocks() {
    const { data, error } = await supabase
      .from("teaching_blocks")
      .select("id, academic_year, block_code, status, starts_on, ends_on, project_setup_mode")
      .order("academic_year", { ascending: false });
    if (error) return setMessage("Project setup could not be loaded. Run the Sprint 4 Phase 1 migration.");
    const next = (data ?? []) as Array<Block & { project_setup_mode: string }>;
    setBlocks(next);
    setBlockId((current) => current || next.find((item) => item.status === "active")?.id || next[0]?.id || "");
  }

  async function loadFoundation() {
    setMessage("");
    const [projectResult, teamResult, proposalResult] = await Promise.all([
      supabase.from("projects").select("*").eq("block_id", blockId).order("title"),
      supabase.from("teams").select("id, team_number, assignment:team_project_assignments(id, project_id, selection_status)").eq("block_id", blockId).order("team_number"),
      supabase.from("project_proposals").select("id, title, problem, target_users, proposed_solution, category, status, teacher_note, team:teams!inner(team_number, block_id)").eq("team.block_id", blockId).order("created_at", { ascending: false }),
    ]);
    if (projectResult.error || teamResult.error || proposalResult.error) {
      setMessage("Team and project data could not be loaded.");
      return;
    }
    setProjects((projectResult.data ?? []) as Project[]);
    const nextTeams = (teamResult.data ?? []).map((row: any) => ({ ...row, assignment: Array.isArray(row.assignment) ? row.assignment[0] ?? null : row.assignment })) as TeamProjectRow[];
    setTeams(nextTeams);
    setAssignmentDrafts(Object.fromEntries(nextTeams.map((team) => [team.id, team.assignment?.project_id ?? ""])));
    setProposals((proposalResult.data ?? []).map((row: any) => ({ ...row, team: Array.isArray(row.team) ? row.team[0] ?? null : row.team })) as Proposal[]);
  }

  async function updateMode(mode: string) {
    setBusy(true);
    const { error } = await supabase.from("teaching_blocks").update({ project_setup_mode: mode }).eq("id", blockId);
    setBusy(false);
    if (error) return setMessage("Project setup mode could not be changed.");
    setMessage(mode === "teacher_assigned" ? "This block now uses teacher assignment." : "Students can now select a team project during Check-in.");
    await loadBlocks();
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const payload = {
      block_id: blockId,
      title: String(values.title).trim(),
      problem: String(values.problem).trim(),
      target_users: String(values.target_users).trim(),
      description: String(values.description).trim(),
      expected_outcomes: String(values.expected_outcomes || "").trim() || null,
      category: String(values.category),
      difficulty: String(values.difficulty),
      status: String(values.status),
    };
    const query = projectModal === "new"
      ? supabase.from("projects").insert(payload)
      : supabase.from("projects").update(payload).eq("id", projectModal!.id);
    const { error } = await query;
    setBusy(false);
    if (error) return setMessage(error.code === "23505" ? "That project title already exists in this block." : "Project could not be saved.");
    setProjectModal(null);
    setMessage("Project saved.");
    await loadFoundation();
  }

  async function saveAssignments() {
    const changedTeams = teams.filter((team) => (assignmentDrafts[team.id] ?? "") !== (team.assignment?.project_id ?? ""));
    if (!changedTeams.length) return;
    setBusy(true);
    const results = await Promise.all(changedTeams.map((team) => {
      const projectId = assignmentDrafts[team.id] ?? "";
      return projectId
        ? supabase.from("team_project_assignments").upsert({
            team_id: team.id,
            project_id: projectId,
            selection_status: "teacher_confirmed",
            confirmed_at: new Date().toISOString(),
            selected_by_student_id: null,
          }, { onConflict: "team_id" })
        : supabase.from("team_project_assignments").delete().eq("team_id", team.id);
    }));
    setBusy(false);
    if (results.some((result) => result.error)) return setMessage("Some team assignments could not be saved. Please try again.");
    setMessage(`${changedTeams.length} team assignment${changedTeams.length === 1 ? "" : "s"} saved.`);
    await loadFoundation();
  }

  async function reviewProposal(proposal: Proposal, status: "approved" | "changes_requested" | "rejected") {
    setBusy(true);
    let approvedProjectId: string | null = null;
    if (status === "approved") {
      const team = teams.find((item) => item.team_number === proposal.team?.team_number);
      const { data, error } = await supabase.from("projects").insert({
        block_id: blockId,
        title: proposal.title,
        problem: proposal.problem,
        target_users: proposal.target_users,
        description: proposal.proposed_solution,
        category: proposal.category,
        difficulty: "Standard",
        status: "published",
        source: "student_proposal",
      }).select("id").single();
      if (error || !team) {
        setBusy(false);
        return setMessage("The approved project could not be created. Check for a duplicate title.");
      }
      approvedProjectId = data.id;
      const { error: assignmentError } = await supabase.from("team_project_assignments").upsert({
        team_id: team.id,
        project_id: approvedProjectId,
        selection_status: "teacher_confirmed",
        confirmed_at: new Date().toISOString(),
      }, { onConflict: "team_id" });
      if (assignmentError) {
        setBusy(false);
        return setMessage("Project created, but the team assignment needs teacher attention.");
      }
    }
    const { error } = await supabase.from("project_proposals").update({ status, approved_project_id: approvedProjectId }).eq("id", proposal.id);
    setBusy(false);
    if (error) return setMessage("Proposal status could not be updated.");
    setMessage(status === "approved" ? "Proposal approved and assigned to the team." : "Proposal review saved.");
    await loadFoundation();
  }

  return <section className="project-manager">
    <div className="roster-toolbar">
      <div><div className="eyebrow">Team & project foundation</div><h2>Project setup</h2><p>Publish projects and connect one current project to each team.</p></div>
      <button type="button" onClick={() => setProjectModal("new")} disabled={!blockId}><Plus size={17}/>Add project</button>
    </div>
    <div className="block-switcher">
      <label><span>Teaching block</span><select value={blockId} onChange={(event) => setBlockId(event.target.value)}>{blocks.map((item) => <option key={item.id} value={item.id}>{item.academic_year} · {item.block_code}{item.status === "active" ? " — Active" : ""}</option>)}</select></label>
      {block && <label><span>Project setup mode</span><select value={block.project_setup_mode} disabled={busy} onChange={(event) => void updateMode(event.target.value)}><option value="teacher_assigned">Teacher assigned</option><option value="student_selection">Student selection at Check-in</option></select></label>}
    </div>
    {message && <p className="admin-alert" role="status">{message}</p>}
    <div className="project-foundation-stack">
      <details className="roster-list-card setup-section" open>
        <summary className="roster-list-heading"><div><Users/><span><b>Team assignments</b><small>One current project per team</small></span></div><span className="setup-section-toggle">Show or hide</span></summary>
        {teams.length ? <><div className="team-assignment-list">{teams.map((team) => <label key={team.id}><span><b>Team {team.team_number}</b><small>{team.assignment?.selection_status === "student_selected" ? "Student selected · awaiting confirmation" : team.assignment ? "Teacher confirmed" : "Not assigned"}</small></span><select value={assignmentDrafts[team.id] ?? team.assignment?.project_id ?? ""} disabled={busy} onChange={(event) => setAssignmentDrafts((current) => ({ ...current, [team.id]: event.target.value }))}><option value="">Not assigned</option>{projects.filter((project) => project.status !== "archived").map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>)}</div><div className="assignment-save-bar"><span>{assignmentsChanged ? "You have unsaved assignment changes." : "All assignments are saved."}</span><button type="button" disabled={busy || !assignmentsChanged} onClick={() => void saveAssignments()}><Save size={16}/>{busy ? "Saving…" : "Save assignments"}</button></div></> : <div className="roster-empty"><Users/><b>No teams yet</b><p>Teams are created automatically from the roster.</p></div>}
      </details>
      <details className="roster-list-card setup-section">
        <summary className="roster-list-heading"><div><BookOpen/><span><b>Project catalogue</b><small>{projects.length} projects in this block</small></span></div><span className="setup-section-toggle">Show or hide</span></summary>
        {projects.length ? <><div className="admin-table-wrap"><table><thead><tr><th>Project</th><th>Category</th><th>Difficulty</th><th>Status</th><th></th></tr></thead><tbody>{visibleProjects.map((project) => <tr key={project.id}><td><b>{project.title}</b><small>{project.target_users}</small></td><td>{project.category}</td><td>{project.difficulty}</td><td>{project.status}</td><td><button type="button" className="secondary compact" onClick={() => setProjectModal(project)}><Pencil size={15}/>Edit</button></td></tr>)}</tbody></table></div><Pagination total={projects.length} page={projectPage} pageSize={projectPageSize} onPageChange={setProjectPage} onPageSizeChange={setProjectPageSize}/></> : <div className="roster-empty"><BookOpen/><b>No projects yet</b><p>Add the projects available to this block.</p></div>}
      </details>
    </div>
    {proposals.length > 0 && <section className="roster-list-card proposal-review-list"><div className="roster-list-heading"><div><BookOpen/><span><b>Student proposals</b><small>Team ideas for teacher review</small></span></div></div>{proposals.map((proposal) => <article key={proposal.id}><div><small>Team {proposal.team?.team_number} · {proposal.category}</small><h3>{proposal.title}</h3><p><b>Problem:</b> {proposal.problem}</p><p><b>Users:</b> {proposal.target_users}</p><p>{proposal.proposed_solution}</p></div><div><span className={`block-status ${proposal.status}`}>{proposal.status.replace("_", " ")}</span>{proposal.status !== "approved" && <><button disabled={busy} onClick={() => void reviewProposal(proposal, "approved")}><Check size={15}/>Approve</button><button className="secondary" disabled={busy} onClick={() => void reviewProposal(proposal, "changes_requested")}>Request changes</button><button className="danger" disabled={busy} onClick={() => void reviewProposal(proposal, "rejected")}>Reject</button></>}</div></article>)}</section>}
    {projectModal && <div className="modal" role="presentation"><div className="dialog roster-dialog" role="dialog" aria-modal="true"><button className="close" onClick={() => setProjectModal(null)} aria-label="Close"><X size={18}/></button><div className="eyebrow">{block?.academic_year} · {block?.block_code}</div><h2>{projectModal === "new" ? "Add project" : "Edit project"}</h2><form onSubmit={saveProject}><div className="roster-modal-grid"><label>Title<input name="title" required maxLength={120} defaultValue={projectModal === "new" ? "" : projectModal.title}/></label><label>Target users<input name="target_users" required maxLength={300} defaultValue={projectModal === "new" ? "" : projectModal.target_users}/></label><label className="wide">Problem or opportunity<textarea name="problem" required maxLength={600} defaultValue={projectModal === "new" ? "" : projectModal.problem}/></label><label className="wide">Project description<textarea name="description" required maxLength={1200} defaultValue={projectModal === "new" ? "" : projectModal.description}/></label><label className="wide">Expected outcomes <small>Optional</small><textarea name="expected_outcomes" maxLength={600} defaultValue={projectModal === "new" ? "" : projectModal.expected_outcomes || ""}/></label><label>Category<select name="category" defaultValue={projectModal === "new" ? "Other" : projectModal.category}>{["Web","Mobile","AI","Data","IoT","Cybersecurity","Game","Other"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Difficulty<select name="difficulty" defaultValue={projectModal === "new" ? "Standard" : projectModal.difficulty}>{["Foundation","Standard","Advanced"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Status<select name="status" defaultValue={projectModal === "new" ? "draft" : projectModal.status}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label></div><div className="admin-dialog-actions"><button type="button" className="secondary" onClick={() => setProjectModal(null)}>Cancel</button><button disabled={busy}>{busy ? "Saving…" : "Save project"}</button></div></form></div></div>}
  </section>;
}
