import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReviewStudent } from "./IntakeTeacherReview";
import { IntakeReviewDetails } from "./IntakeReview";
import { progressPreview } from "./reviewSuggestion";
import {
  coreCanComplete,
  emptyCoreDraft,
  parseCoreGenerated,
  parseCorePoints,
  pointLines,
  type CoreDraft,
  type CorePoints,
  type GenerationSlot,
} from "./coreReview";
import "./CoreReviewEditor.css";
const emptySlot = (): GenerationSlot => ({
  status: "empty",
  result: null,
  sourceChanged: false,
});
type ReviewContext = {
  version: number;
  summaryRevision: number;
  correctionOpen: boolean;
  draft: any;
  privateNote: string;
  published: any;
  history: any[];
  studentRecord: any;
};
type Workspace = {
  review: ReviewContext;
  preparation: GenerationSlot;
  feedback: GenerationSlot;
  legacyDraft: any;
};
type Content = {
  draft: CoreDraft;
  privateNote: string;
  inputs: Record<keyof CorePoints, string>;
};
const pointInputs = (p: CorePoints) => ({
  confirmedProgress: p.confirmedProgress.join("\n"),
  mainIssues: p.mainIssues.join("\n"),
  nextSteps: p.nextSteps.join("\n"),
});
export function CoreFeedbackView({ points }: { points: CorePoints }) {
  return (
    <div className="core-published">
      <section>
        <h4>Confirmed progress</h4>
        {points.confirmedProgress.length ? (
          <ul>
            {points.confirmedProgress.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        ) : (
          <p>No progress was confirmed in this review.</p>
        )}
      </section>
      <section>
        <h4>Main issues</h4>
        {points.mainIssues.length ? (
          <ul>
            {points.mainIssues.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        ) : (
          <p>No issues were recorded.</p>
        )}
      </section>
      {points.nextSteps.length > 0 && (
        <section>
          <h4>Optional next steps</h4>
          <ul>
            {points.nextSteps.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
export function CoreReviewEditor({
  client,
  student,
  renderSource,
  renderPublished,
  onDirty,
  onSaved,
}: {
  client: SupabaseClient;
  student: ReviewStudent;
  renderSource: (r: ReviewStudent) => ReactNode;
  renderPublished: (v: any) => ReactNode;
  onDirty: (dirty: boolean) => void;
  onSaved: () => void;
}) {
  const [context, setContext] = useState<ReviewContext | null>(null),
    [draft, setDraft] = useState<CoreDraft>(emptyCoreDraft),
    [privateNote, setPrivateNote] = useState(""),
    [inputs, setInputs] = useState(() =>
      pointInputs(emptyCoreDraft().coreReview),
    ),
    [legacy, setLegacy] = useState<any>(null),
    [prep, setPrep] = useState<GenerationSlot>(emptySlot),
    [feedbackSlot, setFeedbackSlot] = useState<GenerationSlot>(emptySlot),
    [error, setError] = useState(""),
    [aiError, setAIError] = useState(""),
    [guideError, setGuideError] = useState(""),
    [message, setMessage] = useState("Loading review…"),
    [saving, setSaving] = useState(false),
    [formatting, setFormatting] = useState(false),
    [guideBusy, setGuideBusy] = useState(false),
    [clarification, setClarification] = useState(""),
    [retry, setRetry] = useState(0);
  const current = useRef<Content>({ draft, privateNote, inputs }),
    saved = useRef(""),
    version = useRef(0),
    summary = useRef(1),
    alive = useRef(true),
    blocked = useRef(false),
    savePromise = useRef<Promise<boolean> | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    formatBusy = useRef(false),
    guideRunning = useRef(false),
    manualRevision = useRef(0),
    wanted = useRef<string | null>(null),
    autoAttempted = useRef<string | null>(null),
    dirtyCallback = useRef(onDirty),
    savedCallback = useRef(onSaved);
  dirtyCallback.current = onDirty;
  savedCallback.current = onSaved;
  const fingerprint = (v: Content) => JSON.stringify(v);
  const dirty = () => saved.current !== fingerprint(current.current);
  function reportDirty() {
    dirtyCallback.current(dirty() || !!savePromise.current);
  }
  function update(next: Content) {
    current.current = next;
    setDraft(next.draft);
    setPrivateNote(next.privateNote);
    setInputs(next.inputs);
    setError("");
    setMessage("Unsaved changes");
    reportDirty();
  }
  function adopt(result: any, observation: string, revision: number) {
    if (
      !alive.current ||
      current.current.draft.teacherObservation !== observation ||
      current.current.draft.coreEdited ||
      manualRevision.current !== revision
    )
      return;
    const value = parseCoreGenerated(result);
    setClarification(value.clarification);
    if (value.clarification) {
      setAIError("Clarify the observation, or write the core points yourself.");
      return;
    }
    const { clarification: _, ...points } = value;
    update({
      ...current.current,
      draft: {
        ...current.current.draft,
        coreReview: points,
        coreSourceObservation: observation,
        coreEdited: false,
      },
      inputs: pointInputs(points),
    });
  }
  async function requestAI(action: "prepare" | "feedback", refresh = false) {
    const {
      data: { session },
    } = await client.auth.getSession();
    if (!session) throw Error("Sign in again.");
    const response = await fetch("/api/review-suggestion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ intakeId: student.intakeId, action, refresh }),
    });
    const value = await response.json();
    if (!response.ok && response.status !== 202)
      throw Error(value.error || "AI unavailable.");
    return value;
  }
  async function prepare(refresh = false) {
    if (guideRunning.current) return;
    guideRunning.current = true;
    setGuideBusy(true);
    setGuideError("");
    try {
      const v = await requestAI("prepare", refresh);
      if (!alive.current) return;
      setPrep((old) => ({
        ...old,
        status: v.state === "claimed" ? "pending" : v.state,
        result: v.result || old.result,
        sourceChanged:
          refresh && v.state === "ready" ? false : old.sourceChanged,
        error: v.error,
      }));
    } catch (e) {
      if (alive.current) {
        setGuideError((e as Error).message);
        setPrep((old) => ({ ...old, status: "failed" }));
      }
    } finally {
      guideRunning.current = false;
      if (alive.current) setGuideBusy(false);
    }
  }
  async function persist(publish = false): Promise<boolean> {
    if (blocked.current || !context) return false;
    if (savePromise.current) {
      const ok = await savePromise.current;
      if (!ok || !alive.current) return false;
      return persist(publish);
    }
    if (!publish && !dirty()) return true;
    const content = structuredClone(current.current);
    try {
      parseCorePoints(content.draft.coreReview);
      if (publish && !coreCanComplete(content.draft))
        throw Error(
          "Check the core points against your latest observation before completing.",
        );
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
    clearTimeout(timer.current);
    setSaving(true);
    setError("");
    const sent = fingerprint(content);
    const operation = Promise.resolve().then(async () => {
      try {
        const { data, error } = await client.rpc("save_core_teacher_review", {
          p_intake_id: student.intakeId,
          p_version: version.current,
          p_summary_revision: summary.current,
          p_draft: content.draft,
          p_private_note: content.privateNote,
          p_publish: publish,
        });
        if (!alive.current) return false;
        if (error) throw error;
        version.current = data.version;
        saved.current = sent;
        setContext(data);
        setMessage(
          publish
            ? "Review completed · student can see the core feedback"
            : "Draft saved",
        );
        savedCallback.current();
        return true;
      } catch (e) {
        if (alive.current) {
          blocked.current = true;
          setError(
            (e as Error).message || "Save failed. Your input remains here.",
          );
        }
        return false;
      } finally {
        savePromise.current = null;
        if (alive.current) {
          setSaving(false);
          reportDirty();
          setRetry((n) => n + 1);
        }
      }
    });
    savePromise.current = operation;
    reportDirty();
    return operation;
  }
  async function organise(refresh = false) {
    if (formatBusy.current || !current.current.draft.teacherObservation.trim())
      return;
    if (current.current.draft.coreEdited && !refresh) return;
    if (
      !refresh &&
      current.current.draft.coreSourceObservation ===
        current.current.draft.teacherObservation
    )
      return;
    formatBusy.current = true;
    setFormatting(true);
    setAIError("");
    setClarification("");
    const observation = current.current.draft.teacherObservation,
      revision = manualRevision.current;
    wanted.current = observation;
    autoAttempted.current = observation;
    try {
      if (!(await persist()))
        throw Error(
          "Save or reconcile your observation before organising feedback.",
        );
      if (
        current.current.draft.teacherObservation !== observation ||
        manualRevision.current !== revision
      )
        return;
      if (refresh)
        update({
          ...current.current,
          draft: { ...current.current.draft, coreEdited: false },
        });
      const v = await requestAI("feedback", refresh);
      if (!alive.current) return;
      setFeedbackSlot((old) => ({
        ...old,
        status: v.state,
        result: v.result || old.result,
        sourceChanged: false,
        error: v.error,
      }));
      if (v.state === "ready") {
        if (
          refresh &&
          current.current.draft.teacherObservation === observation &&
          manualRevision.current === revision
        )
          current.current = {
            ...current.current,
            draft: { ...current.current.draft, coreEdited: false },
          };
        adopt(v.result, observation, revision);
      } else if (v.state === "failed" || v.state === "interrupted")
        setAIError(
          v.error ||
            "Generation interrupted. Retry explicitly or write the core points.",
        );
    } catch (e) {
      if (alive.current) {
        setAIError((e as Error).message);
        setFeedbackSlot((old) => ({ ...old, status: "failed" }));
      }
    } finally {
      formatBusy.current = false;
      if (alive.current) {
        setFormatting(false);
        if (
          current.current.draft.teacherObservation !== observation &&
          !current.current.draft.coreEdited &&
          !blocked.current
        )
          void organise();
      }
    }
  }
  useEffect(() => {
    alive.current = true;
    let active = true;
    void (async () => {
      try {
        const { data, error } = await client.rpc("get_core_review_workspace", {
          p_intake_id: student.intakeId,
        });
        if (!active) return;
        if (error) throw error;
        const w = data as Workspace,
          c = w.review;
        const d =
          c.draft.workflow === "core.v1"
            ? {
                workflow: "core.v1" as const,
                teacherObservation: c.draft.teacherObservation,
                coreSourceObservation: c.draft.coreSourceObservation,
                coreEdited: c.draft.coreEdited,
                coreReview: parseCorePoints(c.draft.coreReview),
              }
            : emptyCoreDraft();
        const content = {
          draft: d,
          privateNote: c.privateNote,
          inputs: pointInputs(d.coreReview),
        };
        current.current = content;
        saved.current = fingerprint(content);
        version.current = c.version;
        summary.current = c.summaryRevision;
        setContext(c);
        setDraft(d);
        setInputs(content.inputs);
        setPrivateNote(c.privateNote);
        setLegacy(w.legacyDraft);
        setPrep(w.preparation);
        setFeedbackSlot(w.feedback);
        if (
          (["failed", "interrupted", "pending"].includes(w.feedback.status) &&
            !w.feedback.requestSourceChanged) ||
          (w.feedback.status === "ready" && !w.feedback.sourceChanged)
        )
          autoAttempted.current = d.teacherObservation;
        setMessage("Teacher-only draft");
        dirtyCallback.current(false);
        if (w.preparation.status === "empty" && !c.published) void prepare();
        if (
          d.teacherObservation.trim() &&
          d.coreSourceObservation !== d.teacherObservation &&
          !d.coreEdited
        ) {
          wanted.current = d.teacherObservation;
          if (w.feedback.status === "ready" && !w.feedback.sourceChanged)
            adopt(
              w.feedback.result,
              d.teacherObservation,
              manualRevision.current,
            );
          // Unfinished saved observations can be organised after a pause; failed jobs require explicit retry.
        }
      } catch (e) {
        if (active)
          setError((e as Error).message || "Review could not be loaded.");
      }
    })();
    return () => {
      active = false;
      alive.current = false;
      clearTimeout(timer.current);
    };
  }, [client, student.intakeId]);
  useEffect(() => {
    if (!context) return;
    clearTimeout(timer.current);
    if (dirty() && !savePromise.current && !blocked.current)
      timer.current = setTimeout(() => void persist(), 900);
    return () => clearTimeout(timer.current);
  }, [draft, privateNote, inputs, context, retry]);
  useEffect(() => {
    const d = current.current.draft;
    if (
      !context ||
      blocked.current ||
      d.coreEdited ||
      !d.teacherObservation.trim() ||
      d.coreSourceObservation === d.teacherObservation ||
      autoAttempted.current === d.teacherObservation
    )
      return;
    const idle = setTimeout(() => void organise(), 3000);
    return () => clearTimeout(idle);
  }, [
    draft.teacherObservation,
    draft.coreEdited,
    draft.coreSourceObservation,
    context,
  ]);
  useEffect(() => {
    if (prep.status !== "pending" && feedbackSlot.status !== "pending") return;
    let active = true,
      count = 0,
      busy = false;
    const tick = async () => {
      if (busy || !active) return;
      busy = true;
      try {
        const { data, error } = await client.rpc("get_core_review_workspace", {
          p_intake_id: student.intakeId,
        });
        if (!active || error) return;
        const w = data as Workspace;
        setPrep(w.preparation);
        setFeedbackSlot(w.feedback);
        if (
          w.feedback.status === "ready" &&
          !w.feedback.sourceChanged &&
          wanted.current === current.current.draft.teacherObservation &&
          !current.current.draft.coreEdited
        )
          adopt(w.feedback.result, wanted.current!, manualRevision.current);
        if (++count >= 50) clearInterval(id);
      } finally {
        busy = false;
      }
    };
    const id = setInterval(() => void tick(), 2000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [prep.status, feedbackSlot.status, client, student.intakeId]);
  function pointChange(key: keyof CorePoints, text: string) {
    manualRevision.current++;
    setClarification("");
    update({
      ...current.current,
      draft: {
        ...current.current.draft,
        coreEdited: true,
        coreSourceObservation: current.current.draft.teacherObservation,
        coreReview: {
          ...current.current.draft.coreReview,
          [key]: pointLines(text),
        },
      },
      inputs: { ...current.current.inputs, [key]: text },
    });
  }
  if (!context)
    return (
      <main className="review-content">
        <p>{error || "Loading review…"}</p>
        {error && (
          <small>
            Apply the core-review migration before using this workspace.
          </small>
        )}
      </main>
    );
  const correction = context.correctionOpen || !!student.correctionOpenedAt;
  const completed =
    context.published?.reviewVersion === version.current && !dirty();
  const mismatch = draft.coreSourceObservation !== draft.teacherObservation;
  let validPoints = true;
  try {
    parseCorePoints(draft.coreReview);
  } catch {
    validPoints = false;
  }
  return (
    <main className="review-content core-review-content">
      <header className="review-student-header">
        <div>
          <span className="review-kicker">Conversation review</span>
          <h3>{student.studentName}</h3>
          <p>
            {student.studentId} · {student.teamName || "Unassigned"}
          </p>
        </div>
      </header>
      <div className="core-review-body">
        <section className="core-guide">
          <div className="core-section-heading">
            <h4>Top 3 questions</h4>
            <button
              type="button"
              className="secondary compact"
              disabled={guideBusy || prep.status === "pending"}
              onClick={() => void prepare(true)}
            >
              {guideBusy || prep.status === "pending"
                ? "Preparing…"
                : prep.result
                  ? "Refresh guide"
                  : "Retry guide"}
            </button>
          </div>
          {prep.result ? (
            <>
              <ol>
                {prep.result.questions
                  .slice(0, 3)
                  .map((q: string, i: number) => (
                    <li key={i} title={q}>
                      {q.length > 180 ? q.slice(0, 177) + "…" : q}
                    </li>
                  ))}
              </ol>
              <details>
                <summary>Reported changes · context</summary>
                <ul>
                  {progressPreview(prep.result.progress).map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
                <small>
                  Student claims; verify during the conversation. Saved{" "}
                  {prep.result.generatedAt
                    ? new Date(prep.result.generatedAt).toLocaleString()
                    : "earlier"}
                  .
                </small>
              </details>
            </>
          ) : (
            <p>
              {prep.status === "pending"
                ? "Preparing and storing the conversation guide…"
                : "You can review without an AI guide."}
            </p>
          )}
          {prep.sourceChanged && prep.result && (
            <small className="core-source-hint">
              Source records may have changed since this guide was saved.
              Refresh only if needed.
            </small>
          )}
          {(guideError || prep.error) && (
            <p role="alert">{guideError || prep.error}</p>
          )}
          {prep.status === "interrupted" && (
            <p>Preparation was interrupted. Retry explicitly when needed.</p>
          )}
        </section>
        <section className="core-observation">
          <h4>Your observation</h4>
          <p>
            Record what you checked, the student’s explanation and any important
            issue. Next steps are optional.
          </p>
          <label>
            Observation about {student.studentName}
            <textarea
              aria-label="Teacher observation"
              maxLength={6000}
              rows={5}
              value={draft.teacherObservation}
              placeholder="I saw… The student explained… Still unclear…"
              onChange={(e) => {
                setClarification("");
                update({
                  ...current.current,
                  draft: {
                    ...current.current.draft,
                    teacherObservation: e.target.value,
                  },
                });
              }}
              onBlur={() => void organise()}
            />
          </label>
          <small>
            {formatting || feedbackSlot.status === "pending"
              ? "Organising core feedback…"
              : "Core points are organised after a pause or when you leave this field. You can also edit them directly."}
          </small>
          {clarification && (
            <p role="alert" className="core-clarification">
              {clarification}
            </p>
          )}
          {aiError && <p role="alert">{aiError}</p>}
          {((mismatch && draft.coreEdited) ||
            aiError ||
            feedbackSlot.status === "failed" ||
            feedbackSlot.status === "interrupted") && (
            <div className="core-manual-recovery">
              <span>
                {draft.coreEdited
                  ? "Your edited core points are preserved. Rebuilding replaces these draft points."
                  : "Write core points manually, or retry organising the saved observation."}
              </span>
              <button
                type="button"
                className="secondary compact"
                disabled={
                  formatting || saving || !draft.teacherObservation.trim()
                }
                onClick={() => void organise(true)}
              >
                Rebuild core points from observation
              </button>
            </div>
          )}
        </section>
        <section className="core-confirmation">
          <h4>Core feedback · student preview</h4>
          <p>
            Check these points, then complete the review. Matters you did not
            check remain unverified.
          </p>
          <label>
            Confirmed progress
            <textarea
              aria-label="Confirmed progress"
              maxLength={2500}
              rows={3}
              placeholder="Only progress you actually confirmed. One point per line."
              value={inputs.confirmedProgress}
              onChange={(e) => pointChange("confirmedProgress", e.target.value)}
            />
          </label>
          <label>
            Main issues
            <textarea
              aria-label="Main issues"
              maxLength={2500}
              rows={3}
              placeholder="Important problems or matters still to clarify. One point per line."
              value={inputs.mainIssues}
              onChange={(e) => pointChange("mainIssues", e.target.value)}
            />
          </label>
          <details open={draft.coreReview.nextSteps.length > 0 || undefined}>
            <summary>Optional next steps</summary>
            <label>
              Only if you want to request an action
              <textarea
                aria-label="Optional next steps"
                maxLength={1700}
                rows={2}
                value={inputs.nextSteps}
                onChange={(e) => pointChange("nextSteps", e.target.value)}
              />
            </label>
          </details>
          {mismatch && (
            <small className="core-source-hint">
              The observation changed. Update the core points before completing.
            </small>
          )}
        </section>
        <details className="core-sources">
          <summary>Sources and earlier reviews</summary>
          <IntakeReviewDetails record={context.studentRecord} />
          {renderSource(student)}
          {context.history.map((h: any, i: number) => (
            <details key={i}>
              <summary>S{h.sessionNumber}</summary>
              <IntakeReviewDetails record={h.studentRecord} />
              {h.feedback && renderPublished(h.feedback)}
            </details>
          ))}
        </details>
        {legacy &&
          (legacy.quickNotes ||
            legacy.items?.length ||
            legacy.actions?.length) && (
            <details>
              <summary>Earlier draft content · preserved</summary>
              {legacy.quickNotes && <p>{legacy.quickNotes}</p>}
              {legacy.items?.map((v: any, i: number) => (
                <article key={i}>
                  <b>{v.category}</b>
                  <p>{v.observation || v.finding}</p>
                  {v.notes && <p>{v.notes}</p>}
                  {v.recommendation && <p>{v.recommendation}</p>}
                  {v.evidence && <p>Evidence: {v.evidence}</p>}
                  {v.completionPercent != null && (
                    <p>Observed completion: {v.completionPercent}%</p>
                  )}
                  {v.criteria?.map((c: any, n: number) => (
                    <p key={n}>
                      {c.label}: {c.state}
                      {c.measurement ? ` · ${c.measurement}` : ""}
                    </p>
                  ))}
                </article>
              ))}
              {legacy.actions?.map((v: any, i: number) => (
                <p key={i}>
                  {v.task}
                  {v.due ? ` · Due: ${v.due}` : ""}
                  {v.evidence ? ` · Evidence: ${v.evidence}` : ""}
                </p>
              ))}
              <small>
                These earlier notes are retained. They are not automatically
                treated as new teacher observations.
              </small>
            </details>
          )}
        <details>
          <summary>Private teacher note</summary>
          <textarea
            aria-label="Private teacher note"
            maxLength={6000}
            rows={3}
            value={privateNote}
            onChange={(e) =>
              update({ ...current.current, privateNote: e.target.value })
            }
          />
        </details>
        {context.published && (
          <details>
            <summary>Currently visible to the student</summary>
            {renderPublished(context.published)}
          </details>
        )}
      </div>
      <footer className="review-savebar core-review-savebar">
        <p role="status">{saving ? "Saving…" : message}</p>
        {error && (
          <p role="alert">
            {error} Your input remains here. Copy it before reloading to
            reconcile another window.
          </p>
        )}
        {correction && (
          <p>
            Student correction is open. Drafts can be saved; complete after
            reconfirmation.
          </p>
        )}
        <div>
          {blocked.current && (
            <button
              type="button"
              className="secondary compact"
              onClick={() => {
                blocked.current = false;
                void persist();
              }}
            >
              Retry save
            </button>
          )}
          <button
            type="button"
            disabled={
              saving ||
              ((formatting || feedbackSlot.status === "pending") &&
                !draft.coreEdited) ||
              !validPoints ||
              blocked.current ||
              correction ||
              !coreCanComplete(draft) ||
              completed
            }
            onClick={() => void persist(true)}
          >
            {completed ? "Review completed" : "Confirm and complete review"}
          </button>
        </div>
        <small>
          Only the core points are published. Your raw observation and private
          note stay teacher-only.
        </small>
      </footer>
    </main>
  );
}
