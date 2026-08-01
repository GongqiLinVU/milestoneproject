import { createClient } from "@supabase/supabase-js";

const MAX_BODY_BYTES = 20_000;

type SuggestionStage = "starting" | "closing";

type TeachingSuggestionRequest = {
  stage?: SuggestionStage;
  project?: {
    name?: string;
    area?: string;
    description?: string;
    targetUserProblem?: string;
  };
  implementation?: {
    claim?: string;
    state?: string;
    location?: string;
    evidenceReference?: string;
    demonstrationPlan?: string;
    verificationLevel?: string;
    methods?: string;
    remainingIssue?: string;
    nextAction?: string;
  };
  teacherVerification?: {
    reviewOutcome?: string;
    demonstrationOutcome?: string;
    methodExplanation?: string;
    evidenceQuality?: string;
    contributionVerification?: string;
    reportAlignment?: string;
    conversationNote?: string;
    followUpStatus?: string;
    followUpNote?: string;
  };
};

const text = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

function normalise(body: TeachingSuggestionRequest) {
  return {
    stage: body.stage === "closing" ? "closing" : "starting",
    project: {
      name: text(body.project?.name, 120),
      area: text(body.project?.area, 80),
      description: text(body.project?.description, 500),
      targetUserProblem: text(body.project?.targetUserProblem, 250),
    },
    implementation: {
      claim: text(body.implementation?.claim, 350),
      state: text(body.implementation?.state, 100),
      location: text(body.implementation?.location, 150),
      evidenceReference: text(body.implementation?.evidenceReference, 200),
      demonstrationPlan: text(body.implementation?.demonstrationPlan, 150),
      verificationLevel: text(body.implementation?.verificationLevel, 120),
      methods: text(body.implementation?.methods, 300),
      remainingIssue: text(body.implementation?.remainingIssue, 150),
      nextAction: text(body.implementation?.nextAction, 150),
    },
    teacherVerification: {
      reviewOutcome: text(body.teacherVerification?.reviewOutcome, 100),
      demonstrationOutcome: text(body.teacherVerification?.demonstrationOutcome, 100),
      methodExplanation: text(body.teacherVerification?.methodExplanation, 100),
      evidenceQuality: text(body.teacherVerification?.evidenceQuality, 100),
      contributionVerification: text(body.teacherVerification?.contributionVerification, 100),
      reportAlignment: text(body.teacherVerification?.reportAlignment, 100),
      conversationNote: text(body.teacherVerification?.conversationNote, 800),
      followUpStatus: text(body.teacherVerification?.followUpStatus, 100),
      followUpNote: text(body.teacherVerification?.followUpNote, 400),
    },
  };
}

async function isTeacher(token: string) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return false;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error } = await admin.auth.getUser(token);
  return !error && user?.app_metadata?.role === "teacher";
}

function outputText(response: any) {
  if (typeof response.output_text === "string") return response.output_text;
  for (const item of response.output ?? []) {
    for (const part of item.content ?? []) {
      if (part.type === "output_text" && typeof part.text === "string") {
        return part.text;
      }
    }
  }
  return "";
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const bearer = String(req.headers.authorization ?? "");
  const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
  if (!token || !(await isTeacher(token))) {
    return res.status(403).json({ error: "Teacher access required." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: "AI teaching suggestions are not configured yet.",
    });
  }

  const rawLength = Buffer.byteLength(JSON.stringify(req.body ?? {}), "utf8");
  if (rawLength > MAX_BODY_BYTES) {
    return res.status(413).json({ error: "Request is too large." });
  }

  const context = normalise((req.body ?? {}) as TeachingSuggestionRequest);
  if (
    !context.project.name ||
    !context.project.description ||
    !context.implementation.claim
  ) {
    return res.status(400).json({
      error: "Project name, description and implementation claim are required.",
    });
  }
  if (
    context.stage === "closing" &&
    !Object.values(context.teacherVerification).some(
      (value) => value && value !== "Not reviewed",
    )
  ) {
    return res.status(400).json({
      error: "Begin teacher verification before generating a closing suggestion.",
    });
  }

  const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      store: false,
      max_output_tokens: 900,
      instructions:
        context.stage === "starting"
          ? "You are a supportive software-engineering studio teaching copilot preparing a teacher to begin a live review. Analyse only the supplied project and student pre-check. Do not use teacher verification, grade, score, diagnose performance, infer identity, or make disciplinary claims. Give one tentative signal and exactly three genuinely different conversation paths. Each path needs a short title, a distinct focus, one question, one evidence check, and one playful but respectful project-specific teaching spark. Treat every claim as unverified until demonstrated."
          : "You are a supportive software-engineering studio teaching copilot helping a teacher close a live review. Compare the student pre-check with the supplied teacher verification. Do not grade, score, diagnose performance, infer identity, or make disciplinary claims. State what the review clarified or changed and provide exactly three distinct, practical next-step choices. End with a supportive project-specific teaching message. If evidence remains incomplete, state the uncertainty.",
      input: JSON.stringify(context),
      text: {
        format: {
          type: "json_schema",
          name: "teaching_suggestion",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              signal: {
                type: "string",
                description: "Starting: one tentative initial signal. Closing: one final evidence-based signal. Maximum 45 words.",
              },
              question_or_clarification: {
                type: "string",
                description: "Starting: one useful question to ask. Closing: what the review clarified. Maximum 40 words.",
              },
              action_or_verification: {
                type: "string",
                description: "Starting: one item to verify. Closing: one recommended next action. Maximum 40 words.",
              },
              teaching_message: {
                type: "string",
                description: "Starting: one engaging teaching spark. Closing: one supportive closing message. Maximum 40 words.",
              },
              what_changed_after_review: {
                type: "string",
                description: "Starting: return an empty string. Closing: briefly compare the pre-check with verification and state what changed, maximum 45 words.",
              },
              discussion_paths: {
                type: "array",
                description: "Starting: exactly three distinct conversation paths. Closing: return an empty array.",
                minItems: context.stage === "starting" ? 3 : 0,
                maxItems: context.stage === "starting" ? 3 : 0,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string", description: "A scannable path title, maximum 7 words." },
                    focus: { type: "string", description: "Why this direction may be useful, maximum 24 words." },
                    question: { type: "string", description: "One question to ask the student, maximum 30 words." },
                    evidence_check: { type: "string", description: "One concrete demo, code or method check, maximum 30 words." },
                    teaching_spark: { type: "string", description: "One playful project-specific challenge, maximum 30 words." },
                  },
                  required: ["title", "focus", "question", "evidence_check", "teaching_spark"],
                },
              },
              next_step_options: {
                type: "array",
                description: "Starting: return an empty array. Closing: exactly three distinct next-step choices.",
                minItems: context.stage === "closing" ? 3 : 0,
                maxItems: context.stage === "closing" ? 3 : 0,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string", description: "A scannable action title, maximum 6 words." },
                    action: { type: "string", description: "A concrete next action, maximum 35 words." },
                  },
                  required: ["title", "action"],
                },
              },
            },
            required: [
              "signal",
              "question_or_clarification",
              "action_or_verification",
              "teaching_message",
              "what_changed_after_review",
              "discussion_paths",
              "next_step_options",
            ],
          },
        },
      },
    }),
  });

  if (!openAiResponse.ok) {
    const requestId = openAiResponse.headers.get("x-request-id");
    console.error("OpenAI request failed", openAiResponse.status, requestId);
    return res.status(502).json({
      error: "The AI suggestion could not be generated. Please try again.",
    });
  }

  const openAiResult = await openAiResponse.json();
  try {
    const suggestion = JSON.parse(outputText(openAiResult));
    return res.status(200).json({ suggestion });
  } catch {
    console.error("OpenAI returned an unreadable structured response.");
    return res.status(502).json({
      error: "The AI suggestion could not be read. Please try again.",
    });
  }
}
