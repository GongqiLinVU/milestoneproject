import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseMark } from "./assessment";
import type { PresentationEntry } from "./presentationTiming";
import "./PresentationReview.css";

const blankContent = { question: "", followUp: "", basis: "", listenFor: "", notes: "" };
type ReviewContent = typeof blankContent;
type StudentReview = {
  rosterId: string;
  name: string;
  team: number | null;
  score: number | null;
  markVersion: number;
  version: number;
  content: ReviewContent | null;
};
type ReviewData = { maximum: number | null; rows: StudentReview[] };

async function loadReview(client: SupabaseClient, sessionId: string): Promise<ReviewData> {
  const { data, error } = await client.rpc("get_session_presentation_review", { p_session_id: sessionId });
  if (error) throw error;
  return data;
}

async function loadPublishedOrder(client: SupabaseClient, blockId: string): Promise<PresentationEntry[]> {
  const { data, error } = await client.from("presentation_orders")
    .select("published_snapshot").eq("block_id", blockId).not("published_at", "is", null).maybeSingle();
  if (error) throw error;
  return Array.isArray(data?.published_snapshot) ? data.published_snapshot : [];
}

function orderedTeamKeys(rows: StudentReview[], order: PresentationEntry[]) {
  const numbers = [...new Set(rows.flatMap(row => row.team === null ? [] : [row.team]))].sort((a, b) => a - b);
  const remaining = new Map(numbers.map(number => [`Team ${number}`, String(number)]));
  const keys: string[] = [];
  for (const entry of [...order].sort((a, b) => a.position - b.position)) {
    const key = remaining.get(entry.teamName);
    if (key === undefined) continue;
    keys.push(key);
    remaining.delete(entry.teamName);
  }
  keys.push(...remaining.values());
  if (rows.some(row => row.team === null)) keys.push("unassigned");
  return keys;
}

async function saveReview(
  client: SupabaseClient, sessionId: string, row: StudentReview,
  content: ReviewContent | null, writeScore: boolean, score: number | null,
) {
  const { data, error } = await client.rpc("save_session_presentation_review", {
    p_session_id: sessionId,
    p_roster_id: row.rosterId,
    p_version: row.version,
    p_content: content,
    p_mark_version: row.markVersion,
    p_score: score,
    p_save_score: writeScore,
  });
  if (error) throw error;
  return { ...row, ...data, content: content ?? row.content, score: writeScore ? score : row.score } as StudentReview;
}

function message(error: unknown) {
  return (error as { message?: string })?.message || "An unexpected error occurred.";
}

function StudentCard({ client, sessionId, row, maximum, onDirty }: {
  client: SupabaseClient;
  sessionId: string;
  row: StudentReview;
  maximum: number | null;
  onDirty: (id: string, dirty: boolean) => void;
}) {
  const [saved, setSaved] = useState(row);
  const [content, setContent] = useState(row.content ?? blankContent);
  const [score, setScore] = useState(row.score == null ? "" : String(row.score));
  const [busy, setBusy] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const changedContent = JSON.stringify(content) !== JSON.stringify(saved.content ?? blankContent);
  const changedScore = maximum !== null && score !== (saved.score == null ? "" : String(saved.score));
  const dirty = changedContent || changedScore;
  const needsAttention = dirty || busy;
  const saveStatus = busy ? "Saving…" : dirty ? "Unsaved changes"
    : saved.score !== null ? "Score saved" : saved.content?.notes ? "Notes saved · score pending" : "Score pending";

  useEffect(() => {
    onDirty(row.rosterId, needsAttention);
  }, [needsAttention, row.rosterId, onDirty]);

  useEffect(() => {
    if (!dirty || busy || error) return;
    const timer = setTimeout(async () => {
      try {
        const mark = changedScore ? parseMark(score, maximum!) : null;
        setBusy(true);
        const next = await saveReview(client, sessionId, saved, changedContent ? content : null, changedScore, mark);
        setSaved(next);
        if (changedScore) setScore(current => current === score ? (next.score == null ? "" : String(next.score)) : current);
      } catch (cause) {
        setError(message(cause));
      } finally {
        setBusy(false);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [client, sessionId, dirty, busy, error, saved, changedContent, changedScore, content, score, maximum]);

  const update = (field: keyof ReviewContent, value: string) => {
    setError("");
    setContent(current => ({ ...current, [field]: value }));
  };

  async function reload() {
    if (!window.confirm("Replace this card’s unsaved changes with the latest saved values?")) return;
    setBusy(true);
    setReloading(true);
    try {
      const latest = (await loadReview(client, sessionId)).rows.find(student => student.rosterId === row.rosterId);
      if (!latest) throw Error("This student is no longer on the class roster.");
      setSaved(latest);
      setContent(latest.content ?? blankContent);
      setScore(latest.score == null ? "" : String(latest.score));
      setError("");
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
      setReloading(false);
    }
  }

  const textField = (field: keyof ReviewContent, label: string) => (
    <label>{label}<textarea disabled={reloading} value={content[field]} maxLength={2000} onChange={event => update(field, event.target.value)} /></label>
  );

  return (
    <article className="presentation-review-card" aria-label={row.name}>
      <h4>{row.name}</h4>
      <p className="presentation-question">{content.question || "No question prepared."}</p>
      <div className="presentation-question-tools">
        {(content.followUp || content.basis || content.listenFor) && (
          <details>
            <summary>Follow-up and preparation notes</summary>
            {content.followUp && <p>{content.followUp}</p>}
            {content.basis && <p><strong>Question basis:</strong> {content.basis}</p>}
            {content.listenFor && <p><strong>What to listen for:</strong> {content.listenFor}</p>}
          </details>
        )}
        <button type="button" className="secondary compact" onClick={() => setEditing(value => !value)} aria-expanded={editing}>
          {editing ? "Done editing questions" : "Edit questions"}
        </button>
      </div>
      {editing && <div className="presentation-question-fields">
        {textField("question", "Main question")}
        {textField("followUp", "Follow-up")}
        {textField("basis", "Question basis (S1–S9)")}
        {textField("listenFor", "What to listen for")}
      </div>}
      <div className="presentation-assessment-fields">
        <label>Score{maximum !== null && ` / ${maximum}`}
          <input inputMode="decimal" value={score} disabled={maximum === null || reloading}
            onChange={event => { setError(""); setScore(event.target.value); }} />
        </label>
        <label>Teacher notes (optional)
          <textarea disabled={reloading} rows={2} maxLength={6000} value={content.notes} onChange={event => update("notes", event.target.value)} />
        </label>
      </div>
      <div className="presentation-save-status" role="status" data-error={Boolean(error)}>{error || saveStatus}</div>
      {error && <div className="presentation-review-actions">
        <button type="button" className="secondary compact" disabled={busy || !dirty} onClick={() => setError("")}>Retry</button>
        <button type="button" className="secondary compact" disabled={busy} onClick={() => void reload()}>Reload saved values</button>
      </div>}
    </article>
  );
}

function readQuestionFile(text: string) {
  const template = document.createElement("template");
  template.innerHTML = text;
  return Array.from(template.content.querySelectorAll<HTMLElement>("section.panel")).flatMap(panel =>
    Array.from(panel.querySelectorAll("article.student")).map(card => {
      const question = card.querySelector(".main-question")?.textContent?.trim() ?? "";
      const teacherNotes = card.querySelectorAll("dd");
      return {
        team: panel.id,
        name: card.querySelector("h3")?.textContent?.trim() ?? "",
        content: {
          ...blankContent,
          question,
          followUp: card.querySelector(".followup")?.textContent?.trim() ?? "",
          basis: teacherNotes[0]?.textContent?.trim() ?? "",
          listenFor: teacherNotes[1]?.textContent?.trim() ?? "",
        },
      };
    }),
  );
}

export function PresentationReview({ client, sessionId, blockId, onClose }: {
  client: SupabaseClient;
  sessionId: string;
  blockId: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const questionFile = useRef<HTMLInputElement>(null);
  const reviewBody = useRef<HTMLDivElement>(null);
  const unsaved = useRef(new Set<string>());
  const onDirty = useRef((id: string, dirty: boolean) => {
    if (dirty) unsaved.current.add(id);
    else unsaved.current.delete(id);
  }).current;

  const [data, setData] = useState<ReviewData | null>(null);
  const [team, setTeam] = useState("");
  const [publishedOrder, setPublishedOrder] = useState<PresentationEntry[]>([]);
  const [orderUnavailable, setOrderUnavailable] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [importing, setImporting] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    dialog.current?.showModal();
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (unsaved.current.size) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  useEffect(() => {
    let active = true;
    const orderRequest = loadPublishedOrder(client, blockId).catch(() => null);
    Promise.all([loadReview(client, sessionId), orderRequest]).then(([value, order]) => {
      if (active) {
        setData(value);
        setPublishedOrder(order ?? []);
        setOrderUnavailable(order === null);
        setTeam(orderedTeamKeys(value.rows, order ?? [])[0] ?? "");
      }
    }).catch(cause => {
      if (active) setError(message(cause));
    });
    return () => { active = false; };
  }, [client, sessionId, blockId, attempt]);

  useEffect(() => {
    if (reviewBody.current) reviewBody.current.scrollTop = 0;
  }, [team]);

  function close() {
    if (importing) return;
    if (unsaved.current.size) {
      setNotice("Wait for saves to finish, or reload saved values on cards with errors before closing.");
      return;
    }
    onClose();
  }

  async function importQuestions(file: File) {
    if (!data || unsaved.current.size) {
      setNotice("Save your current edits before importing.");
      return;
    }
    setImporting(true);
    setNotice("");
    try {
      const source = readQuestionFile(await file.text());
      if (!source.length) throw Error("Choose the Final Presentation Q&A HTML file.");
      const latest = await loadReview(client, sessionId);
      const candidates: { row: StudentReview; content: ReviewContent }[] = [];
      const studentKey = (team: string, name: string) => JSON.stringify([team, name.trim().toLowerCase()]);
      const rosterCounts = new Map<string, number>();
      for (const row of latest.rows) {
        const key = studentKey(`team-${row.team}`, row.name);
        rosterCounts.set(key, (rosterCounts.get(key) ?? 0) + 1);
      }
      let skipped = 0;
      for (const row of latest.rows) {
        const key = studentKey(`team-${row.team}`, row.name);
        const matches = source.filter(entry => studentKey(entry.team, entry.name) === key && entry.content.question);
        if (matches.length !== 1 || rosterCounts.get(key) !== 1) continue;
        if (row.version > 0) skipped++;
        else candidates.push({ row, content: matches[0].content });
      }
      const results: StudentReview[] = [];
      for (const { row, content } of candidates) {
        try {
          results.push(await saveReview(client, sessionId, row, content, false, null));
        } catch {
          // Keep successful snapshots and allow retrying any remaining rows.
        }
      }
      const saved = new Map(results.map(row => [row.rosterId, row]));
      setData({ ...latest, rows: latest.rows.map(row => saved.get(row.rosterId) ?? row) });
      const latestTeams = orderedTeamKeys(latest.rows, publishedOrder);
      if (!latestTeams.includes(team)) setTeam(latestTeams[0] ?? "");
      const failed = candidates.length - results.length;
      setNotice(`Imported ${results.length}. ${skipped} already had saved reviews. ${latest.rows.length - candidates.length - skipped} had no unique team and name match.${failed ? ` ${failed} could not be saved. Close and reopen the review before retrying.` : ""}`);
    } catch (cause) {
      setNotice(message(cause));
    } finally {
      setImporting(false);
    }
  }

  const teamKeys = orderedTeamKeys(data?.rows ?? [], publishedOrder);
  const tabId = (key: string) => `presentation-tab-${key}`;
  const panelId = (key: string) => `presentation-team-${key}`;

  return (
    <dialog ref={dialog} className="presentation-review-dialog" aria-labelledby="presentation-review-title"
      onCancel={event => { event.preventDefault(); close(); }}>
      <header className="presentation-review-header">
        <div>
          <h3 id="presentation-review-title">S10 · Presentation Review</h3>
          <p>Scores save to Marks &amp; Feedback. Questions and teacher notes stay in this review.</p>
        </div>
        <div className="presentation-review-actions">
          {data && <>
            <button type="button" className="secondary compact" disabled={importing} onClick={() => questionFile.current?.click()}>
              Import Q&amp;A HTML
            </button>
            <input ref={questionFile} type="file" accept=".html,text/html" hidden disabled={importing}
              onChange={event => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void importQuestions(file);
              }} />
          </>}
          <button type="button" className="secondary compact" disabled={importing} onClick={close}>Close</button>
        </div>
      </header>
      {data && teamKeys.length > 0 && (
        <nav className="presentation-review-navigation" aria-label="Presentation review navigation">
          <div role="tablist" aria-label="Presentation teams" className="presentation-review-tabs"
            onKeyDown={event => {
              const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
              if (!keys.includes(event.key)) return;
              const index = teamKeys.indexOf(team);
              const next = event.key === "Home" ? 0 : event.key === "End" ? teamKeys.length - 1
                : (index + (event.key === "ArrowRight" ? 1 : -1) + teamKeys.length) % teamKeys.length;
              event.preventDefault();
              setTeam(teamKeys[next]);
              document.getElementById(tabId(teamKeys[next]))?.focus();
            }}>
            {teamKeys.map(key => <button type="button" key={key} id={tabId(key)} role="tab" aria-controls={panelId(key)}
              aria-selected={team === key} tabIndex={team === key ? 0 : -1} className="secondary compact"
              onClick={() => setTeam(key)}>{key === "unassigned" ? "Unassigned" : `Team ${key}`}</button>)}
          </div>
        </nav>
      )}
      {(importing || notice) && <p className="presentation-review-notice" role="status">{importing ? "Importing questions…" : notice}</p>}
      <div className="presentation-review-body" ref={reviewBody}>
        {error && <p role="alert">{error} <button type="button" className="secondary compact"
          onClick={() => { setError(""); setAttempt(value => value + 1); }}>Retry</button></p>}
        {!data && !error && <p role="status">Loading presentation reviews…</p>}
        {data && <>
          {data.maximum === null && <p>Configure a Presentation scoring item in Marks &amp; Feedback to enter scores.</p>}
          {!teamKeys.length && <p>No students are enrolled in this class.</p>}
          {orderUnavailable && teamKeys.length > 0 && <p role="status">Published order unavailable. Showing teams by number.</p>}
          <fieldset className="presentation-review-teams" disabled={importing}>
            {teamKeys.map(key => <div className="presentation-review-grid" key={key} role="tabpanel" id={panelId(key)}
              aria-labelledby={tabId(key)} hidden={key !== team}>
              {data.rows.filter(row => String(row.team ?? "unassigned") === key).map(row =>
                <StudentCard key={`${row.rosterId}:${row.version}:${row.markVersion}`} client={client} sessionId={sessionId}
                  row={row} maximum={data.maximum} onDirty={onDirty} />)}
            </div>)}
          </fieldset>
        </>}
      </div>
    </dialog>
  );
}
