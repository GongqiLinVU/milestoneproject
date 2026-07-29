import { StrictMode, useEffect, useRef, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  Download,
  FileText,
  LogOut,
  Pencil,
  Presentation,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import "./styles.css";
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ||
    "https://gwihaizxivclamzehupk.supabase.co",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_-RPm45eBd8_CVaNk4GbXhg_nxOkMrLr",
);
const teams = Array.from({ length: 8 }, (_, i) => `Team ${i + 1}`);
type Kind = "checkin" | "pulse" | "health" | "checkout" | "review";
const titles: Record<Kind, string> = {
  checkin: "Week 1 Check-in",
  pulse: "Class Pulse",
  health: "Team Health Check",
  checkout: "Week 1 Engagement Check-out",
  review: "Poster Peer Review",
};
function App() {
  const [form, setForm] = useState<Kind | null>(null);
  const [live, setLive] = useState<boolean | null>(null);
  const [peerReviewOpen, setPeerReviewOpen] = useState<boolean | null>(null);
  useEffect(() => {
    supabase
      .from("portal_health")
      .select("status")
      .limit(1)
      .then(({ error }) => setLive(!error));
    supabase
      .from("activity_settings")
      .select("is_open")
      .eq("setting_key", "poster_peer_review")
      .single()
      .then(({ data, error }) =>
        setPeerReviewOpen(error ? false : Boolean(data?.is_open)),
      );
  }, []);
  return (
    <>
      <header>
        <a className="brand" href="#top">
          NIT3004 <span>Engineering Studio</span>
        </a>
        <nav>
          <a href="#journey">Journey</a>
          <a href="#week1">Week 1</a>
          <a href="#expo">Project Expo</a>
          <a href="#deliverables">Deliverables</a>
          <a href="/admin">Teacher</a>
        </nav>
      </header>
      <main id="top">
        <section className="hero">
          <div>
            <div className="eyebrow">
              Applied Project II · Four-week delivery studio
            </div>
            <h1>
              Build less.
              <br />
              Deliver <em>better.</em>
            </h1>
            <p>
              You already know how to build software. Now learn how to align a
              team, prove progress, validate readiness and deliver with
              confidence.
            </p>
            <div className="actions">
              <a className="primary" href="#journey">
                Explore the journey <ArrowRight size={18} />
              </a>
              <button className="secondary" onClick={() => setForm("checkin")}>
                Start Week 1 check-in
              </button>
            </div>
            <div className={"status " + (live ? "ok" : "")}>
              <span></span>
              {live === null
                ? "Checking live data…"
                : live
                  ? "Live data connected"
                  : "Database setup required"}
            </div>
          </div>
          <div className="hero-card">
            <b>4 Weeks</b>
            <span>1 Mission</span>
            <span>1 Product</span>
            <span>1 Team</span>
            <small>∞ possibilities</small>
          </div>
        </section>
        <Journey />
        <Studio />
        <Week1 open={setForm} />
        <Expo
          peerReviewOpen={peerReviewOpen}
          openReview={() => peerReviewOpen && setForm("review")}
        />
        <Deliverables />
      </main>
      <footer>
        NIT3004 Engineering Studio · Learn to deliver like an engineer.
      </footer>
      <Modal key={form ?? "closed"} kind={form} close={() => setForm(null)} />
    </>
  );
}
function Journey() {
  const weeks = [
    [
      "01",
      "Commit",
      "Studio Kickoff",
      "Align the team, understand the rules and make a practical four-week plan.",
    ],
    [
      "02",
      "Prove",
      "Design Review",
      "Show what works, explain decisions and expose delivery risks.",
    ],
    [
      "03",
      "Validate",
      "Project Expo",
      "Peer-review products, evidence and document readiness.",
    ],
    [
      "04",
      "Deliver",
      "Demo Day",
      "Tell one credible delivery story supported by a working product.",
    ],
  ];
  return (
    <section id="journey">
      <Head label="Course journey" title="Commit. Prove. Validate. Deliver." />
      <div className="week-grid">
        {weeks.map((w) => (
          <article key={w[0]}>
            <small>WEEK {w[0]}</small>
            <h3>{w[1]}</h3>
            <b>{w[2]}</b>
            <p>{w[3]}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
function Studio() {
  return (
    <section className="dark">
      <Head
        label="Monday Studio"
        title="The one session every team protects."
        text="Industry story → team stand-up → design review → workshop → checkpoint → next mission."
      />
      <div className="principles">
        {[
          [
            Users,
            "Show up",
            "Real engineering teams protect shared delivery time.",
          ],
          [
            Presentation,
            "Speak up",
            "Every member should explain decisions and contribution.",
          ],
          [
            ClipboardCheck,
            "Help another team",
            "Peer feedback is part of professional practice.",
          ],
          [
            CheckCircle2,
            "Demo over excuses",
            "Evidence of working software matters.",
          ],
        ].map(([Icon, t, p]: any) => (
          <div key={t}>
            <Icon />
            <b>{t}</b>
            <p>{p}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
function Week1({ open }: { open: (k: Kind) => void }) {
  return (
    <section id="week1">
      <Head
        label="Week 1 · Studio Kickoff"
        title="Start light. Learn who is in the room."
        text="After the course briefing, use short interactions to understand the class, meet every team and establish how we will work together."
      />
      <div className="activity-grid">
        <Activity
          title="Class Pulse"
          text="Anonymous confidence, concerns and AI-use snapshot."
          action={() => open("pulse")}
        />
        <Activity
          title="Team Health Check"
          text="Share your individual view of communication, participation and delivery health."
          action={() => open("health")}
        />
        <Activity
          title="Week 1 Engagement Check-out"
          text="Record how you participated after Monday and what the teacher should verify next."
          action={() => open("checkout")}
        />
      </div>
      <blockquote>
        “I already know you can build software. For the next four weeks, I want
        to help you learn how to deliver software.”
      </blockquote>
    </section>
  );
}
function Expo({
  peerReviewOpen,
  openReview,
}: {
  peerReviewOpen: boolean | null;
  openReview: () => void;
}) {
  const reviewLoading = peerReviewOpen === null;
  return (
    <section id="expo" className="expo">
      <Head
        label="Week 3 · Project Expo"
        title="Peer review with a purpose."
        text="A poster is a readiness dashboard—not decoration. Teams review the product, evidence, document completion and next priority."
      />
      <div className="expo-layout">
        <div className="poster">
          {[
            "01 Problem",
            "02 Solution",
            "03 Working product",
            "04 Evidence",
            "05 Document readiness",
            "06 Final sprint",
          ].map((x) => (
            <div key={x}>{x}</div>
          ))}
        </div>
        <div>
          <h3>Review five signals</h3>
          <ul>
            <li>Problem clarity</li>
            <li>Working product</li>
            <li>Evidence and testing</li>
            <li>Document readiness</li>
            <li>Explanation quality</li>
          </ul>
          <button
            className="primary"
            disabled={!peerReviewOpen}
            aria-describedby="peer-review-status"
            onClick={openReview}
          >
            {reviewLoading
              ? "Checking peer review…"
              : peerReviewOpen
                ? "Open peer review"
                : "Peer review opens in Week 3"}
          </button>
          <p id="peer-review-status" className="activity-status">
            {reviewLoading
              ? "Checking whether this activity is open."
              : peerReviewOpen
                ? "Peer review is open. Submit one review for another team."
                : "This activity is not open yet."}
          </p>
        </div>
      </div>
    </section>
  );
}
function Deliverables() {
  return (
    <section id="deliverables">
      <Head
        label="Delivery evidence"
        title="One delivery story, three forms of evidence."
      />
      <div className="deliverables">
        {[
          [
            Presentation,
            "Progress Report",
            "Problem → solution → evidence → decision → next sprint.",
          ],
          [
            FileText,
            "Final Documents",
            "A complete, consistent record of what the team built and validated.",
          ],
          [
            CheckCircle2,
            "Demo Day",
            "A convincing product story supported by a stable live demonstration.",
          ],
        ].map(([Icon, t, p]: any) => (
          <div key={t}>
            <Icon />
            <h3>{t}</h3>
            <p>{p}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
function Head({
  label,
  title,
  text,
}: {
  label: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="section-head">
      <span>{label}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}
function Activity({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action: () => void;
}) {
  return (
    <article>
      <h3>{title}</h3>
      <p>{text}</p>
      <button onClick={action}>
        Open activity <ArrowRight size={16} />
      </button>
    </article>
  );
}
function friendlyError(code: string | undefined, kind: Kind) {
  if (kind === "review" && code === "42501")
    return "Peer review is currently closed. Your response was not submitted.";
  if (code === "23505") {
    if (kind === "health" || kind === "checkout" || kind === "checkin")
      return "This Student ID has already submitted this activity.";
    if (kind === "review") return "You have already reviewed this team.";
  }
  if (code === "42703")
    return "This activity is temporarily unavailable. Please tell your teacher.";
  return "We could not record your response. Please check your answers and try again.";
}

async function submissionStorageKey(
  kind: Kind,
  values: Record<string, FormDataEntryValue>,
) {
  const normalise = (value: FormDataEntryValue | undefined) =>
    String(value ?? "")
      .trim()
      .toLowerCase();
  const identity =
    kind === "pulse"
      ? "anonymous-class-pulse"
      : kind === "review"
          ? `${normalise(values.sid)}|${normalise(values.reviewed_team)}`
          : normalise(values.sid);
  const bytes = new TextEncoder().encode(`nit3004|${kind}|${identity}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `nit3004-submission-v1:${kind}:${hash}`;
}

type SubmissionReceipt = {
  submittedAt: string;
  answers: Array<{ label: string; value: string }>;
};

const ratingText = (value: FormDataEntryValue | undefined) => {
  const labels = [
    "Needs significant work",
    "Needs improvement",
    "Developing",
    "Strong",
    "Excellent",
  ];
  const number = Number(value);
  return number >= 1 && number <= 5
    ? `${number} — ${labels[number - 1]}`
    : String(value ?? "");
};

function submissionReceipt(
  kind: Kind,
  values: Record<string, FormDataEntryValue>,
): SubmissionReceipt {
  const text = (name: string) => String(values[name] ?? "").trim();
  const answersByKind: Record<
    Kind,
    Array<{ label: string; value: string }>
  > = {
    checkin: [
      { label: "Team", value: text("team") },
      { label: "Four-week goal", value: text("goal") },
    ],
    pulse: [
      {
        label: "Confidence",
        value: [
          "Not confident yet",
          "Slightly confident",
          "Moderately confident",
          "Confident",
          "Very confident",
        ][Number(values.confidence) - 1]
          ? `${values.confidence} — ${
              [
                "Not confident yet",
                "Slightly confident",
                "Moderately confident",
                "Confident",
                "Very confident",
              ][Number(values.confidence) - 1]
            }`
          : text("confidence"),
      },
      { label: "Main concern", value: text("concern") },
      { label: "AI usage", value: text("ai") },
    ],
    health: [
      { label: "Team", value: text("team") },
      { label: "Communication", value: text("communication") },
      { label: "Role clarity", value: text("role_clarity") },
      { label: "Participation balance", value: text("participation_balance") },
      { label: "Delivery status", value: text("delivery_status") },
      { label: "Voice in the team", value: text("voice") },
      { label: "Teacher support", value: text("teacher_support") },
      { label: "Main issue", value: text("main_issue") },
      { label: "Details", value: text("risk_note") },
    ],
    checkout: [
      { label: "Team", value: text("team") },
      { label: "Participation", value: text("participation_mode") },
      { label: "Time invested", value: text("time_invested") },
      { label: "Contribution areas", value: text("contribution_areas") },
      { label: "Task completion", value: text("task_completion") },
      { label: "Evidence", value: text("evidence_status") },
      { label: "Team communication", value: text("team_communication") },
      { label: "Participation balance", value: text("participation_balance") },
      { label: "Next task clarity", value: text("next_task_clarity") },
      { label: "Work status", value: text("work_status") },
      { label: "Monday discussion focus", value: text("discussion_focus") },
      { label: "Details", value: text("detail_note") },
    ],
    review: [
      { label: "Reviewer team", value: text("reviewer_team") },
      { label: "Reviewed team", value: text("reviewed_team") },
      { label: "Problem clarity", value: ratingText(values.problem) },
      { label: "Working product", value: ratingText(values.product) },
      { label: "Evidence and testing", value: ratingText(values.evidence) },
      { label: "Document readiness", value: ratingText(values.docs) },
      { label: "Explanation quality", value: ratingText(values.explanation) },
      { label: "Strongest part", value: text("strongest") },
      { label: "Highest priority", value: text("priority") },
    ],
  };
  return {
    submittedAt: new Date().toISOString(),
    answers: answersByKind[kind].filter(({ value }) => Boolean(value)),
  };
}

function readSubmissionReceipt(key: string): SubmissionReceipt | null {
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as Partial<SubmissionReceipt>;
    if (parsed.submittedAt && Array.isArray(parsed.answers)) {
      return {
        submittedAt: parsed.submittedAt,
        answers: parsed.answers.filter(
          (answer): answer is { label: string; value: string } =>
            typeof answer?.label === "string" &&
            typeof answer?.value === "string",
        ),
      };
    }
  } catch {
    // Earlier versions stored only an ISO timestamp.
  }
  return { submittedAt: stored, answers: [] };
}

function Modal({ kind, close }: { kind: Kind | null; close: () => void }) {
  const [msg, setMsg] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [storedSubmission, setStoredSubmission] =
    useState<SubmissionReceipt | null>(
      null,
  );
  useEffect(() => {
    setMsg("");
    setSubmitted(false);
    setStoredSubmission(null);
    if (kind !== "pulse") return;
    let cancelled = false;
    submissionStorageKey(kind, {})
      .then((key) => {
        const receipt = readSubmissionReceipt(key);
        if (!cancelled && receipt) setStoredSubmission(receipt);
      })
      .catch(() => {
        // Storage is optional and may be unavailable in restricted browsers.
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);
  if (!kind) return null;
  const activeKind = kind;
  async function checkStoredSubmission(form: HTMLFormElement) {
    const values = Object.fromEntries(new FormData(form)) as Record<
      string,
      FormDataEntryValue
    >;
    const identityReady =
      activeKind === "pulse" ||
      ((activeKind === "checkin" || activeKind === "health" || activeKind === "checkout") &&
        Boolean(String(values.sid ?? "").trim())) ||
      (activeKind === "review" &&
        Boolean(String(values.sid ?? "").trim()) &&
        Boolean(values.reviewed_team));
    if (!identityReady) {
      setStoredSubmission(null);
      return;
    }
    try {
      const key = await submissionStorageKey(activeKind, values);
      setStoredSubmission(readSubmissionReceipt(key));
    } catch {
      setStoredSubmission(null);
    }
  }
  async function submit(e: any) {
    e.preventDefault();
    setMsg("");
    const formData = new FormData(e.currentTarget);
    const v = Object.fromEntries(formData) as Record<
      string,
      FormDataEntryValue
    >;
    const contributionAreas = formData.getAll("contribution_areas").map(String);
    if (activeKind === "checkout") {
      if (contributionAreas.length === 0) {
        setMsg("Select at least one contribution area.");
        return;
      }
      v.contribution_areas = contributionAreas.join(", ");
    }
    let storageKey = "";
    try {
      storageKey = await submissionStorageKey(activeKind, v);
      const receipt = readSubmissionReceipt(storageKey);
      if (receipt) {
        setStoredSubmission(receipt);
        setMsg("");
        return;
      }
    } catch {
      // Storage is a convenience guard only. Database constraints remain authoritative.
    }
    let table = "",
      payload: any = {};
    if (activeKind === "checkin") {
      table = "student_checkins";
      payload = {
        student_name: v.name,
        student_id: v.sid,
        team_name: v.team,
        goal: v.goal,
      };
    }
    if (activeKind === "pulse") {
      table = "week1_pulse";
      payload = {
        confidence: +v.confidence,
        concern: v.concern,
        ai_usage: v.ai,
      };
    }
    if (activeKind === "health") {
      table = "team_health_checks";
      payload = {
        student_name: v.name,
        student_id: v.sid,
        team_name: v.team,
        communication: v.communication,
        role_clarity: v.role_clarity,
        participation_balance: v.participation_balance,
        delivery_status: v.delivery_status,
        voice: v.voice,
        teacher_support: v.teacher_support,
        main_issue: v.main_issue,
        risk_note: v.risk_note || null,
      };
    }
    if (activeKind === "checkout") {
      table = "weekly_engagement_checkouts";
      payload = {
        week_number: 1,
        student_name: v.name,
        student_id: v.sid,
        team_name: v.team,
        participation_mode: v.participation_mode,
        time_invested: v.time_invested,
        contribution_areas: contributionAreas,
        task_completion: v.task_completion,
        evidence_status: v.evidence_status,
        team_communication: v.team_communication,
        participation_balance: v.participation_balance,
        next_task_clarity: v.next_task_clarity,
        work_status: v.work_status,
        discussion_focus: v.discussion_focus,
        detail_note: v.detail_note || null,
      };
    }
    if (activeKind === "review") {
      if (v.reviewer_team === v.reviewed_team) {
        setMsg("You cannot review your own team.");
        return;
      }
      table = "poster_reviews";
      payload = {
        reviewer_name: v.name,
        reviewer_student_id: v.sid,
        reviewer_team: v.reviewer_team,
        reviewed_team: v.reviewed_team,
        problem_clarity: +v.problem,
        working_product: +v.product,
        evidence_testing: +v.evidence,
        document_readiness: +v.docs,
        presentation_quality: +v.explanation,
        strongest_part: v.strongest,
        highest_priority: v.priority,
      };
    }
    const { error } = await supabase.from(table).insert(payload);
    if (error) {
      setMsg(friendlyError(error.code, activeKind));
      return;
    }
    const receipt = submissionReceipt(activeKind, v);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(receipt));
      } catch {
        // A successful database submission must not fail because storage is unavailable.
      }
    }
    setStoredSubmission(receipt);
    setSubmitted(true);
    setMsg("Response recorded. Thank you.");
  }
  return (
    <div
      className="modal"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div className="dialog">
        <button className="close" onClick={close} aria-label="Close form">
          ×
        </button>
        <div className="eyebrow">Student interaction</div>
        <h2>{titles[kind]}</h2>
        <form
          onSubmit={submit}
          onChange={(event) => void checkStoredSubmission(event.currentTarget)}
        >
          {storedSubmission ? (
            <>
              <div className="submission-notice" role="status">
                <b>Already submitted from this browser</b>
                <span>
                  Recorded{" "}
                  {new Date(storedSubmission.submittedAt).toLocaleString(
                    undefined,
                    {
                    dateStyle: "medium",
                    timeStyle: "short",
                    },
                  )}
                  . This submission is locked and cannot be edited.
                </span>
              </div>
              {storedSubmission.answers.length > 0 ? (
                <dl className="submission-receipt">
                  {storedSubmission.answers.map(({ label, value }) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="receipt-note">
                  This submission was saved by an earlier version, so its
                  answers are not available on this browser.
                </p>
              )}
              <p className="receipt-note">
                This receipt is saved only on this browser. Your name and
                Student ID are not stored here.
              </p>
              {activeKind !== "pulse" && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setStoredSubmission(null)}
                >
                  Start a different submission
                </button>
              )}
              <button type="button" onClick={close}>
                Close
              </button>
            </>
          ) : (
            <>
              {fields(kind)}
              {msg && (
                <p
                  className={"form-status " + (submitted ? "success" : "")}
                  aria-live="polite"
                >
                  {msg}
                </p>
              )}
              <button disabled={submitted}>
                {submitted ? "Already submitted" : "Submit response"}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
const Help = ({ text }: { text: string }) => (
  <details className="field-help">
    <summary aria-label="Show help">
      <CircleHelp size={20} />
    </summary>
    <span>{text}</span>
  </details>
);
const Team = ({
  name = "team",
  label = "Team",
}: {
  name?: string;
  label?: string;
}) => (
  <label>
    {label}
    <select name={name} required>
      <option value="">Select team</option>
      {teams.map((t) => (
        <option key={t}>{t}</option>
      ))}
    </select>
  </label>
);
const Text = ({
  label,
  name,
  maxLength,
}: {
  label: string;
  name: string;
  maxLength: number;
}) => (
  <label>
    {label}
    <textarea name={name} required maxLength={maxLength} />
    <small className="field-hint">Maximum {maxLength} characters</small>
  </label>
);
const Identity = () => (
  <>
    <label>
      Name
      <input name="name" required maxLength={100} />
    </label>
    <label>
      Student ID
      <input name="sid" required minLength={3} maxLength={40} />
    </label>
    <Team />
  </>
);
function Rating({
  label,
  name,
  confidence = false,
}: {
  label: string;
  name: string;
  confidence?: boolean;
}) {
  const options = confidence
    ? [
        "1 — Not confident yet",
        "2 — Slightly confident",
        "3 — Moderately confident",
        "4 — Confident",
        "5 — Very confident",
      ]
    : [
        "1 — Needs significant work",
        "2 — Needs improvement",
        "3 — Developing",
        "4 — Strong",
        "5 — Excellent",
      ];
  return (
    <div className="field-group">
      <div className="field-label">
        <label htmlFor={name}>{label}</label>
        <Help
          text={
            confidence
              ? "How confident are you that your team can deliver successfully in the next four weeks? 1 is the lowest and 5 is the highest."
              : "Rate the evidence you can see. 1 is the lowest and 5 is the highest."
          }
        />
      </div>
      <select id={name} name={name} defaultValue="" required>
        <option value="" disabled>
          Select a rating
        </option>
        {options.map((text, index) => (
          <option key={text} value={index + 1}>
            {text}
          </option>
        ))}
      </select>
      <small className="field-hint">
        {confidence
          ? "1 = lowest confidence · 5 = highest confidence"
          : "1 = lowest rating · 5 = highest rating"}
      </small>
    </div>
  );
}
const peerRatingOptions = [
  ["1", "Not demonstrated", "No clear evidence was shown."],
  ["2", "Early stage", "Some work is visible, but major gaps remain."],
  ["3", "Developing", "The core idea is present, with more work needed."],
  ["4", "Strong", "Clear and convincing evidence was shown."],
  ["5", "Excellent", "Complete, polished and ready to present."],
] as const;
function PeerRating({ label, name }: { label: string; name: string }) {
  return (
    <fieldset className="peer-rating">
      <legend>{label}</legend>
      <div className="peer-rating-options">
        {peerRatingOptions.map(([value, title, description]) => (
          <label key={value}>
            <input type="radio" name={name} value={value} required />
            <span>
              <b>{value} · {title}</b>
              <small>{description}</small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
const SelectChoice = ({
  label,
  name,
  placeholder,
  options,
}: {
  label: string;
  name: string;
  placeholder: string;
  options: string[];
}) => (
  <label>
    {label}
    <select name={name} defaultValue="" required>
      <option value="" disabled>{placeholder}</option>
      {options.map((option) => <option key={option}>{option}</option>)}
    </select>
  </label>
);
function Choice({ label, name, options }: { label: string; name: string; options: string[] }) {
  return <SelectChoice label={label} name={name} placeholder="Select one" options={options} />;
}
function TeamHealthFields() {
  const [risk, setRisk] = useState(false);
  const assess = (form: HTMLFormElement) => {
    const data = new FormData(form);
    setRisk(
      ["Not yet"].includes(String(data.get("communication"))) ||
      ["Not clear"].includes(String(data.get("role_clarity"))) ||
      ["Significant difference"].includes(String(data.get("participation_balance"))) ||
      ["Blocked"].includes(String(data.get("delivery_status"))) ||
      ["No"].includes(String(data.get("voice"))) ||
      ["Yes"].includes(String(data.get("teacher_support"))) ||
      ["Other"].includes(String(data.get("main_issue")))
    );
  };
  return <div onChange={(event) => assess(event.currentTarget.closest("form")!)}>
    <p className="form-note">Complete this individually. It measures participation temperature, not performance or marks.</p>
    <Identity />
    <Choice label="Have you communicated with your team this week?" name="communication" options={["Yes","Not yet"]} />
    <Choice label="Is your role clear?" name="role_clarity" options={["Clear","Partly clear","Not clear"]} />
    <Choice label="Is participation balanced?" name="participation_balance" options={["Balanced","Some difference","Significant difference"]} />
    <Choice label="Current team delivery status" name="delivery_status" options={["On track","Some risk","Blocked"]} />
    <Choice label="Can you express your view in the team?" name="voice" options={["Yes","Sometimes","No"]} />
    <Choice label="Does the team need teacher support?" name="teacher_support" options={["No","Maybe","Yes"]} />
    <Choice label="Main issue" name="main_issue" options={["None","Communication","Participation","Technical","Scope","Time","Other"]} />
    {risk && <label>Brief details<textarea name="risk_note" required maxLength={200} /><small className="field-hint">Maximum 200 characters</small></label>}
  </div>;
}
function EngagementCheckoutFields() {
  const [risk, setRisk] = useState(false);
  const assess = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const risky = ["No further participation","Not completed","No clear task was assigned","No communication","Significantly unbalanced","Not clear","At risk","Blocked","Other"];
    setRisk(Array.from(data.values()).some((value) => risky.includes(String(value))));
  };
  const areas = ["Team discussion","Planning or research","UI/UX","Development","Testing","Documentation","Presentation or demo preparation","Team coordination","Other"];
  return <div onChange={(event) => assess(event.currentTarget.closest("form")!)}>
    <p className="form-note">Complete this after the final Week 1 session, including work completed remotely.</p>
    <Identity />
    <Choice label="1. How did you participate after compulsory Monday?" name="participation_mode" options={["Wednesday session","Thursday session","Both sessions","Remote teamwork","Individual work only","No further participation"]} />
    <Choice label="2. Time invested this week" name="time_invested" options={["Less than 1 hour","1–2 hours","3–5 hours","More than 5 hours"]} />
    <fieldset className="choice-checklist"><legend>3. Contribution areas (select all that apply)</legend>{areas.map(area => <label key={area}><input type="checkbox" name="contribution_areas" value={area} required={false}/><span>{area}</span></label>)}</fieldset>
    <Choice label="4. Did you complete your committed task?" name="task_completion" options={["Fully completed","Mostly completed","Partly completed","Not completed","No clear task was assigned"]} />
    <Choice label="5. Is work evidence available for Monday?" name="evidence_status" options={["Yes, clearly available","Partly available","Not yet","Not applicable this week"]} />
    <Choice label="6. Team communication this week" name="team_communication" options={["Active and effective","Some communication","Very limited communication","No communication"]} />
    <Choice label="7. Was team participation balanced?" name="participation_balance" options={["Mostly balanced","Some differences","Significantly unbalanced","Not enough information"]} />
    <Choice label="8. Is your next task clear?" name="next_task_clarity" options={["Completely clear","Mostly clear","Partly clear","Not clear"]} />
    <Choice label="9. Current work status" name="work_status" options={["On track","Some difficulty","At risk","Blocked"]} />
    <Choice label="10. What should the teacher verify on Monday?" name="discussion_focus" options={["My completed work","Technical difficulty","Team communication","Uneven participation","Task or scope clarity","Progress report or documentation","Nothing specific","Other"]} />
    {risk && <label>Brief details<textarea name="detail_note" required maxLength={200} /><small className="field-hint">Maximum 200 characters</small></label>}
  </div>;
}
function fields(k: Kind) {
  if (k === "checkin")
    return (
      <>
        <Identity />
        <Text
          label="What do you want to achieve in these four weeks?"
          name="goal"
          maxLength={800}
        />
      </>
    );
  if (k === "pulse")
    return (
      <>
        <p className="form-note">
          This anonymous pulse helps your teacher understand how the class is
          feeling. It is not an assessment.
        </p>
        <Rating label="Confidence" name="confidence" confidence />
        <label>
          Main concern
          <select name="concern" required defaultValue="">
            <option value="" disabled>
              Select your main concern
            </option>
            {[
              "Working product",
              "Documentation",
              "Presentation",
              "Teamwork",
              "Testing",
              "Time",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          AI usage
          <select name="ai" required defaultValue="">
            <option value="" disabled>
              Select your AI usage
            </option>
            {[
              "Rarely",
              "Weekly",
              "Daily",
              "It is part of almost every task",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
      </>
    );
  if (k === "health") return <TeamHealthFields />;
  if (k === "checkout") return <EngagementCheckoutFields />;
  return (
    <>
      <p className="form-note">
        Review another team. Choose the option that best matches the evidence
        you saw—no written comment is required.
      </p>
      <label>
        Reviewer name
        <input name="name" required maxLength={100} />
      </label>
      <label>
        Student ID
        <input name="sid" required minLength={3} maxLength={40} />
      </label>
      <Team name="reviewer_team" label="Your team (from team)" />
      <Team name="reviewed_team" label="Team being reviewed (to team)" />
      {[
        ["Problem clarity", "problem"],
        ["Working product", "product"],
        ["Evidence & testing", "evidence"],
        ["Document readiness", "docs"],
        ["Explanation quality", "explanation"],
      ].map(([label, name]) => (
        <PeerRating key={name} label={label} name={name} />
      ))}
      <SelectChoice
        label="Strongest part"
        name="strongest"
        placeholder="Select the strongest area"
        options={[
          "Problem and user need",
          "Solution and scope",
          "Working product",
          "Evidence and testing",
          "Documentation",
          "Presentation and explanation",
          "Team coordination",
        ]}
      />
      <SelectChoice
        label="Highest priority before Demo Day"
        name="priority"
        placeholder="Select the most important next step"
        options={[
          "Clarify the problem and user need",
          "Reduce or clarify the scope",
          "Complete the core product flow",
          "Fix reliability or technical issues",
          "Add stronger testing evidence",
          "Complete the documentation",
          "Improve the presentation and demo",
          "No major change needed",
        ]}
      />
    </>
  );
}
function Admin() {
  const activityTables = [
    {
      table: "student_checkins",
      label: "Student check-ins",
      title: "Student Check-in records",
      description: "Review each student’s team and intended four-week outcome.",
      select:
        "id, student_name, student_id, team_name, goal, created_at, updated_at",
      columns: [
        ["student_name", "Name"],
        ["student_id", "Student ID"],
        ["team_name", "Team"],
        ["goal", "Four-week goal"],
        ["created_at", "Created"],
        ["updated_at", "Updated"],
      ],
      editable: [
        ["student_name", "Name", "text", 100],
        ["student_id", "Student ID", "text", 40],
        ["team_name", "Team", "team", 0],
        ["goal", "Four-week goal", "textarea", 800],
      ],
    },
    {
      table: "week1_pulse",
      label: "Class pulse",
      title: "Class Pulse overview",
      description:
        "See anonymous class-level patterns without exposing individual responses.",
      select: "id, ai_usage, confidence, concern",
      columns: [],
      editable: [],
    },
    {
      table: "team_health_checks",
      label: "Team health",
      title: "Team Health Check",
      description: "Review individual responses and each team’s participation temperature.",
      select: "id, student_name, student_id, team_name, communication, role_clarity, participation_balance, delivery_status, voice, teacher_support, main_issue, risk_note, created_at, updated_at",
      columns: [
        ["student_name", "Name"], ["student_id", "Student ID"], ["team_name", "Team"],
        ["communication", "Communication"], ["role_clarity", "Role clarity"],
        ["participation_balance", "Participation balance"], ["delivery_status", "Delivery"],
        ["voice", "Voice"], ["teacher_support", "Teacher support"], ["main_issue", "Main issue"],
        ["risk_note", "Details"], ["created_at", "Created"], ["updated_at", "Updated"],
      ],
      editable: [
        ["student_name", "Name", "text", 100], ["student_id", "Student ID", "text", 40],
        ["team_name", "Team", "team", 0], ["risk_note", "Details", "textarea", 200],
      ],
    },
    {
      table: "weekly_engagement_checkouts",
      label: "Week 1 check-outs",
      title: "Week 1 Engagement Check-out",
      description: "Review participation outside Monday, evidence readiness and Monday discussion focus.",
      select: "id, week_number, student_name, student_id, team_name, participation_mode, time_invested, contribution_areas, task_completion, evidence_status, team_communication, participation_balance, next_task_clarity, work_status, discussion_focus, detail_note, created_at, updated_at",
      columns: [
        ["student_name", "Name"], ["student_id", "Student ID"], ["team_name", "Team"],
        ["participation_mode", "Participation"], ["time_invested", "Time invested"],
        ["contribution_areas", "Contribution areas"], ["task_completion", "Task completion"],
        ["evidence_status", "Evidence"], ["team_communication", "Communication"],
        ["participation_balance", "Participation balance"], ["next_task_clarity", "Next task"],
        ["work_status", "Work status"], ["discussion_focus", "Monday focus"],
        ["detail_note", "Details"], ["created_at", "Created"], ["updated_at", "Updated"],
      ],
      editable: [
        ["student_name", "Name", "text", 100], ["student_id", "Student ID", "text", 40],
        ["team_name", "Team", "team", 0], ["detail_note", "Details", "textarea", 200],
      ],
    },
    {
      table: "poster_reviews",
      label: "Poster reviews",
      title: "Poster Peer Review records",
      description:
        "Review peer ratings, strongest points and the highest-priority feedback.",
      select:
        "id, reviewer_name, reviewer_student_id, reviewer_team, reviewed_team, problem_clarity, working_product, evidence_testing, document_readiness, presentation_quality, strongest_part, highest_priority, additional_feedback, created_at, updated_at",
      columns: [
        ["reviewer_name", "Reviewer"],
        ["reviewer_student_id", "Student ID"],
        ["reviewer_team", "Reviewer team"],
        ["reviewed_team", "Reviewed team"],
        ["problem_clarity", "Problem clarity"],
        ["working_product", "Working product"],
        ["evidence_testing", "Evidence & testing"],
        ["document_readiness", "Document readiness"],
        ["presentation_quality", "Explanation quality"],
        ["strongest_part", "Strongest part"],
        ["highest_priority", "Highest priority"],
        ["additional_feedback", "Additional feedback"],
        ["created_at", "Created"],
        ["updated_at", "Updated"],
      ],
      editable: [
        ["reviewer_name", "Reviewer", "text", 100],
        ["reviewer_student_id", "Student ID", "text", 40],
        ["reviewer_team", "Reviewer team", "team", 0],
        ["reviewed_team", "Reviewed team", "team", 0],
        ["problem_clarity", "Problem clarity", "rating", 0],
        ["working_product", "Working product", "rating", 0],
        ["evidence_testing", "Evidence & testing", "rating", 0],
        ["document_readiness", "Document readiness", "rating", 0],
        ["presentation_quality", "Explanation quality", "rating", 0],
        ["strongest_part", "Strongest part", "textarea", 1000],
        ["highest_priority", "Highest priority", "textarea", 1000],
        ["additional_feedback", "Additional feedback", "textarea", 2000],
      ],
    },
  ] as const;
  type ActivityTable = (typeof activityTables)[number]["table"];
  type ActivityRecord = { id: string } & Record<string, unknown>;
  const [sessionUser, setSessionUser] = useState<{
    email: string;
    isTeacher: boolean;
  } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [dataStatus, setDataStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [dataMessage, setDataMessage] = useState("");
  const [counts, setCounts] = useState<Record<string, number | null>>(
    Object.fromEntries(activityTables.map(({ table }) => [table, null])),
  );
  const [activeTable, setActiveTable] =
    useState<ActivityTable>("student_checkins");
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [editRecord, setEditRecord] = useState<ActivityRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<ActivityRecord | null>(null);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [mutationMessage, setMutationMessage] = useState("");
  const [peerReviewOpen, setPeerReviewOpen] = useState<boolean | null>(null);
  const [peerReviewBusy, setPeerReviewBusy] = useState(false);
  const [peerReviewMessage, setPeerReviewMessage] = useState("");
  const requestSequence = useRef(0);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setSessionUser(
        session?.user.email
          ? {
              email: session.user.email,
              isTeacher: session.user.app_metadata.role === "teacher",
            }
          : null,
      );
      setAuthChecking(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setSessionUser(
        session?.user.email
          ? {
              email: session.user.email,
              isTeacher: session.user.app_metadata.role === "teacher",
            }
          : null,
      );
      setAuthChecking(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (sessionUser?.isTeacher) {
      void loadDashboard();
      void loadPeerReviewSetting();
    } else {
      setDataStatus("idle");
      setDataMessage("");
      setRecords([]);
      setCounts(
        Object.fromEntries(activityTables.map(({ table }) => [table, null])),
      );
      setPeerReviewOpen(null);
      setPeerReviewMessage("");
    }
  }, [sessionUser?.email, sessionUser?.isTeacher]);

  async function loadPeerReviewSetting() {
    setPeerReviewMessage("");
    const { data, error } = await supabase
      .from("activity_settings")
      .select("is_open")
      .eq("setting_key", "poster_peer_review")
      .single();
    if (error) {
      setPeerReviewOpen(null);
      setPeerReviewMessage(
        "Peer Review control could not be loaded. Confirm the Phase 4 migration has been applied.",
      );
      return;
    }
    setPeerReviewOpen(Boolean(data.is_open));
  }

  async function setPeerReviewState(nextOpen: boolean) {
    setPeerReviewBusy(true);
    setPeerReviewMessage("");
    const { data, error } = await supabase
      .from("activity_settings")
      .update({ is_open: nextOpen })
      .eq("setting_key", "poster_peer_review")
      .select("is_open")
      .single();
    setPeerReviewBusy(false);
    if (error) {
      setPeerReviewMessage(
        "Peer Review could not be changed. Confirm this account has the teacher role and try again.",
      );
      return;
    }
    setPeerReviewOpen(Boolean(data.is_open));
    setPeerReviewMessage(
      data.is_open
        ? "Peer Review is now open for student submissions."
        : "Peer Review is now closed. Existing reviews are unchanged.",
    );
  }

  async function login(e: any) {
    e.preventDefault();
    setAuthBusy(true);
    setAuthMessage("");
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    setAuthBusy(false);
    if (error) {
      setAuthMessage(
        "Sign-in failed. Check your teacher email and password, then try again.",
      );
      return;
    }
  }

  async function loadDashboard(table: ActivityTable = activeTable) {
    const requestId = ++requestSequence.current;
    setDataStatus("loading");
    setDataMessage("");
    setRecords([]);
    const activity = activityTables.find((item) => item.table === table)!;
    const activityClient = supabase as unknown as {
      from: (tableName: string) => {
        select: (columns: string) => {
          order: (
            column: string,
            options: { ascending: boolean },
          ) => Promise<{
            data: ActivityRecord[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    const [recordResult, ...countResults] = await Promise.all([
      activityClient
        .from(table)
        .select(activity.select)
        .order("created_at", { ascending: false }),
      ...activityTables.map(({ table: countTable }) =>
        supabase.from(countTable).select("*", { count: "exact", head: true }),
      ),
    ]);
    const firstError =
      recordResult.error ||
      countResults.find((result) => result.error)?.error;
    if (requestId !== requestSequence.current) return;
    if (firstError) {
      setDataStatus("error");
      setDataMessage(
        "Dashboard data could not be loaded. Confirm this account has the teacher role, then retry. If the problem continues, contact the course administrator.",
      );
      return;
    }
    setRecords((recordResult.data ?? []) as ActivityRecord[]);
    setCounts(
      Object.fromEntries(
        activityTables.map(({ table }, index) => [
          table,
          countResults[index].count ?? 0,
        ]),
      ),
    );
    setDataStatus("success");
  }

  async function signOut() {
    setAuthBusy(true);
    setAuthMessage("");
    const { error } = await supabase.auth.signOut();
    setAuthBusy(false);
    if (error) {
      setAuthMessage(
        "We could not sign you out. Refresh the page and try again.",
      );
    }
  }

  function mutationError(code?: string) {
    if (code === "23505")
      return "That change conflicts with an existing submission. Check the Student ID, team or reviewer details.";
    if (code === "23514")
      return "One or more values are outside the allowed range. Check the team, rating and text fields.";
    if (code === "42501")
      return "This account is not authorised to change activity records.";
    return "The record could not be changed. Check the values and try again.";
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editRecord || activeTable === "week1_pulse") return;
    setMutationBusy(true);
    setMutationMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const payload = Object.fromEntries(
      activeActivity.editable.map(([field, , type]) => [
        field,
        type === "rating" ? Number(values[field]) : String(values[field] ?? "").trim() || null,
      ]),
    );
    const { error } = await supabase
      .from(activeTable)
      .update(payload)
      .eq("id", editRecord.id);
    setMutationBusy(false);
    if (error) {
      setMutationMessage(mutationError(error.code));
      return;
    }
    setEditRecord(null);
    await loadDashboard(activeTable);
  }

  async function confirmDelete() {
    if (!deleteRecord || activeTable === "week1_pulse") return;
    setMutationBusy(true);
    setMutationMessage("");
    const { error } = await supabase
      .from(activeTable)
      .delete()
      .eq("id", deleteRecord.id);
    setMutationBusy(false);
    if (error) {
      setMutationMessage(mutationError(error.code));
      return;
    }
    setDeleteRecord(null);
    await loadDashboard(activeTable);
  }

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  const activeActivity = activityTables.find(
    (activity) => activity.table === activeTable,
  )!;
  const ratingFields = new Set([
    "confidence",
    "problem_clarity",
    "working_product",
    "evidence_testing",
    "document_readiness",
    "presentation_quality",
  ]);
  const formatValue = (field: string, value: unknown) => {
    if (value === null || value === undefined || value === "")
      return "Not provided";
    if ((field === "created_at" || field === "updated_at") && typeof value === "string")
      return (
        <time dateTime={value}>{formatDateTime(value)}</time>
      );
    if (ratingFields.has(field)) return `${String(value)} / 5`;
    return String(value);
  };
  const csvCell = (value: unknown) => {
    if (value === null || value === undefined) return "";
    let text = String(value);
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const exportCsv = () => {
    if (dataStatus !== "success" || records.length === 0)
      return;

    let headings: string[];
    let rows: unknown[][];
    if (activeTable === "week1_pulse") {
      headings = ["Category", "Response", "Count", "Percentage"];
      rows = pulseGroups.flatMap(({ title, field, options }) =>
        options.map(([value, label]) => {
          const count = pulseCount(field, value);
          return [
            title,
            label,
            count,
            Math.round((count / records.length) * 100),
          ];
        }),
      );
    } else {
      headings = activeActivity.columns.map(([, label]) => label);
      rows = records.map((record) =>
        activeActivity.columns.map(([field]) => record[field] ?? ""),
      );
    }

    const csv = [
      headings.map(csvCell).join(","),
      ...rows.map((row) => row.map(csvCell).join(",")),
    ].join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `nit3004-${activeTable.replace(/_/g, "-")}-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  const pulseGroups = [
    {
      title: "Delivery confidence",
      field: "confidence",
      options: [
        ["1", "Not confident yet"],
        ["2", "Slightly confident"],
        ["3", "Moderately confident"],
        ["4", "Confident"],
        ["5", "Very confident"],
      ],
    },
    {
      title: "Main concern",
      field: "concern",
      options: [
        ["Working product", "Working product"],
        ["Documentation", "Documentation"],
        ["Presentation", "Presentation"],
        ["Teamwork", "Teamwork"],
        ["Testing", "Testing"],
        ["Time", "Time"],
      ],
    },
    {
      title: "AI usage",
      field: "ai_usage",
      options: [
        ["Rarely", "Rarely"],
        ["Weekly", "Weekly"],
        ["Daily", "Daily"],
        ["It is part of almost every task", "Almost every task"],
      ],
    },
  ] as const;
  const pulseCount = (field: string, value: string) =>
    records.filter((record) => String(record[field]) === value).length;

  const teamTemperatures =
    activeTable === "team_health_checks"
      ? teams.map((team) => {
          const teamRecords = records.filter((record) => record.team_name === team);
          const severe = teamRecords.some((record) =>
            record.delivery_status === "Blocked" ||
            record.teacher_support === "Yes" ||
            record.communication === "Not yet" ||
            record.voice === "No"
          );
          const concern = teamRecords.some((record) =>
            record.delivery_status === "Some risk" ||
            record.teacher_support === "Maybe" ||
            record.role_clarity === "Not clear" ||
            record.participation_balance === "Significant difference"
          );
          const level = teamRecords.length < 2 ? "insufficient" : severe ? "cold" : concern ? "cool" : "warm";
          const label = level === "warm" ? "Warm" : level === "cool" ? "Cool" : level === "cold" ? "Cold" : "Insufficient data";
          return { team, count: teamRecords.length, level, label };
        })
      : [];

  if (authChecking)
    return (
      <main className="admin-login">
        <div className="admin-session-check" role="status" aria-live="polite">
          <RefreshCw className="spin" aria-hidden="true" />
          <b>Restoring teacher session…</b>
          <span>Please wait while secure access is checked.</span>
        </div>
      </main>
    );

  if (!sessionUser)
    return (
      <main className="admin-login">
        <form onSubmit={login}>
          <div className="eyebrow">Protected area</div>
          <h1>Teacher Dashboard</h1>
          <label>
            Email
            <input type="email" name="email" required />
          </label>
          <label>
            Password
            <input type="password" name="password" required />
          </label>
          {authMessage && (
            <p className="admin-alert error" role="alert">
              {authMessage}
            </p>
          )}
          <button disabled={authBusy}>
            {authBusy ? "Signing in…" : "Sign in"}
          </button>
          <a href="/">Back to portal</a>
        </form>
      </main>
    );

  if (!sessionUser.isTeacher)
    return (
      <main className="admin-login">
        <div className="admin-session-check error" role="alert">
          <b>Teacher access required</b>
          <span>
            {sessionUser.email} is signed in, but this account does not have
            the teacher role. No student records have been loaded.
          </span>
          <button
            className="secondary"
            type="button"
            onClick={signOut}
            disabled={authBusy}
          >
            <LogOut size={17} />
            {authBusy ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </main>
    );

  return (
    <main className="admin">
      <div className="admin-heading">
        <Head label="NIT3004" title="Teacher Dashboard" />
        <div className="admin-session">
          <span>
            Signed in as <b>{sessionUser.email}</b>
          </span>
          <button
            className="secondary"
            type="button"
            onClick={signOut}
            disabled={authBusy}
          >
            <LogOut size={17} />
            {authBusy ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
      {authMessage && (
        <p className="admin-alert error" role="alert">
          {authMessage}
        </p>
      )}
      <section className="activity-control" aria-labelledby="peer-review-control-title">
        <div>
          <div className="eyebrow">Week 3 activity</div>
          <h2 id="peer-review-control-title">Poster Peer Review</h2>
          <p>
            Open or close new student submissions. Existing review records are
            not changed.
          </p>
        </div>
        <div className="activity-control-action">
          <span
            className={`activity-control-status ${
              peerReviewOpen ? "open" : "closed"
            }`}
          >
            {peerReviewOpen === null
              ? "Status unavailable"
              : peerReviewOpen
                ? "Open"
                : "Closed"}
          </span>
          <button
            type="button"
            className={peerReviewOpen ? "danger" : "primary"}
            disabled={peerReviewBusy || peerReviewOpen === null}
            onClick={() => void setPeerReviewState(!peerReviewOpen)}
          >
            {peerReviewBusy
              ? "Updating…"
              : peerReviewOpen
                ? "Close peer review"
                : "Open peer review"}
          </button>
        </div>
        {peerReviewMessage && (
          <p
            className={`activity-control-message ${
              peerReviewOpen === null ? "error" : ""
            }`}
            role={peerReviewOpen === null ? "alert" : "status"}
            aria-live="polite"
          >
            {peerReviewMessage}
          </p>
        )}
      </section>
      <div className="metric-grid" aria-label="Activity record views">
        {activityTables.map(({ table, label }) => (
          <button
            key={table}
            type="button"
            className={activeTable === table ? "active" : ""}
            aria-pressed={activeTable === table}
            onClick={() => {
              if (table === activeTable) return;
              setActiveTable(table);
              void loadDashboard(table);
            }}
          >
            <b>{counts[table] ?? "—"}</b>
            <span>{label}</span>
          </button>
        ))}
      </div>
      <section className="admin-records" aria-labelledby="activity-heading">
        <div className="admin-records-heading">
          <div>
            <div className="eyebrow">Activity records</div>
            <h2 id="activity-heading">{activeActivity.title}</h2>
            <p>{activeActivity.description}</p>
            {activeTable !== "week1_pulse" && (
              <p className="admin-management-note">
                Teachers can correct invalid details or remove a test submission.
              </p>
            )}
          </div>
          <div className="admin-record-actions">
            <button
              className="secondary"
              type="button"
              onClick={exportCsv}
              disabled={dataStatus !== "success" || records.length === 0}
              title={
                records.length === 0
                  ? "There are no records to export"
                  : `Export ${activeActivity.label} as CSV`
              }
            >
              <Download size={17} />
              Export CSV
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() => void loadDashboard()}
              disabled={dataStatus === "loading"}
            >
              <RefreshCw
                size={17}
                className={dataStatus === "loading" ? "spin" : ""}
              />
              {dataStatus === "loading" ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
        {dataStatus === "loading" && (
          <div className="admin-state" role="status" aria-live="polite">
            <RefreshCw className="spin" aria-hidden="true" />
            <b>Loading {activeActivity.label}…</b>
            <span>Counts and the selected activity records are being refreshed.</span>
          </div>
        )}
        {dataStatus === "error" && (
          <div className="admin-state error" role="alert">
            <b>Unable to load teacher data</b>
            <span>{dataMessage}</span>
            <button
              type="button"
              className="secondary"
              onClick={() => void loadDashboard()}
            >
              Try again
            </button>
          </div>
        )}
        {dataStatus === "success" && activeTable === "team_health_checks" && records.length > 0 && (
          <div className="temperature-grid" aria-label="Team participation temperature">
            {teamTemperatures.map(({ team, count, level, label }) => (
              <article className={`temperature-card ${level}`} key={team}>
                <div className="thermometer" aria-hidden="true"><span /></div>
                <div><b>{team}</b><strong>{label}</strong><small>{count} student {count === 1 ? "response" : "responses"}</small></div>
              </article>
            ))}
            <p className="temperature-note">Participation temperature is a descriptive teaching signal only. It is not a performance score or assessment result.</p>
          </div>
        )}
        {dataStatus === "success" && records.length === 0 && (
          <div className="admin-state" role="status">
            <b>No {activeActivity.label} records yet</b>
            <span>
              Valid {activeActivity.label.toLowerCase()} submissions will appear
              here.
            </span>
          </div>
        )}
        {dataStatus === "success" &&
          records.length > 0 &&
          activeTable === "week1_pulse" && (
            <div className="pulse-overview">
              <p className="pulse-privacy-note">
                Anonymous overview · individual submissions and timestamps are
                intentionally hidden.
              </p>
              <div className="pulse-chart-grid">
                {pulseGroups.map(({ title, field, options }) => (
                  <section key={field} className="pulse-chart">
                    <h3>{title}</h3>
                    {options.map(([value, label]) => {
                      const count = pulseCount(field, value);
                      const percentage = Math.round(
                        (count / records.length) * 100,
                      );
                      return (
                        <div className="pulse-bar-row" key={value}>
                          <div className="pulse-bar-label">
                            <span>{label}</span>
                            <b>
                              {count} · {percentage}%
                            </b>
                          </div>
                          <div
                            className="pulse-bar-track"
                            role="img"
                            aria-label={`${label}: ${count} responses, ${percentage}%`}
                          >
                            <span style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </section>
                ))}
              </div>
            </div>
          )}
        {dataStatus === "success" &&
          records.length > 0 &&
          activeTable !== "week1_pulse" && (
          <div className="admin-table-wrap">
            <table>
              <caption>
                {records.length} {activeActivity.label}{" "}
                {records.length === 1 ? "record" : "records"}, newest first
              </caption>
              <thead>
                <tr>
                  {activeActivity.columns.map(([field, label]) => (
                    <th key={field} scope="col">
                      {label}
                    </th>
                  ))}
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    {activeActivity.columns.map(([field, label]) => (
                      <td
                        key={field}
                        data-label={label}
                        className={
                          typeof record[field] === "string" &&
                          String(record[field]).length > 80
                            ? "long-text-cell"
                            : undefined
                        }
                      >
                        {formatValue(field, record[field])}
                      </td>
                    ))}
                    <td className="admin-row-actions" data-label="Actions">
                      <button
                        type="button"
                        className="secondary compact"
                        onClick={() => {
                          setMutationMessage("");
                          setEditRecord(record);
                        }}
                      >
                        <Pencil size={15} /> Edit
                      </button>
                      <button
                        type="button"
                        className="danger compact"
                        onClick={() => {
                          setMutationMessage("");
                          setDeleteRecord(record);
                        }}
                      >
                        <Trash2 size={15} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {editRecord && (
        <div className="modal" role="presentation">
          <div className="dialog admin-action-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-record-title">
            <button className="close" onClick={() => setEditRecord(null)} aria-label="Close edit form">×</button>
            <div className="eyebrow">Teacher action</div>
            <h2 id="edit-record-title">Edit {activeActivity.label}</h2>
            <form onSubmit={saveRecord}>
              {activeActivity.editable.map(([field, label, type, maxLength]) => (
                <label key={field}>
                  {label}
                  {type === "team" ? (
                    <select name={field} defaultValue={String(editRecord[field] ?? "")} required>
                      {teams.map((team) => <option key={team}>{team}</option>)}
                    </select>
                  ) : type === "rating" ? (
                    <select name={field} defaultValue={String(editRecord[field] ?? "")} required>
                      {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}
                    </select>
                  ) : type === "textarea" ? (
                    <textarea name={field} defaultValue={String(editRecord[field] ?? "")} maxLength={maxLength} required={field !== "additional_feedback"} />
                  ) : (
                    <input name={field} defaultValue={String(editRecord[field] ?? "")} maxLength={maxLength} required={field !== "submitted_by"} />
                  )}
                </label>
              ))}
              {mutationMessage && <p className="admin-alert error" role="alert">{mutationMessage}</p>}
              <div className="admin-dialog-actions">
                <button type="button" className="secondary" onClick={() => setEditRecord(null)} disabled={mutationBusy}>Cancel</button>
                <button disabled={mutationBusy}>{mutationBusy ? "Saving…" : "Save changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteRecord && (
        <div className="modal" role="presentation">
          <div className="dialog admin-action-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-record-title">
            <div className="eyebrow">Teacher action</div>
            <h2 id="delete-record-title">Delete this record?</h2>
            <p>This permanently removes the selected {activeActivity.label.toLowerCase()} record. This action cannot be undone.</p>
            <dl className="delete-summary">
              {activeActivity.columns.slice(0, 3).map(([field, label]) => (
                <div key={field}><dt>{label}</dt><dd>{formatValue(field, deleteRecord[field])}</dd></div>
              ))}
            </dl>
            {mutationMessage && <p className="admin-alert error" role="alert">{mutationMessage}</p>}
            <div className="admin-dialog-actions">
              <button type="button" className="secondary" onClick={() => setDeleteRecord(null)} disabled={mutationBusy}>Cancel</button>
              <button type="button" className="danger" onClick={confirmDelete} disabled={mutationBusy}>
                <Trash2 size={16} /> {mutationBusy ? "Deleting…" : "Delete record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {location.pathname.startsWith("/admin") ? <Admin /> : <App />}
  </StrictMode>,
);
