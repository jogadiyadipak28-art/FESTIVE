import { z } from "zod";

jest.mock("openai", () => ({
  __esModule: true,
  default: class MockOpenAI {},
}));
jest.mock("openai/helpers/zod", () => ({
  zodResponseFormat: jest.fn(),
}));

import { extractiveSummary, parseJson } from "@/lib/ai";

describe("parseJson", () => {
  const responseSchema = z.object({
    flexibility: z.enum(["fixed", "flexible", "optional"]),
    whyNeeded: z.boolean(),
    items: z.array(z.string()),
  });

  it("normalizes common model variations before schema validation", () => {
    const result = parseJson(
      JSON.stringify({
        flexibility: "non-negotiable",
        whyNeeded: "yes",
        items: "1. Confirm the venue\n2. Review catering",
      }),
      responseSchema
    );

    expect(result).toEqual({
      flexibility: "fixed",
      whyNeeded: true,
      items: ["Confirm the venue", "Review catering"],
    });
  });

  it("reports malformed JSON as a model-output validation error", () => {
    expect(() => parseJson("not JSON", responseSchema)).toThrow("Model returned non-JSON output.");
  });

  it("includes the invalid field path when the schema rejects output", () => {
    expect(() =>
      parseJson(
        JSON.stringify({ flexibility: "unknown", whyNeeded: true, items: [] }),
        responseSchema
      )
    ).toThrow(/schema validation at flexibility/);
  });
});

describe("extractiveSummary", () => {
  it("summarizes older turns within a bounded context", () => {
    const messages = Array.from({ length: 8 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: `Message ${index} with a planning detail.`,
    }));

    const summary = extractiveSummary(messages);

    expect(summary).toContain("Message 0");
    expect(summary).toContain("Message 7");
    expect(summary.length).toBeLessThan(1_000);
  });

  it("preserves the newest dropped details when clipping long history", () => {
    const messages = Array.from({ length: 5 }, (_, index) => ({
      role: "user",
      content: `Older message ${index}. ` + "detail ".repeat(35),
    }));

    const summary = extractiveSummary(messages);

    expect(summary.length).toBeLessThanOrEqual(950);
    expect(summary).toContain("Older message 4");
  });
});
