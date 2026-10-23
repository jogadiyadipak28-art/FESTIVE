/** @jest-environment node */
import { POST } from "@/app/api/chat/route";
import type { EventBrief } from "@/lib/types";

jest.mock("@/lib/ai", () => ({
  completeJson: jest.fn(),
  hasLiveKey: jest.fn(() => false),
  summarizeIfNeeded: jest.fn(async () => null),
}));

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

function request(messages: { role: string; content: string }[]) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brief, messages }),
  });
}

describe("POST /api/chat", () => {
  it("returns a labeled demo response for a valid user question", async () => {
    const response = await POST(request([{ role: "user", content: "How should I plan accessibility?" }]));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.demo).toBe(true);
    expect(result.data.reply).toEqual(expect.any(String));
    expect(result.data.reply.length).toBeGreaterThan(0);
  });

  it("rejects a transcript whose final turn is not from the user", async () => {
    const response = await POST(
      request([{ role: "user", content: "How do I begin?" }, { role: "assistant", content: "Start with a budget." }])
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "Last message must be from the user." });
  });
});
