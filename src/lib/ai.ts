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
const usingOpenRouter = Boolean(openRouterKey);
const usingGroq = Boolean(groqKey);
const usingGemini = Boolean(geminiKey);
const selectedModel = usingOpenRouter
  ? process.env.OPENROUTER_MODEL || "openrouter/auto"
  : usingGroq
    ? process.env.GROQ_MODEL || "qwen/qwen3.8-27b"
  : usingGemini
    ? process.env.GEMINI_MODEL || "gemini-3.8-flash"
    : process.env.OPENAI_MODEL || "gpt-4o-mini";
export const MODEL = selectedModel;

const summarySchema = z.object({
  summary: z.string().min(1).max(2000),
});

export function hasLiveKey(): boolean {
  return Boolean(
    (openRouterKey && openRouterKey !== "demo") ||
    (groqKey && groqKey !== "demo") ||
    (geminiKey && geminiKey !== "demo") ||
    (openaiKey && openaiKey !== "demo")
  );
}

function client(): OpenAI {
  if (usingOpenRouter) {
    return new OpenAI({
      apiKey: openRouterKey,
      baseURL: "https://openrouter.ai/api/v1",
    });
  }
  if (usingGroq) {
    return new OpenAI({
      apiKey: groqKey,
      baseURL: "https://api.groq.com/openai/v1",
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
    if (key === "flexibility" && typeof item === "string") {
      const label = item.trim().toLowerCase().replace(/[ _]+/g, "-");
      if (["required", "essential", "must-have", "non-negotiable", "locked"].includes(label)) {
        normalized[key] = "fixed";
      } else if (["nonessential", "discretionary", "nice-to-have", "can-be-cut"].includes(label)) {
        normalized[key] = "optional";
      } else if (["flex", "adjustable", "variable", "preferred"].includes(label)) {
        normalized[key] = "flexible";
      }
    } else {
      normalized[key] = normalizeModelEnums(item);
    }
  }
  return normalized;
}

export function parseJson<T>(raw: string, schema: ZodType<T>): T {
  const cleaned = stripFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Model returned non-JSON output.");
  }
  const result = schema.safeParse(normalizeModelEnums(parsed));
  if (!result.success) {
    throw new Error(`Model JSON failed schema validation: ${result.error.issues[0]?.message}`);
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
    const responseFormat = usingGroq
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
    try {
      const detail = first instanceof Error ? first.message : "unknown validation error";
      return {
        data: await run(
          `The previous response failed validation (${detail}). Return a corrected complete JSON object matching the requested structure and every allowed value exactly. Do not include markdown.`
        ),
        meta: { mode: "live", model: MODEL, reason: "repaired after schema mismatch" },
      };
    } catch {
      throw first instanceof Error ? first : new Error("Live model call failed.");
    }
  }
}

export function extractiveSummary(messages: { role: string; content: string }[]): string {
  const older = messages.slice(0, Math.max(0, messages.length - 4));
  const clipped = older
    .map((m) => `${m.role}: ${m.content}`)
    .join(" ")
    .replace(/\s+/g, " ")
    .slice(0, 900);
  if (!clipped) return "No earlier decisions recorded.";
  return `Earlier context (${estimateTokens(clipped)} est. tokens): ${clipped}`;
}

export async function summarizeIfNeeded(
  dropped: { role: string; content: string }[],
  droppedTokens: number
): Promise<string | null> {
  if (!dropped.length) return null;
  if (!hasLiveKey() || droppedTokens < 400) return extractiveSummary(dropped);
  const transcript = dropped.map((m) => `${m.role}: ${m.content}`).join("\n").slice(0, 12000);
  const { data } = await completeJson(
    `Summarise this planning chat for future context. Keep decisions, numbers, names, constraints, and open questions. Max 180 words.\n\n${transcript}\n\nReturn JSON { "summary": string }.`,
    summarySchema
  );
  return data.summary;
}
