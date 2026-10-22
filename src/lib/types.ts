export type EventType = "wedding" | "birthday" | "community";

export type RiskLevel = "low" | "watch" | "high";

export interface EventBrief {
  eventType: EventType;
  title: string;
  hostName: string;
  date: string;
  location: string;
  guestCount: number;
  budget: number;
  currency: string;
  vibe: string;
  mustHaves: string;
  constraints: string;
  culturalNotes: string;
}

export interface BudgetLine {
  category: string;
  amount: number;
  percent: number;
  notes: string;
  flexibility: "fixed" | "flexible" | "optional";
}

export interface BudgetPlan {
  total: number;
  currency: string;
  summary: string;
  lines: BudgetLine[];
  savingsIdeas: string[];
  overrunRisks: { item: string; risk: RiskLevel; mitigation: string }[];
}

export interface TimelineItem {
  weekOffset: number;
  dateHint: string;
  title: string;
  owner: string;
  details: string;
  priority: "now" | "soon" | "later";
}

export interface EventTimeline {
  summary: string;
  items: TimelineItem[];
}

export interface VendorItem {
  role: string;
  whyNeeded: boolean;
  status: "required" | "recommended" | "optional";
  questionsToAsk: string[];
  bookingWindow: string;
  budgetBand: string;
}

export interface VendorChecklist {
  summary: string;
  vendors: VendorItem[];
}

export interface IdeaCard {
  title: string;
  description: string;
  forEventType: EventType;
  budgetFit: "lean" | "balanced" | "elevated";
  imgUrl: string;
}

export interface IdeaBoard {
  summary: string;
  themes: string[];
  ideas: IdeaCard[];
}

export interface EventPlan {
  headline: string;
  plainLanguageBrief: string;
  nextActions: string[];
  budget: BudgetPlan;
  timeline: EventTimeline;
  vendors: VendorChecklist;
  ideas: IdeaBoard;
  consultationQuestions: string[];
  disclaimer: string;
}

export interface CompareOption {
  name: string;
  pros: string[];
  cons: string[];
  estimatedCost: number;
  fitScore: number;
}

export interface EventComparison {
  summary: string;
  options: CompareOption[];
  recommendation: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StudioState {
  brief: EventBrief;
  plan: EventPlan | null;
  comparison: EventComparison | null;
  messages: ChatMessage[];
  demoMode: boolean;
}

export interface AiCallMeta {
  mode: "live" | "demo";
  model: string | null;
  reason?: string;
}
