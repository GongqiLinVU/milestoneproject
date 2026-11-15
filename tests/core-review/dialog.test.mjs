import { test, after } from "node:test";
import assert from "node:assert/strict";
import { buildSync } from "esbuild";
import React, { act } from "react";
import { create } from "react-test-renderer";
buildSync({
  entryPoints: ["src/IntakeTeacherReview.tsx"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".test-build/ReviewDialog.mjs",
  external: ["react", "react/jsx-runtime"],
  loader: { ".css": "empty" },
});
const { TeacherIntakeReviews } =
  await import("../../.test-build/ReviewDialog.mjs");
const originalWindow = global.window,
  originalDocument = global.document;
global.IS_REACT_ACT_ENVIRONMENT = true;
after(() => {
  global.window = originalWindow;
  global.document = originalDocument;
  delete global.IS_REACT_ACT_ENVIRONMENT;
});
for (const initial of ["", "auto"])
  test(`review locks page scrolling and restores original ${initial || "unset"} overflow on unmount`, async () => {
    let shown = 0,
      stopped = 0;
    const listeners = new Set();
    global.document = {
      body: { style: { overflow: initial } },
      documentElement: { style: { overflow: initial } },
      addEventListener: (k, f) => listeners.add(f),
      removeEventListener: (k, f) => listeners.delete(f),
    };
    global.window = {
      setInterval: () => 1,
      clearInterval: () => stopped++,
      addEventListener: (k, f) => listeners.add(f),
      removeEventListener: (k, f) => listeners.delete(f),
    };
    let tree;
    await act(async () => {
      tree = create(
        React.createElement(TeacherIntakeReviews, {
          client: { rpc: async () => ({ data: [] }) },
          sessionId: "s6",
          title: "S6",
          rows: [],
          renderSource: () => null,
          onClose() {},
        }),
        {
          createNodeMock: (e) =>
            e.type === "dialog" ? { showModal: () => shown++ } : null,
        },
      );
    });
    try {
      assert.equal(shown, 1);
      assert.equal(document.body.style.overflow, "hidden");
      assert.equal(document.documentElement.style.overflow, "hidden");
    } finally {
      await act(async () => tree.unmount());
    }
    assert.equal(document.body.style.overflow, initial);
    assert.equal(document.documentElement.style.overflow, initial);
    assert.equal(listeners.size, 0);
    assert.equal(stopped, 1);
  });
