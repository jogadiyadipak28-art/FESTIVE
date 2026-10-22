/** Timeline refresh. GenAI: eventTimelineSchema through completeJson. */
import { NextResponse } from "next/server";
import { liveOrDemo, readJson, fail } from "@/lib/api-handler";
import { demoPlan } from "@/lib/demo";
import { timelinePrompt } from "@/lib/prompts";
import { eventBriefSchema, eventTimelineSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validate";
import type { EventBrief } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const brief = parseBody(eventBriefSchema, await readJson(req)) as EventBrief;
    const result = await liveOrDemo({
      brief,
      prompt: timelinePrompt(brief),
      schema: eventTimelineSchema,
      demo: () => demoPlan(brief).timeline,
    });
    return NextResponse.json(result);
  } catch (error) {
    return fail(error);
  }
}
