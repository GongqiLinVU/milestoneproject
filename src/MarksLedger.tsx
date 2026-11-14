import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { classLabel, type TeachingClass } from "./TeacherAdministration";
import defaults from "./defaultAssessment.json";
import {
  allNodes,
  leaves,
  maximum,
  totalMaximum,
  subtotal,
  parseMark,
  validatePlan,
  gradeStatus,
  blankComment,
  type AssessmentPlan,
  type MarkRow,
  type MarkComment,
} from "./assessment";
import {
  exportMatrix,
  assessmentCSV,
  assessmentXLSX,
  downloadAssessment,
} from "./assessmentExport";
import "./MarksLedger.css";
type DraftRow = MarkRow & { inputs: Record<string, string> };
type AuditEntry = {
  changed_at: string;
  before_value: { scores: MarkRow["scores"]; comments: MarkRow["comments"] };
  after_value: {
    version: number;
    scores: MarkRow["scores"];
    comments: MarkRow["comments"];
  };
};
type Ledger = {
  plan: AssessmentPlan | null;
  planVersion: number;
  locked: boolean;
  rows: MarkRow[];
  templates: Array<{ id: string; title: string; config: AssessmentPlan }>;
};
const fingerprint = (r: DraftRow) =>
  JSON.stringify({ inputs: r.inputs, comments: r.comments });
export function MarksLedger({
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
  onUnsaved: (value: boolean) => void;
}) {
  const [ledger, setLedger] = useState<Ledger | null>(null),
    [rows, setRows] = useState<DraftRow[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [view, setView] = useState("overview"),
    [query, setQuery] = useState(""),
    [team, setTeam] = useState("all"),
    [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState(""),
    [commentItem, setCommentItem] = useState(""),
    [statuses, setStatuses] = useState<Record<string, string>>({}),
    [configText, setConfigText] = useState(JSON.stringify(defaults, null, 2)),
    [configBusy, setConfigBusy] = useState(false),
    [exportFiltered, setExportFiltered] = useState(false),
    [aiBusy, setAIBusy] = useState(false),
    [aiError, setAIError] = useState(""),
    [history, setHistory] = useState<AuditEntry[] | null>(null);
  const current = useRef<DraftRow[]>([]),
    saved = useRef(new Map<string, string>()),
    versions = useRef(new Map<string, number>()),
    pending = useRef(new Set<string>()),
    timers = useRef(new Map<string, ReturnType<typeof setTimeout>>()),
    alive = useRef(true),
    modal = useRef<HTMLDialogElement>(null),
    request = useRef(0),
    blocked = useRef(new Set<string>());
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const plan = ledger?.plan || null;
  const dirty = () =>
    pending.current.size > 0 ||
    current.current.some(
      (r) => saved.current.get(r.rosterId) !== fingerprint(r),
    );
  function reportDirty() {
    onUnsaved(dirty());
  }
  function setCurrent(next: DraftRow[]) {
    current.current = next;
    setRows(next);
    reportDirty();
  }
  async function load() {
    const seq = ++request.current;
    setLoading(true);
    setError("");
    try {
      const { data, error } = await client.rpc("get_assessment_ledger", {
        p_block_id: blockId,
      });
      if (!alive.current || seq !== request.current) return;
      if (error) throw error;
      const value = data as Ledger;
      setLedger(value);
      setView("overview");
      setConfigText(JSON.stringify(value.plan || defaults, null, 2));
      const loaded = value.rows.map((r) => ({
        ...r,
        inputs: Object.fromEntries(
          Object.entries(r.scores).map(([k, v]) => [
            k,
            v == null ? "" : String(v),
          ]),
        ),
      }));
      saved.current = new Map(loaded.map((r) => [r.rosterId, fingerprint(r)]));
      versions.current = new Map(loaded.map((r) => [r.rosterId, r.version]));
      blocked.current.clear();
      setStatuses({});
      setCurrent(loaded);
    } catch (e) {
      if (alive.current)
        setError((e as Error).message || "Marks could not be loaded.");
    } finally {
      if (alive.current) setLoading(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    void load();
    const before = (e: BeforeUnloadEvent) => {
      if (dirty()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => {
      alive.current = false;
      request.current++;
      timers.current.forEach(clearTimeout);
      window.removeEventListener("beforeunload", before);
      onUnsaved(false);
    };
  }, [blockId, client]);
  const status = (id: string, text: string) => {
    if (alive.current) setStatuses((old) => ({ ...old, [id]: text }));
  };
  async function save(id: string): Promise<boolean> {
    if (!plan || pending.current.has(id) || blocked.current.has(id))
      return false;
    const row = current.current.find((r) => r.rosterId === id);
    if (!row) return false;
    const sent = fingerprint(row);
    if (saved.current.get(id) === sent) return true;
    clearTimeout(timers.current.get(id));
    const scores: Record<string, number | null> = {};
    try {
      for (const n of plan.items.flatMap(leaves))
        scores[n.id] = parseMark(row.inputs[n.id] || "", n.maxScore!);
    } catch (e) {
      status(id, (e as Error).message);
      reportDirty();
      return false;
    }
    const comments = structuredClone(row.comments);
    pending.current.add(id);
    reportDirty();
    status(id, "Saving…");
    try {
      const { data, error } = await client.rpc("save_assessment_record", {
        p_block_id: blockId,
        p_roster_id: id,
        p_expected_version: versions.current.get(id) || 0,
        p_scores: scores,
        p_comments: comments,
      });
      if (!alive.current) return false;
      if (error) throw error;
      versions.current.set(id, data.version);
      saved.current.set(id, sent);
      setLedger((old) => (old ? { ...old, locked: true } : old));
      status(id, "Saved");
      return true;
    } catch (e) {
      if (alive.current) {
        blocked.current.add(id);
        status(
          id,
          (e as Error).message || "Save failed. Your edits remain here.",
        );
      }
      return false;
    } finally {
      pending.current.delete(id);
      if (alive.current) {
        reportDirty();
        const latest = current.current.find((r) => r.rosterId === id);
        if (
          latest &&
          fingerprint(latest) !== saved.current.get(id) &&
          !blocked.current.has(id)
        )
          timers.current.set(
            id,
            setTimeout(() => void save(id), 700),
          );
      }
    }
  }
  function edit(id: string, transform: (r: DraftRow) => DraftRow) {
    setCurrent(
      current.current.map((r) => (r.rosterId === id ? transform(r) : r)),
    );
    if (!blocked.current.has(id)) status(id, "Unsaved");
    clearTimeout(timers.current.get(id));
    if (!blocked.current.has(id))
      timers.current.set(
        id,
        setTimeout(() => void save(id), 700),
      );
  }
  function commentChange(
    id: string,
    itemId: string,
    patch: Partial<MarkComment>,
  ) {
    edit(id, (r) => ({
      ...r,
      comments: {
        ...r.comments,
        [itemId]: { ...(r.comments[itemId] || blankComment()), ...patch },
      },
    }));
  }
  function numericRow(r: DraftRow): MarkRow {
    const scores: Record<string, number | null> = {};
    for (const n of plan!.items.flatMap(leaves)) {
      try {
        scores[n.id] = parseMark(r.inputs[n.id] || "", n.maxScore!);
      } catch {
        scores[n.id] = null;
      }
    }
    return { ...r, scores };
  }
  const commentNodes = plan
    ? allNodes(plan).filter((n) => n.commentEnabled)
    : [];
  const feedbackStatus = (r: DraftRow) =>
    commentNodes.length === 0
      ? "Not required"
      : commentNodes.every((n) => r.comments[n.id]?.confirmed)
        ? "Confirmed"
        : commentNodes.some((n) => r.comments[n.id]?.feedback)
          ? "Draft"
          : "Not started";
  const visible = rows.filter(
    (r) =>
      (!query ||
        `${r.name} ${r.studentId}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (team === "all" || String(r.team) === team) &&
      (filter === "all" ||
        (filter === "unmarked" &&
          gradeStatus(plan!, numericRow(r)) !== "Complete") ||
        (filter === "feedback" && feedbackStatus(r) !== "Confirmed")),
  );
  const active = rows.find((r) => r.rosterId === selected),
    item = commentNodes.find((n) => n.id === commentItem) || commentNodes[0];
  useEffect(() => {
    if (selected && !modal.current?.open) modal.current?.showModal();
    if (!selected && modal.current?.open) modal.current.close();
  }, [selected]);
  async function configure() {
    if (!ledger) return;
    setConfigBusy(true);
    setError("");
    try {
      const cfg = JSON.parse(configText) as AssessmentPlan;
      validatePlan(cfg);
      const { error } = await client.rpc("set_assessment_plan", {
        p_block_id: blockId,
        p_expected_version: ledger.planVersion,
        p_config: cfg,
      });
      if (error) throw error;
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setConfigBusy(false);
    }
  }
  function changeClass(id: string) {
    if (dirty() || aiBusy) {
      setError("Save or reconcile current edits before switching class.");
      return;
    }
    onBlockChange(id);
  }
  function exportData(format: "csv" | "xlsx") {
    try {
      if (dirty()) throw Error("Save all edits before exporting.");
      const cls = blocks.find((b) => b.id === blockId);
      if (!plan || !cls) return;
      const matrix = exportMatrix(
        plan,
        (exportFiltered ? visible : rows).map(numericRow),
        cls,
      );
      const name = `${cls.course_code || "NIT3004"}-${cls.academic_year}-${cls.block_code}-${cls.class_code || "C1"}-marks-${new Date().toISOString().slice(0, 10)}`;
      if (format === "csv")
        downloadAssessment(
          name + ".csv",
          assessmentCSV(matrix),
          "text/csv;charset=utf-8",
        );
      else
        downloadAssessment(
          name + ".xlsx",
          assessmentXLSX(matrix),
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function generate() {
    if (!active || !item || aiBusy) return;
    const id = active.rosterId,
      key = item.id;
    setAIBusy(true);
    setAIError("");
    try {
      if (pending.current.has(id))
        throw Error("Wait until the current save completes.");
      if (!(await save(id)))
        throw Error(
          "Save or reconcile this student’s record before generating feedback.",
        );
      const {
        data: { session },
      } = await client.auth.getSession();
      if (!session) throw Error("Sign in again.");
      const response = await fetch("/api/assessment-feedback", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ blockId, rosterId: id, itemId: key }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error || "Feedback could not be generated.");
      if (alive.current) commentChange(id, key, { aiDraft: result.draft });
    } catch (e) {
      if (alive.current) setAIError((e as Error).message);
    } finally {
      if (alive.current) setAIBusy(false);
    }
  }
  async function showHistory() {
    if (!active) return;
    const id = active.rosterId;
    setHistory(null);
    const { data, error } = await client.rpc("get_assessment_history", {
      p_block_id: blockId,
      p_roster_id: id,
    });
    if (alive.current && selectedRef.current === id) {
      if (error) setAIError(error.message);
      else setHistory(data || []);
    }
  }
  function reloadSaved() {
    if (
      !dirty() ||
      window.confirm(
        "Discard local edits and reload saved records? Copy any edits you need to reconcile before continuing.",
      )
    ) {
      timers.current.forEach(clearTimeout);
      setSelected("");
      void load();
    }
  }
  function auditChanges(h: AuditEntry) {
    const before = h.before_value,
      after = h.after_value;
    return allNodes(plan!).flatMap((n) => {
      const changes: string[] = [];
      if ((before.scores[n.id] ?? null) !== (after.scores[n.id] ?? null))
        changes.push(
          `${n.label}: ${before.scores[n.id] ?? "Blank"} → ${after.scores[n.id] ?? "Blank"}`,
        );
      const old = before.comments[n.id] || blankComment(),
        next = after.comments[n.id] || blankComment();
      if (old.notes !== next.notes)
        changes.push(`${n.label}: private notes updated`);
      if (old.feedback !== next.feedback)
        changes.push(`${n.label}: feedback updated`);
      if (old.aiDraft !== next.aiDraft)
        changes.push(`${n.label}: AI draft updated`);
      if (old.confirmed !== next.confirmed)
        changes.push(
          `${n.label}: feedback ${next.confirmed ? "confirmed" : "returned to draft"}`,
        );
      return changes;
    });
  }
  if (loading)
    return (
      <section className="marks-workspace">
        <p>Loading marks…</p>
      </section>
    );
  const nodes =
    view === "overview"
      ? plan?.items || []
      : plan?.items.filter((n) => n.id === view) || [];
  const columns =
    view === "overview"
      ? nodes
      : nodes.flatMap((n) => (n.children ? leaves(n) : [n]));
  return (
    <section className="marks-workspace" aria-label="Block marks and feedback">
      <div className="marks-heading">
        <div>
          <span className="eyebrow">Block assessment ledger</span>
          <h2>Marks &amp; Feedback</h2>
          <p>
            Manual marks · teacher-only records ·{" "}
            {plan?.name || "Configure this class to start"}
          </p>
        </div>
        <label>
          Class
          <select value={blockId} onChange={(e) => changeClass(e.target.value)}>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {classLabel(b)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="marks-error">
          {error}{" "}
          <button
            type="button"
            className="secondary compact"
            disabled={pending.current.size > 0 || aiBusy}
            onClick={reloadSaved}
          >
            Reload saved records
          </button>
        </p>
      )}
      {!ledger && (
        <p>
          Apply the marks-ledger database migration before using this workspace.
        </p>
      )}
      {ledger && (
        <details className="marks-config" open={!plan}>
          <summary>
            Assessment structure ·{" "}
            {ledger.locked
              ? "Locked after marking began"
              : plan
                ? "Editable before marking"
                : "Setup required"}
          </summary>
          <p>
            Stable IDs identify items. Groups derive maxima from children. New
            class snapshots do not change existing classes. Structure locks when
            the first record is saved.
          </p>
          <fieldset disabled={ledger.locked || configBusy || dirty()}>
            <label>
              Start from a template
              <select
                defaultValue=""
                onChange={(e) => {
                  const t = ledger.templates.find(
                    (t) => t.id === e.target.value,
                  );
                  if (t) setConfigText(JSON.stringify(t.config, null, 2));
                }}
              >
                <option value="">Choose a template…</option>
                {ledger.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Class assessment configuration (JSON)
              <textarea
                value={configText}
                maxLength={20000}
                rows={12}
                onChange={(e) => setConfigText(e.target.value)}
              />
            </label>
            <button type="button" onClick={() => void configure()}>
              {configBusy ? "Saving…" : "Save class structure"}
            </button>
          </fieldset>
        </details>
      )}
      {plan && (
        <>
          <div className="marks-summary">
            <div>
              <b>{rows.length}</b>
              <span>Students</span>
            </div>
            <div>
              <b>
                {
                  rows.filter(
                    (r) => gradeStatus(plan, numericRow(r)) === "Complete",
                  ).length
                }
              </b>
              <span>Marks complete</span>
            </div>
            <div>
              <b>
                {rows.filter((r) => feedbackStatus(r) === "Confirmed").length}
              </b>
              <span>Feedback confirmed</span>
            </div>
            <div>
              <b>{totalMaximum(plan)}</b>
              <span>Total available</span>
            </div>
          </div>
          <div className="marks-views" role="group" aria-label="Marking views">
            <button
              type="button"
              aria-pressed={view === "overview"}
              onClick={() => setView("overview")}
            >
              Overview
            </button>
            {plan.items.map((n) => (
              <button
                key={n.id}
                type="button"
                aria-pressed={view === n.id}
                onClick={() => setView(n.id)}
              >
                {n.label} /{maximum(n)}
              </button>
            ))}
          </div>
          <div className="marks-toolbar">
            <label>
              Search
              <input
                placeholder="Student name or ID"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label>
              Team
              <select value={team} onChange={(e) => setTeam(e.target.value)}>
                <option value="all">All teams</option>
                {[...new Set(rows.map((r) => r.team))]
                  .sort((a, b) => (a ?? 999) - (b ?? 999))
                  .map((t) => (
                    <option key={String(t)} value={String(t)}>
                      {t == null ? "Unassigned" : `Team ${t}`}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Show
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All students</option>
                <option value="unmarked">Marks incomplete</option>
                <option value="feedback">Feedback not confirmed</option>
              </select>
            </label>
            <div className="marks-export">
              <button
                type="button"
                className="secondary compact"
                disabled={pending.current.size > 0 || aiBusy}
                onClick={reloadSaved}
              >
                Reload saved records
              </button>
              <label>
                <input
                  type="checkbox"
                  checked={exportFiltered}
                  onChange={(e) => setExportFiltered(e.target.checked)}
                />{" "}
                Export filtered students ({visible.length})
              </label>
              <button
                type="button"
                className="secondary compact"
                disabled={dirty()}
                onClick={() => exportData("xlsx")}
              >
                Excel
              </button>
              <button
                type="button"
                className="secondary compact"
                disabled={dirty()}
                onClick={() => exportData("csv")}
              >
                CSV
              </button>
            </div>
          </div>
          <p className="marks-guidance">
            Blank means not marked; 0 is an entered mark. Scores save
            automatically. Final totals appear only when every required item is
            entered.
          </p>
          <div className="marks-table-scroll">
            <table className="marks-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Team</th>
                  {columns.map((n) => (
                    <th key={n.id}>
                      {n.label}
                      <small>/{maximum(n)}</small>
                    </th>
                  ))}
                  {view !== "overview" && nodes[0]?.children && (
                    <th>
                      Subtotal<small>/{maximum(nodes[0])}</small>
                    </th>
                  )}
                  <th>
                    Total
                    <small>/{totalMaximum(plan)}</small>
                  </th>
                  <th>Feedback</th>
                  <th>Save status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const num = numericRow(r);
                  return (
                    <tr key={r.rosterId}>
                      <th scope="row">
                        <button
                          type="button"
                          className="marks-student"
                          onClick={() => {
                            setSelected(r.rosterId);
                            setHistory(null);
                            setAIError("");
                          }}
                        >
                          {r.name}
                        </button>
                        <small>{r.studentId}</small>
                      </th>
                      <td>{r.team ?? "—"}</td>
                      {columns.map((n) => (
                        <td key={n.id}>
                          {n.children ? (
                            <b>{subtotal([n], num.scores) ?? "Pending"}</b>
                          ) : (
                            <input
                              type="text"
                              inputMode="decimal"
                              disabled={configBusy}
                              aria-label={`${r.name}: ${n.label} /${n.maxScore}`}
                              value={r.inputs[n.id] || ""}
                              placeholder="—"
                              onChange={(e) =>
                                edit(r.rosterId, (row) => ({
                                  ...row,
                                  inputs: {
                                    ...row.inputs,
                                    [n.id]: e.target.value,
                                  },
                                }))
                              }
                              onBlur={() => void save(r.rosterId)}
                            />
                          )}
                        </td>
                      ))}
                      {view !== "overview" && nodes[0]?.children && (
                        <td>
                          <b>{subtotal(nodes, num.scores) ?? "Pending"}</b>
                        </td>
                      )}
                      <td>
                        <b>{subtotal(plan.items, num.scores) ?? "Pending"}</b>
                        <small>{gradeStatus(plan, num)}</small>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="secondary compact"
                          onClick={() => {
                            setSelected(r.rosterId);
                            setHistory(null);
                            setAIError("");
                          }}
                        >
                          {feedbackStatus(r)}
                        </button>
                      </td>
                      <td>
                        <span
                          className={
                            blocked.current.has(r.rosterId) ? "marks-error" : ""
                          }
                        >
                          {statuses[r.rosterId] || "Saved"}
                        </span>
                        {blocked.current.has(r.rosterId) && (
                          <button
                            type="button"
                            className="secondary compact"
                            onClick={() => {
                              blocked.current.delete(r.rosterId);
                              void save(r.rosterId);
                            }}
                          >
                            Retry save
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!visible.length && <p>No matching students.</p>}
          </div>
        </>
      )}
      <dialog
        ref={modal}
        className="marks-detail"
        aria-labelledby="marks-detail-title"
        onCancel={() => {
          if (aiBusy)
            setAIError("Generation will finish in this student’s draft.");
          setSelected("");
        }}
        onClose={() => setSelected("")}
      >
        {active && plan && (
          <>
            <div className="marks-detail-heading">
              <div>
                <h3 id="marks-detail-title">{active.name}</h3>
                <p>
                  {active.studentId} · Team {active.team ?? "—"} ·{" "}
                  {classLabel(blocks.find((b) => b.id === blockId)!)}
                </p>
              </div>
              <button
                type="button"
                className="secondary compact"
                onClick={() => setSelected("")}
              >
                Close ×
              </button>
            </div>
            <div className="marks-detail-body">
              <div className="marks-score-strip">
                {plan.items.map((n) => (
                  <span key={n.id}>
                    {n.label}
                    <b>
                      {subtotal([n], numericRow(active).scores) ?? "Pending"} /
                      {maximum(n)}
                    </b>
                  </span>
                ))}
              </div>
              {commentNodes.length ? (
                <>
                  <label>
                    Assessment feedback
                    <select
                      value={item?.id || ""}
                      onChange={(e) => {
                        setCommentItem(e.target.value);
                        setHistory(null);
                        setAIError("");
                      }}
                    >
                      {commentNodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {item &&
                    (() => {
                      const c = active.comments[item.id] || blankComment();
                      return (
                        <>
                          <label>
                            Private marking notes
                            <textarea
                              maxLength={6000}
                              rows={4}
                              value={c.notes}
                              placeholder="What you observed in the report, demonstration, code, manual, peer review and poster. State any items not yet checked."
                              onChange={(e) =>
                                commentChange(active.rosterId, item.id, {
                                  notes: e.target.value,
                                })
                              }
                            />
                          </label>
                          <div className="marks-ai-toolbar">
                            <button
                              type="button"
                              className="secondary"
                              disabled={
                                aiBusy || pending.current.has(active.rosterId)
                              }
                              onClick={() => void generate()}
                            >
                              {aiBusy
                                ? "Generating…"
                                : c.aiDraft
                                  ? "Update AI draft"
                                  : "Generate feedback draft"}
                            </button>
                            <small>
                              Uses saved notes and this block’s session
                              evidence. Never changes marks.
                            </small>
                          </div>
                          {aiError && (
                            <p role="alert" className="marks-error">
                              {aiError}
                            </p>
                          )}
                          {c.aiDraft && (
                            <details open>
                              <summary>
                                AI suggestion · teacher-only, not final feedback
                              </summary>
                              <p className="marks-feedback-text">{c.aiDraft}</p>
                              <button
                                type="button"
                                className="secondary"
                                onClick={() => {
                                  if (
                                    !c.feedback ||
                                    window.confirm(
                                      "Replace the current final feedback text? Marks and private notes are preserved.",
                                    )
                                  )
                                    commentChange(active.rosterId, item.id, {
                                      feedback: c.aiDraft,
                                      confirmed: false,
                                    });
                                }}
                              >
                                Use draft in feedback
                              </button>
                            </details>
                          )}
                          <label>
                            Final teacher feedback
                            <textarea
                              maxLength={6000}
                              rows={8}
                              value={c.feedback}
                              placeholder="Strengths, areas for improvement and next steps…"
                              onChange={(e) =>
                                commentChange(active.rosterId, item.id, {
                                  feedback: e.target.value,
                                  confirmed: false,
                                })
                              }
                            />
                          </label>
                          <label className="marks-confirm">
                            <input
                              type="checkbox"
                              disabled={!c.feedback.trim()}
                              checked={c.confirmed}
                              onChange={(e) =>
                                commentChange(active.rosterId, item.id, {
                                  confirmed: e.target.checked,
                                })
                              }
                            />{" "}
                            I have checked this feedback. It remains
                            teacher-only.
                          </label>
                        </>
                      );
                    })()}
                </>
              ) : (
                <p>
                  This structure has no assessment item with comments enabled.
                </p>
              )}
              <details
                key={active.rosterId}
                onToggle={(e) => {
                  if (e.currentTarget.open) void showHistory();
                }}
              >
                <summary>Saved changes · audit history</summary>
                {history === null ? (
                  <p>Loading…</p>
                ) : history.length ? (
                  history.map((h, i) => (
                    <div className="marks-audit-entry" key={i}>
                      <p>
                        {new Date(h.changed_at).toLocaleString()} · Save{" "}
                        {h.after_value.version}
                      </p>
                      <ul>
                        {auditChanges(h).map((change, j) => (
                          <li key={j}>{change}</li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <p>No saved changes yet.</p>
                )}
              </details>
            </div>
            <div className="marks-detail-footer">
              <span role="status">{statuses[active.rosterId] || "Saved"}</span>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  blocked.current.delete(active.rosterId);
                  void save(active.rosterId);
                }}
              >
                Save now
              </button>
              <button
                type="button"
                className="secondary"
                disabled={rows.indexOf(active) <= 0 || aiBusy}
                onClick={() => {
                  setSelected(rows[rows.indexOf(active) - 1].rosterId);
                  setHistory(null);
                  setAIError("");
                }}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={rows.indexOf(active) >= rows.length - 1 || aiBusy}
                onClick={() => {
                  setSelected(rows[rows.indexOf(active) + 1].rosterId);
                  setHistory(null);
                  setAIError("");
                }}
              >
                Next student
              </button>
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}
