import { test, after } from "node:test";
import assert from "node:assert/strict";
import { buildSync } from "esbuild";
import React, { act } from "react";
import { create } from "react-test-renderer";
import { readFileSync } from "node:fs";
buildSync({
  entryPoints: ["src/MarksLedger.tsx"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".test-build/MarksLedger.mjs",
  external: ["react", "react/jsx-runtime"],
  loader: { ".css": "empty" },
});
const { MarksLedger } = await import("../../.test-build/MarksLedger.mjs");
const plan = JSON.parse(readFileSync("src/defaultAssessment.json"));
const originalWindow = global.window;
global.window = {
  addEventListener() {},
  removeEventListener() {},
  confirm: () => true,
};
global.IS_REACT_ACT_ENVIRONMENT = true;
after(() => {
  global.window = originalWindow;
  delete global.IS_REACT_ACT_ENVIRONMENT;
});
const block = {
  id: "block",
  academic_year: 2026,
  block_code: "2B4",
  class_code: "C1",
  status: "active",
};
const ledger = {
  plan,
  planVersion: 1,
  locked: false,
  templates: [],
  rows: [
    {
      rosterId: "roster",
      studentId: "s001",
      name: "Student One",
      team: 2,
      version: 0,
      scores: {},
      comments: {},
    },
  ],
};
async function mount(save) {
  let tree;
  const changes = [];
  const calls = [];
  const client = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (name === "get_assessment_ledger")
        return { data: structuredClone(ledger) };
      return save(name, args);
    },
  };
  await act(async () => {
    tree = create(
      React.createElement(MarksLedger, {
        client,
        blockId: block.id,
        blocks: [block],
        onBlockChange() {},
        onUnsaved: (v) => changes.push(v),
      }),
    );
  });
  return {
    tree,
    calls,
    changes,
    input: () =>
      tree.root.findByProps({
        "aria-label": "Student One: Progress report /10",
      }),
    button: (text) =>
      tree.root
        .findAllByType("button")
        .find((b) => b.children.join("") === text),
  };
}
test("edits made while a save is in flight are sent with the new version and never overwritten", async () => {
  let finish;
  let count = 0;
  const m = await mount(async (name, args) => {
    assert.equal(name, "save_assessment_record");
    if (++count === 1) return new Promise((resolve) => (finish = resolve));
    return { data: { version: 2 } };
  });
  try {
    await act(async () => m.input().props.onChange({ target: { value: "7" } }));
    assert.equal(m.changes.at(-1), true);
    await act(async () => m.input().props.onBlur());
    assert.equal(m.calls.at(-1).args.p_scores.progress_report, 7);
    await act(async () => m.input().props.onChange({ target: { value: "8" } }));
    await act(async () => finish({ data: { version: 1 } }));
    assert.equal(m.input().props.value, "8");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 760));
    });
    const saves = m.calls.filter((c) => c.name === "save_assessment_record");
    assert.equal(saves.length, 2);
    assert.equal(saves[1].args.p_expected_version, 1);
    assert.equal(saves[1].args.p_scores.progress_report, 8);
    assert.equal(m.changes.at(-1), false);
  } finally {
    await act(async () => m.tree.unmount());
  }
});
test("invalid scores do not save, failed saves preserve edits and require explicit retry", async () => {
  let count = 0;
  const m = await mount(async () =>
    ++count === 1
      ? { error: { message: "Marks changed in another window" } }
      : { data: { version: 1 } },
  );
  try {
    await act(async () =>
      m.input().props.onChange({ target: { value: "11" } }),
    );
    await act(async () => m.input().props.onBlur());
    assert.equal(count, 0);
    assert.equal(m.changes.at(-1), true);
    await act(async () => m.input().props.onChange({ target: { value: "0" } }));
    await act(async () => m.input().props.onBlur());
    assert.equal(count, 1);
    assert.equal(m.input().props.value, "0");
    assert.equal(m.button("Excel").props.disabled, true);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 760));
    });
    assert.equal(count, 1);
    await act(async () => m.button("Retry save").props.onClick());
    assert.equal(count, 2);
    assert.equal(m.changes.at(-1), false);
    assert.equal(m.button("Excel").props.disabled, false);
  } finally {
    await act(async () => m.tree.unmount());
  }
});
