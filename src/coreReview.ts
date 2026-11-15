export type CorePoints = {
  confirmedProgress: string[];
  mainIssues: string[];
  nextSteps: string[];
};
export type CoreDraft = {
  workflow: "core.v1";
  meetingDate?: string;
  teacherObservation: string;
  coreSourceObservation: string;
  coreEdited: boolean;
  coreReview: CorePoints;
};
export type CoreGenerated = CorePoints & { clarification: string };
export type GenerationSlot = {
  status: "empty" | "pending" | "ready" | "failed" | "interrupted";
  result: any;
  sourceChanged: boolean;
  requestSourceChanged?: boolean;
  error?: string | null;
};
export const emptyCorePoints = (): CorePoints => ({
  confirmedProgress: [],
  mainIssues: [],
  nextSteps: [],
});
export const emptyCoreDraft = (): CoreDraft => ({
  workflow: "core.v1",
  teacherObservation: "",
  coreSourceObservation: "",
  coreEdited: false,
  coreReview: emptyCorePoints(),
});
export function parseCorePoints(value: unknown): CorePoints {
  const v = value as Record<string, unknown>;
  if (!v || typeof v !== "object")
    throw Error("Core feedback could not be read.");
  const result = emptyCorePoints();
  for (const key of ["confirmedProgress", "mainIssues", "nextSteps"] as const) {
    const a = v[key];
    if (
      !Array.isArray(a) ||
      a.length > (key === "nextSteps" ? 2 : 3) ||
      a.some((s) => typeof s !== "string" || !s.trim() || s.length > 800)
    )
      throw Error(
        "Use at most three short points per section, and two optional next steps.",
      );
    result[key] = a.map((s) => (s as string).trim());
  }
  return result;
}
export function parseCoreGenerated(value: unknown): CoreGenerated {
  const points = parseCorePoints(value),
    v = value as Record<string, unknown>;
  if (typeof v.clarification !== "string" || v.clarification.length > 300)
    throw Error("Invalid clarification.");
  const count =
    points.confirmedProgress.length +
    points.mainIssues.length +
    points.nextSteps.length;
  if (v.clarification.trim() ? count > 0 : count === 0)
    throw Error("Core feedback needs points or one critical clarification.");
  return { ...points, clarification: v.clarification.trim() };
}
export function coreCanComplete(d: CoreDraft) {
  return (
    !!(
      d.coreReview.confirmedProgress.length + d.coreReview.mainIssues.length
    ) && d.coreSourceObservation === d.teacherObservation
  );
}
export const pointLines = (text: string) =>
  text
    .split("\n")
    .map((s) => s.replace(/^\s*[-•]\s*/, "").trim())
    .filter(Boolean);
