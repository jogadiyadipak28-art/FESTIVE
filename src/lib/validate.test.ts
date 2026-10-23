import { budgetContext, parseBody, ValidationError } from "@/lib/validate";
import { eventBriefSchema } from "@/lib/schemas";

describe("budgetContext", () => {
  it("keeps the newest messages within the context budget", () => {
    const messages = Array.from({ length: 8 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: `Message ${index} ` + "x".repeat(3_990),
    }));

    const result = budgetContext(messages);

    expect(result.kept.map((message) => message.content.match(/Message \d+/)?.[0])).toEqual([
      "Message 2",
      "Message 3",
      "Message 4",
      "Message 5",
      "Message 6",
      "Message 7",
    ]);
    expect(result.droppedTokens).toBeGreaterThan(0);
  });

  it("rejects histories beyond the request limit", () => {
    const messages = Array.from({ length: 41 }, () => ({ role: "user", content: "hi" }));
    expect(() => budgetContext(messages)).toThrow("At most 40 chat messages are allowed.");
  });
});

describe("parseBody", () => {
  it("applies schema defaults to valid event briefs", () => {
    const brief = {
      eventType: "birthday",
      title: "Garden party",
      hostName: "Alex",
      date: "2027-06-14",
      location: "Portland",
      guestCount: 40,
      budget: 5_000,
      vibe: "Casual and bright",
    };

    expect(parseBody(eventBriefSchema, brief)).toMatchObject({
      currency: "USD",
      mustHaves: "",
      constraints: "",
      culturalNotes: "",
    });
  });

  it("returns a client-safe validation error for invalid input", () => {
    expect(() => parseBody(eventBriefSchema, {})).toThrow(ValidationError);
  });
});
