/** @jest-environment node */
import { POST } from "@/app/api/plan/route";
import type { EventBrief } from "@/lib/types";

jest.mock("@/lib/ai", () => ({
  completeJson: jest.fn(),
  hasLiveKey: jest.fn(() => false),
}));

const brief: EventBrief = {
  eventType: "birthday",
  title: "Garden dusk gathering",
  hostName: "Alex",
  date: "2027-06-14",
  location: "Portland, Oregon",
  guestCount: 80,
  budget: 18_000,
  currency: "USD",
  vibe: "Warm and unhurried",
  mustHaves: "Seasonal food",
  constraints: "No fireworks",
  culturalNotes: "",
};

describe("POST /api/plan", () => {
  it("returns a validated demo plan when a live key is unavailable", async () => {
    const response = await POST(
      new Request("http://localhost/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brief),
      })
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.demo).toBe(true);
    expect(result.data.headline).toMatch(/birthday/i);
    expect(result.data.budget.lines.length).toBeGreaterThan(0);
  });

  it("rejects invalid planning input with a client error", async () => {
    const response = await POST(
      new Request("http://localhost/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...brief, guestCount: -1 }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toHaveProperty("error");
  });
});
