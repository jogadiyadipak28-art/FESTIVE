/** Compare two venues, themes, or catering paths. */
import { NextResponse } from "next/server";
import { liveOrDemo, readJson, fail } from "@/lib/api-handler";
import { demoComparison } from "@/lib/demo";
import { comparePrompt } from "@/lib/prompts";
import { compareRequestSchema, eventComparisonSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validate";

export async function POST(req: Request) {
  try {
    const body = parseBody(compareRequestSchema, await readJson(req));
    const result = await liveOrDemo({
      brief: body.brief,
      prompt: comparePrompt(body.brief, body.optionA, body.optionB),
      schema: eventComparisonSchema,
      demo: () => demoComparison(body.brief, body.optionA, body.optionB),
    });
    return NextResponse.json(result);
  } catch (error) {
    return fail(error);
  }
}
