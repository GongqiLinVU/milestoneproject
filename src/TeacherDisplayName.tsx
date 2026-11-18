import {useEffect, useState} from "react";
import type {SupabaseClient} from "@supabase/supabase-js";

export function TeacherDisplayName({client}: {client: SupabaseClient}) {
  const [name, setName] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    void client.rpc("get_my_teacher_display_name").then(({data, error}) => {
      if (!active) return;
      if (error) setMessage(error.message);
      else {setName(data || ""); setSaved(data || "");}
      setLoading(false);
    });
    return () => {active = false;};
  }, [client]);
  return <details className="staff-history">
    <summary>Your teacher display name</summary>
    <form onSubmit={async event => {
      event.preventDefault();
      if (busy || loading || !name.trim()) return;
      setBusy(true); setMessage("");
      try {
        const {data, error} = await client.rpc("save_my_teacher_display_name", {p_name: name});
        if (error) throw error;
        setName(data); setSaved(data); setMessage("Teacher name saved.");
      } catch (e) {setMessage((e as Error).message);}
      finally {setBusy(false);}
    }}>
      <label>Name shown with your feedback<input required maxLength={100} disabled={loading || busy} value={name} onChange={e => setName(e.target.value)}/></label>
      <button className="secondary compact" disabled={loading || busy || !name.trim() || name.trim() === saved}>{busy ? "Saving…" : "Save name"}</button>
      {message && <p role="status">{message}</p>}
    </form>
  </details>;
}
