import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { FunnelVideoSlot } from "@/components/FunnelVideoSlot";
import { TestimonialSection } from "@/components/TestimonialSection";
import { useQaReviewMode } from "@/hooks/use-qa-review";
import { getCommasConfig, isHandoffAllowed, resolveCheckoutUrl } from "@/lib/challenge-config";
import { formatUsd, TIER_MAP } from "@/lib/tiers";

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
  const checkoutUrl = resolveCheckoutUrl("ga", cfg);
  const gateAllowed = isHandoffAllowed("ga", cfg);
  const qaReview = useQaReviewMode();
  const [legalAck, setLegalAck] = useState(false);
  const [showLegalPrompt, setShowLegalPrompt] = useState(false);

  const buttonDisabled = !qaReview && !gateAllowed;
  const buttonLabel = qaReview
    ? "Reserve My Seat — Preview, No Payment"
    : gateAllowed
      ? `Reserve My Seat · ${formatUsd(ticket.priceCents)}`
      : "Checkout Link Being Connected";

  function handleContinue() {
    if (qaReview) {
      window.location.href = "/confirmed?qaStage=ga";
      return;
    }
    if (!gateAllowed || !checkoutUrl) return;
    if (!legalAck) {
      setShowLegalPrompt(true);
      return;
    }
    window.location.href = checkoutUrl;
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <p className="eyebrow">SpinCityHQ &amp; NuAmenti present · AI AutoPilot 2-Day Summit</p>
      <h1 className="mt-3 font-display text-2xl text-foreground sm:text-3xl">
        Get your General Admission ticket
      </h1>

      <FunnelVideoSlot
        url={cfg.sectionVideos.checkout}
        label="Watch before you get your ticket"
        envKey="VITE_SUMMIT_VIDEO_CHECKOUT"
        className="mt-7"
      />

      <section className="mt-5 rounded-md border border-[color:var(--gold)] bg-[color:var(--surface)] p-4 sm:p-5">
        <button
          type="button"
          disabled={buttonDisabled}
          onClick={handleContinue}
          aria-disabled={buttonDisabled}
          className={`inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3.5 font-heading text-base font-semibold text-primary-foreground transition ${
            buttonDisabled ? "cursor-not-allowed opacity-50" : "hover:opacity-90"
          }`}
        >
          {buttonLabel}
        </button>

        {qaReview ? (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Owner preview: this continues without charging a card or creating an order.
          </p>
        ) : (
          <label className="mt-4 flex items-start gap-3 rounded-md border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={legalAck}
              onChange={(event) => {
                setLegalAck(event.target.checked);
                if (event.target.checked) setShowLegalPrompt(false);
              }}
              className="mt-1 accent-[color:var(--gold)]"
              aria-describedby="legal-ack-copy"
            />
            <span id="legal-ack-copy">
              I agree to the{" "}
              <Link to="/terms" className="underline hover:text-foreground">
                Terms
              </Link>
              ,{" "}
              <Link to="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
              , and{" "}
              <Link to="/refund-policy" className="underline hover:text-foreground">
                Refund Policy
              </Link>
              .
            </span>
          </label>
        )}

        {showLegalPrompt ? (
          <p role="alert" className="mt-3 text-sm text-[color:var(--gold)]">
            Check the policy box, then tap Reserve My Seat again.
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
          <p className="font-display text-2xl text-[color:var(--gold)]">
            {formatUsd(ticket.priceCents)}
          </p>
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
          Complete your secure payment through SpincityHQ. NuAmenti sends your access, calendar
          links, preparation steps, and ticket-specific resources.
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
