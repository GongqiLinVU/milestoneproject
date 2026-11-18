import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { watchVisibleRefresh } from "./visibleRefresh";
import { checkLevelLabels, type CheckLevel, type SessionCheckContext, type TeacherSessionCheck } from "./sessionProgress";
import "./SessionTeacherCheck.css";

function Receipt({ check }: { check: TeacherSessionCheck }) {
  return <div className="session-check-receipt">
    <small>{check.teacherName} · {new Date(check.checkedAt).toLocaleString(undefined, {year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"})}</small>
    {check.level && <strong>{checkLevelLabels[check.level]}</strong>}
    {check.comment && <p>{check.comment}</p>}
  </div>;
}
function History({ context }: { context: SessionCheckContext }) {
  const earlier = context.history.filter(c => c.version !== context.check?.version);
  return earlier.length ? <details><summary>Earlier checks ({earlier.length})</summary>{earlier.map(c => <Receipt key={c.version} check={c} />)}</details> : null;
}
export function OptionalTeacherCheck({ client, intakeId, onDirty, onSaved }: {
  client: SupabaseClient; intakeId: string; onDirty?: (dirty: boolean) => void; onSaved?: () => void;
}) {
  const [context, setContext] = useState<SessionCheckContext | null>(null);
  const [level, setLevel] = useState<CheckLevel | "">("");
  const [comment, setComment] = useState("");
  const [baseline, setBaseline] = useState({level: "", comment: ""});
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const alive = useRef(false), dirtyCallback = useRef(onDirty);
  dirtyCallback.current = onDirty;
  const dirty = level !== baseline.level || comment !== baseline.comment;
  function adopt(data: SessionCheckContext) {
    const current = data.check?.current;
    const fields = { level: current ? data.check!.level || "" : "", comment: current ? data.check!.comment : "" };
    setContext(data); setLevel(fields.level as CheckLevel | ""); setComment(fields.comment); setBaseline(fields);
  }
  async function load() {
    setBusy(true); setError("");
    try {
      const {data, error} = await client.rpc("get_session_teacher_check", {p_intake_id: intakeId});
      if(error) throw error;
      if(alive.current) adopt(data);
    } catch(e) { if(alive.current) setError((e as Error).message); }
    finally { if(alive.current) setBusy(false); }
  }
  useEffect(() => { alive.current = true; void load(); return () => {alive.current = false; dirtyCallback.current?.(false);}; }, [client, intakeId]);
  useEffect(() => { dirtyCallback.current?.(dirty); }, [dirty]);
  async function save() {
    if(!context || busy || context.correctionOpen) return;
    setBusy(true); setError("");
    try {
      const {data, error} = await client.rpc("mark_session_teacher_check", {
        p_intake_id: intakeId, p_version: context.version, p_summary_revision: context.summaryRevision,
        p_level: level || null, p_comment: comment,
      });
      if(error) throw error;
      if(alive.current) {adopt(data); dirtyCallback.current?.(false); onSaved?.();}
    } catch(e) {if(alive.current) setError((e as Error).message);}
    finally {if(alive.current) setBusy(false);}
  }
  return <section className="session-teacher-check" aria-label="Optional teacher check">
    <div className="session-check-heading"><h4>Teacher check <small>Optional</small></h4>
      <button className="secondary compact" disabled={busy || dirty} onClick={() => void load()}>Reload check</button></div>
    <p>Mark this session update as read. This is separate from a formal review, implementation verification and marks.</p>
    {error && <p role="alert">{error}</p>}
    {!context && <p>{busy ? "Loading teacher check…" : "Reload to try again."}</p>}
    {context && <>
      {context.check && <><b>{context.check.current ? "Checked" : "Updated since check · earlier check retained"}</b><Receipt check={context.check}/></>}
      {context.correctionOpen && <p>Wait for the student to reconfirm their summary before checking.</p>}
      <fieldset disabled={busy || context.correctionOpen}>
        <legend>Optional feedback · visible to the student</legend>
        <label>Feedback level<select value={level} onChange={e => setLevel(e.target.value as CheckLevel | "")}>
          <option value="">No level</option>{Object.entries(checkLevelLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label>Comment<textarea rows={3} maxLength={2000} value={comment} onChange={e => setComment(e.target.value)} placeholder="Optional feedback for this student" /></label>
      </fieldset>
      <div className="session-check-actions"><button className="primary compact" disabled={busy || context.correctionOpen || (!!context.check?.current && !dirty)} onClick={() => void save()}>
        {busy ? "Saving…" : context.check?.current ? dirty ? "Update check" : "Checked" : "Mark as checked"}
      </button>{dirty && <button className="secondary compact" disabled={busy} onClick={() => {setLevel(baseline.level as CheckLevel | ""); setComment(baseline.comment);}}>Discard changes</button>}</div>
      <History context={context}/>
    </>}
  </section>;
}
export function StudentSessionCheckReceipt({client, intakeId}: {client: SupabaseClient; intakeId: string}) {
  const [context, setContext] = useState<SessionCheckContext | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true, running = false;
    async function load() {
      if(running) return; running = true;
      try {
        const {data,error} = await client.rpc("get_session_teacher_check", {p_intake_id: intakeId});
        if(error) throw error;
        if(active) {setContext(data); setError("");}
      } catch {if(active) setError("Teacher check unavailable. Reopen this session to retry.");}
      finally {running = false;}
    }
    void load(); const stop = watchVisibleRefresh(() => void load());
    return () => {active = false; stop();};
  }, [client,intakeId]);
  if(error) return <p role="status">{error}</p>;
  if(!context?.check) return null;
  return <section className="session-teacher-check" aria-label="Teacher session feedback">
    <h4>{context.check.current ? "Checked by teacher" : "Updated since teacher check"}</h4>
    <small>A reading check, separate from your formal review and marks.</small>
    {!context.check.current && <p>{context.correctionOpen ? "Your summary is being corrected. This check refers to the previously confirmed version." : "This feedback refers to an earlier summary version. Your updated summary has not been checked."}</p>}
    <Receipt check={context.check}/><History context={context}/>
  </section>;
}
