export const SESSION_INTAKE_SCHEMA_VERSION = "session-intake.v1.0.0" as const;
export const AI_INTAKE_TEST_SUITE_VERSION = "ai-intake-suite.v1.0.0" as const;
export const STUDENT_CONFIRMATION_ATTESTATION =
  "This summary reflects what I am claiming and the evidence I have identified. Teacher verification is separate." as const;

export type ProgressKind =
  | "completed"
  | "advanced"
  | "investigated"
  | "attempted_failed"
  | "no_progress";

export type EvidenceAvailability =
  | "available_now"
  | "expected_later"
  | "not_produced"
  | "not_required"
  | "unknown";

export type EvidenceType =
  | "repository_change"
  | "deployed_feature"
  | "live_demonstration"
  | "test_result"
  | "experiment_result"
  | "data_analysis"
  | "design_artifact"
  | "documentation"
  | "meeting_or_decision_record"
  | "external_system_record"
  | "other";

export type TestingStatus =
  | "executed"
  | "planned_not_executed"
  | "not_applicable";

export type IntakeStudentRecord = {
  responsibility: {
    current: string;
    change_from_previous: "initial" | "unchanged" | "refined" | "changed" | "unknown";
    shared_with?: string[];
    ownership_note?: string | null;
  };
  claims: Array<{
    claim_id: string;
    statement: string;
    progress_kind: ProgressKind;
    scope: string;
    completion_percent?: number | null;
  }>;
  evidence: Array<{
    evidence_id: string;
    claim_ids: string[];
    type: EvidenceType;
    reference?: string | null;
    verification_method?: string | null;
    availability: EvidenceAvailability;
    student_observed_result?: string | null;
    not_required_reason?: string | null;
  }>;
  testing: Array<{
    test_id?: string;
    claim_ids?: string[];
    execution_status: TestingStatus;
    method?: string | null;
    observed_result?: string | null;
    baseline_or_expected?: string | null;
  }>;
  dependencies: Array<{
    description: string;
    owner_ref?: string | null;
    status: "active" | "resolved" | "unknown";
    impact?: string | null;
  }>;
  blocker: {
    status: "none" | "active" | "resolved" | "unknown";
    description?: string | null;
    support_requested?: string | null;
  };
  next_action: {
    action: string;
    due_session: string;
    expected_evidence: string;
  };
};

export type FallbackTurn = {
  actor: "student" | "system";
  purpose: string;
  text: string;
};

export type IntakeValidationResult =
  | { valid: true; value: IntakeStudentRecord }
  | { valid: false; errors: string[] };

const progressKinds = new Set<ProgressKind>([
  "completed", "advanced", "investigated", "attempted_failed", "no_progress",
]);
const evidenceAvailability = new Set<EvidenceAvailability>([
  "available_now", "expected_later", "not_produced", "not_required", "unknown",
]);
const evidenceTypes = new Set<EvidenceType>([
  "repository_change", "deployed_feature", "live_demonstration", "test_result",
  "experiment_result", "data_analysis", "design_artifact", "documentation",
  "meeting_or_decision_record", "external_system_record", "other",
]);
const testingStatuses = new Set<TestingStatus>([
  "executed", "planned_not_executed", "not_applicable",
]);
const allowedRecordKeys = new Set([
  "responsibility", "claims", "evidence", "testing", "dependencies", "blocker", "next_action",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textLength(value: unknown, min: number, max: number) {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
}

export function validateIntakeStudentRecord(input: unknown): IntakeValidationResult {
  const errors: string[] = [];
  if (!isObject(input)) return { valid: false, errors: ["student_record must be an object"] };

  if (Object.keys(input).some((key) => !allowedRecordKeys.has(key))) {
    errors.push("student_record contains unsupported fields");
  }

  const responsibility = input.responsibility;
  if (!isObject(responsibility) || !textLength(responsibility.current, 3, 500)) {
    errors.push("current responsibility must be 3 to 500 characters");
  }
  if (!isObject(responsibility) ||
      !["initial", "unchanged", "refined", "changed", "unknown"].includes(String(responsibility.change_from_previous))) {
    errors.push("responsibility change state is invalid");
  }

  const claims = Array.isArray(input.claims) ? input.claims : [];
  if (claims.length < 1 || claims.length > 5) {
    errors.push("one to five claims are required");
  }
  const claimIds = new Set<string>();
  claims.forEach((claim) => {
    if (!isObject(claim) ||
        typeof claim.claim_id !== "string" ||
        !/^C[1-5]$/.test(claim.claim_id) ||
        !textLength(claim.statement, 3, 1000) ||
        !textLength(claim.scope, 3, 500) ||
        !progressKinds.has(claim.progress_kind as ProgressKind)) {
      errors.push("one or more claims are invalid");
      return;
    }
    if (claimIds.has(claim.claim_id)) errors.push("claim identifiers must be unique");
    claimIds.add(claim.claim_id);
    if (claim.completion_percent != null &&
        (typeof claim.completion_percent !== "number" ||
         claim.completion_percent < 0 || claim.completion_percent > 100)) {
      errors.push("claim completion percentage is invalid");
    }
  });

  const evidence = Array.isArray(input.evidence) ? input.evidence : [];
  if (evidence.length < 1 || evidence.length > 10) {
    errors.push("one to ten evidence states are required");
  }
  evidence.forEach((item) => {
    if (!isObject(item) ||
        typeof item.evidence_id !== "string" ||
        !/^E([1-9]|10)$/.test(item.evidence_id) ||
        !Array.isArray(item.claim_ids) ||
        item.claim_ids.length < 1 ||
        !evidenceTypes.has(item.type as EvidenceType) ||
        !evidenceAvailability.has(item.availability as EvidenceAvailability)) {
      errors.push("one or more evidence entries are invalid");
      return;
    }
    if (item.claim_ids.some((id) => typeof id !== "string" || !claimIds.has(id))) {
      errors.push("evidence references an unknown claim");
    }
    if (item.availability === "available_now" &&
        (!textLength(item.reference, 3, 1000) || !textLength(item.verification_method, 3, 1000))) {
      errors.push("available evidence needs a reference and verification method");
    }
    if (item.availability === "expected_later" &&
        !textLength(item.verification_method, 3, 1000)) {
      errors.push("expected evidence needs a verification method");
    }
    if (item.availability === "not_required" &&
        !textLength(item.not_required_reason, 3, 500)) {
      errors.push("not-required evidence needs a reason");
    }
  });

  const testing = Array.isArray(input.testing) ? input.testing : [];
  if (!Array.isArray(input.testing) || testing.length > 10) {
    errors.push("testing must be an array of at most ten entries");
  }
  testing.forEach((item) => {
    if (!isObject(item) || !testingStatuses.has(item.execution_status as TestingStatus)) {
      errors.push("testing execution status is invalid");
      return;
    }
    if (item.execution_status === "executed" &&
        (!textLength(item.method, 3, 1000) || !textLength(item.observed_result, 1, 1000))) {
      errors.push("executed testing needs method and observed result");
    }
    if (item.execution_status === "planned_not_executed" &&
        typeof item.observed_result === "string" && item.observed_result.trim()) {
      errors.push("planned testing cannot contain an observed result");
    }
  });

  const dependencies = Array.isArray(input.dependencies) ? input.dependencies : [];
  if (!Array.isArray(input.dependencies) || dependencies.length > 10) {
    errors.push("dependencies must be an array of at most ten entries");
  }

  const blocker = input.blocker;
  if (!isObject(blocker) ||
      !["none", "active", "resolved", "unknown"].includes(String(blocker.status))) {
    errors.push("blocker state is invalid");
  } else if (["active", "resolved"].includes(String(blocker.status)) &&
             !textLength(blocker.description, 3, 1000)) {
    errors.push("active or resolved blocker needs a description");
  }

  const nextAction = input.next_action;
  if (!isObject(nextAction) ||
      !textLength(nextAction.action, 3, 1000) ||
      typeof nextAction.due_session !== "string" ||
      !/^S([1-9]|10)$/.test(nextAction.due_session) ||
      !textLength(nextAction.expected_evidence, 3, 1000)) {
    errors.push("next action, due Session and expected evidence are required");
  }

  return errors.length
    ? { valid: false, errors: [...new Set(errors)] }
    : { valid: true, value: input as IntakeStudentRecord };
}

export function validateFallbackConversation(input: unknown): string[] {
  if (!Array.isArray(input) || input.length < 3 || input.length > 12) {
    return ["fallback conversation must contain 3 to 12 turns"];
  }
  const errors = input.some((turn) =>
    !isObject(turn) ||
    !["student", "system"].includes(String(turn.actor)) ||
    !textLength(turn.purpose, 3, 80) ||
    !textLength(turn.text, 1, 2000)
  ) ? ["one or more fallback turns are invalid"] : [];
  return errors;
}

export function buildDeterministicSummary(record: IntakeStudentRecord) {
  return {
    label: "Your claim — not yet Teacher verified",
    responsibility: record.responsibility.current.trim(),
    progressClaims: record.claims.map((claim) => ({
      claimId: claim.claim_id,
      statement: claim.statement.trim(),
      progressKind: claim.progress_kind,
    })),
    evidence: record.evidence.map((item) => ({
      evidenceId: item.evidence_id,
      claimIds: item.claim_ids,
      type: item.type,
      availability: item.availability,
      reference: item.reference?.trim() || null,
      verificationMethod: item.verification_method?.trim() || null,
    })),
    testing: record.testing,
    blocker: record.blocker,
    nextAction: record.next_action,
  };
}
