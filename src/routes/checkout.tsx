import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
import { TestimonialSection } from "@/components/TestimonialSection";
import { useQaReviewMode } from "@/hooks/use-qa-review";
import { getCommasConfig } from "@/lib/challenge-config";
import { SUPPORT_TEXT_NUMBER } from "@/lib/academy";
import { TIER_MAP } from "@/lib/tiers";

const searchSchema = z.object({
  tier: z.string().optional(),
  qaStage: z.string().optional(),
});

export const Route = createFileRoute("/checkout")({
  validateSearch: (input) => searchSchema.parse(input),
  head: () => ({
    meta: [
      { title: "Reserve My Seat — AI AutoPilot 2-Day Summit" },
      {
        name: "description",
        content:
          "Join the AI AutoPilot 2-Day Summit live Saturday, August 29 and Sunday, August 30 from 11:00 AM–4:00 PM Eastern.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:url", content: "/checkout" },
    ],
    links: [{ rel: "canonical", href: "/checkout" }],
  }),
  component: Checkout,
});

function Checkout() {
  const cfg = useMemo(() => getCommasConfig(), []);
  const ticket = TIER_MAP.ga;
  const qaReview = useQaReviewMode();

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <p className="eyebrow">SpinCityHQ &amp; NuAmenti present · AI AutoPilot 2-Day Summit</p>
      <h1 className="mt-3 font-display text-2xl text-foreground sm:text-3xl">
        The Summit is open free this week
      </h1>

      <FunnelVideoSlot
        url={cfg.sectionVideos.checkout}
        label="Watch before you start"
        envKey="VITE_SUMMIT_VIDEO_CHECKOUT"
        className="mt-7"
      />

      <section className="mt-5 rounded-md border border-[color:var(--gold)] bg-[color:var(--surface)] p-4 sm:p-5">
        <a
          href="/join?mode=signup&next=%2Flearn"
          className="inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3.5 font-heading text-base font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Create my free account
        </a>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Nothing is for sale here. Sign in and every Summit recording opens. Enjoying it? Text{" "}
          {SUPPORT_TEXT_NUMBER} to donate, or to ask about the Accelerator or a 1-on-1 consultation.
        </p>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          By creating an account you agree to the{" "}
          <Link to="/terms" className="underline hover:text-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
        {qaReview ? (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Owner preview: payments are disabled everywhere.
          </p>
        ) : null}
      </section>

      <p className="mt-5 text-sm text-muted-foreground">
        Saturday, August 29 and Sunday, August 30 · 11:00 AM–4:00 PM Eastern · live online. The room
        opens at 10:45 AM both days.
      </p>

      <section className="mt-8 surface-raised p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg text-foreground">{ticket.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{ticket.headline}</p>
          </div>
          <p className="font-display text-2xl text-[color:var(--gold)]">Free this week</p>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {ticket.bullets.map((bullet) => (
            <li key={bullet}>· {bullet}</li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Deeper build support is offered one step at a time only after each earlier purchase is
          confirmed.
        </p>
      </section>

      <section className="mt-6 surface-raised p-6">
        <h2 className="font-heading text-lg text-foreground">How communication works</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a free account and NuAmenti sends your access, calendar links, preparation steps
          and resources. No payment is taken anywhere on this site.
        </p>
      </section>

      <TestimonialSection
        page="checkout"
        eyebrow="From the family"
        heading="Why people reserved a seat"
      />
    </main>
  );
}
