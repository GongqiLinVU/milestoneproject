import type { ReviewSuggestion } from "./reviewSuggestion";
import { CoreReviewEditor, CoreFeedbackView } from "./CoreReviewEditor";
import type { CorePoints } from "./coreReview";
import { watchVisibleRefresh } from "./visibleRefresh";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { IntakeStudentRecord } from "./aiSessionIntake";
import { IntakeReviewDetails } from "./IntakeReview";
import "./IntakeTeacherReview.css";
import {
  profileLabels,
  criterionStates,
  canonicalArea,
  type ReviewProfile,
  type ReviewCriterion,
} from "./intakeReviewStandards";

type ReviewItem = {
  criteria?: ReviewCriterion[];
  completionPercent?: number | null;
  finding?: string;
  notes?: string;
  category: string;
  status: "observed" | "follow_up" | "not_verified";
  observation: string;
  recommendation: string;
  evidence: string;
};
type Action = {
  criterionId?: string;
  notes?: string;
  task: string;
  evidence: string;
  due: string;
};
type ReviewMode = "quick" | "detailed";
type Draft = {
  workflow?: string;
  coreReview?: CorePoints;
  suggestion?: ReviewSuggestion;
  mode?: ReviewMode;
  quickNotes?: string;
  profile?: ReviewProfile;
  standardVersion?: string;
  status: "reviewed" | "follow_up";
  items: ReviewItem[];
  actions: Action[];
};
type Published = Draft & {
  publishedAt: string;
  teacherName: string;
  summaryRevision: number;
  reviewVersion: number;
};
type Context = {
  publishedAcknowledgedAt?: string | null;
  studentRecord: IntakeStudentRecord;
  version: number;
  summaryRevision: number;
  correctionOpen: boolean;
  draft: Draft;
  privateNote: string;
  published: Published | null;
  history: Array<{
    sessionNumber: number;
    studentRecord: IntakeStudentRecord;
    feedback: Published | null;
  }>;
};
export type ReviewStudent = {
  studentId: string;
  studentName: string;
  teamName: string | null;
  intakeId: string | null;
  submitted: boolean;
  studentRecord: IntakeStudentRecord | null;
  summaryRevision?: number;
  correctionOpenedAt?: string | null;
};
type State = {
  intakeId: string;
  published: boolean;
  hasDraft: boolean;
  status: string;
  summaryRevision: number;
};
const labels = {
  observed: "Observed",
  follow_up: "Needs follow-up",
  not_verified: "Not yet verified",
  reviewed: "Reviewed",
};

function Feedback({ feedback }: { feedback: Published }) {
  if (feedback.workflow === "core.v1" && feedback.coreReview)
    return (
      <div className="review-feedback">
        <div className="review-meta">
          <span>
            {feedback.teacherName} ·{" "}
            {new Date(feedback.publishedAt).toLocaleString()}
          </span>
        </div>
        <CoreFeedbackView points={feedback.coreReview} />
        <p className="review-interview-notice">
          Teacher review · not a formal mark.
        </p>
      </div>
    );
  return (
    <div className="review-feedback">
      {feedback.mode === "quick" && (
        <p>
          <b>Progress reviewed</b> · Your progress update was read;
          implementation has not been verified by this review.
        </p>
      )}
      {feedback.quickNotes && <p>{feedback.quickNotes}</p>}
      <p className="review-interview-notice">
        Interview record · teacher observations and follow-up, not a formal
        mark.
      </p>
      {feedback.profile && (
        <p className="review-profile-label">
          {profileLabels[feedback.profile.kind]}
          {feedback.profile.ai ? " + AI component" : ""}
        </p>
      )}
      <div className="review-meta">
        <span className={"review-chip " + feedback.status}>
          {labels[feedback.status]}
        </span>
        <span>
          {feedback.teacherName} ·{" "}
          {new Date(feedback.publishedAt).toLocaleString()} · Summary revision{" "}
          {feedback.summaryRevision}
        </span>
      </div>
      {feedback.items.map((item, index) => (
        <article className="review-note" key={index}>
          <header>
            <b>{canonicalArea(item.category)}</b>
            <span className={"review-chip " + item.status}>
              {labels[item.status]}
            </span>
          </header>
          {Boolean(item.criteria?.length) && (
            <div className="published-criteria">
              {item.criteria?.map((c) => (
                <div key={c.id}>
                  <span>{c.label}</span>
                  <b className={`criterion-state ${c.state}`}>
                    {criterionStates[c.state]}
                  </b>
                  {c.measurement && (
                    <p>Evidence / measurement: {c.measurement}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="quick-review-result">
            {item.completionPercent != null && (
              <strong>
                {item.completionPercent}%{" "}
                <small>Teacher-observed completion · not a grade</small>
              </strong>
            )}
            {item.finding && <p>{item.finding}</p>}
          </div>
          {item.observation && <p>{item.observation}</p>}
          {item.notes && (
            <div>
              <small>Additional notes</small>
              <p>{item.notes}</p>
            </div>
          )}
          {item.recommendation && (
            <div>
              <small>Recommended action</small>
              <p>{item.recommendation}</p>
            </div>
          )}
          {item.evidence && (
            <div>
              <small>Evidence to demonstrate</small>
              <p>{item.evidence}</p>
            </div>
          )}
        </article>
      ))}
      <section className="review-next">
        <h3>Follow-up priorities</h3>
        {!feedback.actions.length && <p>No specific adjustments requested.</p>}
        {feedback.actions.map((action, index) => (
          <article key={index}>
            <b>
              {index + 1}. {action.task}
            </b>
            {action.notes && <p>{action.notes}</p>}
            {action.evidence && <p>Evidence: {action.evidence}</p>}
            {action.due && <small>Follow-up: {action.due}</small>}
          </article>
        ))}
      </section>
    </div>
  );
}

export function useStudentTeacherFeedback(client: SupabaseClient) {
  const [selected, setSelected] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
  }, [selected]);
  const [rows, setRows] = useState<
      Array<{
        intakeId: string;
        sessionNumber: number;
        sessionTitle: string;
        feedback: Published;
        acknowledgedAt?: string | null;
      }>
    >([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const refreshRef = useRef<() => void>(() => {});
  const [ackPending, setAckPending] = useState<string | null>(null),
    [ackError, setAckError] = useState("");
  async function acknowledge(intakeId: string, reviewVersion: number) {
    setAckPending(intakeId);
    setAckError("");
    try {
      const { data, error } = await client.rpc(
        "acknowledge_intake_teacher_feedback",
        { p_intake_id: intakeId, p_review_version: reviewVersion },
      );
      if (error) throw error;
      setRows((current) =>
        current.map((row) =>
          row.intakeId === intakeId &&
          row.feedback.reviewVersion === reviewVersion
            ? { ...row, acknowledgedAt: data }
            : row,
        ),
      );
    } catch (e) {
      setAckError(
        (e as Error).message ||
          "Could not acknowledge feedback. Please refresh and try again.",
      );
    } finally {
      setAckPending(null);
    }
  }

  useEffect(() => {
    let live = true,
      inFlight = false,
      queued = false;
    const refresh = async () => {
      if (inFlight) {
        queued = true;
        return;
      }
      inFlight = true;
      setLoading(true);
      try {
        const { data, error } = await client.rpc(
          "get_my_intake_teacher_feedback",
        );
        if (!live) return;
        if (error) throw error;
        setRows((current) =>
          ((data as typeof rows) || []).map((row) => {
            const prior = current.find(
              (item) =>
                item.intakeId === row.intakeId &&
                item.feedback.reviewVersion === row.feedback.reviewVersion,
            );
            return {
              ...row,
              acknowledgedAt: row.acknowledgedAt ?? prior?.acknowledgedAt,
            };
          }),
        );
        setError("");
      } catch {
        if (live)
          setError("Teacher feedback could not be loaded. Please retry.");
      } finally {
        inFlight = false;
        if (live) {
          setLoading(false);
          if (queued) {
            queued = false;
            void refresh();
          }
        }
      }
    };
    const request = () => void refresh();
    refreshRef.current = request;
    const stop = watchVisibleRefresh(request);
    request();
    window.addEventListener("student-session-checkin", request);
    return () => {
      live = false;
      stop();
      window.removeEventListener("student-session-checkin", request);
    };
  }, [client]);
  const open = (id: string) => {
    setAckError("");
    setSelected(id);
  };
  const row = rows.find((row) => row.intakeId === selected);
  const button = (id?: string) =>
    id && rows.some((row) => row.intakeId === id) ? (
      <button
        type="button"
        className="secondary compact"
        aria-haspopup="dialog"
        onClick={() => open(id)}
      >
        View feedback
      </button>
    ) : null;
  const archive = (ids: ReadonlySet<string>) => {
    const unmatched = rows.filter((row) => !ids.has(row.intakeId));
    return (
      <>
        {error && (
          <p role="alert">
            {error}{" "}
            <button
              type="button"
              className="secondary compact"
              disabled={loading}
              onClick={() => refreshRef.current()}
            >
              Retry
            </button>
          </p>
        )}
        {unmatched.length > 0 && (
          <details className="session-group">
            <summary>Other teacher feedback ({unmatched.length})</summary>
            {unmatched.map((row) => (
              <div key={row.intakeId} className="session-compact-row">
                <span>
                  S{row.sessionNumber} · {row.sessionTitle}
                </span>
                {button(row.intakeId)}
              </div>
            ))}
          </details>
        )}
      </>
    );
  };
  const modal = (
    <dialog
      ref={dialog}
      className="student-teacher-feedback student-feedback-dialog"
      aria-labelledby="student-feedback-title"
      onClose={() => setSelected(null)}
    >
      {row && (
        <>
          <header>
            <div>
              <h3 id="student-feedback-title">Teacher feedback</h3>
              <p>
                S{row.sessionNumber} · {row.sessionTitle}
              </p>
            </div>
            <button
              type="button"
              className="secondary compact"
              onClick={() => dialog.current?.close()}
            >
              Close ×
            </button>
          </header>
          <Feedback feedback={row.feedback} />
          <p className="review-receipt">
            {row.acknowledgedAt
              ? "Feedback acknowledged."
              : "Read the feedback and make any requested adjustments."}
          </p>
          {!row.acknowledgedAt && (
            <button
              type="button"
              className="secondary compact"
              disabled={ackPending !== null}
              onClick={() =>
                void acknowledge(row.intakeId, row.feedback.reviewVersion)
              }
            >
              {ackPending === row.intakeId
                ? "Saving…"
                : "I’ve read this feedback"}
            </button>
          )}
          {ackError && <p role="alert">{ackError}</p>}
        </>
      )}
    </dialog>
  );
  return { button, archive, modal };
}

export function TeacherIntakeReviews({
  client,
  sessionId,
  title,
  rows,
  renderSource,
  onClose,
}: {
  client: SupabaseClient;
  sessionId: string;
  title: string;
  rows: ReviewStudent[];
  renderSource: (row: ReviewStudent) => ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    dirty = useRef(false);
  const [selected, setSelected] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [states, setStates] = useState<State[]>([]),
    [stateError, setStateError] = useState("");
  const statusRequest = useRef(0);
  const refresh = async () => {
    const request = ++statusRequest.current;
    const { data, error } = await client.rpc(
      "get_teacher_intake_review_states",
      { p_session_id: sessionId },
    );
    if (request !== statusRequest.current) return;
    if (error)
      setStateError(
        "Review statuses unavailable. Open a student to retry loading their review.",
      );
    else {
      setStates(data || []);
      setStateError("");
    }
  };
  useEffect(() => {
    dialog.current?.showModal();
    void refresh();
    const stop = watchVisibleRefresh(() => void refresh());
    const unload = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      statusRequest.current++;
      stop();
      window.removeEventListener("beforeunload", unload);
    };
  }, [sessionId]);
  const canLeave = () =>
    !dirty.current ||
    window.confirm(
      "This review has unsaved changes. Leave and discard unsaved changes?",
    );
  const status = (r: ReviewStudent) => {
    if (!r.submitted) return "Missing intake";
    const s = states.find((s) => s.intakeId === r.intakeId);
    if (!s) return "Pending review";
    if (s.hasDraft) return "Draft";
    if (s.summaryRevision !== (r.summaryRevision ?? 1))
      return "Summary changed";
    return s.status === "follow_up" ? "Needs follow-up" : "Reviewed";
  };
  const visible = rows.filter(
    (r) =>
      `${r.studentName} ${r.studentId} ${r.teamName || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" ||
        (filter === "pending" &&
          ["Pending review", "Draft", "Summary changed"].includes(status(r))) ||
        (filter === "follow_up" && status(r) === "Needs follow-up") ||
        (filter === "reviewed" && status(r) === "Reviewed") ||
        (filter === "missing" && !r.submitted)),
  );
  const student = rows.find((r) => r.intakeId === selected);
  return (
    <dialog
      ref={dialog}
      className="intake-review-dialog"
      aria-labelledby="intake-review-heading"
      onCancel={(e) => {
        e.preventDefault();
        if (canLeave()) onClose();
      }}
    >
      <header className="review-topbar">
        <div>
          <span className="review-kicker">Classroom review</span>
          <h2 id="intake-review-heading">{title}</h2>
        </div>
        <button
          type="button"
          className="secondary compact"
          onClick={() => {
            if (canLeave()) onClose();
          }}
          aria-label="Close classroom review"
        >
          Close ×
        </button>
      </header>
      <div className="review-workspace">
        <aside className="review-roster">
          <label>
            Find a student or team
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, student ID or team"
            />
          </label>
          <label>
            Review status
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All students ({rows.length})</option>
              <option value="pending">Pending / draft</option>
              <option value="follow_up">Needs follow-up</option>
              <option value="reviewed">Reviewed</option>
              <option value="missing">Missing intake</option>
            </select>
          </label>
          {stateError && <p role="alert">{stateError}</p>}
          <nav aria-label="Students to review">
            {visible.map((r) => (
              <button
                key={r.studentId}
                type="button"
                disabled={!r.intakeId}
                aria-pressed={selected === r.intakeId}
                onClick={() => {
                  if (canLeave()) {
                    dirty.current = false;
                    setSelected(r.intakeId!);
                  }
                }}
              >
                <b>{r.studentName}</b>
                <small>
                  {r.teamName || "Unassigned"} · {r.studentId}
                </small>
                <span className="review-roster-status">{status(r)}</span>
              </button>
            ))}
          </nav>
          {!visible.length && <p>No matching students.</p>}
        </aside>
        {student?.intakeId ? (
          <CoreReviewEditor
            key={student.intakeId}
            client={client}
            student={student}
            renderSource={renderSource}
            renderPublished={(feedback) => <Feedback feedback={feedback} />}
            onDirty={(value) => {
              dirty.current = value;
            }}
            onSaved={() => void refresh()}
          />
        ) : (
          <div className="review-welcome">
            <span className="review-kicker">Discuss · Demonstrate · Agree</span>
            <h3>Review the work together.</h3>
            <p>
              Select a student to compare their progress statement with what
              they demonstrate, record your observation and confirm the core
              feedback. Next steps are optional.
            </p>
            <p>
              Drafts are teacher-only. Published feedback is visible to that
              student.
            </p>
          </div>
        )}
      </div>
    </dialog>
  );
}
