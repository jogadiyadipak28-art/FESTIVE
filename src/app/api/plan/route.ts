/**
 * Product surface: generate a full wedding / birthday / community planning pack.
 * GenAI: structured JSON via lib/ai.completeJson, Zod-validated against eventPlanSchema.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { liveOrDemo, readJson, fail } from "@/lib/api-handler";
import { demoPlan } from "@/lib/demo";
import { planPrompt } from "@/lib/prompts";
import { eventBriefSchema, eventPlanSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validate";

const requestSchema = eventBriefSchema.extend({
  forceDemo: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const body = parseBody(requestSchema, await readJson(req));
    const { forceDemo, ...brief } = body;
    const result = await liveOrDemo({
      brief,
      prompt: planPrompt(brief),
      schema: eventPlanSchema,
      demo: () => demoPlan(brief),
      forceDemo: Boolean(forceDemo),
    });
    return NextResponse.json(result);
  } catch (error) {
    return fail(error);
  }
}
