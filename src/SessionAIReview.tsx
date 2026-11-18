import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IntakeReviewDetails } from "./IntakeReview";
import { CoreFeedbackView, PublishedCoreFeedback } from "./CoreReviewEditor";
import type { ReviewStudent } from "./IntakeTeacherReview";
import "./ReviewHub.css";
import { OptionalTeacherCheck } from "./SessionTeacherCheck";
type Slot = {
  status: string;
  result: any;
  sourceChanged?: boolean;
  requestSourceChanged?: boolean;
  error?: string;
};
function useSessionAIPreparation({
  client,
  intakeId,
  onStatusChange,
}: {
  client: SupabaseClient;
  intakeId: string;
  onStatusChange?: () => void;
}) {
  const [slot, setSlot] = useState<Slot | null>(null),
    [error, setError] = useState("");
  const statusCallback = useRef(onStatusChange);
  statusCallback.current = onStatusChange;
  useEffect(() => { if (slot) statusCallback.current?.(); }, [slot?.status, slot?.sourceChanged]);
  const alive = useRef(true),
    running = useRef(false);
  const generate = async (refresh = false) => {
    if (running.current) return;
    running.current = true;
    setError("");
    setSlot((s) => ({ ...s, status: "pending", result: s?.result }));
    try {
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw Error("Sign in to view this check.");
      const r = await fetch("/api/review-suggestion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ intakeId, action: "session-check", refresh }),
      });
      const v = await r.json();
      if (!r.ok) throw Error(v.error || "AI check unavailable.");
      if (alive.current)
        setSlot({ status: v.state, result: v.result, error: v.error });
    } catch (e) {
      if (alive.current) {
        setError((e as Error).message);
        setSlot((s) => ({ ...s, status: "failed", result: s?.result }));
      }
    } finally {
      running.current = false;
    }
  };
  useEffect(() => {
    alive.current = true;
    let active = true;
    void (async () => {
      try {
        const { data, error } = await client.rpc("get_session_ai_check", {
          p_intake_id: intakeId,
        });
        if (!active) return;
        if (error) throw error;
        setSlot(data);
        if (
          data.status === "empty" ||
          (data.status === "ready" && data.sourceChanged) ||
          (["failed", "interrupted"].includes(data.status) &&
            data.requestSourceChanged)
        )
          void generate();
      } catch (e) {
        if (active) setError((e as Error).message || "AI check unavailable.");
      }
    })();
    return () => {
      active = false;
      alive.current = false;
    };
  }, [intakeId, client]);
  useEffect(() => {
    if (slot?.status !== "pending") return;
    let active = true,
      count = 0;
    const timer = setInterval(() => {
      void (async () => {
        try {
          const { data, error } = await client.rpc("get_session_ai_check", {
            p_intake_id: intakeId,
          });
          if (active && !error) setSlot(data);
        } catch {
          /* keep current state */
        }
        if (++count >= 50) clearInterval(timer);
      })();
    }, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [slot?.status, intakeId, client]);
  return { slot, error, generate };
}

// Keep automatic preparation independent of whether its analysis is displayed.
// Students see only their confirmed summary and saved teacher feedback.
export function SessionAIPreparation({client, intakeId}: {
  client: SupabaseClient;
  intakeId: string;
}) {
  useSessionAIPreparation({client, intakeId});
  return null;
}

export function SessionAIReview({client, intakeId, onStatusChange}: {
  client: SupabaseClient;
  intakeId: string;
  onStatusChange?: () => void;
}) {
  const {slot, error, generate} = useSessionAIPreparation({client, intakeId, onStatusChange});
  return (
    <section
      className="session-ai-check"
      aria-label="AI session progress check"
    >
      <h4>AI progress check</h4>
      <small>
        Teacher reference · based on student-reported progress. Verify during your review.
      </small>
      {slot?.sourceChanged && (
        <p>The saved check refers to an earlier summary revision.</p>
      )}
      {slot?.result && (
        <>
          <p>{slot.result.summary}</p>
          {slot.result.attentionPoints?.length > 0 && (
            <>
              <b>Points to clarify</b>
              <ul>
                {slot.result.attentionPoints.map((p: string, i: number) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </>
          )}
          {slot.result.questions?.length > 0 && (
            <details>
              <summary>Questions to consider</summary>
              <ul>
                {slot.result.questions.map((p: string, i: number) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
      {slot?.status === "pending" && (
        <p>Checking and saving your progress update…</p>
      )}
      {slot?.status === "disabled" && (
        <p>Automatic checks are disabled for this class.</p>
      )}
      {slot?.status === "paused" && (
        <p>AI checking is paused until your summary correction is confirmed.</p>
      )}
      {(error || slot?.error) && <p role="alert">{error || slot?.error}</p>}
      {["failed", "interrupted"].includes(slot?.status || "") && (
        <button
          className="secondary compact"
          onClick={() => void generate(true)}
        >
          Retry AI check
        </button>
      )}
    </section>
  );
}
export function SessionProgressReview({
  client,
  student,
  renderSource,
  renderPublished,
  onDirty,
  onSaved,
}: {
  client: SupabaseClient;
  student: ReviewStudent;
  renderSource: (s: ReviewStudent) => ReactNode;
  renderPublished: (p: any) => ReactNode;
  onDirty?: (v: boolean) => void;
  onSaved?: () => void;
}) {
  const [context, setContext] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void client
      .rpc("get_core_review_workspace", { p_intake_id: student.intakeId })
      .then(({ data, error }) => {
        if (active) {
          if (error) setError(error.message);
          else setContext(data.review);
        }
      });
    return () => {
      active = false;
    };
  }, [client, student.intakeId]);
  return (
    <main className="session-progress-pane">
      <h3>{student.studentName}</h3>
      <p>
        Session records and AI checks are separate from teacher decisions.
        Complete an independent teacher review in the <b>Review</b> tab.
      </p>
      <SessionAIReview client={client} intakeId={student.intakeId!} onStatusChange={onSaved} />
      <OptionalTeacherCheck key={student.intakeId} client={client} intakeId={student.intakeId!} onDirty={onDirty} onSaved={onSaved} />
      {error && <p role="alert">{error}</p>}
      {context && (
        <>
          <details>
            <summary>Student progress source</summary>
            <IntakeReviewDetails record={context.studentRecord} />
            {renderSource(student)}
          </details>
          {context.published && (
            <details>
              <summary>Legacy session teacher feedback · read-only</summary>
              {renderPublished(context.published)}
            </details>
          )}
          {context.draft &&
            (context.draft.teacherObservation ||
              context.draft.quickNotes ||
              context.draft.items?.length > 0) && (
              <details>
                <summary>Earlier teacher draft · preserved, read-only</summary>
                <p>
                  {context.draft.teacherObservation || context.draft.quickNotes}
                </p>
                {context.draft.coreReview && (
                  <CoreFeedbackView points={context.draft.coreReview} />
                )}{" "}
                {context.draft.items?.map((v: any, i: number) => (
                  <p key={i}>
                    {v.observation} {v.notes} {v.recommendation}
                  </p>
                ))}
              </details>
            )}
        </>
      )}
    </main>
  );
}
export function StudentTeacherNodeReviews({
  client,
}: {
  client: SupabaseClient;
}) {
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error } = await client.rpc("get_my_teacher_node_reviews");
      if (active) {
        if (error) setError("Teacher reviews could not be loaded.");
        else {
          setRows(data || []);
          setError("");
        }
      }
    };
    void load();
    const refresh = () => void load();
    window.addEventListener("focus", refresh);
    const timer = setInterval(refresh, 25000);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      clearInterval(timer);
    };
  }, [client]);
  if (!rows.length && !error) return null;
  return (
    <section className="node-student-feedback">
      <h3>Teacher reviews</h3>
      <p>
        Stage reviews confirmed by your teacher, separate from session AI
        checks.
      </p>
      {error && <p role="alert">{error}</p>}
      {rows.map((r) => (
        <article key={r.id}>
          <h4>
            {r.feedback.node.id.toUpperCase()} · {r.feedback.node.label}
          </h4>
          <small>
            {r.classLabel} · {r.feedback.teacherName} ·{" "}
            {new Date(r.feedback.publishedAt).toLocaleString()}
          </small>
          <p>
            Based on S{r.feedback.node.fromSession}–S{r.feedback.node.toSession}
          </p>
          {r.feedback.reviewedOn && (
            <p>Meeting date: {r.feedback.reviewedOn}</p>
          )}
          <PublishedCoreFeedback feedback={r.feedback} />
        </article>
      ))}
    </section>
  );
}
