import { StrictMode, useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowRight,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Code2,
  Download,
  FileText,
  HeartPulse,
  ListChecks,
  LogOut,
  Pencil,
  Presentation,
  RefreshCw,
  Rocket,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import "./styles.css";
import { ProjectManager, RosterManager } from "./TeamAllocation";
import { StudentAccess } from "./StudentAccess";
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ||
    "https://gwihaizxivclamzehupk.supabase.co",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_-RPm45eBd8_CVaNk4GbXhg_nxOkMrLr",
);
const teams = Array.from({ length: 8 }, (_, i) => `Team ${i + 1}`);
type Kind = "checkin" | "pulse" | "health" | "checkout" | "progress" | "checkout2" | "checkout3" | "checkout4" | "review";
type AiSuggestionStage = "starting" | "closing";
type AiDiscussionPath = {
  title: string;
  focus: string;
  question: string;
  evidence_check: string;
  teaching_spark: string;
};
type AiNextStep = {
  title: string;
  action: string;
};
type AiTeachingSuggestion = {
  signal: string;
  question_or_clarification: string;
  action_or_verification: string;
  teaching_message: string;
  what_changed_after_review: string;
  discussion_paths: AiDiscussionPath[];
  next_step_options: AiNextStep[];
};
const titles: Record<Kind, string> = {
  checkin: "Week 1 Check-in",
  pulse: "Class Pulse",
  health: "Team Health Check",
  checkout: "Week 1 Engagement Check-out",
  progress: "Week 2 Implementation Pre-check",
  checkout2: "Week 2 Engagement Check-out",
  checkout3: "Week 3 Engagement Check-out",
  checkout4: "Week 4 Final Delivery Check",
  review: "Poster Peer Review",
};
function PublicLanding() {
  const [live, setLive] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.from("portal_health").select("status").limit(1).then(({ error }) => setLive(!error));
  }, []);
  return <>
    <header>
      <a className="brand" href="#top">NIT3004 <span>Engineering Studio</span></a>
      <nav><a href="#journey">Journey</a><a href="#deliverables">Deliverables</a><a href="/student">Student Login</a><a href="/admin">Teacher</a></nav>
    </header>
    <main id="top">
      <section className="hero">
        <div>
          <div className="eyebrow">Applied Project II · Four-week delivery studio</div>
          <h1>Build less.<br/>Deliver <em>better.</em></h1>
          <p>Course information stays open to everyone. Students can log in at any time to view their project, weekly activities and attendance. Session Check-in appears only when your teacher opens a studio session.</p>
          <div className="actions">
            <a className="primary" href="/student">Student Login <ArrowRight size={18}/></a>
            <a className="secondary" href="#journey">Explore the journey</a>
          </div>
          <div className={"status " + (live ? "ok" : "")}><span></span>{live === null ? "Checking live data…" : live ? "Live data connected" : "Database setup required"}</div>
        </div>
        <div className="hero-card"><b>4 Weeks</b><span>1 Mission</span><span>1 Product</span><span>1 Team</span><small>∞ possibilities</small></div>
      </section>
      <Journey/><Studio/><Deliverables/>
    </main>
    <footer>NIT3004 Engineering Studio · Learn to deliver like an engineer.</footer>
  </>;
}

type AuthenticatedStudent = {
  studentId: string; studentName: string; blockId: string; blockLabel: string; teamName: string; projectName: string | null;
  projectProblem: string | null; projectDescription: string | null; projectTargetUsers: string | null;
  projectExpectedOutcomes: string | null; projectCategory: string | null; projectDifficulty: string | null;
  projectSource: "catalogue" | "roster" | "none";
  studioSession?: { sessionId: string; title: string; sessionDate: string; checkedInAt: string | null } | null;
  checkInToSession?: () => Promise<void>;
  sessionCheckinBusy?: boolean;
};
type StudentSessionRecord = { sessionId: string; title: string; sessionDate: string; startsAt: string | null; endsAt: string | null; checkedInAt: string | null; status: string };

function StudentSessions() {
  const [sessions, setSessions] = useState<StudentSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const { data, error: historyError } = await supabase.rpc("get_my_session_history");
      if (!active) return;
      if (historyError) {
        setError("Attendance history could not be loaded. Please refresh or tell your teacher.");
      } else {
        setSessions((data as StudentSessionRecord[] | null) || []);
        setError("");
      }
      setLoading(false);
    };
    const handleVisibility = () => document.visibilityState === "visible" && void refresh();
    void refresh();
    window.addEventListener("student-session-checkin", refresh);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      active = false;
      window.removeEventListener("student-session-checkin", refresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);
  return <section id="sessions" className="portal-panel portal-section student-sessions">
    <Head label="Sessions" title="Your attendance history." text="This is the same attendance record your teacher sees. Check-in is available only while the current session is open."/>
    {loading ? <p className="empty-state">Loading sessions…</p> : error ? <p className="empty-state error-state" role="alert">{error}</p> : sessions.length ? <div className="attendance-history">
      {sessions.map(item => <article key={item.sessionId}><div><b>{item.title}</b><span>{new Date(`${item.sessionDate}T00:00:00`).toLocaleDateString()}</span></div>{item.checkedInAt ? <strong>Checked in · {new Date(item.checkedInAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</strong> : <span>Not checked in</span>}</article>)}
    </div> : <p className="empty-state">No sessions have been prepared for this block yet.</p>}
  </section>;
}
function StudentPortal({ student }: { student: AuthenticatedStudent }) {
  const [form, setForm] = useState<Kind | null>(null);
  const [weekStates, setWeekStates] = useState<Record<number, boolean> | null>(null);
  useEffect(() => {
    supabase.rpc("get_my_weekly_activity_states").then(({ data, error }) => {
      if (error) return setWeekStates({});
      setWeekStates(Object.fromEntries(((data as Array<{ weekNumber: number; isOpen: boolean }>) || []).map(item => [item.weekNumber, item.isOpen])));
    });
  }, [student.blockId]);
  return (
    <>
      <header>
        <a className="brand" href="/">
          NIT3004 <span>Engineering Studio</span>
        </a>
        <nav>
          <a href="#weekly">This Week</a>
          <a href="#my-project">My Project</a>
          <a href="#sessions">Sessions</a>
          <a href="#get-help">Get Help</a>
        </nav>
      </header>
      <main id="top" className="student-portal-main">
        <section className="portal-intro">
          <div className="eyebrow">Authenticated student portal</div>
          <div className="portal-title-row">
            <h1>This Week</h1>
            {student.studioSession && (
              student.studioSession.checkedInAt
                ? <a className="nav-session-status complete" href="#sessions" aria-label={`${student.studioSession.title}, checked in`}><CheckCircle2 size={16}/><span>{student.studioSession.title}</span><b>Checked in</b></a>
                : <button className="nav-session-status attention" disabled={student.sessionCheckinBusy} onClick={() => void student.checkInToSession?.()} aria-label={`Check in to ${student.studioSession.title}`}><span>{student.studioSession.title}</span><b>{student.sessionCheckinBusy ? "Checking in…" : "Check in"}</b></button>
            )}
          </div>
          <p>{student.blockLabel} · Complete only the activity that matters now.</p>
        </section>
        <div className="portal-section portal-weekly-section"><WeeklyHub
          open={setForm}
          weekStates={weekStates}
        /></div>
        <section id="my-project" className="portal-panel portal-section"><Head label="My Project" title={student.projectName || "Project not assigned"} text={student.projectDescription || (student.projectSource === "roster" ? "This project name came from the roster but is not yet linked to the Project Catalogue. Ask your teacher to complete the team assignment." : "Your teacher has not assigned a catalogue project to this team yet.")}/>
          <div className="student-project-summary"><div><span>Student</span><b>{student.studentName}</b><small>{student.studentId}</small></div><div><span>Team</span><b>{student.teamName}</b><small>Roster assignment</small></div><div><span>Project</span><b>{student.projectName || "Pending"}</b><small>{student.projectCategory || "Catalogue assignment pending"}{student.projectDifficulty ? ` · ${student.projectDifficulty}` : ""}</small></div></div>
          {student.projectSource === "catalogue" && <div className="project-detail-grid"><article><span>Problem</span><p>{student.projectProblem || "Not specified"}</p></article><article><span>Target users</span><p>{student.projectTargetUsers || "Not specified"}</p></article><article className="wide"><span>Expected outcomes</span><p>{student.projectExpectedOutcomes || "Not specified"}</p></article></div>}
        </section>
        <StudentSessions/>
        <section id="get-help" className="portal-panel portal-section"><Head label="Get Help" title="Bring one clear question." text="Use the support choices inside the current weekly activity so your teacher can connect help to the right evidence and session."/></section>
      </main>
      <footer>
        NIT3004 Engineering Studio · Student Portal
      </footer>
      <Modal
        key={form ?? "closed"}
        kind={form}
        blockId={student.blockId}
        blockLabel={student.blockLabel}
        student={student}
        close={() => setForm(null)}
      />
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
    <section id="journey" className="journey-collapsible">
      <details>
        <summary>
          <div>
            <span>Course journey · Four-week overview</span>
            <h2>Commit. Prove. Validate. Deliver.</h2>
          </div>
          <span className="journey-expand">
            <span>View journey</span>
            <ChevronDown aria-hidden="true" />
          </span>
        </summary>
        <div className="journey-content">
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
        </div>
      </details>
    </section>
  );
}
function Studio() {
  return (
    <section className="dark studio-collapsible">
      <details>
        <summary>
          <div>
            <span>Monday Studio · First session guide</span>
            <h2>The one session every team protects.</h2>
          </div>
          <span className="studio-expand">
            <span>View session guide</span>
            <ChevronDown aria-hidden="true" />
          </span>
        </summary>
        <div className="studio-content">
          <p className="studio-flow">
            Industry story → team stand-up → design review → workshop → checkpoint → next mission.
          </p>
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
        </div>
      </details>
    </section>
  );
}
function WeeklyHub({
  open,
  weekStates,
}: {
  open: (k: Kind) => void;
  weekStates: Record<number, boolean> | null;
}) {
  const [week, setWeek] = useState<1 | 2 | 3 | 4>(1);
  const tabs = [
    { number: 1 as const, label: "Start", hint: "Connect & align" },
    { number: 2 as const, label: "Prove", hint: "Show implementation" },
    { number: 3 as const, label: "Validate", hint: "Review readiness" },
    { number: 4 as const, label: "Deliver", hint: "Prepare presentation" },
  ];
  return (
    <section id="weekly" className="weekly-hub">
      <Head
        label="Weekly Check-in"
        title="One place for every week."
        text="Choose your week to see the activities, evidence and preparation needed now."
      />
      <div className="week-tabs" role="tablist" aria-label="Weekly activities">
        {tabs.map((tab) => (
          <button
            key={tab.number}
            type="button"
            role="tab"
            aria-selected={week === tab.number}
            aria-controls={`week-panel-${tab.number}`}
            className={week === tab.number ? "active" : ""}
            onClick={() => setWeek(tab.number)}
          >
            <span>Week {tab.number}</span>
            <b>{tab.label}</b>
            <small>{tab.hint}</small>
          </button>
        ))}
      </div>

      <div id={`week-panel-${week}`} className={`week-panel week-${week} ${weekStates && !weekStates[week] ? "locked" : ""}`} role="tabpanel">
        {weekStates === null ? <p className="week-lock-notice">Checking weekly availability…</p> : !weekStates[week] ? <div className="week-lock-notice"><b>Week {week} is not active yet.</b><span>Your teacher will activate these activities when the class is ready.</span></div> : null}
        {week === 1 && (
          <>
            <div className="week-panel-intro">
              <div className="week-visual"><Rocket /></div>
              <div>
                <span>Week 1 · Studio Kickoff</span>
                <h3>Meet the team and establish a healthy start.</h3>
                <p>Three short touchpoints connect the compulsory Monday studio with the rest of your first week.</p>
              </div>
            </div>
            <div className="activity-grid">
              <Activity disabled={!weekStates?.[1]} icon={HeartPulse} badge="Individual view" title="Team Health Check" text="Reflect on communication, participation and delivery health." action={() => open("health")} />
              <Activity disabled={!weekStates?.[1]} icon={ClipboardCheck} badge="End of week" title="Week 1 Engagement Check-out" text="Record participation beyond Monday and prepare for the next conversation." action={() => open("checkout")} />
            </div>
          </>
        )}

        {week === 2 && (
          <>
            <div className="week-panel-intro">
              <div className="week-visual"><Code2 /></div>
              <div>
                <span>Week 2 · Implementation Review</span>
                <h3>Show one concrete contribution and prove it.</h3>
                <p>Prepare the implementation claim, location, demonstration and verification evidence for the compulsory Monday review.</p>
              </div>
            </div>
            <div className="activity-grid two-up">
              <Activity disabled={!weekStates?.[2]} icon={Code2} badge="Before Monday review" title="Implementation Pre-check" text="Identify one implementation, where it can be found, how it works and how you will verify it." action={() => open("progress")} />
              <Activity disabled={!weekStates?.[2]} icon={ClipboardCheck} badge="End of week" title="Week 2 Engagement Check-out" text="Record participation beyond Monday without repeating implementation evidence." action={() => open("checkout2")} />
            </div>
            <p className="week-panel-note">Pre-check responses prepare a verification conversation. They are descriptive evidence, not an automatic mark.</p>
          </>
        )}

        {week === 3 && (
          <>
            <div className="week-panel-intro">
              <div className="week-visual"><ListChecks /></div>
              <div>
                <span>Week 3 · Project Expo</span>
                <h3>Validate the product, evidence and document readiness.</h3>
                <p>Use peer review to find the highest-priority gap before Demo Day.</p>
              </div>
            </div>
            <Expo
              peerReviewOpen={Boolean(weekStates?.[3])}
              openReview={() => weekStates?.[3] && open("review")}
            />
            <div className="activity-grid">
              <Activity disabled={!weekStates?.[3]} icon={ClipboardCheck} badge="End of week" title="Week 3 Engagement Check-out" text="Record final-delivery participation, evidence readiness and any risk that needs attention before Demo Day." action={() => open("checkout3")} />
            </div>
          </>
        )}

        {week === 4 && (
          <>
            <div className="week-panel-intro">
              <div className="week-visual"><Rocket /></div>
              <div>
                <span>Week 4 · Demo Day</span>
                <h3>Prepare a calm, credible presentation.</h3>
                <p>This space is ready for the final presentation checklist and confirmed presentation order.</p>
              </div>
            </div>
            <div className="week4-placeholders">
              <article>
                <ListChecks />
                <div><span>Preparation</span><h3>Final Delivery Check</h3><p>Confirm presentation, demo fallback, speaking role and final submission readiness.</p></div>
                <button type="button" disabled={!weekStates?.[4]} onClick={() => open("checkout4")}>{weekStates?.[4] ? "Open activity" : "Locked"} {weekStates?.[4] && <ArrowRight size={16} />}</button>
              </article>
              <article>
                <Presentation />
                <div><span>Schedule</span><h3>Presentation Order</h3><p>The confirmed team order and presentation timing will be published here.</p></div>
                <b>To be published</b>
              </article>
            </div>
          </>
        )}
      </div>
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
  icon: Icon,
  badge,
  title,
  text,
  action,
  disabled = false,
}: {
  icon: typeof ArrowRight;
  badge: string;
  title: string;
  text: string;
  action: () => void;
  disabled?: boolean;
}) {
  return (
    <article className="activity-card">
      <div className="activity-card-top">
        <span className="activity-icon"><Icon /></span>
        <small>{badge}</small>
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      <button onClick={action} disabled={disabled}>
        {disabled ? "Locked" : "Open activity"} {!disabled && <ArrowRight size={16} />}
      </button>
    </article>
  );
}
function friendlyError(code: string | undefined, kind: Kind) {
  if (code === "42501")
    return "This week is currently closed. Your response was not submitted.";
  if (code === "23505") {
    if (kind === "health" || kind === "checkout" || kind === "checkout2" || kind === "checkout3" || kind === "checkout4" || kind === "progress" || kind === "checkin")
      return "This Student ID has already submitted this activity.";
    if (kind === "review") return "You have already reviewed this team.";
  }
  if (code === "42703")
    return "This activity is temporarily unavailable. Please tell your teacher.";
  if (code === "P0001")
    return "We could not match this Student ID to the current class roster. Check the ID or ask your teacher.";
  if (kind === "review" && code === "23514")
    return "You cannot review your own team.";
  return "We could not record your response. Please check your answers and try again.";
}

async function submissionStorageKey(
  kind: Kind,
  values: Record<string, FormDataEntryValue>,
  blockId: string,
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
  const bytes = new TextEncoder().encode(
    `nit3004|${blockId || "no-active-block"}|${kind}|${identity}`,
  );
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

function engagementReceipt(
  week: 1 | 2 | 3 | 4,
  text: (name: string) => string,
) {
  const common = [
    { label: "Participation", value: text("participation_mode") },
    ...(week <= 3
      ? [
          { label: "Weekly progress", value: text("weekly_status") },
          { label: "Teacher support", value: text("support_need") },
        ]
      : []),
  ];
  const weekly = {
    1: [
      { label: "Project access", value: text("project_access") },
      { label: "Team continuity", value: text("team_continuity") },
      { label: "Remaining work", value: text("remaining_work_clarity") },
    ],
    2: [
      { label: "Implementation progress", value: text("implementation_progress") },
      { label: "Evidence readiness", value: text("evidence_readiness") },
      { label: "Demo readiness", value: text("demo_readiness") },
    ],
    3: [
      { label: "Product readiness", value: text("product_readiness") },
      { label: "Testing readiness", value: text("testing_readiness") },
      { label: "Report readiness", value: text("report_readiness") },
      { label: "Presentation readiness", value: text("presentation_readiness") },
    ],
    4: [
      { label: "Presentation readiness", value: text("presentation_readiness") },
      { label: "Demo fallback", value: text("demo_backup_readiness") },
      { label: "Speaking role", value: text("speaking_role_readiness") },
      { label: "Final submission", value: text("final_submission_status") },
    ],
  };
  return [...common, ...weekly[week], { label: "Optional note", value: text("detail_note") }];
}

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
      { label: "Communication", value: text("communication") },
      { label: "Role clarity", value: text("role_clarity") },
      { label: "Participation balance", value: text("participation_balance") },
      { label: "Delivery status", value: text("delivery_status") },
      { label: "Voice in the team", value: text("voice") },
      { label: "Teacher support", value: text("teacher_support") },
      { label: "Main issue", value: text("main_issue") },
      { label: "Details", value: text("risk_note") },
    ],
    progress: [
      { label: "Deliverable area", value: text("deliverable_area") },
      { label: "Implementation claim", value: text("implementation_item") },
      { label: "Implementation state", value: text("implementation_state") },
      { label: "Work location", value: text("work_location") },
      { label: "Evidence reference", value: text("evidence_reference") },
      { label: "Demonstration", value: text("demonstration_method") },
      { label: "Verification level", value: text("verification_level") },
      { label: "Methods to explain", value: text("implementation_methods") },
      { label: "Remaining issue", value: text("remaining_issue") },
      { label: "Issue details", value: text("issue_note") },
      { label: "Next action", value: text("next_action") },
      { label: "Teacher verification", value: text("teacher_verification") },
    ],
    checkout: engagementReceipt(1, text),
    checkout2: engagementReceipt(2, text),
    checkout3: engagementReceipt(3, text),
    checkout4: engagementReceipt(4, text),
    review: [
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

function Modal({
  kind,
  blockId,
  blockLabel,
  student,
  close,
}: {
  kind: Kind | null;
  blockId: string;
  blockLabel: string;
  student: AuthenticatedStudent;
  close: () => void;
}) {
  const [msg, setMsg] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submissionCheckPending, setSubmissionCheckPending] = useState(false);
  const [progressStep, setProgressStep] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);
  const progressDraftKey = `nit3004|${blockId}|progress-draft|${student.studentId}`;
  const [storedSubmission, setStoredSubmission] =
    useState<SubmissionReceipt | null>(
      null,
  );
  useEffect(() => {
    setMsg("");
    setSubmitted(false);
    setProgressStep(1);
    setStoredSubmission(null);
    setSubmissionCheckPending(kind === "progress");
    let cancelled = false;
    if (kind === "progress") {
      supabase.rpc("get_my_week2_precheck_submission")
        .then(({ data, error }) => {
          if (cancelled) return;
          if (!error && data) setStoredSubmission(data as SubmissionReceipt);
          setSubmissionCheckPending(false);
        });
    } else if (kind === "pulse") {
      submissionStorageKey(kind, {}, blockId)
        .then((key) => {
          const receipt = readSubmissionReceipt(key);
          if (!cancelled && receipt) setStoredSubmission(receipt);
        })
        .catch(() => {
          // Storage is optional and may be unavailable in restricted browsers.
        });
    }
    return () => {
      cancelled = true;
    };
  }, [kind, blockId]);
  useEffect(() => {
    if (kind !== "progress") return;
    try {
      const draft = JSON.parse(localStorage.getItem(progressDraftKey) || "null") as Record<string, string | string[]> | null;
      if (!draft || !formRef.current) return;
      for (const [name, value] of Object.entries(draft)) {
        const controls = formRef.current.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${name}"]`);
        controls.forEach(control => {
          if (control instanceof HTMLInputElement && control.type === "checkbox") control.checked = Array.isArray(value) && value.includes(control.value);
          else control.value = String(value);
        });
      }
    } catch { /* Local draft recovery is optional. */ }
  }, [kind, progressDraftKey]);
  if (!kind) return null;
  const activeKind = kind;
  async function checkStoredSubmission(form: HTMLFormElement) {
    const values = Object.fromEntries(new FormData(form)) as Record<
      string,
      FormDataEntryValue
    >;
    const identityReady =
      activeKind === "pulse" ||
      ((activeKind === "checkin" || activeKind === "health" || activeKind === "checkout" || activeKind === "checkout2" || activeKind === "checkout3" || activeKind === "checkout4" || activeKind === "progress") &&
        Boolean(String(values.sid ?? "").trim())) ||
      (activeKind === "review" &&
        Boolean(String(values.sid ?? "").trim()) &&
        Boolean(values.reviewed_team));
    if (!identityReady) {
      setStoredSubmission(null);
      return;
    }
    try {
      const key = await submissionStorageKey(activeKind, values, blockId);
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
    v.name = student.studentName;
    v.sid = student.studentId;
    const implementationMethods = formData.getAll("implementation_methods").map(String);
    if (activeKind === "progress") {
      if (implementationMethods.length === 0) {
        setMsg("Select at least one implementation method to explain.");
        return;
      }
      v.implementation_methods = implementationMethods.join(", ");
    }
    let storageKey = "";
    try {
      storageKey = await submissionStorageKey(activeKind, v, blockId);
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
    if (activeKind === "checkout" || activeKind === "checkout2" || activeKind === "checkout3" || activeKind === "checkout4") {
      table = "weekly_engagement_checkouts";
      payload = {
        week_number: activeKind === "checkout4" ? 4 : activeKind === "checkout3" ? 3 : activeKind === "checkout2" ? 2 : 1,
        student_name: v.name,
        student_id: v.sid,
        participation_mode: v.participation_mode,
        weekly_status: v.weekly_status || null,
        support_need: v.support_need || null,
        project_access: v.project_access || null,
        team_continuity: v.team_continuity || null,
        remaining_work_clarity: v.remaining_work_clarity || null,
        implementation_progress: v.implementation_progress || null,
        evidence_readiness: v.evidence_readiness || null,
        demo_readiness: v.demo_readiness || null,
        product_readiness: v.product_readiness || null,
        testing_readiness: v.testing_readiness || null,
        report_readiness: v.report_readiness || null,
        presentation_readiness: v.presentation_readiness || null,
        demo_backup_readiness: v.demo_backup_readiness || null,
        speaking_role_readiness: v.speaking_role_readiness || null,
        final_submission_status: v.final_submission_status || null,
        detail_note: v.detail_note || null,
      };
    }
    if (activeKind === "progress") {
      table = "week2_progress_reviews";
      payload = {
        student_name: v.name,
        student_id: v.sid,
        project_name: v.project_name,
        project_area: v.project_area,
        project_description: v.project_description,
        target_user_problem: v.target_user_problem || null,
        deliverable_area: v.deliverable_area,
        implementation_item: v.implementation_item,
        implementation_state: v.implementation_state,
        work_location: v.work_location,
        evidence_reference: v.evidence_reference || null,
        demonstration_method: v.demonstration_method,
        verification_level: v.verification_level,
        implementation_methods: implementationMethods,
        remaining_issue: v.remaining_issue,
        issue_note: v.issue_note || null,
        next_action: v.next_action,
        teacher_verification: v.teacher_verification,
      };
    }
    if (activeKind === "review") {
      table = "poster_reviews";
      payload = {
        reviewer_name: v.name,
        reviewer_student_id: v.sid,
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
    if (!blockId) {
      setMsg("No active teaching block is available. Please tell your teacher.");
      return;
    }
    if (activeKind === "checkin") {
      const { data: projectContext, error: projectContextError } = await supabase.rpc(
        "get_project_checkin_context",
        { p_student_id: String(v.sid) },
      );
      if (projectContextError) {
        setMsg("We could not match this Student ID to the current class roster. Check the ID or ask your teacher.");
        return;
      }
      if (
        projectContext?.setupMode === "student_selection" &&
        !projectContext?.project &&
        !v.project_choice &&
        !v.proposal_title
      ) {
        setMsg("Choose a published project or submit your team’s project idea before completing Check-in.");
        return;
      }
    }
    if (activeKind === "checkin" && v.project_choice) {
      const { error } = await supabase.rpc("select_team_project", {
        p_student_id: String(v.sid),
        p_project_id: String(v.project_choice),
      });
      if (error) {
        setMsg(error.message.includes("confirmed")
          ? "Your teacher has already confirmed this team project. Refresh the form to see it."
          : "The team project could not be selected. Check your Student ID or ask your teacher.");
        return;
      }
    }
    if (activeKind === "checkin" && v.proposal_title) {
      const { error } = await supabase.rpc("submit_team_project_proposal", {
        p_student_id: String(v.sid),
        p_title: String(v.proposal_title),
        p_problem: String(v.proposal_problem),
        p_target_users: String(v.proposal_target_users),
        p_proposed_solution: String(v.proposal_solution),
        p_category: String(v.proposal_category),
        p_note: String(v.proposal_note || "") || null,
      });
      if (error) {
        setMsg(error.code === "23505"
          ? "Your team already has a project proposal awaiting teacher review."
          : "The project proposal could not be submitted. Check your Student ID or ask your teacher.");
        return;
      }
    }
    payload.block_id = blockId;
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
    if (activeKind === "progress") localStorage.removeItem(progressDraftKey);
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
        <div className="eyebrow">
          Student interaction{blockLabel ? ` · ${blockLabel}` : ""}
        </div>
        <h2>{titles[kind]}</h2>
        <form
          ref={formRef}
          onSubmit={submit}
          onChange={(event) => {
            void checkStoredSubmission(event.currentTarget);
            if (activeKind === "progress") {
              const data = new FormData(event.currentTarget);
              const draft: Record<string, string | string[]> = {};
              data.forEach((value, key) => { const text=String(value); draft[key] = key === "implementation_methods" ? [...(Array.isArray(draft[key]) ? draft[key] as string[] : []), text] : text; });
              try { localStorage.setItem(progressDraftKey, JSON.stringify(draft)); } catch { /* Optional. */ }
            }
          }}
        >
          {submissionCheckPending ? (
            <div className="submission-notice" role="status">
              <b>Checking your submission…</b>
              <span>Please wait while we check the current teaching block.</span>
            </div>
          ) : storedSubmission ? (
            <>
              <div className="submission-notice" role="status">
                <b>{activeKind === "progress" ? "Pre-check completed" : "Already submitted from this browser"}</b>
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
                {activeKind === "progress"
                  ? "This is the submitted record for your authenticated account and current teaching block."
                  : "This receipt is saved only on this browser. Your name and Student ID are not stored here."}
              </p>
              {activeKind !== "pulse" && activeKind !== "progress" && (
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
              <div className="authenticated-identity"><b>{student.studentName}</b><span>{student.studentId} · {student.teamName}</span></div>
              {fields(kind, student, progressStep, setProgressStep)}
              {msg && (
                <p
                  className={"form-status " + (submitted ? "success" : "")}
                  aria-live="polite"
                >
                  {msg}
                </p>
              )}
              {activeKind !== "progress" && <button disabled={submitted}>
                {submitted ? "Already submitted" : "Submit response"}
              </button>}
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
const Identity = ({ student }: { student?: AuthenticatedStudent }) => student ? (
  <><input type="hidden" name="name" value={student.studentName}/><input type="hidden" name="sid" value={student.studentId}/></>
) : (
  <>
    <label>
      Name
      <input name="name" required maxLength={100} />
    </label>
    <label>
      Student ID
      <input name="sid" required minLength={3} maxLength={40} />
    </label>
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
  defaultValue = "",
}: {
  label: string;
  name: string;
  placeholder: string;
  options: string[];
  defaultValue?: string;
}) => (
  <label>
    {label}
    <select name={name} defaultValue={defaultValue} required>
      <option value="" disabled>{placeholder}</option>
      {options.map((option) => <option key={option}>{option}</option>)}
    </select>
  </label>
);
function Choice({ label, name, options, defaultValue = "" }: { label: string; name: string; options: string[]; defaultValue?: string }) {
  return <SelectChoice label={label} name={name} placeholder="Select one" options={options} defaultValue={defaultValue} />;
}
function TeamHealthFields({ student }: { student?: AuthenticatedStudent }) {
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
  return <div onChange={(event) => assess(event.currentTarget.closest("form") as HTMLFormElement)}>
    <p className="form-note">Complete this individually. It measures participation temperature, not performance or marks.</p>
    <Identity student={student} />
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
function EngagementCheckoutFields({ week = 1, student }: { week?: 1 | 2 | 3 | 4; student?: AuthenticatedStudent }) {
  return <div>
    <p className="form-note">{week === 4 ? "Complete this before your final presentation and submission." : `Complete this after the final Week ${week} session, including work completed remotely.`}</p>
    <Identity student={student} />
    <Choice label={week === 4 ? "How have you participated in final preparation?" : "1. How did you participate after compulsory Monday?"} name="participation_mode" options={week === 4 ? ["Team rehearsal","Demo preparation","Final document work","Individual presentation preparation","Multiple preparation activities","Not yet participated"] : ["Wednesday session","Thursday session","Both sessions","Remote teamwork","Individual work only","No further participation"]} />
    {week <= 3 && <>
      <Choice label="2. Overall progress this week" name="weekly_status" options={["On track","Some difficulty","At risk","Blocked"]} />
      <Choice label="3. Do you need teacher support?" name="support_need" options={["No support needed","A quick check would help","Yes, support needed"]} />
    </>}
    {week === 1 && <>
      <Choice label="4. Can the team access the inherited project resources?" name="project_access" options={["All key resources accessible","Most resources accessible","Important resources missing","Project cannot be resumed yet"]} />
      <Choice label="5. Has the NIT3003 team continued into NIT3004?" name="team_continuity" options={["Same team","Minor membership change","Major membership change","Team continuity is unclear"]} />
      <Choice label="6. Has the team identified the remaining work after the break?" name="remaining_work_clarity" options={["Clear and agreed","Mostly clear","Still being reviewed","Not clear"]} />
    </>}
    {week === 2 && <>
      <Choice label="4. How far has the planned implementation progressed?" name="implementation_progress" options={["Working and integrated","Working independently","Partly working","Not working yet","Blocked"]} />
      <Choice label="5. Is your evidence easy to trace?" name="evidence_readiness" options={["Clear and traceable","Mostly traceable","Partial evidence","No usable evidence yet"]} />
      <Choice label="6. Are you ready to demonstrate progress?" name="demo_readiness" options={["Ready now","Ready with minor preparation","Partly ready","Not ready"]} />
    </>}
    {week === 3 && <>
      <Choice label="4. Is the core product ready for final delivery?" name="product_readiness" options={["Ready","Minor fixes remaining","Major work remaining","Blocked"]} />
      <Choice label="5. Is testing evidence ready?" name="testing_readiness" options={["Ready and traceable","Mostly ready","Partial","Not ready"]} />
      <Choice label="6. Is the final report ready?" name="report_readiness" options={["Ready","Minor edits remaining","Major sections remaining","Not ready"]} />
      <Choice label="7. Is the presentation and demo ready?" name="presentation_readiness" options={["Ready and rehearsed","Ready but not rehearsed","Partly ready","Not ready"]} />
    </>}
    {week === 4 && <>
      <Choice label="Is the presentation ready and rehearsed?" name="presentation_readiness" options={["Ready and rehearsed","Ready but not rehearsed","Partly ready","Not ready"]} />
      <Choice label="Is there a fallback if the live demo fails?" name="demo_backup_readiness" options={["Fallback tested","Fallback prepared","Fallback planned only","No fallback"]} />
      <Choice label="Is your individual speaking role ready?" name="speaking_role_readiness" options={["Ready and rehearsed","Ready but not rehearsed","Partly ready","No speaking role agreed"]} />
      <Choice label="Final submission status" name="final_submission_status" options={["Submitted","Ready to submit","Final checks in progress","Not ready"]} />
    </>}
    <label>Optional note<textarea name="detail_note" maxLength={200} /><small className="field-hint">Add only what the teacher needs to know. Maximum 200 characters.</small></label>
  </div>;
}
function ProjectSnapshotIdentity({ student }: { student?: AuthenticatedStudent }) {
  const [context, setContext] = useState<ProjectCheckinContext | null>(null);
  const [message, setMessage] = useState("");
  async function load(studentId: string) {
    if (studentId.trim().length < 3) return;
    setMessage("Finding your team project…");
    const { data, error } = await supabase.rpc("get_project_checkin_context", { p_student_id: studentId });
    if (error) {
      setContext(null);
      setMessage("Student ID could not be matched to the active class roster.");
      return;
    }
    setContext(data as ProjectCheckinContext);
    setMessage("");
  }
  useEffect(() => { if (student) void load(student.studentId); }, [student?.studentId]);
  return <>
    <Identity student={student}/>
    {message && <p className="form-note">{message}</p>}
    {context?.project ? <section className="checkin-project-context"><small>{context.teamName} · Project snapshot</small><h3>{context.project.title}</h3><p>{context.project.description}</p><span>{context.project.category} · {context.project.targetUsers}</span></section> : context && <p className="admin-alert error">No project is connected to {context.teamName} yet. Ask your teacher before submitting this pre-check.</p>}
  </>;
}
function ProgressReviewFields({ student, step, setStep }: { student?: AuthenticatedStudent; step: number; setStep: (step:number)=>void }) {
  const [needsDetail, setNeedsDetail] = useState(false);
  const methods = ["Architecture or component structure","Core logic or algorithm","Data flow","Database design","API or external service integration","Security or access control","Testing method","UI/UX decision","Hardware integration","Other"];
  const assess = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const issue = String(data.get("remaining_issue") ?? "");
    setNeedsDetail(!["", "No major issue"].includes(issue));
  };
  const names = ["Project Context","My Contribution","Implementation Status","Evidence & Verification","Blockers & Next Step","Review & Submit"];
  const next = (event: MouseEvent<HTMLButtonElement>) => {
    const wizard = event.currentTarget.closest(".progress-wizard");
    const panel = wizard?.querySelector<HTMLElement>(".wizard-step:not([hidden])");
    if (!panel) return;
    const invalid = panel.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(":invalid");
    if (invalid) return invalid.reportValidity();
    setStep(Math.min(6, step + 1));
  };
  return <div className="progress-wizard" onChange={(event) => assess(event.currentTarget.closest("form") as HTMLFormElement)}>
    <div className="wizard-progress"><div><span>Step {step} of 6</span><b>{names[step-1]}</b></div><progress max="6" value={step}/></div>
    <section className="wizard-step" hidden={step!==1}><p className="form-note">Start with the project context already connected to your team.</p><ProjectSnapshotIdentity student={student} /></section>
    <section className="wizard-step" hidden={step!==2}><Choice label="Which deliverable are you mainly responsible for?" name="deliverable_area" options={["Frontend / UI","Backend / API","Database","Authentication / Security","Hardware / Integration","Testing","Documentation","Project coordination","Other"]} /><label>What specific item have you personally implemented?<textarea name="implementation_item" required maxLength={200} placeholder="One concrete function, component, test result or document — not your general role." /><small className="field-hint">Maximum 200 characters</small></label></section>
    <section className="wizard-step" hidden={step!==3}><Choice label="What is its current implementation state?" name="implementation_state" options={["Implemented and verified","Implemented but not fully verified","Partially implemented","Designed but not implemented","Blocked"]} /><Choice label="Where can your work be found?" name="work_location" options={["GitHub repository / commits","Application or deployed system","Database / backend service","Test records","Design or documentation","Hardware prototype","Not yet available","Other"]} /></section>
    <section className="wizard-step" hidden={step!==4}><label>Evidence reference (optional)<input name="evidence_reference" maxLength={300} placeholder="Branch, commit, page, file, function or demo item" /><small className="field-hint">Do not include passwords or private access details.</small></label><Choice label="How will you demonstrate or verify it?" name="demonstration_method" options={["Run the function live","Show the implemented code and explain it","Run a test case","Show database / API output","Demonstrate hardware integration","Show design / document evidence","Cannot demonstrate it yet"]} /><Choice label="What level of verification has been completed?" name="verification_level" options={["Demonstrated successfully on the target system","Integrated with other project components","Tested independently only","Informally checked","Not yet tested"]} /><fieldset className="choice-checklist"><legend>Which implementation method should you be ready to explain?</legend>{methods.map(method => <label key={method}><input type="checkbox" name="implementation_methods" value={method} /><span>{method}</span></label>)}</fieldset></section>
    <section className="wizard-step" hidden={step!==5}><Choice label="What is the main remaining issue?" name="remaining_issue" options={["No major issue","Integration incomplete","Testing incomplete","Technical defect","Security or data concern","Dependency on another team member","Scope or time constraint","Implementation not yet working","Other"]} />{needsDetail && <label>Brief issue details<textarea name="issue_note" required maxLength={200} /><small className="field-hint">Explain only what the teacher should verify. Maximum 200 characters.</small></label>}<Choice label="What is your next concrete action after the review?" name="next_action" options={["Complete implementation","Integrate components","Fix defects","Add or run tests","Verify security / data","Deploy to target device or environment","Prepare evidence","Update documentation","Other"]} /><Choice label="What should the teacher verify during Monday’s review?" name="teacher_verification" options={["Whether the function works","My implementation method","My individual contribution","Integration with the team project","Testing and evidence","Current blocker","Progress Report accuracy","Other"]} /></section>
    <section className="wizard-step wizard-review" hidden={step!==6}><CheckCircle2/><h3>Ready to submit your pre-check</h3><p>Review any step using Back. Your teacher will use this record to guide the live demonstration; it is not an automatic mark.</p></section>
    <div className="wizard-actions">{step>1&&<button type="button" className="secondary" onClick={()=>setStep(step-1)}>Back</button>}{step<6?<button type="button" onClick={next}>Continue</button>:<button type="submit">Submit pre-check</button>}</div>
  </div>;
}
type ProjectCheckinContext = {
  setupMode: "teacher_assigned" | "student_selection";
  teamName: string;
  assignmentStatus: "student_selected" | "teacher_confirmed" | null;
  project: { id: string; title: string; problem: string; targetUsers: string; description: string; category: string; difficulty: string } | null;
  availableProjects: Array<{ id: string; title: string; problem: string; targetUsers: string; description: string; category: string; difficulty: string }>;
};
function CheckinFields() {
  const [context, setContext] = useState<ProjectCheckinContext | null>(null);
  const [lookupMessage, setLookupMessage] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [proposeOwn, setProposeOwn] = useState(false);

  async function loadProject(studentId: string) {
    if (studentId.trim().length < 3) return;
    setLookupBusy(true);
    setLookupMessage("");
    setContext(null);
    const { data, error } = await supabase.rpc("get_project_checkin_context", {
      p_student_id: studentId,
    });
    setLookupBusy(false);
    if (error) {
      setLookupMessage("Student ID could not be matched to the active class roster.");
      return;
    }
    setContext(data as ProjectCheckinContext);
  }

  return <>
    <label>Your name<input name="name" required maxLength={100} /></label>
    <label>Student ID<input name="sid" required minLength={3} maxLength={40} onBlur={(event) => void loadProject(event.target.value)} /></label>
    {lookupBusy && <p className="form-note">Finding your team project…</p>}
    {lookupMessage && <p className="admin-alert error" role="alert">{lookupMessage}</p>}
    {context && <section className="checkin-project-context">
      <small>{context.teamName} · Team project</small>
      {context.project ? <>
        <h3>{context.project.title}</h3>
        <p>{context.project.description}</p>
        <span>{context.project.category} · {context.project.difficulty}{context.assignmentStatus === "teacher_confirmed" ? " · Teacher confirmed" : " · Team selected"}</span>
      </> : context.setupMode === "teacher_assigned" ? <>
        <h3>Project assignment pending</h3>
        <p>Your teacher will connect the project for this team. You can complete Check-in now.</p>
      </> : <>
        <h3>Choose one project for your team</h3>
        <p>One team member can select on behalf of the whole team. Other members will see the same selection.</p>
        {!proposeOwn && <label>Published projects<select name="project_choice" required defaultValue=""><option value="" disabled>Select a project</option>{context.availableProjects.map((project) => <option key={project.id} value={project.id}>{project.title} · {project.category}</option>)}</select></label>}
        <label className="project-proposal-toggle"><input type="checkbox" checked={proposeOwn} onChange={(event) => setProposeOwn(event.target.checked)}/><span>Our team wants to propose its own idea</span></label>
        {proposeOwn && <div className="project-proposal-fields">
          <label>Project title<input name="proposal_title" required maxLength={120}/></label>
          <label>Problem to solve<textarea name="proposal_problem" required maxLength={600}/></label>
          <label>Target users<input name="proposal_target_users" required maxLength={300}/></label>
          <label>Proposed solution<textarea name="proposal_solution" required maxLength={800}/></label>
          <Choice label="Category" name="proposal_category" options={["Web","Mobile","AI","Data","IoT","Cybersecurity","Game","Other"]}/>
          <label>Optional note<textarea name="proposal_note" maxLength={300}/></label>
        </div>}
      </>}
    </section>}
    <Text
      label="What do you want to achieve in these four weeks?"
      name="goal"
      maxLength={800}
    />
  </>;
}
function fields(k: Kind, student?: AuthenticatedStudent, progressStep = 1, setProgressStep: (step:number)=>void = ()=>{}) {
  if (k === "checkin")
    return <CheckinFields />;
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
  if (k === "health") return <TeamHealthFields student={student} />;
  if (k === "checkout") return <EngagementCheckoutFields week={1} student={student} />;
  if (k === "progress") return <ProgressReviewFields student={student} step={progressStep} setStep={setProgressStep} />;
  if (k === "checkout2") return <EngagementCheckoutFields week={2} student={student} />;
  if (k === "checkout3") return <EngagementCheckoutFields week={3} student={student} />;
  if (k === "checkout4") return <EngagementCheckoutFields week={4} student={student} />;
  return (
    <>
      <p className="form-note">
        Review another team. Choose the option that best matches the evidence
        you saw—no written comment is required.
      </p>
      <Identity student={student}/>
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
type StudioSessionRow = { id:string; title:string; session_date:string; status:"scheduled"|"open"|"closed"; starts_at:string|null; ends_at:string|null; opened_at:string|null; closed_at:string|null };
type AttendanceRow = { session_id:string; student_id:string; checked_in_at:string };

function StudioSessionControl({
  blockId,
  blocks,
  onBlockChange,
}: {
  blockId: string;
  blocks: Array<{ id: string; academic_year: number; block_code: string; status: string }>;
  onBlockChange: (blockId: string) => void;
}) {
  const [sessions, setSessions] = useState<StudioSessionRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [editing, setEditing] = useState<StudioSessionRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    if (!blockId) return;
    const { data } = await supabase.from("studio_sessions").select("id,title,session_date,status,starts_at,ends_at,opened_at,closed_at").eq("block_id", blockId).order("session_date");
    const next = (data as StudioSessionRow[] | null) || [];
    setSessions(next);
    const ids = next.map(item => item.id);
    if (!ids.length) return setAttendance([]);
    const { data: checkins } = await supabase.from("student_session_checkins").select("session_id,student_id,checked_in_at").in("session_id", ids).order("checked_in_at");
    setAttendance((checkins as AttendanceRow[] | null) || []);
  }

  useEffect(() => {
    setEditing(null);
    setMessage("");
    void load();
  }, [blockId]);

  const selectedBlock = blocks.find(block => block.id === blockId);

  function effectiveStatus(item:StudioSessionRow){const now=Date.now();if(item.status==="closed"||(item.ends_at&&new Date(item.ends_at).getTime()<=now))return "closed";if(item.status==="open"||(item.starts_at&&new Date(item.starts_at).getTime()<=now&&(!item.ends_at||new Date(item.ends_at).getTime()>now)))return "open";return "scheduled";}
  async function prepareTen() {
    if (sessions.length >= 10) return setMessage("This block already has 10 or more sessions.");
    setBusy(true);setMessage("");
    const { data:block }=await supabase.from("teaching_blocks").select("starts_on").eq("id",blockId).single();
    const base=new Date(block?.starts_on || new Date().toISOString().slice(0,10));
    const rows=Array.from({length:10-sessions.length},(_,index)=>{const date=new Date(base);date.setDate(date.getDate()+(sessions.length+index)*7);return{block_id:blockId,title:`Session ${sessions.length+index+1}`,session_date:date.toISOString().slice(0,10),status:"scheduled"};});
    const {error}=await supabase.from("studio_sessions").insert(rows);setMessage(error?"The 10-session plan could not be prepared.":"A 10-session block plan is ready. Edit dates and add automatic check-in times when known.");await load();setBusy(false);
  }
  async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!editing)return;setBusy(true);setMessage("");const values=Object.fromEntries(new FormData(event.currentTarget));const starts=String(values.starts_at||"");const ends=String(values.ends_at||"");if(starts&&ends&&new Date(ends)<=new Date(starts)){setBusy(false);return setMessage("End time must be after start time.");}const{error}=await supabase.from("studio_sessions").update({title:String(values.title).trim(),session_date:String(values.session_date),starts_at:starts?new Date(starts).toISOString():null,ends_at:ends?new Date(ends).toISOString():null,status:editing.status==="closed"?"closed":"scheduled",opened_at:editing.status==="closed"?editing.opened_at:null}).eq("id",editing.id);setMessage(error?"Session changes could not be saved.":"Session schedule updated.");if(!error)setEditing(null);await load();setBusy(false);}
  async function setState(item:StudioSessionRow,next:"open"|"closed"){setBusy(true);setMessage("");const now=new Date().toISOString();const{error}=await supabase.from("studio_sessions").update(next==="open"?{status:"open",opened_at:now,closed_at:null}:{status:"closed",closed_at:now}).eq("id",item.id);setMessage(error?(next==="open"?"Close any other open session before opening this one.":"The session could not be closed."):(next==="open"?"Session check-in is open now.":"Session closed. Attendance history is preserved."));await load();setBusy(false);}
  function download(item:StudioSessionRow){const rows=attendance.filter(row=>row.session_id===item.id);const csv=["Student ID,Checked in at",...rows.map(row=>`"${row.student_id}","${new Date(row.checked_in_at).toLocaleString()}"`)];const url=URL.createObjectURL(new Blob([csv.join("\n")],{type:"text/csv"}));const link=document.createElement("a");link.href=url;link.download=`${item.title.replace(/[^a-z0-9]+/gi,"-").toLowerCase()}-attendance.csv`;link.click();URL.revokeObjectURL(url);
  }

  return <section className="session-manager">
    <div className="session-manager-heading"><div>
      <div className="eyebrow">Authenticated attendance</div>
      <h2>Studio Sessions{selectedBlock ? ` · ${selectedBlock.academic_year} ${selectedBlock.block_code}` : ""}</h2><p>Prepare the selected block once, then edit each session. A scheduled window opens and closes Check-in automatically; manual controls remain available.</p>
    </div><div className="session-manager-actions"><label className="admin-block-filter">Teaching block<select value={blockId} onChange={event=>onBlockChange(event.target.value)} disabled={busy}>{blocks.map(block=><option key={block.id} value={block.id}>{block.academic_year} · {block.block_code}{block.status==="active"?" — Active":""}</option>)}</select></label><button disabled={busy||!blockId||sessions.length>=10} onClick={()=>void prepareTen()}><CalendarPlus size={17}/> Prepare {Math.max(0,10-sessions.length)} sessions</button></div></div>
    {message && <p className="admin-alert" role="status">{message}</p>}
    <div className="teacher-session-list">{sessions.map(item=>{const state=effectiveStatus(item),checkins=attendance.filter(row=>row.session_id===item.id);return <article key={item.id} className={`teacher-session ${state}`}><div className="teacher-session-summary"><div><span className={`activity-control-status ${state}`}>{state}</span><h3>{item.title}</h3><p>{new Date(`${item.session_date}T00:00:00`).toLocaleDateString()} · {checkins.length} checked in</p>{item.starts_at&&<small>{new Date(item.starts_at).toLocaleString()} → {item.ends_at?new Date(item.ends_at).toLocaleString():"manual close"}</small>}</div><div className="teacher-session-actions"><button className="secondary compact" onClick={()=>setEditing(item)} disabled={busy}><Pencil size={15}/> Edit</button>{state==="open"?<button className="danger compact" onClick={()=>void setState(item,"closed")} disabled={busy}>Close</button>:state!=="closed"&&<button className="compact" onClick={()=>void setState(item,"open")} disabled={busy}>Open now</button>}<button className="secondary compact" onClick={()=>download(item)} disabled={!checkins.length}><Download size={15}/> CSV</button></div></div>{checkins.length>0&&<details><summary>View attendance</summary><table><thead><tr><th>Student ID</th><th>Check-in time</th></tr></thead><tbody>{checkins.map(row=><tr key={`${row.session_id}-${row.student_id}`}><td>{row.student_id}</td><td>{new Date(row.checked_in_at).toLocaleString()}</td></tr>)}</tbody></table></details>}</article>})}{!sessions.length&&<p className="empty-state">No sessions prepared yet. Create the standard 10-session plan to begin.</p>}</div>
    {editing&&<div className="modal"><form className="dialog session-edit-dialog" onSubmit={save}><button type="button" className="close" onClick={()=>setEditing(null)}>×</button><div className="eyebrow">Edit session</div><h2>{editing.title}</h2><label>Title<input name="title" defaultValue={editing.title} required maxLength={120}/></label><label>Session date<input name="session_date" type="date" defaultValue={editing.session_date} required/></label><label>Automatic start (optional)<input name="starts_at" type="datetime-local" defaultValue={editing.starts_at?new Date(new Date(editing.starts_at).getTime()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16):""}/></label><label>Automatic end (optional)<input name="ends_at" type="datetime-local" defaultValue={editing.ends_at?new Date(new Date(editing.ends_at).getTime()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16):""}/></label><p>Leave both times empty to use Open now / Close manually.</p><div className="admin-dialog-actions"><button type="button" className="secondary" onClick={()=>setEditing(null)}>Cancel</button><button disabled={busy}>{busy?"Saving…":"Save session"}</button></div></form></div>}
  </section>;
}

function Admin() {
  type TeachingBlock = {
    id: string;
    academic_year: number;
    block_code: string;
    status: string;
  };
  const activityTables = [
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
      table: "week2_progress_reviews",
      label: "Week 2 implementation pre-checks",
      title: "Week 2 Implementation Pre-check",
      description: "Verify each student’s claim through demonstration, method explanation, evidence and remaining work.",
      select: "id, student_name, student_id, team_name, project_name, project_area, project_description, target_user_problem, deliverable_area, implementation_item, implementation_state, work_location, evidence_reference, demonstration_method, verification_level, implementation_methods, remaining_issue, issue_note, next_action, teacher_verification, created_at, updated_at",
      columns: [
        ["student_name", "Name"], ["student_id", "Student ID"], ["team_name", "Team"],
        ["project_name", "Project"], ["project_area", "Project area"], ["project_description", "Project description"],
        ["target_user_problem", "Target user / problem"], ["deliverable_area", "Deliverable"], ["implementation_item", "Implementation claim"],
        ["implementation_state", "State"], ["work_location", "Location"],
        ["evidence_reference", "Evidence reference"], ["demonstration_method", "Demonstration"],
        ["verification_level", "Verification"], ["implementation_methods", "Methods to explain"],
        ["remaining_issue", "Remaining issue"], ["issue_note", "Issue details"],
        ["next_action", "Next action"], ["teacher_verification", "Teacher verification"],
        ["created_at", "Created"], ["updated_at", "Updated"],
      ],
      editable: [
        ["student_name", "Name", "text", 100], ["student_id", "Student ID", "text", 40],
        ["team_name", "Team", "team", 0], ["implementation_item", "Implementation claim", "textarea", 200],
        ["evidence_reference", "Evidence reference", "textarea", 300], ["issue_note", "Issue details", "textarea", 200],
      ],
    },
    {
      table: "weekly_engagement_checkouts",
      label: "Weekly check-outs",
      title: "Weekly Engagement Check-outs",
      description: "Review the Week 1–4 common pulse and week-specific readiness evidence. Legacy responses remain available.",
      select: "id, week_number, student_name, student_id, team_name, participation_mode, weekly_status, support_need, project_access, team_continuity, remaining_work_clarity, implementation_progress, evidence_readiness, demo_readiness, product_readiness, testing_readiness, report_readiness, presentation_readiness, demo_backup_readiness, speaking_role_readiness, final_submission_status, time_invested, contribution_areas, task_completion, evidence_status, team_communication, participation_balance, next_task_clarity, work_status, discussion_focus, detail_note, created_at, updated_at",
      columns: [
        ["week_number", "Week"], ["student_name", "Name"], ["student_id", "Student ID"], ["team_name", "Team"],
        ["participation_mode", "Participation"], ["weekly_status", "Weekly progress"], ["support_need", "Teacher support"],
        ["project_access", "W1 project access"], ["team_continuity", "W1 team continuity"], ["remaining_work_clarity", "W1 remaining work"],
        ["implementation_progress", "W2 implementation"], ["evidence_readiness", "W2 evidence"], ["demo_readiness", "W2 demo readiness"],
        ["product_readiness", "W3 product"], ["testing_readiness", "W3 testing"], ["report_readiness", "W3 report"],
        ["presentation_readiness", "Presentation readiness"], ["demo_backup_readiness", "W4 demo fallback"],
        ["speaking_role_readiness", "W4 speaking role"], ["final_submission_status", "W4 submission"],
        ["time_invested", "Legacy: time invested"], ["contribution_areas", "Legacy: contribution areas"],
        ["task_completion", "Legacy: task completion"], ["evidence_status", "Legacy: evidence"],
        ["team_communication", "Legacy: communication"], ["participation_balance", "Legacy: participation balance"],
        ["next_task_clarity", "Legacy: next task"], ["work_status", "Legacy: work status"],
        ["discussion_focus", "Legacy: Monday focus"],
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
  const [overviewCounts, setOverviewCounts] = useState({
    students: null as number | null,
    teams: null as number | null,
    projects: null as number | null,
    assignedTeams: null as number | null,
  });
  const [activeTable, setActiveTable] =
    useState<ActivityTable>("team_health_checks");
  const [teachingBlocks, setTeachingBlocks] = useState<TeachingBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [adminView, setAdminView] = useState<"overview" | "roster" | "projects" | "sessions" | "records">("overview");
  const [activityWorkspace, setActivityWorkspace] = useState<"weekly" | "records" | "presentation">("records");
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [editRecord, setEditRecord] = useState<ActivityRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<ActivityRecord | null>(null);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [mutationMessage, setMutationMessage] = useState("");
  const [weeklyStates, setWeeklyStates] = useState<Record<number, boolean>>({});
  const [weeklyBusy, setWeeklyBusy] = useState<number | null>(null);
  const [weeklyMessage, setWeeklyMessage] = useState("");
  const [teacherReviewBusy, setTeacherReviewBusy] = useState(false);
  const [teacherReviewMessage, setTeacherReviewMessage] = useState("");
  const [teacherReviews, setTeacherReviews] = useState<ActivityRecord[]>([]);
  const [openReviewStudentId, setOpenReviewStudentId] = useState<string | null>(null);
  const [checkoutWeekFilter, setCheckoutWeekFilter] = useState<number | "all">(3);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, AiTeachingSuggestion>>({});
  const [aiSuggestionMessages, setAiSuggestionMessages] = useState<Record<string, string>>({});
  const [aiSuggestionBusyId, setAiSuggestionBusyId] = useState<string | null>(null);
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
      void initialiseDashboard();
    } else {
      setDataStatus("idle");
      setDataMessage("");
      setRecords([]);
      setCounts(
        Object.fromEntries(activityTables.map(({ table }) => [table, null])),
      );
      setOverviewCounts({
        students: null,
        teams: null,
        projects: null,
        assignedTeams: null,
      });
      setTeachingBlocks([]);
      setSelectedBlockId("");
    }
  }, [sessionUser?.email, sessionUser?.isTeacher]);

  useEffect(() => {
    if (sessionUser?.isTeacher && selectedBlockId) void loadWeeklyStates(selectedBlockId);
  }, [sessionUser?.isTeacher, selectedBlockId]);

  async function loadWeeklyStates(blockId: string) {
    const { data, error } = await supabase.from("weekly_activity_settings").select("week_number,is_open").eq("block_id", blockId).order("week_number");
    if (error) {
      setWeeklyStates({});
      setWeeklyMessage("Weekly controls could not be loaded. Apply the Phase 4A activation migration.");
      return;
    }
    setWeeklyStates(Object.fromEntries((data || []).map(item => [item.week_number, item.is_open])));
    setWeeklyMessage("");
  }

  async function setWeeklyState(week: number, isOpen: boolean) {
    setWeeklyBusy(week); setWeeklyMessage("");
    const { error } = await supabase.from("weekly_activity_settings").update({ is_open: isOpen }).eq("block_id", selectedBlockId).eq("week_number", week);
    setWeeklyBusy(null);
    if (error) return setWeeklyMessage("The weekly activity state could not be changed. Confirm your teacher role and try again.");
    setWeeklyStates(current => ({ ...current, [week]: isOpen }));
    setWeeklyMessage(`Week ${week} is now ${isOpen ? "active" : "closed"}. Existing submissions are unchanged.`);
  }

  async function initialiseDashboard() {
    const { data, error } = await supabase
      .from("teaching_blocks")
      .select("id, academic_year, block_code, status")
      .order("academic_year", { ascending: false });
    if (error) {
      setDataStatus("error");
      setDataMessage("Teaching blocks could not be loaded.");
      return;
    }
    const blocks = (data ?? []) as TeachingBlock[];
    const initialBlockId =
      blocks.find((block) => block.status === "active")?.id ||
      blocks[0]?.id ||
      "";
    setTeachingBlocks(blocks);
    setSelectedBlockId(initialBlockId);
    if (initialBlockId) {
      await Promise.all([
        loadDashboard(activeTable, initialBlockId),
        loadOverview(initialBlockId),
      ]);
    }
  }

  async function loadOverview(blockId: string) {
    const [studentsResult, teamsResult, projectsResult, assignmentsResult] =
      await Promise.all([
        supabase.from("student_roster").select("*", { count: "exact", head: true }).eq("block_id", blockId),
        supabase.from("teams").select("*", { count: "exact", head: true }).eq("block_id", blockId),
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("block_id", blockId),
        supabase.from("teams").select("id, assignment:team_project_assignments(id)").eq("block_id", blockId),
      ]);
    if (studentsResult.error || teamsResult.error || projectsResult.error || assignmentsResult.error) {
      setOverviewCounts({ students: null, teams: null, projects: null, assignedTeams: null });
      return;
    }
    setOverviewCounts({
      students: studentsResult.count ?? 0,
      teams: teamsResult.count ?? 0,
      projects: projectsResult.count ?? 0,
      assignedTeams: (assignmentsResult.data ?? []).filter(
        (team) => Array.isArray(team.assignment) && team.assignment.length > 0,
      ).length,
    });
  }

  const aiSuggestionKey = (studentId: string, stage: AiSuggestionStage) =>
    `${studentId}:${stage}`;

  async function generateAiTeachingSuggestion(
    student: ActivityRecord,
    stage: AiSuggestionStage,
    savedReview?: ActivityRecord,
  ) {
    const studentId = String(student.student_id);
    const key = aiSuggestionKey(studentId, stage);
    setAiSuggestionMessages((current) => ({ ...current, [key]: "" }));

    if (!String(student.project_name ?? "").trim() || !String(student.project_description ?? "").trim()) {
      setAiSuggestionMessages((current) => ({
        ...current,
        [key]: "Add a project name and description before using the AI teaching suggestion.",
      }));
      return;
    }

    const teacherVerification = {
      reviewOutcome: savedReview?.review_outcome,
      demonstrationOutcome: savedReview?.demonstration_outcome,
      methodExplanation: savedReview?.method_explanation,
      evidenceQuality: savedReview?.evidence_quality,
      contributionVerification: savedReview?.contribution_verification,
      reportAlignment: savedReview?.report_alignment,
      conversationNote: savedReview?.teacher_feedback,
      followUpStatus: savedReview?.follow_up_status,
      followUpNote: savedReview?.follow_up_note,
    };
    const verificationValues = [
      teacherVerification.reviewOutcome,
      teacherVerification.demonstrationOutcome,
      teacherVerification.methodExplanation,
      teacherVerification.evidenceQuality,
      teacherVerification.contributionVerification,
      teacherVerification.reportAlignment,
    ].map((value) => String(value ?? "").trim());
    if (
      stage === "closing" &&
      !verificationValues.some((value) => value && value !== "Not reviewed")
    ) {
      setAiSuggestionMessages((current) => ({
        ...current,
        [key]: "Begin the teacher verification checks before generating a closing suggestion.",
      }));
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setAiSuggestionMessages((current) => ({
        ...current,
        [key]: "Your teacher session has expired. Sign in again to use AI suggestions.",
      }));
      return;
    }

    setAiSuggestionBusyId(key);
    try {
      const response = await fetch("/api/ai-teaching-suggestion", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stage,
          project: {
            name: student.project_name,
            area: student.project_area,
            description: student.project_description,
            targetUserProblem: student.target_user_problem,
          },
          implementation: {
            claim: student.implementation_item,
            state: student.implementation_state,
            location: student.work_location,
            evidenceReference: student.evidence_reference,
            demonstrationPlan: student.demonstration_method,
            verificationLevel: student.verification_level,
            methods: Array.isArray(student.implementation_methods)
              ? student.implementation_methods.join(", ")
              : student.implementation_methods,
            remainingIssue: student.remaining_issue,
            nextAction: student.next_action,
          },
          teacherVerification: stage === "closing" ? teacherVerification : undefined,
        }),
      });
      const result = await response.json() as {
        suggestion?: AiTeachingSuggestion;
        error?: string;
      };
      if (!response.ok || !result.suggestion) {
        throw new Error(result.error || "The AI suggestion could not be generated.");
      }
      setAiSuggestions((current) => ({
        ...current,
        [key]: result.suggestion!,
      }));
      setAiSuggestionMessages((current) => ({
        ...current,
        [key]:
          stage === "starting"
            ? "Starting suggestion ready. Use it as a conversation prompt, not a conclusion."
            : "Closing suggestion ready. Compare it with the starting point before use.",
      }));
    } catch (error) {
      setAiSuggestionMessages((current) => ({
        ...current,
        [key]:
          error instanceof Error
            ? error.message
            : "The AI suggestion could not be generated.",
      }));
    } finally {
      setAiSuggestionBusyId(null);
    }
  }

  function dismissAiSuggestion(studentId: string, stage: AiSuggestionStage) {
    const key = aiSuggestionKey(studentId, stage);
    setAiSuggestions((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setAiSuggestionMessages((current) => ({ ...current, [key]: "" }));
  }

  function useAiSuggestion(
    studentId: string,
    form: HTMLFormElement,
    suggestion: AiTeachingSuggestion,
  ) {
    const note = form.elements.namedItem("follow_up_note");
    if (!(note instanceof HTMLTextAreaElement)) return;
    const selectedStep = form.querySelector<HTMLInputElement>(
      'input[name="closing_next_step"]:checked',
    );
    note.value = [
      `Recommended next action: ${selectedStep?.value || suggestion.action_or_verification}`,
      `What changed after review: ${suggestion.what_changed_after_review}`,
      `Closing message: ${suggestion.teaching_message}`,
    ].filter((line) => !line.endsWith(": ")).join("\n");
    note.focus();
    setAiSuggestionMessages((current) => ({
      ...current,
      [aiSuggestionKey(studentId, "closing")]: "Closing suggestion copied into Follow-up note. It becomes a record only when you save the review.",
    }));
  }

  async function saveTeacherReview(event: FormEvent<HTMLFormElement>, student: ActivityRecord) {
    event.preventDefault();
    setTeacherReviewBusy(true);
    setTeacherReviewMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const followUpActions = new FormData(event.currentTarget)
      .getAll("follow_up_actions")
      .map(String);
    if (followUpActions.length === 0) {
      setTeacherReviewBusy(false);
      setTeacherReviewMessage("Select at least one follow-up action.");
      return;
    }
    const payload = {
      block_id: selectedBlockId,
      student_name: String(student.student_name),
      student_id: String(student.student_id),
      team_name: String(student.team_name),
      review_outcome: values.review_outcome,
      demonstration_outcome: values.demonstration_outcome,
      method_explanation: values.method_explanation,
      evidence_quality: values.evidence_quality,
      contribution_verification: values.contribution_verification,
      report_alignment: values.report_alignment,
      teacher_feedback: String(values.teacher_feedback ?? "").trim(),
      follow_up_status: values.follow_up_status,
      follow_up_actions: followUpActions,
      follow_up_note: String(values.follow_up_note ?? "").trim() || null,
      recheck_week: values.recheck_week ? Number(values.recheck_week) : null,
    };
    const { error } = await supabase
      .from("teacher_progress_reviews")
      .upsert(payload, { onConflict: "block_id,student_id" });
    setTeacherReviewBusy(false);
    if (error) {
      setTeacherReviewMessage(
        "The review could not be saved. Check the fields and teacher permissions.",
      );
      return;
    }
    setTeacherReviewMessage("Review and follow-up saved.");
    await loadTeacherReviews(selectedBlockId);
  }

  async function loadTeacherReviews(blockId: string = selectedBlockId) {
    const { data, error } = await supabase
      .from("teacher_progress_reviews")
      .select("*")
      .eq("block_id", blockId)
      .order("updated_at", { ascending: false });
    if (error) {
      setTeacherReviews([]);
      setTeacherReviewMessage("Teacher follow-up records could not be loaded.");
      return;
    }
    setTeacherReviews((data ?? []) as ActivityRecord[]);
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

  async function loadDashboard(
    table: ActivityTable = activeTable,
    blockId: string = selectedBlockId,
  ) {
    if (!blockId) return;
    const requestId = ++requestSequence.current;
    setDataStatus("loading");
    setDataMessage("");
    setRecords([]);
    const activity = activityTables.find((item) => item.table === table)!;
    const selectColumns: string = activity.select;
    const [recordResult, ...countResults] = await Promise.all([
      supabase
        .from(table as "student_checkins")
        .select(selectColumns)
        .eq("block_id", blockId)
        .order("created_at", { ascending: false }),
      ...activityTables.map(({ table: countTable }) =>
        supabase
          .from(countTable as "student_checkins")
          .select("*", { count: "exact", head: true })
          .eq("block_id", blockId),
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
    setRecords((recordResult.data ?? []) as unknown as ActivityRecord[]);
    if (table === "week2_progress_reviews" || table === "weekly_engagement_checkouts") {
      await loadTeacherReviews(blockId);
    }
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
    if (!editRecord) return;
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
    if (!deleteRecord) return;
    setMutationBusy(true);
    setMutationMessage("");
    const { error } = activeTable === "week2_progress_reviews"
      ? await supabase.rpc("teacher_reset_week2_precheck", {
          p_submission_id: String(deleteRecord.id),
        })
      : await supabase
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
  const selectedBlock = teachingBlocks.find(
    (block) => block.id === selectedBlockId,
  );
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

    const exportRecords =
      activeTable === "weekly_engagement_checkouts" ? visibleRecords : records;
    const headings = [
      "Academic year",
      "Teaching block",
      ...activeActivity.columns.map(([, label]) => label),
    ];
    const rows = exportRecords.map((record) =>
      [
        selectedBlock?.academic_year ?? "",
        selectedBlock?.block_code ?? "",
        ...activeActivity.columns.map(([field]) => record[field] ?? ""),
      ],
    );

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
  const visibleRecords =
    activeTable === "weekly_engagement_checkouts" && checkoutWeekFilter !== "all"
      ? records.filter((record) => Number(record.week_number) === checkoutWeekFilter)
      : records;
  const followUpWeek =
    activeTable === "weekly_engagement_checkouts" &&
    (checkoutWeekFilter === 3 || checkoutWeekFilter === 4)
      ? checkoutWeekFilter
      : null;
  const unresolvedFollowUps = followUpWeek
    ? teacherReviews.filter((review) => {
        const status = String(review.follow_up_status ?? "Not reviewed");
        const recheckWeek = review.recheck_week ? Number(review.recheck_week) : null;
        return (
          !["No follow-up needed", "Resolved"].includes(status) &&
          (recheckWeek === null || recheckWeek <= followUpWeek)
        );
      })
    : [];

  const teamTemperatures =
    activeTable === "team_health_checks"
      ? teams.map((team) => {
          const teamRecords = records.filter((record) => record.team_name === team);
          const riskPoints = teamRecords.reduce((total, record) => {
            const points = [
              record.communication === "Not yet" ? 2 : 0,
              record.role_clarity === "Not clear"
                ? 2
                : record.role_clarity === "Partly clear"
                  ? 1
                  : 0,
              record.participation_balance === "Significant difference"
                ? 2
                : record.participation_balance === "Some difference"
                  ? 1
                  : 0,
              record.delivery_status === "Blocked"
                ? 2
                : record.delivery_status === "Some risk"
                  ? 1
                  : 0,
              record.voice === "No" ? 2 : record.voice === "Sometimes" ? 1 : 0,
              record.teacher_support === "Yes"
                ? 2
                : record.teacher_support === "Maybe"
                  ? 1
                  : 0,
            ];
            return total + points.reduce((sum, point) => sum + point, 0);
          }, 0);
          const score =
            teamRecords.length === 0
              ? null
              : Math.round(
                  100 - (riskPoints / (teamRecords.length * 12)) * 100,
                );
          const level =
            score === null
              ? "insufficient"
              : score >= 75
                ? "warm"
                : score >= 50
                  ? "cool"
                  : "cold";
          const label =
            level === "warm"
              ? "Stable"
              : level === "cool"
                ? "Watch"
                : level === "cold"
                  ? "Attention"
                  : "No data";
          return { team, count: teamRecords.length, level, label, score };
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
      <div className="admin-shell">
        <aside className="admin-sidebar" aria-label="Teacher dashboard sections">
          <button type="button" className={adminView === "overview" ? "active" : ""} onClick={() => setAdminView("overview")}><ListChecks size={18}/><span><b>Overview</b><small>Block snapshot</small></span></button>
          <button type="button" className={adminView === "roster" ? "active" : ""} onClick={() => setAdminView("roster")}><Users size={18}/><span><b>Blocks & roster</b><small>Students and teams</small></span></button>
          <button type="button" className={adminView === "projects" ? "active" : ""} onClick={() => setAdminView("projects")}><Rocket size={18}/><span><b>Project setup</b><small>Catalogue & assignments</small></span></button>
          <button type="button" className={adminView === "sessions" ? "active" : ""} onClick={() => setAdminView("sessions")}><ClipboardCheck size={18}/><span><b>Session check-in</b><small>Open attendance</small></span></button>
          <button type="button" className={adminView === "records" ? "active" : ""} onClick={() => setAdminView("records")}><ClipboardCheck size={18}/><span><b>Activity management</b><small>Weeks, records & order</small></span></button>
          <a href="/" className="admin-sidebar-home">Back to student portal</a>
        </aside>
        <div className="admin-content">
      <section hidden={adminView !== "overview"} className="admin-overview" aria-labelledby="overview-title">
        <div className="admin-overview-heading">
          <div>
            <div className="eyebrow">Teaching block overview</div>
            <h2 id="overview-title">Your block at a glance.</h2>
            <p>Stable course information for planning, review and future block-level analysis.</p>
          </div>
          <label className="admin-block-filter">
            Teaching block
            <select
              value={selectedBlockId}
              onChange={(event) => {
                const nextBlockId = event.target.value;
                setSelectedBlockId(nextBlockId);
                void Promise.all([
                  loadDashboard(activeTable, nextBlockId),
                  loadOverview(nextBlockId),
                ]);
              }}
            >
              {teachingBlocks.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.academic_year} · {block.block_code}
                  {block.status === "active" ? " — Active" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="overview-stat-grid">
          {[
            ["Students", overviewCounts.students, "Current roster"],
            ["Teams", overviewCounts.teams, "Established groups"],
            ["Projects", overviewCounts.projects, "Project catalogue"],
            ["Assigned teams", overviewCounts.assignedTeams, "Teams linked to a project"],
          ].map(([label, value, note]) => (
            <article key={label}>
              <span>{label}</span>
              <b>{value ?? "—"}</b>
              <small>{note}</small>
            </article>
          ))}
        </div>
        <section className="ai-block-insights" aria-labelledby="ai-block-insights-title">
          <div className="ai-block-insights-icon"><Sparkles aria-hidden="true" /></div>
          <div>
            <span>Future intelligence layer</span>
            <h3 id="ai-block-insights-title">AI Block Insights</h3>
            <p>This space is reserved for block-level patterns, teaching reflections and suggested follow-up actions based on student, team, project and activity evidence.</p>
          </div>
          <strong>Coming soon</strong>
        </section>
      </section>
      <div hidden={adminView !== "roster"}><RosterManager /></div>
      <div hidden={adminView !== "projects"}><ProjectManager /></div>
      <div hidden={adminView !== "sessions"}><StudioSessionControl blockId={selectedBlockId} blocks={teachingBlocks} onBlockChange={setSelectedBlockId}/></div>
      <section hidden={adminView !== "records"} className="activity-workspace" aria-labelledby="activity-workspace-title">
        <div className="activity-workspace-heading">
          <div>
            <div className="eyebrow">Block activity operations</div>
            <h2 id="activity-workspace-title">Activity Management</h2>
            <p>Open weekly work, review student evidence and publish the presentation sequence from one workspace.</p>
          </div>
          <label className="admin-block-filter">Teaching block<select value={selectedBlockId} onChange={(event)=>{const nextBlockId=event.target.value;setSelectedBlockId(nextBlockId);void loadDashboard(activeTable,nextBlockId);}}>{teachingBlocks.map(block=><option key={block.id} value={block.id}>{block.academic_year} · {block.block_code}{block.status==="active"?" — Active":""}</option>)}</select></label>
        </div>
        <div className="activity-workspace-tabs" role="tablist" aria-label="Activity management views">
          <button type="button" role="tab" aria-selected={activityWorkspace === "weekly"} className={activityWorkspace === "weekly" ? "active" : ""} onClick={()=>setActivityWorkspace("weekly")}><CalendarPlus size={17}/><span><b>Weekly Activities</b><small>Activation and availability</small></span></button>
          <button type="button" role="tab" aria-selected={activityWorkspace === "records"} className={activityWorkspace === "records" ? "active" : ""} onClick={()=>setActivityWorkspace("records")}><ListChecks size={17}/><span><b>Student Records</b><small>Current evidence only</small></span></button>
          <button type="button" role="tab" aria-selected={activityWorkspace === "presentation"} className={activityWorkspace === "presentation" ? "active" : ""} onClick={()=>setActivityWorkspace("presentation")}><Presentation size={17}/><span><b>Presentation Order</b><small>Draft and publish</small></span></button>
        </div>
      </section>
      <section hidden={adminView !== "records" || activityWorkspace !== "weekly"} className="weekly-activity-preview" aria-labelledby="weekly-activities-title">
        <div className="workspace-section-heading"><div><div className="eyebrow">Weekly availability</div><h3 id="weekly-activities-title">Week 1–4 controls</h3><p>Activate the whole week when the class is ready. Every activity in that week follows the same block-based state.</p></div></div>
        <div className="week-management-grid">{[1,2,3,4].map(week=>{const isOpen=Boolean(weeklyStates[week]);return <article key={week} className={isOpen?"open":"closed"}><div><span>Week {week}</span><strong className={`activity-control-status ${isOpen?"open":"closed"}`}>{isOpen?"Active":"Closed"}</strong></div><b>{week === 3 ? "Peer review & engagement" : week === 2 ? "Pre-check & engagement" : week === 1 ? "Team health & engagement" : "Final delivery"}</b><small>{isOpen?"Students in this block can submit now.":"Students see these activities as locked."}</small><button type="button" className={isOpen?"danger":"primary"} disabled={weeklyBusy===week} onClick={()=>void setWeeklyState(week,!isOpen)}>{weeklyBusy===week?"Updating…":isOpen?`Close Week ${week}`:`Activate Week ${week}`}</button></article>})}</div>
        {weeklyMessage && <p className="activity-control-message" role="status" aria-live="polite">{weeklyMessage}</p>}
      </section>
      <section hidden={adminView !== "records" || activityWorkspace !== "presentation"} className="workspace-coming-soon" aria-labelledby="presentation-order-title"><Presentation aria-hidden="true"/><div><div className="eyebrow">Week 4 publishing</div><h3 id="presentation-order-title">Presentation Order</h3><p>The next focused implementation will load teams for this block, support draft reordering and publish a student-visible snapshot.</p></div><span className="activity-control-status scheduled">Next PR</span></section>
      <div hidden={adminView !== "records" || activityWorkspace !== "records"} className="activity-record-picker" aria-label="Current activity record views">
        {activityTables.map(({ table, label }) => (
          <button
            key={table}
            type="button"
            className={activeTable === table ? "active" : ""}
            aria-pressed={activeTable === table}
            onClick={() => {
              if (table === activeTable) return;
              setActiveTable(table);
              setAdminView("records");
              void loadDashboard(table);
            }}
          >
            <b>{counts[table] ?? "—"}</b>
            <span>{label}</span>
          </button>
        ))}
      </div>
      <section hidden={adminView !== "records" || activityWorkspace !== "records"} className="admin-records" aria-labelledby="activity-heading">
        <div className="admin-records-heading">
          <div>
            <div className="eyebrow">Student records</div>
            <h2 id="activity-heading">{activeActivity.title}</h2>
            <p>{activeActivity.description}</p>
            {activeTable === "week2_progress_reviews" ? (
              <p className="admin-management-note">
                Open one student at a time to compare the pre-check with the live demo and code, then save private feedback and follow-up.
              </p>
            ) : (
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
              onClick={() => void loadDashboard(activeTable, selectedBlockId)}
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
        {activeTable === "weekly_engagement_checkouts" && (
          <div className="checkout-week-filter" aria-label="Weekly check-out view">
            <span>View week</span>
            <div>
              {(["all", 1, 2, 3, 4] as const).map((week) => (
                <button
                  key={week}
                  type="button"
                  className={checkoutWeekFilter === week ? "active" : "secondary"}
                  aria-pressed={checkoutWeekFilter === week}
                  onClick={() => setCheckoutWeekFilter(week)}
                >
                  {week === "all" ? "All" : `Week ${week}`}
                </button>
              ))}
            </div>
          </div>
        )}
        {dataStatus === "success" && followUpWeek && (
          <section className="follow-up-continuity" aria-labelledby="follow-up-continuity-title">
            <div className="follow-up-continuity-heading">
              <div>
                <div className="eyebrow">Teacher follow-up continuity</div>
                <h3 id="follow-up-continuity-title">Week {followUpWeek} follow-up queue</h3>
                <p>
                  Unresolved private Teacher Reviews due by this week, matched
                  against the selected block’s Week {followUpWeek} evidence.
                </p>
              </div>
              <strong>{unresolvedFollowUps.length} open</strong>
            </div>
            {unresolvedFollowUps.length === 0 ? (
              <div className="follow-up-continuity-empty">
                <CheckCircle2 aria-hidden="true" />
                <span><b>No unresolved follow-up due.</b>Resolved work and reviews marked “No follow-up needed” stay out of this queue.</span>
              </div>
            ) : (
              <div className="follow-up-continuity-list">
                {unresolvedFollowUps.map((review) => {
                  const studentId = String(review.student_id);
                  const submitted = visibleRecords.some(
                    (record) =>
                      String(record.student_id).toLowerCase() === studentId.toLowerCase(),
                  );
                  const actions = Array.isArray(review.follow_up_actions)
                    ? review.follow_up_actions.map(String)
                    : [];
                  return (
                    <article key={review.id}>
                      <div className="follow-up-continuity-identity">
                        <b>{String(review.student_name)}</b>
                        <small>{studentId} · {String(review.team_name)}</small>
                      </div>
                      <span className={`follow-up-badge status-${String(review.follow_up_status).toLowerCase().replace(/\s+/g, "-")}`}>
                        {String(review.follow_up_status)}
                      </span>
                      <span className={`week-evidence-state ${submitted ? "submitted" : "missing"}`}>
                        {submitted ? `Week ${followUpWeek} submitted` : `Week ${followUpWeek} missing`}
                      </span>
                      <div className="follow-up-continuity-detail">
                        <p>{actions.join(" · ") || "Review the agreed follow-up action."}</p>
                        {Boolean(review.follow_up_note) && <small>{String(review.follow_up_note)}</small>}
                      </div>
                      <button
                        type="button"
                        className="secondary compact"
                        onClick={() => {
                          setActiveTable("week2_progress_reviews");
                          setOpenReviewStudentId(studentId);
                          void loadDashboard("week2_progress_reviews", selectedBlockId);
                        }}
                      >
                        Open evidence & review
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
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
              onClick={() => void loadDashboard(activeTable, selectedBlockId)}
            >
              Try again
            </button>
          </div>
        )}
        {dataStatus === "success" && activeTable === "team_health_checks" && records.length > 0 && (
          <div className="temperature-grid" aria-label="Team participation temperature">
            <div className="temperature-legend" aria-label="Temperature ranges">
              <span className="warm">75–100 Stable</span>
              <span className="cool">50–74 Watch</span>
              <span className="cold">0–49 Attention</span>
              <span className="insufficient">No responses</span>
            </div>
            {teamTemperatures.map(({ team, count, level, label, score }) => (
              <article className={`temperature-card ${level}`} key={team}>
                <div
                  className="thermometer"
                  role="img"
                  aria-label={`${team}: ${score === null ? "no data" : `${score}, ${label}`}`}
                >
                  <span style={{ height: `${score === null ? 8 : Math.max(score, 8)}%` }} />
                </div>
                <div>
                  <b>{team}</b>
                  <strong>{score === null ? "—" : score} · {label}</strong>
                  <small>
                    {count === 0
                      ? "No student responses"
                      : `${count} student ${count === 1 ? "response · Early signal" : "responses"}`}
                  </small>
                </div>
              </article>
            ))}
            <p className="temperature-note">
              Colour reflects the answers received; response count shows coverage.
              A single response is an early signal, not a whole-team conclusion.
              Participation temperature is descriptive only and is not an assessment result.
            </p>
          </div>
        )}
        {dataStatus === "success" && visibleRecords.length === 0 && (
          <div className="admin-state" role="status">
            <b>No {activeActivity.label} records yet</b>
            <span>
              {activeTable === "weekly_engagement_checkouts" && checkoutWeekFilter !== "all"
                ? `No Week ${checkoutWeekFilter} check-out has been submitted for this block.`
                : `Valid ${activeActivity.label.toLowerCase()} submissions will appear here.`}
            </span>
          </div>
        )}
        {dataStatus === "success" &&
          records.length > 0 &&
          activeTable === "week2_progress_reviews" && (
            <div className="student-review-list" aria-label="Student implementation reviews">
              {records.map((student) => {
                const studentId = String(student.student_id);
                const review = teacherReviews.find(
                  (item) => String(item.student_id).toLowerCase() === studentId.toLowerCase(),
                );
                const isOpen = openReviewStudentId === studentId;
                const status = String(review?.follow_up_status ?? "Not reviewed");
                const followUpActions = Array.isArray(review?.follow_up_actions)
                  ? review.follow_up_actions.map(String)
                  : [];
                const startingKey = aiSuggestionKey(studentId, "starting");
                const closingKey = aiSuggestionKey(studentId, "closing");
                const startingSuggestion = aiSuggestions[startingKey];
                const closingSuggestion = aiSuggestions[closingKey];
                return (
                  <article className={`student-review-card ${isOpen ? "open" : ""}`} key={student.id}>
                    <button
                      type="button"
                      className="student-review-summary"
                      aria-expanded={isOpen}
                      onClick={() => {
                        setTeacherReviewMessage("");
                        setOpenReviewStudentId(isOpen ? null : studentId);
                      }}
                    >
                      <span className="student-review-identity">
                        <b>{String(student.student_name)}</b>
                        <small>{studentId} · {String(student.team_name)}</small>
                      </span>
                      <span className="student-review-deliverable">
                        <small>Deliverable</small>
                        <b>{String(student.deliverable_area)}</b>
                      </span>
                      <span className={`follow-up-badge status-${status.toLowerCase().replace(/\s+/g, "-")}`}>
                        {status}
                      </span>
                      <ChevronDown aria-hidden="true" />
                    </button>
                    {isOpen && (
                      <div className="student-review-body">
                        <section className="student-precheck">
                          <div className="review-section-heading">
                            <div>
                              <span>Student submission · Read only</span>
                              <h3>Implementation Pre-check</h3>
                            </div>
                            <button
                              type="button"
                              className="danger compact"
                              onClick={() => {
                                setMutationMessage("");
                                setDeleteRecord(student);
                              }}
                            >
                              <Trash2 size={15} /> Reset submission
                            </button>
                          </div>
                          <dl className="review-evidence-grid">
                            {[
                              ["Project name", student.project_name],
                              ["Project area", student.project_area],
                              ["Project description", student.project_description],
                              ["Target user / problem", student.target_user_problem],
                              ["Implementation claim", student.implementation_item],
                              ["Current state", student.implementation_state],
                              ["Where to find it", student.work_location],
                              ["Evidence reference", student.evidence_reference],
                              ["Demonstration plan", student.demonstration_method],
                              ["Verification completed", student.verification_level],
                              ["Method to explain", Array.isArray(student.implementation_methods) ? student.implementation_methods.join(", ") : student.implementation_methods],
                              ["Remaining issue", student.remaining_issue],
                              ["Issue details", student.issue_note],
                              ["Next action", student.next_action],
                              ["Teacher should verify", student.teacher_verification],
                            ].map(([label, value]) => (
                              <div key={String(label)}>
                                <dt>{String(label)}</dt>
                                <dd>{formatValue("", value)}</dd>
                              </div>
                            ))}
                          </dl>
                        </section>
                        <details className="private-teacher-record">
                          <summary>
                            <span><small>Private teacher record</small><b>Review & Follow-up</b></span>
                            <span className="private-record-state">{review ? status : "Not started"} <ChevronDown aria-hidden="true" /></span>
                          </summary>
                          <form className="teacher-follow-up-form" onSubmit={(event) => saveTeacherReview(event, student)}>
                          <p className="private-record-note">Teacher-only working record. Keep this section closed while reviewing student-submitted evidence together.</p>
                          <div className="review-save-toolbar">
                            <div><small>Step 2 · Teacher review</small><b>Record the live verification, then save</b><span>{review ? `Last saved ${formatDateTime(String(review.updated_at))}` : "Not saved yet"}</span></div>
                            <button disabled={teacherReviewBusy}>{teacherReviewBusy ? "Saving…" : review ? "Update review" : "Save review"}</button>
                          </div>
                          <div className="teacher-review-grid">
                            <Choice label="Review outcome" name="review_outcome" options={["Verified","Partially verified","Not verified","Unable to demonstrate","Further evidence required"]} defaultValue={String(review?.review_outcome ?? "")} />
                            <Choice label="Demonstration result" name="demonstration_outcome" options={["Worked on target system","Worked with limitations","Partial demonstration","Could not demonstrate","Not applicable"]} defaultValue={String(review?.demonstration_outcome ?? "")} />
                            <Choice label="Method explanation" name="method_explanation" options={["Clear and credible","Mostly clear","Limited explanation","Could not explain"]} defaultValue={String(review?.method_explanation ?? "")} />
                            <Choice label="Evidence quality" name="evidence_quality" options={["Strong and traceable","Adequate","Partial","No usable evidence"]} defaultValue={String(review?.evidence_quality ?? "")} />
                            <Choice label="Individual contribution" name="contribution_verification" options={["Clearly verified","Partly verified","Needs further evidence","Not verified"]} defaultValue={String(review?.contribution_verification ?? "")} />
                            <Choice label="Progress Report alignment" name="report_alignment" options={["Consistent","Minor update needed","Significant update needed","Not checked"]} defaultValue={String(review?.report_alignment ?? "")} />
                            <Choice label="Follow-up status" name="follow_up_status" options={["Not reviewed","No follow-up needed","Action required","In progress","Recheck next session","Resolved"]} defaultValue={String(review?.follow_up_status ?? "Not reviewed")} />
                            <label>
                              Check again
                              <select name="recheck_week" defaultValue={String(review?.recheck_week ?? "")}>
                                <option value="">No scheduled recheck</option>
                                <option value="2">Week 2</option>
                                <option value="3">Week 3</option>
                                <option value="4">Week 4</option>
                              </select>
                            </label>
                          </div>
                          <section className="ai-teaching-panel" aria-label="AI teaching suggestions">
                            <div className="ai-teaching-intro">
                              <span className="ai-teaching-icon"><Sparkles aria-hidden="true" /></span>
                              <div>
                                <small>Step 1 · Before the teacher review</small>
                                <h4>AI review of the student submission</h4>
                                <p>This uses only the student's submitted Pre-check to suggest questions and evidence to verify. You do not need to save a teacher review first.</p>
                              </div>
                            </div>

                            <div className="ai-checkpoint ai-checkpoint-starting">
                              <div className="ai-teaching-heading">
                                <div>
                                  <small>Based on student submission only</small>
                                  <h4>Generate initial review</h4>
                                  <p>Get three possible review paths before recording your own verification.</p>
                                </div>
                                <button
                                  type="button"
                                  className="secondary compact"
                                  disabled={aiSuggestionBusyId === startingKey}
                                  onClick={() => void generateAiTeachingSuggestion(student, "starting")}
                                >
                                  <Sparkles size={15} />
                                  {aiSuggestionBusyId === startingKey
                                    ? "Thinking…"
                                    : startingSuggestion ? "Regenerate initial review" : "Generate initial review"}
                                </button>
                              </div>
                              {aiSuggestionMessages[startingKey] && (
                                <p className="ai-teaching-message" role="status">{aiSuggestionMessages[startingKey]}</p>
                              )}
                              {startingSuggestion && (
                                <div className="ai-path-workspace">
                                  <div className="ai-signal-strip">
                                    <span>Starting signal</span>
                                    <p>{startingSuggestion.signal}</p>
                                  </div>
                                  <p className="ai-path-instruction">Select one path to reveal its conversation prompts.</p>
                                  <div className="ai-path-list">
                                    {startingSuggestion.discussion_paths.map((path, index) => (
                                      <label className="ai-path-option" key={`${path.title}-${index}`}>
                                        <input
                                          type="radio"
                                          name="starting_discussion_path"
                                          value={path.title}
                                          defaultChecked={index === 0}
                                        />
                                        <span className="ai-path-number">{index + 1}</span>
                                        <span className="ai-path-copy">
                                          <strong>{path.title}</strong>
                                          <span>{path.focus}</span>
                                        </span>
                                        <ChevronDown className="ai-path-chevron" size={18} aria-hidden="true" />
                                        <span className="ai-path-detail">
                                          <span><b>Ask</b>{path.question}</span>
                                          <span><b>Check</b>{path.evidence_check}</span>
                                          <span><b>Teaching spark</b>{path.teaching_spark}</span>
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                  <button type="button" className="ai-dismiss-link" onClick={() => dismissAiSuggestion(studentId, "starting")}>
                                    Dismiss starting paths
                                  </button>
                                </div>
                              )}
                            </div>

                          </section>
                          <label className="teacher-conversation-note">
                            <span>Conversation note <small>Keep only what matters after the discussion</small></span>
                            <textarea name="teacher_feedback" required maxLength={800} defaultValue={String(review?.teacher_feedback ?? "")} placeholder="What did the student demonstrate? What changed after discussing the code, method or evidence?" />
                          </label>
                          <fieldset className="choice-checklist follow-up-actions">
                            <legend>Agreed follow-up action (select all that apply)</legend>
                            {["No action required","Complete implementation","Fix identified issue","Provide code or commit evidence","Add or run tests","Complete integration","Update Progress Report","Clarify individual contribution","Prepare another demonstration","Other"].map((action) => (
                              <label key={action}>
                                <input type="checkbox" name="follow_up_actions" value={action} defaultChecked={followUpActions.includes(action)} />
                                <span>{action}</span>
                              </label>
                            ))}
                          </fieldset>
                          <label>
                            Follow-up note (optional)
                            <textarea name="follow_up_note" maxLength={400} defaultValue={String(review?.follow_up_note ?? "")} placeholder="Add the concrete action, owner or evidence expected at the next check." />
                          </label>
                          {teacherReviewMessage && <p className="admin-alert" role="status">{teacherReviewMessage}</p>}
                          <div className="review-save-row">
                            <small>{review ? `Last saved ${formatDateTime(String(review.updated_at))}` : "No teacher review recorded yet"}</small>
                            <button disabled={teacherReviewBusy}>{teacherReviewBusy ? "Saving…" : review ? "Update review" : "Save review"}</button>
                          </div>
                          <section className={`ai-teaching-panel ai-after-review ${review ? "" : "is-locked"}`} aria-label="AI summary after saved teacher review">
                            <div className="ai-teaching-intro">
                              <span className="ai-teaching-icon"><Sparkles aria-hidden="true" /></span>
                              <div>
                                <small>Step 3 · After the saved teacher review</small>
                                <h4>Generate summary and next-step suggestions</h4>
                                <p>This compares the student's Pre-check with your saved verification, Conversation note and follow-up record.</p>
                              </div>
                            </div>
                            <div className="ai-checkpoint ai-checkpoint-closing">
                              <div className="ai-teaching-heading">
                                <div>
                                  <small>{review ? "Saved review ready" : "Save Step 2 first"}</small>
                                  <h4>What changed, and what comes next?</h4>
                                  <p>{review ? "Generate an evidence-based summary and three practical next moves." : "Complete and save the teacher review to activate this summary."}</p>
                                </div>
                                <button
                                  type="button"
                                  className="secondary compact"
                                  disabled={!review || aiSuggestionBusyId === closingKey}
                                  onClick={() => void generateAiTeachingSuggestion(student, "closing", review)}
                                >
                                  <Sparkles size={15} />
                                  {aiSuggestionBusyId === closingKey
                                    ? "Thinking…"
                                    : closingSuggestion ? "Regenerate summary" : "Generate summary"}
                                </button>
                              </div>
                              {aiSuggestionMessages[closingKey] && (
                                <p className="ai-teaching-message" role="status">{aiSuggestionMessages[closingKey]}</p>
                              )}
                              {closingSuggestion && (
                                <div className="ai-closing-workspace">
                                  <div className="ai-review-timeline">
                                    <div><span>Student submission</span><p>{startingSuggestion?.signal || "Student Pre-check captured"}</p></div>
                                    <ArrowRight aria-hidden="true" />
                                    <div><span>Teacher review</span><p>{closingSuggestion.question_or_clarification}</p></div>
                                    <ArrowRight aria-hidden="true" />
                                    <div className="changed"><span>Summary</span><p>{closingSuggestion.what_changed_after_review}</p></div>
                                  </div>
                                  <div className="ai-closing-message">
                                    <strong>{closingSuggestion.signal}</strong>
                                    <p>{closingSuggestion.teaching_message}</p>
                                  </div>
                                  <fieldset className="ai-next-step-list">
                                    <legend>Choose a suggested next step</legend>
                                    {closingSuggestion.next_step_options.map((step, index) => (
                                      <label key={`${step.title}-${index}`}>
                                        <input type="radio" name="closing_next_step" value={step.action} defaultChecked={index === 0} />
                                        <span><strong>{step.title}</strong>{step.action}</span>
                                      </label>
                                    ))}
                                  </fieldset>
                                  <div className="ai-suggestion-actions">
                                    <button type="button" onClick={(event) => useAiSuggestion(studentId, event.currentTarget.form!, closingSuggestion)}>Use selected next step</button>
                                    <button type="button" className="secondary" onClick={() => dismissAiSuggestion(studentId, "closing")}>Dismiss</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </section>
                        </form>
                        </details>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        {dataStatus === "success" &&
          visibleRecords.length > 0 &&
          activeTable !== "week2_progress_reviews" && (
          <div className="admin-table-wrap">
            <table>
              <caption>
                {visibleRecords.length} {activeActivity.label}{" "}
                {visibleRecords.length === 1 ? "record" : "records"}, newest first
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
                {visibleRecords.map((record) => (
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
        </div>
      </div>
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
                    <textarea name={field} defaultValue={String(editRecord[field] ?? "")} maxLength={maxLength} required={!["additional_feedback", "evidence_reference", "discussion_note", "issue_note", "risk_note", "detail_note"].includes(field)} />
                  ) : (
                    <input name={field} defaultValue={String(editRecord[field] ?? "")} maxLength={maxLength} required />
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
            <h2 id="delete-record-title">{activeTable === "week2_progress_reviews" ? "Reset this submission?" : "Delete this record?"}</h2>
            <p>{activeTable === "week2_progress_reviews"
              ? "This removes the student’s Pre-check and related private teacher follow-up so they can submit again. This action cannot be undone."
              : `This permanently removes the selected ${activeActivity.label.toLowerCase()} record. This action cannot be undone.`}</p>
            <dl className="delete-summary">
              {activeActivity.columns.slice(0, 3).map(([field, label]) => (
                <div key={field}><dt>{label}</dt><dd>{formatValue(field, deleteRecord[field])}</dd></div>
              ))}
            </dl>
            {mutationMessage && <p className="admin-alert error" role="alert">{mutationMessage}</p>}
            <div className="admin-dialog-actions">
              <button type="button" className="secondary" onClick={() => setDeleteRecord(null)} disabled={mutationBusy}>Cancel</button>
              <button type="button" className="danger" onClick={confirmDelete} disabled={mutationBusy}>
                <Trash2 size={16} /> {mutationBusy ? "Updating…" : activeTable === "week2_progress_reviews" ? "Reset submission" : "Delete record"}
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
    {location.pathname.startsWith("/admin")
      ? <Admin />
      : location.pathname.startsWith("/student")
        ? <StudentAccess>{(student) => <StudentPortal student={student}/>}</StudentAccess>
        : <PublicLanding />}
  </StrictMode>,
);
