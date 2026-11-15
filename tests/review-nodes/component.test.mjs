import { test, after } from "node:test";
import assert from "node:assert/strict";
import { buildSync } from "esbuild";
import React, { act } from "react";
import { create } from "react-test-renderer";
for (const [entry, name] of [
  ["src/ReviewHub.tsx", "ReviewHub"],
  ["src/SessionAIReview.tsx", "SessionAIReview"],
  ["src/CoreReviewEditor.tsx", "NodeEditor"],
])
  buildSync({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: ".test-build/" + name + ".mjs",
    external: ["react", "react/jsx-runtime"],
    loader: { ".css": "empty" },
  });
const { ReviewHub } = await import("../../.test-build/ReviewHub.mjs");
const { SessionAIReview } =
  await import("../../.test-build/SessionAIReview.mjs");
const { CoreReviewEditor } = await import("../../.test-build/NodeEditor.mjs");
const oldWindow = global.window,
  oldDocument = global.document,
  oldFetch = global.fetch;
global.IS_REACT_ACT_ENVIRONMENT = true;
global.window = {
  addEventListener() {},
  removeEventListener() {},
  confirm: () => false,
};
global.document = { body: { style: {} }, documentElement: { style: {} } };
after(() => {
  global.window = oldWindow;
  global.document = oldDocument;
  global.fetch = oldFetch;
  delete global.IS_REACT_ACT_ENVIRONMENT;
});
const node = {
  id: "r2",
  label: "Midpoint",
  fromSession: 1,
  toSession: 3,
  suggestedSession: 4,
  includePreviousBlock: false,
};
const config = { sessionAI: true, previousBlockId: null, nodes: [node] };
const student = {
  studentId: "s001",
  studentName: "Test Student",
  teamNumber: 2,
};
const hub = {
  config,
  version: 0,
  students: [student],
  reviews: [],
  legacy: [],
};
const blank = {
  workflow: "core.v1",
  teacherObservation: "",
  coreSourceObservation: "",
  coreEdited: false,
  coreReview: { confirmedProgress: [], mainIssues: [], nextSteps: [] },
};
const guide = {
  progress: "Student reports UI changes.",
  feedback: "Verify them.",
  questions: ["Show the UI.", "Explain the request.", "Show a test."],
};
const workspace = {
  review: {
    version: 0,
    summaryRevision: 1,
    correctionOpen: false,
    draft: blank,
    privateNote: "",
    published: null,
    history: [],
    studentRecord: null,
    node,
    sourceSnapshot: { updates: [], missingSessions: [1, 2, 3] },
    sourceChanged: false,
  },
  preparation: { status: "ready", result: guide, sourceChanged: false },
  feedback: { status: "empty", result: null, sourceChanged: false },
  legacyDraft: null,
};
const flush = async () =>
  act(async () => {
    await new Promise((r) => setImmediate(r));
  });
const button = (tree, text) =>
  tree.root.findAllByType("button").find((b) => b.children.join("") === text);
const close = async (tree) => act(async () => tree.unmount());
test("hub visual settings add/remove nodes, retain failed edits and expose no JSON editor", async () => {
  const dirty = [],
    calls = [];
  let tree;
  const client = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      return name === "get_studio_review_hub"
        ? { data: structuredClone(hub) }
        : { error: { message: "Settings changed. Reload" } };
    },
  };
  await act(async () => {
    tree = create(
      React.createElement(ReviewHub, {
        client,
        blockId: "class",
        blocks: [],
        onBlockChange() {},
        onUnsaved: (v) => dirty.push(v),
      }),
    );
  });
  try {
    assert.ok(JSON.stringify(tree.toJSON()).includes("Evidence S"));
    await act(async () => button(tree, "Settings").props.onClick());
    assert.equal(tree.root.findAllByType("textarea").length, 0);
    await act(async () => button(tree, "Add review node").props.onClick());
    assert.equal(tree.root.findAllByType("fieldset").length, 2);
    assert.equal(dirty.at(-1), true);
    await act(async () => button(tree, "Save settings").props.onClick());
    assert.ok(JSON.stringify(tree.toJSON()).includes("Settings changed"));
    assert.equal(tree.root.findAllByType("fieldset").length, 2);
    assert.equal(calls.at(-1).name, "save_studio_review_settings");
    await act(async () => button(tree, "Discard changes").props.onClick());
    assert.equal(tree.root.findAllByType("fieldset").length, 1);
    assert.equal(dirty.at(-1), false);
  } finally {
    await close(tree);
  }
});
test("started definitions are visually locked while adding future nodes remains available", async () => {
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(ReviewHub, {
        client: {
          rpc: async () => ({
            data: {
              ...hub,
              reviews: [
                {
                  id: "review",
                  studentId: student.studentId,
                  nodeKey: "r2",
                  node,
                  version: 0,
                  published: null,
                  draft: blank,
                },
              ],
            },
          }),
        },
        blockId: "class",
        blocks: [],
        onBlockChange() {},
        onUnsaved() {},
      }),
    );
  });
  try {
    await act(async () => button(tree, "Settings").props.onClick());
    assert.equal(tree.root.findByType("fieldset").props.disabled, true);
    assert.equal(button(tree, "Add review node").props.disabled, false);
  } finally {
    await close(tree);
  }
});
test("node editor saves to independent RPC and generates with reviewId, without requiring an intake", async () => {
  let tree;
  const writes = [],
    requests = [];
  const w = structuredClone(workspace);
  const client = {
    auth: {
      getSession: async () => ({
        data: { session: { access_token: "teacher" } },
      }),
    },
    rpc: async (name, args) => {
      if (name === "get_teacher_node_workspace") {
        assert.deepEqual(args, { p_review_id: "review-id" });
        return { data: structuredClone(w) };
      }
      assert.equal(name, "save_teacher_node_review");
      assert.equal(args.p_intake_id, undefined);
      writes.push(args);
      w.review.version++;
      w.review.draft = args.p_draft;
      if (args.p_publish)
        w.review.published = {
          reviewVersion: w.review.version,
          ...args.p_draft,
        };
      return { data: structuredClone(w.review) };
    },
  };
  global.fetch = async (url, init) => {
    const b = JSON.parse(init.body);
    requests.push(b);
    assert.equal(b.reviewId, "review-id");
    assert.equal(b.intakeId, undefined);
    return new Response(
      JSON.stringify({
        state: "ready",
        result: {
          confirmedProgress: ["UI was demonstrated."],
          mainIssues: [],
          nextSteps: [],
          clarification: "",
        },
      }),
    );
  };
  await act(async () => {
    tree = create(
      React.createElement(CoreReviewEditor, {
        client,
        reviewId: "review-id",
        student: { ...student, intakeId: "review-id", submitted: true },
        renderSource: () => null,
        renderPublished: () => null,
        onSaved() {},
        onDirty() {},
      }),
    );
  });
  try {
    const obs = () =>
      tree.root.findByProps({ "aria-label": "Teacher observation" });
    await act(async () =>
      obs().props.onChange({ target: { value: "I checked the UI." } }),
    );
    await act(async () => obs().props.onBlur());
    await flush();
    assert.equal(requests.length, 1);
    assert.equal(writes[0].p_review_id, "review-id");
    assert.equal(
      button(tree, "Confirm and complete review").props.disabled,
      false,
    );
    await act(async () =>
      button(tree, "Confirm and complete review").props.onClick(),
    );
    assert.equal(writes.at(-1).p_publish, true);
  } finally {
    await close(tree);
  }
});
test("first session check is automatic and cached reopening makes no model request", async () => {
  let tree,
    calls = 0,
    slot = { status: "empty", result: null, sourceChanged: false };
  const client = {
    rpc: async () => ({ data: slot }),
    auth: {
      getSession: async () => ({
        data: { session: { access_token: "student" } },
      }),
    },
  };
  global.fetch = async (url, init) => {
    calls++;
    assert.equal(JSON.parse(init.body).action, "session-check");
    slot = {
      status: "ready",
      result: {
        summary: "Student reports UI work.",
        attentionPoints: [],
        questions: [],
      },
      sourceChanged: false,
    };
    return new Response(
      JSON.stringify({ state: "ready", result: slot.result }),
    );
  };
  for (let i = 0; i < 2; i++) {
    await act(async () => {
      tree = create(
        React.createElement(SessionAIReview, { client, intakeId: "intake" }),
      );
    });
    await flush();
    assert.ok(
      JSON.stringify(tree.toJSON()).includes("not teacher verification"),
    );
    await close(tree);
  }
  assert.equal(calls, 1);
});
test("failed, paused and disabled session checks do not automatically retry", async () => {
  let calls = 0;
  global.fetch = async () => {
    calls++;
    throw Error("No call expected");
  };
  for (const status of ["failed", "paused", "disabled", "interrupted"]) {
    let tree;
    await act(async () => {
      tree = create(
        React.createElement(SessionAIReview, {
          client: {
            rpc: async () => ({
              data: { status, result: null, requestSourceChanged: false },
            }),
          },
          intakeId: "intake",
        }),
      );
    });
    await flush();
    await close(tree);
  }
  assert.equal(calls, 0);
});
test("work queue opens an independent review for a student without any session intake", async () => {
  let tree;
  const calls = [];
  const client = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (name === "get_studio_review_hub")
        return { data: structuredClone(hub) };
      if (name === "open_teacher_node_review")
        return { data: "independent-review" };
      assert.equal(name, "get_teacher_node_workspace");
      return { data: structuredClone(workspace) };
    },
  };
  await act(async () => {
    tree = create(
      React.createElement(ReviewHub, {
        client,
        blockId: "class",
        blocks: [],
        onBlockChange() {},
        onUnsaved() {},
      }),
      {
        createNodeMock: (e) =>
          e.type === "dialog" ? { showModal() {} } : null,
      },
    );
  });
  try {
    await act(async () => button(tree, "Start review").props.onClick());
    await flush();
    const call = calls.find((c) => c.name === "open_teacher_node_review");
    assert.deepEqual(call.args, {
      p_block_id: "class",
      p_student_id: "s001",
      p_node_key: "r2",
    });
    assert.ok(calls.some((c) => c.name === "get_teacher_node_workspace"));
    assert.equal(
      calls.some((c) => c.name === "get_core_review_workspace"),
      false,
    );
    assert.equal(global.document.body.style.overflow, "hidden");
  } finally {
    await close(tree);
  }
});
test("records search and type filter keep AI checks distinguishable from teacher decisions", async () => {
  let tree;
  const h = {
    ...hub,
    sessionChecks: [
      {
        intakeId: "i",
        studentId: "s001",
        sessionNumber: 3,
        status: "ready",
        result: { summary: "Unique phishing progress", attentionPoints: [] },
      },
    ],
  };
  await act(async () => {
    tree = create(
      React.createElement(ReviewHub, {
        client: { rpc: async () => ({ data: h }) },
        blockId: "class",
        blocks: [],
        onBlockChange() {},
        onUnsaved() {},
      }),
    );
  });
  try {
    await act(async () => button(tree, "Review records").props.onClick());
    const search = tree.root.findByProps({
      placeholder: "Name, ID or feedback text",
    });
    await act(async () =>
      search.props.onChange({ target: { value: "unique phishing" } }),
    );
    assert.equal(tree.root.findAllByType("article").length, 1);
    assert.ok(
      JSON.stringify(tree.toJSON()).includes(
        "Not teacher verification or a mark",
      ),
    );
    const type = tree.root
      .findAllByType("select")
      .find((s) =>
        s.findAllByType("option").some((o) => o.props.value === "session-ai"),
      );
    await act(async () =>
      type.props.onChange({ target: { value: "teacher" } }),
    );
    assert.equal(tree.root.findAllByType("article").length, 0);
  } finally {
    await close(tree);
  }
});
