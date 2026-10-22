"use client";

import Link from "next/link";
import { ArrowRight, Flower2 } from "lucide-react";
import { useState } from "react";
import RangoliPreloader, { type RangoliPreset } from "@/components/ui/rangoli-preloader";
import SunMoonThemeToggle from "@/components/ui/sun-moon-theme-toggle";

const NAV_LINKS = [
  { label: "Planner", href: "/planner" },
  { label: "Weddings", href: "/planner?type=wedding" },
  { label: "Birthdays", href: "/planner?type=birthday" },
  { label: "Community", href: "/planner?type=community" },
];

export default function FestivaHero() {
  const preset: RangoliPreset = "oxide";
  const [revealed, setRevealed] = useState(false);

  return (
    <section className="festiva-rangoli-hero" aria-labelledby="festiva-hero-title">
      <RangoliPreloader
        preset={preset}
        height="min(100svh, 980px)"
        label="Festiva rangoli animation"
        meta="WEDDINGS · BIRTHDAYS · COMMUNITY"
        blessing="A day worth gathering for"
        message="Welcome to Festiva."
        onComplete={() => setRevealed(true)}
        className="festiva-rangoli-hero__loader"
      >
        <div
          className="festiva-rangoli-hero__reveal"
          data-ready={revealed}
          aria-hidden={!revealed}
        >
          <header className="festiva-rangoli-hero__nav">
            <Link className="festiva-rangoli-hero__brand" href="/" aria-label="Festiva home">
              <span className="festiva-rangoli-hero__brand-mark" aria-hidden="true">
                <Flower2 />
              </span>
              <span>Festiva</span>
            </Link>
            <nav aria-label="Primary navigation">
              <ul className="festiva-rangoli-hero__links">
                {NAV_LINKS.map((item) => (
                  <li key={item.label}>
                    <Link className="festiva-rangoli-hero__link" href={item.href}>
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li className="festiva-rangoli-hero__action">
                  <SunMoonThemeToggle
                    className="festiva-rangoli-hero__theme"
                    size={42}
                    duration={1740}
                    storageKey="festiva-theme"
                    defaultTheme="light"
                  />
                </li>
                <li className="festiva-rangoli-hero__action">
                  <Link className="festiva-rangoli-hero__nav-cta" href="/planner">
                    Open planner
                  </Link>
                </li>
              </ul>
            </nav>
          </header>
          <div className="festiva-rangoli-hero__hint" aria-hidden="true">
            <span /> Move across the form
          </div>
          <div className="festiva-rangoli-hero__content">
            <div>
              <p className="festiva-rangoli-hero__eyebrow">GenAI planning atelier</p>
              <h1 id="festiva-hero-title">
                Plans that
                <span>hold a crowd.</span>
              </h1>
            </div>
            <div className="festiva-rangoli-hero__aside">
              <p>
                Festiva helps you organise weddings, birthdays, and community events with budgets, timelines, vendor checklists, and ideas that match the room you actually have.
              </p>
              <div className="festiva-rangoli-hero__ctas">
                <Link className="festiva-rangoli-hero__primary" href="/planner">
                  Start a plan <ArrowRight aria-hidden="true" />
                </Link>
                <Link className="festiva-rangoli-hero__secondary" href="/architecture">
                  Architecture <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </RangoliPreloader>
    </section>
  );
}
