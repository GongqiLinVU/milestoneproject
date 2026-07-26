import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  FileText,
  Presentation,
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
        <Expo open={setForm} />
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
function Expo({ open }: { open: (k: Kind) => void }) {
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
          <button className="primary" onClick={() => open("review")}>
            Open peer review
          </button>
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

function Modal({ kind, close }: { kind: Kind | null; close: () => void }) {
  const [msg, setMsg] = useState("");
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    setMsg("");
    setSubmitted(false);
  }, [kind]);
  if (!kind) return null;
  const activeKind = kind;
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
      if (localStorage.getItem(storageKey)) {
        setSubmitted(true);
        setMsg("This response was already submitted from this browser.");
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
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, new Date().toISOString());
      } catch {
        // A successful database submission must not fail because storage is unavailable.
      }
    }
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
        <form onSubmit={submit}>
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
  const [user, setUser] = useState(false),
    [msg, setMsg] = useState(""),
    [counts, setCounts] = useState<Record<string, number>>({});
  async function login(e: any) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    if (error) {
      setMsg(error.message);
      return;
    }
    setUser(true);
    for (const t of [
      "student_checkins",
      "week1_pulse",
      "team_conversations",
      "student_promises",
      "poster_reviews",
    ]) {
      const { count } = await supabase
        .from(t)
        .select("*", { count: "exact", head: true });
      setCounts((c) => ({ ...c, [t]: count || 0 }));
    }
  }
  if (!user)
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
          <p>{msg}</p>
          <button>Sign in</button>
          <a href="/">Back to portal</a>
        </form>
      </main>
    );
  return (
    <main className="admin">
      <Head label="NIT3004" title="Teacher Dashboard" />
      <div className="metric-grid">
        {Object.entries(counts).map(([k, v]) => (
          <div key={k}>
            <b>{v}</b>
            <span>{k.replaceAll("_", " ")}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {location.pathname.startsWith("/admin") ? <Admin /> : <App />}
  </StrictMode>,
);
