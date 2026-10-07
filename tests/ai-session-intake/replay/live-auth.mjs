// Local-only auth + resolved-context helper for the T1 live baseline.
// Signs in the isolated fixture student against the LOCAL Supabase stack and
// returns a bearer token (never printed). Also probes the endpoint's resolved
// context via a mode:"turn" request so we can verify project/module context
// matches T1 BEFORE spending on the full trajectory.
//
// Exports: getStudentToken(), probeResolvedContext(token, sessionId)

import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";

const status = JSON.parse(execSync("supabase status -o json", { encoding: "utf8" }));
const API_URL = status.API_URL;
const ANON_KEY = status.ANON_KEY;
if (!API_URL || !/^http:\/\/(127\.0\.0\.1|localhost)/.test(API_URL)) {
  throw new Error("local stack only");
}
const FIXTURE_PASSWORD = "Student123!"; // fixture-generated, local test only

export async function getStudentToken(studentId = process.env.INTAKE_STUDENT_ID || "t1bench01") {
  const email = `${studentId}@student.vu.edu.au`;
  const client = createClient(API_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password: FIXTURE_PASSWORD });
  if (error || !data?.session?.access_token) throw new Error(`sign-in failed: ${error?.message || "no token"}`);
  return data.session.access_token; // returned to caller; never logged
}

const API_BASE = process.env.INTAKE_API_BASE || "http://localhost:3010";

// A minimal one-turn request whose response echoes sessionContext scope via the
// endpoint. The endpoint does not return sessionContext directly, so we assert
// on acceptance (200) + that the turn resolved (no context error) and capture the
// manifest/usage. To read the resolved scope explicitly we use a dry probe: send
// a first-turn conversation and inspect that the endpoint accepted the student's
// 2B2 T1 session (a context mismatch would 403 with a context code).
export async function probeResolvedContext(token, sessionId) {
  const body = {
    mode: "turn", sessionId,
    // invalid: ends in an assistant turn, so conversation validation fails AFTER
    // context resolution but BEFORE the provider call (no paid tokens).
    conversation: [
      { actor: "assistant", text: "This is S1. What did you personally work on?" },
    ],
    answers: {}, capturedFields: [],
  };
  const resp = await fetch(`${API_BASE}/api/session-intake-ai`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await resp.json().catch(() => ({}));
  return { status: resp.status, code: json.code || null, stage: json.stage || null, error: json.error || null };
}
