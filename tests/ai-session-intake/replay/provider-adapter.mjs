// Lightweight BENCHMARK-ONLY provider adapter (B3 part 4).
//
// Abstracts two providers behind one interface that returns the SAME normalized
// shape the benchmark already consumes: { parsedCandidate, usage, rawBody,
// outputText, providerStatus, attempts }. It does NOT change the production
// endpoint and does NOT tune provider-specific prompts — the shared Harness rules,
// candidate schema, validation and benchmark inputs are identical across providers.
//
// Providers:
//  - 'openai'  : uses the existing deployed endpoint /api/session-intake-ai
//                (OpenAI Responses API internally). This is the stable comparison
//                target; the adapter calls it exactly as the current live driver
//                does (no behavior change).
//  - 'deepseek': OpenAI-COMPATIBLE Chat Completions. Official config verified
//                2026-10-04 from https://api-docs.deepseek.com/ :
//                  base_url = https://api.deepseek.com
//                  endpoint = POST /chat/completions
//                  model    = deepseek-flash  (also deepseek-v4-pro)
//                  auth     = Authorization: Bearer $DEEPSEEK_API_KEY
//                  response = choices[0].message.content (NOT output_text)
//                KEY API DIFFERENCES vs the OpenAI Responses API used by the
//                endpoint: path (/chat/completions vs /v1/responses), output field
//                (choices[].message.content vs output_text), token param
//                (max_tokens vs max_output_tokens), structured output
//                (response_format:{type:'json_object'} vs text.format.json_schema).
//                The adapter normalizes these; it NEVER prints or commits the key.
//
// Credentials: env only (OPENAI via the server; DEEPSEEK_API_KEY for DeepSeek).
// If DeepSeek creds are absent, deepseekConfigured() returns false and callers
// should skip the live DeepSeek path and report the missing configuration.
//
// NO network call is made by importing this module. Live calls require explicit
// approval and are NOT invoked in offline work.

export const PROVIDER_CONFIG = {
  openai: {
    id: 'openai',
    via: 'existing_endpoint:/api/session-intake-ai',
    api: 'responses',           // OpenAI Responses API (as the production endpoint uses)
    model: process.env.OPENAI_INTAKE_MODEL || process.env.OPENAI_MODEL || 'gpt-5-mini',
    note: 'Stable comparison target; adapter calls the deployed endpoint unchanged.',
  },
  deepseek: {
    id: 'deepseek',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    endpoint: '/chat/completions',
    api: 'chat_completions',    // OpenAI-compatible Chat Completions
    model: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
    docsVerified: '2026-10-04 https://api-docs.deepseek.com/',
    note: 'OpenAI-compatible; output in choices[0].message.content; uses max_tokens + response_format.',
  },
};

export function deepseekConfigured() {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

export function providerStatus() {
  return {
    openai: { configured: true, via: PROVIDER_CONFIG.openai.via, model: PROVIDER_CONFIG.openai.model },
    deepseek: { configured: deepseekConfigured(), baseUrl: PROVIDER_CONFIG.deepseek.baseUrl, model: PROVIDER_CONFIG.deepseek.model, missing: deepseekConfigured() ? null : 'DEEPSEEK_API_KEY not set in local env' },
  };
}

// Normalize a DeepSeek Chat Completions response body to the common shape.
// (Pure function; no network. Used to validate normalization offline with mocks.)
export function normalizeDeepSeek(body) {
  const content = body?.choices?.[0]?.message?.content ?? '';
  let parsedCandidate = null;
  try { parsedCandidate = content ? JSON.parse(content) : null; } catch { parsedCandidate = null; }
  const u = body?.usage || null;
  return {
    provider: 'deepseek',
    providerStatus: body?.choices?.[0]?.finish_reason === 'length' ? 'incomplete' : 'completed',
    outputText: content,                 // genuine raw output text
    parsedCandidate,                     // JSON.parse(content) — parsed candidate, not raw body
    usage: u ? { input_tokens: u.prompt_tokens ?? 0, output_tokens: u.completion_tokens ?? 0 } : null,
    rawBody: body,
  };
}

// Normalize an OpenAI Responses API response body (same contract the endpoint uses
// via outputText()). Pure function.
export function normalizeOpenAIResponses(body) {
  let outputText = typeof body?.output_text === 'string' ? body.output_text : '';
  if (!outputText) { for (const item of body?.output ?? []) for (const part of item?.content ?? []) if (part?.type === 'output_text' && typeof part.text === 'string') outputText = part.text; }
  let parsedCandidate = null;
  try { parsedCandidate = outputText ? JSON.parse(outputText) : null; } catch { parsedCandidate = null; }
  const u = body?.usage || null;
  return {
    provider: 'openai',
    providerStatus: body?.status === 'incomplete' ? 'incomplete' : 'completed',
    outputText,
    parsedCandidate,
    usage: u ? { input_tokens: u.input_tokens ?? 0, output_tokens: u.output_tokens ?? 0 } : null,
    rawBody: body,
  };
}

// Build a DeepSeek request body from the SHARED instructions + conversation.
// The instructions are the SAME shared Harness rules (passed in by the caller);
// this adapter does NOT craft a provider-specific prompt to improve scores.
export function buildDeepSeekRequest({ model, instructions, inputJson, maxTokens }) {
  return {
    model: model || PROVIDER_CONFIG.deepseek.model,
    messages: [
      { role: 'system', content: instructions },
      { role: 'user', content: inputJson },
    ],
    max_tokens: maxTokens ?? 4000,
    response_format: { type: 'json_object' },  // closest OpenAI-compatible structured-output
    stream: false,
  };
}
