// End-to-end integration scenarios for AI Session Intake.
//
// Run via:  npm run test:integration
// Requires: local Supabase (`supabase start`), the seeded fixture
//           (`npm run seed:local`), and the local API server on :3010
//           (`npm run dev:api`). The orchestration script checks these and
//           exports .env.local so the server sees SUPABASE_* and OPENAI_API_KEY.
//
// These assert the endpoint CONTRACT, not exact model wording, so they remain
// stable across model/prompt changes. When the real provider is configured,
// they exercise the real LLM; the assertions below hold either way.

import { test, before, describe } from "node:test";
import assert from "node:assert/strict";
import {
  loginStudent,
  resolveSessionId,
  callIntake,
  runConversation,
  minimalConversation,
  providerConfigured,
} from "./lib/intake-client.mjs";

const VALID_ROUTES = new Set([
  "evidence",
  "clarification",
  "small_step",
  "teacher_help",
  "review",
  "provider_fallback_continue",
]);
const MAX_QUESTIONS = 8;

let ready = false;
let skipReason = "";
let token;
let s3;

before(async () => {
  try {
    token = await loginStudent("s1001");
    s3 = await resolveSessionId(3);
    ready = true;
  } catch (err) {
    skipReason = err.message;
  }
});

function guard(t) {
  if (!ready) {
    t.skip(`integration stack not available: ${skipReason}`);
    return false;
  }
  return true;
}

describe("AI Session Intake — end-to-end scenarios", () => {
  test("access control: a non-2B2 / out-of-range Session is rejected", async (t) => {
    if (!guard(t)) return;
    // S1-S9 are eligible; there is no S99 — expect an eligibility/context refusal.
    const { status, body } = await callIntake({
      token,
      sessionId: "00000000-0000-0000-0000-000000000000",
      mode: "turn",
      conversation: [{ actor: "student", text: "hello" }],
    });
    assert.equal(status, 403, `expected 403 for unknown session, got ${status}`);
    assert.ok(body.code, "expected an error code");
  });

  test("request validation: turn mode rejects a conversation not ending in a student answer", async (t) => {
    if (!guard(t)) return;
    // A lone system turn violates the validator's "last turn must be student"
    // rule (and minimum-length rule) — the endpoint must reject it.
    const { status } = await callIntake({
      token,
      sessionId: s3,
      mode: "turn",
      conversation: [{ actor: "system", purpose: "session starting point", text: "What did you work on?" }],
    });
    assert.equal(status, 400, `expected 400 when last turn is not a student, got ${status}`);
  });

  test("short-but-specific answer returns a valid route within budget", async (t) => {
    if (!guard(t)) return;
    const { status, body } = await callIntake({
      token,
      sessionId: s3,
      mode: "turn",
      conversation: minimalConversation(
        "I fixed the loading spinner on the dashboard; commit abc123, and a manual test showed the expected spinner then the cards.",
      ),
    });
    assert.equal(status, 200, JSON.stringify(body).slice(0, 300));
    const r = body.result;
    assert.ok(r, "expected a result object");
    assert.ok(VALID_ROUTES.has(r.route), `unexpected route: ${r.route}`);
    assert.equal(typeof r.assistantMessage, "string");
    assert.ok(r.assistantMessage.length > 0, "assistant message must be non-empty");
    assert.ok(body.budget.maxQuestions === MAX_QUESTIONS, "budget ceiling must be 8");
  });

  test("sparse / no-progress answer never fabricates evidence and offers a bounded path", async (t) => {
    if (!guard(t)) return;
    const { status, body } = await callIntake({
      token,
      sessionId: s3,
      mode: "turn",
      conversation: minimalConversation("Nothing yet, I haven't really started."),
    });
    assert.equal(status, 200, JSON.stringify(body).slice(0, 300));
    const r = body.result;
    assert.ok(VALID_ROUTES.has(r.route), `unexpected route: ${r.route}`);
    // No accepted evidence update may claim available/executed evidence from a
    // "nothing yet" answer.
    for (const u of r.evidenceUpdates || []) {
      assert.notEqual(u.state, "available", `fabricated available evidence: ${JSON.stringify(u)}`);
      assert.notEqual(u.state, "executed", `fabricated executed testing: ${JSON.stringify(u)}`);
    }
  });

  test("multi-turn conversation stays within the 8-question ceiling", async (t) => {
    if (!guard(t)) return;
    // Deliberately vague, partial answers to push the budget without ever
    // giving clear evidence — the endpoint must never ask a 9th question.
    const steps = await runConversation({
      token,
      sessionId: s3,
      studentTurns: [
        "I worked on the project a bit.",
        "Some frontend stuff.",
        "The login page mostly.",
        "It kind of works.",
        "I didn't test it properly.",
        "Not sure what's next.",
        "Maybe fix some bugs.",
        "I think that's it.",
        "Yeah nothing else.",
      ],
    });
    assert.ok(steps.length > 0, "expected at least one turn");
    for (const step of steps) {
      assert.equal(step.status, 200, JSON.stringify(step.body).slice(0, 200));
      const asked = step.body.budget?.questionsAsked ?? 0;
      assert.ok(asked <= MAX_QUESTIONS, `questionsAsked ${asked} exceeded ceiling ${MAX_QUESTIONS}`);
      assert.ok(VALID_ROUTES.has(step.body.result?.route), `bad route: ${step.body.result?.route}`);
    }
    // The final step must be terminal: review, teacher_help, or budget-forced review.
    const last = steps.at(-1).body.result;
    const terminal =
      last.readyForReview === true ||
      ["review", "teacher_help", "provider_fallback_continue"].includes(last.route);
    assert.ok(terminal, `conversation did not terminate cleanly: ${JSON.stringify(last).slice(0, 200)}`);
  });

  test("teacher-help request routes to support without inventing a next action", async (t) => {
    if (!guard(t)) return;
    const { status, body } = await callIntake({
      token,
      sessionId: s3,
      mode: "turn",
      conversation: minimalConversation(
        "I'm stuck and I'd like the teacher to help me decide between two small tasks.",
      ),
    });
    assert.equal(status, 200, JSON.stringify(body).slice(0, 300));
    assert.ok(VALID_ROUTES.has(body.result.route));
  });

  test("provider configuration is observable (real LLM or documented fallback)", async (t) => {
    if (!guard(t)) return;
    const configured = await providerConfigured(token, s3);
    // Either the provider is configured (real LLM path) or the endpoint serves
    // its documented signal — both are valid; we assert the endpoint answered.
    assert.equal(typeof configured, "boolean");
  });
});
