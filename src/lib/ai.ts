import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z, type ZodType } from "zod";
import { SYSTEM_GUARDRAILS } from "@/lib/prompts";
import type { AiCallMeta } from "@/lib/types";
import { estimateTokens } from "@/lib/utils";
import { ValidationError } from "@/lib/validate";

const openRouterKey = process.env.OPENROUTER_API_KEY;
const groqKey = process.env.GROQ_API_KEY;
const geminiKey = process.env.GEMINI_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;
const usingGroq = Boolean(groqKey);
const usingOpenRouter = Boolean(openRouterKey);
const usingGemini = Boolean(geminiKey);
const selectedModel = usingGroq
  ? process.env.GROQ_MODEL || "qwen/qwen3.8-27b"
  : usingOpenRouter
    ? process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4.1-flash"
  : usingGemini
    ? process.env.GEMINI_MODEL || "gemini-3.8-flash"
    : process.env.OPENAI_MODEL || "gpt-4o-mini";
export const MODEL = selectedModel;

const summarySchema = z.object({
  summary: z.string().min(1).max(2000),
});

export class ModelOutputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelOutputValidationError";
  }
}

export function hasLiveKey(): boolean {
  return Boolean(
    (openRouterKey && openRouterKey !== "demo") ||
    (groqKey && groqKey !== "demo") ||
    (geminiKey && geminiKey !== "demo") ||
    (openaiKey && openaiKey !== "demo")
  );
}

function client(): OpenAI {
  if (usingGroq) {
    return new OpenAI({
      apiKey: groqKey,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  if (usingOpenRouter) {
    return new OpenAI({
      apiKey: openRouterKey,
      baseURL: "https://openrouter.ai/api/v1",
    });
  }
  if (usingGemini) {
    return new OpenAI({
      apiKey: geminiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }
  return new OpenAI({ apiKey: openaiKey });
}

function stripJsonSchemaFormats(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(stripJsonSchemaFormats);
    return;
  }
  if (!value || typeof value !== "object") return;
  const object = value as Record<string, unknown>;
  delete object.format;
  Object.values(object).forEach(stripJsonSchemaFormats);
}

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function normalizeModelEnums(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeModelEnums);
  if (!value || typeof value !== "object") return value;
  const normalized = value as Record<string, unknown>;
  for (const [key, item] of Object.entries(normalized)) {
    if (key === "whyNeeded") {
      if (typeof item === "string") {
        const answer = item.trim().toLowerCase();
        if (["true", "yes", "y", "1", "needed", "required"].includes(answer)) {
          normalized[key] = true;
        } else if (["false", "no", "n", "0", "not needed", "not required", "optional"].includes(answer)) {
          normalized[key] = false;
        }
      } else if (typeof item === "number") {
        normalized[key] = item !== 0;
      }
    } else if (key === "flexibility" && typeof item === "string") {
      const label = item.trim().toLowerCase().replace(/[ _]+/g, "-");
      if (["required", "essential", "must-have", "non-negotiable", "locked", "strict"].includes(label)) {
        normalized[key] = "fixed";
      } else if (["nonessential", "discretionary", "nice-to-have", "can-be-cut", "can-cut"].includes(label)) {
        normalized[key] = "optional";
      } else if (["flex", "adjustable", "variable", "preferred", "medium", "moderate"].includes(label)) {
        normalized[key] = "flexible";
      }
    } else if (key === "risk" && typeof item === "string") {
      const label = item.trim().toLowerCase();
      if (["medium", "moderate", "med", "warning"].includes(label)) {
        normalized[key] = "watch";
      }
    } else if (key === "priority" && typeof item === "string") {
      const label = item.trim().toLowerCase();
      if (["high", "urgent", "immediate", "critical"].includes(label)) {
        normalized[key] = "now";
      } else if (["medium", "med", "normal"].includes(label)) {
        normalized[key] = "soon";
      } else if (["low"].includes(label)) {
        normalized[key] = "later";
      }
    } else if (key === "status" && typeof item === "string") {
      const label = item.trim().toLowerCase();
      if (["mandatory", "must", "needed"].includes(label)) {
        normalized[key] = "required";
      } else if (["suggested", "advised"].includes(label)) {
        normalized[key] = "recommended";
      }
    } else if (key === "budgetFit" && typeof item === "string") {
      const label = item.trim().toLowerCase();
      if (["budget", "cheap", "low", "minimal", "basic"].includes(label)) {
        normalized[key] = "lean";
      } else if (["mid", "medium", "moderate", "standard", "average"].includes(label)) {
        normalized[key] = "balanced";
      } else if (["luxury", "high-end", "premium", "deluxe"].includes(label)) {
        normalized[key] = "elevated";
      }
    } else {
      normalized[key] = normalizeModelEnums(item);
    }
  }
  return normalized;
}

const arrayFields = new Set([
  "nextActions", "lines", "savingsIdeas", "overrunRisks", "items", "vendors",
  "questionsToAsk", "themes", "ideas", "consultationQuestions", "options", "pros", "cons",
]);

function normalizeModelArrays(value: unknown, field = ""): unknown {
  if (Array.isArray(value)) return value.map((item) => normalizeModelArrays(item));
  if (!value || typeof value !== "object") {
    if (typeof value !== "string" || !arrayFields.has(field)) return value;
    const trimmed = value.trim();
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((item) => normalizeModelArrays(item));
    } catch {
      // Models sometimes write lists as numbered or bulleted text instead of JSON arrays.
    }
    const parts = trimmed
      .split(/\r?\n|;|\s+(?=\d+[.)]\s)|\s+(?=[•*-]\s)/)
      .map((part) => part.replace(/^\s*(?:\d+[.)]|[•*-])\s*/, "").trim())
      .filter(Boolean);
    return parts.length ? parts : [trimmed];
  }

  const normalized = value as Record<string, unknown>;
  for (const [key, item] of Object.entries(normalized)) {
    normalized[key] = normalizeModelArrays(item, key);
  }
  return normalized;
}

export function parseJson<T>(raw: string, schema: ZodType<T>): T {
  const cleaned = stripFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new ModelOutputValidationError("Model returned non-JSON output.");
  }
  const result = schema.safeParse(normalizeModelEnums(normalizeModelArrays(parsed)));
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.length ? issue.path.join(".") : "response";
    throw new ModelOutputValidationError(
      `Model JSON failed schema validation at ${path}: ${issue?.message ?? "invalid output"}`
    );
  }
  return result.data;
}

export async function completeJson<T>(
  userPrompt: string,
  schema: ZodType<T>,
  extraSystem = ""
): Promise<{ data: T; meta: AiCallMeta }> {
  if (!hasLiveKey()) {
    throw new ValidationError("Live model key is not configured.");
  }
  const openai = client();
  const run = async (repairNote?: string) => {
    const usesStructuredOutput = usingGroq || usingOpenRouter;
    const responseFormat = usesStructuredOutput
      ? zodResponseFormat(schema, "planner_response")
      : { type: "json_object" as const };
    if (usingGroq) {
      const jsonSchema = (responseFormat as unknown as { json_schema: { schema: unknown } }).json_schema.schema;
      stripJsonSchemaFormats(jsonSchema);
    }
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      ...(usingGroq ? { max_completion_tokens: 8192, reasoning_effort: "none" as const } : {}),
      ...(usingOpenRouter
        ? { provider: { require_parameters: true }, max_tokens: 8192, reasoning: { enabled: false } }
        : {}),
      response_format: responseFormat,
      messages: [
        { role: "system", content: `${SYSTEM_GUARDRAILS}\n${extraSystem}`.trim() },
        { role: "user", content: userPrompt },
        ...(repairNote ? [{ role: "user" as const, content: repairNote }] : []),
      ],
    });
    const text = completion.choices[0]?.message?.content || "";
    return parseJson(text, schema);
  };
  try {
    return { data: await run(), meta: { mode: "live", model: MODEL } };
  } catch (first) {
    // Retrying transport, authentication, and rate-limit failures only adds latency.
    // The repair call is useful when the provider answered but its JSON is invalid.
    if (!(first instanceof ModelOutputValidationError)) throw first;
    try {
      const detail = first instanceof Error ? first.message : "unknown validation error";
      const data = await run(
        `The previous response failed validation (${detail}). Return a corrected complete JSON object matching the requested structure and every allowed value exactly. When a field expects a list, return a JSON array, never a single string. Do not include markdown.`
      );
      return {
        data,
        meta: { mode: "live", model: MODEL, reason: "repaired after schema mismatch" },
      };
    } catch (retryError) {
      throw retryError instanceof Error ? retryError : first instanceof Error ? first : new Error("Live model call failed.");
    }
  }
}

export function extractiveSummary(messages: { role: string; content: string }[]): string {
  const transcript = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join(" ")
    .replace(/\s+/g, " ");
  // `messages` already contains only turns removed from the live context window.
  // Keep its newest details when the bounded extractive memory is full.
  const clipped = transcript.length > 900 ? `…${transcript.slice(-899)}` : transcript;
  if (!clipped) return "No earlier decisions recorded.";
  return `Earlier context (${estimateTokens(clipped)} est. tokens): ${clipped}`;
}

export async function summarizeIfNeeded(
  dropped: { role: string; content: string }[],
  droppedTokens: number
): Promise<string | null> {
  if (!dropped.length) return null;
  // Avoid an extra model round trip for modest history; reserve live summarization
  // for conversations where preserving older context is likely to pay for its latency.
  if (!hasLiveKey() || droppedTokens < 1_200) return extractiveSummary(dropped);
  const transcript = dropped.map((m) => `${m.role}: ${m.content}`).join("\n").slice(0, 12000);
  const { data } = await completeJson(
    `Summarise this planning chat for future context. Keep decisions, numbers, names, constraints, and open questions. Max 180 words.\n\n${transcript}\n\nReturn JSON { "summary": string }.`,
    summarySchema
  );
  return data.summary;
}
