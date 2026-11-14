import { test, after } from "node:test";
import assert from "node:assert/strict";
import handler from "../../.test-api/api/assessment-feedback.js";
const original = global.fetch;
after(() => (global.fetch = original));
process.env.SUPABASE_URL = "https://database.example.invalid";
process.env.SUPABASE_PUBLISHABLE_KEY = "test-key";
process.env.OPENAI_API_KEY = "test-provider-key";
const blockId = "10000000-0000-0000-0000-000000000001",
  rosterId = "20000000-0000-0000-0000-000000000001";
async function invoke(
  body = { blockId, rosterId, itemId: "final_report" },
  method = "POST",
) {
  const r = {
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
    r,
  );
  return r;
}
const ctx = {
  teacherMarkingNotes: "Observed code demonstration; tests not checked.",
  sessions: [{ session: 3, studentRecord: { progress: "Reported API work" } }],
};
test("AI uses authorized saved evidence, ignores forged browser evidence and never returns marks", async () => {
  let calls = 0;
  global.fetch = async (url, init) => {
    calls++;
    if (String(url).includes("database.example.invalid")) {
      assert.equal(init.headers.get("Authorization"), "Bearer teacher-token");
      assert.deepEqual(JSON.parse(init.body), {
        p_block_id: blockId,
        p_roster_id: rosterId,
        p_item_id: "final_report",
      });
      return new Response(JSON.stringify(ctx));
    }
    const b = JSON.parse(init.body);
    assert.equal(b.store, false);
    assert.ok(init.signal);
    assert.match(b.instructions, /Never suggest scores/);
    assert.match(b.instructions, /unverified self-reports/);
    assert.match(b.instructions, /unseen deliverables/);
    assert.equal(b.input, JSON.stringify(ctx));
    return new Response(
      JSON.stringify({
        output_text: JSON.stringify({
          strengths: ["You demonstrated the code."],
          improvements: ["Testing has not yet been checked."],
          nextSteps: ["Show one boundary test."],
        }),
      }),
    );
  };
  const r = await invoke({
    blockId,
    rosterId,
    itemId: "final_report",
    evidence: "forged",
  });
  assert.equal(r.code, 200);
  assert.deepEqual(Object.keys(r.body), ["draft"]);
  assert.match(r.body.draft, /Strengths\n•/);
  assert.match(r.body.draft, /Areas for improvement\n•/);
  assert.match(r.body.draft, /Recommended next steps\n•/);
  assert.equal(calls, 2);
});
test("class denial and empty evidence stop before any provider call", async () => {
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return new Response(JSON.stringify({ message: "denied", code: "42501" }), {
      status: 403,
    });
  };
  assert.equal((await invoke()).code, 403);
  assert.equal(calls, 1);
  global.fetch = async () =>
    new Response(JSON.stringify({ teacherMarkingNotes: "", sessions: [] }));
  assert.equal((await invoke()).code, 400);
});
test("wrong methods and invalid IDs do not call external services", async () => {
  global.fetch = async () => {
    throw Error("must not fetch");
  };
  assert.equal((await invoke({}, "GET")).code, 405);
  assert.equal(
    (await invoke({ blockId: "bad", rosterId, itemId: "final_report" })).code,
    403,
  );
});
test("malformed, verbose, empty and failed drafts preserve the teacher record", async () => {
  for (const output of [
    "invalid",
    JSON.stringify({ strengths: [], improvements: [], nextSteps: [] }),
    JSON.stringify({
      strengths: ["x".repeat(501)],
      improvements: [],
      nextSteps: [],
    }),
  ]) {
    global.fetch = async (url) =>
      String(url).includes("database.example.invalid")
        ? new Response(JSON.stringify(ctx))
        : new Response(JSON.stringify({ output_text: output }));
    assert.equal((await invoke()).code, 502);
  }
  global.fetch = async (url) =>
    String(url).includes("database.example.invalid")
      ? new Response(JSON.stringify(ctx))
      : new Response("{}", { status: 429 });
  assert.equal((await invoke()).code, 502);
});
