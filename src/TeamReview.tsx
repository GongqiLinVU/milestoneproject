import { useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { emptyCorePoints, pointLines, type CorePoints } from './coreReview';
import { parseTeamFeedback, type TeamFeedback, type TeamMember } from './teamReviewModel';
import './TeamReview.css';
type Draft = {
    participants: string[];
    observation: string;
    meetingDate: string;
    feedback: TeamFeedback;
    feedbackObservation: string;
    feedbackParticipants: string[];
    feedbackEdited: boolean;
};
type Meeting = Draft & {
    id: string;
    version: number;
    teamNumber: number;
    node: any;
    members: TeamMember[];
    sources: Record<string, any>;
    confirmed: Record<string, any>;
    targets: Array<{
        studentId: string;
        version: number;
        hasWork: boolean;
        currentMember?: boolean;
        changed: boolean;
    }>;
    jobs: Record<string, {
        status: string;
        result: any;
        current: boolean;
        error?: string;
    }>;
};
const draftOf = (m: Meeting): Draft => ({ participants: m.participants, observation: m.observation, meetingDate: m.meetingDate, feedback: m.feedback, feedbackObservation: m.feedbackObservation, feedbackParticipants: m.feedbackParticipants, feedbackEdited: m.feedbackEdited });
const signature = (d: Draft) => JSON.stringify([d.observation, d.participants]);
const currentFeedback = (d: Draft) => d.observation === d.feedbackObservation && JSON.stringify(d.participants) === JSON.stringify(d.feedbackParticipants);
function PointsEditor({ points, onChange, disabled = false }: {
    points: CorePoints;
    onChange: (p: CorePoints) => void;
    disabled?: boolean;
}) {
    return <div className="team-point-fields">{(['confirmedProgress', 'mainIssues', 'nextSteps'] as const).map(key => <label key={key}>{({ confirmedProgress: 'Confirmed progress', mainIssues: 'Main issues', nextSteps: 'Next steps · optional' })[key]}<textarea rows={2} maxLength={2500} disabled={disabled} value={points[key].join('\n')} onChange={e => onChange({ ...points, [key]: pointLines(e.target.value) })}/></label>)}</div>;
}
export function TeamReviewDialog({ client, blockId, teamNumber, nodeKey, meetingId, onClose, onSaved, onDirty }: {
    client: SupabaseClient;
    blockId: string;
    teamNumber: number;
    nodeKey: string;
    meetingId?: string;
    onClose: () => void;
    onSaved: () => void;
    onDirty: (v: boolean) => void;
}) {
    const dialog = useRef<HTMLDialogElement>(null), alive = useRef(true), latest = useRef<Draft | null>(null), docRef = useRef<Meeting | null>(null), baseline = useRef(''), savingRef = useRef(false), generating = useRef(false), blocked = useRef(false), attempted = useRef(''), wanted = useRef(''), guideAttempt = useRef(''), opening=useRef(0);
    const [doc, setDoc] = useState<Meeting | null>(null), [draft, setDraft] = useState<Draft | null>(null), [error, setError] = useState(''), [aiError, setAIError] = useState(''), [saving, setSaving] = useState(false), [formatting, setFormatting] = useState(false), [selected, setSelected] = useState<string[]>([]), [replace, setReplace] = useState<string[]>([]), [history, setHistory] = useState<any[]>([]), [locked, setLocked] = useState(false);
    const dirty = !!draft && JSON.stringify(draft) !== baseline.current;
    const dirtyRef = useRef(false);
    dirtyRef.current = dirty || saving || locked;
    function adopt(m: Meeting) { docRef.current = m; setDoc(m); const d = draftOf(m); latest.current = d; setDraft(d); baseline.current = JSON.stringify(d); blocked.current = false; setSelected([]); setReplace([]); }
    function edit(d: Draft) { latest.current = d; setDraft(d); setSelected([]); setError(''); }
    async function rpc(name: string, args: any) { const r = await client.rpc(name, args); if (r.error)
        throw r.error; return r.data; }
    async function list() { const rows = await rpc('list_teacher_team_meetings', { p_block_id: blockId, p_team_number: teamNumber }); if (alive.current)
        setHistory(rows.filter((m: any) => m.nodeKey === nodeKey)); }
    async function open(fresh=false,id?:string) {
      if(dirtyRef.current && !window.confirm('Discard unsaved meeting changes?')) return;
      const request=++opening.current;
      setLocked(true); setError('');
      try {
        const m=id ? await rpc('get_teacher_team_meeting',{p_meeting_id:id}) : await rpc('open_teacher_team_meeting',{p_block_id:blockId,p_team_number:teamNumber,p_node_key:nodeKey,p_new:fresh});
        if(!alive.current || request!==opening.current) return;
        adopt(m); attempted.current=''; wanted.current=''; setAIError('');
        await list();
      } catch(e) {
        if(alive.current && request===opening.current) setError((e as Error).message);
      } finally {
        if(alive.current && request===opening.current) setLocked(false);
      }
    }
    useEffect(() => { alive.current = true; const b = document.body.style.overflow, h = document.documentElement.style.overflow; document.body.style.overflow = 'hidden'; document.documentElement.style.overflow = 'hidden'; dialog.current?.showModal(); void open(false, meetingId); return () => { alive.current = false; document.body.style.overflow = b; document.documentElement.style.overflow = h; onDirty(false); }; }, [client, blockId, teamNumber, nodeKey]);
    useEffect(() => { onDirty(dirty || saving || locked); }, [dirty, saving, locked]);
    function leave() { if (!dirtyRef.current || window.confirm('Discard unsaved meeting changes?'))
        onClose(); }
    async function save(): Promise<Meeting | null> {
        if (savingRef.current || !latest.current || !docRef.current)
            return null;
        if (JSON.stringify(latest.current) === baseline.current)
            return docRef.current;
        savingRef.current = true;
        setSaving(true);
        setError('');
        const sent = latest.current;
        const before = docRef.current;
        try {
            const m = await rpc('save_teacher_team_meeting', { p_meeting_id: before.id, p_version: before.version, p_draft: sent });
            if (!alive.current)
                return null;
            m.targets = before.targets;
            docRef.current = m;
            setDoc(m);
            baseline.current = JSON.stringify(draftOf(m));
            if (JSON.stringify(latest.current) === JSON.stringify(sent)) {
                latest.current = draftOf(m);
                setDraft(latest.current);
            }
            blocked.current = false;
            onSaved();
            return m;
        }
        catch (e) {
            if (alive.current) {
                setError((e as Error).message);
                blocked.current = true;
            }
            return null;
        }
        finally {
            savingRef.current = false;
            if (alive.current)
                setSaving(false);
        }
    }
    function accept(result: any, sig: string) { const d = latest.current; if (!d || signature(d) !== sig || d.feedbackEdited)
        return; try {
        const feedback = parseTeamFeedback(result, d.participants);
        edit({ ...d, feedback, feedbackObservation: d.observation, feedbackParticipants: [...d.participants], feedbackEdited: false });
    }
    catch (e) {
        setAIError((e as Error).message);
    } }
    async function ai(kind: 'guide' | 'feedback', refresh = false) {
        if (generating.current || !latest.current || !docRef.current || savingRef.current)
            return;
        const before = latest.current;
        if (kind === 'feedback' && (!before.observation.trim() || !before.participants.length || (!refresh && before.feedbackEdited)))
            return;
        const sig = signature(before);
        if (kind === 'feedback') {
            attempted.current = sig;
            wanted.current = sig;
        }
        generating.current = true;
        setFormatting(true);
        setAIError('');
        try {
            const m = await save();
            if (!m)
                throw Error('Save or reconcile the meeting before generating.');
            const { data } = await client.auth.getSession();
            if (!data.session)
                throw Error('Sign in again.');
            const response = await fetch('/api/team-review', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ meetingId: m.id, kind, refresh }) });
            const result = await response.json();
            if (!response.ok)
                throw Error(result.error || 'Preparation unavailable');
            if (!alive.current || docRef.current?.id !== m.id)
                return;
            const updated = await rpc('get_teacher_team_meeting', { p_meeting_id: m.id });
            if (!alive.current || docRef.current?.id !== m.id)
                return;
            docRef.current = { ...docRef.current!, jobs: updated.jobs };
            setDoc(docRef.current);
            if (kind === 'feedback' && result.state === 'ready' && signature(latest.current!) === sig) {
                if (refresh) {
                    latest.current = { ...latest.current!, feedbackEdited: false };
                    setDraft(latest.current);
                }
                accept(result.result, sig);
            }
            if (['failed', 'interrupted'].includes(result.state))
                setAIError(result.error || 'Retry explicitly or edit feedback manually.');
        }
        catch (e) {
            if (alive.current)
                setAIError((e as Error).message);
        }
        finally {
            generating.current = false;
            if (alive.current)
                setFormatting(false);
        }
    }
    useEffect(() => { if (!dirty || blocked.current || saving)
        return; const t = setTimeout(() => void save(), 900); return () => clearTimeout(t); }, [draft, saving]);
    useEffect(() => { if (!doc || !draft || saving || formatting || blocked.current || draft.feedbackEdited || !draft.participants.length || !draft.observation.trim() || currentFeedback(draft) || attempted.current === signature(draft))
        return; const t = setTimeout(() => void ai('feedback'), 3000); return () => clearTimeout(t); }, [draft, doc?.id, saving, formatting]);
    useEffect(() => { if (!doc || guideAttempt.current === doc.id)
        return; guideAttempt.current = doc.id; if (!doc.jobs.guide)
        void ai('guide'); }, [doc?.id]);
    useEffect(() => { if (!doc || !Object.values(doc.jobs).some(j => j.status === 'pending'))
        return; let active = true, running = false; const id = doc.id; const timer = setInterval(() => { if (running)
        return; running = true; void rpc('get_teacher_team_meeting', { p_meeting_id: id }).then(m => { if (!active || docRef.current?.id !== id)
        return; docRef.current = { ...docRef.current!, jobs: m.jobs }; setDoc(docRef.current); const j = m.jobs.feedback; if (j?.status === 'ready' && j.current && signature(draftOf(m)) === wanted.current && wanted.current === signature(latest.current!))
        accept(j.result, wanted.current); }).catch(() => { }).finally(() => { running = false; }); }, 2000); return () => { active = false; clearInterval(timer); }; }, [doc?.id, doc && JSON.stringify(Object.values(doc.jobs).map(j => j.status))]);
    function manual(feedback: TeamFeedback) { const d = latest.current!; edit({ ...d, feedback, feedbackObservation: d.observation, feedbackParticipants: [...d.participants], feedbackEdited: true }); }
    async function refreshSources() {
      if (formatting || savingRef.current || locked) return;
      setLocked(true);
      try {
        const m=await save(); if(!m)return;
        const next=await rpc('refresh_teacher_team_sources',{p_meeting_id:m.id,p_version:m.version});
        if(alive.current)adopt(next);
      } catch(e) {if(alive.current)setError((e as Error).message);}
      finally {if(alive.current)setLocked(false);}
    }
    async function publish() {
        if (!selected.length || formatting || savingRef.current)
            return;
        setLocked(true);
        const m = await save();
        if (!m) {setLocked(false); return;}
        setSaving(true);
        savingRef.current = true;
        try {
            const data = await rpc('publish_teacher_team_members', { p_meeting_id: m.id, p_version: m.version, p_targets: selected.map(studentId => ({ studentId, version: m.targets.find(t => t.studentId === studentId)?.version ?? 0, replace: replace.includes(studentId) })) });
            if (alive.current) {
                adopt(data);
                onSaved();
                await list();
            }
        }
        catch (e) {
            if (alive.current)
                setError((e as Error).message);
        }
        finally {
            savingRef.current = false;
            if (alive.current) {setSaving(false);setLocked(false);}
        }
    }
    return <dialog ref={dialog} className="intake-review-dialog node-review-dialog" aria-labelledby="team-review-title" onCancel={e => { e.preventDefault(); leave(); }}>
  <header className="review-topbar"><div><span className="review-kicker">Teacher review · Team meeting</span><h2 id="team-review-title">Team {teamNumber} · {doc ? `${doc.node.id.toUpperCase()} · ${doc.node.label}` : 'Review'}</h2></div><button className="secondary compact" onClick={leave}>Close ×</button></header>
  <div className="team-review-scroll">
   {error && <p role="alert">{error}</p>}
   {!doc || !draft ? <p>{error ? <button className="secondary compact" onClick={() => void open()}>Retry loading meeting</button> : 'Loading meeting…'}</p> : <>
    <div className="team-meeting-tools"><label>Meeting<select value={doc.id} disabled={locked || saving || formatting} onChange={e => void open(false, e.target.value)}>{history.map(m => <option key={m.id} value={m.id}>{m.meetingDate} · {m.participants.length} participating · {Object.keys(m.confirmed).length} confirmed</option>)}</select></label><button className="secondary compact" disabled={locked || saving || formatting} onClick={() => void open(true)}>New meeting</button><button className="secondary compact" disabled={locked || saving || formatting} onClick={() => void open(false, doc.id)}>Reload meeting</button></div>
    <section className="team-review-card"><h3>Who participated?</h3>{doc.targets.some(t=>t.currentMember===false)&&<p>Team membership changed. Start a new meeting to use the current roster; this meeting retains its original members.</p>}<p>Select the students who actually joined this discussion. Unselected members stay unreviewed by this meeting.</p><fieldset disabled={locked}><label>Meeting date<input type="date" value={draft.meetingDate} onChange={e => edit({ ...draft, meetingDate: e.target.value })}/></label><div className="team-attendance">{doc.members.map(s => <label key={s.studentId}><input type="checkbox" disabled={doc.targets.find(t=>t.studentId===s.studentId)?.currentMember===false} checked={draft.participants.includes(s.studentId)} onChange={e => { const participants = e.target.checked ? [...draft.participants, s.studentId] : draft.participants.filter(id => id !== s.studentId); edit({ ...draft, participants, feedback: { ...draft.feedback, members: draft.feedback.members.filter(m => participants.includes(m.studentId)) } }); setSelected([]); }}/>{s.studentName}</label>)}</div><button type="button" className="secondary compact" onClick={() => edit({ ...draft, participants: doc.members.filter(s=>doc.targets.find(t=>t.studentId===s.studentId)?.currentMember!==false).map(s => s.studentId) })}>Select all present</button></fieldset></section>
    <section className="team-review-card"><div className="team-meeting-tools"><h3>Top 3 questions</h3><button className="secondary compact" disabled={locked || saving || formatting} onClick={() => void ai('guide', true)}>Refresh guide</button></div>{doc.jobs.guide?.result ? <><ol>{doc.jobs.guide.result.questions.map((q: string, i: number) => <li key={i}>{q}</li>)}</ol>{!doc.jobs.guide.current && <p>Guide refers to an earlier source snapshot.</p>}</> : <p>{doc.jobs.guide?.status === 'pending' ? 'Preparing guide…' : 'Guide unavailable. You can continue the discussion and retry explicitly.'}</p>}<details><summary>Session context and sources</summary><p>Evidence S{doc.node.fromSession}–S{doc.node.toSession}</p>{doc.members.map(s => <article key={s.studentId}><b>{s.studentName}</b><p>Missing sessions: {doc.sources[s.studentId]?.missingSessions?.map((n: number) => `S${n}`).join(', ') || 'None'}</p>{doc.sources[s.studentId]?.updates?.map((u: any) => <p key={u.intakeId}>S{u.sessionNumber}: {u.studentRecord.claims?.map((c: any) => c.statement).join(' · ')}</p>)}</article>)}<button className="secondary compact" disabled={locked || saving || formatting} onClick={() => void refreshSources()}>Refresh source snapshot</button></details></section>
    <section className="team-review-card"><h3>Your meeting observation</h3><p>Write naturally. Use names for individual observations; describe shared project matters as team-level.</p><textarea rows={7} maxLength={6000} disabled={locked} value={draft.observation} placeholder="Amal demonstrated… Krish explained… The team needs…" onChange={e => edit({ ...draft, observation: e.target.value })} onBlur={() => { if (!locked && !savingRef.current && !draft.feedbackEdited && attempted.current !== signature(draft))
            void ai('feedback'); }}/><small>{formatting ? 'Organising…' : 'Organised after a pause. Your raw meeting observation stays teacher-only.'}</small><button className="secondary compact" disabled={saving || formatting || !draft.observation.trim() || !draft.participants.length} onClick={() => { if (!draft.feedbackEdited || window.confirm('Replace your edited feedback with a new AI draft?'))
            void ai('feedback', true); }}>Organise feedback</button>{aiError && <p role="alert">{aiError}</p>}{!currentFeedback(draft) && <p>Feedback needs to be organised or edited against the latest observation and participants before confirmation.</p>}</section>
    <section className="team-review-card"><h3>Shared team feedback</h3><p>Shared context will accompany each selected student's confirmed personal feedback.</p><PointsEditor points={draft.feedback.shared} disabled={locked} onChange={shared => manual({ ...draft.feedback, shared })}/></section>
    {!!draft.feedback.unresolved.length && <section className="team-review-card"><h3>Attribution to clarify · teacher-only</h3><ul>{draft.feedback.unresolved.map((s, i) => <li key={i}>{s}</li>)}</ul><p>Leave these unresolved unless you can attribute them. They are not published.</p></section>}
    <section className="team-review-card"><h3>Individual feedback and confirmation</h3>{doc.members.map(s => { const present = draft.participants.includes(s.studentId), points = draft.feedback.members.find(p => p.studentId === s.studentId) || { studentId: s.studentId, ...emptyCorePoints() }, target = doc.targets.find(t => t.studentId === s.studentId), hasPoints = points.confirmedProgress.length + points.mainIssues.length > 0; return <details key={s.studentId} className="team-member-card"><summary>{s.studentName} · {!present ? 'Not participating' : doc.confirmed[s.studentId] ? 'Previously confirmed in this meeting' : hasPoints ? 'Feedback ready' : 'No personal observation yet'}</summary>{!present ? <p>No personal conclusion is recorded for an absent member.</p> : <><PointsEditor points={points} disabled={locked} onChange={p => manual({ ...draft.feedback, members: [...draft.feedback.members.filter(m => m.studentId !== s.studentId), { studentId: s.studentId, ...p }] })}/>{target?.changed && <p>Source records changed. Refresh the source snapshot before confirming.</p>}{target?.hasWork && <label className="team-check-label"><input type="checkbox" disabled={saving} checked={replace.includes(s.studentId)} onChange={e => setReplace(e.target.checked ? [...replace, s.studentId] : replace.filter(id => id !== s.studentId))}/>Replace the existing individual review; its earlier publication remains in history.</label>}<label className="team-check-label"><input type="checkbox" disabled={saving || !hasPoints || !currentFeedback(draft) || target?.changed || (target?.hasWork && !replace.includes(s.studentId))} checked={selected.includes(s.studentId)} onChange={e => setSelected(e.target.checked ? [...selected, s.studentId] : selected.filter(id => id !== s.studentId))}/>Confirm this student's personal feedback and shared team feedback</label></>}</details>; })}</section>
   </>}
  </div>
  <footer className="team-meeting-footer"><button className="secondary compact" disabled={locked || saving || !dirty} onClick={() => void save()}>Save draft</button><span>{saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'Draft saved · teacher-only until confirmed'}</span><button className="primary" disabled={!selected.length || locked || saving || formatting || !draft || !currentFeedback(draft) || selected.some(id => !draft.participants.includes(id) || doc?.targets.find(t => t.studentId === id)?.changed || (doc?.targets.find(t => t.studentId === id)?.hasWork && !replace.includes(id)))} onClick={() => void publish()}>Confirm selected members ({selected.length})</button></footer>
 </dialog>;
}
