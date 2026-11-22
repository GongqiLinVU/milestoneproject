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
      client, sessionId: "s10", onClose: () => { closed = true; },
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
