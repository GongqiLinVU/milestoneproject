import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSync } from "esbuild";
import React, { act } from "react";
import { create } from "react-test-renderer";
buildSync({
  entryPoints: ["src/CoreReviewEditor.tsx"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".test-build/CoreReviewEditor.mjs",
  external: ["react", "react/jsx-runtime"],
  loader: { ".css": "empty" },
});
const { CoreReviewEditor, CoreFeedbackView } =
  await import("../../.test-build/CoreReviewEditor.mjs");
const originalFetch = global.fetch;
global.IS_REACT_ACT_ENVIRONMENT = true;
after(() => {
  global.fetch = originalFetch;
  delete global.IS_REACT_ACT_ENVIRONMENT;
});
const guide = {
  progress: "Student reports a working UI.",
  feedback: "Verify it.",
  questions: ["Show the UI.", "Explain the request.", "Show a test."],
  generatedAt: "2026-11-15T01:00:00Z",
};
const slot = (result = null, status = result ? "ready" : "empty") => ({
  status,
  result,
  sourceChanged: false,
});
const blank = () => ({
  workflow: "core.v1",
  teacherObservation: "",
  coreSourceObservation: "",
  coreEdited: false,
  coreReview: { confirmedProgress: [], mainIssues: [], nextSteps: [] },
});
const student = {
  studentName: "Test Student",
  studentId: "s001",
  teamName: "Team 1",
  intakeId: "10000000-0000-0000-0000-000000000001",
  submitted: true,
  studentRecord: null,
};
const record = {
  responsibility: { current: "Frontend", change_from_previous: "initial" },
  claims: [],
  evidence: [],
  testing: [],
  dependencies: [],
  blocker: { status: "unknown", description: "" },
  next_action: { action: "", due_session: "S2", expected_evidence: "" },
};
const initial = () => ({
  review: {
    version: 0,
    summaryRevision: 1,
    correctionOpen: false,
    draft: blank(),
    privateNote: "",
    published: null,
    history: [],
    studentRecord: record,
  },
  preparation: slot(guide),
  feedback: slot(),
  legacyDraft: null,
});
async function mount({ workspace = initial(), provider, saveOverride } = {}) {
  const writes = [],
    dirty = [];
  let tree;
  global.fetch = async (url, init) => {
    assert.equal(url, "/api/review-suggestion");
    return provider
      ? provider(JSON.parse(init.body), workspace)
      : new Response(JSON.stringify({ error: "No model call expected" }), {
          status: 500,
        });
  };
  const client = {
    auth: {
      getSession: async () => ({
        data: { session: { access_token: "teacher" } },
      }),
    },
    rpc: async (name, args) => {
      if (name === "get_core_review_workspace")
        return { data: structuredClone(workspace) };
      assert.equal(name, "save_core_teacher_review");
      writes.push(structuredClone(args));
      if (saveOverride) {
        const override = await saveOverride(args, writes.length, workspace);
        if (override) return override;
      }
      assert.equal(args.p_version, workspace.review.version);
      workspace.review.version++;
      workspace.review.draft = structuredClone(args.p_draft);
      workspace.review.privateNote = args.p_private_note;
      if (args.p_publish)
        workspace.review.published = {
          workflow: "core.v1",
          coreReview: args.p_draft.coreReview,
          reviewVersion: workspace.review.version,
        };
      return { data: structuredClone(workspace.review) };
    },
  };
  await act(async () => {
    tree = create(
      React.createElement(CoreReviewEditor, {
        client,
        student,
        renderSource: () => null,
        renderPublished: () => null,
        onDirty: (v) => dirty.push(v),
        onSaved() {},
      }),
    );
  });
  return {
    tree,
    writes,
    workspace,
    dirty,
    field: (label) => tree.root.findByProps({ "aria-label": label }),
    button: (text) =>
      tree.root
        .findAllByType("button")
        .find((b) => b.children.join("") === text),
    close: async () => act(async () => tree.unmount()),
  };
}
const change = (field, value) => field.props.onChange({ target: { value } });
const flush = async () =>
  act(async () => {
    await new Promise((resolve) => setImmediate(resolve));
  });
const result = {
  confirmedProgress: ["You demonstrated the UI."],
  mainIssues: ["Testing remains unverified."],
  nextSteps: [],
  clarification: "",
};

test("reopening cached preparation, including stale-source hints, never generates again", async () => {
  let calls = 0;
  const w = initial();
  w.preparation.sourceChanged = true;
  for (let i = 0; i < 2; i++) {
    const m = await mount({
      workspace: w,
      provider: () => {
        calls++;
        throw Error("must not call");
      },
    });
    try {
      assert.equal(m.tree.root.findAllByType("li").length >= 3, true);
      assert.ok(
        JSON.stringify(m.tree.toJSON()).includes(
          "Source records may have changed",
        ),
      );
      assert.equal(m.tree.root.findAllByType("select").length, 0);
    } finally {
      await m.close();
    }
  }
  assert.equal(calls, 0);
});
test("first open prepares once and reopening uses the stored guide", async () => {
  const w = initial();
  w.preparation = slot();
  let calls = 0;
  const provider = (body) => {
    calls++;
    assert.equal(body.action, "prepare");
    w.preparation = slot(guide);
    return new Response(JSON.stringify({ state: "ready", result: guide }));
  };
  let m = await mount({ workspace: w, provider });
  await flush();
  await m.close();
  m = await mount({ workspace: w, provider });
  await m.close();
  assert.equal(calls, 1);
});
test("natural observation is saved before organising; one completion publishes core points with no required action", async () => {
  let providerCalls = 0;
  const m = await mount({
    provider: (body, w) => {
      providerCalls++;
      assert.equal(body.action, "feedback");
      assert.equal(body.teacherObservation, undefined);
      assert.equal(
        w.review.draft.teacherObservation,
        "Saw the UI; tests not checked.",
      );
      return new Response(JSON.stringify({ state: "ready", result }));
    },
  });
  try {
    await act(async () =>
      change(m.field("Teacher observation"), "Saw the UI; tests not checked."),
    );
    await act(async () => m.field("Teacher observation").props.onBlur());
    await flush();
    assert.equal(providerCalls, 1);
    assert.equal(
      m.field("Confirmed progress").props.value,
      result.confirmedProgress[0],
    );
    assert.equal(m.field("Optional next steps").props.value, "");
    assert.equal(
      m.writes.some((w) => w.p_publish),
      false,
    );
    await act(async () =>
      m.button("Confirm and complete review").props.onClick(),
    );
    await flush();
    assert.equal(m.writes.at(-1).p_publish, true);
    assert.deepEqual(m.writes.at(-1).p_draft.coreReview.nextSteps, []);
    assert.equal(m.button("Review completed").props.disabled, true);
  } finally {
    await m.close();
  }
});
test("teacher edits to core points win over a late AI response", async () => {
  let release;
  const m = await mount({
    provider: () => new Promise((resolve) => (release = resolve)),
  });
  try {
    await act(async () =>
      change(m.field("Teacher observation"), "Saw the UI."),
    );
    await act(async () => m.field("Teacher observation").props.onBlur());
    await flush();
    await act(async () =>
      change(m.field("Confirmed progress"), "Teacher-authored decision"),
    );
    await act(async () =>
      release(new Response(JSON.stringify({ state: "ready", result }))),
    );
    await flush();
    assert.equal(
      m.field("Confirmed progress").props.value,
      "Teacher-authored decision",
    );
  } finally {
    await m.close();
  }
});
test("a changed observation cannot adopt the earlier result and is organised from its newly saved text", async () => {
  let release,
    count = 0;
  const m = await mount({
    provider: (body, w) =>
      ++count === 1
        ? new Promise((resolve) => (release = resolve))
        : new Response(
            JSON.stringify({
              state: "ready",
              result: {
                ...result,
                confirmedProgress: ["Second observation result"],
              },
            }),
          ),
  });
  try {
    await act(async () =>
      change(m.field("Teacher observation"), "First observation"),
    );
    await act(async () => m.field("Teacher observation").props.onBlur());
    await flush();
    await act(async () =>
      change(m.field("Teacher observation"), "Second observation"),
    );
    await act(async () =>
      release(new Response(JSON.stringify({ state: "ready", result }))),
    );
    await flush();
    await flush();
    assert.equal(
      m.workspace.review.draft.teacherObservation,
      "Second observation",
    );
    assert.equal(count, 2);
    assert.equal(
      m.field("Confirmed progress").props.value,
      "Second observation result",
    );
  } finally {
    await m.close();
  }
});
test("critical ambiguity asks one clarification and cannot complete an empty review", async () => {
  const question = {
    confirmedProgress: [],
    mainIssues: [],
    nextSteps: [],
    clarification: "Which student explained the code?",
  };
  const m = await mount({
    provider: () =>
      new Response(JSON.stringify({ state: "ready", result: question })),
  });
  try {
    await act(async () =>
      change(m.field("Teacher observation"), "They explained it."),
    );
    await act(async () => m.field("Teacher observation").props.onBlur());
    await flush();
    assert.ok(JSON.stringify(m.tree.toJSON()).includes(question.clarification));
    assert.equal(m.button("Confirm and complete review").props.disabled, true);
  } finally {
    await m.close();
  }
});
test("failed saves keep teacher input and stop automatic publication or model calls", async () => {
  let count = 0;
  const m = await mount({
    saveOverride: () =>
      ++count === 1
        ? { error: { message: "Review changed in another tab" } }
        : null,
    provider: () => {
      throw Error("must not generate after failed save");
    },
  });
  try {
    await act(async () =>
      change(m.field("Teacher observation"), "Preserve this observation"),
    );
    await act(async () => m.field("Teacher observation").props.onBlur());
    await flush();
    assert.equal(
      m.field("Teacher observation").props.value,
      "Preserve this observation",
    );
    assert.ok(m.button("Retry save"));
    assert.equal(m.writes.length, 1);
    await act(async () =>
      change(m.field("Confirmed progress"), "Manually checked the UI."),
    );
    await act(async () => m.button("Retry save").props.onClick());
    await flush();
    assert.equal(m.writes.length, 2);
    assert.equal(m.dirty.at(-1), false);
  } finally {
    await m.close();
  }
});
test("manually edited saved points are not replaced by a cached formatter result", async () => {
  const w = initial();
  w.review.draft = {
    ...blank(),
    teacherObservation: "Saw UI",
    coreSourceObservation: "Saw UI",
    coreEdited: true,
    coreReview: {
      ...blank().coreReview,
      confirmedProgress: ["Teacher edited this"],
    },
  };
  w.feedback = slot(result);
  const m = await mount({ workspace: w });
  try {
    assert.equal(
      m.field("Confirmed progress").props.value,
      "Teacher edited this",
    );
    assert.equal(m.writes.length, 0);
  } finally {
    await m.close();
  }
});
test("student core feedback omits optional next steps when none were requested", async () => {
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(CoreFeedbackView, {
        points: {
          confirmedProgress: ["Shown UI"],
          mainIssues: [],
          nextSteps: [],
        },
      }),
    );
  });
  try {
    const text = JSON.stringify(tree.toJSON());
    assert.ok(text.includes("No issues were recorded."));
    assert.equal(text.includes("Optional next steps"), false);
  } finally {
    await act(async () => tree.unmount());
  }
});

test("failed cached formatting is not retried automatically after reopening", async () => {
  const w = initial();
  w.review.draft = { ...blank(), teacherObservation: "Saved observation" };
  w.feedback = {
    ...slot(null, "failed"),
    sourceChanged: true,
    requestSourceChanged: false,
    error: "Provider failed",
  };
  let calls = 0;
  const m = await mount({
    workspace: w,
    provider: () => {
      calls++;
      throw Error("No automatic retry");
    },
  });
  try {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 3150));
    });
    assert.equal(calls, 0);
    assert.ok(m.button("Rebuild core points from observation"));
  } finally {
    await m.close();
  }
});
test("a pause organises the saved observation without requiring another field click", async () => {
  let calls = 0;
  const m = await mount({
    provider: () => {
      calls++;
      return new Response(JSON.stringify({ state: "ready", result }));
    },
  });
  try {
    await act(async () =>
      change(m.field("Teacher observation"), "UI demonstrated; tests unclear."),
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 3200));
    });
    await flush();
    assert.equal(calls, 1);
    assert.equal(
      m.field("Confirmed progress").props.value,
      result.confirmedProgress[0],
    );
  } finally {
    await m.close();
  }
});
test("manual core decisions can complete while formatting is pending and late AI cannot alter them", async () => {
  let release;
  const m = await mount({ provider: () => new Promise((r) => (release = r)) });
  try {
    await act(async () => change(m.field("Teacher observation"), "Checked UI"));
    await act(async () => m.field("Teacher observation").props.onBlur());
    await flush();
    await act(async () =>
      change(m.field("Confirmed progress"), "Teacher confirmed UI"),
    );
    assert.equal(m.button("Confirm and complete review").props.disabled, false);
    await act(async () =>
      m.button("Confirm and complete review").props.onClick(),
    );
    await flush();
    assert.equal(
      m.workspace.review.published.coreReview.confirmedProgress[0],
      "Teacher confirmed UI",
    );
    await act(async () =>
      release(new Response(JSON.stringify({ state: "ready", result }))),
    );
    await flush();
    assert.equal(
      m.field("Confirmed progress").props.value,
      "Teacher confirmed UI",
    );
    assert.equal(m.writes.at(-1).p_publish, true);
  } finally {
    await m.close();
  }
});
test("more than three manual core points cannot complete and remain visible for correction", async () => {
  const m = await mount();
  try {
    await act(async () =>
      change(m.field("Confirmed progress"), "One\nTwo\nThree\nFour"),
    );
    assert.equal(
      m.field("Confirmed progress").props.value,
      "One\nTwo\nThree\nFour",
    );
    assert.equal(m.button("Confirm and complete review").props.disabled, true);
  } finally {
    await m.close();
  }
});
test("edits during an in-flight save remain dirty and a second save uses the returned version", async () => {
  let release;
  const m = await mount({
    saveOverride: (args, count) =>
      count === 1 ? new Promise((r) => (release = r)) : null,
  });
  try {
    await act(async () =>
      change(m.field("Confirmed progress"), "First decision"),
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1000));
    });
    assert.equal(m.writes.length, 1);
    await act(async () =>
      change(m.field("Confirmed progress"), "Latest decision"),
    );
    await act(async () => release(null));
    await flush();
    assert.equal(m.field("Confirmed progress").props.value, "Latest decision");
    assert.equal(m.dirty.at(-1), true);
    await act(async () =>
      m.button("Confirm and complete review").props.onClick(),
    );
    await flush();
    assert.equal(m.writes.length, 2);
    assert.equal(m.writes[1].p_version, 1);
    assert.equal(
      m.writes[1].p_draft.coreReview.confirmedProgress[0],
      "Latest decision",
    );
    assert.equal(m.writes[1].p_publish, true);
  } finally {
    await m.close();
  }
});
