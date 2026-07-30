import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "https://gwihaizxivclamzehupk.supabase.co",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_-RPm45eBd8_CVaNk4GbXhg_nxOkMrLr",
);
type Block = { id: string; academic_year: number; block_code: string; status: string };
type RosterRow = { id: string; block_id: string; student_id: string; full_name: string; preferred_name: string | null; vu_email: string; team_number: number; project_name: string | null };

export function FindMyTeam() {
  const [result, setResult] = useState<{ block: string; team: string; projectName: string | null; teammates: string[] } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setResult(null);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/find-my-team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId: values.student_id, email: values.email }) });
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
      <p>Enter the same Student ID and VU email held by your teacher. We only show your matched team—never the class roster.</p>
      <form onSubmit={submit}>
        <label>Student ID<input name="student_id" autoComplete="off" required maxLength={40} /></label>
        <label>VU email<input name="email" type="email" autoComplete="email" required maxLength={160} /></label>
        <button disabled={busy}>{busy ? "Checking…" : "Find my team"}</button>
      </form>
      {message && <p className="find-team-message error" role="alert">{message}</p>}
      {result && <section className="team-match" aria-live="polite">
        <small>{result.block}</small><h2>{result.team}</h2>
        {result.projectName && <p><b>Project</b><span>{result.projectName}</span></p>}
        <div><b>Teammates</b>{result.teammates.length ? <ul>{result.teammates.map((name) => <li key={name}>{name}</li>)}</ul> : <span>No other team members have been added yet.</span>}</div>
        <a href="/">Continue to weekly activities</a>
      </section>}
      <small className="privacy-note">Five attempts are allowed every 15 minutes. If your details do not match, ask your teacher to check the active-block roster.</small>
    </section>
  </main>;
}

export function RosterManager() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockId, setBlockId] = useState("");
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const block = useMemo(() => blocks.find((item) => item.id === blockId), [blocks, blockId]);

  useEffect(() => { void loadBlocks(); }, []);
  useEffect(() => { if (blockId) void loadRoster(blockId); }, [blockId]);
  async function loadBlocks() {
    const { data, error } = await supabase.from("teaching_blocks").select("id, academic_year, block_code, status").order("academic_year", { ascending: false });
    if (error) return setMessage("Teaching blocks could not be loaded. Confirm the 3C-1 migration.");
    const next = (data ?? []) as Block[]; setBlocks(next); setBlockId((current) => current || next.find((item) => item.status === "active")?.id || next[0]?.id || "");
  }
  async function loadRoster(id = blockId) {
    const { data, error } = await supabase.from("student_roster").select("*").eq("block_id", id).order("team_number").order("full_name");
    if (error) return setMessage("Roster could not be loaded. Run the 3C-2 migration first.");
    setRows((data ?? []) as RosterRow[]);
  }
  async function saveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const { error } = await supabase.from("student_roster").upsert({
      block_id: blockId, student_id: String(values.student_id), full_name: String(values.full_name),
      preferred_name: String(values.preferred_name || "") || null, vu_email: String(values.vu_email),
      team_number: Number(values.team_number), project_name: String(values.project_name || "") || null,
    }, { onConflict: "block_id,student_id" });
    setBusy(false);
    if (error) return setMessage(error.code === "23505" ? "That Student ID or email already exists in this block." : "Student could not be saved.");
    event.currentTarget.reset(); setMessage("Student saved."); await loadRoster();
  }
  async function importCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const raw = String(new FormData(event.currentTarget).get("csv") || "").trim();
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const start = /student.?id/i.test(lines[0] || "") ? 1 : 0;
    const payload = lines.slice(start).map((line) => {
      const [student_id, full_name, preferred_name, vu_email, team, project_name] = line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
      return { block_id: blockId, student_id, full_name, preferred_name: preferred_name || null, vu_email, team_number: Number(String(team).replace(/\D/g, "")), project_name: project_name || null };
    }).filter((row) => row.student_id && row.full_name && row.vu_email && row.team_number);
    if (!payload.length) { setBusy(false); return setMessage("No valid rows found. Use the six-column template shown below."); }
    const { error } = await supabase.from("student_roster").upsert(payload, { onConflict: "block_id,student_id" });
    setBusy(false);
    if (error) return setMessage("CSV import failed. Check duplicate emails, team numbers and comma-separated columns.");
    event.currentTarget.reset(); setMessage(`${payload.length} students imported.`); await loadRoster();
  }
  async function remove(id: string) {
    if (!confirm("Remove this student from the selected block roster?")) return;
    const { error } = await supabase.from("student_roster").delete().eq("id", id);
    if (error) return setMessage("Student could not be removed.");
    await loadRoster();
  }
  return <section className="roster-manager">
    <div className="roster-heading"><div><div className="eyebrow">Teaching block & team allocation</div><h2>Student roster</h2><p>Manage a separate roster for each block. This private data is used by Find My Team.</p></div>
      <label>Selected block<select value={blockId} onChange={(e) => setBlockId(e.target.value)}>{blocks.map((item) => <option key={item.id} value={item.id}>{item.academic_year} · {item.block_code}{item.status === "active" ? " — Active" : ""}</option>)}</select></label>
    </div>
    {block && <p className="block-banner"><b>{block.academic_year} · {block.block_code}</b><span>{block.status} · {rows.length} students</span></p>}
    <div className="roster-entry-grid">
      <form onSubmit={saveStudent}><h3>Add or update one student</h3>
        <div className="roster-fields"><label>Student ID<input name="student_id" required /></label><label>Full name<input name="full_name" required /></label><label>Preferred name<input name="preferred_name" /></label><label>VU email<input name="vu_email" type="email" required /></label><label>Team<select name="team_number" required>{Array.from({length:8},(_,i)=><option key={i+1} value={i+1}>Team {i+1}</option>)}</select></label><label>Project name<input name="project_name" /></label></div>
        <button disabled={busy || !blockId}>{busy ? "Saving…" : "Save student"}</button>
      </form>
      <form onSubmit={importCsv}><h3>Import CSV</h3><p>Paste rows in this order:</p><code>Student ID, Full name, Preferred name, VU email, Team, Project name</code><textarea name="csv" rows={7} placeholder={"s1234567,Alex Chen,Alex,s1234567@live.vu.edu.au,Team 3,Project Atlas"} required /><button className="secondary" disabled={busy || !blockId}>Import roster</button></form>
    </div>
    {message && <p className="admin-alert" role="status">{message}</p>}
    {rows.length > 0 && <div className="admin-table-wrap"><table><caption>{rows.length} students in selected block</caption><thead><tr><th>Team</th><th>Name</th><th>Student ID</th><th>VU email</th><th>Project</th><th></th></tr></thead><tbody>{rows.map((row)=><tr key={row.id}><td>Team {row.team_number}</td><td>{row.preferred_name || row.full_name}<small>{row.preferred_name ? row.full_name : ""}</small></td><td>{row.student_id}</td><td>{row.vu_email}</td><td>{row.project_name || "Not set"}</td><td><button type="button" className="danger compact" onClick={()=>void remove(row.id)}>Remove</button></td></tr>)}</tbody></table></div>}
  </section>;
}
