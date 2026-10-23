import { createCalendarIcs } from "@/lib/calendar";
import type { TimelineItem } from "@/lib/types";

const items: TimelineItem[] = [
  {
    weekOffset: -2,
    dateHint: "Two weeks before",
    title: "Confirm venue; menu",
    owner: "Host",
    details: "Confirm the venue,\nthen send invitations.",
    priority: "soon",
  },
];

describe("createCalendarIcs", () => {
  it("exports dated, escaped all-day events with a real generation timestamp", () => {
    const result = createCalendarIcs("2027-04-24", items, new Date("2026-10-24T12:34:56.000Z"));

    expect(result).toContain("DTSTAMP:20261024T123456Z");
    expect(result).toContain("DTSTART;VALUE=DATE:20270410");
    expect(result).toContain("DTEND;VALUE=DATE:20270411");
    expect(result).toContain("SUMMARY:Confirm venue\\; menu");
    expect(result).toContain("DESCRIPTION:Confirm the venue\\,\\nthen send invitations. (Two weeks before)");
    expect(result.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("rejects an invalid event date instead of creating a broken calendar", () => {
    expect(() => createCalendarIcs("not-a-date", items)).toThrow(RangeError);
  });
});
