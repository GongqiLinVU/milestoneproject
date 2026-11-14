import { useEffect, useRef, useState } from "react";
import defaults from "./defaultAssessment.json";
import {
  allNodes,
  leaves,
  maximum,
  parseMark,
  totalMaximum,
  validatePlan,
  type AssessmentNode,
  type AssessmentPlan,
} from "./assessment";
import "./AssessmentStructureEditor.css";

type Props = {
  initial: AssessmentPlan;
  saved: boolean;
  locked: boolean;
  disabled: boolean;
  busy: boolean;
  onSave: (plan: AssessmentPlan) => Promise<void>;
  onDirty: (dirty: boolean) => void;
};
const scoresFor = (plan: AssessmentPlan) =>
  Object.fromEntries(
    plan.items.flatMap(leaves).map((n) => [n.id, String(n.maxScore ?? "")]),
  );
const initialFingerprint = (plan: AssessmentPlan) =>
  JSON.stringify({ plan, scores: scoresFor(plan) });
const updateTree = (
  items: AssessmentNode[],
  id: string,
  change: (n: AssessmentNode) => AssessmentNode,
): AssessmentNode[] =>
  items.map((n) =>
    n.id === id
      ? change(n)
      : n.children
        ? { ...n, children: updateTree(n.children, id, change) }
        : n,
  );
const removeFromTree = (
  items: AssessmentNode[],
  id: string,
): AssessmentNode[] =>
  items
    .filter((n) => n.id !== id)
    .map((n) =>
      n.children ? { ...n, children: removeFromTree(n.children, id) } : n,
    );
const availableNode = (
  node: AssessmentNode,
  used: Set<string>,
): AssessmentNode | null => {
  if (used.has(node.id)) return null;
  if (!node.children) return structuredClone(node);
  const children = node.children
    .map((n) => availableNode(n, used))
    .filter((n): n is AssessmentNode => n !== null);
  return children.length ? { ...node, children } : null;
};

export function AssessmentStructureEditor({
  initial,
  saved,
  locked,
  disabled,
  busy,
  onSave,
  onDirty,
}: Props) {
  const [draft, setDraft] = useState(() => structuredClone(initial)),
    [scores, setScores] = useState(() => scoresFor(initial)),
    [rawJSON, setRawJSON] = useState<string | null>(null),
    [message, setMessage] = useState(""),
    [undo, setUndo] = useState<{
      plan: AssessmentPlan;
      scores: Record<string, string>;
    } | null>(null);
  const dirtyHandler = useRef(onDirty);
  dirtyHandler.current = onDirty;
  const isDirty =
    rawJSON !== null ||
    JSON.stringify({ plan: draft, scores }) !== initialFingerprint(initial);
  useEffect(() => {
    dirtyHandler.current(isDirty);
  }, [isDirty]);
  useEffect(() => () => dirtyHandler.current(false), []);
  function prepared(): AssessmentPlan {
    const items = draft.items.map(function fill(n): AssessmentNode {
      if (n.children) return { ...n, children: n.children.map(fill) };
      const value = parseMark(scores[n.id] ?? "", 1000);
      if (value === null || value <= 0)
        throw Error(
          `Enter a maximum above 0 for ${n.label || "each component"}.`,
        );
      return { ...n, maxScore: value };
    });
    const plan = { ...draft, items };
    validatePlan(plan);
    return plan;
  }
  let ready: AssessmentPlan | null = null,
    validation = "";
  try {
    ready = prepared();
  } catch (e) {
    validation = (e as Error).message;
  }
  const readOnly = locked || disabled || busy,
    uiDisabled = readOnly || rawJSON !== null;
  const used = new Set(allNodes(draft).map((n) => n.id));
  const catalog = defaults as AssessmentPlan;
  function remember() {
    setUndo({ plan: structuredClone(draft), scores: { ...scores } });
    setMessage("");
  }
  function reset(plan: AssessmentPlan) {
    setDraft(structuredClone(plan));
    setScores(scoresFor(plan));
    setRawJSON(null);
    setMessage("");
  }
  function change(id: string, patch: Partial<AssessmentNode>) {
    setMessage("");
    setDraft((p) => ({
      ...p,
      items: updateTree(p.items, id, (n) => ({ ...n, ...patch })),
    }));
  }
  function remove(id: string) {
    remember();
    setDraft((p) => ({ ...p, items: removeFromTree(p.items, id) }));
    setScores((p) =>
      Object.fromEntries(Object.entries(p).filter(([key]) => key !== id)),
    );
  }
  function freshId() {
    let id: string;
    do {
      id = "item_" + crypto.randomUUID().replaceAll("-", "").slice(0, 16);
    } while (used.has(id));
    return id;
  }
  function add(value: string, parent?: AssessmentNode) {
    if (!value) return;
    let node: AssessmentNode;
    if (value === "custom") {
      node = { id: freshId(), label: "New component", maxScore: 5 };
    } else if (value === "group") {
      const id = freshId();
      node = {
        id,
        label: "New assessment",
        children: [{ id: id + "_part", label: "New component", maxScore: 5 }],
      };
    } else {
      const source = allNodes(catalog).find((n) => n.id === value);
      const available = source && availableNode(source, used);
      if (!available) return;
      node = available;
    }
    remember();
    setScores((p) => ({
      ...p,
      ...scoresFor({ version: 1, name: "", items: [node] }),
    }));
    setDraft((p) => ({
      ...p,
      items: parent
        ? updateTree(p.items, parent.id, (n) => ({
            ...n,
            children: [...(n.children || []), node],
          }))
        : [...p.items, node],
    }));
  }
  function move(id: string, direction: number) {
    const reorder = (items: AssessmentNode[]): AssessmentNode[] => {
      const index = items.findIndex((n) => n.id === id);
      if (index >= 0) {
        const next = [...items],
          target = index + direction;
        if (target >= 0 && target < next.length)
          [next[index], next[target]] = [next[target], next[index]];
        return next;
      }
      return items.map((n) =>
        n.children ? { ...n, children: reorder(n.children) } : n,
      );
    };
    setDraft((p) => ({ ...p, items: reorder(p.items) }));
  }
  function addPicker(parent?: AssessmentNode) {
    const source = parent
      ? allNodes(catalog).find((n) => n.id === parent.id)?.children || []
      : catalog.items;
    const options = source
      .map((n) => availableNode(n, used))
      .filter((n): n is AssessmentNode => n !== null);
    const limit =
      (parent?.children?.length ?? draft.items.length) >= 20 ||
      allNodes(draft).length >= 59;
    return (
      <label className="assessment-add">
        <span>＋ {parent ? "Add component" : "Add assessment"}</span>
        <select
          aria-label={
            parent ? `Add component to ${parent.label}` : "Add assessment"
          }
          value=""
          disabled={uiDisabled || limit}
          onChange={(e) => add(e.target.value, parent)}
        >
          <option value="">Choose a component…</option>
          {options.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label} · {maximum(n)} marks
            </option>
          ))}
          <option value="custom">Custom component</option>
          {!parent && (
            <option value="group">Custom assessment with components</option>
          )}
        </select>
      </label>
    );
  }
  function card(
    node: AssessmentNode,
    index: number,
    siblings: AssessmentNode[],
    depth = 0,
  ) {
    const computed = ready && allNodes(ready).find((n) => n.id === node.id);
    return (
      <article
        key={node.id}
        className={`assessment-card ${depth ? "assessment-child" : ""}`}
        aria-label={`${node.label} ${node.children ? "assessment" : "component"}`}
      >
        <div className="assessment-card-main">
          <label className="assessment-name">
            <span>
              {node.children
                ? "Assessment"
                : depth
                  ? "Component"
                  : "Assessment"}
            </span>
            <input
              aria-label={`Name: ${node.label}`}
              value={node.label}
              maxLength={120}
              disabled={uiDisabled}
              onChange={(e) => change(node.id, { label: e.target.value })}
            />
          </label>
          {node.children ? (
            <div className="assessment-derived">
              <span>Total marks</span>
              <b>{computed ? maximum(computed) : "—"}</b>
              <small>From components</small>
            </div>
          ) : (
            <label className="assessment-max">
              <span>Maximum marks</span>
              <input
                type="text"
                inputMode="decimal"
                aria-label={`Maximum marks: ${node.label}`}
                value={scores[node.id] ?? ""}
                disabled={uiDisabled}
                onChange={(e) => {
                  setMessage("");
                  setScores((p) => ({ ...p, [node.id]: e.target.value }));
                }}
              />
            </label>
          )}
          <div className="assessment-card-actions">
            <button
              type="button"
              className="secondary compact"
              aria-label={`Move ${node.label} up`}
              disabled={uiDisabled || index === 0}
              onClick={() => move(node.id, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              className="secondary compact"
              aria-label={`Move ${node.label} down`}
              disabled={uiDisabled || index === siblings.length - 1}
              onClick={() => move(node.id, 1)}
            >
              ↓
            </button>
            <button
              type="button"
              className="secondary compact assessment-remove"
              aria-label={`Remove ${node.label}`}
              disabled={uiDisabled || (depth > 0 && siblings.length === 1)}
              title={
                depth > 0 && siblings.length === 1
                  ? "Keep one component, or remove the whole assessment"
                  : undefined
              }
              onClick={() => remove(node.id)}
            >
              Remove
            </button>
          </div>
        </div>
        {(depth === 0 || node.commentEnabled) && (
          <label className="assessment-feedback-toggle">
            <input
              type="checkbox"
              checked={!!node.commentEnabled}
              disabled={uiDisabled}
              onChange={(e) =>
                change(node.id, { commentEnabled: e.target.checked })
              }
            />{" "}
            Include teacher feedback
          </label>
        )}
        {node.children && (
          <div className="assessment-children">
            {node.children.map((n, i) => card(n, i, node.children!, depth + 1))}
            {addPicker(node)}
          </div>
        )}
      </article>
    );
  }
  async function save() {
    if (!ready || rawJSON !== null || readOnly) return;
    setMessage("");
    try {
      await onSave(ready);
    } catch (e) {
      setMessage(
        (e as Error).message ||
          "Structure could not be saved. Your changes remain here.",
      );
    }
  }
  return (
    <div className="assessment-editor">
      <div className="assessment-editor-heading">
        <div>
          <h3>{locked ? "Assessment structure" : "Build your assessment"}</h3>
          <p>
            {locked
              ? "This structure is locked because marking has started."
              : "Start with NIT3004, then adjust the assessments and their components before marking."}
          </p>
        </div>
        <span className="assessment-template-badge">
          NIT3004 default available
        </span>
      </div>
      <div className="assessment-editor-meta">
        <label>
          Assessment title
          <input
            value={draft.name}
            maxLength={120}
            disabled={uiDisabled}
            onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
          />
        </label>
        {!locked && (
          <button
            type="button"
            className="secondary compact"
            disabled={uiDisabled}
            onClick={() => {
              remember();
              reset(catalog);
            }}
          >
            Restore NIT3004 default
          </button>
        )}
      </div>
      <div className="assessment-cards">
        {draft.items.map((n, i) => card(n, i, draft.items))}
      </div>
      {!locked && addPicker()}
      {undo && !readOnly && (
        <div className="assessment-undo">
          <span>You can undo the last addition, removal or reset.</span>
          <button
            type="button"
            className="secondary compact"
            disabled={rawJSON !== null}
            onClick={() => {
              setDraft(undo.plan);
              setScores(undo.scores);
              setUndo(null);
              setMessage("");
            }}
          >
            Undo
          </button>
        </div>
      )}
      <details className="assessment-advanced">
        <summary>Advanced · JSON configuration</summary>
        <p>The visual editor and JSON use the same assessment structure.</p>
        <textarea
          aria-label="Assessment JSON"
          spellCheck={false}
          rows={12}
          maxLength={20000}
          readOnly={readOnly}
          value={rawJSON ?? JSON.stringify(ready || draft, null, 2)}
          onChange={(e) => setRawJSON(e.target.value)}
        />
        {rawJSON !== null && (
          <div className="assessment-json-actions">
            <button
              type="button"
              className="secondary compact"
              disabled={readOnly}
              onClick={() => {
                try {
                  const value = JSON.parse(rawJSON) as AssessmentPlan;
                  validatePlan(value);
                  remember();
                  reset(value);
                } catch (e) {
                  setMessage((e as Error).message);
                }
              }}
            >
              Apply JSON to editor
            </button>
            <button
              type="button"
              className="secondary compact"
              disabled={readOnly}
              onClick={() => {
                setRawJSON(null);
                setMessage("");
              }}
            >
              Discard JSON changes
            </button>
          </div>
        )}
      </details>
      {rawJSON !== null && (
        <p role="status">
          Apply or discard JSON changes before saving. The visual editor is
          paused while JSON changes are pending.
        </p>
      )}
      {(message || validation) && (
        <p className="marks-error" role="alert">
          {message || validation}
        </p>
      )}
      <div className="assessment-editor-footer">
        <div>
          <span>Total available</span>
          <b>
            {ready ? totalMaximum(ready) : "—"} <small>marks</small>
          </b>
          {ready && (
            <small>
              {draft.items.length} assessments ·{" "}
              {draft.items.flatMap(leaves).length} marked components
            </small>
          )}
        </div>
        {!locked && (
          <div className="assessment-footer-actions">
            {isDirty && (
              <button
                type="button"
                className="secondary compact"
                disabled={readOnly}
                onClick={() => {
                  reset(initial);
                  setUndo(null);
                }}
              >
                Discard structure changes
              </button>
            )}
            <button
              type="button"
              className="assessment-save"
              disabled={
                readOnly || !ready || rawJSON !== null || (saved && !isDirty)
              }
              onClick={() => void save()}
            >
              {busy
                ? "Saving…"
                : saved
                  ? "Save structure changes"
                  : "Use this assessment structure"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
