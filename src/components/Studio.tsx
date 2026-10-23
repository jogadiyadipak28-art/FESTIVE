"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  CircleAlert,
  Flower2,
  Loader2,
  MessageCircle,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SocialCards from "@/components/ui/card-fan-carousel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EVENT_GALLERY } from "@/lib/gallery-cards";
import { createCalendarIcs } from "@/lib/calendar";
import { demoPlan } from "@/lib/demo";
import { eventBriefSchema, eventPlanSchema } from "@/lib/schemas";
import type {
  ChatMessage,
  EventBrief,
  EventComparison,
  EventPlan,
  EventType,
} from "@/lib/types";

const EMPTY: EventBrief = {
  eventType: "wedding",
  title: "Garden dusk gathering",
  hostName: "Alex",
  date: "2027-06-14",
  location: "Portland, Oregon",
  guestCount: 80,
  budget: 18000,
  currency: "USD",
  vibe: "Warm, unhurried, lots of candlelight and seasonal food",
  mustHaves: "Outdoor ceremony, vegetarian-friendly menu",
  constraints: "No fireworks; venue must be transit-accessible",
  culturalNotes: "Quiet hour after 10pm; two guests use wheelchairs",
};

const STORAGE_KEY = "festiva-planner-state-v2";

function getUpcomingEventDate(): string {
  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth() + 6, 1);
  const lastDayOfMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(today.getDate(), lastDayOfMonth));
  return [target.getFullYear(), String(target.getMonth() + 1).padStart(2, "0"), String(target.getDate()).padStart(2, "0")].join("-");
}

async function postJson<T>(url: string, body: unknown): Promise<{ data: T; demo: boolean; reason?: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export default function Studio({ initialType }: { initialType?: EventType }) {
  const [brief, setBrief] = React.useState<EventBrief>({
    ...EMPTY,
    eventType: initialType || "wedding",
  });
  const [plan, setPlan] = React.useState<EventPlan | null>(null);
  const [comparison, setComparison] = React.useState<EventComparison | null>(null);
  const [optionA, setOptionA] = React.useState("Backyard with tent");
  const [optionB, setOptionB] = React.useState("Small hotel garden");
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [question, setQuestion] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [demo, setDemo] = React.useState(false);
  const [demoReason, setDemoReason] = React.useState<string | undefined>();
  const [hydrated, setHydrated] = React.useState(false);
  const liveRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const freshBrief = { ...EMPTY, eventType: initialType || "wedding", date: getUpcomingEventDate() };
    let restored = false;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state: unknown = JSON.parse(saved);
        if (state && typeof state === "object") {
          const value = state as { brief?: unknown; plan?: unknown; demo?: unknown; demoReason?: unknown };
          const parsedBrief = eventBriefSchema.safeParse(value.brief);
          const parsedPlan = eventPlanSchema.safeParse(value.plan);
          if (parsedBrief.success && parsedPlan.success) {
            setBrief(parsedBrief.data);
            setPlan(parsedPlan.data);
            setDemo(value.demo === true);
            setDemoReason(typeof value.demoReason === "string" ? value.demoReason : undefined);
            restored = true;
          }
        }
      }
    } catch {
      // Storage may be unavailable or contain invalid data; use a fresh local sample.
    }

    if (!restored) {
      setBrief(freshBrief);
      setPlan(demoPlan(freshBrief));
      setDemo(true);
      setDemoReason("starter sample");
    }
    setHydrated(true);
  }, [initialType]);

  React.useEffect(() => {
    if (!hydrated || !plan) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ brief, plan, demo, demoReason }));
    } catch {
      // The planner remains usable when browser storage is disabled or full.
    }
  }, [brief, demo, demoReason, hydrated, plan]);

  const set = <K extends keyof EventBrief>(key: K, value: EventBrief[K]) =>
    setBrief((b) => ({ ...b, [key]: value }));

  const generate = async () => {
    setBusy("plan");
    setError(null);
    try {
      const result = await postJson<EventPlan>("/api/plan", brief);
      setPlan(result.data);
      setDemo(result.demo);
      setDemoReason(result.reason);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate a plan.");
    } finally {
      setBusy(null);
    }
  };

  const refresh = async (path: "budget" | "timeline" | "vendors" | "ideas") => {
    if (!plan) return;
    setBusy(path);
    setError(null);
    try {
      const result = await postJson<EventPlan["budget"] | EventPlan["timeline"] | EventPlan["vendors"] | EventPlan["ideas"]>(
        `/api/${path}`,
        brief
      );
      setPlan((p) => (p ? { ...p, [path]: result.data } : p));
      setDemo(result.demo);
      setDemoReason(result.reason);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed.");
    } finally {
      setBusy(null);
    }
  };

  const compare = async () => {
    setBusy("compare");
    setError(null);
    try {
      const result = await postJson<EventComparison>("/api/compare", { brief, optionA, optionB });
      setComparison(result.data);
      setDemo(result.demo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compare failed.");
    } finally {
      setBusy(null);
    }
  };

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = question.trim();
    if (!content) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setQuestion("");
    setBusy("chat");
    setError(null);
    try {
      const result = await postJson<{ reply: string }>("/api/chat", {
        brief,
        messages: next,
        planSummary: plan?.plainLanguageBrief,
      });
      setMessages((m) => [...m, { role: "assistant", content: result.data.reply }]);
      setDemo(result.demo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed.");
    } finally {
      setBusy(null);
    }
  };

  const exportJson = () => {
    if (!plan) return;
    const blob = new Blob([JSON.stringify({ brief, plan }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "festiva-plan.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportIcs = () => {
    if (!plan) return;
    const blob = new Blob([createCalendarIcs(brief.date, plan.timeline.items)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "festiva-timeline.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <header className="planner-header">
        <Link className="planner-header__brand" href="/" aria-label="Festiva home">
          <span className="planner-header__mark" aria-hidden="true"><Flower2 /></span>
          <span>Festiva</span>
        </Link>
        <Link className="planner-header__home" href="/">Back to home</Link>
      </header>
      <div className="planner-shell mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start" aria-label="Event brief">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Brief</p>
          <h1 className="mt-2 font-heading text-3xl">Plan with Festiva</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Assistance for weddings, birthdays, and community events — not a substitute for a hired planner or venue contract.
          </p>
        </div>

        {demo && (
          <div className="rounded-xl border border-border bg-muted px-3 py-2 text-sm" role="status">
            {demoReason === "starter sample"
              ? "Example plan loaded. Edit the brief and generate a fresh pack whenever you’re ready."
              : `Demo fallback is on${demoReason ? ` (${demoReason})` : ""}.`}
          </div>
        )}

        <Field id="eventType" label="Event type">
          <Select value={brief.eventType} onValueChange={(v) => set("eventType", v as EventType)}>
            <SelectTrigger id="eventType" aria-label="Event type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wedding">Wedding</SelectItem>
              <SelectItem value="birthday">Birthday</SelectItem>
              <SelectItem value="community">Community event</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field id="title" label="Working title">
          <Input id="title" value={brief.title} onChange={(e) => set("title", e.target.value)} maxLength={120} />
        </Field>
        <Field id="hostName" label="Host name">
          <Input id="hostName" value={brief.hostName} onChange={(e) => set("hostName", e.target.value)} maxLength={80} />
        </Field>
        <Field id="date" label="Date">
          <Input id="date" type="date" value={brief.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field id="location" label="Location">
          <Input id="location" value={brief.location} onChange={(e) => set("location", e.target.value)} maxLength={160} />
        </Field>
        <Field id="guestCount" label="Guest count">
          <Input
            id="guestCount"
            type="number"
            min={2}
            max={20000}
            value={brief.guestCount}
            onChange={(e) => set("guestCount", Number(e.target.value))}
          />
        </Field>
        <Field id="budget" label="Budget">
          <div className="flex gap-2">
            <Input
              id="currency"
              aria-label="Currency"
              className="w-20"
              value={brief.currency}
              onChange={(e) => set("currency", e.target.value)}
              maxLength={8}
            />
            <Input
              id="budget"
              type="number"
              min={50}
              value={brief.budget}
              onChange={(e) => set("budget", Number(e.target.value))}
            />
          </div>
        </Field>
        <Field id="vibe" label="Vibe">
          <Textarea id="vibe" value={brief.vibe} onChange={(e) => set("vibe", e.target.value)} maxLength={400} />
        </Field>
        <Field id="mustHaves" label="Must-haves">
          <Textarea id="mustHaves" value={brief.mustHaves} onChange={(e) => set("mustHaves", e.target.value)} maxLength={1200} />
        </Field>
        <Field id="constraints" label="Constraints">
          <Textarea id="constraints" value={brief.constraints} onChange={(e) => set("constraints", e.target.value)} maxLength={1200} />
        </Field>
        <Field id="culturalNotes" label="Cultural & accessibility notes">
          <Textarea
            id="culturalNotes"
            value={brief.culturalNotes}
            onChange={(e) => set("culturalNotes", e.target.value)}
            maxLength={1200}
          />
        </Field>
        <Button onClick={generate} disabled={busy === "plan"} className="w-full">
          {busy === "plan" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
          Generate planning pack
        </Button>
      </aside>

      <main>
        <div ref={liveRef} aria-live="polite" className="sr-only">
          {busy ? `Working on ${busy}` : plan ? "Plan ready" : ""}
        </div>
        {error && (
          <p className="mb-4 flex items-center gap-2 text-sm text-foreground" role="alert">
            <CircleAlert className="h-4 w-4" aria-hidden="true" />
            {error}
          </p>
        )}

        {!plan ? (
          <section className="rounded-3xl border border-dashed border-border p-8">
            <h2 className="font-heading text-2xl">Start with a brief, then let GenAI draft the pack</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              You will get a budget, a backward timeline, a vendor checklist, and personalised ideas. Live calls use structured JSON with Zod validation; without a key you still get a labelled demo.
            </p>
            <SocialCards cards={EVENT_GALLERY.slice(0, 7)} />
          </section>
        ) : (
          <Tabs defaultValue="overview">
            <TabsList aria-label="Planning sections">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="budget">Budget</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="vendors">Vendors</TabsTrigger>
              <TabsTrigger value="ideas">Ideas</TabsTrigger>
              <TabsTrigger value="compare">Compare</TabsTrigger>
              <TabsTrigger value="ask">Ask</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <article className="space-y-4">
                <h2 className="font-heading text-3xl">{plan.headline}</h2>
                <p className="text-muted-foreground">{plan.plainLanguageBrief}</p>
                <p className="text-sm">{plan.disclaimer}</p>
                <ol className="list-decimal space-y-2 pl-5">
                  {plan.nextActions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ol>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={exportJson}>
                    Download JSON
                  </Button>
                  <Button variant="outline" onClick={exportIcs}>
                    Download calendar
                  </Button>
                </div>
                <h3 className="pt-4 font-heading text-xl">Questions for a human planner</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {plan.consultationQuestions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </article>
            </TabsContent>

            <TabsContent value="budget">
              <BudgetBoard plan={plan} onRefresh={() => refresh("budget")} busy={busy === "budget"} />
            </TabsContent>
            <TabsContent value="timeline">
              <div className="mb-4">
                <Button variant="outline" size="sm" onClick={() => refresh("timeline")} disabled={busy === "timeline"}>
                  <CalendarDays className="h-4 w-4" aria-hidden="true" /> Refresh timeline
                </Button>
              </div>
              <ol className="space-y-3">
                {plan.timeline.items.map((item) => (
                  <li key={`${item.weekOffset}-${item.title}`} className="rounded-2xl border border-border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{item.dateHint}</Badge>
                      <Badge variant={item.priority === "now" ? "high" : "outline"}>{item.priority}</Badge>
                      <span className="font-medium">{item.title}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.owner}: {item.details}
                    </p>
                  </li>
                ))}
              </ol>
            </TabsContent>
            <TabsContent value="vendors">
              <div className="mb-4">
                <Button variant="outline" size="sm" onClick={() => refresh("vendors")} disabled={busy === "vendors"}>
                  Refresh vendors
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {plan.vendors.vendors.map((v) => (
                  <Card key={v.role}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between gap-2 text-base">
                        {v.role}
                        <Badge variant="secondary">{v.status}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p>
                        {v.bookingWindow} · {v.budgetBand}
                      </p>
                      <ul className="list-disc pl-4">
                        {v.questionsToAsk.map((q) => (
                          <li key={q}>{q}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="ideas">
              <div className="mb-4 flex flex-wrap gap-2">
                {plan.ideas.themes.map((t) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))}
                <Button variant="outline" size="sm" onClick={() => refresh("ideas")} disabled={busy === "ideas"}>
                  Refresh ideas
                </Button>
              </div>
              <SocialCards
                cards={plan.ideas.ideas.map((idea) => ({
                  imgUrl: idea.imgUrl,
                  alt: idea.title,
                }))}
              />
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {plan.ideas.ideas.map((idea) => (
                  <Card key={idea.title}>
                    <CardHeader>
                      <CardTitle className="text-base">{idea.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <Badge variant="secondary">{idea.budgetFit}</Badge>
                      <p className="mt-2">{idea.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="compare">
              <div className="grid gap-3 md:grid-cols-2">
                <Field id="optionA" label="Option A">
                  <Input id="optionA" value={optionA} onChange={(e) => setOptionA(e.target.value)} maxLength={500} />
                </Field>
                <Field id="optionB" label="Option B">
                  <Input id="optionB" value={optionB} onChange={(e) => setOptionB(e.target.value)} maxLength={500} />
                </Field>
              </div>
              <Button className="mt-4" onClick={compare} disabled={busy === "compare"}>
                Compare options
              </Button>
              {comparison && (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {comparison.options.map((o) => (
                    <Card key={o.name}>
                      <CardHeader>
                        <CardTitle>
                          {o.name} · {o.fitScore}/100
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm">
                        <p>Est. {brief.currency} {o.estimatedCost.toLocaleString()}</p>
                        <p className="mt-2 font-medium">Pros</p>
                        <ul className="list-disc pl-4">
                          {o.pros.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                        <p className="mt-2 font-medium">Cons</p>
                        <ul className="list-disc pl-4">
                          {o.cons.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                  <p className="md:col-span-2 text-sm">{comparison.recommendation}</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="ask">
              <div className="space-y-4" aria-live="polite">
                {messages.length === 0 && (
                  <p className="text-sm text-muted-foreground">Ask about seating, permits, cake timing, or a tighter budget.</p>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`max-w-xl rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "ml-auto bg-foreground text-background" : "bg-muted"}`}>
                    {m.content}
                  </div>
                ))}
              </div>
              <form onSubmit={ask} className="mt-4 flex gap-2">
                <Input
                  aria-label="Ask Festiva"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={2000}
                  placeholder="How do we cut catering by 12% without shrinking portions?"
                />
                <Button type="submit" disabled={busy === "chat"} aria-label="Send question">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </main>
      </div>
    </>
  );
}

export function BudgetBoard({
  plan,
  onRefresh,
  busy,
}: {
  plan: EventPlan;
  onRefresh: () => void;
  busy: boolean;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{plan.budget.summary}</p>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={busy}>
          <Wallet className="h-4 w-4" aria-hidden="true" /> Refresh budget
        </Button>
      </div>
      <div className="space-y-3">
        {plan.budget.lines.map((line) => (
          <div key={line.category}>
            <div className="mb-1 flex justify-between text-sm">
              <span>
                {line.category}{" "}
                <Badge variant="outline" className="ml-1">
                  {line.flexibility}
                </Badge>
              </span>
              <span>
                {plan.budget.currency} {line.amount.toLocaleString()} · {line.percent}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div className="h-full bg-foreground" style={{ width: `${Math.min(100, line.percent)}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{line.notes}</p>
          </div>
        ))}
      </div>
      <h3 className="mt-6 font-heading">Savings</h3>
      <ul className="mt-2 list-disc pl-5 text-sm">
        {plan.budget.savingsIdeas.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <h3 className="mt-6 font-heading">Overrun risks</h3>
      <ul className="mt-2 space-y-2">
        {plan.budget.overrunRisks.map((r) => (
          <li key={r.item} className="flex gap-2 text-sm">
            <Badge variant={r.risk}>{r.risk}</Badge>
            <span>
              <strong>{r.item}.</strong> {r.mitigation}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
