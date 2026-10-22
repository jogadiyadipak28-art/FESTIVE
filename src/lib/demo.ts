import { STOCK } from "@/lib/stock-images";
import type {
  EventBrief,
  EventComparison,
  EventPlan,
  EventType,
} from "@/lib/types";

function mix(type: EventType) {
  if (type === "wedding") {
    return {
      headline: "A grounded wedding plan that protects the budget and the day-of calm",
      vendors: ["Venue", "Caterer", "Photographer", "Florist", "Officiant", "DJ / musicians", "Attire & alterations"],
      themes: ["Garden dusk", "Paper & porcelain", "Quiet luxury"],
      images: [STOCK.weddingArch, STOCK.weddingTable, STOCK.weddingDance, STOCK.flowers],
    };
  }
  if (type === "birthday") {
    return {
      headline: "A birthday that feels personal without a last-minute scramble",
      vendors: ["Venue / backyard setup", "Cake baker", "Catering or grocery run", "Decor lead", "Photobooth / polaroids", "Playlist host", "Activity facilitator"],
      themes: ["Storybook table", "Golden hour picnic", "After-dark disco"],
      images: [STOCK.birthdayCake, STOCK.birthdayBalloons, STOCK.birthdayPicnic, STOCK.lights],
    };
  }
  return {
    headline: "A community gathering that is welcoming, permitted, and on budget",
    vendors: ["Public space permit", "Sound / AV", "Food vendors", "Volunteer coordinator", "First aid", "Waste & recycling", "Accessibility steward"],
    themes: ["Neighborhood picnic", "Night market", "Skill-share fair"],
    images: [STOCK.communityGathering, STOCK.communityMarket, STOCK.lights, STOCK.flowers],
  };
}

export function demoPlan(brief: EventBrief): EventPlan {
  const flavor = mix(brief.eventType);
  const total = brief.budget;
  const lines = [
    ["Venue & site", 0.28, "fixed"],
    ["Food & drink", 0.3, "flexible"],
    ["Design & florals", 0.12, "flexible"],
    ["Photo / film / capture", 0.1, "optional"],
    ["Music & program", 0.08, "flexible"],
    ["Attire / guest comfort", 0.05, "optional"],
    ["Contingency", 0.07, "fixed"],
  ] as const;

  return {
    headline: flavor.headline,
    plainLanguageBrief: `${brief.hostName} is hosting “${brief.title}”, a ${brief.eventType} in ${brief.location} for about ${brief.guestCount} guests on ${brief.date}. The working budget is ${brief.currency} ${total.toLocaleString()}. The vibe is ${brief.vibe}. Review local quotes, permits, and vendor availability before making commitments.`,
    nextActions: [
      "Lock the guest count range (±10%) so catering quotes are comparable",
      "Shortlist two venues that already include tables or permits",
      "Send a one-page brief to photographer and caterer the same day",
      "Open a shared tracker for deposits and cancellation windows",
    ],
    budget: {
      total,
      currency: brief.currency,
      summary: `A ${brief.eventType} budget of ${brief.currency} ${total.toLocaleString()} with 7% contingency and flexible food/design lines.`,
      lines: lines.map(([category, percent, flexibility]) => ({
        category,
        amount: Math.round(total * percent),
        percent: Math.round(percent * 100),
        notes: `${category} sized for ${brief.guestCount} guests.`,
        flexibility,
      })),
      savingsIdeas: [
        "Host during off-peak hours or a weekday afternoon",
        "Use a venue that allows outside catering",
        "Replace imported florals with seasonal branches and candlelight",
      ],
      overrunRisks: [
        {
          item: "Guest count creep",
          risk: "high",
          mitigation: "Publish a hard RSVP date and plate a 5% overage, not 20%.",
        },
        {
          item: "Weather / permit delay",
          risk: "watch",
          mitigation: "Hold a covered backup and start permit paperwork 8–12 weeks out.",
        },
      ],
    },
    timeline: {
      summary: "Work backwards from the event date in weekly beats so deposits, fittings, and permits never collide.",
      items: [
        { weekOffset: -16, dateHint: "16 weeks out", title: "Vision lock", owner: brief.hostName, details: "Confirm guest range, budget ceiling, and non-negotiables.", priority: "now" },
        { weekOffset: -14, dateHint: "14 weeks out", title: "Venue shortlist", owner: "Host", details: "Tour two sites; ask about overtime, rain plan, and insurance.", priority: "now" },
        { weekOffset: -12, dateHint: "12 weeks out", title: "Key vendors", owner: "Host", details: "Book catering and photography with written cancellation terms.", priority: "now" },
        { weekOffset: -8, dateHint: "8 weeks out", title: "Guest experience", owner: "Co-host", details: "Invites, accessibility notes, and dietary collection.", priority: "soon" },
        { weekOffset: -6, dateHint: "6 weeks out", title: "Design freeze", owner: "Host", details: "Menu tasting, floor plan, and playlist brief.", priority: "soon" },
        { weekOffset: -3, dateHint: "3 weeks out", title: "Headcount", owner: "Host", details: "Final numbers to catering; print run of programs or signage.", priority: "soon" },
        { weekOffset: -1, dateHint: "1 week out", title: "Confirmations", owner: "Host", details: "Call every vendor; share a minute-by-minute rundown.", priority: "now" },
        { weekOffset: 0, dateHint: "Event day", title: "Host, don’t hustle", owner: brief.hostName, details: "Arrive 90 minutes early; one person owns vendor check-in.", priority: "now" },
        { weekOffset: 1, dateHint: "Week after", title: "Close-out", owner: "Host", details: "Final invoices, thank-yous, and a 30-minute debrief.", priority: "later" },
      ],
    },
    vendors: {
      summary: `Core ${brief.eventType} vendors sized to ${brief.location} and ${brief.currency} ${total.toLocaleString()}.`,
      vendors: flavor.vendors.map((role, i) => ({
        role,
        whyNeeded: i < 5,
        status: i < 3 ? "required" : i < 6 ? "recommended" : "optional",
        questionsToAsk: [
          "What is included versus overtime?",
          "When is the deposit refundable?",
          "Can you share a recent event of similar guest count?",
        ],
        bookingWindow: i < 3 ? "12–16 weeks out" : "6–10 weeks out",
        budgetBand: `${brief.currency} ${Math.round(total * (0.06 + i * 0.02)).toLocaleString()}+`,
      })),
    },
    ideas: {
      summary: `Ideas tuned to “${brief.vibe}” without ignoring the stated constraints.`,
      themes: flavor.themes,
      ideas: flavor.themes.concat(["Keepsake station"]).slice(0, 4).map((title, i) => ({
        title,
        description: `A ${brief.eventType} gesture that fits ${brief.guestCount} guests in ${brief.location}.`,
        forEventType: brief.eventType,
        budgetFit: (["lean", "balanced", "elevated", "balanced"] as const)[i],
        imgUrl: flavor.images[i],
      })),
    },
    consultationQuestions: [
      "What is the true all-in cost including service, tax, and overtime?",
      "What happens if guest count drops by 15%?",
      "Which nearby noise, permit, or insurance rules apply?",
      "Who is the day-of decision-maker if the host is with guests?",
    ],
    disclaimer:
      "Festiva offers planning assistance and estimates only — it does not replace a professional planner, venue contract review, or licensed advice.",
  };
}

export function demoComparison(brief: EventBrief, optionA: string, optionB: string): EventComparison {
  return {
    summary: `A demo comparison of “${optionA}” versus “${optionB}” for a ${brief.eventType} with ${brief.guestCount} guests.`,
    options: [
      {
        name: optionA,
        pros: ["Stronger atmosphere", "Easier guest flow"],
        cons: ["Higher staffing need"],
        estimatedCost: Math.round(brief.budget * 0.92),
        fitScore: 84,
      },
      {
        name: optionB,
        pros: ["Lower logistics load", "Better rain plan"],
        cons: ["Less distinctive look"],
        estimatedCost: Math.round(brief.budget * 0.78),
        fitScore: 77,
      },
    ],
    recommendation: `${optionA} better matches the stated vibe; choose ${optionB} if contingency and simplicity matter more than spectacle.`,
  };
}

export function demoChatReply(question: string, brief: EventBrief): string {
  return `Demo mode: I cannot call a live model, but here is a grounded next step for your ${brief.eventType}. For “${question.slice(0, 140)}”, write a one-page brief (guest count, budget ceiling, must-haves) and send it to two vendors the same day so quotes are comparable. This is labelled fallback assistance, not a live booking.`;
}
