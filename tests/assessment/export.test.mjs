import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { unzipSync, strFromU8 } from "fflate";
import {
  validatePlan,
  leaves,
  maximum,
  subtotal,
  parseMark,
  gradeStatus,
  blankComment,
} from "../../.test-build/assessment.js";
import {
  exportMatrix,
  assessmentCSV,
  assessmentXLSX,
} from "../../.test-build/assessmentExport.js";
const plan = JSON.parse(
  readFileSync(new URL("../../src/defaultAssessment.json", import.meta.url)),
);
const row = {
  rosterId: "r",
  studentId: "s001",
  name: '张三, "Alex"\nNext',
  team: 2,
  version: 0,
  scores: {},
  comments: {
    final_report: {
      ...blankComment(),
      notes: "PRIVATE_NOTE",
      aiDraft: "PRIVATE_AI",
      feedback: "Clear work.\nTest boundaries.",
      confirmed: true,
    },
  },
};
const cls = {
  course_code: "NIT3004",
  academic_year: 2026,
  block_code: "2B4",
  class_code: "C1",
};
test("configured maxima and blank versus zero totals stay distinct", () => {
  validatePlan(plan);
  assert.equal(
    plan.items.reduce((s, n) => s + maximum(n), 0),
    100,
  );
  assert.equal(maximum(plan.items[1]), 70);
  assert.equal(subtotal(plan.items, {}), null);
  const scores = Object.fromEntries(
    plan.items.flatMap(leaves).map((n) => [n.id, 0]),
  );
  assert.equal(subtotal(plan.items, scores), 0);
  assert.equal(gradeStatus(plan, { ...row, scores }), "Complete");
  scores.code = 12.25;
  scores.technical_document = 20.2;
  assert.equal(subtotal(plan.items, scores), 32.45);
  assert.equal(parseMark("", 25), null);
  assert.equal(parseMark(" 0 ", 25), 0);
  for (const v of ["-1", "26", "1.001", "1e1", "NaN"])
    assert.throws(() => parseMark(v, 25));
});
test("invalid schemas fail and future structures use the same helpers", () => {
  for (const items of [
    [],
    [
      { id: "same", label: "A", maxScore: 5 },
      { id: "same", label: "B", maxScore: 5 },
    ],
    [{ id: "x", label: "X", maxScore: -1 }],
    [{ id: "g", label: "G", children: [], maxScore: 2 }],
  ])
    assert.throws(() => validatePlan({ ...plan, items }));
  const alt = {
    version: 2,
    name: "Future block",
    items: [
      { id: "demo", label: "Live demo", maxScore: 40 },
      {
        id: "reflection",
        label: "Reflection",
        maxScore: 60,
        commentEnabled: true,
      },
    ],
  };
  validatePlan(alt);
  const m = exportMatrix(
    alt,
    [{ ...row, scores: { demo: 30, reflection: 50 } }],
    cls,
  );
  assert.ok(m[0].includes("Live demo /40"));
  assert.equal(m[1][m[0].indexOf("Total /100")], 80);
  assert.equal(
    m[0].some((x) => String(x).includes("Code")),
    false,
  );
});
test("decimal maxima produce a stable total in dynamic exports", () => {
  const decimal = {
    version: 1,
    name: "Decimal",
    items: [
      { id: "a", label: "A", maxScore: 0.1 },
      { id: "b", label: "B", maxScore: 0.2 },
    ],
  };
  validatePlan(decimal);
  const m = exportMatrix(
    decimal,
    [{ ...row, scores: { a: 0.1, b: 0.2 } }],
    cls,
  );
  assert.ok(m[0].includes("Total /0.3"));
  assert.equal(m[1][m[0].indexOf("Total /0.3")], 0.3);
});
test("dynamic export preserves blanks, complete zero, comments and excludes private evidence", () => {
  const zero = {
    ...row,
    studentId: "s002",
    scores: Object.fromEntries(
      plan.items.flatMap(leaves).map((n) => [n.id, 0]),
    ),
  };
  const m = exportMatrix(plan, [row, zero], cls),
    total = m[0].indexOf("Total /100"),
    group = m[0].indexOf("Final report subtotal /70");
  assert.equal(m[1][total], null);
  assert.equal(m[2][total], 0);
  assert.equal(m[1][group], null);
  assert.equal(m[2][group], 0);
  assert.ok(group > m[0].indexOf("Poster /5"));
  assert.ok(m[1].includes(row.comments.final_report.feedback));
  assert.doesNotMatch(JSON.stringify(m), /PRIVATE_NOTE|PRIVATE_AI|rosterId/);
  assert.equal(exportMatrix(plan, [zero], cls).length, 2); // filtered rows supplied by the workspace
});
test("CSV handles unicode, newlines, quotes and spreadsheet formulas safely", () => {
  const text = assessmentCSV(exportMatrix(plan, [row], cls));
  assert.ok(text.startsWith("\uFEFF"));
  assert.ok(text.includes('张三, ""Alex""\nNext'));
  assert.ok(text.includes("\r\n"));
  const attack = assessmentCSV([["=1+1", " @SUM(A1)", "-cmd", 0, null]]);
  assert.ok(attack.includes('"\'=1+1"'));
  assert.ok(attack.includes('"\' @SUM(A1)"'));
  assert.ok(attack.includes('"\'-cmd"'));
  assert.ok(attack.endsWith('"0",""'));
});
test("XLSX is a zipped OOXML workbook with typed zeros, blank cells and safe inline text", () => {
  const matrix = [
    ["ID", "Name", "Score", "Feedback"],
    ["001", "=SUM(A1)", 0, '反馈\nGood <work> & "notes"'],
    ["002", "Blank", null, ""],
  ];
  const files = unzipSync(assessmentXLSX(matrix));
  assert.equal(Object.keys(files).length, 6);
  const sheet = strFromU8(files["xl/worksheets/sheet1.xml"]);
  assert.match(sheet, /<pane xSplit="2" ySplit="1"/);
  assert.match(sheet, /<c r="C2" s="2"><v>0<\/v>/);
  assert.doesNotMatch(sheet, /<c r="C3"/);
  assert.doesNotMatch(sheet, /<f>/);
  assert.match(sheet, /t="inlineStr"/);
  assert.match(sheet, /反馈\nGood &lt;work&gt; &amp; &quot;notes&quot;/);
  assert.match(strFromU8(files["xl/workbook.xml"]), /Marks and Feedback/);
});
