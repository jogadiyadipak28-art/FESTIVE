import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { completeJson, hasLiveKey } from "@/lib/ai";
import { ValidationError, assertBrief } from "@/lib/validate";
import type { EventBrief } from "@/lib/types";

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ValidationError("Request body must be JSON.");
  }
}

export function fail(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message, demo: false }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  return NextResponse.json({ error: message, demo: false }, { status: 500 });
}

export async function liveOrDemo<T>(args: {
  brief: EventBrief;
  prompt: string;
  schema: ZodType<T>;
  demo: () => T;
  forceDemo?: boolean;
}): Promise<{ data: T; demo: boolean; reason?: string }> {
  assertBrief(args.brief);
  const wantDemo = args.forceDemo || !hasLiveKey();
  if (wantDemo) {
    return { data: args.demo(), demo: true, reason: hasLiveKey() ? "explicit demo" : "missing AI API key" };
  }
  try {
    const { data } = await completeJson(args.prompt, args.schema);
    return { data, demo: false };
  } catch (error) {
    return {
      data: args.demo(),
      demo: true,
      reason: error instanceof Error ? `live failed: ${error.message}` : "live failed",
    };
  }
}
