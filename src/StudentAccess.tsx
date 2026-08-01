import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createClient, type Session } from "@supabase/supabase-js";
import { CheckCircle2, LogOut } from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "https://gwihaizxivclamzehupk.supabase.co",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_-RPm45eBd8_CVaNk4GbXhg_nxOkMrLr",
);

type Context = {
  status: "ready" | "activated";
  studentId: string;
  studentName: string;
  blockId: string;
  blockLabel: string;
  teamName: string;
  projectName: string | null;
  projectProblem: string | null;
  projectDescription: string | null;
  projectTargetUsers: string | null;
  projectExpectedOutcomes: string | null;
  projectCategory: string | null;
  projectDifficulty: string | null;
  projectSource: "catalogue" | "roster" | "none";
  checkinRecognised: boolean;
  studioSession?: StudioSession | null;
  checkInToSession?: () => Promise<void>;
  sessionCheckinBusy?: boolean;
};

type StudioSession = {
  sessionId: string;
  title: string;
  sessionDate: string;
  checkedInAt: string | null;
};

export function StudentAccess({ children }: { children: ReactNode | ((context: Context) => ReactNode) }) {
  const [session, setSession] = useState<Session | null>(null);
  const [context, setContext] = useState<Context | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [studioSession, setStudioSession] = useState<StudioSession | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) return setContext(null);
    supabase.rpc("get_my_student_context").then(async ({ data, error }) => {
      if (error) setMessage("Your roster context could not be resolved. Ask your teacher to check the active block.");
      else {
        setContext(data as Context);
        const { data: sessionData } = await supabase.rpc("get_my_open_studio_session");
        setStudioSession((sessionData as StudioSession | null) || null);
      }
    });
  }, [session]);

  useEffect(() => {
    if (!session || context?.status !== "activated") return;
    const refresh = () => {
      void supabase.rpc("get_my_open_studio_session").then(({ data }) =>
        setStudioSession((data as StudioSession | null) || null),
      );
    };
    const timer = window.setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [session, context?.status]);

  async function checkInToSession() {
    if (!studioSession) return;
    setBusy(true); setMessage("");
    const { data, error } = await supabase.rpc("check_in_to_studio_session", {
      p_session_id: studioSession.sessionId,
    });
    if (error) setMessage("Check-in could not be completed. Ask your teacher to confirm that this session is still open.");
    else {
      setStudioSession({ ...studioSession, checkedInAt: String(data) });
      window.dispatchEvent(new CustomEvent("student-session-checkin"));
    }
    setBusy(false);
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/student-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: values.student_id, password: values.password }),
    });
    const result = await response.json();
    if (response.ok) {
      const { data, error } = await supabase.auth.setSession({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
      });
      if (error) setMessage("Login could not be completed.");
      else setSession(data.session);
    } else setMessage(result.error || "Student ID or password is incorrect.");
    setBusy(false);
  }

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (String(values.password).length < 10 || values.password !== values.confirm_password) {
      setMessage("Use at least 10 characters and enter the same password twice.");
      setBusy(false); return;
    }
    const { error: passwordError } = await supabase.auth.updateUser({ password: String(values.password) });
    const { data, error } = passwordError
      ? { data: null, error: passwordError }
      : await supabase.rpc("complete_student_activation", {
          p_goal: context?.checkinRecognised ? null : String(values.goal || "").trim(),
        });
    if (error) setMessage("Activation could not be completed. Check the recovery goal or ask your teacher for help.");
    else setContext(data as Context);
    setBusy(false);
  }

  async function recover(studentId: string) {
    setBusy(true);
    const response = await fetch("/api/student-recovery", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });
    const result = await response.json();
    setMessage(result.message); setBusy(false);
  }

  async function saveRecoveredPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (String(values.password).length < 10 || values.password !== values.confirm_password) {
      setMessage("Use at least 10 characters and enter the same password twice.");
    } else {
      const { error } = await supabase.auth.updateUser({ password: String(values.password) });
      if (error) setMessage("Your password could not be updated. Request a new recovery link.");
      else { setRecovering(false); setMessage(""); }
    }
    setBusy(false);
  }

  if (loading) return <main className="student-access"><p>Restoring your session…</p></main>;
  if (recovering && session) return <main className="student-access"><section className="access-card">
    <div className="eyebrow">Account recovery</div><h1>Choose a new password</h1>
    <form onSubmit={saveRecoveredPassword}><label>New password<input name="password" type="password" minLength={10} required autoComplete="new-password"/></label><label>Confirm password<input name="confirm_password" type="password" minLength={10} required autoComplete="new-password"/></label>{message&&<p className="admin-alert" role="status">{message}</p>}<button disabled={busy}>{busy?"Saving…":"Save password"}</button></form>
  </section></main>;
  if (!session) return <main className="student-access"><section className="access-card">
    <div className="eyebrow">NIT3004 Engineering Studio</div><h1>Student login</h1>
    <p>Use the Student ID and individual password provided by your teacher. There is no public registration.</p>
    <form onSubmit={login}><label>Student ID<input name="student_id" required autoComplete="username"/></label>
      <label>Password<input name="password" type="password" required autoComplete="current-password"/></label>
      {message && <p className="admin-alert" role="status">{message}</p>}
      <button disabled={busy}>{busy ? "Signing in…" : "Log in"}</button>
      <button type="button" className="secondary" disabled={busy} onClick={(event) => {
        const form = event.currentTarget.form;
        void recover(String(new FormData(form || undefined).get("student_id") || ""));
      }}>Forgot password</button>
    </form>
    <a href="/">Back to course information</a>
  </section></main>;
  if (!context) return <main className="student-access"><p>{message || "Loading your project context…"}</p><button className="secondary" onClick={() => void supabase.auth.signOut()}>Sign out</button></main>;
  if (context.status === "ready") return <main className="student-access"><section className="access-card">
    <div className="eyebrow">Account Activation & Check-in</div><h1>Welcome, {context.studentName}</h1>
    <dl><div><dt>Teaching block</dt><dd>{context.blockLabel}</dd></div><div><dt>Team</dt><dd>{context.teamName}</dd></div><div><dt>Project</dt><dd>{context.projectName || "Not assigned yet"}</dd></div></dl>
    <p>{context.checkinRecognised ? "Your earlier Week 1 Check-in has been recognised. You do not need to submit it again." : "Complete one short recovery check to activate your account."}</p>
    <form onSubmit={activate}>
      {!context.checkinRecognised && <label>What is your main four-week delivery goal?<textarea name="goal" required minLength={3} maxLength={800}/></label>}
      <label>Choose a personal password<input name="password" type="password" required minLength={10} autoComplete="new-password"/></label>
      <label>Confirm password<input name="confirm_password" type="password" required minLength={10} autoComplete="new-password"/></label>
      {message && <p className="admin-alert" role="status">{message}</p>}<button disabled={busy}>{busy ? "Activating…" : "Activate and continue"}</button>
    </form>
  </section></main>;
  return <>
    <div className="student-session-bar">
      <span>{context.studentName} · {context.teamName} · {context.projectName || "Project pending"}</span>
      <button className="secondary compact" onClick={() => void supabase.auth.signOut()}><LogOut size={15}/>Sign out</button>
    </div>
    {message && <p className="student-session-message admin-alert" role="status">{message}</p>}
    {typeof children === "function"
      ? children({
          ...context,
          studioSession,
          checkInToSession,
          sessionCheckinBusy: busy,
        })
      : children}
  </>;
}
