import {TeamReviewDialog} from "./TeamReview";
import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CoreReviewEditor, CoreFeedbackView, PublishedCoreFeedback } from "./CoreReviewEditor";
import { classLabel, type TeachingClass } from "./TeacherAdministration";
import "./ReviewHub.css";
type Node = {
  id: string;
  label: string;
  fromSession: number;
  toSession: number;
  suggestedSession: number;
  includePreviousBlock: boolean;
};
type Config = {
  sessionAI: boolean;
  previousBlockId: string | null;
  nodes: Node[];
};
type Student = {
  studentId: string;
  studentName: string;
  teamNumber: number | null;
};
type Review = {
  id: string;
  studentId: string;
  nodeKey: string;
  node: Node;
  version: number;
  published: any;
  draft: any;
  updatedAt: string;
};
type Hub = {
  config: Config;
  version: number;
  students: Student[];
  reviews: Review[];
  legacy: any[];
  sessionChecks?: any[];
  teamMeetings?: any[];
};
function NodeDialog({
  client,
  review,
  student,
  onClose,
  onSaved,
  onDirty,
}: {
  client: SupabaseClient;
  review: { id: string; node: Node };
  student: Student;
  onClose: () => void;
  onSaved: () => void;
  onDirty: (v: boolean) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    dirty = useRef(false);
  const leave = () => {
    if (
      !dirty.current ||
      window.confirm("This review has unsaved changes. Leave and discard them?")
    )
      onClose();
  };
  useEffect(() => {
    const b = document.body.style.overflow,
      h = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    ref.current?.showModal();
    return () => {
      document.body.style.overflow = b;
      document.documentElement.style.overflow = h;
      onDirty(false);
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="intake-review-dialog node-review-dialog"
      aria-labelledby="node-review-title"
      onCancel={(e) => {
        e.preventDefault();
        leave();
      }}
    >
      <header className="review-topbar">
        <div>
          <span className="review-kicker">
            Teacher review · independent node
          </span>
          <h2 id="node-review-title">
            {review.node.id.toUpperCase()} · {review.node.label}
          </h2>
        </div>
        <button className="secondary compact" onClick={leave}>
          Close ×
        </button>
      </header>
      <div className="node-review-workspace">
        <CoreReviewEditor
          client={client}
          reviewId={review.id}
          student={
            {
              ...student,
              teamName: student.teamNumber
                ? `Team ${student.teamNumber}`
                : "Unassigned",
              intakeId: review.id,
              submitted: true,
            } as any
          }
          renderSource={() => null}
          renderPublished={(p) => <PublishedCoreFeedback feedback={p} />}
          onDirty={(v) => {
            dirty.current = v;
            onDirty(v);
          }}
          onSaved={onSaved}
        />
      </div>
    </dialog>
  );
}
export function ReviewHub({
  client,
  blockId,
  blocks,
  onBlockChange,
  onUnsaved,
}: {
  client: SupabaseClient;
  blockId: string;
  blocks: TeachingClass[];
  onBlockChange: (id: string) => void;
  onUnsaved: (v: boolean) => void;
}) {
  const [mode,setMode] = useState("individual");
  const [openedTeam,setOpenedTeam] = useState<{teamNumber:number;nodeKey:string;meetingId?:string}|null>(null);
  const [hub, setHub] = useState<Hub | null>(null),
    [config, setConfig] = useState<Config | null>(null),
    [view, setView] = useState("queue"),
    [nodeKey, setNodeKey] = useState(""),
    [query, setQuery] = useState(""),
    [team, setTeam] = useState("all"),
    [status, setStatus] = useState("all"),
    [recordType, setRecordType] = useState("all"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [opened, setOpened] = useState<{
      id: string;
      node: Node;
      student: Student;
    } | null>(null),
    [reviewDirty, setReviewDirty] = useState(false);
  const alive = useRef(true),
    request = useRef(0);
  const configDirty =
    !!hub && !!config && JSON.stringify(hub.config) !== JSON.stringify(config);
  const load = async (reset = true) => {
    const token = ++request.current;
    const { data, error } = await client.rpc("get_studio_review_hub", {
      p_block_id: blockId,
    });
    if (!alive.current || token !== request.current) return;
    if (error) {
      setError(error.message);
      return;
    }
    setHub(data);
    if (reset) setConfig(data.config);
    setNodeKey((k) =>
      data.config.nodes.some((n: Node) => n.id === k)
        ? k
        : data.config.nodes[0].id,
    );
    setError("");
  };
  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
      request.current++;
      onUnsaved(false);
    };
  }, [blockId, client]);
  useEffect(() => {
    onUnsaved(configDirty || reviewDirty);
    const stop = (e: BeforeUnloadEvent) => {
      if (configDirty || reviewDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", stop);
    return () => window.removeEventListener("beforeunload", stop);
  }, [configDirty, reviewDirty]);
  const start = async (s: Student, n: Node) => {
    if (configDirty) {
      setError("Save or discard settings before opening a review.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await client.rpc("open_teacher_node_review", {
        p_block_id: blockId,
        p_student_id: s.studentId,
        p_node_key: n.id,
      });
      if (error) throw error;
      if (alive.current) {
        setOpened({ id: data, node: n, student: s });
        void load(false);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const saveSettings = async () => {
    if (!hub || !config) return;
    setBusy(true);
    setError("");
    try {
      const { data, error } = await client.rpc("save_studio_review_settings", {
        p_block_id: blockId,
        p_version: hub.version,
        p_config: config,
      });
      if (error) throw error;
      if (alive.current) {
        setHub(data);
        setConfig(data.config);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const reviewStatus = (r?: Review) =>
    !r
      ? "Not started"
      : r.published && r.published.reviewVersion === r.version
        ? "Completed"
        : "Draft";
  const matches = (s: Student) =>
    `${s.studentName} ${s.studentId}`
      .toLowerCase()
      .includes(query.toLowerCase()) &&
    (team === "all" || String(s.teamNumber) === team);
  const n = hub?.config.nodes.find((n) => n.id === nodeKey);
  const locked = (id: string) => !!hub?.reviews.some((r) => r.nodeKey === id) || !!hub?.teamMeetings?.some(m => m.nodeKey === id);
  const changeNode = (id: string, patch: Partial<Node>) =>
    setConfig((c) =>
      c
        ? {
            ...c,
            nodes: c.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
          }
        : c,
    );
  return (
    <section className="review-hub">
      <header className="review-hub-heading">
        <div>
          <span className="eyebrow">Independent teacher decisions</span>
          <h2>Review</h2>
          <p>
            Sessions collect progress. Review nodes record what you confirm.
          </p>
        </div>
        <label>
          Class
          <select
            value={blockId}
            disabled={configDirty || reviewDirty || busy}
            onChange={(e) => onBlockChange(e.target.value)}
          >
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {classLabel(b)}
              </option>
            ))}
          </select>
        </label>
      </header>
      <nav className="review-hub-tabs" aria-label="Review workspace">
        {[
          ["queue", "To review"],
          ["records", "Review records"],
          ["settings", "Settings"],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-pressed={view === id}
            className={view === id ? "" : "secondary"}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {error && (
        <p role="alert" className="admin-alert">
          {error}{" "}
          {!hub &&
            "Apply the independent review nodes migration if this workspace is not installed."}
        </p>
      )}
      {!hub || !config ? (
        <p>Loading review workspace…</p>
      ) : (
        <>
          {view !== "settings" && (
            <div className="review-hub-filters">
              <label>
                Search
                <input
                  value={query}
                  placeholder={
                    view === "records"
                      ? "Name, ID or feedback text"
                      : "Name or student ID"
                  }
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <label>
                Team
                <select value={team} onChange={(e) => setTeam(e.target.value)}>
                  <option value="all">All teams</option>
                  {[...new Set(hub.students.map((s) => s.teamNumber))].map(
                    (t) => (
                      <option key={String(t)} value={String(t)}>
                        {t ? `Team ${t}` : "Unassigned"}
                      </option>
                    ),
                  )}
                </select>
              </label>
              {view === "records" && (
                <label>
                  Record type
                  <select
                    value={recordType}
                    onChange={(e) => setRecordType(e.target.value)}
                  >
                    <option value="all">All review types</option>
                    <option value="teacher">Teacher nodes</option><option value="team">Team meetings</option>
                    <option value="session-ai">Session AI checks</option>
                    <option value="legacy">Legacy teacher reviews</option>
                  </select>
                </label>
              )}
              <label>
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="all">All statuses</option>
                  {["Not started", "Draft", "Completed"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <button
                className="secondary compact"
                onClick={() => void load(false)}
                disabled={busy}
              >
                Refresh records
              </button>
            </div>
          )}
          {view === "queue" && (
            <>
              <div className="review-node-grid">
                {hub.config.nodes.map((node) => (
                  <button
                    key={node.id}
                    className={
                      "review-node-card " +
                      (nodeKey === node.id ? "selected" : "")
                    }
                    aria-pressed={nodeKey === node.id}
                    onClick={() => setNodeKey(node.id)}
                  >
                    <b>
                      {node.id.toUpperCase()} · {node.label}
                    </b>
                    <span>
                      Evidence S{node.fromSession}–S{node.toSession}
                    </span>
                    <small>
                      Suggested meeting S{node.suggestedSession} ·{" "}
                      {
                        hub.reviews.filter(
                          (r) =>
                            r.nodeKey === node.id &&
                            reviewStatus(r) === "Completed",
                        ).length
                      }
                      /{hub.students.length} completed
                    </small>
                  </button>
                ))}
              </div>
              <p className="review-hub-hint">
                Meeting sessions are guidance. Select a node and complete each
                student's review on the actual date. External reports are
                checked separately.
              </p>
              <div className="team-meeting-tools" aria-label="Review mode">
                <button className="secondary compact" aria-pressed={mode==="individual"} onClick={()=>setMode("individual")}>Individual</button>
                <button className="secondary compact" aria-pressed={mode==="team"} onClick={()=>setMode("team")}>Team</button>
              </div>
              {mode==="team" ? <div className="team-queue">{[...new Set(hub.students.map(s=>s.teamNumber).filter((t):t is number=>t!==null))].filter(t=>hub.students.some(s=>s.teamNumber===t&&matches(s))).map(t=>{
                const members=hub.students.filter(s=>s.teamNumber===t);
                const visibleMembers=members.filter(s=>status==="all"||reviewStatus(hub.reviews.find(r=>r.studentId===s.studentId&&r.nodeKey===nodeKey))===status);
                if(!visibleMembers.length)return null;
                return <article key={t}><b>Team {t}</b><p>{members.map(s=>s.studentName).join(" · ")}</p><p>{members.filter(s=>reviewStatus(hub.reviews.find(r=>r.studentId===s.studentId&&r.nodeKey===nodeKey))==="Completed").length}/{members.length} individual reviews completed</p><button className="secondary compact" disabled={busy||configDirty||!n} onClick={()=>setOpenedTeam({teamNumber:t,nodeKey})}>Open team meeting</button></article>;
              })}</div> : <div className="review-hub-table">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Team</th>
                      <th>Status</th>
                      <th>Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hub.students.filter(matches).map((s) => {
                      const r = hub.reviews.find(
                        (r) =>
                          r.studentId === s.studentId && r.nodeKey === nodeKey,
                      );
                      if (status !== "all" && status !== reviewStatus(r))
                        return null;
                      return (
                        <tr key={s.studentId}>
                          <td>
                            <b>{s.studentName}</b>
                            <small>{s.studentId}</small>
                          </td>
                          <td>{s.teamNumber ?? "—"}</td>
                          <td>{reviewStatus(r)}</td>
                          <td>
                            <button
                              className="secondary compact"
                              disabled={busy || configDirty || !n}
                              onClick={() => n && void start(s, n)}
                            >
                              {!r
                                ? "Start review"
                                : reviewStatus(r) === "Completed"
                                  ? "View review"
                                  : "Continue review"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>}
            </>
          )}
          {view === "records" && (
            <div className="review-record-list">
              {(recordType==="all"||recordType==="team") && (hub.teamMeetings||[]).filter(m=>(team==="all"||String(m.teamNumber)===team)&&(status==="all"||status===(m.participants.length>0&&m.participants.every((id:string)=>m.confirmed[id])?"Completed":m.observation?"Draft":"Not started"))&&`${m.teamNumber} ${m.nodeKey} ${m.observation} ${JSON.stringify(m.members)} ${JSON.stringify(m.feedback)}`.toLowerCase().includes(query.toLowerCase())).map(m=><article className="team-review-card" key={m.id}><h3>Team {m.teamNumber} · {m.nodeKey.toUpperCase()} meeting</h3><p>{m.meetingDate} · {m.participants.length} participating · {Object.keys(m.confirmed).length} members previously confirmed</p><p>{m.members.map((s:Student)=>s.studentName).join(" · ")}</p><button className="secondary compact" onClick={()=>setOpenedTeam({teamNumber:m.teamNumber,nodeKey:m.nodeKey,meetingId:m.id})}>View meeting</button></article>)}
              {(recordType === "all" || recordType === "teacher") &&
                hub.reviews
                  .filter((r) => {
                    const s = hub.students.find(
                      (s) => s.studentId === r.studentId,
                    );
                    return (
                      s &&
                      (team === "all" || String(s.teamNumber) === team) &&
                      (status === "all" || reviewStatus(r) === status) &&
                      `${s.studentName} ${s.studentId} ${r.nodeKey} ${JSON.stringify(r.draft)} ${JSON.stringify(r.published)}`
                        .toLowerCase()
                        .includes(query.toLowerCase())
                    );
                  })
                  .map((r) => {
                    const s = hub.students.find(
                      (s) => s.studentId === r.studentId,
                    )!;
                    return (
                      <article key={r.id}>
                        <header>
                          <div>
                            <b>
                              {s.studentName} · {r.nodeKey.toUpperCase()} ·{" "}
                              {r.node.label}
                            </b>
                            <small>
                              {reviewStatus(r)} · Updated{" "}
                              {new Date(r.updatedAt).toLocaleString()}
                            </small>
                          </div>
                          <button
                            className="secondary compact"
                            disabled={busy || configDirty}
                            onClick={() => void start(s, r.node)}
                          >
                            Open review
                          </button>
                        </header>
                        {r.published ? (
                          <PublishedCoreFeedback feedback={r.published} />
                        ) : (
                          <p>
                            {r.draft.teacherObservation ||
                              "Awaiting teacher observation."}
                          </p>
                        )}
                      </article>
                    );
                  })}
              {(recordType === "all" || recordType === "session-ai") &&
                (hub.sessionChecks || [])
                  .filter((r) => {
                    const s = hub.students.find(
                      (s) => s.studentId === r.studentId,
                    );
                    return (
                      s &&
                      (team === "all" || String(s.teamNumber) === team) &&
                      (status === "all" ||
                        status ===
                          (r.status === "ready" ? "Completed" : "Draft")) &&
                      `${s.studentName} ${s.studentId} ${JSON.stringify(r.result)}`
                        .toLowerCase()
                        .includes(query.toLowerCase())
                    );
                  })
                  .map((r) => (
                    <article key={`ai-${r.intakeId}`}>
                      <h4>
                        {
                          hub.students.find((s) => s.studentId === r.studentId)
                            ?.studentName
                        }{" "}
                        · S{r.sessionNumber} · AI progress check
                      </h4>
                      <small>
                        {r.status} · Not teacher verification or a mark
                      </small>
                      {(r.sourceChanged || r.correctionOpen) && (
                        <p>
                          Source changed or correction requested. This stored
                          result refers to an earlier version.
                        </p>
                      )}
                      <p>{r.result?.summary}</p>
                      <ul>
                        {r.result?.attentionPoints?.map(
                          (p: string, i: number) => (
                            <li key={i}>{p}</li>
                          ),
                        )}
                      </ul>
                    </article>
                  ))}
              {(recordType === "all" || recordType === "legacy") && (
                <details>
                  <summary>
                    Legacy session teacher reviews · preserved, read-only
                  </summary>
                  {hub.legacy
                    .filter((r) => {
                      const s = hub.students.find(
                        (s) => s.studentId === r.studentId,
                      );
                      return (
                        s &&
                        (team === "all" || String(s.teamNumber) === team) &&
                        `${s.studentName} ${s.studentId} ${JSON.stringify(r.published)}`
                          .toLowerCase()
                          .includes(query.toLowerCase())
                      );
                    })
                    .map((r) => (
                      <article key={r.intakeId}>
                        <b>
                          {
                            hub.students.find(
                              (s) => s.studentId === r.studentId,
                            )?.studentName
                          }{" "}
                          · S{r.sessionNumber}
                        </b>
                        {r.published.coreReview ? (
                          <PublishedCoreFeedback feedback={r.published} />
                        ) : (
                          <>
                            <p>{r.published.quickNotes}</p>
                            {r.published.items?.map((v: any, i: number) => (
                              <p key={i}>
                                {v.observation || v.finding} {v.notes}{" "}
                                {v.recommendation}
                              </p>
                            ))}
                          </>
                        )}
                      </article>
                    ))}
                </details>
              )}
            </div>
          )}
          {view === "settings" && (
            <div className="review-settings">
              <h3>Review schedule</h3>
              <p>
                Evidence windows and suggested meetings are independent. A
                node's definition locks once the first student review is opened;
                add a new node for a different cycle.
              </p>
              <label className="review-toggle">
                <input
                  type="checkbox"
                  checked={config.sessionAI}
                  onChange={(e) =>
                    setConfig({ ...config, sessionAI: e.target.checked })
                  }
                />
                Automatic AI progress checks for confirmed session records
              </label>
              <p className="review-hub-hint">
                Checks generate once when a confirmed record is viewed after
                submission, then reuse the saved result. No background worker or
                bulk historical generation runs.
              </p>
              <label>
                Previous class for R1
                <select
                  value={config.previousBlockId || ""}
                  disabled={hub.reviews.some(
                    (r) => r.node.includePreviousBlock,
                  )}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      previousBlockId: e.target.value || null,
                    })
                  }
                >
                  <option value="">Not linked</option>
                  {blocks
                    .filter((b) => b.id !== blockId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {classLabel(b)}
                      </option>
                    ))}
                </select>
              </label>
              <div className="review-settings-nodes">
                {config.nodes.map((node) => (
                  <fieldset key={node.id} disabled={locked(node.id) || busy}>
                    <legend>
                      {node.id.toUpperCase()}{" "}
                      {locked(node.id) ? "· Started, definition locked" : ""}
                    </legend>
                    <label>
                      Node name
                      <input
                        maxLength={80}
                        value={node.label}
                        onChange={(e) =>
                          changeNode(node.id, { label: e.target.value })
                        }
                      />
                    </label>
                    <div className="review-range">
                      <label>
                        Evidence from S
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={node.fromSession}
                          onChange={(e) =>
                            changeNode(node.id, {
                              fromSession: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        Through S
                        <input
                          type="number"
                          min={node.fromSession}
                          max={99}
                          value={node.toSession}
                          onChange={(e) =>
                            changeNode(node.id, {
                              toSession: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        Suggested meeting S
                        <input
                          type="number"
                          min={node.toSession}
                          max={99}
                          value={node.suggestedSession}
                          onChange={(e) =>
                            changeNode(node.id, {
                              suggestedSession: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                    <label className="review-toggle">
                      <input
                        type="checkbox"
                        checked={node.includePreviousBlock}
                        onChange={(e) =>
                          changeNode(node.id, {
                            includePreviousBlock: e.target.checked,
                          })
                        }
                      />
                      Include this student's linked previous-class records
                    </label>
                    <button
                      className="secondary compact"
                      disabled={config.nodes.length === 1}
                      onClick={() =>
                        setConfig({
                          ...config,
                          nodes: config.nodes.filter((n) => n.id !== node.id),
                        })
                      }
                    >
                      Remove node
                    </button>
                  </fieldset>
                ))}
              </div>
              <div className="review-settings-actions">
                <button
                  className="secondary"
                  disabled={busy || config.nodes.length >= 12}
                  onClick={() =>
                    setConfig({
                      ...config,
                      nodes: [
                        ...config.nodes,
                        {
                          id: `r_${crypto.randomUUID().slice(0, 8)}`,
                          label: "New review",
                          fromSession: 1,
                          toSession: 1,
                          suggestedSession: 1,
                          includePreviousBlock: false,
                        },
                      ],
                    })
                  }
                >
                  Add review node
                </button>
                <button
                  disabled={busy || !configDirty}
                  onClick={() => void saveSettings()}
                >
                  Save settings
                </button>
                <button
                  className="secondary"
                  disabled={busy || !configDirty}
                  onClick={() => {
                    setConfig(hub.config);
                    setError("");
                  }}
                >
                  Discard changes
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {openedTeam && <TeamReviewDialog key={`${openedTeam.teamNumber}-${openedTeam.nodeKey}-${openedTeam.meetingId||"latest"}`} client={client} blockId={blockId} {...openedTeam} onDirty={setReviewDirty} onSaved={()=>void load(false)} onClose={()=>{setOpenedTeam(null);setReviewDirty(false);void load(false);}}/>}
      {opened && (
        <NodeDialog
          key={opened.id}
          client={client}
          review={opened}
          student={opened.student}
          onClose={() => {
            setOpened(null);
            setReviewDirty(false);
            void load(false);
          }}
          onSaved={() => void load(false)}
          onDirty={setReviewDirty}
        />
      )}
    </section>
  );
}
