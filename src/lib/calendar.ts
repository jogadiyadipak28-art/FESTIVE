import type { TimelineItem } from "@/lib/types";

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

export function createCalendarIcs(
  eventDate: string,
  items: TimelineItem[],
  generatedAt = new Date()
): string {
  const baseDate = new Date(`${eventDate}T00:00:00.000Z`);
  if (Number.isNaN(baseDate.getTime())) {
    throw new RangeError("A valid event date is required to create a calendar.");
  }

  const events = items.flatMap((item, index) => {
    const start = new Date(baseDate);
    start.setUTCDate(start.getUTCDate() + Math.round(item.weekOffset * 7));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const description = escapeIcsText(`${item.details} (${item.dateHint})`);

    return [
      "BEGIN:VEVENT",
      `UID:festiva-${index}-${formatDate(start)}@local`,
      `DTSTAMP:${generatedAt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
      `DTSTART;VALUE=DATE:${formatDate(start)}`,
      `DTEND;VALUE=DATE:${formatDate(end)}`,
      `SUMMARY:${escapeIcsText(item.title)}`,
      `DESCRIPTION:${description}`,
      "END:VEVENT",
    ];
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Festiva//Planning Assistant//EN",
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
