// Integration driver for the AI Session Intake endpoint.
//
// This is NOT a unit test. It exercises the SAME path a student's browser
// uses: it logs in a seeded mock student through /api/student-login to get a
// real Supabase access token, resolves a real 2B2 Session id from the local
// Supabase stack, then drives the real /api/session-intake-ai endpoint turn by
// turn — including the real LLM when OPENAI_API_KEY is configured on the
// server. It asserts the endpoint's *contract* (routes, budget ceiling,
// fallback, locked history, no fabricated fields), not exact model wording,
// so it stays stable across model/prompt drift.
//
// Secrets: the OpenAI key lives only on the server (api/*.ts reads
// process.env). This client never reads, logs, or transmits it. The Supabase
// service-role key is read from the environment for read-only fixture lookups
// and is never printed.

import { createClient } from "@supabase/supabase-js";

const API_BASE = process.env.INTAKE_API_BASE || "http://127.0.0.1:3010";
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PILOT_BLOCK_CODE = "2B2";

// Matches the seed fixture (scripts/seed-local-testdata.mjs).
export const MOCK_PASSWORD = "Student123!";
export const MOCK_STUDENTS = {
  s1001: { team: 1 },
  s1002: { team: 1 },
  s1005: { team: 2 },
  s1009: { team: 3 },
};

let adminClient = null;
function admin() {
  if (!SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Run integration tests through the " +
        "orchestration script (npm run test:integration) which exports .env.local.",
    );
  }
  if (!adminClient) {
    adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

/** Log in a seeded mock student and return a real access token. */
export async function loginStudent(studentId, password = MOCK_PASSWORD) {
  const res = await fetch(`${API_BASE}/api/student-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.accessToken) {
    throw new Error(
      `Login failed for ${studentId} (HTTP ${res.status}). ` +
        `Is the fixture seeded and the API server running? ${body.error || ""}`,
    );
  }
  return body.accessToken;
}

/** Resolve the Session UUID for a given S-number in the active 2B2 block. */
export async function resolveSessionId(sessionNumber) {
  const { data: block, error: blockErr } = await admin()
    .from("teaching_blocks")
    .select("id")
    .eq("block_code", PILOT_BLOCK_CODE)
    .eq("status", "active")
    .maybeSingle();
  if (blockErr || !block) {
    throw new Error(`Active ${PILOT_BLOCK_CODE} block not found — seed the fixture first.`);
  }
  const { data: session, error: sessErr } = await admin()
    .from("studio_sessions")
    .select("id,session_number,intake_access")
    .eq("block_id", block.id)
    .eq("session_number", sessionNumber)
    .maybeSingle();
  if (sessErr || !session) {
    throw new Error(`Session S${sessionNumber} not found in ${PILOT_BLOCK_CODE}.`);
  }
  return session.id;
}

/**
 * One raw call to the intake endpoint. `mode` is "turn" | "questions" |
 * "extract". Returns { status, body }.
 */
export async function callIntake({ token, sessionId, mode, conversation, answers, capturedFields }) {
  const payload = { mode, sessionId };
  if (conversation) payload.conversation = conversation;
  if (answers) payload.answers = answers;
  if (capturedFields) payload.capturedFields = capturedFields;
  const res = await fetch(`${API_BASE}/api/session-intake-ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * Drives a multi-turn conversation the way src/main.tsx does. The real UI
 * seeds a leading `system` "session starting point" turn, then each student
 * message is `{actor:"student", purpose:"student response"}` and each assistant
 * reply is appended back as `{actor:"system", purpose:<route>}`. The endpoint's
 * validator (intakePolicy.conversationErrors) enforces strict alternation:
 * even index = system, odd index = student, and the last turn must be student.
 *
 * `studentTurns` is an array of student message strings. The loop continues
 * until the endpoint signals review, a terminal route, or we run out of
 * scripted answers. Returns the ordered list of { student, response } steps.
 */
export async function runConversation({
  token,
  sessionId,
  studentTurns,
  openingQuestion = "What did you personally complete or advance since the previous Session?",
  maxTurns = 12,
}) {
  // Leading system turn, mirroring main.tsx's setTurns([{actor:"system",...}]).
  const conversation = [
    { actor: "system", purpose: "session starting point", text: openingQuestion },
  ];
  const steps = [];
  for (let i = 0; i < studentTurns.length && steps.length < maxTurns; i += 1) {
    conversation.push({ actor: "student", purpose: "student response", text: studentTurns[i] });
    const { status, body } = await callIntake({
      token,
      sessionId,
      mode: "turn",
      conversation: conversation.slice(),
    });
    steps.push({ student: studentTurns[i], status, body });
    const result = body?.result;
    if (status !== 200) break;
    // Append the assistant reply as a system turn so the next student answer
    // keeps the strict system/student alternation the validator requires.
    if (result?.assistantMessage) {
      conversation.push({
        actor: "system",
        purpose: result.route || "clarification",
        text: result.assistantMessage,
      });
    }
    if (result?.readyForReview) break;
    const terminalRoutes = ["review", "teacher_help"];
    if (terminalRoutes.includes(result?.route)) break;
  }
  return steps;
}

/**
 * Builds a minimal VALID conversation (leading system question + one student
 * answer) that satisfies intakePolicy.conversationErrors' alternation rule.
 */
export function minimalConversation(studentText, openingQuestion = "What did you work on since the previous Session?") {
  return [
    { actor: "system", purpose: "session starting point", text: openingQuestion },
    { actor: "student", purpose: "student response", text: studentText },
  ];
}

/** True if the server has a real OpenAI key configured (probe by a turn call). */
export async function providerConfigured(token, sessionId) {
  const { status, body } = await callIntake({
    token,
    sessionId,
    mode: "turn",
    conversation: minimalConversation("I made some progress on the project."),
  });
  // 503 missing_api_key is the only signal that the provider is unconfigured.
  if (status === 503 && body?.code === "missing_api_key") return false;
  return true;
}
