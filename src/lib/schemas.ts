import { z } from "zod";

export const eventTypeSchema = z.enum(["wedding", "birthday", "community"]);

export const eventBriefSchema = z.object({
  eventType: eventTypeSchema,
  title: z.string().min(2).max(120),
  hostName: z.string().min(1).max(80),
  date: z.string().min(4).max(40),
  location: z.string().min(2).max(160),
  guestCount: z.number().int().min(2).max(20000),
  budget: z.number().min(50).max(10_000_000),
  currency: z.string().min(1).max(8).default("USD"),
  vibe: z.string().min(2).max(400),
  mustHaves: z.string().max(1200).default(""),
  constraints: z.string().max(1200).default(""),
  culturalNotes: z.string().max(1200).default(""),
});

const riskSchema = z.enum(["low", "watch", "high"]);

export const budgetPlanSchema = z.object({
  total: z.number(),
  currency: z.string(),
  summary: z.string(),
  lines: z
    .array(
      z.object({
        category: z.string(),
        amount: z.number(),
        percent: z.number(),
        notes: z.string(),
        flexibility: z.enum(["fixed", "flexible", "optional"]),
      })
    )
    .min(4)
    .max(16),
  savingsIdeas: z.array(z.string()).min(2).max(8),
  overrunRisks: z
    .array(
      z.object({
        item: z.string(),
        risk: riskSchema,
        mitigation: z.string(),
      })
    )
    .max(8),
});

export const eventTimelineSchema = z.object({
  summary: z.string(),
  items: z
    .array(
      z.object({
        weekOffset: z.number(),
        dateHint: z.string(),
        title: z.string(),
        owner: z.string(),
        details: z.string(),
        priority: z.enum(["now", "soon", "later"]),
      })
    )
    .min(5)
    .max(24),
});

export const vendorChecklistSchema = z.object({
  summary: z.string(),
  vendors: z
    .array(
      z.object({
        role: z.string(),
        whyNeeded: z.boolean(),
        status: z.enum(["required", "recommended", "optional"]),
        questionsToAsk: z.array(z.string()).min(2).max(6),
        bookingWindow: z.string(),
        budgetBand: z.string(),
      })
    )
    .min(5)
    .max(18),
});

export const ideaBoardSchema = z.object({
  summary: z.string(),
  themes: z.array(z.string()).min(2).max(8),
  ideas: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        forEventType: eventTypeSchema,
        budgetFit: z.enum(["lean", "balanced", "elevated"]),
        imgUrl: z.string().url(),
      })
    )
    .min(4)
    .max(10),
});

export const eventPlanSchema = z.object({
  headline: z.string(),
  plainLanguageBrief: z.string(),
  nextActions: z.array(z.string()).min(3).max(8),
  budget: budgetPlanSchema,
  timeline: eventTimelineSchema,
  vendors: vendorChecklistSchema,
  ideas: ideaBoardSchema,
  consultationQuestions: z.array(z.string()).min(3).max(8),
  disclaimer: z.string(),
});

export const eventComparisonSchema = z.object({
  summary: z.string(),
  options: z
    .array(
      z.object({
        name: z.string(),
        pros: z.array(z.string()).min(2).max(6),
        cons: z.array(z.string()).min(1).max(6),
        estimatedCost: z.number(),
        fitScore: z.number().min(0).max(100),
      })
    )
    .min(2)
    .max(4),
  recommendation: z.string(),
});

export const chatRequestSchema = z.object({
  brief: eventBriefSchema,
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(40),
  planSummary: z.string().max(8000).optional(),
});

export const compareRequestSchema = z.object({
  brief: eventBriefSchema,
  optionA: z.string().min(2).max(500),
  optionB: z.string().min(2).max(500),
});
