/**
 * Conversational planning help.
 * Token-aware: budgetContext trims oldest turns; dropped turns are summarised
 * (live model when available, extractive fallback otherwise) instead of a raw slice.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { completeJson, hasLiveKey, summarizeIfNeeded } from "@/lib/ai";
import { fail, readJson } from "@/lib/api-handler";
import { demoChatReply } from "@/lib/demo";
import { chatPrompt } from "@/lib/prompts";
import { chatRequestSchema } from "@/lib/schemas";
import { assertQuestion, budgetContext, parseBody } from "@/lib/validate";

const replySchema = z.object({ reply: z.string().min(1).max(4000) });

export async function POST(req: Request) {
  try {
    const body = parseBody(chatRequestSchema, await readJson(req));
    const last = body.messages[body.messages.length - 1];
    if (!last || last.role !== "user") {
      return NextResponse.json({ error: "Last message must be from the user." }, { status: 400 });
    }
    assertQuestion(last.content);
    const { kept, droppedTokens } = budgetContext(body.messages);
    const dropped = body.messages.slice(0, body.messages.length - kept.length);
    const memory = await summarizeIfNeeded(dropped, droppedTokens);

    if (!hasLiveKey()) {
      return NextResponse.json({
        data: { reply: demoChatReply(last.content, body.brief) },
        demo: true,
        reason: "missing AI API key",
        memory,
      });
    }

    try {
      const prompt = `${chatPrompt(body.brief, body.planSummary)}
${memory ? `\nMemory of earlier turns:\n${memory}` : ""}
\nTranscript:\n${kept.map((m) => `${m.role}: ${m.content}`).join("\n")}`;
      const { data } = await completeJson(prompt, replySchema);
      return NextResponse.json({ data, demo: false, memory });
    } catch (error) {
      return NextResponse.json({
        data: { reply: demoChatReply(last.content, body.brief) },
        demo: true,
        reason: error instanceof Error ? `live failed: ${error.message}` : "live failed",
        memory,
      });
    }
  } catch (error) {
    return fail(error);
  }
}
