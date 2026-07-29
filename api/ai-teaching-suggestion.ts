const MAX_BODY_BYTES = 20_000;

type TeachingSuggestionRequest = {
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
  };
};

const text = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

function normalise(body: TeachingSuggestionRequest) {
  return {
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
    },
  };
}

async function isTeacher(token: string) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) return false;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) return false;
  const user = (await response.json()) as {
    app_metadata?: { role?: string };
  };
  return user.app_metadata?.role === "teacher";
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
    !Object.values(context.teacherVerification).some(
      (value) => value && value !== "Not reviewed",
    )
  ) {
    return res.status(400).json({
      error: "Begin teacher verification before generating a suggestion.",
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
      max_output_tokens: 450,
      instructions:
        "You are a supportive software-engineering studio teaching copilot. Analyse only the supplied project and verification evidence. Do not grade, score, diagnose performance, infer identity, or make disciplinary claims. Give concise, practical advice for a live teacher-student conversation. The teaching spark should be playful but respectful and specific to the project area. If evidence is incomplete, frame uncertainty as something to verify.",
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
              current_signal: {
                type: "string",
                description: "One concise evidence-based observation, maximum 45 words.",
              },
              ask_the_student: {
                type: "string",
                description: "One useful question for the teacher to ask, maximum 35 words.",
              },
              suggested_next_action: {
                type: "string",
                description: "One concrete next action, maximum 35 words.",
              },
              teaching_spark: {
                type: "string",
                description: "One engaging project-area-specific challenge, maximum 35 words.",
              },
            },
            required: [
              "current_signal",
              "ask_the_student",
              "suggested_next_action",
              "teaching_spark",
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
