import { test, after } from "node:test";
import assert from "node:assert/strict";
import { handleCoreReviewGeneration as handler } from "../../.test-api/server/coreReviewGeneration.js";
const original = global.fetch;
after(() => (global.fetch = original));
process.env.SUPABASE_URL = "https://database.example.invalid";
process.env.SUPABASE_PUBLISHABLE_KEY = "test-key";
process.env.OPENAI_API_KEY = "test-provider-key";
const intakeId = "10000000-0000-0000-0000-000000000001",
  lease = "20000000-0000-0000-0000-000000000001";
const guide = {
  progress: "Student reports interface work.",
  feedback: "Check the implementation.",
  questions: [
    "Show your change.",
    "Explain the data flow.",
    "Which test covers it?",
  ],
};
const points = {
  confirmedProgress: ["You showed the interface."],
  mainIssues: ["Testing was not verified."],
  nextSteps: [],
  clarification: "",
};
async function invoke(body = { intakeId, action: "prepare" }, method = "POST") {
  const res = {
    code: 200,
    setHeader() {},
    status(n) {
      this.code = n;
      return this;
    },
    json(v) {
      this.body = v;
      return this;
    },
  };
  await handler(
    { method, headers: { authorization: "Bearer teacher-token" }, body },
    res,
  );
  return res;
}
function database(url) {
  return String(url).includes("database.example.invalid");
}
test("reopening saved, pending or failed preparation does not call the model", async () => {
  for (const state of ["ready", "pending", "failed", "interrupted"]) {
    let calls = 0;
    global.fetch = async (url, init) => {
      assert.ok(database(url));
      calls++;
      assert.ok(String(url).includes("claim_core_review_generation"));
      assert.equal(init.headers.get("Authorization"), "Bearer teacher-token");
      return new Response(
        JSON.stringify({
          state,
          result: state === "ready" ? guide : undefined,
        }),
      );
    };
    const r = await invoke();
    assert.equal(r.code, state === "pending" ? 202 : 200);
    assert.equal(r.body.state, state);
    assert.equal(calls, 1);
  }
});
test("first preparation uses server context and stores exactly three ranked questions before returning", async () => {
  let provider = 0,
    stored = false;
  const source = { currentSession: 5, baselineSession: 3, updates: [] };
  global.fetch = async (url, init) => {
    if (database(url)) {
      const b = JSON.parse(init.body);
      if (String(url).includes("claim_")) {
        assert.deepEqual(b, {
          p_intake_id: intakeId,
          p_kind: "preparation",
          p_refresh: false,
        });
        return new Response(
          JSON.stringify({ state: "claimed", lease, source }),
        );
      }
      assert.equal(b.p_lease, lease);
      assert.equal(b.p_result.questions.length, 3);
      stored = true;
      return new Response("true");
    }
    provider++;
    const b = JSON.parse(init.body);
    assert.equal(b.store, false);
    assert.equal(b.input, JSON.stringify(source));
    assert.match(b.instructions, /unverified self-reports/);
    assert.equal(b.text.format.schema.properties.questions.minItems, 3);
    return new Response(JSON.stringify({ output_text: JSON.stringify(guide) }));
  };
  const r = await invoke({ intakeId, action: "prepare", history: "forged" });
  assert.equal(r.code, 200);
  assert.equal(provider, 1);
  assert.equal(stored, true);
  assert.equal(r.body.result.baselineSession, 3);
});
test("observation formatter uses saved teacher text and makes next steps optional", async () => {
  const source = {
    teacherObservation: "Saw the UI; tests not checked.",
    studentName: "Test Student",
    summaryRevision: 1,
  };
  let finished = false;
  global.fetch = async (url, init) => {
    const b = JSON.parse(init.body);
    if (database(url)) {
      if (String(url).includes("claim_"))
        return new Response(
          JSON.stringify({ state: "claimed", lease, source }),
        );
      assert.deepEqual(b.p_result, points);
      finished = true;
      return new Response("true");
    }
    assert.equal(b.input, JSON.stringify(source));
    assert.match(b.instructions, /ONLY teacherObservation/);
    assert.match(b.instructions, /NEXT STEPS ARE OPTIONAL/);
    assert.match(b.instructions, /critical attribution/);
    return new Response(
      JSON.stringify({ output_text: JSON.stringify(points) }),
    );
  };
  const r = await invoke({
    intakeId,
    action: "feedback",
    teacherObservation: "forged",
  });
  assert.equal(r.code, 200);
  assert.deepEqual(r.body.result.nextSteps, []);
  assert.equal(finished, true);
});
test("malformed, empty and overlong output is not stored as a ready result; failure is recorded", async () => {
  const invalid = [
    { ...guide, questions: ["Only one"] },
    { ...guide, questions: ["x".repeat(161), "Second", "Third"] },
  ];
  for (const output of invalid) {
    let failed = false;
    global.fetch = async (url, init) => {
      if (database(url)) {
        const b = JSON.parse(init.body);
        if (String(url).includes("claim_"))
          return new Response(
            JSON.stringify({
              state: "claimed",
              lease,
              source: { currentSession: 1, baselineSession: null },
            }),
          );
        assert.equal(b.p_result, null);
        assert.equal(b.p_error, "unavailable");
        failed = true;
        return new Response("true");
      }
      return new Response(
        JSON.stringify({ output_text: JSON.stringify(output) }),
      );
    };
    assert.equal((await invoke()).code, 502);
    assert.equal(failed, true);
  }
});
test("formatter can request one critical clarification without publishing or inventing points", async () => {
  const question = {
    confirmedProgress: [],
    mainIssues: [],
    nextSteps: [],
    clarification: "Which student explained this code?",
  };
  global.fetch = async (url, init) =>
    database(url)
      ? new Response(
          JSON.stringify(
            String(url).includes("claim_")
              ? {
                  state: "claimed",
                  lease,
                  source: { teacherObservation: "They explained it." },
                }
              : true,
          ),
        )
      : new Response(JSON.stringify({ output_text: JSON.stringify(question) }));
  const r = await invoke({ intakeId, action: "feedback" });
  assert.equal(r.code, 200);
  assert.deepEqual(r.body.result, question);
});
test("denied scope and invalid requests never call a model; stale lease results are not adopted", async () => {
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return new Response(JSON.stringify({ message: "denied", code: "42501" }), {
      status: 403,
    });
  };
  assert.equal((await invoke()).code, 403);
  assert.equal(calls, 1);
  global.fetch = async () => {
    throw Error("must not fetch");
  };
  assert.equal(
    (await invoke({ intakeId: "bad", action: "prepare" })).code,
    403,
  );
  assert.equal((await invoke({}, "GET")).code, 405);
  assert.equal(
    (await invoke({ intakeId, action: "prepare", refresh: "yes" })).code,
    400,
  );
  global.fetch = async (url) =>
    database(url)
      ? new Response(
          JSON.stringify(
            String(url).includes("claim_")
              ? { state: "claimed", lease, source: { currentSession: 1 } }
              : false,
          ),
        )
      : new Response(JSON.stringify({ output_text: JSON.stringify(guide) }));
  assert.equal((await invoke()).code, 502);
});
