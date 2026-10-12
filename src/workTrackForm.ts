// S1–S5 self-reported progress. These choices do not grade or verify work.
export const earlyWorkAreas = ["Requirements", "Design", "Development", "Integration", "Testing", "Documentation", "Other"] as const;
export const earlyProgressStates = ["Completed a task", "Made progress", "Tried but did not succeed", "No progress"] as const;
export const earlyHelpKinds = ["No help needed", "Technical problem", "Requirement unclear", "Team coordination", "Teacher guidance"] as const;
export const previousActionStates = ["Completed", "Partly completed", "Not completed", "Plan changed"] as const;
export function earlyWorkTrackComplete(response: Record<string, unknown>, hasPreviousAction: boolean) {
  const text = (key: string) => typeof response[key] === "string" && Boolean((response[key] as string).trim());
  return Array.isArray(response.workAreas) && response.workAreas.length > 0
    && response.workAreas.every(area => earlyWorkAreas.includes(area as typeof earlyWorkAreas[number]))
    && earlyProgressStates.includes(response.progressState as typeof earlyProgressStates[number])
    && earlyHelpKinds.includes(response.helpKind as typeof earlyHelpKinds[number])
    && ["responsibility", "progress", "nextAction"].every(text)
    && (response.helpKind === "No help needed" || text("support"))
    && (!hasPreviousAction || previousActionStates.includes(response.previousActionStatus as typeof previousActionStates[number]));
}
export function buildEarlyWorkTrack(response: Record<string, unknown>) {
  const text = (key: string) => String(response[key] ?? "").trim();
  return {
    formVersion: "compact.v1",
    responsibility: text("responsibility"), progress: text("progress"), nextAction: text("nextAction"),
    evidence: text("evidence"), support: response.helpKind === "No help needed" ? "" : text("support"),
    workAreas: Array.isArray(response.workAreas) ? [...response.workAreas] : [],
    progressState: response.progressState, helpKind: response.helpKind,
    ...(response.previousActionStatus ? { previousActionStatus: response.previousActionStatus } : {}),
    responsibilityCarriedForward: response.responsibilityCarriedForward === true,
  };
}
// Carry only after the student's explicit choice, never current progress/testing.
export function confirmPreviousResponsibility(current: Record<string, unknown>, previous: Record<string, unknown>) {
  return { ...current, responsibility: String(previous.responsibility ?? ""), responsibilityCarriedForward: true };
}
