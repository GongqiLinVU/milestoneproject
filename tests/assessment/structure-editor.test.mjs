import { test, after } from "node:test";
import assert from "node:assert/strict";
import { buildSync } from "esbuild";
import React, { act } from "react";
import { create } from "react-test-renderer";
import { readFileSync } from "node:fs";
buildSync({
  entryPoints: ["src/AssessmentStructureEditor.tsx"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".test-build/AssessmentStructureEditor.mjs",
  external: ["react", "react/jsx-runtime"],
  loader: { ".css": "empty" },
});
const { AssessmentStructureEditor } =
  await import("../../.test-build/AssessmentStructureEditor.mjs");
const defaults = JSON.parse(readFileSync("src/defaultAssessment.json"));
global.IS_REACT_ACT_ENVIRONMENT = true;
after(() => delete global.IS_REACT_ACT_ENVIRONMENT);
async function mount(options = {}) {
  let tree;
  const calls = [],
    dirty = [];
  await act(async () => {
    tree = create(
      React.createElement(AssessmentStructureEditor, {
        initial: defaults,
        saved: false,
        locked: false,
        disabled: false,
        busy: false,
        onSave: async (plan) => calls.push(plan),
        onDirty: (v) => dirty.push(v),
        ...options,
      }),
    );
  });
  return {
    tree,
    calls,
    dirty,
    field: (name) => tree.root.findByProps({ "aria-label": name }),
    button: (text) =>
      tree.root
        .findAllByType("button")
        .find((b) => b.children.join("") === text),
  };
}
const edit = (node, value) => node.props.onChange({ target: { value } });

test("first setup displays NIT3004 modules and collapsed JSON and saves the full default", async () => {
  const m = await mount();
  try {
    assert.equal(m.tree.root.findAllByType("article").length, 8);
    const advanced = m.tree.root.findByProps({
      className: "assessment-advanced",
    });
    assert.ok(!advanced.props.open);
    assert.equal(m.field("Maximum marks: Progress report").props.value, "10");
    assert.equal(m.field("Maximum marks: Code").props.value, "25");
    assert.equal(
      m.button("Use this assessment structure").props.disabled,
      false,
    );
    await act(async () =>
      m.button("Use this assessment structure").props.onClick(),
    );
    assert.deepEqual(m.calls[0], defaults);
    assert.equal(m.dirty[0], false);
  } finally {
    await act(async () => m.tree.unmount());
  }
});

test("remove, undo and restore a catalog component without changing its stable identity", async () => {
  const m = await mount();
  try {
    await act(async () => m.field("Remove Code").props.onClick());
    assert.equal(
      m.tree.root.findAllByProps({ "aria-label": "Maximum marks: Code" })
        .length,
      0,
    );
    await act(async () => m.button("Undo").props.onClick());
    assert.equal(m.field("Maximum marks: Code").props.value, "25");
    await act(async () => m.field("Remove Code").props.onClick());
    await act(async () =>
      edit(m.field("Add component to Final report"), "code"),
    );
    assert.equal(m.field("Maximum marks: Code").props.value, "25");
    await act(async () => edit(m.field("Maximum marks: Code"), "30"));
    await act(async () => m.field("Move Code up").props.onClick());
    await act(async () => m.field("Remove Presentation").props.onClick());
    await act(async () =>
      m.button("Use this assessment structure").props.onClick(),
    );
    const p = m.calls[0];
    assert.equal(p.items.length, 2);
    const code = p.items[1].children.find((n) => n.id === "code");
    assert.equal(code.maxScore, 30);
    assert.equal(code.label, "Code");
    assert.equal(p.items[1].commentEnabled, true);
  } finally {
    await act(async () => m.tree.unmount());
  }
});

test("custom components and groups receive independent IDs and support future layouts", async () => {
  const m = await mount();
  try {
    await act(async () => edit(m.field("Add assessment"), "custom"));
    await act(async () => edit(m.field("Name: New component"), "Portfolio"));
    await act(async () => edit(m.field("Maximum marks: Portfolio"), "15"));
    await act(async () => edit(m.field("Add assessment"), "group"));
    await act(async () => edit(m.field("Name: New assessment"), "Prototype"));
    await act(async () =>
      m.button("Use this assessment structure").props.onClick(),
    );
    const p = m.calls[0],
      nodes = p.items.flatMap((n) => [n, ...(n.children || [])]);
    assert.equal(new Set(nodes.map((n) => n.id)).size, nodes.length);
    assert.equal(p.items.at(-2).maxScore, 15);
    assert.equal(p.items.at(-1).children.length, 1);
  } finally {
    await act(async () => m.tree.unmount());
  }
});

test("pending or malformed JSON cannot overwrite visual work until explicitly applied", async () => {
  const m = await mount();
  try {
    await act(async () => edit(m.field("Maximum marks: Code"), "23"));
    await act(async () => edit(m.field("Assessment JSON"), "{invalid"));
    assert.equal(m.field("Maximum marks: Code").props.disabled, true);
    assert.equal(
      m.button("Use this assessment structure").props.disabled,
      true,
    );
    await act(async () => m.button("Apply JSON to editor").props.onClick());
    assert.equal(m.calls.length, 0);
    await act(async () => m.button("Discard JSON changes").props.onClick());
    assert.equal(m.field("Maximum marks: Code").props.value, "23");
    const alt = {
      version: 2,
      name: "Alternate block",
      items: [
        {
          id: "portfolio",
          label: "Portfolio",
          maxScore: 100,
          commentEnabled: true,
        },
      ],
    };
    await act(async () =>
      edit(m.field("Assessment JSON"), JSON.stringify(alt)),
    );
    await act(async () => m.button("Apply JSON to editor").props.onClick());
    assert.equal(m.field("Maximum marks: Portfolio").props.value, "100");
    await act(async () =>
      m.button("Use this assessment structure").props.onClick(),
    );
    assert.deepEqual(m.calls[0], alt);
  } finally {
    await act(async () => m.tree.unmount());
  }
});

test("invalid maxima block saving, discard clears dirty state and failed saves preserve input", async () => {
  const m = await mount({
    saved: true,
    onSave: async () => {
      throw Error("Structure changed in another window");
    },
  });
  try {
    assert.equal(m.button("Save structure changes").props.disabled, true);
    for (const value of ["", "0", "1.001", "1001"]) {
      await act(async () => edit(m.field("Maximum marks: Code"), value));
      assert.equal(m.button("Save structure changes").props.disabled, true);
    }
    await act(async () => edit(m.field("Maximum marks: Code"), "20"));
    assert.equal(m.dirty.at(-1), true);
    await act(async () => m.button("Save structure changes").props.onClick());
    assert.equal(m.field("Maximum marks: Code").props.value, "20");
    assert.ok(
      JSON.stringify(m.tree.toJSON()).includes(
        "Structure changed in another window",
      ),
    );
    await act(async () =>
      m.button("Discard structure changes").props.onClick(),
    );
    assert.equal(m.field("Maximum marks: Code").props.value, "25");
    assert.equal(m.dirty.at(-1), false);
  } finally {
    await act(async () => m.tree.unmount());
  }
});

test("a marked class remains read-only in both visual and advanced editors", async () => {
  const m = await mount({ saved: true, locked: true });
  try {
    for (const n of m.tree.root.findAllByType("input"))
      assert.equal(n.props.disabled, true);
    for (const n of m.tree.root.findAllByType("select"))
      assert.equal(n.props.disabled, true);
    assert.equal(m.field("Assessment JSON").props.readOnly, true);
    assert.equal(m.button("Save structure changes"), undefined);
  } finally {
    await act(async () => m.tree.unmount());
  }
});
