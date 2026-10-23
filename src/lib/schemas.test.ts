import { demoPlan } from "@/lib/demo";
import { eventBriefSchema, eventPlanSchema } from "@/lib/schemas";
import type { EventBrief } from "@/lib/types";

const brief: EventBrief = {
  eventType: "community",
  title: "Neighborhood evening",
  hostName: "Sam",
  date: "2027-08-21",
  location: "Portland, Oregon",
  guestCount: 120,
  budget: 9_000,
  currency: "USD",
  vibe: "Welcoming and relaxed",
  mustHaves: "Step-free access",
  constraints: "End by 10pm",
  culturalNotes: "",
};

describe("planning schemas", () => {
  it("accepts the brief defaults and the complete demo plan shape", () => {
    const parsedBrief = eventBriefSchema.safeParse(brief);
    expect(parsedBrief.success).toBe(true);

    const plan = demoPlan(brief);
    expect(eventPlanSchema.safeParse(plan).success).toBe(true);
  });

  it("rejects plans that omit required nested planning sections", () => {
    expect(eventPlanSchema.safeParse({ headline: "Incomplete" }).success).toBe(false);
  });
});
