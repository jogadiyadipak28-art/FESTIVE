import type { EventBrief } from "@/lib/types";

export const SYSTEM_GUARDRAILS = `You are Festiva, a GenAI event planning assistant for weddings, birthdays, and community events.
You help people organise budgets, timelines, vendor checklists, and personalised ideas.

Guardrails:
- You assist with planning. You do not replace licensed planners, venues, insurers, or legal/financial professionals.
- Never invent booked vendors, real-time prices, or availability. Mark figures as estimates.
- Respect cultural, religious, and accessibility notes from the guest. Do not stereotype.
- Refuse requests that would enable harm, illegal activity, or unsafe crowd/fire setups. Suggest licensed professionals instead.
- Output must match the requested JSON schema exactly. No markdown fences.
- Keep language warm, specific, and actionable.`;

export function briefBlock(brief: EventBrief): string {
  return [
    `Event type: ${brief.eventType}`,
    `Title: ${brief.title}`,
    `Host: ${brief.hostName}`,
    `Date: ${brief.date}`,
    `Location: ${brief.location}`,
    `Guests: ${brief.guestCount}`,
    `Budget: ${brief.currency} ${brief.budget}`,
    `Vibe: ${brief.vibe}`,
    `Must-haves: ${brief.mustHaves || "none specified"}`,
    `Constraints: ${brief.constraints || "none specified"}`,
    `Cultural / accessibility notes: ${brief.culturalNotes || "none specified"}`,
  ].join("\n");
}

export function planPrompt(brief: EventBrief): string {
  return `Build a complete planning pack for this event.

${briefBlock(brief)}

Return JSON with:
headline, plainLanguageBrief, nextActions (3-6),
budget { total, currency, summary, lines[{category,amount,percent,notes,flexibility}], savingsIdeas, overrunRisks[{item,risk,mitigation}] },
timeline { summary, items[{weekOffset,dateHint,title,owner,details,priority}] } — at least 8 items spanning before and day-of,
vendors { summary, vendors[{role,whyNeeded,status,questionsToAsk,bookingWindow,budgetBand}] },
ideas { summary, themes, ideas[{title,description,forEventType,budgetFit,imgUrl}] } — imgUrl must be real Unsplash URLs matching the idea,
consultationQuestions (what to ask a human planner/venue),
disclaimer (one sentence that this is assistance, not professional advice).

STRICT ENUM VALUES — use ONLY these exact strings (any other value will cause an error):
- flexibility: "fixed" | "flexible" | "optional"
- risk: "low" | "watch" | "high"
- priority: "now" | "soon" | "later"
- status: "required" | "recommended" | "optional"
- budgetFit: "lean" | "balanced" | "elevated"
- forEventType: "wedding" | "birthday" | "community"
Budget line amounts must sum to approximately the stated budget.`;
}

export function budgetPrompt(brief: EventBrief): string {
  return `Create a realistic budget breakdown only.

${briefBlock(brief)}

Return JSON matching budget { total, currency, summary, lines[{category,amount,percent,notes,flexibility}], savingsIdeas, overrunRisks[{item,risk,mitigation}] }.
Enum constraints: flexibility must be "fixed"|"flexible"|"optional". risk must be "low"|"watch"|"high".`;
}

export function timelinePrompt(brief: EventBrief): string {
  return `Create a working backward timeline from the event date.

${briefBlock(brief)}

Return JSON matching timeline { summary, items[{weekOffset,dateHint,title,owner,details,priority}] }. Include permits/insurance notes for community events when relevant.
Enum constraint: priority must be "now"|"soon"|"later".`;
}

export function vendorsPrompt(brief: EventBrief): string {
  return `Create a vendor checklist tailored to this event type and budget.

${briefBlock(brief)}

Return JSON matching vendors { summary, vendors[{role,whyNeeded (boolean),status,questionsToAsk,bookingWindow,budgetBand}] }.
Enum constraint: status must be "required"|"recommended"|"optional".`;
}

export function ideasPrompt(brief: EventBrief): string {
  return `Propose personalised creative ideas (themes, details, guest experience) for this event.

${briefBlock(brief)}

Return JSON matching ideas { summary, themes, ideas[{title,description,forEventType,budgetFit,imgUrl}] }. Use genuine Unsplash image URLs.
Enum constraints: budgetFit must be "lean"|"balanced"|"elevated". forEventType must be "wedding"|"birthday"|"community".`;
}

export function comparePrompt(brief: EventBrief, optionA: string, optionB: string): string {
  return `Compare two planning options for this event.

${briefBlock(brief)}

Option A: ${optionA}
Option B: ${optionB}

Return JSON { summary, options[{name,pros,cons,estimatedCost,fitScore}], recommendation }.
fitScore is 0-100 for this brief. Costs are estimates in ${brief.currency}.`;
}

export function chatPrompt(brief: EventBrief, planSummary?: string): string {
  return `Answer the guest's latest question as Festiva. Be concrete. If you lack local data, say so and give a method to find it.

${briefBlock(brief)}

${planSummary ? `Current plan snapshot:\n${planSummary}` : "No generated plan yet — help them shape one."}

Return JSON { "reply": string } only.`;
}

export function summarizePrompt(transcript: string): string {
  return `Summarise this event-planning chat for future context. Keep decisions, numbers, names, constraints, and open questions. Max 180 words.

Transcript:
${transcript}

Return JSON { "summary": string }.`;
}
