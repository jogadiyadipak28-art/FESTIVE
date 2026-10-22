/** Budget-only refresh. GenAI: budgetPlanSchema through completeJson. */
import { NextResponse } from "next/server";
import { liveOrDemo, readJson, fail } from "@/lib/api-handler";
import { demoPlan } from "@/lib/demo";
import { budgetPrompt } from "@/lib/prompts";
import { budgetPlanSchema, eventBriefSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validate";
import type { EventBrief } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const brief = parseBody(eventBriefSchema, await readJson(req)) as EventBrief;
    const result = await liveOrDemo({
      brief,
      prompt: budgetPrompt(brief),
      schema: budgetPlanSchema,
      demo: () => demoPlan(brief).budget,
    });
    return NextResponse.json(result);
  } catch (error) {
    return fail(error);
  }
}
