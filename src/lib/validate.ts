import { ZodError, type ZodType } from "zod";
import { estimateTokens } from "@/lib/utils";
import { eventBriefSchema } from "@/lib/schemas";
import type { EventBrief } from "@/lib/types";

export const MAX_TEXT_CHARS = 12_000;
export const MAX_QUESTION_CHARS = 2_000;
export const MAX_MESSAGES = 40;
export const MAX_CONTEXT_TOKENS = 6_000;

export class ValidationError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function parseBody<T>(schema: ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ValidationError(formatZod(result.error));
  }
  return result.data;
}

export function formatZod(error: ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join("; ");
}

export function assertBrief(brief: EventBrief): EventBrief {
  const parsed = eventBriefSchema.safeParse(brief);
  if (!parsed.success) throw new ValidationError(formatZod(parsed.error));
  const joined = [
    parsed.data.title,
    parsed.data.vibe,
    parsed.data.mustHaves,
    parsed.data.constraints,
    parsed.data.culturalNotes,
  ].join("\n");
  if (joined.length > MAX_TEXT_CHARS) {
    throw new ValidationError(`Event details exceed ${MAX_TEXT_CHARS} characters.`);
  }
  return parsed.data;
}

export function assertQuestion(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) throw new ValidationError("Question cannot be empty.");
  if (trimmed.length > MAX_QUESTION_CHARS) {
    throw new ValidationError(`Question exceeds ${MAX_QUESTION_CHARS} characters.`);
  }
  return trimmed;
}

export function budgetContext(messages: { role: string; content: string }[]): {
  kept: { role: string; content: string }[];
  droppedTokens: number;
} {
  if (messages.length > MAX_MESSAGES) {
    throw new ValidationError(`At most ${MAX_MESSAGES} chat messages are allowed.`);
  }
  let tokens = 0;
  const kept: { role: string; content: string }[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const t = estimateTokens(msg.content);
    if (tokens + t > MAX_CONTEXT_TOKENS && kept.length > 2) break;
    tokens += t;
    kept.unshift(msg);
  }
  const dropped = messages.slice(0, messages.length - kept.length);
  const droppedTokens = dropped.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  return { kept, droppedTokens };
}
