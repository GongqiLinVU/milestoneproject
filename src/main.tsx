import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  FileText,
  LogOut,
  Presentation,
  RefreshCw,
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
type Kind = "checkin" | "pulse" | "team" | "promise" | "review";
const titles: Record<Kind, string> = {
  checkin: "Week 1 Check-in",
  pulse: "Class Pulse",
  team: "Team Conversation",
  promise: "Four-Week Promise",
  review: "Poster Peer Review",
};
function App() {
  const [form, setForm] = useState<Kind | null>(null);
  const [live, setLive] = useState<boolean | null>(null);
  useEffect(() => {
    supabase
      .from("portal_health")
      .select("status")
      .limit(1)
      .then(({ error }) => setLive(!error));
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
        <Expo />
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
      "Align the team, understand the rules and make a four-week promise.",
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
          title="Team Conversation"
          text="What are you proud of, what could stop delivery, and where do you need support?"
          action={() => open("team")}
        />
        <Activity
          title="Four-Week Promise"
          text="Each student makes one practical commitment to their team."
          action={() => open("promise")}
        />
      </div>
      <blockquote>
        “I already know you can build software. For the next four weeks, I want
        to help you learn how to deliver software.”
      </blockquote>
    </section>
  );
}
function Expo() {
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
            disabled
            aria-describedby="peer-review-status"
          >
            Peer review opens in Week 3
          </button>
          <p id="peer-review-status" className="activity-status">
            This activity is not open yet.
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
  if (code === "23505") {
    if (kind === "team")
      return "Your team has already submitted this conversation.";
    if (kind === "promise" || kind === "checkin")
      return "This Student ID has already submitted a response.";
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
      : kind === "team"
        ? normalise(values.team)
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
    team: [
      { label: "Team", value: text("team") },
      { label: "What the team is proud of", value: text("proud") },
      { label: "Biggest delivery risk", value: text("risk") },
      { label: "Support needed", value: text("support") },
    ],
    promise: [
      { label: "Team", value: text("team") },
      { label: "Four-week promise", value: text("promise") },
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
      (activeKind === "team" && Boolean(values.team)) ||
      ((activeKind === "checkin" || activeKind === "promise") &&
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
    const v = Object.fromEntries(new FormData(e.currentTarget)) as Record<
      string,
      FormDataEntryValue
    >;
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
    if (activeKind === "team") {
      table = "team_conversations";
      payload = {
        team_name: v.team,
        proudest_achievement: v.proud,
        biggest_delivery_risk: v.risk,
        support_needed: v.support,
      };
    }
    if (activeKind === "promise") {
      table = "student_promises";
      payload = {
        student_name: v.name,
        student_id: v.sid,
        team_name: v.team,
        promise: v.promise,
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
const Team = ({ name = "team" }: { name?: string }) => (
  <label>
    Team
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
  if (k === "team")
    return (
      <>
        <p className="form-note">
          Submit one shared response per team after discussing these questions
          together.
        </p>
        <Team />
        <Text label="What are you proud of?" name="proud" maxLength={1200} />
        <Text label="Biggest delivery risk" name="risk" maxLength={1200} />
        <Text label="Support needed" name="support" maxLength={1200} />
      </>
    );
  if (k === "promise")
    return (
      <>
        <p className="form-note">
          Submit your own individual commitment to your team.
        </p>
        <Identity />
        <Text label="My four-week promise" name="promise" maxLength={1000} />
      </>
    );
  return (
    <>
      <label>
        Reviewer name
        <input name="name" required maxLength={100} />
      </label>
      <label>
        Student ID
        <input name="sid" required minLength={3} maxLength={40} />
      </label>
      <Team name="reviewer_team" />
      <Team name="reviewed_team" />
      {[
        ["Problem clarity", "problem"],
        ["Working product", "product"],
        ["Evidence & testing", "evidence"],
        ["Document readiness", "docs"],
        ["Explanation quality", "explanation"],
      ].map(([label, name]) => (
        <Rating key={name} label={label} name={name} />
      ))}
      <Text label="Strongest part" name="strongest" maxLength={1000} />
      <Text
        label="Highest priority before Demo Day"
        name="priority"
        maxLength={1000}
      />
    </>
  );
}
function Admin() {
  const activityTables = [
    ["student_checkins", "Student check-ins"],
    ["week1_pulse", "Class pulse"],
    ["team_conversations", "Team conversations"],
    ["student_promises", "Four-week promises"],
    ["poster_reviews", "Poster reviews"],
  ] as const;
  type Checkin = {
    id: string;
    student_name: string | null;
    student_id: string;
    team_name: string;
    goal: string | null;
    created_at: string;
    updated_at: string;
  };
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
    Object.fromEntries(activityTables.map(([table]) => [table, null])),
  );
  const [checkins, setCheckins] = useState<Checkin[]>([]);

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
    } else {
      setDataStatus("idle");
      setDataMessage("");
      setCheckins([]);
      setCounts(
        Object.fromEntries(activityTables.map(([table]) => [table, null])),
      );
    }
  }, [sessionUser?.email, sessionUser?.isTeacher]);

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

  async function loadDashboard() {
    setDataStatus("loading");
    setDataMessage("");
    const [checkinResult, ...countResults] = await Promise.all([
      supabase
        .from("student_checkins")
        .select(
          "id, student_name, student_id, team_name, goal, created_at, updated_at",
        )
        .order("created_at", { ascending: false }),
      ...activityTables.map(([table]) =>
        supabase.from(table).select("*", { count: "exact", head: true }),
      ),
    ]);
    const firstError =
      checkinResult.error ||
      countResults.find((result) => result.error)?.error;
    if (firstError) {
      setDataStatus("error");
      setDataMessage(
        "Dashboard data could not be loaded. Confirm this account has the teacher role, then retry. If the problem continues, contact the course administrator.",
      );
      return;
    }
    setCheckins((checkinResult.data ?? []) as Checkin[]);
    setCounts(
      Object.fromEntries(
        activityTables.map(([table], index) => [
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

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });

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
      <div className="metric-grid">
        {activityTables.map(([table, label]) => (
          <div key={table}>
            <b>{counts[table] ?? "—"}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <section className="admin-records" aria-labelledby="checkins-heading">
        <div className="admin-records-heading">
          <div>
            <div className="eyebrow">Week 1 activity</div>
            <h2 id="checkins-heading">Student Check-in records</h2>
            <p>
              Review each student’s team and intended four-week outcome.
            </p>
          </div>
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
        {dataStatus === "loading" && (
          <div className="admin-state" role="status" aria-live="polite">
            <RefreshCw className="spin" aria-hidden="true" />
            <b>Loading dashboard records…</b>
            <span>Counts and Check-in details are being refreshed.</span>
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
        {dataStatus === "success" && checkins.length === 0 && (
          <div className="admin-state" role="status">
            <b>No Check-in records yet</b>
            <span>
              Student Check-ins will appear here after the first valid
              submission.
            </span>
          </div>
        )}
        {dataStatus === "success" && checkins.length > 0 && (
          <div className="admin-table-wrap">
            <table>
              <caption>
                {checkins.length} Student Check-in{" "}
                {checkins.length === 1 ? "record" : "records"}, newest first
              </caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Student ID</th>
                  <th scope="col">Team</th>
                  <th scope="col">Four-week goal</th>
                  <th scope="col">Created</th>
                  <th scope="col">Updated</th>
                </tr>
              </thead>
              <tbody>
                {checkins.map((checkin) => (
                  <tr key={checkin.id}>
                    <td data-label="Name">
                      {checkin.student_name || "Not provided"}
                    </td>
                    <td data-label="Student ID">{checkin.student_id}</td>
                    <td data-label="Team">{checkin.team_name}</td>
                    <td data-label="Four-week goal" className="goal-cell">
                      {checkin.goal || "Not provided"}
                    </td>
                    <td data-label="Created">
                      <time dateTime={checkin.created_at}>
                        {formatDateTime(checkin.created_at)}
                      </time>
                    </td>
                    <td data-label="Updated">
                      <time dateTime={checkin.updated_at}>
                        {formatDateTime(checkin.updated_at)}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {location.pathname.startsWith("/admin") ? <Admin /> : <App />}
  </StrictMode>,
);
