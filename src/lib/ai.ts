import OpenAI from "openai";
import { z, type ZodType } from "zod";
import { SYSTEM_GUARDRAILS } from "@/lib/prompts";
import type { AiCallMeta } from "@/lib/types";
import { estimateTokens } from "@/lib/utils";
import { ValidationError } from "@/lib/validate";

const geminiKey = process.env.GEMINI_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;
const usingGemini = Boolean(geminiKey);
const geminiModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";
export const MODEL = usingGemini
  ? geminiModel
  : process.env.OPENAI_MODEL || "gpt-4o-mini";

const summarySchema = z.object({
  summary: z.string().min(1).max(2000),
});

export function hasLiveKey(): boolean {
  return Boolean((geminiKey && geminiKey !== "demo") || (openaiKey && openaiKey !== "demo"));
}

function client(): OpenAI {
  if (usingGemini) {
    return new OpenAI({
      apiKey: geminiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }
  return new OpenAI({ apiKey: openaiKey });
}

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

export function parseJson<T>(raw: string, schema: ZodType<T>): T {
  const cleaned = stripFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Model returned non-JSON output.");
  }
  const result = schema.safeParse(parsed);
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
  const run = async () => {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${SYSTEM_GUARDRAILS}\n${extraSystem}`.trim() },
        { role: "user", content: userPrompt },
      ],
    });
    const text = completion.choices[0]?.message?.content || "";
    return parseJson(text, schema);
  };
  try {
    return { data: await run(), meta: { mode: "live", model: MODEL } };
  } catch (first) {
    try {
      return { data: await run(), meta: { mode: "live", model: MODEL, reason: "retried after schema mismatch" } };
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
