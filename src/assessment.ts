export type AssessmentNode = {
  id: string;
  label: string;
  maxScore?: number;
  commentEnabled?: boolean;
  children?: AssessmentNode[];
};
export type AssessmentPlan = {
  version: number;
  name: string;
  items: AssessmentNode[];
};
export type MarkComment = {
  notes: string;
  feedback: string;
  aiDraft: string;
  confirmed: boolean;
};
export type MarkRow = {
  rosterId: string;
  studentId: string;
  name: string;
  team: number | null;
  version: number;
  scores: Record<string, number | null>;
  comments: Record<string, MarkComment>;
};
export const blankComment = (): MarkComment => ({
  notes: "",
  feedback: "",
  aiDraft: "",
  confirmed: false,
});
export function leaves(node: AssessmentNode): AssessmentNode[] {
  return node.children ? node.children.flatMap(leaves) : [node];
}
export function allNodes(plan: AssessmentPlan): AssessmentNode[] {
  const walk = (n: AssessmentNode): AssessmentNode[] => [
    n,
    ...(n.children || []).flatMap(walk),
  ];
  return plan.items.flatMap(walk);
}
export function maximum(node: AssessmentNode): number {
  return (
    Math.round(
      leaves(node).reduce((n, item) => n + (item.maxScore || 0), 0) * 100,
    ) / 100
  );
}
export function totalMaximum(plan: AssessmentPlan): number {
  return (
    Math.round(plan.items.reduce((sum, node) => sum + maximum(node), 0) * 100) /
    100
  );
}
export function subtotal(
  nodes: AssessmentNode[],
  scores: Record<string, number | null>,
): number | null {
  const items = nodes.flatMap(leaves);
  if (items.some((n) => scores[n.id] == null)) return null;
  return (
    Math.round(items.reduce((sum, n) => sum + scores[n.id]!, 0) * 100) / 100
  );
}
export function validatePlan(plan: AssessmentPlan) {
  if (
    !plan ||
    typeof plan.name !== "string" ||
    !plan.name.trim() ||
    plan.name.length > 120 ||
    !Number.isInteger(plan.version) ||
    plan.version < 1 ||
    !Array.isArray(plan.items) ||
    !plan.items.length ||
    plan.items.length > 20
  )
    throw Error("Invalid assessment structure.");
  const seen = new Set<string>();
  let count = 0;
  const walk = (n: AssessmentNode, depth: number) => {
    if (
      !n ||
      !n.id ||
      !/^[a-z][a-z0-9_]{0,59}$/.test(n.id) ||
      seen.has(n.id) ||
      typeof n.label !== "string" ||
      !n.label.trim() ||
      n.label.length > 120 ||
      ++count > 60
    )
      throw Error("Item IDs must be unique and labels non-empty.");
    seen.add(n.id);
    if (n.commentEnabled !== undefined && typeof n.commentEnabled !== "boolean")
      throw Error("Invalid comment setting.");
    if (n.children !== undefined) {
      if (
        depth >= 3 ||
        !Array.isArray(n.children) ||
        !n.children.length ||
        n.children.length > 20 ||
        n.maxScore !== undefined
      )
        throw Error("Groups derive their maximum from children.");
      n.children.forEach((c) => walk(c, depth + 1));
    } else if (
      typeof n.maxScore !== "number" ||
      !Number.isFinite(n.maxScore) ||
      n.maxScore <= 0 ||
      n.maxScore > 1000 ||
      Math.abs(n.maxScore * 100 - Math.round(n.maxScore * 100)) > 1e-7
    )
      throw Error(
        "Each leaf needs a positive maximum with at most two decimals.",
      );
  };
  plan.items.forEach((n) => walk(n, 1));
  if (totalMaximum(plan) > 10000) throw Error("Maximum total is 10000.");
}
export function parseMark(value: string, max: number): number | null {
  if (!value.trim()) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim()))
    throw Error("Enter a number with at most two decimal places.");
  const n = Number(value);
  if (n < 0 || n > max) throw Error(`Score must be between 0 and ${max}.`);
  return n;
}
export function gradeStatus(plan: AssessmentPlan, row: MarkRow) {
  const items = plan.items.flatMap(leaves),
    done = items.filter((n) => row.scores[n.id] != null).length;
  return done === items.length ? "Complete" : `${done}/${items.length} entered`;
}
