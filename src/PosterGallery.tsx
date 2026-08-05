import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { createClient } from "@supabase/supabase-js";
import { CheckCircle2, Eye, FileUp, Image, RefreshCw, Trash2, X } from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "https://gwihaizxivclamzehupk.supabase.co",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_-RPm45eBd8_CVaNk4GbXhg_nxOkMrLr",
);
const maxBytes = 5 * 1024 * 1024;
const acceptedTypes = new Set(["application/pdf", "image/png", "image/jpeg"]);

type PosterDraft = {
  versionId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};
type GalleryPoster = {
  teamId: string;
  teamName: string;
  projectName: string | null;
  versionId: string | null;
  originalFilename: string | null;
  mimeType: string | null;
  isOwnTeam: boolean;
  feedbackCompleted: boolean;
};
type TeacherTeamPoster = {
  teamId: string;
  teamName: string;
  projectName: string | null;
  draft: PosterDraft | null;
  publishedVersionId: string | null;
};

async function posterApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Your session has expired. Please sign in again.");
  const response = await fetch("/api/poster", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ action, ...payload }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Poster action could not be completed.");
  return result as T;
}

function validateFile(file: File) {
  if (!acceptedTypes.has(file.type)) return "Use a one-page PDF, PNG, JPG or JPEG file.";
  if (file.size > maxBytes) return "Poster files must be 5 MB or smaller.";
  if (file.size === 0) return "This file is empty. Choose a valid Poster file.";
  return "";
}

async function uploadPoster(file: File, teamId: string) {
  const request = await posterApi<{ path: string; token: string }>("request-upload", {
    teamId, mimeType: file.type, sizeBytes: file.size,
  });
  const { error } = await supabase.storage.from("poster-gallery").uploadToSignedUrl(request.path, request.token, file, {
    contentType: file.type,
  });
  if (error) throw new Error("The Poster upload did not complete. Check your connection and try again.");
  return posterApi<PosterDraft>("finalize-upload", {
    teamId,
    path: request.path,
    mimeType: file.type,
    originalFilename: file.name,
  });
}

function PosterPreview({ versionId, mimeType, title, compact = false }: { versionId: string; mimeType: string; title: string; compact?: boolean }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const load = useCallback(async () => {
    setError("");
    try {
      const result = await posterApi<{ signedUrl: string }>("view", { versionId });
      setUrl(result.signedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview unavailable.");
    }
  }, [versionId]);
  useEffect(() => { void load(); }, [load]);
  const visual = url ? (mimeType === "application/pdf"
    ? <object data={`${url}#toolbar=0&navpanes=0`} type="application/pdf" aria-label={`${title} Poster`}><span>PDF preview unavailable.</span></object>
    : <img src={url} alt={`${title} Poster`} />) : <div className="poster-preview-placeholder"><RefreshCw size={20}/><span>{error || "Loading Poster…"}</span></div>;
  return <>
    <button type="button" className={`poster-preview ${compact ? "compact" : ""}`} onClick={() => setOpen(true)} disabled={!url} aria-label={`Enlarge ${title} Poster`}>
      {visual}<span className="poster-preview-action"><Eye size={15}/> Enlarge</span>
    </button>
    {open && url && <div className="poster-lightbox" role="dialog" aria-modal="true" aria-label={`${title} Poster preview`} onMouseDown={(event)=>event.target===event.currentTarget&&setOpen(false)}>
      <div className="poster-lightbox-card"><button type="button" className="poster-lightbox-close" onClick={()=>setOpen(false)} aria-label="Close Poster preview"><X/></button><div className="poster-lightbox-title"><b>{title}</b><a href={url} target="_blank" rel="noreferrer">Open original</a></div><div className="poster-lightbox-content">{mimeType === "application/pdf" ? <object data={`${url}#toolbar=1`} type="application/pdf" aria-label={`${title} Poster PDF`}/> : <img src={url} alt={`${title} Poster full preview`}/>}</div></div>
    </div>}
  </>;
}

function UploadControl({ teamId, current, onUploaded, compact = false }: { teamId: string; current?: PosterDraft | null; onUploaded: () => void; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const invalid = validateFile(file);
    if (invalid) return setMessage(invalid);
    setBusy(true); setMessage("Uploading securely, then validating your Poster…");
    try {
      await uploadPoster(file, teamId);
      setMessage("Poster validated and saved as the Team draft.");
      onUploaded();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Poster upload failed.");
    } finally { setBusy(false); }
  }
  return <div className={`poster-upload-control ${compact ? "compact" : ""}`}>
    <label className={`poster-upload-button ${busy ? "disabled" : ""}`}><FileUp size={17}/>{busy ? "Validating…" : current ? "Replace Poster" : "Upload Poster"}<input type="file" accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg" disabled={busy} onChange={choose}/></label>
    {message && <small className={message.includes("validated") ? "success" : ""} role="status">{message}</small>}
  </div>;
}

export function StudentPosterGallery({ onFeedback }: { onFeedback: (teamName: string) => void }) {
  const [uploadStatus, setUploadStatus] = useState<{ teamId: string; teamName: string; draft: PosterDraft | null } | null>(null);
  const [gallery, setGallery] = useState<{ isPublished: boolean; posters: GalleryPoster[] } | null>(null);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const [upload, published] = await Promise.all([
      supabase.rpc("get_my_poster_upload_status"),
      supabase.rpc("get_my_poster_gallery"),
    ]);
    if (upload.error || published.error) {
      setMessage("Poster Gallery could not be loaded. Ask your teacher to confirm the Phase 1 migration.");
      return;
    }
    setUploadStatus(upload.data as { teamId: string; teamName: string; draft: PosterDraft | null });
    setGallery(published.data as { isPublished: boolean; posters: GalleryPoster[] });
    setMessage("");
  }, []);
  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener("poster-feedback-recorded", refresh);
    return () => window.removeEventListener("poster-feedback-recorded", refresh);
  }, [load]);
  return <section className="poster-gallery-student" aria-labelledby="poster-gallery-title">
    <div className="poster-gallery-heading"><div><span>Week 3 · Poster Gallery</span><h3 id="poster-gallery-title">See the project. Then give useful feedback.</h3><p>Each Poster is one page: problem, solution, key features and project value. Poster access is limited to your teaching block.</p></div><span className={`activity-control-status ${gallery?.isPublished ? "open" : "closed"}`}>{gallery?.isPublished ? "Gallery open" : "Gallery hidden"}</span></div>
    {uploadStatus && <article className="my-poster-panel"><div><span>Your Team Poster · {uploadStatus.teamName}</span><b>{uploadStatus.draft ? uploadStatus.draft.originalFilename : "No Poster uploaded yet"}</b><small>PDF preferred · PNG/JPG accepted · exactly one page · maximum 5 MB</small></div><UploadControl teamId={uploadStatus.teamId} current={uploadStatus.draft} onUploaded={load}/></article>}
    {message && <p className="admin-alert error" role="alert">{message}</p>}
    {!gallery ? <p className="empty-state">Loading Poster Gallery…</p> : !gallery.isPublished ? <div className="gallery-hidden-state"><Image/><div><b>The Gallery is not published yet.</b><span>You can prepare your Team Poster now. Your teacher will open the Gallery when the class is ready.</span></div></div> : <div className="poster-gallery-grid">
      {gallery.posters.map(poster => <article key={poster.teamId} className={`gallery-poster-card ${poster.isOwnTeam ? "own" : ""}`}><div className="gallery-card-heading"><div><span>{poster.teamName}{poster.isOwnTeam ? " · Your team" : ""}</span><h4>{poster.projectName || "Project assignment pending"}</h4></div>{poster.feedbackCompleted && <CheckCircle2 className="feedback-complete-icon"/>}</div>{poster.versionId && poster.mimeType ? <PosterPreview versionId={poster.versionId} mimeType={poster.mimeType} title={poster.teamName}/> : <div className="poster-missing"><Image/><b>Poster unavailable</b><span>This Team has not published a Poster.</span></div>}<div className="gallery-card-action">{poster.isOwnTeam ? <span>Feedback is for other Teams.</span> : poster.feedbackCompleted ? <strong><CheckCircle2 size={16}/> Feedback completed</strong> : <button type="button" disabled={!poster.versionId} onClick={()=>onFeedback(poster.teamName)}>Give feedback</button>}</div></article>)}
    </div>}
  </section>;
}

export function TeacherPosterGallery({ blockId, blocks, onBlockChange }: { blockId: string; blocks: Array<{ id:string; academic_year:number; block_code:string; status:string }>; onBlockChange: (id:string)=>void }) {
  const [data, setData] = useState<{ isPublished: boolean; publishedAt: string | null; teams: TeacherTeamPoster[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    if (!blockId) return;
    const { data: result, error } = await supabase.rpc("get_teacher_poster_gallery", { p_block_id: blockId });
    if (error) { setData(null); setMessage("Poster Gallery could not be loaded. Apply the Sprint 6 Phase 1 migration first."); }
    else { setData(result as typeof data); setMessage(""); }
  }, [blockId]);
  useEffect(()=>{ void load(); },[load]);
  async function publication(next: boolean) {
    if (!blockId) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.rpc(next ? "publish_poster_gallery" : "hide_poster_gallery", { p_block_id: blockId });
    setBusy(false);
    if (error) return setMessage(next ? "Gallery could not be published." : "Gallery could not be hidden.");
    setMessage(next ? "Gallery published. Students now see this snapshot." : "Gallery hidden. Posters and feedback are preserved.");
    await load();
  }
  async function remove(team: TeacherTeamPoster) {
    if (!team.draft || !window.confirm(`Remove ${team.teamName}'s current draft Poster? If this exact version is already published, it will become unavailable immediately. Publish again to refresh the whole Gallery snapshot.`)) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.rpc("remove_team_poster_draft", { p_team_id: team.teamId });
    setBusy(false);
    setMessage(error ? "The Poster draft could not be removed." : `${team.teamName} draft removed. Replacement history is retained.`);
    if (!error) await load();
  }
  return <section className="teacher-poster-workspace">
    <div className="poster-admin-heading"><div><div className="eyebrow">Week 3 publishing</div><h2>Poster Gallery</h2><p>Collect and preview Team Posters, then publish one fixed block snapshot for peer feedback.</p></div><label className="admin-block-filter">Teaching block<select value={blockId} onChange={(event)=>onBlockChange(event.target.value)}>{blocks.map(block=><option key={block.id} value={block.id}>{block.academic_year} · {block.block_code}{block.status === "active" ? " — Active" : ""}</option>)}</select></label></div>
    <div className="poster-publication-bar"><div><span className={`activity-control-status ${data?.isPublished ? "open" : "closed"}`}>{data?.isPublished ? "Published" : "Hidden"}</span><div><b>Upload and Publish are separate.</b><small>{data?.publishedAt ? `Latest snapshot · ${new Date(data.publishedAt).toLocaleString()}` : "No student-visible snapshot yet."}</small></div></div><button type="button" className={data?.isPublished ? "danger" : "primary"} disabled={busy||!data} onClick={()=>void publication(!data?.isPublished)}>{busy ? "Updating…" : data?.isPublished ? "Hide Gallery" : "Publish Gallery"}</button></div>
    {message && <p className="activity-control-message" role="status">{message}</p>}
    {!data ? <p className="empty-state">Loading Team Posters…</p> : <div className="teacher-poster-grid">{data.teams.map(team=>{const published=Boolean(team.draft && team.publishedVersionId===team.draft.versionId);return <article key={team.teamId}><div className="teacher-poster-card-heading"><div><span>{team.teamName}</span><h3>{team.projectName || "Project assignment pending"}</h3></div><span className={`activity-control-status ${published ? "open" : team.draft ? "scheduled" : "closed"}`}>{published ? "Published" : team.draft ? "Ready" : "Missing"}</span></div>{team.draft ? <><PosterPreview versionId={team.draft.versionId} mimeType={team.draft.mimeType} title={team.teamName} compact/><div className="teacher-poster-file"><b>{team.draft.originalFilename}</b><small>{(team.draft.sizeBytes/1024/1024).toFixed(2)} MB · {new Date(team.draft.createdAt).toLocaleString()}</small>{team.publishedVersionId && !published && <span>Draft changed · publish again to update students</span>}</div></> : <div className="poster-missing"><Image/><b>No Poster</b><span>This Team is shown as unavailable if you publish now.</span></div>}<div className="teacher-poster-actions"><UploadControl compact teamId={team.teamId} current={team.draft} onUploaded={load}/>{team.draft && <button type="button" className="secondary danger-text" disabled={busy} onClick={()=>void remove(team)}><Trash2 size={15}/> Remove</button>}</div></article>})}</div>}
  </section>;
}
