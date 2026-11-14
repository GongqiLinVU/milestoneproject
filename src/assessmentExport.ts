import { zipSync, strToU8 } from "fflate";
import {
  allNodes,
  maximum,
  totalMaximum,
  subtotal,
  gradeStatus,
  type AssessmentPlan,
  type MarkRow,
} from "./assessment.js";
export type ClassExportInfo = {
  course_code?: string;
  academic_year: number;
  block_code: string;
  class_code?: string;
};
type Cell = string | number | null;
export function exportMatrix(
  plan: AssessmentPlan,
  rows: MarkRow[],
  cls: ClassExportInfo,
): Cell[][] {
  const ordered = (
    n: AssessmentPlan["items"][number],
  ): AssessmentPlan["items"] => [...(n.children || []).flatMap(ordered), n];
  const items = plan.items.flatMap(ordered),
    comments = allNodes(plan).filter((n) => n.commentEnabled);
  return [
    [
      "Student ID",
      "Name",
      "Team",
      "Course",
      "Year",
      "Block",
      "Class",
      ...items.map(
        (n) => `${n.label}${n.children ? " subtotal" : ""} /${maximum(n)}`,
      ),
      "Total /" + totalMaximum(plan),
      "Marking status",
      ...comments.flatMap((n) => [
        `${n.label} feedback`,
        `${n.label} feedback status`,
      ]),
    ],
    ...rows.map((r) => [
      r.studentId,
      r.name,
      r.team,
      cls.course_code || "NIT3004",
      cls.academic_year,
      cls.block_code,
      cls.class_code || "C1",
      ...items.map((n) => subtotal([n], r.scores)),
      subtotal(plan.items, r.scores),
      gradeStatus(plan, r),
      ...comments.flatMap((n) => [
        r.comments[n.id]?.feedback || "",
        r.comments[n.id]?.confirmed
          ? "Confirmed"
          : r.comments[n.id]?.feedback
            ? "Draft"
            : "Not started",
      ]),
    ]),
  ];
}
const safeCSV = (v: Cell) => {
  let text = v == null ? "" : String(v);
  if (typeof v === "string" && /^[\s]*[=+\-@\t\r]/.test(text))
    text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
};
export function assessmentCSV(matrix: Cell[][]): string {
  return (
    "\uFEFF" + matrix.map((row) => row.map(safeCSV).join(",")).join("\r\n")
  );
}
const xml = (s: string) =>
  s
    .replace(
      /[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu,
      "",
    )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const col = (i: number): string =>
  i >= 26
    ? col(Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26))
    : String.fromCharCode(65 + i);
export function assessmentXLSX(matrix: Cell[][]): Uint8Array {
  const headers = matrix[0];
  if (!headers?.length) throw Error("No columns to export.");
  const last = col(headers.length - 1) + matrix.length;
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${last}"/><sheetViews><sheetView workbookViewId="0"><pane xSplit="2" ySplit="1" topLeftCell="C2" activePane="bottomRight" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="24"/><cols>${headers.map((h, i) => `<col min="${i + 1}" max="${i + 1}" width="${String(h).endsWith(" feedback") ? 65 : i === 1 ? 25 : 18}" customWidth="1"/>`).join("")}</cols><sheetData>${matrix.map((row, r) => `<row r="${r + 1}"${r === 0 ? ' ht="40" customHeight="1"' : ""}>${row.map((v, c) => (v == null ? "" : typeof v === "number" ? `<c r="${col(c)}${r + 1}" s="2"><v>${v}</v></c>` : `<c r="${col(c)}${r + 1}" s="${r === 0 ? 1 : 0}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`)).join("")}</row>`).join("")}</sheetData><autoFilter ref="A1:${last}"/></worksheet>`;
  const files: Record<string, string> = {
    "[Content_Types].xml":
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    "_rels/.rels":
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml":
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Marks and Feedback" sheetId="1" r:id="rId1"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels":
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    "xl/styles.xml":
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF193B4A"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    "xl/worksheets/sheet1.xml": sheet,
  };
  return zipSync(
    Object.fromEntries(
      Object.entries(files).map(([name, text]) => [name, strToU8(text)]),
    ),
    { level: 6 },
  );
}
export function downloadAssessment(
  name: string,
  data: string | Uint8Array,
  mime: string,
) {
  const bytes = typeof data === "string" ? data : new Uint8Array(data).buffer;
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
