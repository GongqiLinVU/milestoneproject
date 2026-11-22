import { after, test } from "node:test";
import assert from "node:assert/strict";
import { buildSync } from "esbuild";
import React, { act } from "react";
import { create } from "react-test-renderer";

buildSync({
  entryPoints: ["src/PresentationReview.tsx"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".test-build/PresentationReview.mjs",
  external: ["react", "react/jsx-runtime"],
  loader: { ".css": "empty" },
});
const { PresentationReview } = await import("../../.test-build/PresentationReview.mjs");
const originalWindow = global.window;
global.window = { addEventListener() {}, removeEventListener() {} };
global.IS_REACT_ACT_ENVIRONMENT = true;
after(() => {
  global.window = originalWindow;
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

test("switching teams keeps an in-flight score and newer teacher notes attached to the right student", async () => {
  const calls = [];
  const rows = [
    { rosterId: "first", name: "Student One", team: 2, version: 0, markVersion: 3, content: null, score: null },
    { rosterId: "second", name: "Student Two", team: 3, version: 0, markVersion: 0, content: null, score: null },
  ];
  let finish;
  let start;
  const firstSave = new Promise(resolve => { start = resolve; });
  const client = {
    from: publishedOrderSource({ data: null }),
    async rpc(name, args) {
      if (name === "get_session_presentation_review") return { data: { maximum: 20, rows } };
      assert.equal(name, "save_session_presentation_review");
      calls.push(args);
      if (calls.length === 1) {
        start();
        return new Promise(resolve => { finish = resolve; });
      }
      return { data: { version: 1, markVersion: 4 } };
    },
  };
  let tree;
  let closed = false;
  await act(async () => {
    tree = create(React.createElement(PresentationReview, {
      client, sessionId: "s10", blockId: "class-2B4", onClose: () => { closed = true; },
    }));
  });
  try {
    const first = tree.root.findByProps({ "aria-label": "Student One" });
    await act(async () => first.findByType("input").props.onChange({ target: { value: "0" } }));
    await act(async () => firstSave);
    await act(async () => {
      first.findByType("textarea").props.onChange({ target: { value: "Observed in demo" } });
      tree.root.findByProps({ id: "presentation-tab-3" }).props.onClick();
    });
    assert.equal(tree.root.findByProps({ id: "presentation-team-3" }).props.hidden, false);
    await act(async () => tree.root.findAllByType("button").find(node => node.children[0] === "Close").props.onClick());
    assert.equal(closed, false);
    await act(async () => finish({ data: { version: 0, markVersion: 4 } }));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 765)); });
    assert.equal(calls.length, 2);
    assert.equal(calls[0].p_score, 0);
    assert.equal(calls[0].p_save_score, true);
    assert.equal(calls[1].p_roster_id, "first");
    assert.equal(calls[1].p_mark_version, 4);
    assert.equal(calls[1].p_save_score, false);
    assert.equal(calls[1].p_content.notes, "Observed in demo");
    await act(async () => tree.root.findAllByType("button").find(node => node.children[0] === "Close").props.onClick());
    assert.equal(closed, true);
  } finally {
    await act(async () => tree.unmount());
  }
});

function publishedOrderSource(result) {
  return table => {
    assert.equal(table, "presentation_orders");
    const query = {
      select(columns) {
        assert.equal(columns, "published_snapshot");
        return query;
      },
      eq(column, value) {
        assert.equal(column, "block_id");
        assert.equal(value, "class-2B4");
        return query;
      },
      not(column, operator, value) {
        assert.deepEqual([column, operator, value], ["published_at", "is", null]);
        return query;
      },
      async maybeSingle() { return result; },
    };
    return query;
  };
}

test("team tabs follow published positions and fall back to team numbers", async () => {
  const rows = [null, 10, 2, 4, 2].map((team, index) => ({
    rosterId: String(index), name: `Student ${index}`, team, version: 0, markVersion: 0, content: null, score: null,
  }));
  const scenarios = [
    {
      result: { data: { published_snapshot: [
        { position: 3, teamName: "Team 2" },
        { position: 1, teamName: "Team 4" },
        { position: 2, teamName: "Team 9" },
      ] } },
      expected: ["Team 4", "Team 2", "Team 10", "Unassigned"],
    },
    {
      result: { data: null },
      expected: ["Team 2", "Team 4", "Team 10", "Unassigned"],
    },
    {
      result: { error: { message: "Order unavailable" } },
      expected: ["Team 2", "Team 4", "Team 10", "Unassigned"],
    },
  ];
  for (const { result, expected } of scenarios) {
    let tree;
    const client = {
      from: publishedOrderSource(result),
      async rpc(name) {
        assert.equal(name, "get_session_presentation_review");
        return { data: { maximum: 20, rows } };
      },
    };
    await act(async () => {
      tree = create(React.createElement(PresentationReview, {
        client, sessionId: "s10", blockId: "class-2B4", onClose() {},
      }));
    });
    try {
      const tabs = tree.root.findAllByProps({ role: "tab" });
      assert.deepEqual(tabs.map(tab => tab.children[0]), expected);
      assert.equal(tabs.find(tab => tab.props["aria-selected"]), tabs[0]);
    } finally {
      await act(async () => tree.unmount());
    }
  }
});
