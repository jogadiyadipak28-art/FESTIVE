"use client";

import Link from "next/link";
import FestivaHero from "@/components/FestivaHero";
import SocialCards from "@/components/ui/card-fan-carousel";
import { EVENT_GALLERY } from "@/lib/gallery-cards";

export default function HomePage() {
  return (
    <>
      <FestivaHero />
      <section className="bg-background px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Three event types</p>
          <h2 className="mt-3 font-heading text-4xl">Fan through the kinds of days we plan</h2>
          <p className="mt-3 text-muted-foreground">
            Each card opens the planner with that event type selected. Images are Unsplash stock, not vendor listings.
          </p>
          <div className="mt-6 flex justify-center gap-3 text-sm">
            <Link className="underline-offset-4 hover:underline" href="/planner?type=wedding">
              Wedding
            </Link>
            <Link className="underline-offset-4 hover:underline" href="/planner?type=birthday">
              Birthday
            </Link>
            <Link className="underline-offset-4 hover:underline" href="/planner?type=community">
              Community
            </Link>
          </div>
        </div>
        <SocialCards cards={EVENT_GALLERY} />
      </section>
    </>
  );
}
