import {evidenceUpdatesSchema,nextStepSchema} from './intakeContract.js';
export const intakeRecordSchema = {
    type: "object", additionalProperties: false,
    properties: {
      assistantMessage: { type: "string", minLength: 1, maxLength: 500 },
      route: { type: "string", enum: ["evidence", "clarification", "small_step", "teacher_help", "review"] },
      readyForReview: { type: "boolean" },
      assessment: {
        type: "object", additionalProperties: false,
        properties: {
          information: { type: "string", enum: ["sparse","focused","complex"] },
          evidenceReadiness: { type: "string", enum: ["unexplained","missing","identified","unknown"] },
          verificationReadiness: { type: "string", enum: ["clear","unclear","unknown"] },
          testingMaturity: { type: "string", enum: ["unknown","planned","executed","not_applicable"] },
          actionability: { type: "string", enum: ["clear","needs_small_step","needs_teacher","unknown"] },
          gap: { type: "string", maxLength: 200 },
          reason: { type: "string", maxLength: 200 },
          sourceTurns: { type: "array", maxItems: 8, items: { type: "integer", minimum: 0, maximum: 15 } }
        },
        required: ["information","evidenceReadiness","verificationReadiness","testingMaturity","actionability","gap","reason","sourceTurns"]
      },
      evidenceUpdates: evidenceUpdatesSchema,
      nextStep: nextStepSchema,
      uncertainties: { type: "array", maxItems: 5, items: { type: "string", maxLength: 180 } },
      suggestedTeacherQuestions: { type: "array", maxItems: 3, items: { type: "string", maxLength: 220 } }
    },
    required: ["assistantMessage", "route", "readyForReview", "assessment", "evidenceUpdates", "nextStep", "uncertainties", "suggestedTeacherQuestions"]
  };
