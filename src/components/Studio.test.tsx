import { fireEvent, render, screen } from "@testing-library/react";
import Studio from "@/components/Studio";
import { demoPlan } from "@/lib/demo";
import type { EventBrief } from "@/lib/types";

jest.mock("@/components/ui/card-fan-carousel", () => ({
  __esModule: true,
  default: () => null,
}));

const birthdayBrief: EventBrief = {
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

describe("Studio planner", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it("generates a planning pack for the selected event type", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: demoPlan(birthdayBrief), demo: false }),
    } as Response);
    globalThis.fetch = fetchMock as typeof fetch;

    render(<Studio initialType="birthday" />);

    await screen.findByText("Plan ready");
    fireEvent.click(screen.getByRole("button", { name: "Generate planning pack" }));

    await screen.findByRole("heading", { name: /A birthday that feels personal/ });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/plan",
      expect.objectContaining({ method: "POST" })
    );
    const request = fetchMock.mock.calls[0][1];
    expect(JSON.parse(String(request?.body))).toMatchObject({ eventType: "birthday" });
  });

  it("shows API errors accessibly without losing the starter plan", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "The date must be valid." }),
    } as Response);

    render(<Studio initialType="birthday" />);
    await screen.findByText("Plan ready");
    fireEvent.click(screen.getByRole("button", { name: "Generate planning pack" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The date must be valid.");
    expect(screen.getByRole("heading", { name: /A birthday that feels personal/ })).toBeInTheDocument();
  });
});
